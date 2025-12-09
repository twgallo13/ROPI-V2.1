/**
 * Permissions Page
 * 
 * Allows admins to manage role-based permissions matrix.
 * Shows: role matrix with permission toggles
 * Provides: save and reset buttons
 * 
 * Homer v2.0.0 - Ropi Roles & Permissions
 */

import { useState, useEffect } from 'react';
import './PermissionsPage.css';

const API_BASE = import.meta.env.VITE_API_BASE || '';

/**
 * Get auth token for API requests
 */
async function getAuthToken(): Promise<string | null> {
  const { auth } = await import('../../firebaseConfig');
  if (!auth || !auth.currentUser) {
    return null;
  }
  return auth.currentUser.getIdToken();
}

/**
 * Make authenticated API request
 */
async function apiRequest<T>(
  endpoint: string,
  options: RequestInit = {}
): Promise<T> {
  const token = await getAuthToken();
  
  if (!token) {
    throw new Error('Authentication required');
  }
  
  const url = `${API_BASE}${endpoint}`;
  const response = await fetch(url, {
    ...options,
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${token}`,
      ...options.headers,
    },
  });
  
  if (!response.ok) {
    const error = await response.json().catch(() => ({ message: 'Request failed' }));
    throw new Error(error.message || `HTTP ${response.status}`);
  }
  
  if (response.status === 204) {
    return {} as T;
  }
  
  return response.json();
}

interface PermissionsMatrix {
  [role: string]: {
    [permission: string]: boolean;
  };
}

interface PermissionsResponse {
  permissions: PermissionsMatrix;
  isDefault: boolean;
  updatedAt?: string;
  updatedBy?: string;
}

const ROPI_ROLES = ['admin', 'merch', 'photographer', 'viewer'];

const PERMISSION_LABELS: Record<string, string> = {
  systemAccess: 'System Access',
  userManagement: 'User Management',
  importExport: 'Import/Export',
  launchCalendar: 'Launch Calendar',
  observations: 'Observations',
  media: 'Media',
};

const PERMISSION_DESCRIPTIONS: Record<string, string> = {
  systemAccess: 'Access to system administration features',
  userManagement: 'Create, edit, and manage users',
  importExport: 'Import and export data',
  launchCalendar: 'View and edit launch calendar',
  observations: 'Create and manage observations',
  media: 'Upload and manage media files',
};

export function PermissionsPage() {
  const [permissions, setPermissions] = useState<PermissionsMatrix | null>(null);
  const [originalPermissions, setOriginalPermissions] = useState<PermissionsMatrix | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState<{ type: 'success' | 'error'; text: string } | null>(null);
  const [isDefault, setIsDefault] = useState(false);

  // Load permissions on mount
  useEffect(() => {
    loadPermissions();
  }, []);

  async function loadPermissions() {
    try {
      setLoading(true);
      setMessage(null);
      const data = await apiRequest<PermissionsResponse>('/admin/permissions');
      setPermissions(data.permissions);
      setOriginalPermissions(data.permissions);
      setIsDefault(data.isDefault);
    } catch (error: any) {
      setMessage({
        type: 'error',
        text: error.message || 'Failed to load permissions',
      });
    } finally {
      setLoading(false);
    }
  }

  async function savePermissions() {
    if (!permissions) return;

    try {
      setSaving(true);
      setMessage(null);
      await apiRequest('/admin/permissions', {
        method: 'PATCH',
        body: JSON.stringify({ permissions }),
      });
      setOriginalPermissions(permissions);
      setIsDefault(false);
      setMessage({
        type: 'success',
        text: 'Permissions saved successfully',
      });
    } catch (error: any) {
      setMessage({
        type: 'error',
        text: error.message || 'Failed to save permissions',
      });
    } finally {
      setSaving(false);
    }
  }

  async function resetPermissions() {
    if (!confirm('Are you sure you want to reset permissions to defaults?')) {
      return;
    }

    try {
      setSaving(true);
      setMessage(null);
      const data = await apiRequest<PermissionsResponse>('/admin/permissions/reset', {
        method: 'POST',
      });
      setPermissions(data.permissions);
      setOriginalPermissions(data.permissions);
      setIsDefault(true);
      setMessage({
        type: 'success',
        text: 'Permissions reset to defaults',
      });
    } catch (error: any) {
      setMessage({
        type: 'error',
        text: error.message || 'Failed to reset permissions',
      });
    } finally {
      setSaving(false);
    }
  }

  function togglePermission(role: string, permission: string) {
    if (!permissions) return;

    setPermissions({
      ...permissions,
      [role]: {
        ...permissions[role],
        [permission]: !permissions[role][permission],
      },
    });
  }

  function hasChanges() {
    return JSON.stringify(permissions) !== JSON.stringify(originalPermissions);
  }

  if (loading) {
    return (
      <div className="permissions-page">
        <div className="loading">Loading permissions...</div>
      </div>
    );
  }

  if (!permissions) {
    return (
      <div className="permissions-page">
        <div className="error">Failed to load permissions</div>
      </div>
    );
  }

  const allPermissions = Array.from(
    new Set(Object.values(permissions).flatMap((p) => Object.keys(p)))
  ).sort();

  return (
    <div className="permissions-page">
      <h1>Role Permissions Matrix</h1>
      <p className="subtitle">
        Define what each role can access and perform in the system
      </p>

      {message && (
        <div className={`message message-${message.type}`}>
          {message.text}
        </div>
      )}

      <div className="permissions-table-wrapper">
        <table className="permissions-table">
          <thead>
            <tr>
              <th className="permission-name">Permission</th>
              <th className="permission-description">Description</th>
              {ROPI_ROLES.map((role) => (
                <th key={role} className="role-cell">
                  <span className="role-name">{role}</span>
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {allPermissions.map((permission) => (
              <tr key={permission}>
                <td className="permission-name">
                  {PERMISSION_LABELS[permission] || permission}
                </td>
                <td className="permission-description">
                  {PERMISSION_DESCRIPTIONS[permission] || ''}
                </td>
                {ROPI_ROLES.map((role) => (
                  <td key={`${role}-${permission}`} className="role-cell">
                    <input
                      type="checkbox"
                      checked={permissions[role]?.[permission] || false}
                      onChange={() => togglePermission(role, permission)}
                      disabled={saving}
                      className="permission-checkbox"
                    />
                  </td>
                ))}
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      <div className="permissions-actions">
        <button
          onClick={savePermissions}
          disabled={!hasChanges() || saving}
          className="btn btn-primary"
        >
          {saving ? 'Saving...' : 'Save Changes'}
        </button>
        <button
          onClick={resetPermissions}
          disabled={saving}
          className="btn btn-secondary"
        >
          Reset to Defaults
        </button>
      </div>

      {isDefault && (
        <div className="info-message">
          ℹ️ Currently using default permissions
        </div>
      )}
    </div>
  );
}

export default PermissionsPage;
