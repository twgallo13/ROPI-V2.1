/**
 * Phase 1 Import Verification Tests
 * 
 * LP-0.2.0: RICS field mappings
 * LP-0.2.1: MPN string preservation fix
 * 
 * Validates:
 * 1. MPN values remain strings (not converted to numbers)
 * 2. RICS Category and RICS Color are correctly mapped
 */

import { describe, it, expect } from 'vitest';
import { parseCSV } from '../src/services/importService';
import { normalizeImportRow, DEFAULT_COLUMN_MAPPINGS } from '@ropi-aoss/sdk';

describe('Phase 1 Import Verification', () => {
  describe('MPN String Preservation (LP-0.2.1)', () => {
    it('should preserve numeric MPN as string, not number', () => {
      const csvContent = `MPN,RICS Category,RICS Color
3,Footwear,Black/Red`;

      const parsed = parseCSV(csvContent);
      
      // Verify we got one row
      expect(parsed).toHaveLength(1);
      
      // Critical: MPN must be string "3", not number 3
      expect(parsed[0]['MPN']).toBe('3');
      expect(typeof parsed[0]['MPN']).toBe('string');
      
      // Ensure it's NOT a number
      expect(parsed[0]['MPN']).not.toBe(3);
    });

    it('should preserve alphanumeric MPN as string', () => {
      const csvContent = `MPN,SKU
14943667,SKU-001
207012-001,SKU-002`;

      const parsed = parseCSV(csvContent);
      
      expect(parsed).toHaveLength(2);
      expect(parsed[0]['MPN']).toBe('14943667');
      expect(typeof parsed[0]['MPN']).toBe('string');
      expect(parsed[1]['MPN']).toBe('207012-001');
      expect(typeof parsed[1]['MPN']).toBe('string');
    });
  });

  describe('RICS Field Mappings (LP-0.2.0)', () => {
    it('should map RICS Category to ricsCategory', () => {
      const csvContent = `MPN,RICS Category,RICS Color
3,Footwear,Black/Red`;

      const parsed = parseCSV(csvContent);
      const normalized = normalizeImportRow(parsed[0], DEFAULT_COLUMN_MAPPINGS);
      
      // Verify RICS Category is mapped to ricsCategory
      expect(normalized.ricsCategory).toBe('Footwear');
    });

    it('should map RICS Color to ricsColor', () => {
      const csvContent = `MPN,RICS Category,RICS Color
3,Footwear,Black/Red`;

      const parsed = parseCSV(csvContent);
      const normalized = normalizeImportRow(parsed[0], DEFAULT_COLUMN_MAPPINGS);
      
      // Verify RICS Color is mapped to ricsColor
      expect(normalized.ricsColor).toBe('Black/Red');
    });

    it('should map snake_case rics_category and rics_color', () => {
      const csvContent = `MPN,rics_category,rics_color
ABC-123,Apparel,Navy Blue`;

      const parsed = parseCSV(csvContent);
      const normalized = normalizeImportRow(parsed[0], DEFAULT_COLUMN_MAPPINGS);
      
      expect(normalized.ricsCategory).toBe('Apparel');
      expect(normalized.ricsColor).toBe('Navy Blue');
    });
  });

  describe('Combined MPN + RICS Validation', () => {
    it('should correctly parse and normalize all fields from CSV', () => {
      const csvContent = `MPN,RICS Category,RICS Color
3,Footwear,Black/Red`;

      // Step 1: Parse CSV
      const parsed = parseCSV(csvContent);
      
      // Step 2: Normalize
      const normalized = normalizeImportRow(parsed[0], DEFAULT_COLUMN_MAPPINGS);
      
      // Assertions
      expect(parsed[0]['MPN']).toBe('3');
      expect(typeof parsed[0]['MPN']).toBe('string');
      expect(normalized.mpn).toBe('3');
      expect(normalized.ricsCategory).toBe('Footwear');
      expect(normalized.ricsColor).toBe('Black/Red');
    });
  });
});
