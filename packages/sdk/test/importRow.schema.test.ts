/**
 * Import Row Schema Tests
 * Version: aoss.v0.4.0
 *
 * Tests for the Import Row schema and validation.
 */

import { describe, it, expect } from 'vitest';
import {
  validateImportRowSchema,
  validateImportRowSchemaOrThrow,
  ImportRowSchema,
  importRowJsonSchema,
} from '../src/schemas/importRow';
import type { ImportRow } from '../src/schemas/importRow';

/**
 * Minimal valid ImportRow
 */
const validImportRow: ImportRow = {
  source: 'SUPPLIER',
  rowId: 'row_001',
  originalRowNumber: 2,
  styleCode: 'DZ5485-410',
  brand: 'Nike',
  color: 'University Blue/White',
  size: '10',
  upc: '194956789012',
  raw: {
    'Style Code': 'DZ5485-410',
    'Brand': 'Nike',
    'Color': 'University Blue/White',
    'Size': '10',
    'UPC': '194956789012',
    'MSRP': '180.00',
  },
};

/**
 * Full ImportRow with all optional fields
 */
const fullImportRow: ImportRow = {
  ...validImportRow,
  normalizedGender: 'MEN',
  normalizedCategory: 'FOOTWEAR',
  normalizedSizeScale: 'MENS_US',
  notes: 'Imported from supplier feed batch 2024-03-15',
};

describe('Import Row Schema', () => {
  describe('JSON Schema export', () => {
    it('should export the JSON schema with correct $id', () => {
      expect(importRowJsonSchema.$id).toBe('https://ropi-aoss/schemas/import-row.schema.json');
    });

    it('should export the JSON schema with draft-07', () => {
      expect(importRowJsonSchema.$schema).toBe('http://json-schema.org/draft-07/schema#');
    });

    it('should have required fields defined', () => {
      expect(importRowJsonSchema.required).toContain('source');
      expect(importRowJsonSchema.required).toContain('rowId');
      expect(importRowJsonSchema.required).toContain('originalRowNumber');
      expect(importRowJsonSchema.required).toContain('styleCode');
      expect(importRowJsonSchema.required).toContain('brand');
      expect(importRowJsonSchema.required).toContain('color');
      expect(importRowJsonSchema.required).toContain('size');
      expect(importRowJsonSchema.required).toContain('upc');
      expect(importRowJsonSchema.required).toContain('raw');
    });
  });

  describe('validateImportRowSchema', () => {
    it('should validate a minimal valid import row', () => {
      const result = validateImportRowSchema(validImportRow);

      expect(result.ok).toBe(true);
      if (result.ok) {
        expect(result.value.source).toBe('SUPPLIER');
        expect(result.value.rowId).toBe('row_001');
        expect(result.value.originalRowNumber).toBe(2);
        expect(result.value.styleCode).toBe('DZ5485-410');
      }
    });

    it('should validate an import row with all optional fields', () => {
      const result = validateImportRowSchema(fullImportRow);

      expect(result.ok).toBe(true);
      if (result.ok) {
        expect(result.value.normalizedGender).toBe('MEN');
        expect(result.value.normalizedCategory).toBe('FOOTWEAR');
        expect(result.value.normalizedSizeScale).toBe('MENS_US');
        expect(result.value.notes).toContain('Imported from supplier');
      }
    });

    it('should validate all source types', () => {
      const sources = ['SUPPLIER', 'RETAILOPS_EXPORT', 'MANUAL'] as const;

      for (const source of sources) {
        const result = validateImportRowSchema({ ...validImportRow, source });
        expect(result.ok).toBe(true);
        if (result.ok) {
          expect(result.value.source).toBe(source);
        }
      }
    });

    it('should validate raw object with various value types', () => {
      const rowWithMixedRaw: ImportRow = {
        ...validImportRow,
        raw: {
          stringField: 'value',
          numberField: 123,
          nullField: null,
          boolField: true,
          arrayField: [1, 2, 3],
          nestedField: { a: 1, b: 2 },
        },
      };
      const result = validateImportRowSchema(rowWithMixedRaw);

      expect(result.ok).toBe(true);
      if (result.ok) {
        expect(result.value.raw.stringField).toBe('value');
        expect(result.value.raw.numberField).toBe(123);
      }
    });
  });

  describe('validateImportRowSchema - missing required fields', () => {
    it('should fail when source is missing', () => {
      const { source, ...rowWithoutSource } = validImportRow;
      const result = validateImportRowSchema(rowWithoutSource);

      expect(result.ok).toBe(false);
      if (!result.ok) {
        expect(result.errors.some((e) => e.includes('source'))).toBe(true);
      }
    });

    it('should fail when rowId is missing', () => {
      const { rowId, ...rowWithoutRowId } = validImportRow;
      const result = validateImportRowSchema(rowWithoutRowId);

      expect(result.ok).toBe(false);
      if (!result.ok) {
        expect(result.errors.some((e) => e.includes('rowId'))).toBe(true);
      }
    });

    it('should fail when originalRowNumber is missing', () => {
      const { originalRowNumber, ...rowWithoutRowNumber } = validImportRow;
      const result = validateImportRowSchema(rowWithoutRowNumber);

      expect(result.ok).toBe(false);
      if (!result.ok) {
        expect(result.errors.some((e) => e.includes('originalRowNumber'))).toBe(true);
      }
    });

    it('should fail when styleCode is missing', () => {
      const { styleCode, ...rowWithoutStyleCode } = validImportRow;
      const result = validateImportRowSchema(rowWithoutStyleCode);

      expect(result.ok).toBe(false);
      if (!result.ok) {
        expect(result.errors.some((e) => e.includes('styleCode'))).toBe(true);
      }
    });

    it('should fail when brand is missing', () => {
      const { brand, ...rowWithoutBrand } = validImportRow;
      const result = validateImportRowSchema(rowWithoutBrand);

      expect(result.ok).toBe(false);
      if (!result.ok) {
        expect(result.errors.some((e) => e.includes('brand'))).toBe(true);
      }
    });

    it('should fail when color is missing', () => {
      const { color, ...rowWithoutColor } = validImportRow;
      const result = validateImportRowSchema(rowWithoutColor);

      expect(result.ok).toBe(false);
      if (!result.ok) {
        expect(result.errors.some((e) => e.includes('color'))).toBe(true);
      }
    });

    it('should fail when size is missing', () => {
      const { size, ...rowWithoutSize } = validImportRow;
      const result = validateImportRowSchema(rowWithoutSize);

      expect(result.ok).toBe(false);
      if (!result.ok) {
        expect(result.errors.some((e) => e.includes('size'))).toBe(true);
      }
    });

    it('should fail when upc is missing', () => {
      const { upc, ...rowWithoutUpc } = validImportRow;
      const result = validateImportRowSchema(rowWithoutUpc);

      expect(result.ok).toBe(false);
      if (!result.ok) {
        expect(result.errors.some((e) => e.includes('upc'))).toBe(true);
      }
    });

    it('should fail when raw is missing', () => {
      const { raw, ...rowWithoutRaw } = validImportRow;
      const result = validateImportRowSchema(rowWithoutRaw);

      expect(result.ok).toBe(false);
      if (!result.ok) {
        expect(result.errors.some((e) => e.includes('raw'))).toBe(true);
      }
    });
  });

  describe('validateImportRowSchema - invalid types', () => {
    it('should fail when originalRowNumber is a string', () => {
      const invalidRow = { ...validImportRow, originalRowNumber: '2' };
      const result = validateImportRowSchema(invalidRow);

      expect(result.ok).toBe(false);
      if (!result.ok) {
        expect(result.errors.some((e) => e.includes('originalRowNumber'))).toBe(true);
      }
    });

    it('should fail when originalRowNumber is zero', () => {
      const invalidRow = { ...validImportRow, originalRowNumber: 0 };
      const result = validateImportRowSchema(invalidRow);

      expect(result.ok).toBe(false);
      if (!result.ok) {
        expect(result.errors.some((e) => e.includes('originalRowNumber'))).toBe(true);
      }
    });

    it('should fail when originalRowNumber is negative', () => {
      const invalidRow = { ...validImportRow, originalRowNumber: -1 };
      const result = validateImportRowSchema(invalidRow);

      expect(result.ok).toBe(false);
      if (!result.ok) {
        expect(result.errors.some((e) => e.includes('originalRowNumber'))).toBe(true);
      }
    });

    it('should fail when originalRowNumber is a float', () => {
      const invalidRow = { ...validImportRow, originalRowNumber: 2.5 };
      const result = validateImportRowSchema(invalidRow);

      expect(result.ok).toBe(false);
      if (!result.ok) {
        expect(result.errors.some((e) => e.includes('originalRowNumber'))).toBe(true);
      }
    });

    it('should fail when source is invalid enum value', () => {
      const invalidRow = { ...validImportRow, source: 'INVALID_SOURCE' };
      const result = validateImportRowSchema(invalidRow);

      expect(result.ok).toBe(false);
      if (!result.ok) {
        expect(result.errors.some((e) => e.includes('source'))).toBe(true);
      }
    });

    it('should fail when rowId is empty string', () => {
      const invalidRow = { ...validImportRow, rowId: '' };
      const result = validateImportRowSchema(invalidRow);

      expect(result.ok).toBe(false);
      if (!result.ok) {
        expect(result.errors.some((e) => e.includes('rowId'))).toBe(true);
      }
    });

    it('should fail when raw is not an object', () => {
      const invalidRow = { ...validImportRow, raw: 'not an object' };
      const result = validateImportRowSchema(invalidRow);

      expect(result.ok).toBe(false);
      if (!result.ok) {
        expect(result.errors.some((e) => e.includes('raw'))).toBe(true);
      }
    });

    it('should fail when raw is an array', () => {
      const invalidRow = { ...validImportRow, raw: ['array', 'values'] };
      const result = validateImportRowSchema(invalidRow);

      expect(result.ok).toBe(false);
      if (!result.ok) {
        expect(result.errors.some((e) => e.includes('raw'))).toBe(true);
      }
    });
  });

  describe('validateImportRowSchemaOrThrow', () => {
    it('should return validated import row for valid input', () => {
      const result = validateImportRowSchemaOrThrow(validImportRow);
      expect(result.rowId).toBe('row_001');
    });

    it('should throw for invalid input', () => {
      const { source, ...invalidRow } = validImportRow;
      expect(() => validateImportRowSchemaOrThrow(invalidRow)).toThrow();
    });
  });

  describe('ImportRowSchema', () => {
    it('should parse valid import row', () => {
      const result = ImportRowSchema.safeParse(validImportRow);
      expect(result.success).toBe(true);
    });

    it('should fail for invalid import row', () => {
      const result = ImportRowSchema.safeParse({ invalid: true });
      expect(result.success).toBe(false);
    });
  });
});
