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
      const res = await fetch('/admin/settings/attributes', {
        method: 'GET',
        headers: { 'Content-Type': 'application/json' },
      });
      if (!res.ok) {
        const text = await res.text();
        throw new Error(text || 'Failed to load attributes');
      }
      const body: ListResult = await res.json();
      setAttributes(body.items || []);
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : String(err);
      setError(message);
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
    const res = await fetch('/admin/settings/attributes', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(data),
    });
    if (!res.ok) {
      const errorText = await res.text();
      throw new Error(errorText || 'Failed to create attribute');
    }
    const created = await res.json();
    await fetchAttributes();
    return created;
  };

  /**
   * Update an existing attribute
   */
  const updateAttribute = async (id: string, patch: Partial<Attribute>): Promise<Attribute> => {
    const res = await fetch(`/admin/settings/attributes/${encodeURIComponent(id)}`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(patch),
    });
    if (!res.ok) {
      const errorText = await res.text();
      throw new Error(errorText || 'Failed to update attribute');
    }
    const updated = await res.json();
    await fetchAttributes();
    return updated;
  };

  /**
   * Delete an attribute
   */
  const deleteAttribute = async (id: string): Promise<boolean> => {
    const res = await fetch(`/admin/settings/attributes/${encodeURIComponent(id)}`, {
      method: 'DELETE',
    });
    if (!res.ok) {
      const errorText = await res.text();
      throw new Error(errorText || 'Failed to delete attribute');
    }
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
