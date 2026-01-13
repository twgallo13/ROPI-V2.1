/**
 * Phase 2: Domain Validation Tests
 * LP-attr-enforce-2.1.0
 * 
 * Tests for registry-based attribute domain validation.
 */

import { describe, it, expect } from 'vitest';
import {
  getAttributeRegistry,
  getAttributeById,
  getAllowedValues,
  validateAttributeDomain,
  validateAttributeDomains,
  validateProductWithDomains,
  validateAttributesOnly,
  getRegistryVersion,
} from '../src';

// ============================================================================
// Registry Loader Tests
// ============================================================================

describe('Registry Loader', () => {
  it('should load the attribute registry', () => {
    const registry = getAttributeRegistry();
    expect(registry).toBeDefined();
    expect(registry.version).toBeDefined();
    expect(registry.attributes).toBeInstanceOf(Array);
    expect(registry.attributes.length).toBeGreaterThan(0);
  });

  it('should return registry version', () => {
    const version = getRegistryVersion();
    expect(version).toBeDefined();
    expect(typeof version).toBe('string');
  });

  it('should find attribute by ID', () => {
    const gender = getAttributeById('gender');
    expect(gender).toBeDefined();
    expect(gender?.attribute_id).toBe('gender');
    expect(gender?.data_type).toBe('select');
  });

  it('should normalize attribute ID lookup (case insensitive)', () => {
    const gender1 = getAttributeById('gender');
    const gender2 = getAttributeById('GENDER');
    const gender3 = getAttributeById('Gender');
    expect(gender1).toEqual(gender2);
    expect(gender2).toEqual(gender3);
  });

  it('should get allowed values for gender', () => {
    const values = getAllowedValues('gender');
    expect(values).toBeInstanceOf(Array);
    expect(values).toContain("Men's");
    expect(values).toContain("Women's");
    expect(values).toContain('Unisex');
  });

  it('should get allowed values for primary_color', () => {
    const values = getAllowedValues('primary_color');
    expect(values).toBeInstanceOf(Array);
    expect(values).toContain('Black');
    expect(values).toContain('White');
    expect(values).toContain('Blue');
  });

  it('should return undefined for attribute without allowed_values', () => {
    const values = getAllowedValues('sku');
    expect(values).toBeUndefined();
  });

  it('should return undefined for non-existent attribute', () => {
    const values = getAllowedValues('non_existent_attribute_xyz');
    expect(values).toBeUndefined();
  });
});

// ============================================================================
// Single Attribute Domain Validation Tests
// ============================================================================

describe('validateAttributeDomain', () => {
  describe('gender validation', () => {
    it('should accept valid gender value: Men\'s', () => {
      const result = validateAttributeDomain('gender', "Men's");
      expect(result.valid).toBe(true);
      expect(result.attributeId).toBe('gender');
    });

    it('should accept valid gender value: Women\'s', () => {
      const result = validateAttributeDomain('gender', "Women's");
      expect(result.valid).toBe(true);
    });

    it('should accept valid gender value: Unisex', () => {
      const result = validateAttributeDomain('gender', 'Unisex');
      expect(result.valid).toBe(true);
    });

    it('should reject invalid gender value', () => {
      const result = validateAttributeDomain('gender', 'InvalidGender');
      expect(result.valid).toBe(false);
      expect(result.message).toContain('Invalid value');
      expect(result.message).toContain('InvalidGender');
      expect(result.allowedValues).toBeDefined();
    });

    it('should be case-insensitive for gender', () => {
      const result1 = validateAttributeDomain('gender', "men's");
      const result2 = validateAttributeDomain('gender', "WOMEN'S");
      expect(result1.valid).toBe(true);
      expect(result2.valid).toBe(true);
    });
  });

  describe('primary_color validation', () => {
    it('should accept valid color: Black', () => {
      const result = validateAttributeDomain('primary_color', 'Black');
      expect(result.valid).toBe(true);
    });

    it('should accept valid color: Multi Color', () => {
      const result = validateAttributeDomain('primary_color', 'Multi Color');
      expect(result.valid).toBe(true);
    });

    it('should reject invalid color', () => {
      const result = validateAttributeDomain('primary_color', 'Chartreuse');
      expect(result.valid).toBe(false);
      expect(result.message).toContain('Invalid value');
    });
  });

  describe('edge cases', () => {
    it('should pass through empty string', () => {
      const result = validateAttributeDomain('gender', '');
      expect(result.valid).toBe(true);
    });

    it('should pass through null', () => {
      const result = validateAttributeDomain('gender', null);
      expect(result.valid).toBe(true);
    });

    it('should pass through undefined', () => {
      const result = validateAttributeDomain('gender', undefined);
      expect(result.valid).toBe(true);
    });

    it('should pass through unknown attributes', () => {
      const result = validateAttributeDomain('custom_field_xyz', 'any value');
      expect(result.valid).toBe(true);
      expect(result.message).toContain('not found in registry');
    });

    it('should pass through attributes without allowed_values', () => {
      const result = validateAttributeDomain('sku', 'ABC123');
      expect(result.valid).toBe(true);
    });
  });

  describe('multiSelect validation (CodeRabbit feedback)', () => {
    it('should accept valid array of websites', () => {
      const result = validateAttributeDomain('website', ['shiekh.com']);
      expect(result.valid).toBe(true);
    });

    it('should accept multiple valid websites', () => {
      const result = validateAttributeDomain('website', ['shiekh.com', 'mltd.com']);
      expect(result.valid).toBe(true);
    });

    it('should reject array with invalid website', () => {
      const result = validateAttributeDomain('website', ['shiekh.com', 'invalid.com']);
      expect(result.valid).toBe(false);
      expect(result.message).toContain('invalid.com');
      expect(result.message).toContain('Invalid values');
    });

    it('should reject array with all invalid websites', () => {
      const result = validateAttributeDomain('website', ['bad-site.com', 'another-bad.com']);
      expect(result.valid).toBe(false);
      expect(result.message).toContain('bad-site.com');
      expect(result.message).toContain('another-bad.com');
    });
  });
});

// ============================================================================
// Bulk Attribute Validation Tests
// ============================================================================

describe('validateAttributeDomains', () => {
  it('should return empty array when all attributes are valid', () => {
    const attributes = {
      gender: "Men's",
      primary_color: 'Black',
    };
    const errors = validateAttributeDomains(attributes);
    expect(errors).toHaveLength(0);
  });

  it('should return errors for invalid attributes', () => {
    const attributes = {
      gender: 'InvalidGender',
      primary_color: 'InvalidColor',
    };
    const errors = validateAttributeDomains(attributes);
    expect(errors).toHaveLength(2);
    expect(errors[0].valid).toBe(false);
    expect(errors[1].valid).toBe(false);
  });

  it('should only return errors (not valid results)', () => {
    const attributes = {
      gender: "Men's", // valid
      primary_color: 'InvalidColor', // invalid
    };
    const errors = validateAttributeDomains(attributes);
    expect(errors).toHaveLength(1);
    expect(errors[0].attributeId).toBe('primary_color');
  });

  it('should handle mixed valid, invalid, and unknown attributes', () => {
    const attributes = {
      gender: "Women's", // valid
      primary_color: 'Chartreuse', // invalid
      custom_field: 'anything', // unknown (valid)
      sku: 'ABC123', // no domain (valid)
    };
    const errors = validateAttributeDomains(attributes);
    expect(errors).toHaveLength(1);
    expect(errors[0].attributeId).toBe('primary_color');
  });
});

// ============================================================================
// Product Validation with Domains Tests
// ============================================================================

describe('validateProductWithDomains', () => {
  const validProduct = {
    core: {
      sku: 'TEST-001',
      title: 'Test Product',
      brand: 'Test Brand',
      status: 'draft' as const,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    },
    attributes: {
      gender: "Men's",
      primary_color: 'Black',
      department: 'Clothing', // Valid value per SDK registry
    },
  };

  it('should validate product with valid attributes', () => {
    const result = validateProductWithDomains(validProduct);
    expect(result.success).toBe(true);
    expect(result.data).toBeDefined();
    expect(result.domainErrors).toHaveLength(0);
  });

  it('should fail schema validation for invalid product structure', () => {
    const invalidProduct = {
      core: {
        // missing required fields
      },
      attributes: {},
    };
    const result = validateProductWithDomains(invalidProduct);
    expect(result.success).toBe(false);
    expect(result.schemaErrors).toBeDefined();
  });

  it('should fail domain validation for invalid attribute values', () => {
    const productWithBadAttributes = {
      ...validProduct,
      attributes: {
        gender: 'InvalidGender',
        primary_color: 'Black',
      },
    };
    const result = validateProductWithDomains(productWithBadAttributes);
    expect(result.success).toBe(false);
    expect(result.domainErrors).toHaveLength(1);
    expect(result.domainErrors[0].attributeId).toBe('gender');
  });

  it('should report multiple domain errors', () => {
    const productWithMultipleBadAttributes = {
      ...validProduct,
      attributes: {
        gender: 'InvalidGender',
        primary_color: 'InvalidColor',
      },
    };
    const result = validateProductWithDomains(productWithMultipleBadAttributes);
    expect(result.success).toBe(false);
    expect(result.domainErrors.length).toBeGreaterThanOrEqual(2);
  });
});

// ============================================================================
// validateAttributesOnly Tests
// ============================================================================

describe('validateAttributesOnly', () => {
  it('should validate attributes directly without full product', () => {
    const errors = validateAttributesOnly({
      gender: "Men's",
      primary_color: 'Blue',
    });
    expect(errors).toHaveLength(0);
  });

  it('should return errors for invalid attributes', () => {
    const errors = validateAttributesOnly({
      gender: 'BadValue',
    });
    expect(errors).toHaveLength(1);
    expect(errors[0].attributeId).toBe('gender');
  });
});
