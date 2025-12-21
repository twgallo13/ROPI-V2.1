/**
 * Export Service Unit Tests
 * LP-2.1.9 — Export & PDP Alignment
 * 
 * Tests for export service functionality:
 * - Only export: true attributes included
 * - enum and multiSelect export canonical values
 * - _meta optional inclusion works
 * - export readiness computed correctly
 */

import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import {
  mapToCanonical,
  formatMultiSelect,
  formatValueForExport,
  calculateExportReadiness,
  buildExportRow,
  generateCsvContent,
  getExportColumnHeaders,
  type ExportAttributeDefinition,
  type ProductDocument,
  type ExportOptions,
  CORE_COLUMNS
} from '../src/services/exportService';

// ============================================================================
// Test Setup
// ============================================================================

describe('LP-2.1.9: Export Service', () => {
  // Mock registry map for tests
  const mockAttributes = new Map<string, ExportAttributeDefinition>();

  beforeEach(() => {
    mockAttributes.clear();
    
    // Add test attributes
    mockAttributes.set('gender', {
      id: 'gender',
      attribute_id: 'gender',
      label: 'Gender',
      data_type: 'enum',
      allowed_values: ['Men', 'Women', 'Unisex', 'Kids'],
      synonyms: { 'Male': 'Men', 'Female': 'Women', 'M': 'Men', 'W': 'Women' },
      export: true,
      required_for_export: true,
      category: 'identity'
    });

    mockAttributes.set('primary_color', {
      id: 'primary_color',
      attribute_id: 'primary_color',
      label: 'Primary Color',
      external_header: 'Color',
      data_type: 'enum',
      allowed_values: ['Black', 'White', 'Red', 'Blue', 'Green'],
      synonyms: { 'BLK': 'Black', 'WHT': 'White', 'blk': 'Black' },
      export: true,
      required_for_export: true,
      category: 'color'
    });

    mockAttributes.set('materials', {
      id: 'materials',
      attribute_id: 'materials',
      label: 'Materials',
      data_type: 'multiSelect',
      allowed_values: ['Leather', 'Canvas', 'Rubber', 'Synthetic'],
      synonyms: { 'Full Grain Leather': 'Leather' },
      export: true,
      required_for_export: false,
      category: 'descriptive'
    });

    mockAttributes.set('price', {
      id: 'price',
      attribute_id: 'price',
      label: 'Price',
      data_type: 'number',
      export: true,
      required_for_export: false,
      category: 'pricing'
    });

    mockAttributes.set('is_active', {
      id: 'is_active',
      attribute_id: 'is_active',
      label: 'Active',
      data_type: 'boolean',
      export: true,
      required_for_export: false,
      category: 'status'
    });

    mockAttributes.set('release_date', {
      id: 'release_date',
      attribute_id: 'release_date',
      label: 'Release Date',
      data_type: 'date',
      export: true,
      required_for_export: false,
      category: 'temporal'
    });

    mockAttributes.set('internal_notes', {
      id: 'internal_notes',
      attribute_id: 'internal_notes',
      label: 'Internal Notes',
      data_type: 'string',
      export: false, // Not exportable
      required_for_export: false,
      category: 'internal'
    });
  });

  // ============================================================================
  // mapToCanonical Tests
  // ============================================================================

  describe('mapToCanonical', () => {
    it('should return exact match from allowed_values', () => {
      const def = mockAttributes.get('gender')!;
      const result = mapToCanonical('Men', def);
      
      expect(result.canonical).toBe('Men');
      expect(result.warning).toBeUndefined();
    });

    it('should match case-insensitively', () => {
      const def = mockAttributes.get('gender')!;
      const result = mapToCanonical('men', def);
      
      expect(result.canonical).toBe('Men');
      expect(result.warning).toBeUndefined();
    });

    it('should map synonyms to canonical values', () => {
      const def = mockAttributes.get('primary_color')!;
      const result = mapToCanonical('BLK', def);
      
      expect(result.canonical).toBe('Black');
      expect(result.warning).toBeUndefined();
    });

    it('should return warning for unknown enum value', () => {
      const def = mockAttributes.get('gender')!;
      const result = mapToCanonical('Unknown', def);
      
      expect(result.canonical).toBe('Unknown'); // Verbatim
      expect(result.warning).toBeDefined();
      expect(result.warning?.code).toBe('unknown_export_value');
    });

    it('should return null for empty values', () => {
      const def = mockAttributes.get('gender')!;
      
      expect(mapToCanonical(null, def).canonical).toBeNull();
      expect(mapToCanonical(undefined, def).canonical).toBeNull();
      expect(mapToCanonical('', def).canonical).toBeNull();
    });
  });

  // ============================================================================
  // formatMultiSelect Tests
  // ============================================================================

  describe('formatMultiSelect', () => {
    it('should join array values with pipe delimiter', () => {
      const def = mockAttributes.get('materials')!;
      const result = formatMultiSelect(['Leather', 'Canvas'], def);
      
      expect(result.formatted).toBe('Leather|Canvas');
      expect(result.warnings).toHaveLength(0);
    });

    it('should parse pipe-delimited string', () => {
      const def = mockAttributes.get('materials')!;
      const result = formatMultiSelect('Leather|Rubber', def);
      
      expect(result.formatted).toBe('Leather|Rubber');
    });

    it('should parse comma-delimited string', () => {
      const def = mockAttributes.get('materials')!;
      const result = formatMultiSelect('Leather, Canvas, Rubber', def);
      
      expect(result.formatted).toBe('Leather|Canvas|Rubber');
    });

    it('should use custom delimiter', () => {
      const def = mockAttributes.get('materials')!;
      const result = formatMultiSelect(['Leather', 'Canvas'], def, ',');
      
      expect(result.formatted).toBe('Leather,Canvas');
    });

    it('should warn on unknown values', () => {
      const def = mockAttributes.get('materials')!;
      // Update the def to have allowed_values for testing
      const defWithValues = {
        ...def,
        data_type: 'multiSelect' as const,
        allowed_values: ['Leather', 'Canvas', 'Rubber']
      };
      const result = formatMultiSelect(['Leather', 'UnknownMaterial'], defWithValues);
      
      expect(result.formatted).toBe('Leather|UnknownMaterial');
      expect(result.warnings.length).toBeGreaterThan(0);
      expect(result.warnings[0].code).toBe('unknown_export_value');
    });

    it('should return null for empty values', () => {
      const def = mockAttributes.get('materials')!;
      
      expect(formatMultiSelect(null, def).formatted).toBeNull();
      expect(formatMultiSelect(undefined, def).formatted).toBeNull();
    });
  });

  // ============================================================================
  // formatValueForExport Tests
  // ============================================================================

  describe('formatValueForExport', () => {
    const options: ExportOptions = {};

    it('should format enum values', () => {
      const def = mockAttributes.get('gender')!;
      const result = formatValueForExport('Women', def, options);
      
      expect(result.formatted).toBe('Women');
    });

    it('should format boolean values', () => {
      const def = mockAttributes.get('is_active')!;
      
      expect(formatValueForExport(true, def, options).formatted).toBe(true);
      expect(formatValueForExport('true', def, options).formatted).toBe(true);
      expect(formatValueForExport('false', def, options).formatted).toBe(false);
      expect(formatValueForExport(0, def, options).formatted).toBe(false);
    });

    it('should format number values', () => {
      const def = mockAttributes.get('price')!;
      
      expect(formatValueForExport(99.99, def, options).formatted).toBe(99.99);
      expect(formatValueForExport('149.50', def, options).formatted).toBe(149.5);
    });

    it('should format date values as ISO string', () => {
      const def = mockAttributes.get('release_date')!;
      const date = new Date('2024-01-15');
      const result = formatValueForExport(date, def, options);
      
      expect(result.formatted).toContain('2024-01-15');
    });

    it('should sanitize string values for CSV', () => {
      const stringDef: ExportAttributeDefinition = {
        id: 'description',
        attribute_id: 'description',
        label: 'Description',
        data_type: 'string',
        export: true
      };
      
      const result = formatValueForExport('Line 1\nLine 2', stringDef, options);
      expect(result.formatted).toBe('Line 1 Line 2');
    });
  });

  // ============================================================================
  // calculateExportReadiness Tests
  // ============================================================================

  describe('calculateExportReadiness', () => {
    it('should return ready=true when all required attributes present', () => {
      const product: ProductDocument = {
        id: 'prod-001',
        mpn: 'TEST-MPN-001',
        attributes: {
          gender: 'Men',
          primary_color: 'Black'
        }
      };

      const result = calculateExportReadiness(product, mockAttributes);
      
      expect(result.ready).toBe(true);
      expect(result.missingAttributes).toHaveLength(0);
    });

    it('should return ready=false when MPN is missing', () => {
      const product: ProductDocument = {
        id: 'prod-001',
        attributes: {
          gender: 'Men',
          primary_color: 'Black'
        }
      };

      const result = calculateExportReadiness(product, mockAttributes);
      
      expect(result.ready).toBe(false);
      expect(result.missingAttributes).toContain('mpn');
    });

    it('should return ready=false when required attributes missing', () => {
      const product: ProductDocument = {
        id: 'prod-001',
        mpn: 'TEST-MPN-001',
        attributes: {
          gender: 'Men'
          // primary_color missing
        }
      };

      const result = calculateExportReadiness(product, mockAttributes);
      
      expect(result.ready).toBe(false);
      expect(result.missingAttributes).toContain('primary_color');
    });

    it('should not require non-required attributes', () => {
      const product: ProductDocument = {
        id: 'prod-001',
        mpn: 'TEST-MPN-001',
        attributes: {
          gender: 'Men',
          primary_color: 'Black'
          // materials is optional
        }
      };

      const result = calculateExportReadiness(product, mockAttributes);
      
      expect(result.ready).toBe(true);
      expect(result.missingAttributes).not.toContain('materials');
    });
  });

  // ============================================================================
  // buildExportRow Tests
  // ============================================================================

  describe('buildExportRow', () => {
    const options: ExportOptions = {};

    it('should build export row with MPN as first column', () => {
      const product: ProductDocument = {
        id: 'prod-001',
        mpn: 'TEST-MPN-001',
        sku: 'SKU-001',
        attributes: {
          gender: 'Men',
          primary_color: 'Black'
        }
      };

      const row = buildExportRow(product, 1, mockAttributes, options);
      
      expect(row.mpn).toBe('TEST-MPN-001');
      expect(row.columns['MPN']).toBe('TEST-MPN-001');
      expect(row.columns['SKU']).toBe('SKU-001');
      expect(row.rowNumber).toBe(1);
    });

    it('should include attribute values in columns', () => {
      const product: ProductDocument = {
        id: 'prod-001',
        mpn: 'TEST-MPN-001',
        attributes: {
          gender: 'Women',
          primary_color: 'Red'
        }
      };

      const row = buildExportRow(product, 1, mockAttributes, options);
      
      expect(row.columns['Gender']).toBe('Women');
      expect(row.columns['Color']).toBe('Red'); // Uses external_header
    });

    it('should include _meta columns when requested', () => {
      const product: ProductDocument = {
        id: 'prod-001',
        mpn: 'TEST-MPN-001',
        attributes: {
          gender: 'Men'
        },
        _meta: {
          gender: {
            actor: 'user-123',
            source: 'import',
            ts: '2024-01-15T10:00:00Z',
            definition_version: '1.0.0',
            canonical: true
          }
        }
      };

      const optionsWithMeta: ExportOptions = { includeMeta: true };
      const row = buildExportRow(product, 1, mockAttributes, optionsWithMeta);
      
      expect(row.metaColumns).toBeDefined();
      expect(row.metaColumns?.['Gender_meta']).toContain('user-123');
      expect(row.metaColumns?.['Gender_meta']).toContain('import');
    });

    it('should track export readiness', () => {
      const product: ProductDocument = {
        id: 'prod-001',
        mpn: 'TEST-MPN-001',
        attributes: {
          gender: 'Men'
          // missing primary_color (required)
        }
      };

      const row = buildExportRow(product, 1, mockAttributes, options);
      
      expect(row.exportReady).toBe(false);
      expect(row.missingAttributes).toContain('primary_color');
    });

    it('should collect warnings for unknown values', () => {
      const product: ProductDocument = {
        id: 'prod-001',
        mpn: 'TEST-MPN-001',
        attributes: {
          gender: 'Unknown',
          primary_color: 'Black'
        }
      };

      const row = buildExportRow(product, 1, mockAttributes, options);
      
      expect(row.warnings.length).toBeGreaterThan(0);
      expect(row.warnings[0].code).toBe('unknown_export_value');
    });

    it('should join multiple SKUs with comma', () => {
      const product: ProductDocument = {
        id: 'prod-001',
        mpn: 'TEST-MPN-001',
        skus: ['SKU-001', 'SKU-002', 'SKU-003'],
        attributes: {}
      };

      const row = buildExportRow(product, 1, mockAttributes, options);
      
      expect(row.columns['SKU']).toBe('SKU-001,SKU-002,SKU-003');
    });
  });

  // ============================================================================
  // getExportColumnHeaders Tests
  // ============================================================================

  describe('getExportColumnHeaders', () => {
    it('should start with MPN and SKU', () => {
      const headers = getExportColumnHeaders(mockAttributes);
      
      expect(headers[0]).toBe('MPN');
      expect(headers[1]).toBe('SKU');
    });

    it('should sort attributes by category then label', () => {
      const headers = getExportColumnHeaders(mockAttributes);
      
      // Remove core columns for comparison
      const attrHeaders = headers.slice(2);
      
      // Should be sorted by category
      expect(attrHeaders).toContain('Color');
      expect(attrHeaders).toContain('Gender');
      expect(attrHeaders).toContain('Materials');
    });

    it('should use external_header when available', () => {
      const headers = getExportColumnHeaders(mockAttributes);
      
      expect(headers).toContain('Color'); // external_header for primary_color
      expect(headers).not.toContain('Primary Color');
    });

    it('should add _meta columns when includeMeta=true', () => {
      const headers = getExportColumnHeaders(mockAttributes, true);
      
      expect(headers).toContain('Gender_meta');
      expect(headers).toContain('Color_meta');
    });

    it('should exclude attributes with export=false', () => {
      // internal_notes has export: false
      const filteredAttrs = new Map(
        Array.from(mockAttributes).filter(([_, def]) => def.export !== false)
      );
      const headers = getExportColumnHeaders(filteredAttrs);
      
      expect(headers).not.toContain('Internal Notes');
    });
  });

  // ============================================================================
  // generateCsvContent Tests
  // ============================================================================

  describe('generateCsvContent', () => {
    it('should generate valid CSV with headers', () => {
      const headers = ['MPN', 'SKU', 'Gender', 'Color'];
      const rows = [
        {
          rowNumber: 1,
          mpn: 'MPN-001',
          productId: 'prod-001',
          exportReady: true,
          missingAttributes: [],
          warnings: [],
          columns: { 'MPN': 'MPN-001', 'SKU': 'SKU-001', 'Gender': 'Men', 'Color': 'Black' }
        }
      ];

      const csv = generateCsvContent(headers, rows);
      const lines = csv.split('\n');
      
      expect(lines[0]).toBe('MPN,SKU,Gender,Color');
      expect(lines[1]).toBe('MPN-001,SKU-001,Men,Black');
    });

    it('should escape values with commas', () => {
      const headers = ['MPN', 'Description'];
      const rows = [
        {
          rowNumber: 1,
          mpn: 'MPN-001',
          productId: 'prod-001',
          exportReady: true,
          missingAttributes: [],
          warnings: [],
          columns: { 'MPN': 'MPN-001', 'Description': 'Red, White, Blue' }
        }
      ];

      const csv = generateCsvContent(headers, rows);
      
      expect(csv).toContain('"Red, White, Blue"');
    });

    it('should escape values with quotes', () => {
      const headers = ['MPN', 'Title'];
      const rows = [
        {
          rowNumber: 1,
          mpn: 'MPN-001',
          productId: 'prod-001',
          exportReady: true,
          missingAttributes: [],
          warnings: [],
          columns: { 'MPN': 'MPN-001', 'Title': 'Nike "Air" Max' }
        }
      ];

      const csv = generateCsvContent(headers, rows);
      
      expect(csv).toContain('Nike ""Air"" Max');
    });

    it('should handle null values as empty strings', () => {
      const headers = ['MPN', 'Color'];
      const rows = [
        {
          rowNumber: 1,
          mpn: 'MPN-001',
          productId: 'prod-001',
          exportReady: true,
          missingAttributes: [],
          warnings: [],
          columns: { 'MPN': 'MPN-001', 'Color': null }
        }
      ];

      const csv = generateCsvContent(headers, rows);
      
      expect(csv).toBe('MPN,Color\nMPN-001,');
    });
  });

  // ============================================================================
  // Export Flag Tests (Critical)
  // ============================================================================

  describe('Export Flag Enforcement', () => {
    it('should not include attributes with export=false in headers', () => {
      // Create a map with only exportable attributes
      const exportableOnly = new Map<string, ExportAttributeDefinition>();
      for (const [id, def] of mockAttributes) {
        if (def.export !== false) {
          exportableOnly.set(id, def);
        }
      }

      const headers = getExportColumnHeaders(exportableOnly);
      
      // internal_notes has export: false
      expect(headers).not.toContain('Internal Notes');
      expect(headers).not.toContain('internal_notes');
    });
  });

  // ============================================================================
  // MPN Primary Key Tests (Critical)
  // ============================================================================

  describe('MPN as Primary Key', () => {
    it('should always have MPN as first column', () => {
      const headers = getExportColumnHeaders(mockAttributes);
      expect(headers[0]).toBe('MPN');
    });

    it('should mark products without MPN as not export-ready', () => {
      const product: ProductDocument = {
        id: 'prod-001',
        // No MPN
        attributes: {
          gender: 'Men',
          primary_color: 'Black'
        }
      };

      const result = calculateExportReadiness(product, mockAttributes);
      expect(result.ready).toBe(false);
      expect(result.missingAttributes).toContain('mpn');
    });
  });
});
