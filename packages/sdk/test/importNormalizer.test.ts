/**
 * Import Normalizer Tests
 * Tests for CSV normalization and field mapping
 */

import { describe, it, expect } from 'vitest';
import {
  normalizeImportRow,
  deriveProductId,
  isEmptyRow,
  validateRequiredFields,
  DEFAULT_COLUMN_MAPPINGS,
} from '../src/normalization/importNormalizer';
import type { ImportSourceColumns } from '../src/schema/importEngine';

describe('Import Normalizer', () => {
  describe('normalizeImportRow', () => {
    it('should normalize a complete row', () => {
      const sourceColumns: ImportSourceColumns = {
        'SKU': 'TEST-SKU-001',
        'Product Name': 'Test Product',
        'Brand': 'Test Brand',
        'Description': 'Test description',
        'MSRP': '99.99',
        'Quantity': '10',
      };

      const normalized = normalizeImportRow(sourceColumns);

      expect(normalized.sku).toBe('TEST-SKU-001');
      expect(normalized.title).toBe('Test Product');
      expect(normalized.brand).toBe('Test Brand');
      expect(normalized.description).toBe('Test description');
      expect(normalized.msrp).toBe(99.99);
      expect(normalized.quantity).toBe(10);
    });

    it('should handle missing optional fields', () => {
      const sourceColumns: ImportSourceColumns = {
        'SKU': 'MIN-001',
        'Product Name': 'Minimal Product',
        'Brand': 'Brand',
      };

      const normalized = normalizeImportRow(sourceColumns);

      expect(normalized.sku).toBe('MIN-001');
      expect(normalized.title).toBe('Minimal Product');
      expect(normalized.brand).toBe('Brand');
      expect(normalized.description).toBeUndefined();
      expect(normalized.msrp).toBeUndefined();
    });

    it('should apply default values', () => {
      const sourceColumns: ImportSourceColumns = {
        'SKU': 'DEF-001',
        'Product Name': 'Product with defaults',
        'Brand': 'Brand',
      };

      const normalized = normalizeImportRow(sourceColumns);

      expect(normalized.currency).toBe('USD'); // Default from mapping
      expect(normalized.quantity).toBe(0); // Default from mapping
    });

    it('should trim whitespace', () => {
      const sourceColumns: ImportSourceColumns = {
        'SKU': '  TRIM-001  ',
        'Product Name': '  Product  ',
        'Brand': '  Brand  ',
      };

      const normalized = normalizeImportRow(sourceColumns);

      expect(normalized.sku).toBe('TRIM-001');
      expect(normalized.title).toBe('Product');
      expect(normalized.brand).toBe('Brand');
    });

    it('should parse numbers correctly', () => {
      const sourceColumns: ImportSourceColumns = {
        'SKU': 'NUM-001',
        'Product Name': 'Product',
        'Brand': 'Brand',
        'MSRP': '$129.99',
        'Cost': '75.50',
        'Quantity': '25',
      };

      const normalized = normalizeImportRow(sourceColumns);

      expect(normalized.msrp).toBe(129.99);
      expect(normalized.cost).toBe(75.5);
      expect(normalized.quantity).toBe(25);
    });

    it('should parse arrays correctly', () => {
      const sourceColumns: ImportSourceColumns = {
        'SKU': 'ARR-001',
        'Product Name': 'Product',
        'Brand': 'Brand',
        'Images': 'https://example.com/1.jpg|https://example.com/2.jpg',
      };

      const normalized = normalizeImportRow(sourceColumns);

      expect(normalized.images).toEqual([
        'https://example.com/1.jpg',
        'https://example.com/2.jpg',
      ]);
    });
  });

  describe('deriveProductId', () => {
    it('should derive product ID from SKU', () => {
      expect(deriveProductId('TEST-SKU-001')).toBe('test-sku-001');
      expect(deriveProductId('NK_AIR_MAX')).toBe('nk-air-max');
      expect(deriveProductId('Product 123')).toBe('product-123');
    });

    it('should return undefined for empty SKU', () => {
      expect(deriveProductId(undefined)).toBeUndefined();
      expect(deriveProductId('')).toBeUndefined();
    });
  });

  describe('isEmptyRow', () => {
    it('should detect empty rows', () => {
      const emptyRow: ImportSourceColumns = {
        'SKU': '',
        'Product Name': null,
        'Brand': undefined,
      };

      expect(isEmptyRow(emptyRow)).toBe(true);
    });

    it('should detect non-empty rows', () => {
      const nonEmptyRow: ImportSourceColumns = {
        'SKU': 'TEST-001',
        'Product Name': '',
        'Brand': null,
      };

      expect(isEmptyRow(nonEmptyRow)).toBe(false);
    });
  });

  describe('validateRequiredFields', () => {
    it('should return empty array for valid row', () => {
      const normalized = {
        sku: 'TEST-001',
        title: 'Product',
        brand: 'Brand',
      };

      const missing = validateRequiredFields(normalized);
      expect(missing).toEqual([]);
    });

    it('should return missing required fields', () => {
      const normalized = {
        sku: 'TEST-001',
        // title missing
        // brand missing
      };

      const missing = validateRequiredFields(normalized);
      expect(missing).toContain('title');
      expect(missing).toContain('brand');
    });
  });
});
