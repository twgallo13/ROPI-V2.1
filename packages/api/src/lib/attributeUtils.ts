/**
 * Utility functions for attribute handling
 */

/**
 * Canonical synonym shape: array of { alias, canonical } objects
 */
export interface SynonymEntry {
  alias: string;
  canonical: string;
}

/**
 * Normalize synonyms from any shape to canonical array-of-objects format.
 * Accepts:
 *   - Record<string, string> (object map from alias to canonical)
 *   - Array<string> (legacy array of strings, treated as alias=canonical)
 *   - Array<{ alias, canonical }> (already canonical)
 *   - undefined/null (returns undefined)
 *
 * @param synonyms - The synonyms in any supported shape
 * @returns Array of { alias, canonical } objects, or undefined
 */
export function normalizeSynonymsShape(
  synonyms: unknown
): SynonymEntry[] | undefined {
  if (synonyms == null) {
    return undefined;
  }

  // If it's already an array
  if (Array.isArray(synonyms)) {
    if (synonyms.length === 0) {
      return [];
    }
    // Check if it's array of objects with alias/canonical
    const first = synonyms[0];
    if (typeof first === 'object' && first !== null && 'alias' in first && 'canonical' in first) {
      // Already canonical shape
      return synonyms as SynonymEntry[];
    }
    // Array of strings - treat as alias=canonical (legacy format)
    return (synonyms as string[]).map((s: string) => ({
      alias: s,
      canonical: s,
    }));
  }

  // If it's an object (Record<string, string>)
  if (typeof synonyms === 'object') {
    const obj = synonyms as Record<string, string>;
    return Object.entries(obj).map(([alias, canonical]) => ({
      alias,
      canonical: String(canonical),
    }));
  }

  // Unknown shape, return undefined
  return undefined;
}
