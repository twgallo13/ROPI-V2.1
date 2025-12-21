/**
 * Unit tests for stringUtils
 * LP-2.1.6: Canonical attribute ID normalization
 */

import { describe, it, expect } from 'vitest';
import {
  toSnakeCase,
  normalizeDataType,
  wouldCollide,
  detectCollisions
} from '../src/lib/stringUtils';

describe('toSnakeCase', () => {
  describe('basic transformations', () => {
    it('should handle empty/null inputs', () => {
      expect(toSnakeCase('')).toBe('');
      expect(toSnakeCase(null as unknown as string)).toBe('');
      expect(toSnakeCase(undefined as unknown as string)).toBe('');
    });

    it('should convert camelCase to snake_case', () => {
      expect(toSnakeCase('myAttributeName')).toBe('my_attribute_name');
      expect(toSnakeCase('productId')).toBe('product_id');
      expect(toSnakeCase('firstName')).toBe('first_name');
    });

    it('should handle consecutive uppercase letters', () => {
      // Note: Consecutive uppercase letters are treated as a single unit
      // This is the expected behavior per LP-2.1.6 spec
      expect(toSnakeCase('XMLParser')).toBe('xmlparser');
      expect(toSnakeCase('HTMLElement')).toBe('htmlelement');
      expect(toSnakeCase('getHTTPResponse')).toBe('get_httpresponse');
    });

    it('should convert PascalCase to snake_case', () => {
      expect(toSnakeCase('MyAttributeName')).toBe('my_attribute_name');
      expect(toSnakeCase('ProductId')).toBe('product_id');
    });
  });

  describe('dot notation', () => {
    it('should replace dots with underscores', () => {
      expect(toSnakeCase('legacy.sku')).toBe('legacy_sku');
      expect(toSnakeCase('legacy.productId')).toBe('legacy_product_id');
      expect(toSnakeCase('a.b.c')).toBe('a_b_c');
    });
  });

  describe('hyphens and spaces', () => {
    it('should replace hyphens with underscores', () => {
      expect(toSnakeCase('sku-number')).toBe('sku_number');
      expect(toSnakeCase('product-id')).toBe('product_id');
      expect(toSnakeCase('SKU-Number')).toBe('sku_number');
    });

    it('should replace spaces with underscores', () => {
      expect(toSnakeCase('product name')).toBe('product_name');
      expect(toSnakeCase('First Name')).toBe('first_name');
      expect(toSnakeCase('  multiple   spaces  ')).toBe('multiple_spaces');
    });
  });

  describe('special characters', () => {
    it('should remove non-alphanumeric characters', () => {
      expect(toSnakeCase('product@name')).toBe('productname');
      expect(toSnakeCase('price$')).toBe('price');
      expect(toSnakeCase('#id')).toBe('id');
      expect(toSnakeCase('name!')).toBe('name');
    });

    it('should preserve underscores but collapse multiples', () => {
      expect(toSnakeCase('already_snake_case')).toBe('already_snake_case');
      expect(toSnakeCase('double__underscore')).toBe('double_underscore');
      expect(toSnakeCase('___leading')).toBe('leading');
      expect(toSnakeCase('trailing___')).toBe('trailing');
    });
  });

  describe('real attribute examples', () => {
    it('should handle existing registry attribute IDs', () => {
      // These should remain unchanged (already snake_case)
      expect(toSnakeCase('sku')).toBe('sku');
      expect(toSnakeCase('mpn')).toBe('mpn');
      expect(toSnakeCase('gtin')).toBe('gtin');
      expect(toSnakeCase('style_id')).toBe('style_id');
      expect(toSnakeCase('required_for_completion')).toBe('required_for_completion');
    });

    it('should handle hypothetical legacy IDs', () => {
      expect(toSnakeCase('productName')).toBe('product_name');
      expect(toSnakeCase('legacy.sku')).toBe('legacy_sku');
      expect(toSnakeCase('colorCode')).toBe('color_code');
      expect(toSnakeCase('sizeRange')).toBe('size_range');
    });
  });
});

describe('normalizeDataType', () => {
  describe('string variants', () => {
    it('should normalize text to string', () => {
      expect(normalizeDataType('text')).toBe('string');
      expect(normalizeDataType('TEXT')).toBe('string');
      expect(normalizeDataType('Text')).toBe('string');
    });

    it('should normalize longtext to string', () => {
      expect(normalizeDataType('longtext')).toBe('string');
      expect(normalizeDataType('LONGTEXT')).toBe('string');
    });

    it('should pass through string', () => {
      expect(normalizeDataType('string')).toBe('string');
      expect(normalizeDataType('STRING')).toBe('string');
    });

    it('should normalize varchar and char to string', () => {
      expect(normalizeDataType('varchar')).toBe('string');
      expect(normalizeDataType('char')).toBe('string');
    });
  });

  describe('enum variants', () => {
    it('should normalize select to enum', () => {
      expect(normalizeDataType('select')).toBe('enum');
      expect(normalizeDataType('SELECT')).toBe('enum');
    });

    it('should normalize dropdown to enum', () => {
      expect(normalizeDataType('dropdown')).toBe('enum');
    });

    it('should pass through enum', () => {
      expect(normalizeDataType('enum')).toBe('enum');
    });
  });

  describe('boolean variants', () => {
    it('should pass through boolean', () => {
      expect(normalizeDataType('boolean')).toBe('boolean');
      expect(normalizeDataType('BOOLEAN')).toBe('boolean');
    });

    it('should normalize bool to boolean', () => {
      expect(normalizeDataType('bool')).toBe('boolean');
    });

    it('should normalize yesno and checkbox to boolean', () => {
      expect(normalizeDataType('yesno')).toBe('boolean');
      expect(normalizeDataType('checkbox')).toBe('boolean');
    });
  });

  describe('number variants', () => {
    it('should pass through number', () => {
      expect(normalizeDataType('number')).toBe('number');
    });

    it('should normalize int/integer to number', () => {
      expect(normalizeDataType('int')).toBe('number');
      expect(normalizeDataType('integer')).toBe('number');
    });

    it('should normalize float/decimal to number', () => {
      expect(normalizeDataType('float')).toBe('number');
      expect(normalizeDataType('decimal')).toBe('number');
    });

    it('should normalize price/currency/money to number', () => {
      expect(normalizeDataType('price')).toBe('number');
      expect(normalizeDataType('currency')).toBe('number');
      expect(normalizeDataType('money')).toBe('number');
    });
  });

  describe('array variants', () => {
    it('should pass through array', () => {
      expect(normalizeDataType('array')).toBe('array');
    });

    it('should normalize multiselect variants to array', () => {
      expect(normalizeDataType('multiselect')).toBe('array');
      expect(normalizeDataType('multi-select')).toBe('array');
      expect(normalizeDataType('multiSelect')).toBe('array');
      expect(normalizeDataType('list')).toBe('array');
    });
  });

  describe('date variants', () => {
    it('should pass through date', () => {
      expect(normalizeDataType('date')).toBe('date');
    });

    it('should normalize datetime/timestamp to date', () => {
      expect(normalizeDataType('datetime')).toBe('date');
      expect(normalizeDataType('timestamp')).toBe('date');
    });
  });

  describe('object variants', () => {
    it('should pass through object', () => {
      expect(normalizeDataType('object')).toBe('object');
    });

    it('should normalize json/map to object', () => {
      expect(normalizeDataType('json')).toBe('object');
      expect(normalizeDataType('map')).toBe('object');
    });
  });

  describe('unknown types', () => {
    it('should default to string for unknown types', () => {
      expect(normalizeDataType('unknown')).toBe('string');
      expect(normalizeDataType('random')).toBe('string');
      expect(normalizeDataType('xyz')).toBe('string');
    });

    it('should handle empty/null inputs', () => {
      expect(normalizeDataType('')).toBe('string');
      expect(normalizeDataType(null as unknown as string)).toBe('string');
      expect(normalizeDataType(undefined as unknown as string)).toBe('string');
    });

    it('should trim whitespace', () => {
      expect(normalizeDataType('  text  ')).toBe('string');
      expect(normalizeDataType('\tselect\n')).toBe('enum');
    });
  });
});

describe('wouldCollide', () => {
  it('should detect collisions between camelCase and snake_case', () => {
    expect(wouldCollide('myAttr', 'my_attr')).toBe(true);
    expect(wouldCollide('productId', 'product_id')).toBe(true);
  });

  it('should detect collisions with dots and underscores', () => {
    expect(wouldCollide('legacy.sku', 'legacy_sku')).toBe(true);
  });

  it('should return false for non-colliding IDs', () => {
    expect(wouldCollide('myAttr', 'yourAttr')).toBe(false);
    expect(wouldCollide('sku', 'mpn')).toBe(false);
  });

  it('should handle identical inputs', () => {
    expect(wouldCollide('sku', 'sku')).toBe(true);
    expect(wouldCollide('product_name', 'product_name')).toBe(true);
  });
});

describe('detectCollisions', () => {
  it('should return empty array when no collisions', () => {
    const ids = ['sku', 'mpn', 'gtin', 'brand'];
    expect(detectCollisions(ids)).toEqual([]);
  });

  it('should detect single collision', () => {
    const ids = ['myAttr', 'my_attr', 'other'];
    const collisions = detectCollisions(ids);
    expect(collisions).toHaveLength(1);
    expect(collisions[0]).toEqual({
      canonical: 'my_attr',
      originals: ['myAttr', 'my_attr']
    });
  });

  it('should detect multiple collisions', () => {
    const ids = ['myAttr', 'my_attr', 'productId', 'product_id', 'sku'];
    const collisions = detectCollisions(ids);
    expect(collisions).toHaveLength(2);
    
    const canonicals = collisions.map(c => c.canonical);
    expect(canonicals).toContain('my_attr');
    expect(canonicals).toContain('product_id');
  });

  it('should detect three-way collision', () => {
    const ids = ['myAttr', 'my_attr', 'my-attr'];
    const collisions = detectCollisions(ids);
    expect(collisions).toHaveLength(1);
    expect(collisions[0].originals).toHaveLength(3);
    expect(collisions[0].originals).toContain('myAttr');
    expect(collisions[0].originals).toContain('my_attr');
    expect(collisions[0].originals).toContain('my-attr');
  });

  it('should handle empty array', () => {
    expect(detectCollisions([])).toEqual([]);
  });

  it('should handle single item', () => {
    expect(detectCollisions(['sku'])).toEqual([]);
  });
});
