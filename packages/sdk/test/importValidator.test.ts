/**
 * Import Validator Tests
 * Tests for validation logic
 */

import { describe, it, expect } from 'vitest';
import { validateImportRow, canProcessRow } from '../src/validators/importValidator';
import type { ImportNormalizedFields } from '../src/schema/importEngine';

describe('Import Validator', () => {
  describe('validateImportRow', () => {
    it('should pass validation for valid row', () => {
      const normalized: ImportNormalizedFields = {
        sku: 'VALID-SKU-001',
        title: 'Valid Product Title',
        brand: 'Valid Brand',
        msrp: 99.99,
        quantity: 10,
      };

      const validation = validateImportRow(normalized);

      expect(validation.isValid).toBe(true);
      expect(validation.errors).toHaveLength(0);
    });

    it('should fail validation for missing SKU', () => {
      const normalized: ImportNormalizedFields = {
        title: 'Product',
        brand: 'Brand',
      };

      const validation = validateImportRow(normalized);

      expect(validation.isValid).toBe(false);
      expect(validation.errors).toHaveLength(1);
      expect(validation.errors[0].code).toBe('MISSING_REQUIRED_FIELD');
      expect(validation.errors[0].field).toBe('sku');
    });

    it('should fail validation for missing title', () => {
      const normalized: ImportNormalizedFields = {
        sku: 'SKU-001',
        brand: 'Brand',
      };

      const validation = validateImportRow(normalized);

      expect(validation.isValid).toBe(false);
      expect(validation.errors.some(e => e.field === 'title')).toBe(true);
    });

    it('should fail validation for invalid SKU format', () => {
      const normalized: ImportNormalizedFields = {
        sku: 'invalid sku!',
        title: 'Product',
        brand: 'Brand',
      };

      const validation = validateImportRow(normalized);

      expect(validation.isValid).toBe(false);
      expect(validation.errors.some(e => e.code === 'INVALID_FORMAT')).toBe(true);
    });

    it('should warn for short title', () => {
      const normalized: ImportNormalizedFields = {
        sku: 'SKU-001',
        title: 'Prod',
        brand: 'Brand',
      };

      const validation = validateImportRow(normalized);

      expect(validation.isValid).toBe(true); // Warnings don't fail validation
      expect(validation.warnings).toHaveLength(1);
      expect(validation.warnings[0].field).toBe('title');
    });

    it('should fail validation for negative prices', () => {
      const normalized: ImportNormalizedFields = {
        sku: 'SKU-001',
        title: 'Product',
        brand: 'Brand',
        msrp: -10,
      };

      const validation = validateImportRow(normalized);

      expect(validation.isValid).toBe(false);
      expect(validation.errors.some(e => e.code === 'INVALID_PRICE')).toBe(true);
    });

    it('should warn if retail price > MSRP', () => {
      const normalized: ImportNormalizedFields = {
        sku: 'SKU-001',
        title: 'Product',
        brand: 'Brand',
        msrp: 100,
        retailPrice: 150,
      };

      const validation = validateImportRow(normalized);

      expect(validation.isValid).toBe(true);
      expect(validation.warnings.some(w => w.field === 'retailPrice')).toBe(true);
    });

    it('should fail validation for invalid date', () => {
      const normalized: ImportNormalizedFields = {
        sku: 'SKU-001',
        title: 'Product',
        brand: 'Brand',
        launchDate: 'not-a-date',
      };

      const validation = validateImportRow(normalized);

      expect(validation.isValid).toBe(false);
      expect(validation.errors.some(e => e.code === 'INVALID_DATE')).toBe(true);
    });

    it('should fail validation for invalid URL', () => {
      const normalized: ImportNormalizedFields = {
        sku: 'SKU-001',
        title: 'Product',
        brand: 'Brand',
        primaryImage: 'not-a-url',
      };

      const validation = validateImportRow(normalized);

      expect(validation.isValid).toBe(false);
      expect(validation.errors.some(e => e.field === 'primaryImage')).toBe(true);
    });
  });

  describe('canProcessRow', () => {
    it('should return true for valid row', () => {
      const validation = {
        isValid: true,
        errors: [],
        warnings: [],
      };

      expect(canProcessRow(validation)).toBe(true);
    });

    it('should return false for invalid row', () => {
      const validation = {
        isValid: false,
        errors: [
          {
            code: 'MISSING_REQUIRED_FIELD' as const,
            severity: 'error' as const,
            field: 'sku',
            message: 'SKU is required',
          },
        ],
        warnings: [],
      };

      expect(canProcessRow(validation)).toBe(false);
    });
  });
});
