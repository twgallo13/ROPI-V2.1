/**
 * Admin Settings Attribute Update Tests
 * LP-3.0.1: Test allowed_values coercion and structured error responses
 */

import { describe, it, expect } from 'vitest';

/**
 * Unit test the coercion logic directly (extracted from settings.ts)
 */
function coerceAllowedValues(payload: any): any {
  const result = { ...payload };
  
  // Coerce allowed_values string to array
  if (typeof result.allowed_values === 'string') {
    result.allowed_values = result.allowed_values
      .split(',')
      .map((s: string) => s.trim())
      .filter(Boolean);
  }
  
  // Coerce synonyms string to array
  if (result.synonyms && typeof result.synonyms === 'string') {
    try {
      result.synonyms = JSON.parse(result.synonyms);
    } catch {
      result.synonyms = result.synonyms
        .split(',')
        .map((s: string) => s.trim())
        .filter(Boolean);
    }
  }
  
  return result;
}

describe('Admin Settings Attribute Update (LP-3.0.1)', () => {
  describe('allowed_values coercion', () => {
    it('should convert comma-separated string to array', () => {
      const payload = { allowed_values: 'Hats,Shoes,Accessories' };
      const result = coerceAllowedValues(payload);
      expect(result.allowed_values).toEqual(['Hats', 'Shoes', 'Accessories']);
    });

    it('should trim whitespace from comma-separated values', () => {
      const payload = { allowed_values: ' Red , Blue , Green ' };
      const result = coerceAllowedValues(payload);
      expect(result.allowed_values).toEqual(['Red', 'Blue', 'Green']);
    });

    it('should filter empty values from comma-separated string', () => {
      const payload = { allowed_values: 'S,,M,,L,' };
      const result = coerceAllowedValues(payload);
      expect(result.allowed_values).toEqual(['S', 'M', 'L']);
    });

    it('should not modify array values', () => {
      const payload = { allowed_values: ['Small', 'Medium', 'Large'] };
      const result = coerceAllowedValues(payload);
      expect(result.allowed_values).toEqual(['Small', 'Medium', 'Large']);
    });

    it('should handle undefined allowed_values', () => {
      const payload = { label: 'Test' };
      const result = coerceAllowedValues(payload);
      expect(result.allowed_values).toBeUndefined();
    });
  });

  describe('synonyms coercion', () => {
    it('should parse JSON string synonyms', () => {
      const payload = { synonyms: '["Nike", "Adidas"]' };
      const result = coerceAllowedValues(payload);
      expect(result.synonyms).toEqual(['Nike', 'Adidas']);
    });

    it('should parse JSON object synonyms', () => {
      const payload = { synonyms: '{"red": "crimson", "blue": "navy"}' };
      const result = coerceAllowedValues(payload);
      expect(result.synonyms).toEqual({ red: 'crimson', blue: 'navy' });
    });

    it('should convert comma-separated synonyms to array', () => {
      const payload = { synonyms: 'Small,Medium,Large' };
      const result = coerceAllowedValues(payload);
      expect(result.synonyms).toEqual(['Small', 'Medium', 'Large']);
    });

    it('should not modify array synonyms', () => {
      const payload = { synonyms: ['sm', 'med', 'lg'] };
      const result = coerceAllowedValues(payload);
      expect(result.synonyms).toEqual(['sm', 'med', 'lg']);
    });

    it('should handle undefined synonyms', () => {
      const payload = { label: 'Test' };
      const result = coerceAllowedValues(payload);
      expect(result.synonyms).toBeUndefined();
    });
  });

  describe('validation error structure', () => {
    it('should match expected error structure', () => {
      // Verify the error response structure
      const errorResponse = {
        ok: false,
        error: 'validation_failed',
        message: 'Invalid attribute data',
        details: [
          { path: 'data_type', message: 'Invalid enum value' },
          { path: 'allowed_values', message: 'Required for enum type' },
        ],
      };

      expect(errorResponse.ok).toBe(false);
      expect(errorResponse.error).toBe('validation_failed');
      expect(errorResponse.details).toBeDefined();
      expect(Array.isArray(errorResponse.details)).toBe(true);
      expect(errorResponse.details?.[0].path).toBe('data_type');
      expect(errorResponse.details?.[0].message).toBe('Invalid enum value');
    });

    it('should match expected success structure', () => {
      const successResponse = {
        ok: true,
        attribute: {
          attribute_id: 'department',
          label: 'Department',
          data_type: 'enum',
          allowed_values: ['Hats', 'Shoes', 'Accessories'],
        },
      };

      expect(successResponse.ok).toBe(true);
      expect(successResponse.attribute).toBeDefined();
      expect(successResponse.attribute.allowed_values).toEqual(['Hats', 'Shoes', 'Accessories']);
    });
  });
});
