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

import { useState, useEffect, useCallback } from 'react';
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
 * @returns Object containing attributes array, loading state, error state,
 *          and CRUD functions (createAttribute, updateAttribute, deleteAttribute, refresh)
 */
export function useAttributes() {
  const [attributes, setAttributes] = useState<Attribute[]>([]);
  const [loading, setLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);

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
      setAttributes(body.items || []);
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

  useEffect(() => {
    fetchAttributes();
  }, [fetchAttributes]);

  /**
   * Create a new attribute
   */
  const createAttribute = async (data: Omit<Attribute, 'createdAt' | 'updatedAt'>): Promise<Attribute> => {
    const headers = await getAuthHeaders();
    const url = `${API_BASE}/admin/settings/attributes`;
    const created = await fetchJSON<Attribute>(url, {
      method: 'POST',
      headers,
      credentials: 'include',
      body: JSON.stringify(data),
    });
    await fetchAttributes();
    return created;
  };

  /**
   * Update an existing attribute
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
    await fetchAttributes();
    return updated;
  };

  /**
   * Delete an attribute
   */
  const deleteAttribute = async (id: string): Promise<boolean> => {
    const headers = await getAuthHeaders();
    const url = `${API_BASE}/admin/settings/attributes/${encodeURIComponent(id)}`;
    await fetchJSON<{ success: boolean }>(url, {
      method: 'DELETE',
      headers,
      credentials: 'include',
    });
    await fetchAttributes();
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
