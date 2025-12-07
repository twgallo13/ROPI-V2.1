/**
 * RetailOps Import Tests
 * Per AOSS Section 3.3 — RetailOps Import Path
 * Version: aoss.v0.6.0
 *
 * Tests verify:
 * 1. CSV parsing (header detection, field extraction, quoting)
 * 2. ParsedRetailOpsRow → ImportRow mapping
 * 3. ImportRow → CoreProduct mapping (Nike men's footwear MVP)
 * 4. End-to-end round-trip: CSV → CoreProduct → CSV
 * 5. Edge cases and error handling
 */

import { describe, it, expect } from 'vitest';
import {
  parseRetailOpsCsv,
  retailOpsRowToImportRow,
  importRowToCoreProduct,
  retailOpsCsvToCoreProducts,
  retailOpsCsvToCoreProductsWithDetails,
  parsedRowsToImportRows,
  importRowsToCoreProducts,
} from '../src/import/retailOps';
import type { ParsedRetailOpsRow } from '../src/import/retailOps';
import type { ImportRow } from '../src/schemas/importRow';
import type { CoreProduct } from '../src/schemas/coreProduct';
import { buildRetailOpsCsv, RETAILOPS_HEADER_ROW } from '../src/export/retailOps';

// ============================================================================
// Test Fixtures
// ============================================================================

/**
 * Simple CSV matching our export format (18 columns)
 */
const SIMPLE_EXPORT_CSV = `SKU,Product Name,Brand,Description,Department,Category,Color,Size,MSRP,Cost,Retail Price,Currency,Quantity,Warehouse,First Received,Launch Date,Images,Primary Image
NK-AIR-MAX-270,Nike Air Max 270 - Black,Nike,Premium sneaker,Mens,Running,Black,10,159.99,,139.99,USD,25,WH-001,,2024-12-15,https://example.com/img1.jpg|https://example.com/img2.jpg,https://example.com/img1.jpg
NK-JORDAN-1,Jordan Retro 1 - White,Jordan,Classic basketball shoe,Mens,Basketball,White,11,180.00,,180.00,USD,15,WH-001,,2025-01-10,https://example.com/jordan.jpg,https://example.com/jordan.jpg`;

/**
 * Actual RetailOps export format (from real system)
 */
const ACTUAL_RETAILOPS_CSV = `Status,MPN,SKU,Brand,Name,Gender,Department,Class,Category,Primary Color,MSRP,Retail Price,Launch Date,Media
Incomplete,DZ5485-410,SHK3024901,NIKE,Air Max 270,Men's,Footwear,Sneakers,Running,Black,159.99,139.99,2024-12-15,https://example.com/nike.jpg
Incomplete,DQ8426-100,SHK3024425,JORDAN,Retro 1 High,Men's,Footwear,Sneakers,Basketball,White,180.00,180.00,2025-01-10,https://example.com/jordan.jpg
Incomplete,ADIDAS-001,SHK3024776,ADIDAS,Ultraboost,Men's,Footwear,Sneakers,Running,White,190.00,179.99,2024-11-01,https://example.com/adidas.jpg`;

/**
 * CSV with quoted fields and special characters
 */
const CSV_WITH_QUOTES = `SKU,Brand,Color,Description
"NK-001","Nike","Black, White","A shoe with ""premium"" quality"
"NK-002","Nike","Red/Blue","Simple description"`;

/**
 * CSV with missing/empty fields
 */
const CSV_WITH_MISSING_FIELDS = `SKU,Brand,Color,MSRP,Retail Price
NK-001,Nike,Black,,
NK-002,Nike,,100.00,90.00
,Nike,White,50.00,45.00`;

// ============================================================================
// CSV Parsing Tests
// ============================================================================

describe('RetailOps Import - parseRetailOpsCsv', () => {
  it('should parse a simple CSV with header row', () => {
    const rows = parseRetailOpsCsv(SIMPLE_EXPORT_CSV);
    expect(rows).toHaveLength(2);
  });

  it('should extract correct row numbers (1-indexed)', () => {
    const rows = parseRetailOpsCsv(SIMPLE_EXPORT_CSV);
    expect(rows[0].rowNumber).toBe(1);
    expect(rows[1].rowNumber).toBe(2);
  });

  it('should map header names to raw values correctly', () => {
    const rows = parseRetailOpsCsv(SIMPLE_EXPORT_CSV);
    expect(rows[0].raw['SKU']).toBe('NK-AIR-MAX-270');
    expect(rows[0].raw['Brand']).toBe('Nike');
    expect(rows[0].raw['Color']).toBe('Black');
    expect(rows[0].raw['MSRP']).toBe('159.99');
  });

  it('should handle quoted fields with commas', () => {
    const rows = parseRetailOpsCsv(CSV_WITH_QUOTES);
    expect(rows[0].raw['Color']).toBe('Black, White');
  });

  it('should handle escaped quotes (doubled)', () => {
    const rows = parseRetailOpsCsv(CSV_WITH_QUOTES);
    expect(rows[0].raw['Description']).toBe('A shoe with "premium" quality');
  });

  it('should trim whitespace from fields by default', () => {
    const csv = `SKU,Brand\n  NK-001  ,  Nike  `;
    const rows = parseRetailOpsCsv(csv);
    expect(rows[0].raw['SKU']).toBe('NK-001');
    expect(rows[0].raw['Brand']).toBe('Nike');
  });

  it('should skip empty rows by default', () => {
    const csv = `SKU,Brand\nNK-001,Nike\n\nNK-002,Nike`;
    const rows = parseRetailOpsCsv(csv);
    expect(rows).toHaveLength(2);
  });

  it('should handle different line endings (CRLF)', () => {
    const csv = `SKU,Brand\r\nNK-001,Nike\r\nNK-002,Nike`;
    const rows = parseRetailOpsCsv(csv);
    expect(rows).toHaveLength(2);
  });

  it('should handle empty CSV', () => {
    const rows = parseRetailOpsCsv('');
    expect(rows).toHaveLength(0);
  });

  it('should handle CSV with only header', () => {
    const rows = parseRetailOpsCsv('SKU,Brand,Color');
    expect(rows).toHaveLength(0);
  });

  it('should respect custom delimiter option', () => {
    const csv = `SKU;Brand;Color\nNK-001;Nike;Black`;
    const rows = parseRetailOpsCsv(csv, { delimiter: ';' });
    expect(rows[0].raw['SKU']).toBe('NK-001');
    expect(rows[0].raw['Brand']).toBe('Nike');
  });
});

// ============================================================================
// ParsedRetailOpsRow → ImportRow Tests
// ============================================================================

describe('RetailOps Import - retailOpsRowToImportRow', () => {
  const sampleParsedRow: ParsedRetailOpsRow = {
    raw: {
      SKU: 'NK-AIR-MAX-270',
      Brand: 'Nike',
      Color: 'Black',
      Size: '10',
      Gender: "Men's",
      Department: 'Footwear',
      Category: 'Running',
      MSRP: '159.99',
      'Retail Price': '139.99',
      'Launch Date': '2024-12-15',
    },
    rowNumber: 1,
  };

  it('should set source to RETAILOPS_EXPORT', () => {
    const importRow = retailOpsRowToImportRow(sampleParsedRow);
    expect(importRow.source).toBe('RETAILOPS_EXPORT');
  });

  it('should generate rowId from SKU', () => {
    const importRow = retailOpsRowToImportRow(sampleParsedRow);
    expect(importRow.rowId).toBe('NK-AIR-MAX-270');
  });

  it('should set originalRowNumber correctly', () => {
    const importRow = retailOpsRowToImportRow(sampleParsedRow);
    expect(importRow.originalRowNumber).toBe(1);
  });

  it('should extract styleCode from SKU', () => {
    const importRow = retailOpsRowToImportRow(sampleParsedRow);
    expect(importRow.styleCode).toBe('NK-AIR-MAX-270');
  });

  it('should map brand correctly', () => {
    const importRow = retailOpsRowToImportRow(sampleParsedRow);
    expect(importRow.brand).toBe('Nike');
  });

  it('should map color correctly', () => {
    const importRow = retailOpsRowToImportRow(sampleParsedRow);
    expect(importRow.color).toBe('Black');
  });

  it('should map size correctly', () => {
    const importRow = retailOpsRowToImportRow(sampleParsedRow);
    expect(importRow.size).toBe('10');
  });

  it('should use SKU as UPC placeholder', () => {
    const importRow = retailOpsRowToImportRow(sampleParsedRow);
    expect(importRow.upc).toBe('NK-AIR-MAX-270');
  });

  it('should include all raw columns', () => {
    const importRow = retailOpsRowToImportRow(sampleParsedRow);
    expect(importRow.raw).toEqual(sampleParsedRow.raw);
  });

  it('should normalize gender to MEN for mens products', () => {
    const importRow = retailOpsRowToImportRow(sampleParsedRow);
    expect(importRow.normalizedGender).toBe('MEN');
  });

  it('should normalize category to FOOTWEAR when Department indicates footwear', () => {
    const importRow = retailOpsRowToImportRow(sampleParsedRow);
    // Department: 'Footwear' triggers normalization to FOOTWEAR
    expect(importRow.normalizedCategory).toBe('FOOTWEAR');
  });

  it('should set normalizedSizeScale for mens products', () => {
    const importRow = retailOpsRowToImportRow(sampleParsedRow);
    expect(importRow.normalizedSizeScale).toBe('MENS_US');
  });

  it('should use MPN as styleCode when available', () => {
    const rowWithMpn: ParsedRetailOpsRow = {
      raw: { ...sampleParsedRow.raw, MPN: 'DZ5485-410' },
      rowNumber: 1,
    };
    const importRow = retailOpsRowToImportRow(rowWithMpn);
    expect(importRow.styleCode).toBe('DZ5485-410');
  });

  it('should handle missing SKU with fallback', () => {
    const rowWithoutSku: ParsedRetailOpsRow = {
      raw: { Brand: 'Nike', Color: 'Black' },
      rowNumber: 5,
    };
    const importRow = retailOpsRowToImportRow(rowWithoutSku);
    expect(importRow.rowId).toBe('retailops:5');
    expect(importRow.styleCode).toBe('ROW-5');
  });
});

// ============================================================================
// ImportRow → CoreProduct Tests
// ============================================================================

describe('RetailOps Import - importRowToCoreProduct', () => {
  const sampleImportRow: ImportRow = {
    source: 'RETAILOPS_EXPORT',
    rowId: 'NK-AIR-MAX-270',
    originalRowNumber: 1,
    styleCode: 'DZ5485-410',
    brand: 'Nike',
    color: 'Black',
    size: '10',
    upc: 'NK-AIR-MAX-270',
    raw: {
      SKU: 'NK-AIR-MAX-270',
      Brand: 'Nike',
      Color: 'Black',
      Category: 'Running',
      MSRP: '159.99',
      'Retail Price': '139.99',
      'Launch Date': '2024-12-15',
      Images: 'https://example.com/img1.jpg|https://example.com/img2.jpg',
      'Primary Image': 'https://example.com/img1.jpg',
    },
    normalizedGender: 'MEN',
    normalizedCategory: 'FOOTWEAR',
    normalizedSizeScale: 'MENS_US',
  };

  it('should produce a valid CoreProduct', () => {
    const product = importRowToCoreProduct(sampleImportRow);
    expect(product).toBeDefined();
    expect(product.id).toBe('NK-AIR-MAX-270');
    expect(product.sku).toBe('NK-AIR-MAX-270');
  });

  it('should normalize brand to NIKE', () => {
    const product = importRowToCoreProduct(sampleImportRow);
    expect(product.brand).toBe('NIKE');
  });

  it('should normalize Jordan brand correctly', () => {
    const jordanRow: ImportRow = { ...sampleImportRow, brand: 'Jordan' };
    const product = importRowToCoreProduct(jordanRow);
    expect(product.brand).toBe('JORDAN');
  });

  it('should throw for unsupported brands', () => {
    const adidasRow: ImportRow = { ...sampleImportRow, brand: 'Adidas' };
    expect(() => importRowToCoreProduct(adidasRow)).toThrow('Unsupported brand');
  });

  it('should set gender to MEN for MVP', () => {
    const product = importRowToCoreProduct(sampleImportRow);
    expect(product.gender).toBe('MEN');
  });

  it('should set category to FOOTWEAR for MVP', () => {
    const product = importRowToCoreProduct(sampleImportRow);
    expect(product.category).toBe('FOOTWEAR');
  });

  it('should derive class from Category (Running)', () => {
    const product = importRowToCoreProduct(sampleImportRow);
    expect(product.class).toBe('RUNNING');
  });

  it('should derive class from Category (Basketball)', () => {
    const basketballRow: ImportRow = {
      ...sampleImportRow,
      raw: { ...sampleImportRow.raw, Category: 'Basketball' },
    };
    const product = importRowToCoreProduct(basketballRow);
    expect(product.class).toBe('BASKETBALL');
  });

  it('should default class to LIFESTYLE when unknown', () => {
    const unknownRow: ImportRow = {
      ...sampleImportRow,
      raw: { ...sampleImportRow.raw, Category: 'Unknown' },
    };
    const product = importRowToCoreProduct(unknownRow);
    expect(product.class).toBe('LIFESTYLE');
  });

  it('should map colorPrimary correctly', () => {
    const product = importRowToCoreProduct(sampleImportRow);
    expect(product.colorPrimary).toBe('Black');
  });

  it('should set sizeScale to MENS_US', () => {
    const product = importRowToCoreProduct(sampleImportRow);
    expect(product.sizeScale).toBe('MENS_US');
  });

  it('should parse MSRP as number', () => {
    const product = importRowToCoreProduct(sampleImportRow);
    expect(product.msrp).toBe(159.99);
  });

  it('should parse Retail Price as number', () => {
    const product = importRowToCoreProduct(sampleImportRow);
    expect(product.price).toBe(139.99);
  });

  it('should handle currency symbols in prices', () => {
    const priceRow: ImportRow = {
      ...sampleImportRow,
      raw: { ...sampleImportRow.raw, MSRP: '$199.99', 'Retail Price': '$179.99' },
    };
    const product = importRowToCoreProduct(priceRow);
    expect(product.msrp).toBe(199.99);
    expect(product.price).toBe(179.99);
  });

  it('should default to 0 for missing prices', () => {
    const noPriceRow: ImportRow = {
      ...sampleImportRow,
      raw: { ...sampleImportRow.raw, MSRP: '', 'Retail Price': '' },
    };
    const product = importRowToCoreProduct(noPriceRow);
    expect(product.msrp).toBe(0);
    expect(product.price).toBe(0);
  });

  it('should parse launch date to ISO format', () => {
    const product = importRowToCoreProduct(sampleImportRow);
    expect(product.launchDate).toContain('2024-12-15');
  });

  it('should set status to READY_FOR_EXPORT', () => {
    const product = importRowToCoreProduct(sampleImportRow);
    expect(product.status).toBe('READY_FOR_EXPORT');
  });

  it('should parse images from pipe-separated URLs', () => {
    const product = importRowToCoreProduct(sampleImportRow);
    expect(product.images).toHaveLength(2);
    expect(product.images[0].url).toBe('https://example.com/img1.jpg');
    expect(product.images[1].url).toBe('https://example.com/img2.jpg');
  });

  it('should mark primary image correctly', () => {
    const product = importRowToCoreProduct(sampleImportRow);
    const primaryImage = product.images.find((img) => img.isPrimary);
    expect(primaryImage).toBeDefined();
    expect(primaryImage?.url).toBe('https://example.com/img1.jpg');
  });

  it('should handle empty images', () => {
    const noImagesRow: ImportRow = {
      ...sampleImportRow,
      raw: { ...sampleImportRow.raw, Images: '', 'Primary Image': '' },
    };
    const product = importRowToCoreProduct(noImagesRow);
    expect(product.images).toHaveLength(0);
  });

  it('should include meta with import source', () => {
    const product = importRowToCoreProduct(sampleImportRow);
    expect(product.meta?.importSource).toBe('RETAILOPS_EXPORT');
    expect(product.meta?.retailOpsRowId).toBe('NK-AIR-MAX-270');
  });
});

// ============================================================================
// End-to-End Tests
// ============================================================================

describe('RetailOps Import - retailOpsCsvToCoreProducts', () => {
  it('should parse CSV and return CoreProducts', () => {
    const products = retailOpsCsvToCoreProducts(SIMPLE_EXPORT_CSV);
    expect(products).toHaveLength(2);
  });

  it('should filter out non-Nike/Jordan brands', () => {
    const products = retailOpsCsvToCoreProducts(ACTUAL_RETAILOPS_CSV);
    // ADIDAS row should be filtered out
    expect(products).toHaveLength(2);
    expect(products.every((p) => p.brand === 'NIKE' || p.brand === 'JORDAN')).toBe(true);
  });

  it('should produce products with correct brands', () => {
    const products = retailOpsCsvToCoreProducts(SIMPLE_EXPORT_CSV);
    expect(products[0].brand).toBe('NIKE');
    expect(products[1].brand).toBe('JORDAN');
  });
});

describe('RetailOps Import - retailOpsCsvToCoreProductsWithDetails', () => {
  it('should return skipped rows with reasons', () => {
    const result = retailOpsCsvToCoreProductsWithDetails(ACTUAL_RETAILOPS_CSV);
    expect(result.products).toHaveLength(2);
    expect(result.skipped).toHaveLength(1);
    expect(result.skipped[0].reason).toContain('ADIDAS');
  });

  it('should report total rows processed', () => {
    const result = retailOpsCsvToCoreProductsWithDetails(ACTUAL_RETAILOPS_CSV);
    expect(result.totalRows).toBe(3);
  });
});

// ============================================================================
// Round-Trip Tests
// ============================================================================

describe('RetailOps Import - Round-Trip (CSV → CoreProduct → CSV)', () => {
  /**
   * Create sample CoreProducts for round-trip testing
   */
  const sampleProducts: CoreProduct[] = [
    {
      id: 'NK-001',
      sku: 'NK-001',
      styleCode: 'DZ5485-410',
      brand: 'NIKE',
      gender: 'MEN',
      category: 'FOOTWEAR',
      class: 'RUNNING',
      colorPrimary: 'Black',
      sizeScale: 'MENS_US',
      msrp: 159.99,
      price: 139.99,
      launchDate: '2024-12-15T00:00:00.000Z',
      status: 'READY_FOR_EXPORT',
      images: [
        { url: 'https://example.com/nike1.jpg', isPrimary: true },
        { url: 'https://example.com/nike2.jpg' },
      ],
    },
    {
      id: 'JD-001',
      sku: 'JD-001',
      styleCode: 'DQ8426-100',
      brand: 'JORDAN',
      gender: 'MEN',
      category: 'FOOTWEAR',
      class: 'BASKETBALL',
      colorPrimary: 'White',
      sizeScale: 'MENS_US',
      msrp: 180.00,
      price: 180.00,
      launchDate: '2025-01-10T00:00:00.000Z',
      status: 'READY_FOR_EXPORT',
      images: [{ url: 'https://example.com/jordan.jpg', isPrimary: true }],
    },
  ];

  it('should export and re-import the same number of products', () => {
    // Export to CSV
    const csv = buildRetailOpsCsv(sampleProducts);

    // Re-import
    const imported = retailOpsCsvToCoreProducts(csv);

    expect(imported).toHaveLength(sampleProducts.length);
  });

  it('should preserve brand through round-trip', () => {
    const csv = buildRetailOpsCsv(sampleProducts);
    const imported = retailOpsCsvToCoreProducts(csv);

    expect(imported[0].brand).toBe('NIKE');
    expect(imported[1].brand).toBe('JORDAN');
  });

  it('should preserve gender through round-trip', () => {
    const csv = buildRetailOpsCsv(sampleProducts);
    const imported = retailOpsCsvToCoreProducts(csv);

    imported.forEach((product) => {
      expect(product.gender).toBe('MEN');
    });
  });

  it('should preserve category through round-trip', () => {
    const csv = buildRetailOpsCsv(sampleProducts);
    const imported = retailOpsCsvToCoreProducts(csv);

    imported.forEach((product) => {
      expect(product.category).toBe('FOOTWEAR');
    });
  });

  it('should preserve MSRP through round-trip', () => {
    const csv = buildRetailOpsCsv(sampleProducts);
    const imported = retailOpsCsvToCoreProducts(csv);

    expect(imported[0].msrp).toBe(159.99);
    expect(imported[1].msrp).toBe(180.00);
  });

  it('should preserve price through round-trip', () => {
    const csv = buildRetailOpsCsv(sampleProducts);
    const imported = retailOpsCsvToCoreProducts(csv);

    expect(imported[0].price).toBe(139.99);
    expect(imported[1].price).toBe(180.00);
  });

  it('should preserve color through round-trip', () => {
    const csv = buildRetailOpsCsv(sampleProducts);
    const imported = retailOpsCsvToCoreProducts(csv);

    expect(imported[0].colorPrimary).toBe('Black');
    expect(imported[1].colorPrimary).toBe('White');
  });

  it('should produce stable CSV header on export', () => {
    const csv = buildRetailOpsCsv(sampleProducts);
    const lines = csv.split('\n');

    expect(lines[0]).toBe(RETAILOPS_HEADER_ROW);
  });

  it('should handle multiple round-trips', () => {
    // First round-trip
    const csv1 = buildRetailOpsCsv(sampleProducts);
    const imported1 = retailOpsCsvToCoreProducts(csv1);

    // Second round-trip
    const csv2 = buildRetailOpsCsv(imported1);
    const imported2 = retailOpsCsvToCoreProducts(csv2);

    expect(imported2).toHaveLength(sampleProducts.length);
    expect(imported2[0].brand).toBe(imported1[0].brand);
    expect(imported2[0].msrp).toBe(imported1[0].msrp);
  });
});

// ============================================================================
// Edge Cases and Error Handling
// ============================================================================

describe('RetailOps Import - Edge Cases', () => {
  it('should handle rows with missing non-critical columns', () => {
    const csv = `SKU,Brand,Color\nNK-001,Nike,Black`;
    const products = retailOpsCsvToCoreProducts(csv);
    expect(products).toHaveLength(1);
    expect(products[0].msrp).toBe(0);
    expect(products[0].price).toBe(0);
  });

  it('should handle non-numeric MSRP gracefully', () => {
    const csv = `SKU,Brand,Color,MSRP\nNK-001,Nike,Black,N/A`;
    const products = retailOpsCsvToCoreProducts(csv);
    expect(products[0].msrp).toBe(0);
  });

  it('should handle empty images column', () => {
    const csv = `SKU,Brand,Color,Images\nNK-001,Nike,Black,`;
    const products = retailOpsCsvToCoreProducts(csv);
    expect(products[0].images).toHaveLength(0);
  });

  it('should handle case-insensitive brand matching', () => {
    const csv = `SKU,Brand,Color\nNK-001,NIKE,Black\nNK-002,nike,White\nNK-003,Nike,Red`;
    const products = retailOpsCsvToCoreProducts(csv);
    expect(products).toHaveLength(3);
    products.forEach((p) => expect(p.brand).toBe('NIKE'));
  });

  it('should handle brand with extra text', () => {
    const csv = `SKU,Brand,Color\nNK-001,Nike Athletics,Black`;
    const products = retailOpsCsvToCoreProducts(csv);
    expect(products[0].brand).toBe('NIKE');
  });

  it('should handle various date formats', () => {
    const csv = `SKU,Brand,Color,Launch Date\nNK-001,Nike,Black,2024-12-15\nNK-002,Nike,White,12/15/2024`;
    const products = retailOpsCsvToCoreProducts(csv);
    products.forEach((p) => {
      expect(p.launchDate).toMatch(/^\d{4}-\d{2}-\d{2}/);
    });
  });

  it('should skip entirely empty rows', () => {
    const csv = `SKU,Brand,Color\nNK-001,Nike,Black\n\n\nNK-002,Nike,White`;
    const rows = parseRetailOpsCsv(csv);
    expect(rows).toHaveLength(2);
  });

  it('should handle very large CSV', () => {
    const header = 'SKU,Brand,Color,MSRP';
    const rows = Array.from({ length: 100 }, (_, i) => `NK-${i},Nike,Black,${99.99 + i}`);
    const csv = [header, ...rows].join('\n');

    const products = retailOpsCsvToCoreProducts(csv);
    expect(products).toHaveLength(100);
  });
});

// ============================================================================
// Helper Function Tests
// ============================================================================

describe('RetailOps Import - Helper Functions', () => {
  it('parsedRowsToImportRows should convert all rows', () => {
    const parsed = parseRetailOpsCsv(SIMPLE_EXPORT_CSV);
    const importRows = parsedRowsToImportRows(parsed);
    expect(importRows).toHaveLength(2);
    importRows.forEach((row) => {
      expect(row.source).toBe('RETAILOPS_EXPORT');
    });
  });

  it('importRowsToCoreProducts should filter unsupported brands', () => {
    const importRows: ImportRow[] = [
      {
        source: 'RETAILOPS_EXPORT',
        rowId: '1',
        originalRowNumber: 1,
        styleCode: 'NK-001',
        brand: 'Nike',
        color: 'Black',
        size: '10',
        upc: 'NK-001',
        raw: {},
      },
      {
        source: 'RETAILOPS_EXPORT',
        rowId: '2',
        originalRowNumber: 2,
        styleCode: 'AD-001',
        brand: 'Adidas',
        color: 'White',
        size: '10',
        upc: 'AD-001',
        raw: {},
      },
    ];

    const products = importRowsToCoreProducts(importRows);
    expect(products).toHaveLength(1);
    expect(products[0].brand).toBe('NIKE');
  });
});
