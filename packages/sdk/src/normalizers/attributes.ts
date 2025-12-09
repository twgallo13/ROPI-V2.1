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

// ============================================================================
// Advanced Matching Functions for Attribute Reconciliation (Homer v1.0.0)
// ============================================================================

export interface MatchResult {
  matched: boolean;
  confidence: number; // 0-1
  matchedValue: string | null;
  matchType: 'EXACT' | 'CASE_INSENSITIVE' | 'WHITESPACE' | 'FUZZY' | 'PARTIAL' | 'NONE';
  originalValue: string;
}

export interface NormalizationOptions {
  trimWhitespace?: boolean;
  lowercase?: boolean;
  removeSpecialChars?: boolean;
  collapseWhitespace?: boolean;
}

/**
 * Normalize a string for matching (more aggressive than cleanColorValue)
 * 
 * Default options: trim, collapse whitespace, lowercase
 */
export function normalizeStringForMatching(
  value: string | null | undefined,
  options: NormalizationOptions = {}
): string {
  if (!value) return '';
  
  const {
    trimWhitespace = true,
    lowercase = true,
    removeSpecialChars = false,
    collapseWhitespace = true,
  } = options;
  
  let normalized = String(value);
  
  if (trimWhitespace) {
    normalized = normalized.trim();
  }
  
  if (collapseWhitespace) {
    normalized = normalized.replace(/\s+/g, ' ');
  }
  
  if (lowercase) {
    normalized = normalized.toLowerCase();
  }
  
  if (removeSpecialChars) {
    // Keep alphanumeric, spaces, and basic punctuation
    normalized = normalized.replace(/[^a-z0-9\s\-_/]/gi, '');
  }
  
  return normalized;
}

/**
 * Calculate Levenshtein distance between two strings
 * Used for fuzzy matching
 */
function levenshteinDistance(a: string, b: string): number {
  const matrix: number[][] = [];
  
  for (let i = 0; i <= b.length; i++) {
    matrix[i] = [i];
  }
  
  for (let j = 0; j <= a.length; j++) {
    matrix[0][j] = j;
  }
  
  for (let i = 1; i <= b.length; i++) {
    for (let j = 1; j <= a.length; j++) {
      if (b.charAt(i - 1) === a.charAt(j - 1)) {
        matrix[i][j] = matrix[i - 1][j - 1];
      } else {
        matrix[i][j] = Math.min(
          matrix[i - 1][j - 1] + 1, // substitution
          matrix[i][j - 1] + 1,     // insertion
          matrix[i - 1][j] + 1      // deletion
        );
      }
    }
  }
  
  return matrix[b.length][a.length];
}

/**
 * Calculate similarity score (0-1) between two strings
 */
function similarityScore(a: string, b: string): number {
  const maxLen = Math.max(a.length, b.length);
  if (maxLen === 0) return 1.0;
  
  const distance = levenshteinDistance(a, b);
  return 1 - (distance / maxLen);
}

/**
 * Find the best match for a raw value against a list of allowed values
 * 
 * Returns the best match with confidence score and match type.
 * Used by reconciliation system to suggest mappings.
 * 
 * @param rawValue - The raw value to match
 * @param allowedValues - List of canonical allowed values (strings or objects with 'value' property)
 * @param minConfidence - Minimum confidence threshold (0-1). Default 0.7
 * @returns MatchResult with best match and confidence
 */
export function bestMatchAgainstAllowedValues(
  rawValue: string | null | undefined,
  allowedValues: (string | { value: string; label?: string })[] | null | undefined,
  minConfidence: number = 0.7
): MatchResult {
  // Handle null/empty inputs
  if (!rawValue || !allowedValues || allowedValues.length === 0) {
    return {
      matched: false,
      confidence: 0,
      matchedValue: null,
      matchType: 'NONE',
      originalValue: rawValue || '',
    };
  }
  
  const raw = String(rawValue).trim();
  
  // Extract string values from allowed values
  const allowedStrings = allowedValues.map(av =>
    typeof av === 'string' ? av : av.value
  );
  
  // 1. Try exact match (case-sensitive)
  if (allowedStrings.includes(raw)) {
    return {
      matched: true,
      confidence: 1.0,
      matchedValue: raw,
      matchType: 'EXACT',
      originalValue: raw,
    };
  }
  
  // 2. Try case-insensitive match
  const rawLower = raw.toLowerCase();
  const caseMatch = allowedStrings.find(av => av.toLowerCase() === rawLower);
  if (caseMatch) {
    return {
      matched: true,
      confidence: 0.95,
      matchedValue: caseMatch,
      matchType: 'CASE_INSENSITIVE',
      originalValue: raw,
    };
  }
  
  // 3. Try normalized match (whitespace + case)
  const rawNorm = normalizeStringForMatching(raw);
  const whitespaceMatch = allowedStrings.find(av =>
    normalizeStringForMatching(av) === rawNorm
  );
  if (whitespaceMatch) {
    return {
      matched: true,
      confidence: 0.9,
      matchedValue: whitespaceMatch,
      matchType: 'WHITESPACE',
      originalValue: raw,
    };
  }
  
  // 4. Try fuzzy matching (Levenshtein distance)
  let bestMatch: string | null = null;
  let bestScore = 0;
  
  for (const allowed of allowedStrings) {
    const score = similarityScore(rawNorm, normalizeStringForMatching(allowed));
    if (score > bestScore) {
      bestScore = score;
      bestMatch = allowed;
    }
  }
  
  // 5. Check for partial match (substring)
  const partialMatch = allowedStrings.find(av => {
    const avNorm = normalizeStringForMatching(av);
    return avNorm.includes(rawNorm) || rawNorm.includes(avNorm);
  });
  
  if (partialMatch && bestScore < 0.8) {
    return {
      matched: bestScore >= minConfidence,
      confidence: 0.75,
      matchedValue: partialMatch,
      matchType: 'PARTIAL',
      originalValue: raw,
    };
  }
  
  // Return best fuzzy match if above threshold
  if (bestMatch && bestScore >= minConfidence) {
    return {
      matched: true,
      confidence: bestScore,
      matchedValue: bestMatch,
      matchType: 'FUZZY',
      originalValue: raw,
    };
  }
  
  // No good match found
  return {
    matched: false,
    confidence: bestScore,
    matchedValue: bestMatch,
    matchType: 'NONE',
    originalValue: raw,
  };
}

/**
 * Batch normalize and match multiple values
 */
export function batchMatchValues(
  rawValues: string[],
  allowedValues: (string | { value: string })[] | null,
  minConfidence: number = 0.7
): MatchResult[] {
  return rawValues.map(raw =>
    bestMatchAgainstAllowedValues(raw, allowedValues, minConfidence)
  );
}

/**
 * Generate mapping suggestions for reconciliation
 * 
 * Groups raw values by their best match and provides statistics
 */
export interface MappingSuggestion {
  rawValue: string;
  suggestedCanonical: string | null;
  confidence: number;
  matchType: string;
  productCount: number;
  autoApply: boolean; // true if confidence >= autoThreshold
}

export function generateMappingSuggestions(
  valueCounts: { value: string; count: number }[],
  allowedValues: (string | { value: string })[] | null,
  autoApplyThreshold: number = 0.9
): MappingSuggestion[] {
  return valueCounts.map(({ value, count }) => {
    const match = bestMatchAgainstAllowedValues(value, allowedValues);
    
    return {
      rawValue: value,
      suggestedCanonical: match.matchedValue,
      confidence: match.confidence,
      matchType: match.matchType,
      productCount: count,
      autoApply: match.matched && match.confidence >= autoApplyThreshold,
    };
  });
}

export default {
  mapAttributeValue,
  normalizeAttributes,
  normalizeStringForMatching,
  bestMatchAgainstAllowedValues,
  batchMatchValues,
  generateMappingSuggestions,
};
