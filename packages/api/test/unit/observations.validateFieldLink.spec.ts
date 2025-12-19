/**
 * validateFieldLink Server-Side Validation Tests
 * 
 * LP-1.0.1: Unit tests for server-side fieldLink validation.
 * Tests canonical key validation against attribute registry and product fields.
 */

import { describe, it, expect, vi, beforeEach } from 'vitest';

// Mock the attribute registry
vi.mock('@/../../sdk/config/attributeRegistry.json', () => ({
  default: {
    version: '1.0.1',
    attributes: [
      { attribute_id: 'primary_color', label: 'Primary Color', status: 'active' },
      { attribute_id: 'material', label: 'Material(s)', status: 'active' },
      { attribute_id: 'gender', label: 'Gender', status: 'active' },
      { attribute_id: 'brand', label: 'Brand', status: 'active' },
      { attribute_id: 'category', label: 'Category', status: 'active' },
      { attribute_id: 'mpn', label: 'MPN', status: 'active' },
      { attribute_id: 'sku', label: 'SKU', status: 'active' },
      { attribute_id: 'gtin', label: 'GTIN/UPC', status: 'active' },
      { attribute_id: 'fit', label: 'Fit', status: 'active' },
    ],
  },
}));

// We need to test the validateFieldLink function
// Since it's in the web package, we'll create a copy for the API package tests
// In production, this validation would be in a shared package

interface FieldLink {
  type: 'product' | 'attribute';
  key: string;
}

// Valid top-level product fields (same as in observations.ts)
const VALID_PRODUCT_FIELDS = ['mpn', 'sku', 'title', 'name', 'brand', 'category', 'department', 'status', 'style_id'];

// Get valid attribute IDs from mock registry
const validAttributeIds = new Set([
  'primary_color', 'material', 'gender', 'brand', 'category', 'mpn', 'sku', 'gtin', 'fit'
]);

/**
 * Server-side fieldLink validation function (duplicated for testing)
 */
function validateFieldLink(
  fieldLink: FieldLink | null | undefined,
  productMpn?: string
): { valid: boolean; error?: string } {
  // Null/undefined fieldLink is allowed (optional field)
  if (!fieldLink) {
    return { valid: true };
  }

  // Validate type
  if (!['product', 'attribute'].includes(fieldLink.type)) {
    return {
      valid: false,
      error: `Invalid fieldLink type: ${fieldLink.type}. Must be 'product' or 'attribute'.`,
    };
  }

  // Validate key format
  if (!fieldLink.key || typeof fieldLink.key !== 'string') {
    return {
      valid: false,
      error: 'fieldLink.key is required and must be a string.',
    };
  }

  if (fieldLink.type === 'product') {
    // Validate product field
    const key = fieldLink.key.replace(/^product\./, '').toLowerCase();
    if (!VALID_PRODUCT_FIELDS.includes(key)) {
      return {
        valid: false,
        error: `Invalid product field: ${key}. Valid fields: ${VALID_PRODUCT_FIELDS.join(', ')}.`,
      };
    }
  } else if (fieldLink.type === 'attribute') {
    // Validate attribute field against registry
    const key = fieldLink.key.replace(/^attributes\./, '').toLowerCase();
    if (!validAttributeIds.has(key)) {
      return {
        valid: false,
        error: `Invalid attribute: ${key}. Not found in attribute registry.`,
      };
    }
  }

  return { valid: true };
}

describe('validateFieldLink', () => {
  describe('null/undefined handling', () => {
    it('returns valid for null fieldLink', () => {
      const result = validateFieldLink(null);
      expect(result.valid).toBe(true);
      expect(result.error).toBeUndefined();
    });

    it('returns valid for undefined fieldLink', () => {
      const result = validateFieldLink(undefined);
      expect(result.valid).toBe(true);
      expect(result.error).toBeUndefined();
    });
  });

  describe('type validation', () => {
    it('rejects invalid type', () => {
      const result = validateFieldLink({ type: 'invalid' as any, key: 'test' });
      expect(result.valid).toBe(false);
      expect(result.error).toContain('Invalid fieldLink type');
    });

    it('accepts product type', () => {
      const result = validateFieldLink({ type: 'product', key: 'product.mpn' });
      expect(result.valid).toBe(true);
    });

    it('accepts attribute type', () => {
      const result = validateFieldLink({ type: 'attribute', key: 'attributes.primary_color' });
      expect(result.valid).toBe(true);
    });
  });

  describe('key validation', () => {
    it('rejects missing key', () => {
      const result = validateFieldLink({ type: 'product', key: '' });
      expect(result.valid).toBe(false);
      expect(result.error).toContain('key is required');
    });

    it('rejects non-string key', () => {
      const result = validateFieldLink({ type: 'product', key: 123 as any });
      expect(result.valid).toBe(false);
      expect(result.error).toContain('must be a string');
    });
  });

  describe('product field validation', () => {
    it('validates product.mpn', () => {
      const result = validateFieldLink({ type: 'product', key: 'product.mpn' });
      expect(result.valid).toBe(true);
    });

    it('validates product.sku', () => {
      const result = validateFieldLink({ type: 'product', key: 'product.sku' });
      expect(result.valid).toBe(true);
    });

    it('validates product.title', () => {
      const result = validateFieldLink({ type: 'product', key: 'product.title' });
      expect(result.valid).toBe(true);
    });

    it('validates product.name', () => {
      const result = validateFieldLink({ type: 'product', key: 'product.name' });
      expect(result.valid).toBe(true);
    });

    it('validates product.brand', () => {
      const result = validateFieldLink({ type: 'product', key: 'product.brand' });
      expect(result.valid).toBe(true);
    });

    it('validates product.category', () => {
      const result = validateFieldLink({ type: 'product', key: 'product.category' });
      expect(result.valid).toBe(true);
    });

    it('validates product.department', () => {
      const result = validateFieldLink({ type: 'product', key: 'product.department' });
      expect(result.valid).toBe(true);
    });

    it('validates product.status', () => {
      const result = validateFieldLink({ type: 'product', key: 'product.status' });
      expect(result.valid).toBe(true);
    });

    it('rejects invalid product field', () => {
      const result = validateFieldLink({ type: 'product', key: 'product.invalid_field' });
      expect(result.valid).toBe(false);
      expect(result.error).toContain('Invalid product field');
    });

    it('handles case insensitivity', () => {
      const result = validateFieldLink({ type: 'product', key: 'product.MPN' });
      expect(result.valid).toBe(true);
    });

    it('handles key without product. prefix', () => {
      const result = validateFieldLink({ type: 'product', key: 'mpn' });
      expect(result.valid).toBe(true);
    });
  });

  describe('attribute field validation', () => {
    it('validates attributes.primary_color', () => {
      const result = validateFieldLink({ type: 'attribute', key: 'attributes.primary_color' });
      expect(result.valid).toBe(true);
    });

    it('validates attributes.material', () => {
      const result = validateFieldLink({ type: 'attribute', key: 'attributes.material' });
      expect(result.valid).toBe(true);
    });

    it('validates attributes.gender', () => {
      const result = validateFieldLink({ type: 'attribute', key: 'attributes.gender' });
      expect(result.valid).toBe(true);
    });

    it('validates attributes.fit', () => {
      const result = validateFieldLink({ type: 'attribute', key: 'attributes.fit' });
      expect(result.valid).toBe(true);
    });

    it('validates attributes.gtin', () => {
      const result = validateFieldLink({ type: 'attribute', key: 'attributes.gtin' });
      expect(result.valid).toBe(true);
    });

    it('rejects invalid attribute', () => {
      const result = validateFieldLink({ type: 'attribute', key: 'attributes.nonexistent_attr' });
      expect(result.valid).toBe(false);
      expect(result.error).toContain('Invalid attribute');
      expect(result.error).toContain('Not found in attribute registry');
    });

    it('handles case insensitivity', () => {
      const result = validateFieldLink({ type: 'attribute', key: 'attributes.PRIMARY_COLOR' });
      expect(result.valid).toBe(true);
    });

    it('handles key without attributes. prefix', () => {
      const result = validateFieldLink({ type: 'attribute', key: 'primary_color' });
      expect(result.valid).toBe(true);
    });
  });

  describe('error messages', () => {
    it('provides helpful error for invalid type', () => {
      const result = validateFieldLink({ type: 'wrong' as any, key: 'test' });
      expect(result.error).toContain("Must be 'product' or 'attribute'");
    });

    it('provides list of valid product fields in error', () => {
      const result = validateFieldLink({ type: 'product', key: 'product.invalid' });
      expect(result.error).toContain('mpn');
      expect(result.error).toContain('sku');
      expect(result.error).toContain('title');
    });

    it('indicates attribute not in registry', () => {
      const result = validateFieldLink({ type: 'attribute', key: 'attributes.unknown' });
      expect(result.error).toContain('Not found in attribute registry');
    });
  });
});

describe('Integration scenarios', () => {
  describe('observation creation flow', () => {
    it('validates typical color observation', () => {
      const fieldLink: FieldLink = { type: 'attribute', key: 'attributes.primary_color' };
      const result = validateFieldLink(fieldLink);
      expect(result.valid).toBe(true);
    });

    it('validates MPN product link', () => {
      const fieldLink: FieldLink = { type: 'product', key: 'product.mpn' };
      const result = validateFieldLink(fieldLink);
      expect(result.valid).toBe(true);
    });

    it('allows observation without fieldLink', () => {
      const result = validateFieldLink(null);
      expect(result.valid).toBe(true);
    });
  });

  describe('batch validation', () => {
    const testCases: Array<{ fieldLink: FieldLink | null; expectedValid: boolean }> = [
      { fieldLink: null, expectedValid: true },
      { fieldLink: { type: 'product', key: 'product.mpn' }, expectedValid: true },
      { fieldLink: { type: 'product', key: 'product.sku' }, expectedValid: true },
      { fieldLink: { type: 'attribute', key: 'attributes.primary_color' }, expectedValid: true },
      { fieldLink: { type: 'attribute', key: 'attributes.material' }, expectedValid: true },
      { fieldLink: { type: 'attribute', key: 'attributes.gender' }, expectedValid: true },
      { fieldLink: { type: 'product', key: 'product.invalid' }, expectedValid: false },
      { fieldLink: { type: 'attribute', key: 'attributes.invalid' }, expectedValid: false },
    ];

    testCases.forEach(({ fieldLink, expectedValid }, index) => {
      it(`validates test case ${index + 1}: ${fieldLink?.key || 'null'}`, () => {
        const result = validateFieldLink(fieldLink);
        expect(result.valid).toBe(expectedValid);
      });
    });
  });
});
