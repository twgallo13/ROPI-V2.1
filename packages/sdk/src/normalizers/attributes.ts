/**
 * Attribute Value Normalizers
 * 
 * Normalizes attribute values from imported data to canonical values
 * defined in the attribute registry.
 * 
 * Lisa v1.0.0
 */

import normalizersConfig from '../../config/attributeNormalizers.json';

// Type for the normalizers config
type NormalizerMap = Record<string, Record<string, string>>;
const normalizers: NormalizerMap = normalizersConfig;

/**
 * Normalize an attribute value to its canonical form.
 * 
 * @param attributeId - The attribute key (e.g., 'gender', 'primary_color')
 * @param rawValue - The raw value from imported data
 * @param allowedValues - Optional array of allowed values from the registry
 * @returns The normalized value, or the original if no normalization needed
 */
export function mapAttributeValue(
  attributeId: string,
  rawValue: unknown,
  allowedValues?: string[]
): unknown {
  // Only normalize strings
  if (typeof rawValue !== 'string') {
    return rawValue;
  }

  const raw = rawValue.trim();
  if (!raw) return rawValue;

  // Check if there's an explicit mapping for this attribute
  const attrNormalizers = normalizers[attributeId];
  if (attrNormalizers && attrNormalizers[raw]) {
    return attrNormalizers[raw];
  }

  // If no explicit mapping, try common transformations
  const cleaned = cleanColorValue(raw);
  
  // If allowed values provided, try to match case-insensitively
  if (allowedValues && allowedValues.length > 0) {
    const lowerCleaned = cleaned.toLowerCase();
    for (const allowed of allowedValues) {
      if (allowed.toLowerCase() === lowerCleaned) {
        return allowed;
      }
    }
    // Also try with the original raw value
    const lowerRaw = raw.toLowerCase();
    for (const allowed of allowedValues) {
      if (allowed.toLowerCase() === lowerRaw) {
        return allowed;
      }
    }
  }

  // Return cleaned value if different from raw, otherwise return raw
  return cleaned !== raw ? cleaned : rawValue;
}

/**
 * Clean color values by collapsing duplicates and normalizing case.
 * e.g., "BLACK/BLACK" -> "Black", "BLUE - BLUE" -> "Blue"
 */
function cleanColorValue(value: string): string {
  // Check for duplicate patterns like "BLACK/BLACK" or "BLUE - BLUE"
  const slashParts = value.split('/').map(p => p.trim());
  if (slashParts.length === 2 && slashParts[0].toLowerCase() === slashParts[1].toLowerCase()) {
    return capitalizeFirst(slashParts[0]);
  }

  const dashParts = value.split(' - ').map(p => p.trim());
  if (dashParts.length === 2 && dashParts[0].toLowerCase() === dashParts[1].toLowerCase()) {
    return capitalizeFirst(dashParts[0]);
  }

  return value;
}

/**
 * Capitalize the first letter and lowercase the rest
 */
function capitalizeFirst(str: string): string {
  if (!str) return str;
  return str.charAt(0).toUpperCase() + str.slice(1).toLowerCase();
}

/**
 * Normalize all attribute values in a product's attributes map.
 * 
 * @param attributes - The attributes map to normalize
 * @param registry - Optional map of attribute_id to allowed_values
 * @returns Object with normalized attributes and a list of changes made
 */
export function normalizeAttributes(
  attributes: Record<string, unknown>,
  registry?: Map<string, string[]>
): { normalized: Record<string, unknown>; changes: Array<{ key: string; from: unknown; to: unknown }> } {
  const normalized: Record<string, unknown> = {};
  const changes: Array<{ key: string; from: unknown; to: unknown }> = [];

  for (const [key, value] of Object.entries(attributes)) {
    const allowedValues = registry?.get(key);
    const normalizedValue = mapAttributeValue(key, value, allowedValues);
    
    normalized[key] = normalizedValue;
    
    if (normalizedValue !== value) {
      changes.push({ key, from: value, to: normalizedValue });
    }
  }

  return { normalized, changes };
}

export default {
  mapAttributeValue,
  normalizeAttributes,
};
