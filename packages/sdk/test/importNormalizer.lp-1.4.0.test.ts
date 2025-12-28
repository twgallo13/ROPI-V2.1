/**
 * LP-importer-mapping-recon-1.4.0: Unit tests for value canonicalization and multiSelect typing
 * 
 * Tests the canonicalization fixes in importNormalizer.ts:
 * - Typo corrections (Pholyester → Polyester, Adults → Adult, Sandle → Casual)
 * - MultiSelect fields converted to arrays (website, material)
 * - Case-insensitive lookups
 */

import { describe, it, expect } from 'vitest';
import {
  canonicalizeValue,
  toMultiSelectArray,
  isMultiSelectField,
  normalizeImportRow,
} from '../src/normalization/importNormalizer';

describe('LP-1.4.0: Value canonicalization', () => {
  describe('canonicalizeValue', () => {
    it('should correct "Pholyester" to "Polyester" for material field', () => {
      expect(canonicalizeValue('Pholyester', 'material')).toBe('Polyester');
    });

    it('should correct "pholyester" (lowercase) to "Polyester" for material field', () => {
      expect(canonicalizeValue('pholyester', 'material')).toBe('Polyester');
    });

    it('should correct "Adults" to "Adult" for age_group field', () => {
      expect(canonicalizeValue('Adults', 'age_group')).toBe('Adult');
    });

    it('should correct "adults" (lowercase) to "Adult" for age_group field', () => {
      expect(canonicalizeValue('adults', 'age_group')).toBe('Adult');
    });

    it('should correct "Sandle" to "Casual" for class field', () => {
      expect(canonicalizeValue('Sandle', 'class')).toBe('Casual');
    });

    it('should correct "sandle" (lowercase) to "Casual" for class field', () => {
      expect(canonicalizeValue('sandle', 'class')).toBe('Casual');
    });

    it('should correct "Slides" to "Sandals" for category field', () => {
      expect(canonicalizeValue('Slides', 'category')).toBe('Sandals');
    });

    it('should return original value when no correction exists', () => {
      expect(canonicalizeValue('Athletic', 'class')).toBe('Athletic');
      expect(canonicalizeValue('Green', 'primary_color')).toBe('Green');
    });

    it('should return original value for unknown fields', () => {
      expect(canonicalizeValue('SomeValue', 'unknown_field')).toBe('SomeValue');
    });

    it('should handle empty/null values gracefully', () => {
      expect(canonicalizeValue('', 'material')).toBe('');
      expect(canonicalizeValue(null as unknown as string, 'material')).toBe(null);
    });
  });

  describe('toMultiSelectArray', () => {
    it('should convert single string to array', () => {
      expect(toMultiSelectArray('shiekh.com')).toEqual(['shiekh.com']);
    });

    it('should split pipe-delimited strings', () => {
      expect(toMultiSelectArray('shiekh.com|karmaloop.com')).toEqual(['shiekh.com', 'karmaloop.com']);
    });

    it('should split comma-delimited strings', () => {
      expect(toMultiSelectArray('Cotton,Polyester')).toEqual(['Cotton', 'Polyester']);
    });

    it('should split semicolon-delimited strings', () => {
      expect(toMultiSelectArray('Leather;Suede')).toEqual(['Leather', 'Suede']);
    });

    it('should trim whitespace from array items', () => {
      expect(toMultiSelectArray(' shiekh.com , karmaloop.com ')).toEqual(['shiekh.com', 'karmaloop.com']);
    });

    it('should filter empty items', () => {
      expect(toMultiSelectArray('shiekh.com,,karmaloop.com')).toEqual(['shiekh.com', 'karmaloop.com']);
    });

    it('should return existing arrays unchanged (but trimmed)', () => {
      expect(toMultiSelectArray(['shiekh.com', 'karmaloop.com'])).toEqual(['shiekh.com', 'karmaloop.com']);
    });

    it('should return empty array for undefined/null/empty', () => {
      expect(toMultiSelectArray(undefined)).toEqual([]);
      expect(toMultiSelectArray(null as unknown as string)).toEqual([]);
      expect(toMultiSelectArray('')).toEqual([]);
    });
  });

  describe('isMultiSelectField', () => {
    it('should return true for website field', () => {
      expect(isMultiSelectField('website')).toBe(true);
    });

    it('should return true for material field', () => {
      expect(isMultiSelectField('material')).toBe(true);
    });

    it('should return false for non-multiSelect fields', () => {
      expect(isMultiSelectField('class')).toBe(false);
      expect(isMultiSelectField('category')).toBe(false);
      expect(isMultiSelectField('brand')).toBe(false);
    });
  });
});

describe('LP-1.4.0: normalizeImportRow integration', () => {
  it('should normalize material from string "Pholyester" to array ["Polyester"]', () => {
    const row = {
      'MPN': '211737-90h1-8',
      'Material': 'Pholyester',
    };
    const result = normalizeImportRow(row);
    expect(result.material).toEqual(['Polyester']);
  });

  it('should normalize website from string to array', () => {
    const row = {
      'MPN': '211737-90h1-8',
      'Website': 'shiekh.com',
    };
    const result = normalizeImportRow(row);
    expect(result.website).toEqual(['shiekh.com']);
  });

  it('should canonicalize age_group from "Adults" to "Adult"', () => {
    const row = {
      'MPN': '211737-90h1-8',
      'Age Group': 'Adults',
    };
    const result = normalizeImportRow(row);
    expect(result.age_group).toBe('Adult');
  });

  it('should canonicalize class from "Sandle" to "Casual"', () => {
    const row = {
      'MPN': '211737-90h1-8',
      'Class': 'Sandle',
    };
    const result = normalizeImportRow(row);
    expect(result.class).toBe('Casual');
  });

  it('should canonicalize category from "Slides" to "Sandals"', () => {
    const row = {
      'MPN': '211737-90h1-8',
      'Category': 'Slides',
    };
    const result = normalizeImportRow(row);
    expect(result.category).toBe('Sandals');
  });

  it('should handle full product row with all canonicalizations', () => {
    const row = {
      'MPN': '211737-90h1-8',
      'Product Name': 'Test Product',
      'Brand': 'Crocs',
      'Department': 'Footwear',
      'Class': 'Sandle',
      'Category': 'Slides',
      'Age Group': 'Adults',
      'Gender': "Men's",
      'Primary Color': 'Green',
      'Material': 'Pholyester',
      'Website': 'shiekh.com',
    };
    const result = normalizeImportRow(row);
    
    expect(result.mpn).toBe('211737-90h1-8');
    expect(result.name).toBe('Test Product');
    expect(result.brand).toBe('Crocs');
    expect(result.department).toBe('Footwear');
    expect(result.class).toBe('Casual'); // Sandle → Casual
    expect(result.category).toBe('Sandals'); // Slides → Sandals
    expect(result.age_group).toBe('Adult'); // Adults → Adult
    expect(result.gender).toBe("men's");
    expect(result.primary_color).toBe('Green');
    expect(result.material).toEqual(['Polyester']); // Pholyester → Polyester, string → array
    expect(result.website).toEqual(['shiekh.com']); // string → array
  });
});
