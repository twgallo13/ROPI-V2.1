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
    vi.spyOn(attributeRegistry, 'resolveHeaderToPath').mockImplementation(async (header) => {
      if (header.toLowerCase() === 'group') return 'descriptive.gender';
      return null;
    });

    const csvContent = 'Group,MPN\nMen,TEST123';
    const result = await parseCSVAsync(csvContent);

    expect(result.mappings[0].csvHeader).toBe('Group');
    expect(result.mappings[0].targetField).toBe('descriptive.gender');
    expect(result.mappings[0].confidence).toBe('exact');
  });

  it('should resolve "Primary Color" to descriptive.primaryColor', async () => {
    vi.spyOn(attributeRegistry, 'resolveHeaderToPath').mockImplementation(async (header) => {
      if (header.toLowerCase() === 'primary color') return 'descriptive.primaryColor';
      return null;
    });

    const csvContent = 'Primary Color,MPN\nRed,TEST123';
    const result = await parseCSVAsync(csvContent);

    expect(result.mappings[0].csvHeader).toBe('Primary Color');
    expect(result.mappings[0].targetField).toBe('descriptive.primaryColor');
    expect(result.mappings[0].confidence).toBe('exact');
  });

  it('should NOT map "Variant Count" when registry returns null', async () => {
    vi.spyOn(attributeRegistry, 'resolveHeaderToPath').mockImplementation(async (header) => {
      // variantCount has empty importerColumns, so registry returns null
      if (header.toLowerCase() === 'variant count') return null;
      if (header.toLowerCase() === 'mpn') return 'sku_core.mpn';
      return null;
    });

    const csvContent = 'Variant Count,MPN\n5,TEST123';
    const result = await parseCSVAsync(csvContent);

    // Variant Count should be unmapped (registry returned null)
    expect(result.mappings[0].csvHeader).toBe('Variant Count');
    expect(result.mappings[0].targetField).toBeNull();
    expect(result.mappings[0].confidence).toBe('unmapped');

    // MPN should map correctly
    expect(result.mappings[1].csvHeader).toBe('MPN');
    expect(result.mappings[1].targetField).toBe('sku_core.mpn');
  });

  it('should fall back to static synonyms if registry fails', async () => {
    vi.spyOn(attributeRegistry, 'resolveHeaderToPath').mockRejectedValue(
      new Error('Firestore unavailable')
    );

    const csvContent = 'brand,mpn\nNike,TEST123';
    const result = await parseCSVAsync(csvContent);

    // Should still map using static synonyms
    expect(result.mappings[0].csvHeader).toBe('brand');
    expect(result.mappings[0].targetField).toBe('brand'); // Static synonym fallback
    expect(result.mappings[0].confidence).toBe('exact');
  });

  it('should handle multiple headers with registry and static mix', async () => {
    vi.spyOn(attributeRegistry, 'resolveHeaderToPath').mockImplementation(async (header) => {
      const map: Record<string, string> = {
        'group': 'descriptive.gender',
        'custom 2': 'descriptive.custom2',
        'product is dropship': 'sku_core.productIsDropship',
      };
      return map[header.toLowerCase()] || null;
    });

    const csvContent = 'Group,Custom 2,Product Is Dropship,Brand\nMen,Custom Value,true,Nike';
    const result = await parseCSVAsync(csvContent);

    expect(result.mappings[0].targetField).toBe('descriptive.gender');
    expect(result.mappings[1].targetField).toBe('descriptive.custom2');
    expect(result.mappings[2].targetField).toBe('sku_core.productIsDropship');
    expect(result.mappings[3].targetField).toBe('brand'); // Static fallback
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
    expect(result.rows[0].data['sku_core.mpn']).toBe('TEST123');
    expect(result.rows[1].data['descriptive.gender']).toBe('Women');
    expect(result.rows[1].data['sku_core.mpn']).toBe('TEST456');
  });

  it('should ignore duplicate headers', async () => {
    vi.spyOn(attributeRegistry, 'resolveHeaderToPath').mockImplementation(async (header) => {
      if (header.toLowerCase() === 'mpn') return 'sku_core.mpn';
      return null;
    });

    const csvContent = 'MPN,MPN,Brand\nTEST123,TEST456,Nike';
    const result = await parseCSVAsync(csvContent);

    expect(result.mappings[0].targetField).toBe('sku_core.mpn');
    expect(result.mappings[1].targetField).toBeNull(); // Duplicate ignored
    expect(result.mappings[1].confidence).toBe('unmapped');
  });

  it('should handle empty importerColumns (non-importable attributes)', async () => {
    vi.spyOn(attributeRegistry, 'resolveHeaderToPath').mockImplementation(async (header) => {
      // Simulate registry behavior: variantCount has empty importerColumns
      // so resolveHeaderToPath returns null (not in the importable map)
      if (header.toLowerCase().includes('variant')) return null;
      if (header.toLowerCase() === 'mpn') return 'sku_core.mpn';
      return null;
    });

    const csvContent = 'Variant Count,variant_count,MPN\n5,10,TEST123';
    const result = await parseCSVAsync(csvContent);

    // Both variant headers should be unmapped
    expect(result.mappings[0].targetField).toBeNull();
    expect(result.mappings[1].targetField).toBeNull();
    
    // MPN should map correctly
    expect(result.mappings[2].targetField).toBe('sku_core.mpn');
  });
});
