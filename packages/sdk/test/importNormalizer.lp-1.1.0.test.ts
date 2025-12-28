/**
 * Import Normalizer Tests - LP-importer-mapping-recon-1.1.0
 * 
 * Tests for canonical registry IDs and array sourceColumn support.
 * Validates:
 * - DEFAULT_COLUMN_MAPPINGS uses registry attribute_ids
 * - sourceColumn array aliases work correctly
 * - LEGACY_TO_REGISTRY translation map coverage
 * - Normalized output uses canonical registry IDs
 */

import { describe, it, expect } from 'vitest';
import {
  normalizeImportRow,
  DEFAULT_COLUMN_MAPPINGS,
  normalizeTargetFieldToRegistry,
  sourceColumnMatchesHeader,
} from '../src/normalization/importNormalizer';
import { LEGACY_TO_REGISTRY, REGISTRY_TO_LEGACY } from '../src/normalization/legacyToRegistryMap';
import type { ImportSourceColumns } from '../src/schema/importEngine';

describe('Import Normalizer - LP-importer-mapping-recon-1.1.0: Canonical Registry IDs', () => {
  describe('DEFAULT_COLUMN_MAPPINGS structure', () => {
    it('should have MPN mapping with array sourceColumn', () => {
      const mpnMapping = DEFAULT_COLUMN_MAPPINGS.find(m => m.targetField === 'mpn');
      expect(mpnMapping).toBeDefined();
      expect(Array.isArray(mpnMapping?.sourceColumn)).toBe(true);
      expect(mpnMapping?.sourceColumn).toContain('MPN');
      expect(mpnMapping?.sourceColumn).toContain('mpn');
      expect(mpnMapping?.sourceColumn).toContain('Manufacturer Part Number');
    });

    it('should have primary_color as targetField (not color)', () => {
      const colorMapping = DEFAULT_COLUMN_MAPPINGS.find(m => m.targetField === 'primary_color');
      expect(colorMapping).toBeDefined();
      expect(Array.isArray(colorMapping?.sourceColumn)).toBe(true);
      expect(colorMapping?.sourceColumn).toContain('Color');
      expect(colorMapping?.sourceColumn).toContain('Primary Color');
    });

    it('should have descriptive_color as targetField', () => {
      const descColorMapping = DEFAULT_COLUMN_MAPPINGS.find(m => m.targetField === 'descriptive_color');
      expect(descColorMapping).toBeDefined();
      expect(Array.isArray(descColorMapping?.sourceColumn)).toBe(true);
      expect(descColorMapping?.sourceColumn).toContain('Descriptive Color');
    });

    it('should have rics_long_desc as targetField (registry ID)', () => {
      const ricsLongMapping = DEFAULT_COLUMN_MAPPINGS.find(m => m.targetField === 'rics_long_desc');
      expect(ricsLongMapping).toBeDefined();
      expect(Array.isArray(ricsLongMapping?.sourceColumn)).toBe(true);
    });

    it('should have rics_short_description as targetField (registry ID)', () => {
      const ricsShortMapping = DEFAULT_COLUMN_MAPPINGS.find(m => m.targetField === 'rics_short_description');
      expect(ricsShortMapping).toBeDefined();
      expect(Array.isArray(ricsShortMapping?.sourceColumn)).toBe(true);
    });

    it('should not have duplicate targetFields in mappings', () => {
      const targetFields = DEFAULT_COLUMN_MAPPINGS.map(m => m.targetField);
      const uniqueTargets = new Set(targetFields);
      expect(uniqueTargets.size).toBe(targetFields.length);
    });

    it('should have all required identifiers as canonical IDs', () => {
      const identifierMappings = DEFAULT_COLUMN_MAPPINGS.filter(m =>
        ['mpn', 'sku', 'name', 'brand', 'gtin', 'style_id'].includes(m.targetField)
      );
      expect(identifierMappings.length).toBeGreaterThanOrEqual(4);
    });
  });

  describe('sourceColumnMatchesHeader', () => {
    it('should match single string sourceColumn (case-insensitive)', () => {
      expect(sourceColumnMatchesHeader('MPN', 'MPN')).toBe(true);
      expect(sourceColumnMatchesHeader('MPN', 'mpn')).toBe(true);
      expect(sourceColumnMatchesHeader('MPN', 'Mpn')).toBe(true);
    });

    it('should match array sourceColumn aliases', () => {
      const aliases = ['MPN', 'mpn', 'Manufacturer Part Number'];
      expect(sourceColumnMatchesHeader(aliases, 'MPN')).toBe(true);
      expect(sourceColumnMatchesHeader(aliases, 'mpn')).toBe(true);
      expect(sourceColumnMatchesHeader(aliases, 'Manufacturer Part Number')).toBe(true);
      expect(sourceColumnMatchesHeader(aliases, 'manufacturer part number')).toBe(true);
    });

    it('should not match non-matching headers', () => {
      const aliases = ['MPN', 'mpn'];
      expect(sourceColumnMatchesHeader(aliases, 'SKU')).toBe(false);
      expect(sourceColumnMatchesHeader(aliases, 'UPC')).toBe(false);
    });
  });

  describe('normalizeTargetFieldToRegistry', () => {
    it('should translate legacy color to primary_color', () => {
      expect(normalizeTargetFieldToRegistry('color')).toBe('primary_color');
      expect(normalizeTargetFieldToRegistry('primaryColor')).toBe('primary_color');
    });

    it('should translate legacy descriptiveColor to descriptive_color', () => {
      expect(normalizeTargetFieldToRegistry('descriptiveColor')).toBe('descriptive_color');
    });

    it('should translate legacy ricsLongDesc to rics_long_desc', () => {
      expect(normalizeTargetFieldToRegistry('ricsLongDesc')).toBe('rics_long_desc');
      expect(normalizeTargetFieldToRegistry('ricsLongDescription')).toBe('rics_long_desc');
    });

    it('should translate legacy ricsShortDesc to rics_short_description', () => {
      expect(normalizeTargetFieldToRegistry('ricsShortDesc')).toBe('rics_short_description');
      expect(normalizeTargetFieldToRegistry('ricsShortDescription')).toBe('rics_short_description');
    });

    it('should keep already-canonical IDs unchanged', () => {
      expect(normalizeTargetFieldToRegistry('primary_color')).toBe('primary_color');
      expect(normalizeTargetFieldToRegistry('descriptive_color')).toBe('descriptive_color');
      expect(normalizeTargetFieldToRegistry('rics_long_desc')).toBe('rics_long_desc');
    });

    it('should handle core identifiers', () => {
      expect(normalizeTargetFieldToRegistry('mpn')).toBe('mpn');
      expect(normalizeTargetFieldToRegistry('sku')).toBe('sku');
      expect(normalizeTargetFieldToRegistry('name')).toBe('name');
      expect(normalizeTargetFieldToRegistry('brand')).toBe('brand');
    });
  });

  describe('normalizeImportRow - canonical output', () => {
    it('should normalize Color column to primary_color registry ID', () => {
      const csvRow: ImportSourceColumns = { 'Color': 'Red' };
      const normalized = normalizeImportRow(csvRow);
      expect(normalized).toHaveProperty('primary_color');
      expect(normalized['primary_color']).toBe('Red');
      expect(normalized).not.toHaveProperty('color'); // Legacy key not present
    });

    it('should normalize Primary Color column to primary_color', () => {
      const csvRow: ImportSourceColumns = { 'Primary Color': 'Blue' };
      const normalized = normalizeImportRow(csvRow);
      expect(normalized['primary_color']).toBe('Blue');
    });

    it('should normalize Descriptive Color column to descriptive_color', () => {
      const csvRow: ImportSourceColumns = { 'Descriptive Color': 'Fire Red / Black' };
      const normalized = normalizeImportRow(csvRow);
      expect(normalized).toHaveProperty('descriptive_color');
      expect(normalized['descriptive_color']).toBe('Fire Red / Black');
    });

    it('should normalize MPN aliases to mpn registry ID', () => {
      // Test each MPN alias separately to avoid TypeScript index signature issues
      const csvRow1: ImportSourceColumns = { 'MPN': 'ABC123' };
      const csvRow2: ImportSourceColumns = { 'mpn': 'ABC123' };
      const csvRow3: ImportSourceColumns = { 'Manufacturer Part Number': 'ABC123' };

      for (const csvRow of [csvRow1, csvRow2, csvRow3]) {
        const normalized = normalizeImportRow(csvRow);
        expect(normalized).toHaveProperty('mpn');
        expect(normalized['mpn']).toBe('ABC123');
      }
    });

    it('should normalize RICS Long Description to rics_long_desc', () => {
      const csvRow: ImportSourceColumns = { 'RICS Long Description': 'Long descriptive text' };
      const normalized = normalizeImportRow(csvRow);
      expect(normalized).toHaveProperty('rics_long_desc');
      expect(normalized['rics_long_desc']).toBe('Long descriptive text');
    });

    it('should normalize RICS Short Description to rics_short_description', () => {
      const csvRow: ImportSourceColumns = { 'RICS Short Description': 'Short desc' };
      const normalized = normalizeImportRow(csvRow);
      expect(normalized).toHaveProperty('rics_short_description');
      expect(normalized['rics_short_description']).toBe('Short desc');
    });

    it('should normalize RICS Category to rics_category', () => {
      const csvRow: ImportSourceColumns = { 'RICS Category': 'Footwear' };
      const normalized = normalizeImportRow(csvRow);
      expect(normalized).toHaveProperty('rics_category');
      expect(normalized['rics_category']).toBe('Footwear');
    });

    it('should normalize RICS Color to rics_color', () => {
      const csvRow: ImportSourceColumns = { 'RICS Color': 'BLK' };
      const normalized = normalizeImportRow(csvRow);
      expect(normalized).toHaveProperty('rics_color');
      expect(normalized['rics_color']).toBe('BLK');
    });

    it('should normalize Launch Date to launch_date', () => {
      const csvRow: ImportSourceColumns = { 'Launch Date': '2024-01-15' };
      const normalized = normalizeImportRow(csvRow);
      expect(normalized).toHaveProperty('launch_date');
    });

    it('should normalize First Received to first_received', () => {
      const csvRow: ImportSourceColumns = { 'First Received': '2024-01-01' };
      const normalized = normalizeImportRow(csvRow);
      expect(normalized).toHaveProperty('first_received');
    });

    it('should normalize Age Group to age_group', () => {
      const csvRow: ImportSourceColumns = { 'Age Group': 'Adult' };
      const normalized = normalizeImportRow(csvRow);
      expect(normalized).toHaveProperty('age_group');
      expect(normalized['age_group']).toBe('Adult');
    });
  });

  describe('Legacy backward compatibility', () => {
    it('should handle legacy CSV with old camelCase headers', () => {
      const legacyCsv: ImportSourceColumns = {
        'MPN': 'LEGACY-001',
        'color': 'Red', // lowercase
        'DescriptiveColor': 'Crimson Red', // camelCase variant
      };
      const normalized = normalizeImportRow(legacyCsv);
      
      // Should normalize to registry IDs
      expect(normalized['mpn']).toBe('LEGACY-001');
      expect(normalized['primary_color']).toBe('Red');
      expect(normalized['descriptive_color']).toBe('Crimson Red');
    });

    it('should handle mixed case headers via case-insensitive matching', () => {
      const mixedCaseCsv: ImportSourceColumns = {
        'mpn': 'MIX-001',
        'BRAND': 'Test Brand',
        'Product name': 'Test Product',
      };
      const normalized = normalizeImportRow(mixedCaseCsv);
      
      expect(normalized['mpn']).toBe('MIX-001');
      // Note: Headers need to match alias list (case-insensitive)
    });
  });

  describe('LEGACY_TO_REGISTRY coverage', () => {
    it('should have mappings for primary color variants', () => {
      expect(LEGACY_TO_REGISTRY['color']).toBe('primary_color');
      expect(LEGACY_TO_REGISTRY['primaryColor']).toBe('primary_color');
      expect(LEGACY_TO_REGISTRY['primary_color']).toBe('primary_color');
    });

    it('should have mappings for descriptive color variants', () => {
      expect(LEGACY_TO_REGISTRY['descriptiveColor']).toBe('descriptive_color');
      expect(LEGACY_TO_REGISTRY['descriptive_color']).toBe('descriptive_color');
    });

    it('should have mappings for RICS fields', () => {
      expect(LEGACY_TO_REGISTRY['ricsLongDesc']).toBe('rics_long_desc');
      expect(LEGACY_TO_REGISTRY['ricsShortDesc']).toBe('rics_short_description');
      expect(LEGACY_TO_REGISTRY['ricsCategory']).toBe('rics_category');
      expect(LEGACY_TO_REGISTRY['ricsColor']).toBe('rics_color');
    });

    it('should have mappings for core identifiers', () => {
      expect(LEGACY_TO_REGISTRY['mpn']).toBe('mpn');
      expect(LEGACY_TO_REGISTRY['MPN']).toBe('mpn');
      expect(LEGACY_TO_REGISTRY['sku']).toBe('sku');
      expect(LEGACY_TO_REGISTRY['name']).toBe('name');
      expect(LEGACY_TO_REGISTRY['brand']).toBe('brand');
    });

    it('should have mappings for date fields', () => {
      expect(LEGACY_TO_REGISTRY['launchDate']).toBe('launch_date');
      expect(LEGACY_TO_REGISTRY['firstReceived']).toBe('first_received');
    });
  });

  describe('REGISTRY_TO_LEGACY reverse mapping', () => {
    it('should have reverse mappings for common registry IDs', () => {
      expect(REGISTRY_TO_LEGACY['primary_color']).toBeDefined();
      expect(REGISTRY_TO_LEGACY['descriptive_color']).toBeDefined();
      expect(REGISTRY_TO_LEGACY['rics_long_desc']).toBeDefined();
      expect(REGISTRY_TO_LEGACY['mpn']).toBeDefined();
    });
  });

  describe('Complete CSV row normalization', () => {
    it('should normalize a complete RetailOps CSV row with all field types', () => {
      const completeCsv: ImportSourceColumns = {
        'MPN': 'NK-AIR-MAX-270-BLK',
        'SKU': 'AIR270BLK10',
        'Product Name': 'Nike Air Max 270',
        'Brand': 'Nike',
        'Description': 'Classic air max sneaker',
        'Department': 'Footwear',
        'Category': 'Sneakers',
        'Gender': 'Men\'s',
        'Age Group': 'Adult',
        'Color': 'Black',
        'Descriptive Color': 'Black/White/Anthracite',
        'Material': 'Mesh',
        'Size': '10',
        'MSRP': '150.00',
        'Cost': '75.00',
        'Quantity': '25',
        'RICS Category': 'Athletic Footwear',
        'RICS Color': 'BLK',
        'Launch Date': '2024-03-01',
        'First Received': '2024-02-15',
        'Images': 'https://example.com/1.jpg|https://example.com/2.jpg',
        'Primary Image': 'https://example.com/main.jpg',
      };

      const normalized = normalizeImportRow(completeCsv);

      // Core identifiers
      expect(normalized['mpn']).toBe('NK-AIR-MAX-270-BLK');
      expect(normalized['sku']).toBe('AIR270BLK10');
      expect(normalized['name']).toBe('Nike Air Max 270');
      expect(normalized['brand']).toBe('Nike');

      // Colors (canonical registry IDs)
      expect(normalized['primary_color']).toBe('Black');
      expect(normalized['descriptive_color']).toBe('Black/White/Anthracite');

      // Classification
      expect(normalized['department']).toBe('Footwear');
      expect(normalized['category']).toBe('Sneakers');
      expect(normalized['gender']).toBe("men's"); // lowercase transform

      // Demographics
      expect(normalized['age_group']).toBe('Adult');

      // RICS fields
      expect(normalized['rics_category']).toBe('Athletic Footwear');
      expect(normalized['rics_color']).toBe('BLK');

      // Pricing
      expect(normalized['msrp']).toBe(150);
      expect(normalized['cost']).toBe(75);

      // Inventory
      expect(normalized['quantity']).toBe(25);

      // Dates (canonical registry IDs)
      expect(normalized['launch_date']).toBeDefined();
      expect(normalized['first_received']).toBeDefined();

      // Media
      expect(normalized['images']).toEqual([
        'https://example.com/1.jpg',
        'https://example.com/2.jpg',
      ]);
      expect(normalized['primary_image']).toBe('https://example.com/main.jpg');
    });
  });
});
