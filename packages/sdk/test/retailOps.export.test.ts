/**
 * RetailOps Export Tests
 * Per AOSS Section 4.1 — RetailOps Export Mapping
 * Version: aoss.v0.5.0
 *
 * Tests verify:
 * 1. Header order matches Notion spec exactly
 * 2. Single row mapping from CoreProduct
 * 3. Multiple products generate correct CSV
 * 4. Missing optional fields use defaults
 * 5. CSV escaping for commas, quotes, newlines
 */

import { describe, it, expect } from 'vitest';
import {
  buildRetailOpsRow,
  buildRetailOpsCsv,
  retailOpsExportMapping,
  getRetailOpsHeaderRow,
  RETAILOPS_COLUMN_NAMES,
  RETAILOPS_HEADER_ROW,
} from '../src/export/retailOps';
import type { CoreProduct, ProductImage } from '../src/schemas/coreProduct';

// ============================================================================
// Test Fixtures
// ============================================================================

/**
 * Sample CoreProduct for Nike men's footwear (MVP)
 */
const sampleProduct: CoreProduct = {
  id: 'prod-001',
  sku: 'NK-AIR-MAX-270-BLK',
  styleCode: 'DZ5485-410',
  brand: 'NIKE',
  gender: 'MEN',
  category: 'FOOTWEAR',
  class: 'BASKETBALL',
  colorPrimary: 'Black',
  colorSecondary: 'White',
  sizeScale: 'MENS_US',
  msrp: 159.99,
  price: 139.99,
  launchDate: '2024-12-15T00:00:00.000Z',
  season: 'FA24',
  status: 'READY_FOR_EXPORT',
  images: [
    { url: 'https://example.com/nike1.jpg', alt: 'Nike Air Max 270 Front', isPrimary: true },
    { url: 'https://example.com/nike2.jpg', alt: 'Nike Air Max 270 Side' },
  ],
  flags: {
    isOutlet: false,
    isOnlineExclusive: true,
  },
  meta: {
    internalNote: 'Holiday launch',
  },
};

/**
 * Minimal CoreProduct with only required fields
 */
const minimalProduct: CoreProduct = {
  id: 'prod-002',
  sku: 'JD-RETRO-1-WHT',
  styleCode: 'DQ8426-100',
  brand: 'JORDAN',
  gender: 'MEN',
  category: 'FOOTWEAR',
  class: 'LIFESTYLE',
  colorPrimary: 'White',
  sizeScale: 'MENS_US',
  msrp: 180.00,
  price: 180.00,
  launchDate: '2025-01-10T00:00:00.000Z',
  status: 'DRAFT',
  images: [],
};

/**
 * Product with special characters in fields (for CSV escaping tests)
 */
const productWithSpecialChars: CoreProduct = {
  id: 'prod-003',
  sku: 'NK-SPECIAL-001',
  styleCode: 'SP5000-001',
  brand: 'NIKE',
  gender: 'MEN',
  category: 'FOOTWEAR',
  class: 'RUNNING',
  colorPrimary: 'Black/White, Metallic',
  sizeScale: 'MENS_US',
  msrp: 199.99,
  price: 179.99,
  launchDate: '2025-02-01T00:00:00.000Z',
  status: 'READY_FOR_EXPORT',
  images: [
    { url: 'https://example.com/special.jpg', alt: 'Product with "quotes"' },
  ],
};

// ============================================================================
// Header Row Tests
// ============================================================================

describe('RetailOps Export - Header Row', () => {
  /**
   * Expected header row from Notion spec
   * Column names and order must match exactly
   */
  const expectedHeaders = [
    'SKU',
    'Product Name',
    'Brand',
    'Description',
    'Department',
    'Category',
    'Color',
    'Size',
    'MSRP',
    'Cost',
    'Retail Price',
    'Currency',
    'Quantity',
    'Warehouse',
    'First Received',
    'Launch Date',
    'Images',
    'Primary Image',
  ];

  it('should have correct column count', () => {
    expect(RETAILOPS_COLUMN_NAMES).toHaveLength(18);
  });

  it('should have column names exactly matching Notion spec', () => {
    expect(RETAILOPS_COLUMN_NAMES).toEqual(expectedHeaders);
  });

  it('should have correct column order', () => {
    // Verify each column is in the exact position
    expectedHeaders.forEach((header, index) => {
      expect(RETAILOPS_COLUMN_NAMES[index]).toBe(header);
    });
  });

  it('should produce correct header row string', () => {
    const expectedHeaderRow = expectedHeaders.join(',');
    expect(RETAILOPS_HEADER_ROW).toBe(expectedHeaderRow);
  });

  it('getRetailOpsHeaderRow() should return correct array', () => {
    expect(getRetailOpsHeaderRow()).toEqual(expectedHeaders);
  });

  it('retailOpsExportMapping should have all columns defined', () => {
    expect(retailOpsExportMapping.columns).toHaveLength(18);
    retailOpsExportMapping.columns.forEach((col, index) => {
      expect(col.name).toBe(expectedHeaders[index]);
    });
  });
});

// ============================================================================
// Single Row Mapping Tests
// ============================================================================

describe('RetailOps Export - buildRetailOpsRow', () => {
  it('should map SKU correctly', () => {
    const row = buildRetailOpsRow(sampleProduct);
    expect(row['SKU']).toBe('NK-AIR-MAX-270-BLK');
  });

  it('should build Product Name from brand, class, and color', () => {
    const row = buildRetailOpsRow(sampleProduct);
    expect(row['Product Name']).toBe('NIKE BASKETBALL - Black');
  });

  it('should map Brand correctly', () => {
    const row = buildRetailOpsRow(sampleProduct);
    expect(row['Brand']).toBe('NIKE');
  });

  it('should map Department from gender', () => {
    const row = buildRetailOpsRow(sampleProduct);
    expect(row['Department']).toBe('Mens');
  });

  it('should map Category correctly', () => {
    const row = buildRetailOpsRow(sampleProduct);
    expect(row['Category']).toBe('FOOTWEAR');
  });

  it('should map Color from colorPrimary', () => {
    const row = buildRetailOpsRow(sampleProduct);
    expect(row['Color']).toBe('Black');
  });

  it('should format MSRP as currency', () => {
    const row = buildRetailOpsRow(sampleProduct);
    expect(row['MSRP']).toBe('159.99');
  });

  it('should format Retail Price as currency', () => {
    const row = buildRetailOpsRow(sampleProduct);
    expect(row['Retail Price']).toBe('139.99');
  });

  it('should default Currency to USD', () => {
    const row = buildRetailOpsRow(sampleProduct);
    expect(row['Currency']).toBe('USD');
  });

  it('should format Launch Date as YYYY-MM-DD', () => {
    const row = buildRetailOpsRow(sampleProduct);
    expect(row['Launch Date']).toBe('2024-12-15');
  });

  it('should join Images with pipe separator', () => {
    const row = buildRetailOpsRow(sampleProduct);
    expect(row['Images']).toBe('https://example.com/nike1.jpg|https://example.com/nike2.jpg');
  });

  it('should get Primary Image (first with isPrimary=true)', () => {
    const row = buildRetailOpsRow(sampleProduct);
    expect(row['Primary Image']).toBe('https://example.com/nike1.jpg');
  });

  it('should use first image as Primary Image when none marked primary', () => {
    const productNoPrimary: CoreProduct = {
      ...sampleProduct,
      images: [
        { url: 'https://example.com/a.jpg' },
        { url: 'https://example.com/b.jpg' },
      ],
    };
    const row = buildRetailOpsRow(productNoPrimary);
    expect(row['Primary Image']).toBe('https://example.com/a.jpg');
  });

  it('should return all expected column names as keys', () => {
    const row = buildRetailOpsRow(sampleProduct);
    const expectedKeys = getRetailOpsHeaderRow();
    expect(Object.keys(row)).toEqual(expectedKeys);
  });
});

// ============================================================================
// Missing Optional Fields Tests
// ============================================================================

describe('RetailOps Export - Missing Optional Fields', () => {
  it('should use empty string for Description (not in CoreProduct)', () => {
    const row = buildRetailOpsRow(sampleProduct);
    expect(row['Description']).toBe('');
  });

  it('should use empty string for Size (not available at product level)', () => {
    const row = buildRetailOpsRow(sampleProduct);
    expect(row['Size']).toBe('');
  });

  it('should use empty string for Cost (not in CoreProduct)', () => {
    const row = buildRetailOpsRow(sampleProduct);
    expect(row['Cost']).toBe('');
  });

  it('should use empty string for Quantity (not in CoreProduct)', () => {
    const row = buildRetailOpsRow(sampleProduct);
    expect(row['Quantity']).toBe('');
  });

  it('should use empty string for Warehouse (not in CoreProduct)', () => {
    const row = buildRetailOpsRow(sampleProduct);
    expect(row['Warehouse']).toBe('');
  });

  it('should use empty string for First Received (not in CoreProduct)', () => {
    const row = buildRetailOpsRow(sampleProduct);
    expect(row['First Received']).toBe('');
  });

  it('should handle product with no images', () => {
    const row = buildRetailOpsRow(minimalProduct);
    expect(row['Images']).toBe('');
    expect(row['Primary Image']).toBe('');
  });

  it('should handle minimal product correctly', () => {
    const row = buildRetailOpsRow(minimalProduct);
    expect(row['SKU']).toBe('JD-RETRO-1-WHT');
    expect(row['Brand']).toBe('JORDAN');
    expect(row['Product Name']).toBe('JORDAN LIFESTYLE - White');
    expect(row['MSRP']).toBe('180.00');
    expect(row['Currency']).toBe('USD');
  });
});

// ============================================================================
// Multiple Products Tests
// ============================================================================

describe('RetailOps Export - buildRetailOpsCsv', () => {
  it('should produce header row as first line', () => {
    const csv = buildRetailOpsCsv([sampleProduct]);
    const lines = csv.split('\n');
    expect(lines[0]).toBe(RETAILOPS_HEADER_ROW);
  });

  it('should produce one data row for single product', () => {
    const csv = buildRetailOpsCsv([sampleProduct]);
    const lines = csv.split('\n');
    expect(lines).toHaveLength(2); // header + 1 data row
  });

  it('should produce two data rows for two products', () => {
    const csv = buildRetailOpsCsv([sampleProduct, minimalProduct]);
    const lines = csv.split('\n');
    expect(lines).toHaveLength(3); // header + 2 data rows
  });

  it('should have correct column count in each row', () => {
    const csv = buildRetailOpsCsv([sampleProduct, minimalProduct]);
    const lines = csv.split('\n');
    
    // Parse each line accounting for quoted fields
    lines.forEach((line) => {
      // Simple check: count unquoted commas
      // This is a basic check; more complex parsing would be needed for edge cases
      const columnCount = getRetailOpsHeaderRow().length;
      // Each row should have values for all columns
      expect(line.split(',').length).toBeGreaterThanOrEqual(columnCount);
    });
  });

  it('should produce empty CSV (header only) for empty array', () => {
    const csv = buildRetailOpsCsv([]);
    const lines = csv.split('\n');
    expect(lines).toHaveLength(1);
    expect(lines[0]).toBe(RETAILOPS_HEADER_ROW);
  });

  it('should maintain column order across rows', () => {
    const csv = buildRetailOpsCsv([sampleProduct, minimalProduct]);
    const lines = csv.split('\n');
    
    // First data row should start with sampleProduct SKU
    expect(lines[1]).toContain('NK-AIR-MAX-270-BLK');
    
    // Second data row should start with minimalProduct SKU
    expect(lines[2]).toContain('JD-RETRO-1-WHT');
  });
});

// ============================================================================
// CSV Escaping Tests
// ============================================================================

describe('RetailOps Export - CSV Escaping', () => {
  it('should quote values containing commas', () => {
    const row = buildRetailOpsRow(productWithSpecialChars);
    const csv = buildRetailOpsCsv([productWithSpecialChars]);
    
    // The Color field contains a comma: "Black/White, Metallic"
    expect(csv).toContain('"Black/White, Metallic"');
  });

  it('should escape quotes by doubling them', () => {
    // Create product with quotes in a field
    const productWithQuotes: CoreProduct = {
      ...minimalProduct,
      colorPrimary: 'Black "Premium"',
    };
    const csv = buildRetailOpsCsv([productWithQuotes]);
    
    // Quotes should be doubled and the value quoted
    expect(csv).toContain('"Black ""Premium"""');
  });

  it('should quote values containing newlines', () => {
    // Create product with newline in colorSecondary (even though unusual)
    const productWithNewline: CoreProduct = {
      ...minimalProduct,
      colorPrimary: 'Black\nWhite',
    };
    const csv = buildRetailOpsCsv([productWithNewline]);
    
    // Value with newline should be quoted
    expect(csv).toContain('"Black\nWhite"');
  });

  it('should not quote simple values', () => {
    const csv = buildRetailOpsCsv([minimalProduct]);
    
    // Simple values like SKU should not be quoted
    expect(csv).toContain('JD-RETRO-1-WHT');
    expect(csv).not.toContain('"JD-RETRO-1-WHT"');
  });

  it('should handle empty values correctly', () => {
    const csv = buildRetailOpsCsv([minimalProduct]);
    
    // Should have consecutive commas for empty values
    // e.g., between Size and MSRP columns
    expect(csv).toContain(',,');
  });
});

// ============================================================================
// Mapping Configuration Tests
// ============================================================================

describe('RetailOps Export - Mapping Configuration', () => {
  it('should have required flag for required columns', () => {
    const requiredColumns = retailOpsExportMapping.columns.filter((col) => col.required);
    const requiredNames = requiredColumns.map((col) => col.name);
    
    expect(requiredNames).toContain('SKU');
    expect(requiredNames).toContain('Product Name');
    expect(requiredNames).toContain('Brand');
    expect(requiredNames).toContain('MSRP');
    expect(requiredNames).toContain('Retail Price');
  });

  it('should have source path for direct mappings', () => {
    const skuColumn = retailOpsExportMapping.columns.find((col) => col.name === 'SKU');
    expect(skuColumn?.source).toBe('sku');

    const brandColumn = retailOpsExportMapping.columns.find((col) => col.name === 'Brand');
    expect(brandColumn?.source).toBe('brand');

    const msrpColumn = retailOpsExportMapping.columns.find((col) => col.name === 'MSRP');
    expect(msrpColumn?.source).toBe('msrp');
  });

  it('should have empty source for unmapped columns', () => {
    const unmappedColumns = ['Description', 'Size', 'Cost', 'Quantity', 'Warehouse', 'First Received'];
    
    unmappedColumns.forEach((name) => {
      const column = retailOpsExportMapping.columns.find((col) => col.name === name);
      expect(column?.source).toBe('');
    });
  });

  it('should have default values for appropriate columns', () => {
    const currencyColumn = retailOpsExportMapping.columns.find((col) => col.name === 'Currency');
    expect(currencyColumn?.default).toBe('USD');
  });

  it('should have transform functions for complex mappings', () => {
    const productNameColumn = retailOpsExportMapping.columns.find((col) => col.name === 'Product Name');
    expect(productNameColumn?.transform).toBe('buildProductName');

    const departmentColumn = retailOpsExportMapping.columns.find((col) => col.name === 'Department');
    expect(departmentColumn?.transform).toBe('mapGenderToDepartment');

    const msrpColumn = retailOpsExportMapping.columns.find((col) => col.name === 'MSRP');
    expect(msrpColumn?.transform).toBe('formatCurrency');
  });
});

// ============================================================================
// Edge Cases
// ============================================================================

describe('RetailOps Export - Edge Cases', () => {
  it('should handle zero prices correctly', () => {
    const freeProduct: CoreProduct = {
      ...minimalProduct,
      msrp: 0,
      price: 0,
    };
    const row = buildRetailOpsRow(freeProduct);
    expect(row['MSRP']).toBe('0.00');
    expect(row['Retail Price']).toBe('0.00');
  });

  it('should handle large prices correctly', () => {
    const expensiveProduct: CoreProduct = {
      ...minimalProduct,
      msrp: 9999.99,
      price: 8999.99,
    };
    const row = buildRetailOpsRow(expensiveProduct);
    expect(row['MSRP']).toBe('9999.99');
    expect(row['Retail Price']).toBe('8999.99');
  });

  it('should handle JORDAN brand correctly', () => {
    const row = buildRetailOpsRow(minimalProduct);
    expect(row['Brand']).toBe('JORDAN');
    expect(row['Product Name']).toBe('JORDAN LIFESTYLE - White');
  });

  it('should handle single image correctly', () => {
    const singleImageProduct: CoreProduct = {
      ...minimalProduct,
      images: [{ url: 'https://example.com/single.jpg' }],
    };
    const row = buildRetailOpsRow(singleImageProduct);
    expect(row['Images']).toBe('https://example.com/single.jpg');
    expect(row['Primary Image']).toBe('https://example.com/single.jpg');
  });

  it('should handle many images correctly', () => {
    const manyImages: ProductImage[] = Array.from({ length: 10 }, (_, i) => ({
      url: `https://example.com/img${i}.jpg`,
    }));
    const manyImagesProduct: CoreProduct = {
      ...minimalProduct,
      images: manyImages,
    };
    const row = buildRetailOpsRow(manyImagesProduct);
    
    // Should have 10 URLs joined by pipes
    const imageUrls = (row['Images'] as string).split('|');
    expect(imageUrls).toHaveLength(10);
  });
});
