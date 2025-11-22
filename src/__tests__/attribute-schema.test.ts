/**
 * Attribute Schema Validation Tests
 */
import { describe, it, expect } from 'vitest';
import Ajv from 'ajv';
import addFormats from 'ajv-formats';
import attributeSchema from '../schema/attribute.schema.json';

const ajv = new Ajv();
addFormats(ajv);
const validate = ajv.compile(attributeSchema);

describe('Attribute Schema Validation', () => {
  it('should validate a minimal valid attribute', () => {
    const attribute = {
      canonicalPath: 'descriptive.color',
      label: 'Color',
      category: 'descriptive',
      dataType: 'string'
    };

    const valid = validate(attribute);
    expect(valid).toBe(true);
    expect(validate.errors).toBeNull();
  });

  it('should validate a complete attribute with all fields', () => {
    const attribute = {
      canonicalPath: 'sku_core.mpn',
      label: 'Manufacturer Part Number',
      category: 'sku_core',
      dataType: 'string',
      importerColumns: ['MPN', 'PartNumber', 'mfg_part_num'],
      importRequired: true,
      requiredForExport: false,
      export: true,
      bulkEditable: true,
      foundation: false,
      description: 'Unique manufacturer part number',
      ai: {
        use: ['template_selection', 'validation'],
        can_write: false,
        confidenceThreshold: 0.9,
        trusted_sources: ['vendor_api'],
        notes: 'Critical for product matching'
      },
      validation: {
        required: true,
        pattern: '^[A-Z0-9-]+$',
        allowedValuesRef: null
      },
      ui: {
        hint: 'Enter the exact part number from the manufacturer'
      },
      audit: {
        createdBy: 'theo@shiekhshoes.org',
        createdAt: '2025-11-22T00:00:00Z',
        updatedBy: 'theo@shiekhshoes.org',
        updatedAt: '2025-11-22T00:00:00Z',
        version: '1.0'
      }
    };

    const valid = validate(attribute);
    expect(valid).toBe(true);
    expect(validate.errors).toBeNull();
  });

  it('should reject attribute with missing required fields', () => {
    const attribute = {
      label: 'Color',
      category: 'descriptive'
      // Missing canonicalPath and dataType
    };

    const valid = validate(attribute);
    expect(valid).toBe(false);
    expect(validate.errors).not.toBeNull();
    expect(validate.errors?.some(e => e.instancePath === '' && e.params.missingProperty === 'canonicalPath')).toBe(true);
  });

  it('should reject attribute with invalid category', () => {
    const attribute = {
      canonicalPath: 'invalid.field',
      label: 'Test',
      category: 'invalid_category',
      dataType: 'string'
    };

    const valid = validate(attribute);
    expect(valid).toBe(false);
    expect(validate.errors?.some(e => e.instancePath === '/category')).toBe(true);
  });

  it('should reject attribute with invalid dataType', () => {
    const attribute = {
      canonicalPath: 'descriptive.test',
      label: 'Test',
      category: 'descriptive',
      dataType: 'invalid_type'
    };

    const valid = validate(attribute);
    expect(valid).toBe(false);
    expect(validate.errors?.some(e => e.instancePath === '/dataType')).toBe(true);
  });

  it('should reject canonicalPath with invalid format', () => {
    const attribute = {
      canonicalPath: 'invalid-format',
      label: 'Test',
      category: 'descriptive',
      dataType: 'string'
    };

    const valid = validate(attribute);
    expect(valid).toBe(false);
    expect(validate.errors?.some(e => e.instancePath === '/canonicalPath')).toBe(true);
  });

  it('should validate AI settings with valid use cases', () => {
    const attribute = {
      canonicalPath: 'descriptive.description',
      label: 'Description',
      category: 'descriptive',
      dataType: 'string',
      ai: {
        use: ['enrichment', 'extraction'],
        can_write: true,
        confidenceThreshold: 0.85,
        trusted_sources: ['gemini', 'vendor_api']
      }
    };

    const valid = validate(attribute);
    expect(valid).toBe(true);
  });

  it('should validate foundation attribute', () => {
    const attribute = {
      canonicalPath: 'descriptive.age_group',
      label: 'Age Group',
      category: 'descriptive',
      dataType: 'string',
      foundation: true,
      importRequired: true,
      requiredForExport: true
    };

    const valid = validate(attribute);
    expect(valid).toBe(true);
  });
});
