/**
 * Date Utilities for LP-importer-mapping-recon-1.4.6.4
 * 
 * Provides deterministic date parsing and formatting for UI date inputs.
 * These utilities ensure that vendor date formats and ISO timestamps
 * are correctly handled when binding to <input type="date"> elements.
 * 
 * @module dateUtils
 * @see HOMER_LP-1.4.6.3_UI_DATA_CONSISTENCY_AUDIT.md for context
 */

/**
 * Two-digit year heuristic threshold.
 * Years 00-69 map to 2000-2069, years 70-99 map to 1970-1999.
 * This matches the SDK normalizer behavior.
 */
const TWO_DIGIT_YEAR_THRESHOLD = 69;

/**
 * Parse a date string to ISO format (UTC midnight).
 * 
 * Accepts multiple input formats:
 * - YYYY-MM-DD (ISO date only)
 * - YYYY-MM-DDTHH:mm:ss... (ISO datetime)
 * - MM/DD/YYYY (US format)
 * - MM-DD-YYYY (US format with dashes)
 * - MM/DD/YY or M/D/YY (two-digit year)
 * 
 * @param input - Date string in any supported format
 * @returns ISO string (UTC) or undefined if unparseable
 * 
 * @example
 * parseToIsoDateString('2026-01-09') // '2026-01-09T00:00:00.000Z'
 * parseToIsoDateString('1/9/2026')   // '2026-01-09T00:00:00.000Z'
 * parseToIsoDateString('1/9/26')     // '2026-01-09T00:00:00.000Z'
 */
export function parseToIsoDateString(input: string | undefined | null): string | undefined {
  if (input === undefined || input === null || input === '') {
    return undefined;
  }

  const trimmed = input.trim();
  if (trimmed === '') {
    return undefined;
  }

  // Pattern 1: ISO format YYYY-MM-DD or YYYY-MM-DDTHH:mm:ss...
  const isoMatch = trimmed.match(/^(\d{4})-(\d{2})-(\d{2})(T.*)?$/);
  if (isoMatch) {
    const [, year, month, day] = isoMatch;
    const date = new Date(Date.UTC(parseInt(year, 10), parseInt(month, 10) - 1, parseInt(day, 10)));
    if (!isNaN(date.getTime())) {
      return date.toISOString();
    }
  }

  // Pattern 2: MM/DD/YYYY or MM-DD-YYYY (US format with 4-digit year)
  const usFullMatch = trimmed.match(/^(\d{1,2})[/-](\d{1,2})[/-](\d{4})$/);
  if (usFullMatch) {
    const [, month, day, year] = usFullMatch;
    const date = new Date(Date.UTC(parseInt(year, 10), parseInt(month, 10) - 1, parseInt(day, 10)));
    if (!isNaN(date.getTime())) {
      return date.toISOString();
    }
  }

  // Pattern 3: MM/DD/YY or M/D/YY (US format with 2-digit year)
  const usShortMatch = trimmed.match(/^(\d{1,2})[/-](\d{1,2})[/-](\d{2})$/);
  if (usShortMatch) {
    const [, month, day, shortYear] = usShortMatch;
    const yearNum = parseInt(shortYear, 10);
    // Two-digit year heuristic: 00-69 → 2000-2069, 70-99 → 1970-1999
    const fullYear = yearNum <= TWO_DIGIT_YEAR_THRESHOLD ? 2000 + yearNum : 1900 + yearNum;
    const date = new Date(Date.UTC(fullYear, parseInt(month, 10) - 1, parseInt(day, 10)));
    if (!isNaN(date.getTime())) {
      return date.toISOString();
    }
  }

  // Pattern 4: Fallback to Date.parse for other valid formats
  const parsed = Date.parse(trimmed);
  if (!isNaN(parsed)) {
    const date = new Date(parsed);
    // Normalize to UTC midnight
    const utcDate = new Date(Date.UTC(date.getFullYear(), date.getMonth(), date.getDate()));
    return utcDate.toISOString();
  }

  return undefined;
}

/**
 * Format a date string for use in <input type="date"> elements.
 * 
 * HTML date inputs require the format YYYY-MM-DD.
 * This function accepts vendor formats (MM/DD/YYYY) and ISO timestamps
 * and converts them to the required format.
 * 
 * @param input - Date string in vendor or ISO format
 * @returns Date string in YYYY-MM-DD format, or undefined if unparseable
 * 
 * @example
 * formatForDateInput('2026-01-09T00:00:00.000Z') // '2026-01-09'
 * formatForDateInput('1/9/2026')                 // '2026-01-09'
 * formatForDateInput('1/9/26')                   // '2026-01-09'
 * formatForDateInput(undefined)                  // undefined
 */
export function formatForDateInput(input: string | undefined | null): string | undefined {
  if (input === undefined || input === null || input === '') {
    return undefined;
  }

  const trimmed = input.trim();
  if (trimmed === '') {
    return undefined;
  }

  // Quick path: if already in YYYY-MM-DD format (exactly 10 chars, no time)
  if (/^\d{4}-\d{2}-\d{2}$/.test(trimmed)) {
    return trimmed;
  }

  // Parse to ISO first, then extract date portion
  const isoString = parseToIsoDateString(trimmed);
  if (!isoString) {
    return undefined;
  }

  // Extract YYYY-MM-DD from ISO string (first 10 characters)
  return isoString.substring(0, 10);
}

/**
 * Check if a string is a valid ISO date/datetime string.
 * 
 * @param input - String to check
 * @returns true if input is a valid ISO format
 */
export function isIsoDateString(input: string | undefined | null): boolean {
  if (!input) return false;
  return /^\d{4}-\d{2}-\d{2}(T\d{2}:\d{2}:\d{2}(\.\d{3})?Z?)?$/.test(input.trim());
}

/**
 * Check if a string is in vendor date format (MM/DD/YYYY or similar).
 * 
 * @param input - String to check
 * @returns true if input appears to be vendor format
 */
export function isVendorDateFormat(input: string | undefined | null): boolean {
  if (!input) return false;
  return /^\d{1,2}[/-]\d{1,2}[/-]\d{2,4}$/.test(input.trim());
}

/**
 * Format a date for display (human-readable).
 * 
 * @param input - Date string in any supported format
 * @param locale - Locale for formatting (default: 'en-US')
 * @returns Human-readable date string or empty string if unparseable
 */
export function formatForDisplay(
  input: string | undefined | null,
  locale: string = 'en-US'
): string {
  const isoString = parseToIsoDateString(input);
  if (!isoString) {
    return '';
  }

  const date = new Date(isoString);
  return date.toLocaleDateString(locale, {
    year: 'numeric',
    month: 'long',
    day: 'numeric',
  });
}
