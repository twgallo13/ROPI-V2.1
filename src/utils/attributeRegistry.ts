/**
 * Attribute Registry Helper
 * Dynamically loads attribute metadata from Firestore settings/attributes/keys/*
 * Used by importer UI to build mapping dropdowns and resolve CSV headers to canonical paths
 * 
 * Lisa v2.0 - Phase 2 Dynamic Importer
 */

import { collection, getDocs, getFirestore } from 'firebase/firestore';

export type AttributeMetadata = {
  key: string;
  canonicalPath: string;
  label: string;
  category: string;
  dataType: string;
  required: boolean;
  export: boolean;
  description: string;
  importerColumns: string[];
  legacyPaths: string[];
  systemFlag?: boolean;
  rules?: unknown[];
  usage?: unknown[];
  examples?: {
    sampleValues: unknown[];
  };
};

let cachedRegistry: AttributeMetadata[] | null = null;
let cacheTimestamp: number = 0;
const CACHE_TTL_MS = 5 * 60 * 1000; // 5 minutes

/**
 * Fetch attribute registry from Firestore settings/attributes/keys/*
 * Returns cached result if available and fresh
 */
export async function getAttributeRegistry(options: { forceRefresh?: boolean } = {}): Promise<AttributeMetadata[]> {
  const now = Date.now();
  
  // Return cached registry if valid
  if (!options.forceRefresh && cachedRegistry && (now - cacheTimestamp < CACHE_TTL_MS)) {
    console.log('[attributeRegistry] Using cached registry:', cachedRegistry.length, 'attributes');
    return cachedRegistry;
  }
  
  try {
    console.log('[attributeRegistry] Fetching registry from Firestore...');
    const db = getFirestore();
    const keysCollectionRef = collection(db, 'settings', 'attributes', 'keys');
    const snapshot = await getDocs(keysCollectionRef);
    
    const attributes: AttributeMetadata[] = [];
    snapshot.forEach(doc => {
      const data = doc.data();
      attributes.push({
        key: data.key || doc.id,
        canonicalPath: data.canonicalPath || '',
        label: data.label || data.key || doc.id,
        category: data.category || 'Other',
        dataType: data.dataType || 'string',
        required: data.required === true,
        export: data.export !== false, // default true
        description: data.description || '',
        importerColumns: Array.isArray(data.importerColumns) ? data.importerColumns : [],
        legacyPaths: Array.isArray(data.legacyPaths) ? data.legacyPaths : [],
        systemFlag: data.systemFlag === true,
        rules: data.rules || [],
        usage: data.usage || [],
        examples: data.examples || { sampleValues: [] },
      });
    });
    
    // Sort by category then label for UI consistency
    attributes.sort((a, b) => {
      if (a.category !== b.category) return a.category.localeCompare(b.category);
      return a.label.localeCompare(b.label);
    });
    
    cachedRegistry = attributes;
    cacheTimestamp = now;
    
    console.log('[attributeRegistry] Loaded', attributes.length, 'attributes from Firestore');
    return attributes;
  } catch (error) {
    console.error('[attributeRegistry] Failed to fetch registry:', error);
    
    // Return cached registry as fallback, even if stale
    if (cachedRegistry) {
      console.warn('[attributeRegistry] Using stale cache as fallback');
      return cachedRegistry;
    }
    
    // If no cache available, throw
    throw new Error(`Failed to load attribute registry: ${error instanceof Error ? error.message : String(error)}`);
  }
}

/**
 * Get only attributes that are importable (non-empty importerColumns)
 */
export async function getImportableAttributes(options: { forceRefresh?: boolean } = {}): Promise<AttributeMetadata[]> {
  const allAttributes = await getAttributeRegistry(options);
  return allAttributes.filter(attr => attr.importerColumns.length > 0);
}

/**
 * Build a map from CSV header (case-insensitive) to canonical path
 */
export async function buildHeaderToPathMap(options: { forceRefresh?: boolean } = {}): Promise<Map<string, string>> {
  const importableAttributes = await getImportableAttributes(options);
  const map = new Map<string, string>();
  
  for (const attr of importableAttributes) {
    // Map all importer columns to this canonical path
    for (const col of attr.importerColumns) {
      const normalized = col.toLowerCase().trim();
      if (!map.has(normalized)) {
        map.set(normalized, attr.canonicalPath);
      }
    }
    
    // Also map the label (case-insensitive)
    const labelNorm = attr.label.toLowerCase().trim();
    if (!map.has(labelNorm)) {
      map.set(labelNorm, attr.canonicalPath);
    }
    
    // Legacy paths as well
    for (const legacy of attr.legacyPaths) {
      const legacyNorm = legacy.toLowerCase().trim();
      if (!legacyNorm.startsWith('_') && !map.has(legacyNorm)) {
        map.set(legacyNorm, attr.canonicalPath);
      }
    }
  }
  
  return map;
}

/**
 * Resolve a CSV header to a canonical path using the registry
 * Returns null if no match found
 */
export async function resolveHeaderToPath(csvHeader: string, options: { forceRefresh?: boolean } = {}): Promise<string | null> {
  const map = await buildHeaderToPathMap(options);
  const normalized = csvHeader.toLowerCase().trim();
  return map.get(normalized) || null;
}

/**
 * Clear the cache (useful for testing or forced refresh)
 */
export function clearRegistryCache(): void {
  cachedRegistry = null;
  cacheTimestamp = 0;
  console.log('[attributeRegistry] Cache cleared');
}

/**
 * Get registry status for debugging
 */
export function getRegistryStatus(): { cached: boolean; count: number; age: number } {
  return {
    cached: cachedRegistry !== null,
    count: cachedRegistry?.length || 0,
    age: cachedRegistry ? Date.now() - cacheTimestamp : 0,
  };
}
