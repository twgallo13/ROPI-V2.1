/**
 * Unit tests for attribute settings validation functions
 */

import { 
  normalizeString, 
  isDuplicate, 
  deduplicateArray, 
  validateItem 
} from '../useAttributesSettings';

describe('Attribute Settings - Validation', () => {
  describe('normalizeString', () => {
    test('trims whitespace', () => {
      expect(normalizeString('  test  ')).toBe('test');
    });

    test('converts to lowercase', () => {
      expect(normalizeString('TEST')).toBe('test');
      expect(normalizeString('Test')).toBe('test');
      expect(normalizeString('TeSt')).toBe('test');
    });

    test('handles empty string', () => {
      expect(normalizeString('')).toBe('');
      expect(normalizeString('   ')).toBe('');
    });
  });

  describe('isDuplicate', () => {
    test('detects exact duplicates (case-insensitive)', () => {
      const items = ['Footwear', 'Apparel', 'Accessories'];
      
      expect(isDuplicate(items, 'Footwear')).toBe(true);
      expect(isDuplicate(items, 'footwear')).toBe(true);
      expect(isDuplicate(items, 'FOOTWEAR')).toBe(true);
      expect(isDuplicate(items, 'FoOtWeAr')).toBe(true);
    });

    test('handles whitespace differences', () => {
      const items = ['Footwear', 'Apparel'];
      
      expect(isDuplicate(items, '  Footwear  ')).toBe(true);
      expect(isDuplicate(items, ' apparel ')).toBe(true);
    });

    test('returns false for non-duplicates', () => {
      const items = ['Footwear', 'Apparel'];
      
      expect(isDuplicate(items, 'Accessories')).toBe(false);
      expect(isDuplicate(items, 'accessories')).toBe(false);
    });

    test('handles empty array', () => {
      expect(isDuplicate([], 'test')).toBe(false);
    });

    test('handles empty string', () => {
      const items = ['Footwear'];
      expect(isDuplicate(items, '')).toBe(false);
      expect(isDuplicate(items, '   ')).toBe(false);
    });
  });

  describe('deduplicateArray', () => {
    test('removes case-insensitive duplicates', () => {
      const items = ['Footwear', 'footwear', 'FOOTWEAR', 'Apparel', 'apparel'];
      const result = deduplicateArray(items);
      
      expect(result).toHaveLength(2);
      expect(result[0]).toBe('Footwear'); // Keeps first occurrence
      expect(result[1]).toBe('Apparel');
    });

    test('keeps first occurrence of duplicates', () => {
      const items = ['Nike', 'NIKE', 'nike', 'Adidas'];
      const result = deduplicateArray(items);
      
      expect(result).toHaveLength(2);
      expect(result[0]).toBe('Nike'); // Original casing preserved
      expect(result[1]).toBe('Adidas');
    });

    test('handles array with no duplicates', () => {
      const items = ['Footwear', 'Apparel', 'Accessories'];
      const result = deduplicateArray(items);
      
      expect(result).toEqual(items);
    });

    test('handles empty array', () => {
      expect(deduplicateArray([])).toEqual([]);
    });

    test('trims whitespace during comparison', () => {
      const items = ['Footwear', '  Footwear  ', ' footwear ', 'Apparel'];
      const result = deduplicateArray(items);
      
      expect(result).toHaveLength(2);
      expect(result[0]).toBe('Footwear');
      expect(result[1]).toBe('Apparel');
    });
  });

  describe('validateItem', () => {
    test('accepts valid strings', () => {
      const result = validateItem('Footwear');
      expect(result.valid).toBe(true);
      expect(result.cleaned).toBe('Footwear');
      expect(result.error).toBeUndefined();
    });

    test('trims whitespace', () => {
      const result = validateItem('  Footwear  ');
      expect(result.valid).toBe(true);
      expect(result.cleaned).toBe('Footwear');
    });

    test('rejects empty strings', () => {
      const result = validateItem('');
      expect(result.valid).toBe(false);
      expect(result.error).toBe('Value cannot be empty');
    });

    test('rejects whitespace-only strings', () => {
      const result = validateItem('   ');
      expect(result.valid).toBe(false);
      expect(result.error).toBe('Value cannot be empty');
    });

    test('truncates strings over 80 characters', () => {
      const longString = 'A'.repeat(100);
      const result = validateItem(longString);
      
      expect(result.valid).toBe(true);
      expect(result.cleaned).toHaveLength(80);
      expect(result.cleaned).toBe('A'.repeat(80));
      expect(result.error).toBeUndefined();
    });

    test('accepts strings exactly 80 characters', () => {
      const maxString = 'A'.repeat(80);
      const result = validateItem(maxString);
      
      expect(result.valid).toBe(true);
      expect(result.cleaned).toBe(maxString);
      expect(result.cleaned).toHaveLength(80);
    });
  });
});
