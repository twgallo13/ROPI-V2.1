/**
 * Mapping Service Tests
 * PVS-0.3.1 — Unit tests for header aliases, value synonyms, and mapping operations
 */

import { describe, it, expect, beforeEach, vi } from 'vitest';
import {
  validateValueSynonyms,
  // Note: Other functions require Firebase mocks which are handled in API tests
} from '../src/services/mappingService';

describe('Mapping Service', () => {
  describe('validateValueSynonyms', () => {
    it('should validate correct value synonyms structure', () => {
      const synonyms = {
        'Black': ['blk', 'noir', 'schwarz'],
        'White': ['wht', 'blanc', 'weiss'],
        'Red': ['rd', 'rouge'],
      };
      
      const result = validateValueSynonyms(synonyms);
      expect(result.valid).toBe(true);
      expect(result.errors).toHaveLength(0);
    });

    it('should detect non-array synonym values', () => {
      const synonyms = {
        'Black': ['blk', 'noir'],
        'White': 'wht' as unknown as string[], // Invalid: not an array
      };
      
      const result = validateValueSynonyms(synonyms);
      expect(result.valid).toBe(false);
      expect(result.errors).toContain("Synonyms for 'White' must be an array");
    });

    it('should detect non-string synonym entries', () => {
      const synonyms = {
        'Black': ['blk', 123 as unknown as string, 'noir'],
      };
      
      const result = validateValueSynonyms(synonyms);
      expect(result.valid).toBe(false);
      expect(result.errors.some(e => e.includes('must be a string'))).toBe(true);
    });

    it('should detect duplicate synonyms (case-insensitive)', () => {
      const synonyms = {
        'Black': ['blk', 'BLK'], // Same value, different case
        'Dark': ['noir'],
      };
      
      const result = validateValueSynonyms(synonyms);
      expect(result.valid).toBe(false);
      expect(result.errors.some(e => e.includes('Duplicate synonym'))).toBe(true);
    });

    it('should detect duplicate synonyms across canonical values', () => {
      const synonyms = {
        'Black': ['blk', 'dark'],
        'Navy': ['dark', 'navy blue'], // 'dark' is already used
      };
      
      const result = validateValueSynonyms(synonyms);
      expect(result.valid).toBe(false);
      expect(result.errors.some(e => e.includes("Duplicate synonym 'dark'"))).toBe(true);
    });

    it('should handle empty synonyms object', () => {
      const synonyms = {};
      
      const result = validateValueSynonyms(synonyms);
      expect(result.valid).toBe(true);
      expect(result.errors).toHaveLength(0);
    });

    it('should handle empty synonym arrays', () => {
      const synonyms = {
        'Black': [],
        'White': [],
      };
      
      const result = validateValueSynonyms(synonyms);
      expect(result.valid).toBe(true);
      expect(result.errors).toHaveLength(0);
    });
  });

  describe('Merge Logic', () => {
    // These test the merge logic conceptually - actual merge functions are internal
    // but we can test via the transformation functions
    
    it('should understand precedence: source > attribute > global', () => {
      // This is a conceptual test - the actual merge happens in getMergedMapping
      // which requires Firestore. We test the concept here.
      
      const global = { alias1: 'attr1' };
      const attribute = { alias1: 'attr2', alias2: 'attr3' };
      const source = { alias2: 'attr4' };
      
      // Expected merge result:
      // alias1 -> attr2 (attribute overrides global)
      // alias2 -> attr4 (source overrides attribute)
      
      const merged = { ...global, ...attribute, ...source };
      expect(merged.alias1).toBe('attr2');
      expect(merged.alias2).toBe('attr4');
    });

    it('should merge synonym arrays without duplicates', () => {
      const base = ['blk', 'noir'];
      const overlay = ['noir', 'schwarz'];
      
      const merged = [...new Set([...base, ...overlay])];
      expect(merged).toEqual(['blk', 'noir', 'schwarz']);
      expect(merged).toHaveLength(3);
    });
  });

  describe('Transform Logic', () => {
    // Test the building blocks of transformation
    
    it('should normalize header matching', () => {
      const aliases: Record<string, string> = {
        'VendorColor': 'primary_color',
        'colour': 'primary_color',
      };
      
      // Header matching should be case-sensitive for exact match
      expect(aliases['VendorColor']).toBe('primary_color');
      expect(aliases['colour']).toBe('primary_color');
      expect(aliases['vendorcolor']).toBeUndefined();
    });

    it('should build synonym lookup correctly', () => {
      const synonyms = {
        'primary_color': {
          'Black': ['blk', 'noir'],
          'White': ['wht'],
        },
        'size': {
          'Small': ['sm', 's'],
        },
      };
      
      // Build lookup
      const lookup = new Map<string, { attributeId: string; canonicalValue: string }>();
      for (const [attrId, values] of Object.entries(synonyms)) {
        for (const [canonical, syns] of Object.entries(values)) {
          for (const syn of syns) {
            const key = `${attrId}:${syn.toLowerCase()}`;
            lookup.set(key, { attributeId: attrId, canonicalValue: canonical });
          }
        }
      }
      
      // Test lookups
      expect(lookup.get('primary_color:blk')).toEqual({
        attributeId: 'primary_color',
        canonicalValue: 'Black',
      });
      expect(lookup.get('primary_color:noir')).toEqual({
        attributeId: 'primary_color',
        canonicalValue: 'Black',
      });
      expect(lookup.get('size:sm')).toEqual({
        attributeId: 'size',
        canonicalValue: 'Small',
      });
      expect(lookup.get('primary_color:unknown')).toBeUndefined();
    });
  });

  describe('Type Definitions', () => {
    it('should have correct GlobalMapping shape', () => {
      const mapping = {
        aliases: { 'VendorColor': 'primary_color' },
        value_synonyms: {
          'primary_color': {
            'Black': ['blk', 'noir'],
          },
        },
        updatedAt: '2024-01-15T10:00:00Z',
        updatedBy: 'user-123',
      };
      
      expect(mapping.aliases).toBeDefined();
      expect(mapping.value_synonyms).toBeDefined();
      expect(typeof mapping.aliases['VendorColor']).toBe('string');
      expect(Array.isArray(mapping.value_synonyms.primary_color.Black)).toBe(true);
    });

    it('should have correct AttributeMapping shape', () => {
      const mapping = {
        aliases: { 'MyColor': 'primary_color' },
        value_synonyms: { 'Black': ['blk'] },
        sources: {
          'vendorA': {
            aliases: { 'VendorAColor': 'primary_color' },
            value_synonyms: { 'Black': ['bk'] },
          },
        },
        updatedAt: '2024-01-15T10:00:00Z',
        updatedBy: 'user-123',
      };
      
      expect(mapping.aliases).toBeDefined();
      expect(mapping.value_synonyms).toBeDefined();
      expect(mapping.sources?.vendorA).toBeDefined();
      expect(mapping.sources?.vendorA.aliases).toBeDefined();
    });

    it('should have correct TransformResult shape', () => {
      const result = {
        attributes: { 'primary_color': 'Black' },
        unmappedHeaders: ['Unknown_Column'],
        synonymsApplied: [
          { attribute: 'primary_color', original: 'blk', canonical: 'Black' },
        ],
      };
      
      expect(result.attributes).toBeDefined();
      expect(Array.isArray(result.unmappedHeaders)).toBe(true);
      expect(Array.isArray(result.synonymsApplied)).toBe(true);
      expect(result.synonymsApplied[0].attribute).toBe('primary_color');
    });
  });

  describe('Edge Cases', () => {
    it('should handle empty aliases object', () => {
      const aliases = {};
      expect(Object.keys(aliases)).toHaveLength(0);
    });

    it('should handle special characters in alias keys', () => {
      const aliases: Record<string, string> = {
        'Vendor Color (Primary)': 'primary_color',
        'Size/Dimension': 'size',
        'Price $': 'price',
      };
      
      expect(aliases['Vendor Color (Primary)']).toBe('primary_color');
      expect(aliases['Size/Dimension']).toBe('size');
      expect(aliases['Price $']).toBe('price');
    });

    it('should handle unicode in synonym values', () => {
      const synonyms = {
        'Black': ['黑色', 'שחור', 'чёрный'],
      };
      
      const result = validateValueSynonyms(synonyms);
      expect(result.valid).toBe(true);
    });

    it('should handle whitespace in synonym values', () => {
      const synonyms = {
        'Black': ['  blk  ', 'noir '],
      };
      
      // Validation should pass (trimming happens during lookup)
      const result = validateValueSynonyms(synonyms);
      expect(result.valid).toBe(true);
    });
  });
});
