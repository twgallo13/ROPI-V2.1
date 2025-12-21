/**
 * Attribute Validator Unit Tests
 * LP-2.1.8 — Server-side Import Validation
 */

import { describe, it, expect, beforeEach, vi } from 'vitest';
import {
  validateRow,
  type AttributeDefinition,
  type RowValidationResult,
} from '../src/services/attributeValidator';

// Mock registry map for testing
const mockRegistryMap = new Map<string, AttributeDefinition>();

beforeEach(() => {
  mockRegistryMap.clear();
  
  // Add test attribute definitions
  mockRegistryMap.set('gender', {
    id: 'gender',
    attribute_id: 'gender',
    label: 'Gender',
    data_type: 'enum',
    allowed_values: ['Men', 'Women', 'Unisex', 'Kids'],
    synonyms: { "Men's": 'Men', "Women's": 'Women', 'M': 'Men', 'F': 'Women' },
    import: true,
    import_required: false,
  });
  
  mockRegistryMap.set('department', {
    id: 'department',
    attribute_id: 'department',
    label: 'Department',
    data_type: 'enum',
    allowed_values: ['Footwear', 'Apparel', 'Accessories'],
    import: true,
    import_required: false,
  });
  
  mockRegistryMap.set('category', {
    id: 'category',
    attribute_id: 'category',
    label: 'Category',
    data_type: 'string',
    import: true,
    import_required: false,
  });
  
  mockRegistryMap.set('heel_height', {
    id: 'heel_height',
    attribute_id: 'heel_height',
    label: 'Heel Height',
    data_type: 'number',
    import: true,
    import_required: false,
  });
  
  mockRegistryMap.set('is_active', {
    id: 'is_active',
    attribute_id: 'is_active',
    label: 'Is Active',
    data_type: 'boolean',
    import: true,
    import_required: false,
  });
  
  mockRegistryMap.set('launch_date', {
    id: 'launch_date',
    attribute_id: 'launch_date',
    label: 'Launch Date',
    data_type: 'date',
    import: true,
    import_required: false,
  });
  
  mockRegistryMap.set('features', {
    id: 'features',
    attribute_id: 'features',
    label: 'Features',
    data_type: 'multiSelect',
    allowed_values: ['Waterproof', 'Breathable', 'Lightweight', 'Cushioned'],
    import: true,
    import_required: false,
  });
  
  mockRegistryMap.set('internal_notes', {
    id: 'internal_notes',
    attribute_id: 'internal_notes',
    label: 'Internal Notes',
    data_type: 'string',
    import: false, // Not importable
    import_required: false,
  });
  
  mockRegistryMap.set('required_attr', {
    id: 'required_attr',
    attribute_id: 'required_attr',
    label: 'Required Attribute',
    data_type: 'string',
    import: true,
    import_required: false, // Changed to false for most tests
  });

  mockRegistryMap.set('strict_enum', {
    id: 'strict_enum',
    attribute_id: 'strict_enum',
    label: 'Strict Enum',
    data_type: 'enum',
    allowed_values: ['Option1', 'Option2'],
    import: true,
    import_strict: true, // Unknown values are blocking errors
  });
});

describe('LP-2.1.8: Attribute Validator', () => {
  describe('MPN Validation', () => {
    it('should return error when MPN is missing', () => {
      const row = { 'SKU': 'SKU-001', 'gender': 'Men' };
      const result = validateRow(row, 1, mockRegistryMap);
      
      expect(result.status).toBe('invalid');
      expect(result.errors).toHaveLength(1);
      expect(result.errors[0].code).toBe('missing_mpn');
      expect(result.mpn).toBe('');
    });
    
    it('should return error when MPN is empty string', () => {
      const row = { 'MPN': '', 'SKU': 'SKU-001' };
      const result = validateRow(row, 1, mockRegistryMap);
      
      expect(result.status).toBe('invalid');
      expect(result.errors[0].code).toBe('missing_mpn');
    });
    
    it('should accept valid MPN', () => {
      const row = { 'MPN': 'DZ5485-410', 'SKU': 'SKU-001' };
      const result = validateRow(row, 1, mockRegistryMap);
      
      expect(result.mpn).toBe('DZ5485-410');
      expect(result.normalizedValues['mpn']).toBe('DZ5485-410');
    });
    
    it('should handle lowercase mpn column', () => {
      const row = { 'mpn': 'GX7918', 'SKU': 'SKU-001' };
      const result = validateRow(row, 1, mockRegistryMap);
      
      expect(result.mpn).toBe('GX7918');
    });
  });
  
  describe('Import Flag Validation', () => {
    it('should reject attributes with import: false', () => {
      const row = { 'MPN': 'TEST-001', 'internal_notes': 'secret notes' };
      const result = validateRow(row, 1, mockRegistryMap);
      
      expect(result.status).toBe('invalid');
      expect(result.errors.some(e => e.code === 'attribute_not_importable')).toBe(true);
      expect(result.errors.find(e => e.code === 'attribute_not_importable')?.attribute).toBe('internal_notes');
    });
    
    it('should accept attributes with import: true', () => {
      const row = { 'MPN': 'TEST-001', 'category': 'Sneakers' };
      const result = validateRow(row, 1, mockRegistryMap);
      
      expect(result.status).toBe('valid');
      expect(result.normalizedValues['category']).toBe('Sneakers');
    });
  });
  
  describe('Enum Validation', () => {
    it('should accept valid enum value', () => {
      const row = { 'MPN': 'TEST-001', 'gender': 'Men' };
      const result = validateRow(row, 1, mockRegistryMap);
      
      expect(result.status).toBe('valid');
      expect(result.normalizedValues['gender']).toBe('Men');
    });
    
    it('should map synonym to canonical value', () => {
      const row = { 'MPN': 'TEST-001', 'gender': "Men's" };
      const result = validateRow(row, 1, mockRegistryMap);
      
      expect(result.status).toBe('valid');
      expect(result.normalizedValues['gender']).toBe('Men');
    });
    
    it('should warn on unknown enum value (non-strict)', () => {
      const row = { 'MPN': 'TEST-001', 'gender': 'InvalidGender' };
      const result = validateRow(row, 1, mockRegistryMap);
      
      expect(result.status).toBe('valid_with_warnings');
      expect(result.warnings.some(w => w.code === 'enum_unknown')).toBe(true);
      expect(result.normalizedValues['gender']).toBe('InvalidGender'); // Keeps raw value
    });
    
    it('should error on unknown enum value with import_strict: true', () => {
      const row = { 'MPN': 'TEST-001', 'strict_enum': 'InvalidOption' };
      const result = validateRow(row, 1, mockRegistryMap);
      
      expect(result.status).toBe('invalid');
      expect(result.errors.some(e => e.code === 'enum_invalid')).toBe(true);
    });
    
    it('should handle case-insensitive enum matching', () => {
      const row = { 'MPN': 'TEST-001', 'gender': 'men' };
      const result = validateRow(row, 1, mockRegistryMap);
      
      expect(result.status).toBe('valid');
      expect(result.normalizedValues['gender']).toBe('Men');
    });
  });
  
  describe('MultiSelect Validation', () => {
    it('should parse pipe-delimited multiSelect values', () => {
      const row = { 'MPN': 'TEST-001', 'features': 'Waterproof|Breathable' };
      const result = validateRow(row, 1, mockRegistryMap);
      
      expect(result.status).toBe('valid');
      expect(result.normalizedValues['features']).toEqual(['Waterproof', 'Breathable']);
    });
    
    it('should parse comma-delimited multiSelect values', () => {
      const row = { 'MPN': 'TEST-001', 'features': 'Lightweight,Cushioned' };
      const result = validateRow(row, 1, mockRegistryMap);
      
      expect(result.status).toBe('valid');
      expect(result.normalizedValues['features']).toEqual(['Lightweight', 'Cushioned']);
    });
    
    it('should warn on unknown multiSelect values', () => {
      const row = { 'MPN': 'TEST-001', 'features': 'Waterproof|Unknown' };
      const result = validateRow(row, 1, mockRegistryMap);
      
      expect(result.status).toBe('valid_with_warnings');
      expect(result.warnings.some(w => w.code === 'multi_select_unknown')).toBe(true);
    });
  });
  
  describe('Number Validation', () => {
    it('should accept valid number', () => {
      const row = { 'MPN': 'TEST-001', 'heel_height': 99 };
      const result = validateRow(row, 1, mockRegistryMap);
      
      expect(result.status).toBe('valid');
      expect(result.normalizedValues['heel_height']).toBe(99);
    });
    
    it('should parse string number', () => {
      const row = { 'MPN': 'TEST-001', 'heel_height': '149' };
      const result = validateRow(row, 1, mockRegistryMap);
      
      expect(result.status).toBe('valid');
      expect(result.normalizedValues['heel_height']).toBe(149);
    });
    
    it('should error on non-numeric value', () => {
      const row = { 'MPN': 'TEST-001', 'heel_height': 'not-a-number' };
      const result = validateRow(row, 1, mockRegistryMap);
      
      expect(result.status).toBe('invalid');
      expect(result.errors.some(e => e.code === 'invalid_number')).toBe(true);
    });
  });
  
  describe('Boolean Validation', () => {
    it('should accept true/false', () => {
      const row = { 'MPN': 'TEST-001', 'is_active': true };
      const result = validateRow(row, 1, mockRegistryMap);
      
      expect(result.status).toBe('valid');
      expect(result.normalizedValues['is_active']).toBe(true);
    });
    
    it('should parse yes/no', () => {
      const row = { 'MPN': 'TEST-001', 'is_active': 'yes' };
      const result = validateRow(row, 1, mockRegistryMap);
      
      expect(result.status).toBe('valid');
      expect(result.normalizedValues['is_active']).toBe(true);
    });
    
    it('should parse 1/0', () => {
      const row = { 'MPN': 'TEST-001', 'is_active': '0' };
      const result = validateRow(row, 1, mockRegistryMap);
      
      expect(result.status).toBe('valid');
      expect(result.normalizedValues['is_active']).toBe(false);
    });
    
    it('should error on invalid boolean', () => {
      const row = { 'MPN': 'TEST-001', 'is_active': 'maybe' };
      const result = validateRow(row, 1, mockRegistryMap);
      
      expect(result.status).toBe('invalid');
      expect(result.errors.some(e => e.code === 'invalid_boolean')).toBe(true);
    });
  });
  
  describe('Date Validation', () => {
    it('should accept ISO date', () => {
      const row = { 'MPN': 'TEST-001', 'launch_date': '2025-01-15' };
      const result = validateRow(row, 1, mockRegistryMap);
      
      expect(result.status).toBe('valid');
      expect(result.normalizedValues['launch_date']).toMatch(/2025-01-15/);
    });
    
    it('should error on invalid date', () => {
      const row = { 'MPN': 'TEST-001', 'launch_date': 'not-a-date' };
      const result = validateRow(row, 1, mockRegistryMap);
      
      expect(result.status).toBe('invalid');
      expect(result.errors.some(e => e.code === 'invalid_date')).toBe(true);
    });
  });
  
  describe('Import Required Enforcement', () => {
    it('should error when import_required attribute is missing', () => {
      // Add a required attribute for this test
      mockRegistryMap.set('test_required', {
        id: 'test_required',
        attribute_id: 'test_required',
        label: 'Test Required',
        data_type: 'string',
        import: true,
        import_required: true, // Required for import
      });
      
      const row = { 'MPN': 'TEST-001', 'gender': 'Men' };
      const result = validateRow(row, 1, mockRegistryMap);
      
      expect(result.status).toBe('invalid');
      expect(result.errors.some(e => e.code === 'missing_required')).toBe(true);
      expect(result.errors.find(e => e.code === 'missing_required')?.attribute).toBe('test_required');
    });
    
    it('should accept when import_required attribute is present', () => {
      // Add a required attribute for this test
      mockRegistryMap.set('test_required', {
        id: 'test_required',
        attribute_id: 'test_required',
        label: 'Test Required',
        data_type: 'string',
        import: true,
        import_required: true,
      });
      
      const row = { 'MPN': 'TEST-001', 'test_required': 'value' };
      const result = validateRow(row, 1, mockRegistryMap);
      
      expect(result.status).toBe('valid');
    });
  });
  
  describe('Unknown Attributes', () => {
    it('should warn on unknown attributes', () => {
      const row = { 'MPN': 'TEST-001', 'unknown_attr': 'value' };
      const result = validateRow(row, 1, mockRegistryMap);
      
      // Should still be valid (unknown attrs are warnings, not errors)
      expect(result.warnings.some(w => w.code === 'unknown_attribute')).toBe(true);
    });
  });
  
  describe('Column Mapping', () => {
    it('should map Gender column to gender attribute', () => {
      const row = { 'MPN': 'TEST-001', 'Gender': 'Men' };
      const result = validateRow(row, 1, mockRegistryMap);
      
      expect(result.normalizedValues['gender']).toBe('Men');
    });
    
    it('should map Department column to department attribute', () => {
      const row = { 'MPN': 'TEST-001', 'Department': 'Footwear' };
      const result = validateRow(row, 1, mockRegistryMap);
      
      expect(result.normalizedValues['department']).toBe('Footwear');
    });
  });
});
