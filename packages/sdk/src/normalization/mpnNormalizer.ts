/**
 * MPN Normalizer
 * 
 * Lisa's canonical MPN normalization algorithm.
 * Provides deterministic normalization for reliable MPN lookups.
 * 
 * Algorithm:
 * 1. Trim whitespace
 * 2. Uppercase
 * 3. Remove non-alphanumeric characters except hyphens
 * 4. Collapse multiple hyphens to single hyphen
 * 5. Remove leading/trailing hyphens
 * 
 * Examples:
 * - "  2-test  " → "2-TEST"
 * - "211737-90H1-8" → "211737-90H1-8"
 * - "abc--def" → "ABC-DEF"
 * - "  abc def  " → "ABCDEF"
 */

/**
 * Normalize an MPN for reliable lookup.
 * 
 * @param mpn - Raw MPN string
 * @returns Normalized MPN string
 */
export function normalizeMpn(mpn: string | null | undefined): string {
  if (!mpn) return '';
  
  return mpn
    // 1. Trim whitespace
    .trim()
    // 2. Uppercase
    .toUpperCase()
    // 3. Remove non-alphanumeric except hyphens
    .replace(/[^A-Z0-9-]/g, '')
    // 4. Collapse multiple hyphens to single
    .replace(/-+/g, '-')
    // 5. Remove leading/trailing hyphens
    .replace(/^-+|-+$/g, '');
}

/**
 * Check if two MPNs match after normalization.
 * 
 * @param mpn1 - First MPN
 * @param mpn2 - Second MPN
 * @returns True if normalized versions match
 */
export function mpnsMatch(mpn1: string | null | undefined, mpn2: string | null | undefined): boolean {
  return normalizeMpn(mpn1) === normalizeMpn(mpn2);
}
