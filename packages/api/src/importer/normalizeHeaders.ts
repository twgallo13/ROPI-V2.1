/**
 * Header Normalization for CSV Imports
 * 
 * Maps incoming CSV headers to canonical attribute IDs using:
 * 1. Direct alias mapping from canonicalAttributeMap.json
 * 2. toSnakeCase fallback with registry matching
 * 
 * PVS-0.1.9
 */

import * as fs from 'fs';
import * as path from 'path';

export type MappingConfidence = 'high' | 'medium' | 'low';

export interface HeaderMapping {
  originalHeader: string;
  canonicalId: string | null;
  confidence: MappingConfidence;
  matchType: 'alias' | 'exact' | 'normalized' | 'unknown';
}

// Path to config files
const CONFIG_DIR = path.resolve(__dirname, '../../../sdk/config');
const CANONICAL_MAP_PATH = path.join(CONFIG_DIR, 'canonicalAttributeMap.approved.json');
const REGISTRY_PATH = path.join(CONFIG_DIR, 'attributeRegistry.json');

// Cached data
let canonicalMap: Record<string, string> | null = null;
let registryAttributeIds: Set<string> | null = null;

/**
 * Convert string to snake_case
 * - dots → _
 * - camelCase → snake_case
 * - remove invalid chars
 * - lowercase
 */
export function toSnakeCase(s: string): string {
  if (!s) return '';
  return s
    .replace(/\./g, '_')
    .replace(/([a-z0-9])([A-Z])/g, '$1_$2')
    .replace(/[^A-Za-z0-9_-]/g, '_')
    .replace(/__+/g, '_')
    .replace(/^_|_$/g, '')
    .toLowerCase();
}

/**
 * Load canonical map from JSON file
 */
function loadCanonicalMap(): Record<string, string> {
  if (canonicalMap !== null) return canonicalMap;
  
  try {
    if (fs.existsSync(CANONICAL_MAP_PATH)) {
      const content = fs.readFileSync(CANONICAL_MAP_PATH, 'utf8');
      canonicalMap = JSON.parse(content);
      return canonicalMap!;
    }
  } catch (err) {
    console.warn('Failed to load canonicalAttributeMap:', err);
  }
  
  canonicalMap = {};
  return canonicalMap;
}

/**
 * Load registry attribute IDs
 */
function loadRegistryIds(): Set<string> {
  if (registryAttributeIds !== null) return registryAttributeIds;
  
  try {
    if (fs.existsSync(REGISTRY_PATH)) {
      const content = fs.readFileSync(REGISTRY_PATH, 'utf8');
      const registry = JSON.parse(content);
      registryAttributeIds = new Set(
        (registry.attributes || []).map((a: any) => a.attribute_id)
      );
      return registryAttributeIds;
    }
  } catch (err) {
    console.warn('Failed to load attributeRegistry:', err);
  }
  
  registryAttributeIds = new Set();
  return registryAttributeIds;
}

/**
 * Normalize a single header to canonical attribute ID
 */
export function normalizeHeader(header: string): HeaderMapping {
  const originalHeader = header.trim();
  const map = loadCanonicalMap();
  const registryIds = loadRegistryIds();
  
  // 1. Check direct alias mapping (high confidence)
  if (map[originalHeader]) {
    return {
      originalHeader,
      canonicalId: map[originalHeader],
      confidence: 'high',
      matchType: 'alias'
    };
  }
  
  // 2. Check if header is already a canonical ID (high confidence)
  if (registryIds.has(originalHeader)) {
    return {
      originalHeader,
      canonicalId: originalHeader,
      confidence: 'high',
      matchType: 'exact'
    };
  }
  
  // 3. Try snake_case normalization (medium confidence)
  const normalized = toSnakeCase(originalHeader);
  
  // Check if normalized matches canonical map
  if (map[normalized]) {
    return {
      originalHeader,
      canonicalId: map[normalized],
      confidence: 'medium',
      matchType: 'normalized'
    };
  }
  
  // Check if normalized matches registry ID
  if (registryIds.has(normalized)) {
    return {
      originalHeader,
      canonicalId: normalized,
      confidence: 'medium',
      matchType: 'normalized'
    };
  }
  
  // 4. No match found (low confidence / unknown)
  return {
    originalHeader,
    canonicalId: null,
    confidence: 'low',
    matchType: 'unknown'
  };
}

/**
 * Normalize all headers from a CSV
 * Returns mapping results and statistics
 */
export function normalizeHeaders(headers: string[]): {
  mappings: HeaderMapping[];
  stats: {
    total: number;
    high: number;
    medium: number;
    low: number;
    unknown: string[];
  };
} {
  const mappings = headers.map(normalizeHeader);
  
  const stats = {
    total: mappings.length,
    high: mappings.filter(m => m.confidence === 'high').length,
    medium: mappings.filter(m => m.confidence === 'medium').length,
    low: mappings.filter(m => m.confidence === 'low').length,
    unknown: mappings
      .filter(m => m.canonicalId === null)
      .map(m => m.originalHeader)
  };
  
  return { mappings, stats };
}

/**
 * Reset cached data (useful for testing)
 */
export function resetCache(): void {
  canonicalMap = null;
  registryAttributeIds = null;
}

/**
 * Set custom paths for testing
 */
export function setConfigPaths(mapPath: string, registryPath: string): void {
  // This would require refactoring to support, keeping simple for now
  resetCache();
}
