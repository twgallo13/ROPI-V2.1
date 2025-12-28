/**
 * Attributes Service
 * LP-importer-mapping-recon-1.2.0: Provides registry-driven attribute fetching
 * for import mapping UI.
 * 
 * This service is separate from useAttributes hook to allow simpler usage
 * in components that don't need the full hook functionality.
 */

import { getAuthHeaders } from '../lib/authHeaders';

// API base URL - can be overridden via env var for debugging
const API_BASE = import.meta.env.VITE_API_BASE_URL || '';

export type Attribute = {
  attribute_id: string;
  label: string;
  external_header?: string;
  category?: string;
  data_type?: string;
  allowed_values?: string[];
  allow_custom_values?: boolean;
  synonyms?: string[] | Record<string, string[]>;
  required_for_completion?: boolean;
  required_for_export?: boolean;
  import_required?: boolean;
  ai_usage_notes?: string;
  usage?: string; // 'reference_only' etc.
  status?: 'active' | 'deprecated' | 'hidden';
  // LP-1.2.0: CSV header aliases that should map to this attribute
  importerColumns?: string[];
};

type ListResult = {
  items: Attribute[];
  total?: number;
  pageToken?: string;
  hasMore?: boolean;
};

/**
 * Fetch all attributes from the registry API.
 * LP-importer-mapping-recon-1.2.0: Used by ImportMappingStep for registry-driven options.
 * 
 * @returns Array of Attribute objects from the registry
 * @throws Error if fetch fails or response is not valid JSON
 */
export async function listAttributes(): Promise<Attribute[]> {
  try {
    const headers = await getAuthHeaders();
    // Fetch with high limit to get all attributes
    const url = `${API_BASE}/api/admin/settings/attributes?limit=2000`;
    
    const res = await fetch(url, {
      method: 'GET',
      headers,
      credentials: 'include',
    });
    
    if (!res.ok) {
      throw new Error(`Failed to fetch attributes: ${res.status} ${res.statusText}`);
    }
    
    const contentType = res.headers.get('content-type') || '';
    if (!contentType.includes('application/json')) {
      throw new Error(`Expected JSON response but got ${contentType}`);
    }
    
    const payload: ListResult = await res.json();
    // Handle both { items: [...] } and direct array response shapes
    return payload.items ?? (payload as unknown as Attribute[]);
  } catch (err) {
    console.error('listAttributes failed:', err);
    throw err;
  }
}

/**
 * Build importer column aliases for an attribute.
 * LP-1.2.0: Maps attribute metadata to CSV header aliases for autosuggest.
 * 
 * Uses external_header, synonyms, and the attribute_id itself as possible
 * CSV column names that should map to this attribute.
 */
export function buildImporterColumns(attr: Attribute): string[] {
  const columns: Set<string> = new Set();
  
  // Add attribute_id (snake_case and variants)
  columns.add(attr.attribute_id);
  
  // Add label
  if (attr.label) {
    columns.add(attr.label);
  }
  
  // Add external_header if different from label
  if (attr.external_header && attr.external_header !== attr.label) {
    columns.add(attr.external_header);
  }
  
  // Add pre-configured importerColumns
  if (attr.importerColumns) {
    for (const col of attr.importerColumns) {
      columns.add(col);
    }
  }
  
  // Add synonyms if it's a string array (legacy format)
  if (Array.isArray(attr.synonyms)) {
    for (const syn of attr.synonyms) {
      if (typeof syn === 'string') {
        columns.add(syn);
      }
    }
  }
  
  return Array.from(columns);
}
