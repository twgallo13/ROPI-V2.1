/**
 * normalizeFieldLink Utility Tests
 * 
 * LP-1.0.1: Unit tests for the normalizeFieldLink helper.
 * Tests string normalization, alias resolution, and fieldLink generation.
 */

import { describe, it, expect } from 'vitest';
import {
  normalizeFieldLink,
  toSnakeCase,
  fieldLinkToDisplayString,
  legacyLinkedFieldToFieldLink,
  getFieldKeyWithoutPrefix,
} from '../src/utils/normalizeFieldLink';
import type { FieldLink } from '../src/types/fieldLink';

describe('toSnakeCase', () => {
  it('converts spaces to underscores', () => {
    expect(toSnakeCase('primary color')).toBe('primary_color');
  });

  it('converts hyphens to underscores', () => {
    expect(toSnakeCase('age-group')).toBe('age_group');
  });

  it('converts camelCase to snake_case', () => {
    expect(toSnakeCase('primaryColor')).toBe('primary_color');
  });

  it('handles mixed cases', () => {
    expect(toSnakeCase('Product Name')).toBe('product_name');
  });

  it('removes duplicate underscores', () => {
    expect(toSnakeCase('some__value')).toBe('some_value');
  });

  it('trims whitespace', () => {
    expect(toSnakeCase('  test  ')).toBe('test');
  });

  it('handles already snake_case strings', () => {
    expect(toSnakeCase('primary_color')).toBe('primary_color');
  });
});

describe('normalizeFieldLink', () => {
  describe('null/undefined handling', () => {
    it('returns null for null input', () => {
      expect(normalizeFieldLink(null)).toBeNull();
    });

    it('returns null for undefined input', () => {
      expect(normalizeFieldLink(undefined)).toBeNull();
    });

    it('returns null for empty string', () => {
      expect(normalizeFieldLink('')).toBeNull();
    });

    it('returns null for whitespace-only string', () => {
      expect(normalizeFieldLink('   ')).toBeNull();
    });
  });

  describe('explicit product. prefix', () => {
    it('normalizes product.mpn', () => {
      const result = normalizeFieldLink('product.mpn');
      expect(result).toEqual({
        type: 'product',
        key: 'product.mpn',
      });
    });

    it('normalizes product.title', () => {
      const result = normalizeFieldLink('product.title');
      expect(result).toEqual({
        type: 'product',
        key: 'product.title',
      });
    });

    it('normalizes with case insensitivity', () => {
      const result = normalizeFieldLink('Product.MPN');
      expect(result).toEqual({
        type: 'product',
        key: 'product.mpn',
      });
    });
  });

  describe('explicit attributes. prefix', () => {
    it('normalizes attributes.primary_color', () => {
      const result = normalizeFieldLink('attributes.primary_color');
      expect(result).toEqual({
        type: 'attribute',
        key: 'attributes.primary_color',
      });
    });

    it('normalizes attribute. (singular) prefix', () => {
      const result = normalizeFieldLink('attribute.gender');
      expect(result).toEqual({
        type: 'attribute',
        key: 'attributes.gender',
      });
    });

    it('normalizes with case insensitivity', () => {
      const result = normalizeFieldLink('Attributes.PrimaryColor');
      expect(result).toEqual({
        type: 'attribute',
        key: 'attributes.primary_color',
      });
    });
  });

  describe('product field aliases', () => {
    it('normalizes "mpn" to product.mpn', () => {
      const result = normalizeFieldLink('mpn');
      expect(result).toEqual({
        type: 'product',
        key: 'product.mpn',
      });
    });

    it('normalizes "sku" to product.sku', () => {
      const result = normalizeFieldLink('sku');
      expect(result).toEqual({
        type: 'product',
        key: 'product.sku',
      });
    });

    it('normalizes "title" to product.title', () => {
      const result = normalizeFieldLink('title');
      expect(result).toEqual({
        type: 'product',
        key: 'product.title',
      });
    });

    it('normalizes "manufacturer part number"', () => {
      const result = normalizeFieldLink('manufacturer part number');
      expect(result).toEqual({
        type: 'product',
        key: 'product.mpn',
      });
    });

    it('normalizes "brand name"', () => {
      const result = normalizeFieldLink('brand name');
      expect(result).toEqual({
        type: 'product',
        key: 'product.brand',
      });
    });
  });

  describe('attribute field aliases', () => {
    it('normalizes "color" to attributes.primary_color', () => {
      const result = normalizeFieldLink('color');
      expect(result).toEqual({
        type: 'attribute',
        key: 'attributes.primary_color',
      });
    });

    it('normalizes "main_color" to attributes.primary_color', () => {
      const result = normalizeFieldLink('main_color');
      expect(result).toEqual({
        type: 'attribute',
        key: 'attributes.primary_color',
      });
    });

    it('normalizes "gender" to attributes.gender', () => {
      const result = normalizeFieldLink('gender');
      expect(result).toEqual({
        type: 'attribute',
        key: 'attributes.gender',
      });
    });

    it('normalizes "material" to attributes.material', () => {
      const result = normalizeFieldLink('material');
      expect(result).toEqual({
        type: 'attribute',
        key: 'attributes.material',
      });
    });

    it('normalizes "age_group" to attributes.age_group', () => {
      const result = normalizeFieldLink('age_group');
      expect(result).toEqual({
        type: 'attribute',
        key: 'attributes.age_group',
      });
    });

    it('normalizes "closure" to attributes.closure_type', () => {
      const result = normalizeFieldLink('closure');
      expect(result).toEqual({
        type: 'attribute',
        key: 'attributes.closure_type',
      });
    });
  });

  describe('with attributeIds array', () => {
    const attributeIds = ['custom_field', 'another_custom'];

    it('matches against provided attributeIds', () => {
      const result = normalizeFieldLink('custom_field', attributeIds);
      expect(result).toEqual({
        type: 'attribute',
        key: 'attributes.custom_field',
      });
    });

    it('normalizes case when matching attributeIds', () => {
      const result = normalizeFieldLink('Custom Field', attributeIds);
      expect(result).toEqual({
        type: 'attribute',
        key: 'attributes.custom_field',
      });
    });
  });

  describe('unknown fields', () => {
    it('defaults unknown strings to attribute type', () => {
      const result = normalizeFieldLink('unknown_field_name');
      expect(result).toEqual({
        type: 'attribute',
        key: 'attributes.unknown_field_name',
      });
    });

    it('normalizes unknown strings to snake_case', () => {
      const result = normalizeFieldLink('Some Random Field');
      expect(result).toEqual({
        type: 'attribute',
        key: 'attributes.some_random_field',
      });
    });
  });
});

describe('fieldLinkToDisplayString', () => {
  it('returns empty string for null', () => {
    expect(fieldLinkToDisplayString(null)).toBe('');
  });

  it('returns empty string for undefined', () => {
    expect(fieldLinkToDisplayString(undefined)).toBe('');
  });

  it('returns the key for product fieldLink', () => {
    const fieldLink: FieldLink = { type: 'product', key: 'product.mpn' };
    expect(fieldLinkToDisplayString(fieldLink)).toBe('product.mpn');
  });

  it('returns the key for attribute fieldLink', () => {
    const fieldLink: FieldLink = { type: 'attribute', key: 'attributes.primary_color' };
    expect(fieldLinkToDisplayString(fieldLink)).toBe('attributes.primary_color');
  });
});

describe('legacyLinkedFieldToFieldLink', () => {
  it('converts legacy linkedField string to fieldLink', () => {
    const result = legacyLinkedFieldToFieldLink('color');
    expect(result).toEqual({
      type: 'attribute',
      key: 'attributes.primary_color',
    });
  });

  it('handles null legacy linkedField', () => {
    expect(legacyLinkedFieldToFieldLink(null)).toBeNull();
  });

  it('handles undefined legacy linkedField', () => {
    expect(legacyLinkedFieldToFieldLink(undefined)).toBeNull();
  });

  it('accepts attributeIds for custom matching', () => {
    const result = legacyLinkedFieldToFieldLink('custom_attr', ['custom_attr']);
    expect(result).toEqual({
      type: 'attribute',
      key: 'attributes.custom_attr',
    });
  });
});

describe('getFieldKeyWithoutPrefix', () => {
  it('removes product. prefix', () => {
    const fieldLink: FieldLink = { type: 'product', key: 'product.mpn' };
    expect(getFieldKeyWithoutPrefix(fieldLink)).toBe('mpn');
  });

  it('removes attributes. prefix', () => {
    const fieldLink: FieldLink = { type: 'attribute', key: 'attributes.primary_color' };
    expect(getFieldKeyWithoutPrefix(fieldLink)).toBe('primary_color');
  });

  it('handles keys without prefix', () => {
    const fieldLink: FieldLink = { type: 'product', key: 'mpn' };
    expect(getFieldKeyWithoutPrefix(fieldLink)).toBe('mpn');
  });
});
