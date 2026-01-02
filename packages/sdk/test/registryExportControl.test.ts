/**
 * Registry Export Control Tests
 * LP-smart-rules-registry-1.0.0
 * 
 * Tests for registry export control fields and validation.
 */

import { describe, it, expect } from 'vitest';
import {
  getAttributeRegistry,
  getAttributeById,
  isExportable,
  isRequiredForExport,
  isInternalOnly,
  getExportMeta,
  getExportableAttributes,
  getRequiredForExportAttributes,
  getInternalOnlyAttributes,
  getAttributesForTarget,
  validateCanonicalRegistry,
  safeValidateCanonicalRegistry,
  validateExportControlConsistency,
  validateRegistryExportConsistency,
  RegistryAttributeSchema,
} from '../src';

// ============================================================================
// Export Control Field Tests
// ============================================================================

describe('Export Control Fields', () => {
  describe('isExportable', () => {
    it('should return true for exportable attributes', () => {
      expect(isExportable('gender')).toBe(true);
      expect(isExportable('department')).toBe(true);
      expect(isExportable('brand')).toBe(true);
    });

    it('should return false for internal-only attributes', () => {
      expect(isExportable('product_is_active')).toBe(false);
      expect(isExportable('status')).toBe(false);
    });

    it('should return true for unknown attributes (pass-through)', () => {
      expect(isExportable('unknown_attribute_xyz')).toBe(true);
    });
  });

  describe('isRequiredForExport', () => {
    it('should return true for required export attributes', () => {
      expect(isRequiredForExport('gender')).toBe(true);
      expect(isRequiredForExport('mpn')).toBe(true);
      expect(isRequiredForExport('name')).toBe(true);
    });

    it('should return false for non-required attributes', () => {
      expect(isRequiredForExport('height')).toBe(false);
      expect(isRequiredForExport('weight')).toBe(false);
    });

    it('should return false for unknown attributes', () => {
      expect(isRequiredForExport('unknown_attribute_xyz')).toBe(false);
    });
  });

  describe('isInternalOnly', () => {
    it('should return true for internal-only attributes', () => {
      expect(isInternalOnly('product_is_active')).toBe(true);
      expect(isInternalOnly('status')).toBe(true);
      expect(isInternalOnly('launch_date')).toBe(true);
    });

    it('should return false for exportable attributes', () => {
      expect(isInternalOnly('gender')).toBe(false);
      expect(isInternalOnly('brand')).toBe(false);
    });
  });

  describe('getExportMeta', () => {
    it('should return export metadata for configured attributes', () => {
      const genderMeta = getExportMeta('gender');
      expect(genderMeta).toBeDefined();
      expect(genderMeta?.key).toBe('gender');
      expect(genderMeta?.targets).toContain('shopify');
      expect(genderMeta?.targets).toContain('google');
    });

    it('should return undefined for attributes without export metadata', () => {
      expect(getExportMeta('product_is_active')).toBeUndefined();
    });

    it('should include omitIfEmpty for dimension attributes', () => {
      const heightMeta = getExportMeta('height');
      expect(heightMeta?.omitIfEmpty).toBe(true);
    });
  });
});

// ============================================================================
// Collection Helper Tests
// ============================================================================

describe('Export Control Collection Helpers', () => {
  describe('getExportableAttributes', () => {
    it('should return only exportable attributes', () => {
      const exportable = getExportableAttributes();
      expect(exportable.length).toBeGreaterThan(0);
      
      // All returned attributes should be exportable
      for (const attr of exportable) {
        expect(attr.internalOnly).not.toBe(true);
        expect(attr.exportable).not.toBe(false);
      }
    });

    it('should not include internal-only attributes', () => {
      const exportable = getExportableAttributes();
      const ids = exportable.map(a => a.attribute_id);
      
      expect(ids).not.toContain('product_is_active');
      expect(ids).not.toContain('status');
    });
  });

  describe('getRequiredForExportAttributes', () => {
    it('should return attributes required for export', () => {
      const required = getRequiredForExportAttributes();
      expect(required.length).toBeGreaterThan(0);
      
      // All returned attributes should be required for export
      for (const attr of required) {
        expect(attr.requiredForExport === true || attr.required_for_export === true).toBe(true);
      }
    });

    it('should include key product attributes', () => {
      const required = getRequiredForExportAttributes();
      const ids = required.map(a => a.attribute_id);
      
      expect(ids).toContain('mpn');
      expect(ids).toContain('name');
      expect(ids).toContain('gender');
    });
  });

  describe('getInternalOnlyAttributes', () => {
    it('should return only internal-only attributes', () => {
      const internal = getInternalOnlyAttributes();
      expect(internal.length).toBeGreaterThan(0);
      
      // All returned attributes should be internal-only
      for (const attr of internal) {
        expect(attr.internalOnly).toBe(true);
      }
    });
  });

  describe('getAttributesForTarget', () => {
    it('should return attributes for Shopify target', () => {
      const shopify = getAttributesForTarget('shopify');
      expect(shopify.length).toBeGreaterThan(0);
      
      const ids = shopify.map(a => a.attribute_id);
      expect(ids).toContain('gender');
      expect(ids).toContain('brand');
    });

    it('should return attributes for Google target', () => {
      const google = getAttributesForTarget('google');
      expect(google.length).toBeGreaterThan(0);
      
      const ids = google.map(a => a.attribute_id);
      expect(ids).toContain('gender');
      expect(ids).toContain('age_group');
    });
  });
});

// ============================================================================
// Registry Validation Tests
// ============================================================================

describe('Registry Validation', () => {
  describe('RegistryAttributeSchema', () => {
    it('should validate a valid attribute with export fields', () => {
      const validAttr = {
        attribute_id: 'test_attr',
        label: 'Test Attribute',
        data_type: 'text',
        exportable: true,
        requiredForExport: false,
        internalOnly: false,
        export: {
          key: 'test',
          targets: ['shopify'],
        },
      };
      
      const result = RegistryAttributeSchema.safeParse(validAttr);
      expect(result.success).toBe(true);
    });

    it('should reject invalid exportable value (non-boolean)', () => {
      const invalidAttr = {
        attribute_id: 'test_attr',
        label: 'Test Attribute',
        exportable: 'yes', // Should be boolean
      };
      
      const result = RegistryAttributeSchema.safeParse(invalidAttr);
      expect(result.success).toBe(false);
    });

    it('should reject invalid export target', () => {
      const invalidAttr = {
        attribute_id: 'test_attr',
        label: 'Test Attribute',
        export: {
          targets: ['invalid_target'],
        },
      };
      
      const result = RegistryAttributeSchema.safeParse(invalidAttr);
      expect(result.success).toBe(false);
    });
  });

  describe('validateCanonicalRegistry', () => {
    it('should validate the actual registry file', () => {
      const registry = getAttributeRegistry();
      const result = safeValidateCanonicalRegistry(registry);
      expect(result.success).toBe(true);
    });

    it('should require version in semver format', () => {
      const invalidRegistry = {
        version: 'invalid',
        attributes: [{ attribute_id: 'test', label: 'Test' }],
      };
      
      const result = safeValidateCanonicalRegistry(invalidRegistry);
      expect(result.success).toBe(false);
    });
  });

  describe('validateExportControlConsistency', () => {
    it('should pass for consistent attribute', () => {
      const attr = {
        attribute_id: 'test',
        label: 'Test',
        exportable: true,
        requiredForExport: true,
        internalOnly: false,
      };
      
      const result = validateExportControlConsistency(attr);
      expect(result.valid).toBe(true);
    });

    it('should fail when internalOnly=true and exportable=true', () => {
      const attr = {
        attribute_id: 'test',
        label: 'Test',
        exportable: true,
        internalOnly: true,
      };
      
      const result = validateExportControlConsistency(attr);
      expect(result.valid).toBe(false);
      expect(result.message).toContain('inconsistent');
    });

    it('should fail when requiredForExport=true and exportable=false', () => {
      const attr = {
        attribute_id: 'test',
        label: 'Test',
        exportable: false,
        requiredForExport: true,
      };
      
      const result = validateExportControlConsistency(attr);
      expect(result.valid).toBe(false);
      expect(result.message).toContain('inconsistent');
    });
  });

  describe('validateRegistryExportConsistency', () => {
    it('should pass for consistent registry', () => {
      const registry = getAttributeRegistry();
      const result = safeValidateCanonicalRegistry(registry);
      
      if (result.success) {
        const errors = validateRegistryExportConsistency(result.data);
        expect(errors).toHaveLength(0);
      }
    });
  });
});

// ============================================================================
// Registry Content Tests
// ============================================================================

describe('Registry Content (LP-smart-rules-registry-1.0.0)', () => {
  it('should have version 1.1.0 or higher', () => {
    const registry = getAttributeRegistry();
    const [major, minor] = registry.version.split('.').map(Number);
    expect(major).toBeGreaterThanOrEqual(1);
    if (major === 1) {
      expect(minor).toBeGreaterThanOrEqual(1);
    }
  });

  it('should have exportable field on all attributes', () => {
    const registry = getAttributeRegistry();
    for (const attr of registry.attributes) {
      expect(typeof attr.exportable).toBe('boolean');
    }
  });

  it('should have internalOnly field on all attributes', () => {
    const registry = getAttributeRegistry();
    for (const attr of registry.attributes) {
      expect(typeof attr.internalOnly).toBe('boolean');
    }
  });

  it('should have requiredForExport field on all attributes', () => {
    const registry = getAttributeRegistry();
    for (const attr of registry.attributes) {
      expect(typeof attr.requiredForExport).toBe('boolean');
    }
  });

  describe('Key Attribute Export Settings', () => {
    it('gender should be exportable with targets', () => {
      const gender = getAttributeById('gender');
      expect(gender?.exportable).toBe(true);
      expect(gender?.requiredForExport).toBe(true);
      expect(gender?.export?.targets).toContain('shopify');
      expect(gender?.export?.targets).toContain('google');
    });

    it('department should be exportable with targets', () => {
      const dept = getAttributeById('department');
      expect(dept?.exportable).toBe(true);
      expect(dept?.export?.targets).toContain('shopify');
    });

    it('dimensions should have omitIfEmpty', () => {
      const height = getAttributeById('height');
      const width = getAttributeById('width');
      const length = getAttributeById('length');
      
      expect(height?.export?.omitIfEmpty).toBe(true);
      expect(width?.export?.omitIfEmpty).toBe(true);
      expect(length?.export?.omitIfEmpty).toBe(true);
    });

    it('product_is_active should be internal-only', () => {
      const attr = getAttributeById('product_is_active');
      expect(attr?.internalOnly).toBe(true);
      expect(attr?.exportable).toBe(false);
    });
  });
});
