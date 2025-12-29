/**
 * LP-1.4.5 Import Normalizer Tests
 * Tests for shipping override and SCOM pricing mappings
 */

import { describe, it, expect } from 'vitest';
import {
  normalizeImportRow,
  DEFAULT_COLUMN_MAPPINGS,
} from '../src/normalization/importNormalizer';
import type { ImportSourceColumns } from '../src/schema/importEngine';

describe('LP-1.4.5 Import Normalizer - Shipping & Pricing Mappings', () => {
  describe('Shipping Override Mappings', () => {
    it('should normalize Standard Shipping Override header', () => {
      const sourceColumns: ImportSourceColumns = {
        'MPN': 'TEST-001',
        'Standard Shipping Override': '5.99',
      };

      const normalized = normalizeImportRow(sourceColumns);

      expect(normalized.standard_shipping_override).toBe(5.99);
    });

    it('should normalize standard_shipping_override (snake_case) header', () => {
      const sourceColumns: ImportSourceColumns = {
        'MPN': 'TEST-002',
        'standard_shipping_override': '7.50',
      };

      const normalized = normalizeImportRow(sourceColumns);

      expect(normalized.standard_shipping_override).toBe(7.5);
    });

    it('should normalize Expedited Shipping Override header', () => {
      const sourceColumns: ImportSourceColumns = {
        'MPN': 'TEST-003',
        'Expedited Shipping Override': '12.99',
      };

      const normalized = normalizeImportRow(sourceColumns);

      expect(normalized.expedited_override_shipping).toBe(12.99);
    });

    it('should normalize expedited_override_shipping (snake_case) header', () => {
      const sourceColumns: ImportSourceColumns = {
        'MPN': 'TEST-004',
        'expedited_override_shipping': '15.00',
      };

      const normalized = normalizeImportRow(sourceColumns);

      expect(normalized.expedited_override_shipping).toBe(15);
    });

    it('should normalize expedited_shipping_override (alternate snake_case) header', () => {
      const sourceColumns: ImportSourceColumns = {
        'MPN': 'TEST-005',
        'expedited_shipping_override': '9.99',
      };

      const normalized = normalizeImportRow(sourceColumns);

      expect(normalized.expedited_override_shipping).toBe(9.99);
    });

    it('should handle both shipping overrides together', () => {
      const sourceColumns: ImportSourceColumns = {
        'MPN': 'TEST-006',
        'Standard Shipping Override': '4.99',
        'Expedited Shipping Override': '11.99',
      };

      const normalized = normalizeImportRow(sourceColumns);

      expect(normalized.standard_shipping_override).toBe(4.99);
      expect(normalized.expedited_override_shipping).toBe(11.99);
    });

    it('should handle shipping overrides with currency symbols', () => {
      const sourceColumns: ImportSourceColumns = {
        'MPN': 'TEST-007',
        'Standard Shipping Override': '$5.99',
        'Expedited Shipping Override': '$12.99',
      };

      const normalized = normalizeImportRow(sourceColumns);

      expect(normalized.standard_shipping_override).toBe(5.99);
      expect(normalized.expedited_override_shipping).toBe(12.99);
    });
  });

  describe('SCOM Pricing Mappings', () => {
    it('should normalize SCOM Regular Price header', () => {
      const sourceColumns: ImportSourceColumns = {
        'MPN': 'TEST-008',
        'SCOM Regular Price': '129.99',
      };

      const normalized = normalizeImportRow(sourceColumns);

      expect(normalized.scom_regular_price).toBe(129.99);
    });

    it('should normalize scom_regular_price (snake_case) header', () => {
      const sourceColumns: ImportSourceColumns = {
        'MPN': 'TEST-009',
        'scom_regular_price': '89.99',
      };

      const normalized = normalizeImportRow(sourceColumns);

      expect(normalized.scom_regular_price).toBe(89.99);
    });

    it('should normalize SCOM Sale Price header', () => {
      const sourceColumns: ImportSourceColumns = {
        'MPN': 'TEST-010',
        'SCOM Sale Price': '99.99',
      };

      const normalized = normalizeImportRow(sourceColumns);

      expect(normalized.scom_sale_price).toBe(99.99);
    });

    it('should normalize scom_sale_price (snake_case) header', () => {
      const sourceColumns: ImportSourceColumns = {
        'MPN': 'TEST-011',
        'scom_sale_price': '79.99',
      };

      const normalized = normalizeImportRow(sourceColumns);

      expect(normalized.scom_sale_price).toBe(79.99);
    });

    it('should handle both SCOM prices together', () => {
      const sourceColumns: ImportSourceColumns = {
        'MPN': 'TEST-012',
        'SCOM Regular Price': '149.99',
        'SCOM Sale Price': '119.99',
      };

      const normalized = normalizeImportRow(sourceColumns);

      expect(normalized.scom_regular_price).toBe(149.99);
      expect(normalized.scom_sale_price).toBe(119.99);
    });

    it('should handle SCOM prices with currency symbols', () => {
      const sourceColumns: ImportSourceColumns = {
        'MPN': 'TEST-013',
        'SCOM Regular Price': '$199.99',
        'SCOM Sale Price': '$159.99',
      };

      const normalized = normalizeImportRow(sourceColumns);

      expect(normalized.scom_regular_price).toBe(199.99);
      expect(normalized.scom_sale_price).toBe(159.99);
    });
  });

  describe('KL Post Date Mapping', () => {
    it('should normalize KL Post Date header', () => {
      const sourceColumns: ImportSourceColumns = {
        'MPN': 'TEST-014',
        'KL Post Date': '2024-03-15',
      };

      const normalized = normalizeImportRow(sourceColumns);

      expect(normalized.kl_post_date).toBeDefined();
      expect(normalized.kl_post_date).toContain('2024-03-15');
    });

    it('should normalize kl_post_date (snake_case) header', () => {
      const sourceColumns: ImportSourceColumns = {
        'MPN': 'TEST-015',
        'kl_post_date': '2024-06-01',
      };

      const normalized = normalizeImportRow(sourceColumns);

      expect(normalized.kl_post_date).toBeDefined();
      expect(normalized.kl_post_date).toContain('2024-06-01');
    });
  });

  describe('Complete Import Row with All LP-1.4.5 Fields', () => {
    it('should normalize a complete row with all pricing and shipping fields', () => {
      const sourceColumns: ImportSourceColumns = {
        'MPN': '211737-90h1-8',
        'Product Name': 'Test Sneaker',
        'Brand': 'Nike',
        'SCOM Regular Price': '159.99',
        'SCOM Sale Price': '129.99',
        'Standard Shipping Override': '6.99',
        'Expedited Shipping Override': '14.99',
        'KL Post Date': '2024-01-15',
        'Launch Date': '2024-02-01',
        'Fit': 'True to size',
        'Cut Type': 'Low-top',
        'Closure Type': 'Lace-up',
      };

      const normalized = normalizeImportRow(sourceColumns);

      expect(normalized.mpn).toBe('211737-90h1-8');
      expect(normalized.name).toBe('Test Sneaker');
      expect(normalized.brand).toBe('Nike');
      expect(normalized.scom_regular_price).toBe(159.99);
      expect(normalized.scom_sale_price).toBe(129.99);
      expect(normalized.standard_shipping_override).toBe(6.99);
      expect(normalized.expedited_override_shipping).toBe(14.99);
      expect(normalized.kl_post_date).toBeDefined();
      expect(normalized.launch_date).toBeDefined();
      expect(normalized.fit).toBe('True to size');
      expect(normalized.cut_type).toBe('Low-top');
      expect(normalized.closure_type).toBe('Lace-up');
    });
  });

  describe('DEFAULT_COLUMN_MAPPINGS includes LP-1.4.5 fields', () => {
    it('should include standard_shipping_override mapping', () => {
      const mapping = DEFAULT_COLUMN_MAPPINGS.find(m => m.targetField === 'standard_shipping_override');
      expect(mapping).toBeDefined();
      expect(mapping!.transform).toBe('number');
    });

    it('should include expedited_override_shipping mapping', () => {
      const mapping = DEFAULT_COLUMN_MAPPINGS.find(m => m.targetField === 'expedited_override_shipping');
      expect(mapping).toBeDefined();
      expect(mapping!.transform).toBe('number');
    });

    it('should include scom_regular_price mapping', () => {
      const mapping = DEFAULT_COLUMN_MAPPINGS.find(m => m.targetField === 'scom_regular_price');
      expect(mapping).toBeDefined();
      expect(mapping!.transform).toBe('number');
    });

    it('should include scom_sale_price mapping', () => {
      const mapping = DEFAULT_COLUMN_MAPPINGS.find(m => m.targetField === 'scom_sale_price');
      expect(mapping).toBeDefined();
      expect(mapping!.transform).toBe('number');
    });

    it('should include kl_post_date mapping', () => {
      const mapping = DEFAULT_COLUMN_MAPPINGS.find(m => m.targetField === 'kl_post_date');
      expect(mapping).toBeDefined();
      expect(mapping!.transform).toBe('date');
    });
  });
});
