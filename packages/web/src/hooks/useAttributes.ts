/**
 * useAttributes Hook
 * 
 * Fetches, creates, updates, and deletes product attributes via the admin API.
 * 
 * Lisa v1.0.0
 * 
 * References:
 * - Attribute Registry: https://www.notion.so/2b845ee1ec5a81228b07ca97964cd033
 * - Attribute Validation Schema: https://www.notion.so/2b845ee1ec5a805fba0ef665dfb17396
 */

import { useState, useEffect, useCallback, useMemo } from 'react';
import { getAuth, onAuthStateChanged } from 'firebase/auth';
import { getAuthHeaders } from '../lib/authHeaders';

export type Attribute = {
  attribute_id: string;
  label: string;
  external_header?: string;
  category?: string;
  data_type: 'string' | 'number' | 'boolean' | 'enum' | 'currency' | 'json' | 'multiSelect' | 'date';
  allowed_values?: string[];
  synonyms?: string[];
  required_for_completion?: boolean;
  required_for_export?: boolean;
  import_required?: boolean;
  ai_usage_notes?: string;
  status?: 'active' | 'deprecated' | 'hidden';
  createdBy?: string;
  createdAt?: string;
  updatedBy?: string;
  updatedAt?: string;
};

type ListResult = {
  items: Attribute[];
  total?: number;
  pageToken?: string;
  hasMore?: boolean;
};

// API base URL - can be overridden via env var for debugging
const API_BASE = import.meta.env.VITE_API_BASE_URL || '';

// LocalStorage key for pinned attributes
const PINNED_KEY = 'aoss:pinnedAttributes:v1';

/**
 * Load pinned attributes from localStorage
 */
function loadPinned(): Record<string, Attribute> {
  try {
    const raw = localStorage.getItem(PINNED_KEY);
    if (!raw) return {};
    return JSON.parse(raw);
  } catch (err) {
    console.warn('Failed to parse pinned attributes from localStorage', err);
    return {};
  }
}

/**
 * Save pinned attributes to localStorage
 */
function savePinned(map: Record<string, Attribute>): void {
  try {
    localStorage.setItem(PINNED_KEY, JSON.stringify(map));
  } catch (err) {
    console.warn('Failed to save pinned attributes to localStorage', err);
  }
}

/**
 * Defensive JSON fetch helper
 * Validates content-type and provides helpful error messages when HTML is returned
 */
async function fetchJSON<T>(url: string, options?: RequestInit): Promise<T> {
  const res = await fetch(url, options);
  const text = await res.text();
  const contentType = res.headers.get('content-type') || '';

  if (!res.ok) {
    // Provide context for non-ok responses
    throw new Error(`HTTP ${res.status}: ${text.substring(0, 400)}`);
  }

  if (!contentType.includes('application/json')) {
    // This catches the HTML response issue
    throw new Error(
      `Expected JSON response but got ${contentType || 'unknown content-type'}. ` +
      `Response starts with: ${text.substring(0, 200)}... ` +
      `This usually means the API route is not configured correctly.`
    );
  }

  try {
    return JSON.parse(text) as T;
  } catch (parseErr) {
    throw new Error(`Failed to parse JSON: ${text.substring(0, 200)}`);
  }
}

/**
 * Hook to manage product attributes via the admin API.
 * 
 * Uses a "pinned" pattern: newly-created attributes are stored in localStorage
 * so they survive page refreshes until the server list includes them.
 * 
 * @returns Object containing attributes array, loading state, error state,
 *          and CRUD functions (createAttribute, updateAttribute, deleteAttribute, refresh)
 */
export function useAttributes() {
  // Server-authoritative list
  const [serverAttributes, setServerAttributes] = useState<Attribute[]>([]);
  // Locally-pinned items (survive refresh, cleared when server list includes them)
  const [pinnedMap, setPinnedMap] = useState<Record<string, Attribute>>(() => loadPinned());
  const [loading, setLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);

  // Derived merged list: pinned items first (sorted by label), then server items (deduped)
  const attributes = useMemo(() => {
    const pinnedIds = new Set(Object.keys(pinnedMap));
    const pinned = Object.values(pinnedMap).sort((a, b) =>
      (a.label ?? '').localeCompare(b.label ?? '')
    );
    const serverFiltered = serverAttributes.filter(a => !pinnedIds.has(a.attribute_id));
    return [...pinned, ...serverFiltered];
  }, [pinnedMap, serverAttributes]);

  const fetchAttributes = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const headers = await getAuthHeaders();
      const url = `${API_BASE}/admin/settings/attributes`;
      const body = await fetchJSON<ListResult>(url, {
        method: 'GET',
        headers,
        credentials: 'include',
      });
      const serverItems = body.items || [];
      setServerAttributes(serverItems);

      // Remove pinned items that now exist in server list
      setPinnedMap((prev) => {
        const serverIds = new Set(serverItems.map((a) => a.attribute_id));
        let changed = false;
        const next: Record<string, Attribute> = {};
        for (const [id, attr] of Object.entries(prev)) {
          if (!serverIds.has(id)) {
            next[id] = attr;
          } else {
            changed = true;
          }
        }
        if (changed) {
          savePinned(next);
        }
        return changed ? next : prev;
      });
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : String(err);
      // Provide friendly error messages for auth issues
      if (message.includes('NotAuthenticated')) {
        setError('You must be signed in to view attributes. Please sign in and try again.');
      } else if (message.includes('HTTP 401') || message.includes('Unauthorized')) {
        setError('You are not authorized to view attributes. Please ensure you have admin access.');
      } else if (message.includes('HTTP 403')) {
        setError('Access denied. Admin privileges required.');
      } else {
        setError(message);
      }
      console.error('Error fetching attributes:', message);
    } finally {
      setLoading(false);
    }
  }, []);

  // Call once, and also retry on auth state change (so fetch runs after the user signs in)
  useEffect(() => {
    fetchAttributes(); // attempt immediately

    const auth = getAuth();
    const unsubscribe = onAuthStateChanged(auth, (user) => {
      // If user becomes signed in, re-run to pick up token
      if (user) {
        fetchAttributes().catch(() => { /* swallow; state handled above */ });
      }
    });
    return () => unsubscribe();
  }, [fetchAttributes]);

  /**
   * Create a new attribute.
   * Pins the item to localStorage so it survives page refresh until server returns it.
   */
  const createAttribute = async (data: Omit<Attribute, 'createdAt' | 'updatedAt'>): Promise<Attribute> => {
    const headers = await getAuthHeaders();
    const url = `${API_BASE}/admin/settings/attributes`;

    // POST to server: this returns the created attribute
    const created = await fetchJSON<Attribute>(url, {
      method: 'POST',
      headers,
      credentials: 'include',
      body: JSON.stringify(data),
    });

    // Pin to localStorage so it survives page refresh
    setPinnedMap((prev) => {
      const next = { ...prev, [created.attribute_id]: created };
      savePinned(next);
      return next;
    });

    // Background refresh from server (will eventually clear the pin)
    fetchAttributes().catch(err => {
      console.warn('Background refresh failed after create:', err);
    });

    return created;
  };

  /**
   * Update an existing attribute (optimistic update, then refresh)
   */
  const updateAttribute = async (id: string, patch: Partial<Attribute>): Promise<Attribute> => {
    const headers = await getAuthHeaders();
    const url = `${API_BASE}/admin/settings/attributes/${encodeURIComponent(id)}`;
    const updated = await fetchJSON<Attribute>(url, {
      method: 'PUT',
      headers,
      credentials: 'include',
      body: JSON.stringify(patch),
    });

    // Optimistically update pinned or server list
    if (pinnedMap[id]) {
      setPinnedMap((prev) => {
        const next = { ...prev, [id]: updated };
        savePinned(next);
        return next;
      });
    } else {
      setServerAttributes(prev => prev.map(a => (a.attribute_id === updated.attribute_id ? updated : a)));
    }

    // Refresh to keep pagination & counts in sync
    fetchAttributes().catch(err => {
      console.warn('Background refresh failed after update:', err);
    });

    return updated;
  };

  /**
   * Delete an attribute (optimistic remove, then refresh)
   */
  const deleteAttribute = async (id: string): Promise<boolean> => {
    const headers = await getAuthHeaders();
    const url = `${API_BASE}/admin/settings/attributes/${encodeURIComponent(id)}`;
    await fetchJSON<{ success: boolean }>(url, {
      method: 'DELETE',
      headers,
      credentials: 'include',
    });

    // Optimistically remove from pinned or server list
    if (pinnedMap[id]) {
      setPinnedMap((prev) => {
        const next = { ...prev };
        delete next[id];
        savePinned(next);
        return next;
      });
    } else {
      setServerAttributes(prev => prev.filter(a => a.attribute_id !== id));
    }

    // Refresh to keep server state reflected (and pageToken)
    fetchAttributes().catch(err => {
      console.warn('Background refresh failed after delete:', err);
    });

    return true;
  };

  return {
    attributes,
    loading,
    error,
    createAttribute,
    updateAttribute,
    deleteAttribute,
    refresh: fetchAttributes,
  };
}

export default useAttributes;
