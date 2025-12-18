/**
 * Value Normalization for CSV Imports
 * 
 * Normalizes incoming values to canonical allowed_values using:
 * 1. Exact match (case-insensitive)
 * 2. Synonyms mapping from registry
 * 
 * PVS-0.1.9
 */

import * as fs from 'fs';
import * as path from 'path';

export const UNKNOWN_VALUE = '__UNKNOWN__';

export interface ValueNormalization {
  originalValue: string;
  normalizedValue: string;
  isValid: boolean;
  matchType: 'exact' | 'synonym' | 'unknown';
}

export interface AttributeDefinition {
  attribute_id: string;
  data_type: string;
  allowed_values?: string[];
  synonyms?: string[] | Record<string, string>;
}

// Path to registry
const CONFIG_DIR = path.resolve(__dirname, '../../../sdk/config');
const REGISTRY_PATH = path.join(CONFIG_DIR, 'attributeRegistry.json');

// Cached registry
let registryCache: { attributes: AttributeDefinition[] } | null = null;

/**
 * Load attribute registry
 */
function loadRegistry(): { attributes: AttributeDefinition[] } {
  if (registryCache !== null) return registryCache;
  
  try {
    if (fs.existsSync(REGISTRY_PATH)) {
      const content = fs.readFileSync(REGISTRY_PATH, 'utf8');
      registryCache = JSON.parse(content);
      return registryCache!;
    }
  } catch (err) {
    console.warn('Failed to load attributeRegistry:', err);
  }
  
  registryCache = { attributes: [] };
  return registryCache;
}

/**
 * Get attribute definition by ID
 */
export function getAttributeDefinition(attributeId: string): AttributeDefinition | undefined {
  const registry = loadRegistry();
  return registry.attributes.find(a => a.attribute_id === attributeId);
}

/**
 * Build a lookup map from allowed values (case-insensitive)
 */
function buildAllowedValuesMap(allowedValues: string[]): Map<string, string> {
  const map = new Map<string, string>();
  for (const val of allowedValues) {
    map.set(val.toLowerCase().trim(), val);
  }
  return map;
}

/**
 * Build a synonyms lookup map
 * Synonyms can be:
 * - Array of strings that map to the canonical value
 * - Record<alias, canonical>
 */
function buildSynonymsMap(
  synonyms: string[] | Record<string, string> | undefined,
  allowedValues: string[]
): Map<string, string> {
  const map = new Map<string, string>();
  
  if (!synonyms) return map;
  
  if (Array.isArray(synonyms)) {
    // Array of synonyms - these are header synonyms, not value synonyms
    // For value normalization, we need to handle differently
    // Assume synonyms array contains alternate names for the attribute itself
    return map;
  }
  
  // Record<alias, canonical>
  for (const [alias, canonical] of Object.entries(synonyms)) {
    map.set(alias.toLowerCase().trim(), canonical);
  }
  
  return map;
}

/**
 * Normalize a single enum value
 */
export function normalizeEnumValue(
  value: string,
  allowedValues: string[],
  synonyms?: string[] | Record<string, string>
): ValueNormalization {
  const originalValue = value?.toString() || '';
  const trimmed = originalValue.trim();
  const lowerTrimmed = trimmed.toLowerCase();
  
  if (!trimmed) {
    return {
      originalValue,
      normalizedValue: '',
      isValid: true, // Empty is valid (handled by required validation separately)
      matchType: 'exact'
    };
  }
  
  // 1. Check exact match (case-insensitive)
  const allowedMap = buildAllowedValuesMap(allowedValues);
  if (allowedMap.has(lowerTrimmed)) {
    return {
      originalValue,
      normalizedValue: allowedMap.get(lowerTrimmed)!,
      isValid: true,
      matchType: 'exact'
    };
  }
  
  // 2. Check synonyms (if it's a record mapping)
  if (synonyms && typeof synonyms === 'object' && !Array.isArray(synonyms)) {
    const synonymsMap = buildSynonymsMap(synonyms, allowedValues);
    if (synonymsMap.has(lowerTrimmed)) {
      const canonical = synonymsMap.get(lowerTrimmed)!;
      // Verify canonical is in allowed values
      if (allowedMap.has(canonical.toLowerCase())) {
        return {
          originalValue,
          normalizedValue: allowedMap.get(canonical.toLowerCase())!,
          isValid: true,
          matchType: 'synonym'
        };
      }
    }
  }
  
  // 3. No match found
  return {
    originalValue,
    normalizedValue: UNKNOWN_VALUE,
    isValid: false,
    matchType: 'unknown'
  };
}

/**
 * Normalize a value for a specific attribute
 */
export function normalizeValueForAttribute(
  attributeId: string,
  value: string
): ValueNormalization {
  const attr = getAttributeDefinition(attributeId);
  
  if (!attr) {
    // Unknown attribute - pass through
    return {
      originalValue: value,
      normalizedValue: value,
      isValid: true,
      matchType: 'exact'
    };
  }
  
  // Only normalize enum types
  if (attr.data_type === 'select' || attr.data_type === 'enum') {
    if (attr.allowed_values && attr.allowed_values.length > 0) {
      return normalizeEnumValue(value, attr.allowed_values, attr.synonyms);
    }
  }
  
  // For multiSelect, normalize each value
  if (attr.data_type === 'multiSelect') {
    if (attr.allowed_values && attr.allowed_values.length > 0) {
      // If value contains separator, split and normalize each
      const separator = value.includes(';') ? ';' : ',';
      const values = value.split(separator).map(v => v.trim()).filter(Boolean);
      
      const normalizedParts: string[] = [];
      let allValid = true;
      
      for (const v of values) {
        const result = normalizeEnumValue(v, attr.allowed_values, attr.synonyms);
        if (result.isValid) {
          normalizedParts.push(result.normalizedValue);
        } else {
          normalizedParts.push(result.originalValue);
          allValid = false;
        }
      }
      
      return {
        originalValue: value,
        normalizedValue: normalizedParts.join(separator),
        isValid: allValid,
        matchType: allValid ? 'exact' : 'unknown'
      };
    }
  }
  
  // For other types, pass through
  return {
    originalValue: value,
    normalizedValue: value,
    isValid: true,
    matchType: 'exact'
  };
}

/**
 * Normalize a row of values given header mappings
 */
export function normalizeRow(
  row: Record<string, string>,
  headerToCanonical: Record<string, string | null>
): {
  normalized: Record<string, string>;
  validationErrors: Array<{ header: string; canonicalId: string; value: string; error: string }>;
} {
  const normalized: Record<string, string> = {};
  const validationErrors: Array<{ header: string; canonicalId: string; value: string; error: string }> = [];
  
  for (const [header, value] of Object.entries(row)) {
    const canonicalId = headerToCanonical[header];
    
    if (!canonicalId) {
      // Unknown header - skip or include raw
      continue;
    }
    
    const result = normalizeValueForAttribute(canonicalId, value);
    normalized[canonicalId] = result.normalizedValue;
    
    if (!result.isValid) {
      validationErrors.push({
        header,
        canonicalId,
        value,
        error: `Value "${value}" not in allowed values for ${canonicalId}`
      });
    }
  }
  
  return { normalized, validationErrors };
}

/**
 * Reset cached data (useful for testing)
 */
export function resetCache(): void {
  registryCache = null;
}
