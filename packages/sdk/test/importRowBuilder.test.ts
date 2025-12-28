/**
 * Import Row Builder Tests
 * Tests for building complete Import Engine Rows
 * 
 * LP-2.1.0: Updated for MPN-first normalization
 */

import { describe, it, expect } from 'vitest';
import { buildImportRow, buildImportRows } from '../src/builders/importRowBuilder';
import type { ImportSourceColumns } from '../src/schema/importEngine';

describe('Import Row Builder', () => {
  describe('buildImportRow', () => {
    it('should build a valid import row', () => {
      const sourceColumns: ImportSourceColumns = {
        'MPN': 'MPN-TEST-001',
        'SKU': 'TEST-SKU-001',
        'Product Name': 'Test Product',
        'Brand': 'Test Brand',
        'MSRP': '99.99',
      };

      const row = buildImportRow(sourceColumns, {
        batchId: 'batch-123',
        lineNumber: 2,
        userId: 'user-456',
      });

      expect(row).toBeDefined();
      expect(row?.rowId).toBeDefined();
      expect(row?.batchId).toBe('batch-123');
      expect(row?.source.columns).toEqual(sourceColumns);
      expect(row?.source.lineNumber).toBe(2);
      expect(row?.normalized.mpn).toBe('MPN-TEST-001');
      expect(row?.normalized.sku).toBe('TEST-SKU-001');
      expect(row?.normalized.name).toBe('Test Product');
      expect(row?.normalized.brand).toBe('Test Brand');
      // LP-2.1.0: productId should derive from MPN (preferred)
      expect(row?.meta.productId).toBe('mpn-test-001');
      expect(row?.meta.importedBy).toBe('user-456');
      expect(row?.meta.status).toBe('pending');
      expect(row?.validation.isValid).toBe(true);
    });

    // LP-2.1.0: Test MPN-only row (no SKU)
    it('LP-2.1.0: should build valid row with MPN only (no SKU)', () => {
      const sourceColumns: ImportSourceColumns = {
        'MPN': 'MPN-ONLY-001',
        'Product Name': 'MPN Only Product',
        'Brand': 'Test Brand',
      };

      const row = buildImportRow(sourceColumns, {
        batchId: 'batch-123',
        lineNumber: 2,
        userId: 'user-456',
      });

      expect(row).toBeDefined();
      expect(row?.normalized.mpn).toBe('MPN-ONLY-001');
      expect(row?.normalized.sku).toBeUndefined();
      expect(row?.meta.productId).toBe('mpn-only-001');
      expect(row?.validation.isValid).toBe(true);
    });

    it('should mark row as failed if validation fails', () => {
      const sourceColumns: ImportSourceColumns = {
        'MPN': '', // Missing required field (LP-2.1.0)
        'SKU': 'TEST-SKU-001',
        'Product Name': 'Test Product',
        'Brand': 'Test Brand',
      };

      const row = buildImportRow(sourceColumns, {
        batchId: 'batch-123',
        lineNumber: 2,
        userId: 'user-456',
      });

      expect(row).toBeDefined();
      expect(row?.validation.isValid).toBe(false);
      expect(row?.validation.errors.length).toBeGreaterThan(0);
      expect(row?.meta.status).toBe('failed');
      expect(row?.meta.errorMessage).toBeDefined();
      expect(row?.meta.errorMessage).toContain('mpn');
    });

    it('should skip empty rows', () => {
      const sourceColumns: ImportSourceColumns = {
        'MPN': '',
        'SKU': '',
        'Product Name': null,
        'Brand': undefined,
      };

      const row = buildImportRow(sourceColumns, {
        batchId: 'batch-123',
        lineNumber: 2,
        userId: 'user-456',
        skipEmpty: true,
      });

      expect(row).toBeNull();
    });

    it('should not skip empty rows if configured', () => {
      const sourceColumns: ImportSourceColumns = {
        'MPN': '',
        'SKU': '',
        'Product Name': null,
        'Brand': undefined,
      };

      const row = buildImportRow(sourceColumns, {
        batchId: 'batch-123',
        lineNumber: 2,
        userId: 'user-456',
        skipEmpty: false,
      });

      expect(row).toBeDefined();
      expect(row?.validation.isValid).toBe(false);
    });
  });

  describe('buildImportRows', () => {
    it('should build multiple rows', () => {
      const csvData = [
        {
          'MPN': 'MPN-001',
          'SKU': 'SKU-001',
          'Product Name': 'Product 1',
          'Brand': 'Brand A',
        },
        {
          'MPN': 'MPN-002',
          'SKU': 'SKU-002',
          'Product Name': 'Product 2',
          'Brand': 'Brand B',
        },
        {
          'MPN': '', // Empty row - should be skipped
          'SKU': '',
          'Product Name': null,
          'Brand': undefined,
        },
      ];

      const rows = buildImportRows(csvData, 'batch-123', 'user-456');

      expect(rows).toHaveLength(2); // Empty row skipped
      expect(rows[0].normalized.mpn).toBe('MPN-001');
      expect(rows[1].normalized.mpn).toBe('MPN-002');
      expect(rows[0].source.lineNumber).toBe(2); // Line 1 is header
      expect(rows[1].source.lineNumber).toBe(3);
    });

    it('should handle empty dataset', () => {
      const csvData: ImportSourceColumns[] = [];

      const rows = buildImportRows(csvData, 'batch-123', 'user-456');

      expect(rows).toHaveLength(0);
    });

    /**
     * LP-1.3.3: Test client mappings support
     */
    describe('LP-1.3.3: client mappings support', () => {
      it('should use client mappings when provided as Record<string, string>', () => {
        const csvData = [
          {
            'Custom MPN Col': 'MPN-CUSTOM-001',
            'Custom Brand Col': 'Custom Brand',
            'Custom Name Col': 'Custom Product',
          },
        ];

        // Client provides mappings as { csvHeader: attributeId }
        const clientMappings = {
          'Custom MPN Col': 'mpn',
          'Custom Brand Col': 'brand',
          'Custom Name Col': 'name',
        };

        const rows = buildImportRows(csvData, 'batch-123', 'user-456', clientMappings);

        expect(rows).toHaveLength(1);
        expect(rows[0].normalized.mpn).toBe('MPN-CUSTOM-001');
        expect(rows[0].normalized.brand).toBe('Custom Brand');
        expect(rows[0].normalized.name).toBe('Custom Product');
        expect(rows[0].validation.isValid).toBe(true);
      });

      it('should fall back to DEFAULT_COLUMN_MAPPINGS when no client mappings provided', () => {
        const csvData = [
          {
            'MPN': 'MPN-DEFAULT-001',
            'Brand': 'Default Brand',
            'Product Name': 'Default Product',
          },
        ];

        // No client mappings — should use SDK defaults
        const rows = buildImportRows(csvData, 'batch-123', 'user-456');

        expect(rows).toHaveLength(1);
        expect(rows[0].normalized.mpn).toBe('MPN-DEFAULT-001');
        expect(rows[0].normalized.brand).toBe('Default Brand');
        expect(rows[0].normalized.name).toBe('Default Product');
      });

      it('should handle empty client mappings object', () => {
        const csvData = [
          {
            'MPN': 'MPN-EMPTY-001',
            'Brand': 'Empty Brand',
          },
        ];

        // Empty object — should use SDK defaults
        const rows = buildImportRows(csvData, 'batch-123', 'user-456', {});

        expect(rows).toHaveLength(1);
        expect(rows[0].normalized.mpn).toBe('MPN-EMPTY-001');
      });

      it('should handle partial client mappings (unmapped columns ignored)', () => {
        const csvData = [
          {
            'My MPN': 'MPN-PARTIAL-001',
            'Unmapped Col': 'Should be ignored',
          },
        ];

        const clientMappings = {
          'My MPN': 'mpn',
          // 'Unmapped Col' not in mappings
        };

        const rows = buildImportRows(csvData, 'batch-123', 'user-456', clientMappings);

        expect(rows).toHaveLength(1);
        expect(rows[0].normalized.mpn).toBe('MPN-PARTIAL-001');
      });
    });  });
});