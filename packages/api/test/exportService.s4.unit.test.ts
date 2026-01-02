/**
 * Export Service S4 Unit Tests
 * LP-smart-rules-exporter-1.0.0 — Exporter & Validation Alignment
 * 
 * Tests for S4-specific functionality:
 * - exporter.includes_exportable_fields
 * - exporter.respects_export_key_and_transform  
 * - validation.fails_for_missing_requiredForExport
 * - internalOnly_not_exported
 * - channel_targets_filter_payload
 */

import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import {
  loadExportableAttributes,
  getExportColumnHeaders,
  getExportHeader,
  shouldOmitIfEmpty,
  calculateExportReadiness,
  validateProductForExport,
  validateBatchForExport,
  buildExportRow,
  type ExportAttributeDefinition,
  type ProductDocument,
  type ExportOptions,
} from '../src/services/exportService';

// Mock the SDK registry functions
vi.mock('@ropi-aoss/sdk', async () => {
  const actual = await vi.importActual('@ropi-aoss/sdk');
  return {
    ...actual,
    // Mock registry access functions used by exportService
    isExportable: vi.fn((id: string) => {
      // Mock: color_internal is not exportable, internal_notes is not
      if (id === 'internal_notes') return false;
      if (id === 'internal_tracking_id') return false;
      return true;
    }),
    isRequiredForExport: vi.fn((id: string) => {
      if (id === 'brand' || id === 'gender') return true;
      return false;
    }),
    isInternalOnly: vi.fn((id: string) => {
      if (id === 'internal_tracking_id' || id === 'audit_log') return true;
      return false;
    }),
    getExportMeta: vi.fn((id: string) => {
      if (id === 'primary_color') {
        return { key: 'Color', omitIfEmpty: false };
      }
      if (id === 'optional_tag') {
        return { key: 'Tag', omitIfEmpty: true };
      }
      if (id === 'shopify_only') {
        return { targets: ['shopify'] };
      }
      return undefined;
    }),
    getAttributesForTarget: vi.fn((target: string) => {
      const baseAttrs = [
        { attribute_id: 'brand', label: 'Brand', data_type: 'text' },
        { attribute_id: 'gender', label: 'Gender', data_type: 'select' },
        { attribute_id: 'primary_color', label: 'Primary Color', data_type: 'select' },
      ];
      if (target === 'shopify') {
        return [
          ...baseAttrs,
          { attribute_id: 'shopify_only', label: 'Shopify Tag', data_type: 'text', export: { targets: ['shopify'] } },
        ];
      }
      if (target === 'google') {
        return [
          ...baseAttrs,
          { attribute_id: 'google_category', label: 'Google Category', data_type: 'text', export: { targets: ['google'] } },
        ];
      }
      return baseAttrs;
    }),
  };
});

// Mock attributeValidator's loadRegistryMap
vi.mock('../src/services/attributeValidator', () => ({
  loadRegistryMap: vi.fn().mockResolvedValue(new Map([
    ['brand', {
      id: 'brand',
      attribute_id: 'brand',
      label: 'Brand',
      data_type: 'string',
      export: true,
      requiredForExport: true,
    }],
    ['gender', {
      id: 'gender',
      attribute_id: 'gender',
      label: 'Gender',
      data_type: 'enum',
      allowed_values: ['Men', 'Women', 'Unisex'],
      export: true,
      requiredForExport: true,
    }],
    ['primary_color', {
      id: 'primary_color',
      attribute_id: 'primary_color',
      label: 'Primary Color',
      data_type: 'enum',
      allowed_values: ['Black', 'White', 'Red'],
      external_header: 'Color',
      export: { key: 'ColorCode', omitIfEmpty: false },
      requiredForExport: false,
    }],
    ['optional_tag', {
      id: 'optional_tag',
      attribute_id: 'optional_tag',
      label: 'Optional Tag',
      data_type: 'string',
      export: { key: 'Tag', omitIfEmpty: true },
      requiredForExport: false,
    }],
    ['internal_notes', {
      id: 'internal_notes',
      attribute_id: 'internal_notes',
      label: 'Internal Notes',
      data_type: 'string',
      export: false,
      exportable: false,
    }],
    ['internal_tracking_id', {
      id: 'internal_tracking_id',
      attribute_id: 'internal_tracking_id',
      label: 'Internal Tracking ID',
      data_type: 'string',
      internalOnly: true,
    }],
    ['audit_log', {
      id: 'audit_log',
      attribute_id: 'audit_log',
      label: 'Audit Log',
      data_type: 'json',
      internalOnly: true,
    }],
    ['shopify_only', {
      id: 'shopify_only',
      attribute_id: 'shopify_only',
      label: 'Shopify Tag',
      data_type: 'string',
      export: { targets: ['shopify'] },
    }],
    ['google_category', {
      id: 'google_category',
      attribute_id: 'google_category',
      label: 'Google Category',
      data_type: 'string',
      export: { targets: ['google'] },
    }],
  ])),
}));

// ============================================================================
// Test Suite: S4 Export Service
// ============================================================================

describe('LP-smart-rules-exporter-1.0.0: S4 Export Service', () => {
  
  // ============================================================================
  // Test: exporter.includes_exportable_fields
  // ============================================================================
  
  describe('exporter.includes_exportable_fields', () => {
    it('should include attributes with exportable: true (default)', async () => {
      const attributes = await loadExportableAttributes();
      
      // brand and gender should be included
      expect(attributes.has('brand')).toBe(true);
      expect(attributes.has('gender')).toBe(true);
      expect(attributes.has('primary_color')).toBe(true);
    });
    
    it('should exclude attributes with exportable: false', async () => {
      const attributes = await loadExportableAttributes();
      
      // internal_notes has export: false
      expect(attributes.has('internal_notes')).toBe(false);
    });
    
    it('should exclude internalOnly attributes', async () => {
      const attributes = await loadExportableAttributes();
      
      // internal_tracking_id has internalOnly: true
      expect(attributes.has('internal_tracking_id')).toBe(false);
      expect(attributes.has('audit_log')).toBe(false);
    });
  });
  
  // ============================================================================
  // Test: exporter.respects_export_key_and_transform
  // ============================================================================
  
  describe('exporter.respects_export_key_and_transform', () => {
    it('should use export.key for column header when present', () => {
      const def: ExportAttributeDefinition = {
        id: 'primary_color',
        attribute_id: 'primary_color',
        label: 'Primary Color',
        data_type: 'enum',
        external_header: 'Color',
        export: { key: 'ColorCode', omitIfEmpty: false },
      };
      
      const header = getExportHeader(def);
      expect(header).toBe('ColorCode');
    });
    
    it('should fall back to external_header when export.key not present', () => {
      const def: ExportAttributeDefinition = {
        id: 'size',
        attribute_id: 'size',
        label: 'Size',
        data_type: 'enum',
        external_header: 'ProductSize',
        export: true,
      };
      
      const header = getExportHeader(def);
      expect(header).toBe('ProductSize');
    });
    
    it('should fall back to label when no export.key or external_header', () => {
      const def: ExportAttributeDefinition = {
        id: 'width',
        attribute_id: 'width',
        label: 'Width',
        data_type: 'number',
        export: true,
      };
      
      const header = getExportHeader(def);
      expect(header).toBe('Width');
    });
    
    it('should fall back to id when nothing else available', () => {
      const def: ExportAttributeDefinition = {
        id: 'legacy_field',
        attribute_id: 'legacy_field',
        label: '',
        data_type: 'string',
      };
      
      const header = getExportHeader(def);
      expect(header).toBe('legacy_field');
    });
    
    it('should correctly identify omitIfEmpty attributes', () => {
      const defWithOmit: ExportAttributeDefinition = {
        id: 'optional_tag',
        attribute_id: 'optional_tag',
        label: 'Optional Tag',
        data_type: 'string',
        export: { key: 'Tag', omitIfEmpty: true },
      };
      
      const defWithoutOmit: ExportAttributeDefinition = {
        id: 'primary_color',
        attribute_id: 'primary_color',
        label: 'Primary Color',
        data_type: 'enum',
        export: { key: 'Color', omitIfEmpty: false },
      };
      
      expect(shouldOmitIfEmpty(defWithOmit)).toBe(true);
      expect(shouldOmitIfEmpty(defWithoutOmit)).toBe(false);
    });
    
    it('should apply export.key in column headers', async () => {
      // Create attributes map with export.key
      // Note: Don't use 'brand' as it's in SKIP_ATTRIBUTE_IDS
      const attributes = new Map<string, ExportAttributeDefinition>();
      attributes.set('primary_color', {
        id: 'primary_color',
        attribute_id: 'primary_color',
        label: 'Primary Color',
        data_type: 'enum',
        category: 'aaa', // Sort first alphabetically
        export: { key: 'ColorCode', omitIfEmpty: false },
      });
      attributes.set('style_name', {
        id: 'style_name',
        attribute_id: 'style_name',
        label: 'Style Name',
        data_type: 'string',
        category: 'bbb', // Sort second
      });
      
      const headers = getExportColumnHeaders(attributes, false);
      
      // Should use export.key for primary_color
      expect(headers).toContain('ColorCode');
      // Should use label for style_name
      expect(headers).toContain('Style Name');
      // Order should be MPN, SKU, then sorted by category
      expect(headers.indexOf('ColorCode')).toBeLessThan(headers.indexOf('Style Name'));
    });
  });
  
  // ============================================================================
  // Test: validation.fails_for_missing_requiredForExport
  // ============================================================================
  
  describe('validation.fails_for_missing_requiredForExport', () => {
    const requiredAttributes = new Map<string, ExportAttributeDefinition>([
      ['brand', {
        id: 'brand',
        attribute_id: 'brand',
        label: 'Brand',
        data_type: 'string',
        requiredForExport: true,
      }],
      ['gender', {
        id: 'gender',
        attribute_id: 'gender',
        label: 'Gender',
        data_type: 'enum',
        requiredForExport: true,
      }],
      ['optional_field', {
        id: 'optional_field',
        attribute_id: 'optional_field',
        label: 'Optional',
        data_type: 'string',
        requiredForExport: false,
      }],
    ]);
    
    it('should return valid for product with all required fields', () => {
      const product: ProductDocument = {
        id: 'prod-001',
        mpn: 'MPN-001',
        attributes: {
          brand: 'Nike',
          gender: 'Men',
        },
      };
      
      const result = validateProductForExport(product, requiredAttributes);
      
      expect(result.valid).toBe(true);
      expect(result.errors).toHaveLength(0);
      expect(result.missingRequiredFields).toHaveLength(0);
    });
    
    it('should return MISSING_REQUIRED_EXPORT_FIELD for missing required field', () => {
      const product: ProductDocument = {
        id: 'prod-002',
        mpn: 'MPN-002',
        attributes: {
          brand: 'Nike',
          // gender is missing
        },
      };
      
      const result = validateProductForExport(product, requiredAttributes);
      
      expect(result.valid).toBe(false);
      expect(result.errors).toHaveLength(1);
      expect(result.errors[0].code).toBe('MISSING_REQUIRED_EXPORT_FIELD');
      expect(result.errors[0].attributeId).toBe('gender');
      expect(result.missingRequiredFields).toContain('gender');
    });
    
    it('should return error for missing MPN', () => {
      const product: ProductDocument = {
        id: 'prod-003',
        // mpn is missing
        attributes: {
          brand: 'Nike',
          gender: 'Men',
        },
      };
      
      const result = validateProductForExport(product, requiredAttributes);
      
      expect(result.valid).toBe(false);
      expect(result.errors.some(e => e.attributeId === 'mpn')).toBe(true);
      expect(result.errors[0].code).toBe('MISSING_REQUIRED_EXPORT_FIELD');
    });
    
    it('should return multiple errors for multiple missing fields', () => {
      const product: ProductDocument = {
        id: 'prod-004',
        // mpn is missing
        attributes: {
          // brand is missing
          // gender is missing
        },
      };
      
      const result = validateProductForExport(product, requiredAttributes);
      
      expect(result.valid).toBe(false);
      expect(result.errors.length).toBeGreaterThanOrEqual(3); // mpn, brand, gender
      expect(result.missingRequiredFields).toContain('mpn');
      expect(result.missingRequiredFields).toContain('brand');
      expect(result.missingRequiredFields).toContain('gender');
    });
    
    it('should ignore missing optional fields', () => {
      const product: ProductDocument = {
        id: 'prod-005',
        mpn: 'MPN-005',
        attributes: {
          brand: 'Nike',
          gender: 'Men',
          // optional_field is missing but not required
        },
      };
      
      const result = validateProductForExport(product, requiredAttributes);
      
      expect(result.valid).toBe(true);
      expect(result.missingRequiredFields).not.toContain('optional_field');
    });
    
    it('should validate batch of products', () => {
      const products: ProductDocument[] = [
        { id: 'prod-001', mpn: 'MPN-001', attributes: { brand: 'Nike', gender: 'Men' } },
        { id: 'prod-002', mpn: 'MPN-002', attributes: { brand: 'Adidas' } }, // missing gender
        { id: 'prod-003', attributes: { brand: 'Puma', gender: 'Women' } }, // missing MPN
      ];
      
      const result = validateBatchForExport(products, requiredAttributes);
      
      expect(result.totalProducts).toBe(3);
      expect(result.validProducts).toBe(1);
      expect(result.invalidProducts).toBe(2);
      expect(result.errors.length).toBeGreaterThanOrEqual(2);
    });
    
    it('should use calculateExportReadiness for ready status', () => {
      const productReady: ProductDocument = {
        id: 'prod-ready',
        mpn: 'MPN-READY',
        attributes: { brand: 'Nike', gender: 'Men' },
      };
      
      const productNotReady: ProductDocument = {
        id: 'prod-not-ready',
        mpn: 'MPN-NOT',
        attributes: { brand: 'Nike' }, // missing gender
      };
      
      const readyResult = calculateExportReadiness(productReady, requiredAttributes);
      const notReadyResult = calculateExportReadiness(productNotReady, requiredAttributes);
      
      expect(readyResult.ready).toBe(true);
      expect(readyResult.missingAttributes).toHaveLength(0);
      
      expect(notReadyResult.ready).toBe(false);
      expect(notReadyResult.missingAttributes).toContain('gender');
    });
  });
  
  // ============================================================================
  // Test: internalOnly_not_exported
  // ============================================================================
  
  describe('internalOnly_not_exported', () => {
    it('should exclude internalOnly attributes from export', async () => {
      const attributes = await loadExportableAttributes();
      
      // internal_tracking_id has internalOnly: true
      expect(attributes.has('internal_tracking_id')).toBe(false);
      
      // audit_log has internalOnly: true
      expect(attributes.has('audit_log')).toBe(false);
    });
    
    it('should include regular exportable attributes', async () => {
      const attributes = await loadExportableAttributes();
      
      // brand, gender should be included
      expect(attributes.has('brand')).toBe(true);
      expect(attributes.has('gender')).toBe(true);
    });
    
    it('should not include internalOnly values in export row', () => {
      // Note: Don't use 'brand' as it's in SKIP_ATTRIBUTE_IDS
      const attributes = new Map<string, ExportAttributeDefinition>([
        ['style_name', {
          id: 'style_name',
          attribute_id: 'style_name',
          label: 'Style Name',
          data_type: 'string',
          category: 'identity',
        }],
        // Note: internalOnly attrs should not be in the map at all
      ]);
      
      const product: ProductDocument = {
        id: 'prod-001',
        mpn: 'MPN-001',
        attributes: {
          style_name: 'Air Max',
          internal_tracking_id: 'TRACK-12345', // Should not appear
          audit_log: { entries: [] }, // Should not appear
        },
      };
      
      const row = buildExportRow(product, 1, attributes, {});
      
      // Style Name should be present (using label as header)
      expect(row.columns['Style Name']).toBe('Air Max');
      
      // Internal fields should not be in columns at all
      // They're not in the attributes map so won't be processed
      const columnKeys = Object.keys(row.columns);
      expect(columnKeys).not.toContain('internal_tracking_id');
      expect(columnKeys).not.toContain('Internal Tracking ID');
      expect(columnKeys).not.toContain('audit_log');
      expect(columnKeys).not.toContain('Audit Log');
    });
  });
  
  // ============================================================================
  // Test: channel_targets_filter_payload
  // ============================================================================
  
  describe('channel_targets_filter_payload', () => {
    it('should load channel-specific attributes for shopify', async () => {
      const attributes = await loadExportableAttributes(undefined, 'shopify');
      
      // Should include shopify_only (from mock)
      expect(attributes.has('shopify_only')).toBe(true);
      
      // Should include common attributes from mock (not in SKIP_ATTRIBUTE_IDS)
      // Note: 'brand' is in SKIP_ATTRIBUTE_IDS so it will be skipped
      expect(attributes.has('gender')).toBe(true);
      expect(attributes.has('primary_color')).toBe(true);
    });
    
    it('should load channel-specific attributes for google', async () => {
      const attributes = await loadExportableAttributes(undefined, 'google');
      
      // Should include google_category (from mock)
      expect(attributes.has('google_category')).toBe(true);
      
      // Should include common attributes from mock (not in SKIP_ATTRIBUTE_IDS)
      // Note: 'brand' is in SKIP_ATTRIBUTE_IDS so it will be skipped
      expect(attributes.has('gender')).toBe(true);
    });
    
    it('should not include shopify_only when exporting for google', async () => {
      const attributes = await loadExportableAttributes(undefined, 'google');
      
      // shopify_only should not be included for google target
      expect(attributes.has('shopify_only')).toBe(false);
    });
    
    it('should not include google_category when exporting for shopify', async () => {
      const attributes = await loadExportableAttributes(undefined, 'shopify');
      
      // google_category should not be included for shopify target
      expect(attributes.has('google_category')).toBe(false);
    });
  });
  
  // ============================================================================
  // Test: omitIfEmpty respects option
  // ============================================================================
  
  describe('omitIfEmpty option handling', () => {
    it('should omit empty columns when respectOmitIfEmpty is true and attribute has omitIfEmpty', () => {
      // Note: Don't use 'brand' as it's in SKIP_ATTRIBUTE_IDS
      const attributes = new Map<string, ExportAttributeDefinition>([
        ['style_name', {
          id: 'style_name',
          attribute_id: 'style_name',
          label: 'Style Name',
          data_type: 'string',
          category: 'identity',
        }],
        ['optional_tag', {
          id: 'optional_tag',
          attribute_id: 'optional_tag',
          label: 'Optional Tag',
          data_type: 'string',
          category: 'tags',
          export: { key: 'Tag', omitIfEmpty: true },
        }],
      ]);
      
      const product: ProductDocument = {
        id: 'prod-001',
        mpn: 'MPN-001',
        attributes: {
          style_name: 'Air Max',
          optional_tag: '', // Empty value
        },
      };
      
      const options: ExportOptions = { respectOmitIfEmpty: true };
      const row = buildExportRow(product, 1, attributes, options);
      
      // Style Name should be present (using label as header)
      expect(row.columns['Style Name']).toBe('Air Max');
      
      // Tag should be omitted because it's empty and omitIfEmpty is true
      expect(row.columns['Tag']).toBeUndefined();
    });
    
    it('should include empty columns when respectOmitIfEmpty is false', () => {
      const attributes = new Map<string, ExportAttributeDefinition>([
        ['optional_tag', {
          id: 'optional_tag',
          attribute_id: 'optional_tag',
          label: 'Optional Tag',
          data_type: 'string',
          category: 'tags',
          export: { key: 'Tag', omitIfEmpty: true },
        }],
      ]);
      
      const product: ProductDocument = {
        id: 'prod-001',
        mpn: 'MPN-001',
        attributes: {
          optional_tag: '', // Empty value
        },
      };
      
      const options: ExportOptions = { respectOmitIfEmpty: false };
      const row = buildExportRow(product, 1, attributes, options);
      
      // Tag should be present (even though empty) because respectOmitIfEmpty is false
      expect('Tag' in row.columns).toBe(true);
    });
  });
});
