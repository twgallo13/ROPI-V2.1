/**
 * Unit tests for dateUtils
 * LP-importer-mapping-recon-1.4.6.4
 * 
 * Tests cover:
 * - parseToIsoDateString: Multiple vendor formats → ISO
 * - formatForDateInput: ISO and vendor formats → YYYY-MM-DD
 * - Edge cases: undefined, null, empty, invalid
 * - Two-digit year heuristic
 */

import { describe, it, expect } from 'vitest';
import {
  parseToIsoDateString,
  formatForDateInput,
  isIsoDateString,
  isVendorDateFormat,
  formatForDisplay,
} from '../dateUtils';

describe('dateUtils', () => {
  describe('parseToIsoDateString', () => {
    describe('ISO formats', () => {
      it('should parse YYYY-MM-DD format', () => {
        expect(parseToIsoDateString('2026-01-09')).toBe('2026-01-09T00:00:00.000Z');
      });

      it('should parse ISO datetime with Z suffix', () => {
        expect(parseToIsoDateString('2026-01-09T00:00:00.000Z')).toBe('2026-01-09T00:00:00.000Z');
      });

      it('should parse ISO datetime without Z suffix', () => {
        expect(parseToIsoDateString('2026-01-09T14:30:00')).toBe('2026-01-09T00:00:00.000Z');
      });

      it('should handle ISO with different time values', () => {
        expect(parseToIsoDateString('2025-12-30T05:00:00.000Z')).toBe('2025-12-30T00:00:00.000Z');
      });
    });

    describe('US vendor formats (MM/DD/YYYY)', () => {
      it('should parse M/D/YYYY format', () => {
        expect(parseToIsoDateString('1/9/2026')).toBe('2026-01-09T00:00:00.000Z');
      });

      it('should parse MM/DD/YYYY format', () => {
        expect(parseToIsoDateString('01/09/2026')).toBe('2026-01-09T00:00:00.000Z');
      });

      it('should parse M/DD/YYYY format', () => {
        expect(parseToIsoDateString('1/09/2026')).toBe('2026-01-09T00:00:00.000Z');
      });

      it('should parse MM/D/YYYY format', () => {
        expect(parseToIsoDateString('01/9/2026')).toBe('2026-01-09T00:00:00.000Z');
      });

      it('should parse MM-DD-YYYY format', () => {
        expect(parseToIsoDateString('01-09-2026')).toBe('2026-01-09T00:00:00.000Z');
      });

      it('should parse 12/30/2025 vendor format', () => {
        expect(parseToIsoDateString('12/30/2025')).toBe('2025-12-30T00:00:00.000Z');
      });
    });

    describe('Two-digit year handling', () => {
      it('should map year 26 to 2026 (≤69 → 2000s)', () => {
        expect(parseToIsoDateString('1/9/26')).toBe('2026-01-09T00:00:00.000Z');
      });

      it('should map year 00 to 2000 (≤69 → 2000s)', () => {
        expect(parseToIsoDateString('1/1/00')).toBe('2000-01-01T00:00:00.000Z');
      });

      it('should map year 69 to 2069 (≤69 → 2000s)', () => {
        expect(parseToIsoDateString('6/15/69')).toBe('2069-06-15T00:00:00.000Z');
      });

      it('should map year 70 to 1970 (>69 → 1900s)', () => {
        expect(parseToIsoDateString('6/15/70')).toBe('1970-06-15T00:00:00.000Z');
      });

      it('should map year 99 to 1999 (>69 → 1900s)', () => {
        expect(parseToIsoDateString('12/31/99')).toBe('1999-12-31T00:00:00.000Z');
      });
    });

    describe('Edge cases', () => {
      it('should return undefined for undefined input', () => {
        expect(parseToIsoDateString(undefined)).toBeUndefined();
      });

      it('should return undefined for null input', () => {
        expect(parseToIsoDateString(null)).toBeUndefined();
      });

      it('should return undefined for empty string', () => {
        expect(parseToIsoDateString('')).toBeUndefined();
      });

      it('should return undefined for whitespace-only string', () => {
        expect(parseToIsoDateString('   ')).toBeUndefined();
      });

      it('should return undefined for invalid date string', () => {
        expect(parseToIsoDateString('not-a-date')).toBeUndefined();
      });

      it('should handle leading/trailing whitespace', () => {
        expect(parseToIsoDateString('  2026-01-09  ')).toBe('2026-01-09T00:00:00.000Z');
      });
    });
  });

  describe('formatForDateInput', () => {
    describe('ISO formats → YYYY-MM-DD', () => {
      it('should return YYYY-MM-DD unchanged', () => {
        expect(formatForDateInput('2026-01-09')).toBe('2026-01-09');
      });

      it('should extract date from ISO datetime', () => {
        expect(formatForDateInput('2026-01-09T00:00:00.000Z')).toBe('2026-01-09');
      });

      it('should extract date from ISO datetime with different time', () => {
        expect(formatForDateInput('2025-12-30T05:00:00.000Z')).toBe('2025-12-30');
      });
    });

    describe('Vendor formats → YYYY-MM-DD', () => {
      it('should convert M/D/YYYY to YYYY-MM-DD', () => {
        expect(formatForDateInput('1/9/2026')).toBe('2026-01-09');
      });

      it('should convert MM/DD/YYYY to YYYY-MM-DD', () => {
        expect(formatForDateInput('12/30/2025')).toBe('2025-12-30');
      });

      it('should convert M/D/YY to YYYY-MM-DD', () => {
        expect(formatForDateInput('1/9/26')).toBe('2026-01-09');
      });
    });

    describe('Edge cases', () => {
      it('should return undefined for undefined input', () => {
        expect(formatForDateInput(undefined)).toBeUndefined();
      });

      it('should return undefined for null input', () => {
        expect(formatForDateInput(null)).toBeUndefined();
      });

      it('should return undefined for empty string', () => {
        expect(formatForDateInput('')).toBeUndefined();
      });

      it('should return undefined for invalid date', () => {
        expect(formatForDateInput('invalid')).toBeUndefined();
      });

      it('should handle whitespace', () => {
        expect(formatForDateInput('  2026-01-09  ')).toBe('2026-01-09');
      });
    });
  });

  describe('isIsoDateString', () => {
    it('should return true for YYYY-MM-DD', () => {
      expect(isIsoDateString('2026-01-09')).toBe(true);
    });

    it('should return true for full ISO datetime', () => {
      expect(isIsoDateString('2026-01-09T00:00:00.000Z')).toBe(true);
    });

    it('should return false for vendor format', () => {
      expect(isIsoDateString('1/9/2026')).toBe(false);
    });

    it('should return false for undefined', () => {
      expect(isIsoDateString(undefined)).toBe(false);
    });

    it('should return false for null', () => {
      expect(isIsoDateString(null)).toBe(false);
    });
  });

  describe('isVendorDateFormat', () => {
    it('should return true for M/D/YYYY', () => {
      expect(isVendorDateFormat('1/9/2026')).toBe(true);
    });

    it('should return true for MM/DD/YYYY', () => {
      expect(isVendorDateFormat('01/09/2026')).toBe(true);
    });

    it('should return true for M/D/YY', () => {
      expect(isVendorDateFormat('1/9/26')).toBe(true);
    });

    it('should return true for MM-DD-YYYY', () => {
      expect(isVendorDateFormat('01-09-2026')).toBe(true);
    });

    it('should return false for ISO format', () => {
      expect(isVendorDateFormat('2026-01-09')).toBe(false);
    });

    it('should return false for undefined', () => {
      expect(isVendorDateFormat(undefined)).toBe(false);
    });
  });

  describe('formatForDisplay', () => {
    it('should format ISO date for display', () => {
      expect(formatForDisplay('2026-01-09')).toBe('January 9, 2026');
    });

    it('should format vendor date for display', () => {
      expect(formatForDisplay('1/9/2026')).toBe('January 9, 2026');
    });

    it('should return empty string for undefined', () => {
      expect(formatForDisplay(undefined)).toBe('');
    });

    it('should return empty string for invalid date', () => {
      expect(formatForDisplay('not-a-date')).toBe('');
    });
  });

  describe('Real-world test cases from LP-1.4.6.3 audit', () => {
    // Product 211737-90h1-8 data from audit
    it('should format launchDate vendor format "1/9/2026"', () => {
      expect(formatForDateInput('1/9/2026')).toBe('2026-01-09');
    });

    it('should format kl_post_date vendor format "12/30/2025"', () => {
      expect(formatForDateInput('12/30/2025')).toBe('2025-12-30');
    });

    it('should format attributes.launch_date ISO "2026-01-09T00:00:00.000Z"', () => {
      expect(formatForDateInput('2026-01-09T00:00:00.000Z')).toBe('2026-01-09');
    });

    it('should format attributes.kl_post_date ISO "2025-12-30T00:00:00.000Z"', () => {
      expect(formatForDateInput('2025-12-30T00:00:00.000Z')).toBe('2025-12-30');
    });
  });
});
