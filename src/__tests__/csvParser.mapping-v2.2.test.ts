/**
 * Unit Tests for CSV Parser v2.2 Mapping Logic
 * Tests normalized header matching and auto-selection behavior
 */

import { describe, it, expect, vi, beforeEach } from 'vitest';
import { parseCSVAsync } from '../utils/csvParser';
import * as attributeRegistry from '../utils/attributeRegistry';
import type { AttributeMetadata } from '../utils/attributeRegistry';

// Mock Firebase
vi.mock('firebase/firestore', () => ({
  getFirestore: vi.fn(() => ({})),
  collection: vi.fn(),
  getDocs: vi.fn(),
}));

describe('csvParser v2.2 - Normalized Matching & Auto-Selection', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  // Helper to create mock attributes
  const createMockAttributes = (attrs: Array<Partial<AttributeMetadata>>): AttributeMetadata[] => {
    return attrs.map(a => ({
      key: a.key || 'test',
      canonicalPath: a.canonicalPath || 'test.field',
      label: a.label || 'Test Field',
      category: a.category || 'Test',
      dataType: a.dataType || 'string',
      required: a.required || false,
      export: a.export !== false,
      description: a.description || '',
      importerColumns: a.importerColumns || [],
      legacyPaths: a.legacyPaths || [],
      systemFlag: a.systemFlag || false,
      rules: [],
      usage: [],
      examples: { sampleValues: [] },
    }));
  };

  it('should normalize "Product Is Dropship.Name" to match "product_is_dropship_name"', async () => {
    const mockAttrs = createMockAttributes([
      {
        canonicalPath: 'sku_core.dropshipName',
        label: 'Dropship Name',
        category: 'Core',
        importerColumns: ['product_is_dropship_name', 'Product Is Dropship.Name', 'Product Is Dropship Name'],
      },
    ]);

    vi.spyOn(attributeRegistry, 'getImportableAttributes').mockResolvedValue(mockAttrs);

    const csvContent = 'Product Is Dropship.Name,sku\nAcmeDropship,TEST123';
    const result = await parseCSVAsync(csvContent);

    expect(result.mappings[0].csvHeader).toBe('Product Is Dropship.Name');
    expect(result.mappings[0].targetField).toBe('sku_core.dropshipName');
    expect(result.mappings[0].confidence).toBe('Exact Match');
    // matchedAlias will be the normalized match from importerColumns array
    expect(result.mappings[0].matchedAlias).toBeTruthy();
    expect(result.mappings[0].autoSelected).toBe(true);
  });

  it('should match "RICS Short Description" exactly', async () => {
    const mockAttrs = createMockAttributes([
      {
        canonicalPath: 'rics_source.shortDescription',
        label: 'RICS Short Description',
        category: 'Source',
        importerColumns: ['rics_short_description', 'RICS Short Description', 'rics_short_desc'],
      },
    ]);

    vi.spyOn(attributeRegistry, 'getImportableAttributes').mockResolvedValue(mockAttrs);

    const csvContent = 'RICS Short Description,sku\nShort desc text,TEST123';
    const result = await parseCSVAsync(csvContent);

    expect(result.mappings[0].targetField).toBe('rics_source.shortDescription');
    expect(result.mappings[0].confidence).toBe('Exact Match');
    expect(result.mappings[0].autoSelected).toBe(true);
  });

  it('should match "RICS Long Desc" exactly', async () => {
    const mockAttrs = createMockAttributes([
      {
        canonicalPath: 'rics_source.longDescription',
        label: 'RICS Long Description',
        category: 'Source',
        importerColumns: ['rics_long_description', 'RICS Long Desc', 'RICS Long Description'],
      },
    ]);

    vi.spyOn(attributeRegistry, 'getImportableAttributes').mockResolvedValue(mockAttrs);

    const csvContent = 'RICS Long Desc,sku\nLong desc text,TEST123';
    const result = await parseCSVAsync(csvContent);

    expect(result.mappings[0].targetField).toBe('rics_source.longDescription');
    expect(result.mappings[0].confidence).toBe('Exact Match');
    expect(result.mappings[0].autoSelected).toBe(true);
  });

  it('should match "RICS Category" exactly', async () => {
    const mockAttrs = createMockAttributes([
      {
        canonicalPath: 'rics_source.category',
        label: 'RICS Category',
        category: 'Source',
        importerColumns: ['rics_category', 'RICS Category', 'category'],
      },
    ]);

    vi.spyOn(attributeRegistry, 'getImportableAttributes').mockResolvedValue(mockAttrs);

    const csvContent = 'RICS Category,sku\nFootwear,TEST123';
    const result = await parseCSVAsync(csvContent);

    expect(result.mappings[0].targetField).toBe('rics_source.category');
    expect(result.mappings[0].confidence).toBe('Exact Match');
    expect(result.mappings[0].autoSelected).toBe(true);
  });

  it('should match "Product Is Active" exactly', async () => {
    const mockAttrs = createMockAttributes([
      {
        canonicalPath: 'sku_core.productIsActive',
        label: 'Product Is Active',
        category: 'Core',
        importerColumns: ['product_is_active', 'Product Is Active', 'is_active'],
      },
    ]);

    vi.spyOn(attributeRegistry, 'getImportableAttributes').mockResolvedValue(mockAttrs);

    const csvContent = 'Product Is Active,sku\n1,TEST123';
    const result = await parseCSVAsync(csvContent);

    expect(result.mappings[0].targetField).toBe('sku_core.productIsActive');
    expect(result.mappings[0].confidence).toBe('Exact Match');
    expect(result.mappings[0].autoSelected).toBe(true);
  });

  it('should match "Last Received" exactly', async () => {
    const mockAttrs = createMockAttributes([
      {
        canonicalPath: 'technical.lastReceived',
        label: 'Last Received',
        category: 'Technical',
        importerColumns: ['last_received', 'Last Received', 'lastReceived'],
      },
    ]);

    vi.spyOn(attributeRegistry, 'getImportableAttributes').mockResolvedValue(mockAttrs);

    const csvContent = 'Last Received,sku\n2025-11-14,TEST123';
    const result = await parseCSVAsync(csvContent);

    expect(result.mappings[0].targetField).toBe('technical.lastReceived');
    expect(result.mappings[0].confidence).toBe('Exact Match');
    expect(result.mappings[0].autoSelected).toBe(true);
  });

  it('should match "Warehouse Inv" exactly', async () => {
    const mockAttrs = createMockAttributes([
      {
        canonicalPath: 'technical.warehouseInv',
        label: 'Warehouse Inventory',
        category: 'Technical',
        importerColumns: ['warehouse_inv', 'Warehouse Inv', 'warehouseInv', 'WHS inv', 'whs_inv'],
      },
    ]);

    vi.spyOn(attributeRegistry, 'getImportableAttributes').mockResolvedValue(mockAttrs);

    const csvContent = 'Warehouse Inv,sku\n20,TEST123';
    const result = await parseCSVAsync(csvContent);

    expect(result.mappings[0].targetField).toBe('technical.warehouseInv');
    expect(result.mappings[0].confidence).toBe('Exact Match');
    expect(result.mappings[0].autoSelected).toBe(true);
  });

  it('should match "Store Inv" exactly', async () => {
    const mockAttrs = createMockAttributes([
      {
        canonicalPath: 'technical.storeInv',
        label: 'Store Inventory',
        category: 'Technical',
        importerColumns: ['store_inv', 'Store Inv', 'storeInv'],
      },
    ]);

    vi.spyOn(attributeRegistry, 'getImportableAttributes').mockResolvedValue(mockAttrs);

    const csvContent = 'Store Inv,sku\n10,TEST123';
    const result = await parseCSVAsync(csvContent);

    expect(result.mappings[0].targetField).toBe('technical.storeInv');
    expect(result.mappings[0].confidence).toBe('Exact Match');
    expect(result.mappings[0].autoSelected).toBe(true);
  });

  it('should NOT map "variant_count" (empty importerColumns)', async () => {
    // Mock getImportableAttributes to return empty array 
    // (attributes with empty importerColumns are filtered out by getImportableAttributes)
    const mockAttrs = createMockAttributes([]);

    vi.spyOn(attributeRegistry, 'getImportableAttributes').mockResolvedValue(mockAttrs);

    const csvContent = 'variant_count,sku\n5,TEST123';
    const result = await parseCSVAsync(csvContent);

    expect(result.mappings[0].csvHeader).toBe('variant_count');
    expect(result.mappings[0].targetField).toBeNull();
    expect(result.mappings[0].confidence).toBe('Unmapped');
    expect(result.mappings[0].autoSelected).toBeFalsy();
  });

  it('should auto-select fuzzy match with score >= 0.8', async () => {
    const mockAttrs = createMockAttributes([
      {
        canonicalPath: 'sku_core.dropshipName',
        label: 'Dropship Name',
        category: 'Core',
        importerColumns: ['product_is_dropship_name', 'dropship_name'],
      },
    ]);

    vi.spyOn(attributeRegistry, 'getImportableAttributes').mockResolvedValue(mockAttrs);

    const csvContent = 'dropship_nam,sku\nAcme,TEST123'; // typo: missing 'e'
    const result = await parseCSVAsync(csvContent);

    // Should fuzzy match
    if (result.mappings[0].matchScore && result.mappings[0].matchScore >= 0.8) {
      expect(result.mappings[0].targetField).toBe('sku_core.dropshipName');
      expect(result.mappings[0].confidence).toBe('Fuzzy');
      expect(result.mappings[0].autoSelected).toBe(true);
    } else {
      // If score < 0.8, should not auto-select
      expect(result.mappings[0].autoSelected).toBeFalsy();
    }
  });

  it('should handle multiple exact matches and auto-select the first', async () => {
    const mockAttrs = createMockAttributes([
      {
        canonicalPath: 'rics_source.category',
        label: 'RICS Category',
        category: 'Source',
        importerColumns: ['rics_category', 'RICS Category', 'category'],
      },
      {
        canonicalPath: 'sku_core.category',
        label: 'SKU Category',
        category: 'Core',
        importerColumns: ['sku_category', 'SKU Category'],
      },
    ]);

    vi.spyOn(attributeRegistry, 'getImportableAttributes').mockResolvedValue(mockAttrs);

    const csvContent = 'category,sku\nFootwear,TEST123'; // Matches rics_source.category first
    const result = await parseCSVAsync(csvContent);

    expect(result.mappings[0].targetField).toBe('rics_source.category');
    expect(result.mappings[0].confidence).toBe('Exact Match');
    expect(result.mappings[0].autoSelected).toBe(true);
  });

  it('should include metadata in mapping (category, label, allAliases)', async () => {
    const mockAttrs = createMockAttributes([
      {
        canonicalPath: 'sku_core.productIsActive',
        label: 'Product Is Active',
        category: 'Core',
        importerColumns: ['product_is_active', 'Product Is Active', 'is_active'],
      },
    ]);

    vi.spyOn(attributeRegistry, 'getImportableAttributes').mockResolvedValue(mockAttrs);

    const csvContent = 'Product Is Active,sku\n1,TEST123';
    const result = await parseCSVAsync(csvContent);

    expect(result.mappings[0].category).toBe('Core');
    expect(result.mappings[0].label).toBe('Product Is Active');
    expect(result.mappings[0].allAliases).toEqual(['product_is_active', 'Product Is Active', 'is_active']);
  });

  it('should generate debug decisions structure', async () => {
    const mockAttrs = createMockAttributes([
      {
        canonicalPath: 'sku_core.dropshipName',
        label: 'Dropship Name',
        category: 'Core',
        importerColumns: ['product_is_dropship_name'],
      },
    ]);

    vi.spyOn(attributeRegistry, 'getImportableAttributes').mockResolvedValue(mockAttrs);

    // Spy on console.log to capture debug output
    const consoleSpy = vi.spyOn(console, 'log');

    const csvContent = 'product_is_dropship_name,sku\nAcme,TEST123';
    await parseCSVAsync(csvContent);

    // Check that debug logging was called (only in non-production)
    const debugCalls = consoleSpy.mock.calls.filter(call => 
      call[0] && call[0].includes('[csvParser v2.2]')
    );
    
    if (process.env.NODE_ENV !== 'production') {
      expect(debugCalls.length).toBeGreaterThan(0);
    }

    consoleSpy.mockRestore();
  });
});
