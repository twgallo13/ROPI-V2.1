/**
 * LP-1.4.6 Unit Tests for date transform tolerance
 * Tests MM/DD/YY, M/D/YYYY, MM-DD-YYYY, YYYY-MM-DD formats
 */
import { describe, it, expect } from 'vitest';
import { applyTransform } from '../importNormalizer';

describe('date transform (LP-1.4.6)', () => {
  describe('ISO YYYY-MM-DD format', () => {
    it('parses ISO yyyy-mm-dd', () => {
      expect(applyTransform('2025-05-24', 'date')).toBe('2025-05-24');
    });

    it('parses ISO date at start of year', () => {
      expect(applyTransform('2025-01-01', 'date')).toBe('2025-01-01');
    });

    it('parses ISO date at end of year', () => {
      expect(applyTransform('2025-12-31', 'date')).toBe('2025-12-31');
    });
  });

  describe('MM/DD/YY format (two-digit year)', () => {
    it('parses mm/dd/yy as 20YY for 00-69', () => {
      expect(applyTransform('05/24/25', 'date')).toBe('2025-05-24');
    });

    it('parses mm/dd/yy as 20YY for year 00', () => {
      expect(applyTransform('01/15/00', 'date')).toBe('2000-01-15');
    });

    it('parses mm/dd/yy as 20YY for year 69', () => {
      expect(applyTransform('06/30/69', 'date')).toBe('2069-06-30');
    });

    it('parses mm/dd/yy as 19YY for year 70', () => {
      expect(applyTransform('07/04/70', 'date')).toBe('1970-07-04');
    });

    it('parses mm/dd/yy as 19YY for year 99', () => {
      expect(applyTransform('12/31/99', 'date')).toBe('1999-12-31');
    });
  });

  describe('M/D/YYYY format (single-digit month/day)', () => {
    it('parses m/d/yyyy', () => {
      expect(applyTransform('5/4/2021', 'date')).toBe('2021-05-04');
    });

    it('parses m/dd/yyyy', () => {
      expect(applyTransform('1/15/2025', 'date')).toBe('2025-01-15');
    });

    it('parses mm/d/yyyy', () => {
      expect(applyTransform('12/5/2024', 'date')).toBe('2024-12-05');
    });

    it('parses mm/dd/yyyy', () => {
      expect(applyTransform('12/30/2025', 'date')).toBe('2025-12-30');
    });
  });

  describe('MM-DD-YYYY format (dash separator)', () => {
    it('parses mm-dd-yyyy', () => {
      expect(applyTransform('12-31-1999', 'date')).toBe('1999-12-31');
    });

    it('parses m-d-yyyy', () => {
      expect(applyTransform('1-5-2025', 'date')).toBe('2025-01-05');
    });

    it('parses mm-dd-yy with two-digit year', () => {
      expect(applyTransform('06-15-25', 'date')).toBe('2025-06-15');
    });
  });

  describe('Edge cases', () => {
    it('returns undefined for empty string', () => {
      expect(applyTransform('', 'date')).toBeUndefined();
    });

    it('returns undefined for null', () => {
      expect(applyTransform(null, 'date')).toBeUndefined();
    });

    it('returns undefined for undefined', () => {
      expect(applyTransform(undefined, 'date')).toBeUndefined();
    });

    it('returns undefined for invalid date strings', () => {
      expect(applyTransform('not a date', 'date')).toBeUndefined();
    });

    it('returns undefined for gibberish', () => {
      expect(applyTransform('abc123xyz', 'date')).toBeUndefined();
    });

    it('handles whitespace around valid date', () => {
      expect(applyTransform('  2025-05-24  ', 'date')).toBe('2025-05-24');
    });

    it('handles whitespace around MM/DD/YY', () => {
      expect(applyTransform('  05/24/25  ', 'date')).toBe('2025-05-24');
    });
  });

  describe('Real-world CSV date values', () => {
    it('parses Hide Image Until Date format (MM/DD/YYYY)', () => {
      expect(applyTransform('1/15/2026', 'date')).toBe('2026-01-15');
    });

    it('parses KL Post Date format (MM/DD/YYYY)', () => {
      expect(applyTransform('12/30/2025', 'date')).toBe('2025-12-30');
    });

    it('parses Launch Date ISO format', () => {
      expect(applyTransform('2025-01-06', 'date')).toBe('2025-01-06');
    });
  });
});
