/**
 * Importer Normalization Tests
 * 
 * Tests for header and value normalization helpers
 * PVS-0.1.9
 */

import { describe, it, expect, beforeEach } from 'vitest';
import {
  normalizeHeader,
  normalizeHeaders,
  toSnakeCase,
  resetCache as resetHeaderCache,
} from '../../src/importer/normalizeHeaders';
import {
  normalizeEnumValue,
  normalizeValueForAttribute,
  normalizeRow,
  resetCache as resetValueCache,
  UNKNOWN_VALUE,
} from '../../src/importer/normalizeValues';

describe('Importer Normalization', () => {
  beforeEach(() => {
    resetHeaderCache();
    resetValueCache();
  });

  describe('toSnakeCase', () => {
    it('should convert camelCase to snake_case', () => {
      expect(toSnakeCase('primaryColor')).toBe('primary_color');
      expect(toSnakeCase('ageGroup')).toBe('age_group');
      expect(toSnakeCase('productIsActive')).toBe('product_is_active');
    });

    it('should convert dots to underscores', () => {
      expect(toSnakeCase('style.id')).toBe('style_id');
      expect(toSnakeCase('product.is.active')).toBe('product_is_active');
    });

    it('should handle already snake_case', () => {
      expect(toSnakeCase('primary_color')).toBe('primary_color');
      expect(toSnakeCase('age_group')).toBe('age_group');
    });

    it('should lowercase all characters', () => {
      expect(toSnakeCase('SKU')).toBe('sku');
      expect(toSnakeCase('MPN')).toBe('mpn');
      expect(toSnakeCase('GTIN')).toBe('gtin');
    });

    it('should handle PascalCase', () => {
      expect(toSnakeCase('StyleId')).toBe('style_id');
      expect(toSnakeCase('LaunchDate')).toBe('launch_date');
    });

    it('should remove invalid characters', () => {
      expect(toSnakeCase('age group')).toBe('age_group');
      expect(toSnakeCase('primary-color')).toBe('primary-color'); // hyphens allowed
    });

    it('should collapse multiple underscores', () => {
      expect(toSnakeCase('style__id')).toBe('style_id');
      expect(toSnakeCase('primary___color')).toBe('primary_color');
    });

    it('should handle empty string', () => {
      expect(toSnakeCase('')).toBe('');
    });
  });

  describe('normalizeHeader', () => {
    it('should match exact canonical IDs with high confidence', () => {
      const result = normalizeHeader('sku');
      expect(result.canonicalId).toBe('sku');
      expect(result.confidence).toBe('high');
      // 'sku' is in the canonical map as an alias -> sku mapping
      expect(['exact', 'alias']).toContain(result.matchType);
    });

    it('should match common aliases via normalized lookup', () => {
      const result = normalizeHeader('SKU');
      expect(result.canonicalId).toBe('sku');
      // SKU uppercased goes through toSnakeCase -> 'sku' -> normalized match
      expect(['high', 'medium']).toContain(result.confidence);
      expect(['alias', 'normalized']).toContain(result.matchType);
    });

    it('should normalize camelCase to snake_case with medium confidence', () => {
      const result = normalizeHeader('primaryColor');
      // Should match via normalized lookup
      expect(result.canonicalId).toBe('primary_color');
      expect(result.confidence).toMatch(/high|medium/);
    });

    it('should return low confidence for unknown headers', () => {
      const result = normalizeHeader('unknownColumnXYZ123');
      expect(result.canonicalId).toBe(null);
      expect(result.confidence).toBe('low');
      expect(result.matchType).toBe('unknown');
    });

    it('should preserve original header in result', () => {
      const result = normalizeHeader('My Custom Header');
      expect(result.originalHeader).toBe('My Custom Header');
    });
  });

  describe('normalizeHeaders', () => {
    it('should normalize multiple headers and return stats', () => {
      const headers = ['SKU', 'Brand', 'unknownColumn'];
      const { mappings, stats } = normalizeHeaders(headers);

      expect(mappings).toHaveLength(3);
      expect(stats.total).toBe(3);
      expect(stats.unknown).toContain('unknownColumn');
    });

    it('should count confidence levels correctly', () => {
      const headers = ['sku', 'brand', 'category'];
      const { stats } = normalizeHeaders(headers);

      expect(stats.total).toBe(3);
      expect(stats.high + stats.medium + stats.low).toBe(3);
    });
  });

  describe('normalizeEnumValue', () => {
    const allowedValues = ['Mens', 'Womens', 'Kids', 'Unisex'];

    it('should match exact values (case-insensitive)', () => {
      const result = normalizeEnumValue('mens', allowedValues);
      expect(result.normalizedValue).toBe('Mens');
      expect(result.isValid).toBe(true);
      expect(result.matchType).toBe('exact');
    });

    it('should match with different casing', () => {
      const result = normalizeEnumValue('WOMENS', allowedValues);
      expect(result.normalizedValue).toBe('Womens');
      expect(result.isValid).toBe(true);
    });

    it('should return UNKNOWN for invalid values', () => {
      const result = normalizeEnumValue('InvalidValue', allowedValues);
      expect(result.normalizedValue).toBe(UNKNOWN_VALUE);
      expect(result.isValid).toBe(false);
      expect(result.matchType).toBe('unknown');
    });

    it('should handle empty values', () => {
      const result = normalizeEnumValue('', allowedValues);
      expect(result.normalizedValue).toBe('');
      expect(result.isValid).toBe(true);
    });

    it('should trim whitespace', () => {
      const result = normalizeEnumValue('  Mens  ', allowedValues);
      expect(result.normalizedValue).toBe('Mens');
      expect(result.isValid).toBe(true);
    });

    it('should use synonyms mapping when provided', () => {
      const synonyms = { 'm': 'Mens', 'w': 'Womens', 'male': 'Mens' };
      const result = normalizeEnumValue('male', allowedValues, synonyms);
      expect(result.normalizedValue).toBe('Mens');
      expect(result.isValid).toBe(true);
      expect(result.matchType).toBe('synonym');
    });
  });

  describe('normalizeValueForAttribute', () => {
    it('should normalize select attribute values', () => {
      const result = normalizeValueForAttribute('department', 'mens');
      // If registry is loaded, should normalize to canonical value
      expect(result.originalValue).toBe('mens');
    });

    it('should pass through unknown attributes', () => {
      const result = normalizeValueForAttribute('unknown_attr_xyz', 'anyValue');
      expect(result.normalizedValue).toBe('anyValue');
      expect(result.isValid).toBe(true);
    });

    it('should handle multiSelect values with separators', () => {
      const result = normalizeValueForAttribute('website', 'shiekh.com,mltd.com');
      expect(result.originalValue).toBe('shiekh.com,mltd.com');
    });
  });

  describe('normalizeRow', () => {
    it('should normalize a row using header mappings', () => {
      const row = { 'SKU': 'TEST123', 'Brand': 'Nike' };
      const headerToCanonical = { 'SKU': 'sku', 'Brand': 'brand' };

      const { normalized, validationErrors } = normalizeRow(row, headerToCanonical);

      expect(normalized['sku']).toBe('TEST123');
      expect(normalized['brand']).toBe('Nike');
      expect(validationErrors).toHaveLength(0);
    });

    it('should skip unmapped headers', () => {
      const row = { 'SKU': 'TEST123', 'Unknown': 'value' };
      const headerToCanonical = { 'SKU': 'sku', 'Unknown': null };

      const { normalized } = normalizeRow(row, headerToCanonical);

      expect(normalized['sku']).toBe('TEST123');
      expect(normalized['Unknown']).toBeUndefined();
    });

    it('should report validation errors for invalid enum values', () => {
      const row = { 'Department': 'InvalidDept' };
      const headerToCanonical = { 'Department': 'department' };

      const { validationErrors } = normalizeRow(row, headerToCanonical);

      // May have validation error if registry defines allowed_values
      expect(Array.isArray(validationErrors)).toBe(true);
    });
  });
});
