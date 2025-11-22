/**
 * Tests for v2.3 Import Validation Modes
 * Tests minimal and full validation modes
 */

import { describe, it, expect, beforeEach, vi } from 'vitest';
import { importToFirestore } from '../utils/firestoreImportV2';
import type { ImportRow } from '../utils/firestoreImportV2';

// Mock Firestore
vi.mock('firebase/firestore', () => ({
  doc: vi.fn(() => ({})),
  setDoc: vi.fn(() => Promise.resolve()),
  collection: vi.fn(),
}));

vi.mock('../firebase', () => ({
  db: {},
}));

// Mock schema adapter
vi.mock('../utils/schemaAdapter', () => ({
  newToLegacy: vi.fn((product) => product),
  validateProduct: vi.fn(() => ({ errors: [] })),
  calculateMediaStatus: vi.fn(() => 'Images Ready'),
}));

describe('Import Validation Modes v2.3', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('Minimal Mode', () => {
    it('should allow import with only MPN', async () => {
      const rows: ImportRow[] = [
        {
          rowNumber: 1,
          data: {
            mpn: 'TEST-MPN-001',
            // No other fields
          },
        },
      ];

      const result = await importToFirestore(rows, [[]], {
        validationMode: 'minimal',
      });

      expect(result.imported).toBe(1);
      expect(result.skipped).toBe(0);
      expect(result.errors).toHaveLength(0);
    });

    it('should allow import with MPN and SKU', async () => {
      const rows: ImportRow[] = [
        {
          rowNumber: 1,
          data: {
            mpn: 'TEST-MPN-002',
            sku: 'TEST-SKU-002',
          },
        },
      ];

      const result = await importToFirestore(rows, [[]], {
        validationMode: 'minimal',
      });

      expect(result.imported).toBe(1);
      expect(result.skipped).toBe(0);
      expect(result.errors).toHaveLength(0);
    });

    it('should fail import without MPN in minimal mode', async () => {
      const rows: ImportRow[] = [
        {
          rowNumber: 1,
          data: {
            sku: 'TEST-SKU-003',
            name: 'Test Product',
            // No MPN
          },
        },
      ];

      const result = await importToFirestore(rows, [[]], {
        validationMode: 'minimal',
      });

      expect(result.imported).toBe(0);
      expect(result.skipped).toBe(1);
      expect(result.errors).toHaveLength(1);
      expect(result.errors[0].reason).toContain('MPN is required');
      expect(result.errors[0].missingFields).toContain('MPN is required (minimal mode)');
    });

    it('should allow missing brand, name, department, category in minimal mode', async () => {
      const rows: ImportRow[] = [
        {
          rowNumber: 1,
          data: {
            mpn: 'TEST-MPN-004',
            // Missing brand, name, department, category
          },
        },
      ];

      const result = await importToFirestore(rows, [[]], {
        validationMode: 'minimal',
      });

      expect(result.imported).toBe(1);
      expect(result.skipped).toBe(0);
      expect(result.errors).toHaveLength(0);
    });
  });

  describe('Full Mode', () => {
    it('should require MPN, brand, name, department, category in full mode', async () => {
      const rows: ImportRow[] = [
        {
          rowNumber: 1,
          data: {
            mpn: 'TEST-MPN-005',
            // Missing required fields
          },
        },
      ];

      const result = await importToFirestore(rows, [[]], {
        validationMode: 'full',
      });

      expect(result.imported).toBe(0);
      expect(result.skipped).toBe(1);
      expect(result.errors).toHaveLength(1);
      expect(result.errors[0].reason).toContain('Brand is required');
      expect(result.errors[0].reason).toContain('Name is required');
      expect(result.errors[0].reason).toContain('Department is required');
      expect(result.errors[0].reason).toContain('Category is required');
    });

    it('should allow import with all required fields in full mode', async () => {
      const rows: ImportRow[] = [
        {
          rowNumber: 1,
          data: {
            mpn: 'TEST-MPN-006',
            brand: 'Test Brand',
            name: 'Test Product',
            department: 'Test Dept',
            category: 'Test Category',
          },
        },
      ];

      const result = await importToFirestore(rows, [[]], {
        validationMode: 'full',
      });

      expect(result.imported).toBe(1);
      expect(result.skipped).toBe(0);
      expect(result.errors).toHaveLength(0);
    });

    it('should default to full mode if not specified', async () => {
      const rows: ImportRow[] = [
        {
          rowNumber: 1,
          data: {
            mpn: 'TEST-MPN-007',
            // Missing other required fields
          },
        },
      ];

      // No validationMode specified - should default to 'full'
      const result = await importToFirestore(rows, [[]]);

      expect(result.skipped).toBe(1);
      expect(result.errors).toHaveLength(1);
    });
  });

  describe('Missing Fields Tracking', () => {
    it('should track missing fields in error objects', async () => {
      const rows: ImportRow[] = [
        {
          rowNumber: 1,
          data: {
            mpn: 'TEST-MPN-008',
            brand: 'Test Brand',
            // Missing name, department, category
          },
        },
      ];

      const result = await importToFirestore(rows, [[]], {
        validationMode: 'full',
      });

      expect(result.errors).toHaveLength(1);
      expect(result.errors[0].missingFields).toBeDefined();
      expect(result.errors[0].missingFields).toContain('Name is required');
      expect(result.errors[0].missingFields).toContain('Department is required');
      expect(result.errors[0].missingFields).toContain('Category is required');
    });

    it('should have empty missingFields for successful imports', async () => {
      const rows: ImportRow[] = [
        {
          rowNumber: 1,
          data: {
            mpn: 'TEST-MPN-009',
          },
        },
      ];

      const result = await importToFirestore(rows, [[]], {
        validationMode: 'minimal',
      });

      expect(result.imported).toBe(1);
      expect(result.errors).toHaveLength(0);
    });
  });

  describe('Registry-driven Validation', () => {
    it('should validate importRequired fields from registry in full mode', async () => {
      const registryAttributes = [
        {
          canonicalPath: 'sku_core.mpn',
          label: 'MPN',
          importRequired: true,
        },
        {
          canonicalPath: 'pricing.listPrice',
          label: 'List Price',
          importRequired: true,
        },
      ];

      const rows: ImportRow[] = [
        {
          rowNumber: 1,
          data: {
            mpn: 'TEST-MPN-010',
            brand: 'Test Brand',
            name: 'Test Product',
            department: 'Test Dept',
            category: 'Test Category',
            // Missing listPrice which is importRequired
          },
        },
      ];

      const result = await importToFirestore(rows, [[]], {
        validationMode: 'full',
        registryAttributes,
      });

      expect(result.skipped).toBe(1);
      expect(result.errors).toHaveLength(1);
      expect(result.errors[0].reason).toContain('List Price is required for import');
    });

    it('should not enforce registry rules in minimal mode', async () => {
      const registryAttributes = [
        {
          canonicalPath: 'pricing.listPrice',
          label: 'List Price',
          importRequired: true,
        },
      ];

      const rows: ImportRow[] = [
        {
          rowNumber: 1,
          data: {
            mpn: 'TEST-MPN-011',
            // Missing listPrice but minimal mode shouldn't check registry
          },
        },
      ];

      const result = await importToFirestore(rows, [[]], {
        validationMode: 'minimal',
        registryAttributes,
      });

      expect(result.imported).toBe(1);
      expect(result.skipped).toBe(0);
      expect(result.errors).toHaveLength(0);
    });
  });
});
