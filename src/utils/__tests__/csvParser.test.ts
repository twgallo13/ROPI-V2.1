/**
 * Unit tests for CSV Parser mapping functionality
 */

import { parseCSV, getDelimiterName } from '../csvParser';

describe('CSV Parser - Header Mapping', () => {
  test('SKU maps to sku field, not product_id', () => {
    const csv = 'SKU,Name\n12345,Test Product';
    const result = parseCSV(csv);
    
    expect(result.mappings).toHaveLength(2);
    expect(result.mappings[0].csvHeader).toBe('SKU');
    expect(result.mappings[0].targetField).toBe('sku');
    expect(result.mappings[0].confidence).toBe('exact');
  });

  test('RICS Category maps to rics_category', () => {
    const csv = 'RICS Category,Name\nFootwear,Test Product';
    const result = parseCSV(csv);
    
    expect(result.mappings[0].csvHeader).toBe('RICS Category');
    expect(result.mappings[0].targetField).toBe('rics_category');
  });

  test('RICS Long Description maps to rics_long_desc', () => {
    const csv = 'rics_long_description,Name\nLong description text,Test Product';
    const result = parseCSV(csv);
    
    expect(result.mappings[0].csvHeader).toBe('rics_long_description');
    expect(result.mappings[0].targetField).toBe('rics_long_desc');
  });

  test('Height/Width/Length/Weight map correctly', () => {
    const csv = 'Height,Width,Length,Weight\n10,5,8,2.5';
    const result = parseCSV(csv);
    
    expect(result.mappings[0].targetField).toBe('height');
    expect(result.mappings[1].targetField).toBe('width');
    expect(result.mappings[2].targetField).toBe('length');
    expect(result.mappings[3].targetField).toBe('weight');
    
    // Check that values are coerced to numbers
    expect(result.rows[0].data.height).toBe(10);
    expect(result.rows[0].data.width).toBe(5);
    expect(result.rows[0].data.length).toBe(8);
    expect(result.rows[0].data.weight).toBe(2.5);
  });

  test('Short dimension codes (H, W, L) map correctly', () => {
    const csv = 'H,W,L,WT\n10,5,8,2.5';
    const result = parseCSV(csv);
    
    expect(result.mappings[0].targetField).toBe('height');
    expect(result.mappings[1].targetField).toBe('width');
    expect(result.mappings[2].targetField).toBe('length');
    expect(result.mappings[3].targetField).toBe('weight');
  });

  test('DEFAULT_IGNORE headers are marked as unmapped', () => {
    const csv = 'Status,Last Received,Store 1,SKU\nActive,2024-01-01,100,12345';
    const result = parseCSV(csv);
    
    // Status should be ignored
    expect(result.mappings[0].csvHeader).toBe('Status');
    expect(result.mappings[0].targetField).toBeNull();
    expect(result.mappings[0].confidence).toBe('unmapped');
    
    // Last Received should be ignored
    expect(result.mappings[1].csvHeader).toBe('Last Received');
    expect(result.mappings[1].targetField).toBeNull();
    expect(result.mappings[1].confidence).toBe('unmapped');
    
    // Store 1 should be ignored
    expect(result.mappings[2].csvHeader).toBe('Store 1');
    expect(result.mappings[2].targetField).toBeNull();
    expect(result.mappings[2].confidence).toBe('unmapped');
    
    // SKU should map correctly
    expect(result.mappings[3].csvHeader).toBe('SKU');
    expect(result.mappings[3].targetField).toBe('sku');
    expect(result.mappings[3].confidence).toBe('exact');
  });

  test('Duplicate headers are auto-ignored (only first is mapped)', () => {
    const csv = 'SKU,Name,SKU\n12345,Test Product,67890';
    const result = parseCSV(csv);
    
    expect(result.mappings).toHaveLength(3);
    
    // First SKU should map
    expect(result.mappings[0].csvHeader).toBe('SKU');
    expect(result.mappings[0].targetField).toBe('sku');
    expect(result.mappings[0].confidence).toBe('exact');
    
    // Second SKU should be ignored as duplicate
    expect(result.mappings[2].csvHeader).toBe('SKU');
    expect(result.mappings[2].targetField).toBeNull();
    expect(result.mappings[2].confidence).toBe('unmapped');
  });

  test('Keywords/tags map correctly', () => {
    const csv = 'keywords,Name\nrunning shoes athletic,Test Product';
    const result = parseCSV(csv);
    
    expect(result.mappings[0].csvHeader).toBe('keywords');
    expect(result.mappings[0].targetField).toBe('keywords');
  });

  test('Website/site maps to website field', () => {
    const csv = 'site,Name\nwww.example.com,Test Product';
    const result = parseCSV(csv);
    
    expect(result.mappings[0].csvHeader).toBe('site');
    expect(result.mappings[0].targetField).toBe('website');
  });

  test('Sports Team maps correctly', () => {
    const csv = 'Team,Name\nLakers,Test Jersey';
    const result = parseCSV(csv);
    
    expect(result.mappings[0].csvHeader).toBe('Team');
    expect(result.mappings[0].targetField).toBe('sports_team');
  });

  test('Priority matching: exact match beats fuzzy match', () => {
    const csv = 'sku,Name\n12345,Test Product';
    const result = parseCSV(csv);
    
    // 'sku' should match exactly to 'sku', not fuzzily to something else
    expect(result.mappings[0].targetField).toBe('sku');
    expect(result.mappings[0].confidence).toBe('exact');
  });

  test('Word-boundary matching works correctly', () => {
    const csv = 'Product SKU,Product Name\n12345,Test';
    const result = parseCSV(csv);
    
    // 'Product SKU' contains 'sku' as a word boundary
    expect(result.mappings[0].targetField).toBe('sku');
    expect(result.mappings[0].confidence).toBe('synonym');
  });
});

describe('CSV Parser - Delimiter Detection', () => {
  test('detects comma delimiter', () => {
    const csv = 'MPN,SKU,Name,Price\n123,ABC,Product,10.00';
    const result = parseCSV(csv);
    expect(result.delimiter).toBe(',');
  });

  test('detects tab delimiter', () => {
    const csv = 'MPN\tSKU\tName\tPrice\n123\tABC\tProduct\t10.00';
    const result = parseCSV(csv);
    expect(result.delimiter).toBe('\t');
  });

  test('detects semicolon delimiter', () => {
    const csv = 'MPN;SKU;Name;Price\n123;ABC;Product;10.00';
    const result = parseCSV(csv);
    expect(result.delimiter).toBe(';');
  });

  test('detects pipe delimiter', () => {
    const csv = 'MPN|SKU|Name|Price\n123|ABC|Product|10.00';
    const result = parseCSV(csv);
    expect(result.delimiter).toBe('|');
  });

  test('defaults to comma when no delimiters found', () => {
    const csv = 'SingleColumn\nValue1\nValue2';
    const result = parseCSV(csv);
    expect(result.delimiter).toBe(',');
  });

  test('ignores delimiters inside quotes', () => {
    const csv = '"Product,Name",SKU,Price\n"Test,Product",ABC,10.00';
    const result = parseCSV(csv);
    expect(result.delimiter).toBe(',');
    expect(result.headers[0]).toBe('Product,Name');
  });

  test('chooses delimiter with highest count', () => {
    // More commas than semicolons
    const csv = 'A,B,C;D\n1,2,3;4';
    const result = parseCSV(csv);
    expect(result.delimiter).toBe(',');
  });

  test('parses tab-delimited lines correctly', () => {
    const csv = 'MPN\tSKU\tName\n123\tABC\tTest Product';
    const result = parseCSV(csv);
    expect(result.headers).toEqual(['MPN', 'SKU', 'Name']);
    expect(result.rows[0].data.mpn).toBe('123');
    expect(result.rows[0].data.sku).toBe('ABC');
  });

  test('parses semicolon-delimited lines correctly', () => {
    const csv = 'MPN;SKU;Name\n456;DEF;Another Product';
    const result = parseCSV(csv);
    expect(result.headers).toEqual(['MPN', 'SKU', 'Name']);
    expect(result.rows[0].data.mpn).toBe('456');
    expect(result.rows[0].data.sku).toBe('DEF');
  });

  test('parses pipe-delimited lines correctly', () => {
    const csv = 'MPN|SKU|Name\n789|GHI|Third Product';
    const result = parseCSV(csv);
    expect(result.headers).toEqual(['MPN', 'SKU', 'Name']);
    expect(result.rows[0].data.mpn).toBe('789');
    expect(result.rows[0].data.sku).toBe('GHI');
  });

  test('handles quoted values with tabs', () => {
    const csv = 'MPN\tSKU\tName\n123\tABC\t"Product with\ttab"';
    const result = parseCSV(csv);
    expect(result.headers).toEqual(['MPN', 'SKU', 'Name']);
    expect(result.rows[0].data.name).toBe('Product with\ttab');
  });

  test('handles quoted values with semicolons', () => {
    const csv = 'MPN;SKU;Name\n123;ABC;"Product; with semicolon"';
    const result = parseCSV(csv);
    expect(result.headers).toEqual(['MPN', 'SKU', 'Name']);
    expect(result.rows[0].data.name).toBe('Product; with semicolon');
  });
});

describe('getDelimiterName', () => {
  test('returns friendly names for delimiters', () => {
    expect(getDelimiterName(',')).toBe('comma');
    expect(getDelimiterName('\t')).toBe('tab');
    expect(getDelimiterName(';')).toBe('semicolon');
    expect(getDelimiterName('|')).toBe('pipe');
  });

  test('defaults to comma for unknown delimiters', () => {
    expect(getDelimiterName('~')).toBe('comma');
  });
});
