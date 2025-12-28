/**
 * LP-1.3.6: convertRowToProduct Unit Tests
 * Tests that all normalized fields are properly mapped to product document
 */

import { describe, it, expect } from 'vitest';
import { convertRowToProduct } from '../src/services/productCommitService';
import type { ImportEngineRow } from '@ropi-aoss/sdk';

describe('convertRowToProduct (LP-1.3.6)', () => {
  const createTestRow = (normalized: Record<string, any>): ImportEngineRow => ({
    rowId: 'test-row-001',
    batchId: 'test-batch-001',
    source: {
      columns: {},
      lineNumber: 1,
    },
    normalized,
    validation: {
      isValid: true,
      errors: [],
      warnings: [],
    },
    meta: {
      rowId: 'test-row-001',
      batchId: 'test-batch-001',
      importedAt: '2025-12-28T12:00:00.000Z',
      productId: 'test-product-001',
      status: 'pending',
    },
  });

  it('should include MPN in core (LP-2.1.0 primary identifier)', () => {
    const row = createTestRow({
      mpn: '451-9201-BLK1',
      sku: 'TEST-SKU',
    });

    const product = convertRowToProduct(row);

    expect(product.core.mpn).toBe('451-9201-BLK1');
    expect(product.core.sku).toBe('TEST-SKU');
  });

  it('should preserve RICS fields in attributes', () => {
    const row = createTestRow({
      sku: 'TEST-SKU',
      rics_color: 'BLACK',
      rics_category: 'Apparel||Mens||Tops||T-short sleeve',
      rics_short_description: 'oprea ss tee',
      rics_long_desc: 'opera long description',
    });

    const product = convertRowToProduct(row);

    expect(product.attributes.rics_color).toBe('BLACK');
    expect(product.attributes.rics_category).toBe('Apparel||Mens||Tops||T-short sleeve');
    expect(product.attributes.rics_short_description).toBe('oprea ss tee');
    expect(product.attributes.rics_long_desc).toBe('opera long description');
  });

  it('should include warehouse and store inventory', () => {
    const row = createTestRow({
      sku: 'TEST-SKU',
      warehouse_inv: '14',
      store_inv: '5',
    });

    const product = convertRowToProduct(row);

    expect(product.inventory).toBeDefined();
    expect((product.inventory as any).warehouse_inv).toBe(14);
    expect((product.inventory as any).store_inv).toBe(5);
  });

  it('should include SCOM pricing fields', () => {
    const row = createTestRow({
      sku: 'TEST-SKU',
      scom_regular_price: '49.99',
      scom_sale_price: '39.99',
    });

    const product = convertRowToProduct(row);

    expect(product.pricing).toBeDefined();
    expect((product.pricing as any).scom_regular_price).toBe(49.99);
    expect((product.pricing as any).scom_sale_price).toBe(39.99);
  });

  it('should include date fields in core', () => {
    const row = createTestRow({
      sku: 'TEST-SKU',
      first_received: '12/26/2025',
      last_received: '12/24/2025',
    });

    const product = convertRowToProduct(row);

    expect(product.core.firstReceived).toBe('12/26/2025');
    expect(product.core.lastReceived).toBe('12/24/2025');
  });

  it('should include dimensions when present', () => {
    const row = createTestRow({
      sku: 'TEST-SKU',
      height: '10',
      width: '5',
      length: '15',
      weight: '2.5',
    });

    const product = convertRowToProduct(row);

    expect(product.dimensions).toBeDefined();
    expect(product.dimensions.height).toBe(10);
    expect(product.dimensions.width).toBe(5);
    expect(product.dimensions.length).toBe(15);
    expect(product.dimensions.weight).toBe(2.5);
  });

  it('should preserve brand in core', () => {
    const row = createTestRow({
      sku: 'TEST-SKU',
      brand: 'ICE CREAM/ROC',
    });

    const product = convertRowToProduct(row);

    expect(product.core.brand).toBe('ICE CREAM/ROC');
  });

  it('should capture all remaining fields as attributes', () => {
    const row = createTestRow({
      sku: 'TEST-SKU',
      custom_field_1: 'value1',
      custom_field_2: 'value2',
      variant_count: '4',
    });

    const product = convertRowToProduct(row);

    expect(product.attributes.custom_field_1).toBe('value1');
    expect(product.attributes.custom_field_2).toBe('value2');
    expect(product.attributes.variant_count).toBe('4');
  });

  it('should use name as title fallback', () => {
    const row = createTestRow({
      sku: 'TEST-SKU',
      name: 'Product Title from Name',
    });

    const product = convertRowToProduct(row);

    expect(product.core.title).toBe('Product Title from Name');
  });

  it('should handle the exact import row from LP-1.3.6 investigation', () => {
    // This is the exact normalized data from the failing import
    const row = createTestRow({
      mpn: '451-9201-BLK1',
      sku: 'SHK3054058',
      brand: 'ICE CREAM/ROC',
      name: '1df585bf-d341-4c0b-887d-b3bc0165f3c2',
      status: 'Incomplete',
      rics_color: 'BLACK',
      rics_category: 'Apparel||Mens||Tops||T-short sleeve',
      rics_short_description: 'oprea ss tee',
      rics_long_desc: 'oprea ss tee',
      warehouse_inv: '14',
      store_inv: '0',
      first_received: '12/26/2025',
      last_received: '12/24/2025',
      scom_regular_price: '0',
      scom_sale_price: '0',
      height: '0',
      width: '0',
      length: '0',
      weight: '0',
    });

    const product = convertRowToProduct(row);

    // Core fields
    expect(product.core.mpn).toBe('451-9201-BLK1');
    expect(product.core.sku).toBe('SHK3054058');
    expect(product.core.brand).toBe('ICE CREAM/ROC');
    expect(product.core.firstReceived).toBe('12/26/2025');
    expect(product.core.lastReceived).toBe('12/24/2025');

    // RICS attributes
    expect(product.attributes.rics_color).toBe('BLACK');
    expect(product.attributes.rics_category).toBe('Apparel||Mens||Tops||T-short sleeve');
    expect(product.attributes.rics_short_description).toBe('oprea ss tee');
    expect(product.attributes.rics_long_desc).toBe('oprea ss tee');

    // Inventory
    expect(product.inventory).toBeDefined();
    expect((product.inventory as any).warehouse_inv).toBe(14);
    expect((product.inventory as any).store_inv).toBe(0);

    // Pricing (even if 0)
    expect(product.pricing).toBeDefined();
    expect((product.pricing as any).scom_regular_price).toBe(0);
    expect((product.pricing as any).scom_sale_price).toBe(0);

    // Dimensions (even if 0)
    expect(product.dimensions).toBeDefined();
    expect(product.dimensions.height).toBe(0);
  });
});
