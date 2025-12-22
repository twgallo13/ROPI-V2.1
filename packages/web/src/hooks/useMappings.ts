/**
 * useMappings Hook
 * 
 * Manages mapping data for header aliases, value synonyms, and per-source overrides.
 * Calls PVS-0.3.1 mapping API endpoints.
 * 
 * Lisa PVS-0.3.2
 */

import { useState, useCallback } from 'react';
import { getAuthHeaders } from '../lib/authHeaders';

// API base URL
const API_BASE = import.meta.env.VITE_API_BASE_URL || '';

// =============================================
// Types (mirroring backend mappingService.ts)
// =============================================

export interface GlobalMapping {
  aliases: Record<string, string>;
  value_synonyms: Record<string, Record<string, string[]>>;
  updatedAt?: string;
  updatedBy?: string;
}

export interface SourceOverride {
  aliases?: Record<string, string>;
  value_synonyms?: Record<string, string[]>;
}

export interface AttributeMapping {
  aliases?: Record<string, string>;
  value_synonyms?: Record<string, string[]>;
  sources?: Record<string, SourceOverride>;
  updatedAt?: string;
  updatedBy?: string;
}

export interface MergedMapping {
  aliases: Record<string, string>;
  value_synonyms: Record<string, string[]>;
  source?: string;
  precedence: 'global' | 'attribute' | 'source';
}

export interface ImportPreviewResult {
  headers: {
    original: string;
    canonical: string | null;
    confidence: 'high' | 'medium' | 'low' | 'unknown';
    source: 'global' | 'attribute' | 'source' | 'exact' | 'normalized';
  }[];
  rows: Record<string, unknown>[];
  unknownHeaders: string[];
  unknownValues: Record<string, string[]>;
  totalRows: number;
  previewedRows: number;
}

// Alias entry with metadata for UI display
export interface AliasEntry {
  alias: string;
  canonicalId: string;
  source: 'global' | 'attribute' | 'source';
  sourceId?: string;
  confidence: 'high' | 'medium' | 'low';
  approved?: boolean;
  lastSeenCount?: number;
}

// =============================================
// Helper: Defensive JSON fetch
// =============================================

async function fetchJSON<T>(url: string, options?: RequestInit): Promise<T> {
  const res = await fetch(url, options);
  const text = await res.text();
  const contentType = res.headers.get('content-type') || '';

  if (!res.ok) {
    // Try to parse error JSON
    try {
      const errJson = JSON.parse(text);
      throw new Error(errJson.message || errJson.error || `HTTP ${res.status}`);
    } catch {
      throw new Error(`HTTP ${res.status}: ${text.substring(0, 200)}`);
    }
  }

  if (!contentType.includes('application/json')) {
    throw new Error(
      `Expected JSON but got ${contentType || 'unknown'}. Response: ${text.substring(0, 100)}`
    );
  }

  return JSON.parse(text) as T;
}

// =============================================
// useMappings Hook
// =============================================

export interface UseMappingsOptions {
  attributeId?: string;
}

export interface UseMappingsReturn {
  // Data
  globalMapping: GlobalMapping | null;
  attributeMapping: AttributeMapping | null;
  mergedAliases: AliasEntry[];
  
  // Loading states
  loading: boolean;
  saving: boolean;
  error: string | null;
  
  // Operations
  fetchGlobalMapping: () => Promise<void>;
  fetchAttributeMapping: (attributeId?: string) => Promise<void>;
  updateGlobalMapping: (data: Partial<GlobalMapping>, merge?: boolean) => Promise<void>;
  updateAttributeMapping: (attributeId: string, data: Partial<AttributeMapping>, merge?: boolean) => Promise<void>;
  deleteAttributeMapping: (attributeId: string) => Promise<void>;
  
  // Source overrides
  listSourceOverrides: (attributeId: string) => Promise<Record<string, SourceOverride>>;
  upsertSourceOverride: (attributeId: string, sourceId: string, data: SourceOverride, merge?: boolean) => Promise<void>;
  deleteSourceOverride: (attributeId: string, sourceId: string) => Promise<void>;
  
  // Import preview
  previewImport: (data: ImportPreviewInput) => Promise<ImportPreviewResult>;
  
  // Refresh
  refresh: () => Promise<void>;
}

export interface ImportPreviewInput {
  csvText?: string;
  headers?: string[];
  rows?: Record<string, string>[];
  sourceId?: string;
  attributeId?: string;
  maxRows?: number;
}

export function useMappings(options: UseMappingsOptions = {}): UseMappingsReturn {
  const { attributeId: initialAttributeId } = options;
  
  const [globalMapping, setGlobalMapping] = useState<GlobalMapping | null>(null);
  const [attributeMapping, setAttributeMapping] = useState<AttributeMapping | null>(null);
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [currentAttributeId, setCurrentAttributeId] = useState<string | undefined>(initialAttributeId);

  // Compute merged aliases from global + attribute mappings
  const mergedAliases: AliasEntry[] = (() => {
    const entries: AliasEntry[] = [];
    const seen = new Set<string>();
    
    // Attribute-level aliases take precedence
    if (attributeMapping?.aliases) {
      for (const [alias, canonicalId] of Object.entries(attributeMapping.aliases)) {
        const key = alias.toLowerCase();
        if (!seen.has(key)) {
          seen.add(key);
          entries.push({
            alias,
            canonicalId,
            source: 'attribute',
            confidence: alias.toLowerCase() === canonicalId.toLowerCase() ? 'high' : 'medium',
          });
        }
      }
    }
    
    // Global aliases as fallback
    if (globalMapping?.aliases) {
      for (const [alias, canonicalId] of Object.entries(globalMapping.aliases)) {
        const key = alias.toLowerCase();
        if (!seen.has(key)) {
          seen.add(key);
          entries.push({
            alias,
            canonicalId,
            source: 'global',
            confidence: alias.toLowerCase() === canonicalId.toLowerCase() ? 'high' : 'medium',
          });
        }
      }
    }
    
    return entries.sort((a, b) => a.alias.localeCompare(b.alias));
  })();

  // =============================================
  // Global Mapping Operations
  // =============================================

  const fetchGlobalMapping = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const headers = await getAuthHeaders();
      const data = await fetchJSON<GlobalMapping>(
        `${API_BASE}/api/admin/settings/mappings`,
        { headers, credentials: 'include' }
      );
      setGlobalMapping(data);
    } catch (err) {
      const message = err instanceof Error ? err.message : String(err);
      setError(message);
      console.error('fetchGlobalMapping error:', message);
    } finally {
      setLoading(false);
    }
  }, []);

  const updateGlobalMapping = useCallback(async (data: Partial<GlobalMapping>, merge = false) => {
    setSaving(true);
    setError(null);
    try {
      const headers = await getAuthHeaders();
      const url = `${API_BASE}/api/admin/settings/mappings${merge ? '?merge=true' : ''}`;
      const result = await fetchJSON<GlobalMapping>(url, {
        method: 'PUT',
        headers: { ...headers, 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify(data),
      });
      setGlobalMapping(result);
    } catch (err) {
      const message = err instanceof Error ? err.message : String(err);
      setError(message);
      throw err;
    } finally {
      setSaving(false);
    }
  }, []);

  // =============================================
  // Attribute Mapping Operations
  // =============================================

  const fetchAttributeMapping = useCallback(async (attrId?: string) => {
    // Defensive: if attrId is falsy, reset attributeMapping to an empty shape and return.
    // This prevents /attributes/mapping (no id) 404 errors during attribute creation.
    if (!attrId) {
      setAttributeMapping({ aliases: {}, value_synonyms: {} });
      setCurrentAttributeId(undefined);
      return;
    }

    setLoading(true);
    setError(null);
    setCurrentAttributeId(attrId);
    try {
      const headers = await getAuthHeaders();
      const data = await fetchJSON<AttributeMapping>(
        `${API_BASE}/api/admin/settings/attributes/${encodeURIComponent(attrId)}/mapping`,
        { headers, credentials: 'include' }
      );
      setAttributeMapping(data);
    } catch (err) {
      const message = err instanceof Error ? err.message : String(err);
      // 404 is expected for attributes without mappings
      if (message.includes('404') || message.includes('not found')) {
        setAttributeMapping({ aliases: {}, value_synonyms: {} });
      } else {
        setError(message);
        console.error('fetchAttributeMapping error:', message);
      }
    } finally {
      setLoading(false);
    }
  }, []);

  const updateAttributeMapping = useCallback(async (
    attrId: string,
    data: Partial<AttributeMapping>,
    merge = false
  ) => {
    setSaving(true);
    setError(null);
    try {
      const headers = await getAuthHeaders();
      const url = `${API_BASE}/api/admin/settings/attributes/${encodeURIComponent(attrId)}/mapping${merge ? '?merge=true' : ''}`;
      const result = await fetchJSON<AttributeMapping>(url, {
        method: 'PUT',
        headers: { ...headers, 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify(data),
      });
      setAttributeMapping(result);
    } catch (err) {
      const message = err instanceof Error ? err.message : String(err);
      setError(message);
      throw err;
    } finally {
      setSaving(false);
    }
  }, []);

  const deleteAttributeMapping = useCallback(async (attrId: string) => {
    setSaving(true);
    setError(null);
    try {
      const headers = await getAuthHeaders();
      await fetch(
        `${API_BASE}/api/admin/settings/attributes/${encodeURIComponent(attrId)}/mapping`,
        { method: 'DELETE', headers, credentials: 'include' }
      );
      setAttributeMapping(null);
    } catch (err) {
      const message = err instanceof Error ? err.message : String(err);
      setError(message);
      throw err;
    } finally {
      setSaving(false);
    }
  }, []);

  // =============================================
  // Source Override Operations
  // =============================================

  const listSourceOverrides = useCallback(async (attrId: string): Promise<Record<string, SourceOverride>> => {
    const headers = await getAuthHeaders();
    const data = await fetchJSON<{ sources: Record<string, SourceOverride> }>(
      `${API_BASE}/api/admin/settings/attributes/${encodeURIComponent(attrId)}/mapping/sources`,
      { headers, credentials: 'include' }
    );
    return data.sources || {};
  }, []);

  const upsertSourceOverride = useCallback(async (
    attrId: string,
    sourceId: string,
    data: SourceOverride,
    merge = false
  ) => {
    setSaving(true);
    setError(null);
    try {
      const headers = await getAuthHeaders();
      const url = `${API_BASE}/api/admin/settings/attributes/${encodeURIComponent(attrId)}/mapping/sources/${encodeURIComponent(sourceId)}${merge ? '?merge=true' : ''}`;
      await fetchJSON<SourceOverride>(url, {
        method: 'PUT',
        headers: { ...headers, 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify(data),
      });
      // Refresh attribute mapping to get updated sources
      await fetchAttributeMapping(attrId);
    } catch (err) {
      const message = err instanceof Error ? err.message : String(err);
      setError(message);
      throw err;
    } finally {
      setSaving(false);
    }
  }, [fetchAttributeMapping]);

  const deleteSourceOverride = useCallback(async (attrId: string, sourceId: string) => {
    setSaving(true);
    setError(null);
    try {
      const headers = await getAuthHeaders();
      await fetch(
        `${API_BASE}/api/admin/settings/attributes/${encodeURIComponent(attrId)}/mapping/sources/${encodeURIComponent(sourceId)}`,
        { method: 'DELETE', headers, credentials: 'include' }
      );
      // Refresh attribute mapping
      await fetchAttributeMapping(attrId);
    } catch (err) {
      const message = err instanceof Error ? err.message : String(err);
      setError(message);
      throw err;
    } finally {
      setSaving(false);
    }
  }, [fetchAttributeMapping]);

  // =============================================
  // Import Preview
  // =============================================

  const previewImport = useCallback(async (input: ImportPreviewInput): Promise<ImportPreviewResult> => {
    const headers = await getAuthHeaders();
    const result = await fetchJSON<ImportPreviewResult>(
      `${API_BASE}/api/admin/imports/preview`,
      {
        method: 'POST',
        headers: { ...headers, 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify(input),
      }
    );
    return result;
  }, []);

  // =============================================
  // Refresh
  // =============================================

  const refresh = useCallback(async () => {
    await fetchGlobalMapping();
    if (currentAttributeId) {
      await fetchAttributeMapping(currentAttributeId);
    }
  }, [fetchGlobalMapping, fetchAttributeMapping, currentAttributeId]);

  return {
    globalMapping,
    attributeMapping,
    mergedAliases,
    loading,
    saving,
    error,
    fetchGlobalMapping,
    fetchAttributeMapping,
    updateGlobalMapping,
    updateAttributeMapping,
    deleteAttributeMapping,
    listSourceOverrides,
    upsertSourceOverride,
    deleteSourceOverride,
    previewImport,
    refresh,
  };
}
