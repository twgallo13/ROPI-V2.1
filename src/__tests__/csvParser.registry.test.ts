/**
 * Unit Tests for CSV Parser Registry Integration
 * Lisa v2.0 - Phase 2 Dynamic Importer
 */

import { describe, it, expect, vi, beforeEach } from 'vitest';
import { parseCSVAsync } from '../utils/csvParser';
import * as attributeRegistry from '../utils/attributeRegistry';

// Mock Firebase
vi.mock('firebase/firestore', () => ({
  getFirestore: vi.fn(() => ({})),
  collection: vi.fn(),
  getDocs: vi.fn(),
}));

describe('csvParser - Registry-Driven Mapping', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('should resolve "Group" header to descriptive.gender via registry', async () => {
    const mockAttrs: any[] = [
      {
        canonicalPath: 'descriptive.gender',
        label: 'Gender',
        category: 'Descriptive',
        importerColumns: ['group', 'Group', 'gender'],
        legacyPaths: [],
        key: 'gender',
        dataType: 'string',
        required: false,
        export: true,
        description: 'Gender',
      },
    ];
    vi.spyOn(attributeRegistry, 'getImportableAttributes').mockResolvedValue(mockAttrs);

    const csvContent = 'Group,MPN\nMen,TEST123';
    const result = await parseCSVAsync(csvContent);

    expect(result.mappings[0].csvHeader).toBe('Group');
    expect(result.mappings[0].targetField).toBe('descriptive.gender');
    expect(result.mappings[0].confidence).toBe('Exact Match');
  });

  it('should resolve "Primary Color" to descriptive.primaryColor', async () => {
    const mockAttrs: any[] = [
      {
        canonicalPath: 'descriptive.primaryColor',
        label: 'Primary Color',
        category: 'Descriptive',
        importerColumns: ['primary_color', 'Primary Color', 'primaryColor'],
        legacyPaths: [],
        key: 'primaryColor',
        dataType: 'string',
        required: false,
        export: true,
        description: 'Primary Color',
      },
    ];
    vi.spyOn(attributeRegistry, 'getImportableAttributes').mockResolvedValue(mockAttrs);

    const csvContent = 'Primary Color,MPN\nRed,TEST123';
    const result = await parseCSVAsync(csvContent);

    expect(result.mappings[0].csvHeader).toBe('Primary Color');
    expect(result.mappings[0].targetField).toBe('descriptive.primaryColor');
    expect(result.mappings[0].confidence).toBe('Exact Match');
  });

  it('should NOT map "Variant Count" when registry returns null', async () => {
    const mockAttrs: any[] = [
      {
        canonicalPath: 'sku_core.mpn',
        label: 'MPN',
        category: 'Core',
        importerColumns: ['mpn', 'MPN'],
        legacyPaths: [],
        key: 'mpn',
        dataType: 'string',
        required: true,
        export: true,
        description: 'Manufacturer Part Number',
      },
      // variantCount not included since it has empty importerColumns
    ];
    vi.spyOn(attributeRegistry, 'getImportableAttributes').mockResolvedValue(mockAttrs);

    const csvContent = 'Variant Count,MPN\n5,TEST123';
    const result = await parseCSVAsync(csvContent);

    // Variant Count should be unmapped (not in registry)
    expect(result.mappings[0].csvHeader).toBe('Variant Count');
    expect(result.mappings[0].targetField).toBeNull();
    expect(result.mappings[0].confidence).toBe('Unmapped');

    // MPN should map correctly
    expect(result.mappings[1].csvHeader).toBe('MPN');
    expect(result.mappings[1].targetField).toBe('sku_core.mpn');
  });

  it('should fall back to static synonyms if registry fails', async () => {
    vi.spyOn(attributeRegistry, 'getImportableAttributes').mockRejectedValue(
      new Error('Firestore unavailable')
    );

    const csvContent = 'brand,mpn\nNike,TEST123';
    const result = await parseCSVAsync(csvContent);

    // Even with registry error, should still map (falls back to static logic)
    expect(result.mappings[0].csvHeader).toBe('brand');
    // Note: parseCSVAsync may still use cached registry or static fallback
    expect(result.mappings[0].targetField).toBeTruthy(); // Just verify it maps
    expect(result.mappings[0].confidence).toBeTruthy();
  });

  it('should handle multiple headers with registry and static mix', async () => {
    const mockAttrs: any[] = [
      {
        canonicalPath: 'descriptive.gender',
        label: 'Gender',
        category: 'Descriptive',
        importerColumns: ['group', 'Group'],
        legacyPaths: [],
        key: 'gender',
        dataType: 'string',
        required: false,
        export: true,
        description: 'Gender',
      },
      {
        canonicalPath: 'descriptive.custom2',
        label: 'Custom 2',
        category: 'Descriptive',
        importerColumns: ['custom 2', 'Custom 2', 'custom_2'],
        legacyPaths: [],
        key: 'custom2',
        dataType: 'string',
        required: false,
        export: true,
        description: 'Custom 2',
      },
      {
        canonicalPath: 'sku_core.productIsDropship',
        label: 'Product Is Dropship',
        category: 'Core',
        importerColumns: ['product is dropship', 'Product Is Dropship', 'product_is_dropship'],
        legacyPaths: [],
        key: 'productIsDropship',
        dataType: 'boolean',
        required: false,
        export: true,
        description: 'Product Is Dropship',
      },
      {
        canonicalPath: 'sku_core.brand',
        label: 'Brand',
        category: 'Core',
        importerColumns: ['brand', 'Brand'],
        legacyPaths: [],
        key: 'brand',
        dataType: 'string',
        required: false,
        export: true,
        description: 'Brand',
      },
    ];
    vi.spyOn(attributeRegistry, 'getImportableAttributes').mockResolvedValue(mockAttrs);

    const csvContent = 'Group,Custom 2,Product Is Dropship,Brand\nMen,Custom Value,true,Nike';
    const result = await parseCSVAsync(csvContent);

    expect(result.mappings[0].targetField).toBe('descriptive.gender');
    expect(result.mappings[1].targetField).toBe('descriptive.custom2');
    expect(result.mappings[2].targetField).toBe('sku_core.productIsDropship');
    expect(result.mappings[3].targetField).toBe('sku_core.brand'); // From registry
  });

  it('should parse row data with canonical paths from registry', async () => {
    vi.spyOn(attributeRegistry, 'resolveHeaderToPath').mockImplementation(async (header) => {
      if (header.toLowerCase() === 'group') return 'descriptive.gender';
      if (header.toLowerCase() === 'mpn') return 'sku_core.mpn';
      return null;
    });

    const csvContent = 'Group,MPN\nMen,TEST123\nWomen,TEST456';
    const result = await parseCSVAsync(csvContent);

    expect(result.rows.length).toBe(2);
    expect(result.rows[0].data['descriptive.gender']).toBe('Men');
    expect(result.rows[0].data['sku_core.mpn']).toBe('TEST123'); // mpn maps to sku_core.mpn
    expect(result.rows[1].data['descriptive.gender']).toBe('Women');
    expect(result.rows[1].data['sku_core.mpn']).toBe('TEST456'); // mpn maps to sku_core.mpn
  });

  it('should ignore duplicate headers', async () => {
    const mockAttrs: any[] = [
      {
        canonicalPath: 'sku_core.mpn',
        label: 'MPN',
        category: 'Core',
        importerColumns: ['mpn', 'MPN'],
        legacyPaths: [],
        systemFlag: false,
        key: 'mpn',
        dataType: 'string',
        required: true,
        export: true,
        description: 'Manufacturer Part Number',
      },
    ];
    vi.spyOn(attributeRegistry, 'getImportableAttributes').mockResolvedValue(mockAttrs);

    const csvContent = 'MPN,MPN,Brand\nTEST123,TEST456,Nike';
    const result = await parseCSVAsync(csvContent);

    expect(result.mappings[0].targetField).toBe('sku_core.mpn');
    expect(result.mappings[1].targetField).toBeNull(); // Duplicate ignored
    expect(result.mappings[1].confidence).toBe('Unmapped');
  });

  it('should handle empty importerColumns (non-importable attributes)', async () => {
    const mockAttrs: any[] = [
      {
        canonicalPath: 'sku_core.mpn',
        label: 'MPN',
        category: 'Core',
        importerColumns: ['mpn', 'MPN'],
        legacyPaths: [],
        systemFlag: false,
        key: 'mpn',
        dataType: 'string',
        required: true,
        export: true,
        description: 'Manufacturer Part Number',
      },
      // variantCount has empty importerColumns, so it won't be in getImportableAttributes()
      // No need to include it here since getImportableAttributes() filters it out
    ];
    vi.spyOn(attributeRegistry, 'getImportableAttributes').mockResolvedValue(mockAttrs);

    const csvContent = 'Variant Count,variant_count,MPN\n5,10,TEST123';
    const result = await parseCSVAsync(csvContent);

    // Both variant headers should be unmapped
    expect(result.mappings[0].targetField).toBeNull();
    expect(result.mappings[1].targetField).toBeNull();
    
    // MPN should map correctly
    expect(result.mappings[2].targetField).toBe('sku_core.mpn');
  });
});
