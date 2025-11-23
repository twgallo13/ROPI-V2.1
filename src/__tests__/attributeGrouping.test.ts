/**
 * Tests for Attribute Grouping Utilities
 * Lisa v3.3.0 - ACC Vocabulary UX & Product-value Preview
 */
import { describe, it, expect } from 'vitest';
import { groupAttributesByPath, filterGroupedAttributes } from '../utils/attributeGrouping';
import type { AttributeData } from '../utils/attributeGrouping';

describe('attributeGrouping', () => {
  describe('groupAttributesByPath', () => {
    it('should group attributes with same canonical path', () => {
      const attributes: AttributeData[] = [
        {
          canonicalPath: 'descriptive.gender',
          label: 'Gender',
          category: 'descriptive',
          dataType: 'string',
          foundation: true
        },
        {
          canonicalPath: 'descriptive.gender',
          label: 'RICS Gender',
          category: 'descriptive',
          dataType: 'string',
          importerColumns: ['RICS_Gender']
        },
        {
          canonicalPath: 'descriptive.gender',
          label: 'Group',
          category: 'descriptive',
          dataType: 'string',
          legacyPaths: ['legacy.group']
        }
      ];

      const groups = groupAttributesByPath(attributes);

      expect(groups).toHaveLength(1);
      expect(groups[0].canonicalPath).toBe('descriptive.gender');
      expect(groups[0].variants).toHaveLength(3);
      expect(groups[0].isCore).toBe(true);
    });

    it('should add Core tag for foundation attributes', () => {
      const attributes: AttributeData[] = [
        {
          canonicalPath: 'sku_core.sku',
          label: 'SKU',
          category: 'sku_core',
          dataType: 'string',
          foundation: true
        }
      ];

      const groups = groupAttributesByPath(attributes);

      expect(groups[0].tags).toContain('Core');
      expect(groups[0].isCore).toBe(true);
    });

    it('should add Vendor tag for vendor-sourced attributes', () => {
      const attributes: AttributeData[] = [
        {
          canonicalPath: 'descriptive.size',
          label: 'RICS Size',
          category: 'descriptive',
          dataType: 'string',
          importerColumns: ['RICS_Size']
        }
      ];

      const groups = groupAttributesByPath(attributes);

      expect(groups[0].tags).toContain('Vendor');
    });

    it('should add Legacy tag for attributes with legacy paths', () => {
      const attributes: AttributeData[] = [
        {
          canonicalPath: 'descriptive.color',
          label: 'Color',
          category: 'descriptive',
          dataType: 'string',
          legacyPaths: ['old.color']
        }
      ];

      const groups = groupAttributesByPath(attributes);

      expect(groups[0].tags).toContain('Legacy');
    });

    it('should add Deprecated tag for deprecated attributes', () => {
      const attributes: AttributeData[] = [
        {
          canonicalPath: 'descriptive.oldField',
          label: 'Old Field',
          category: 'descriptive',
          dataType: 'string',
          deprecated: true
        }
      ];

      const groups = groupAttributesByPath(attributes);

      expect(groups[0].tags).toContain('Deprecated');
      expect(groups[0].isDeprecated).toBe(true);
    });

    it('should add AI tag for ai-generated fields', () => {
      const attributes: AttributeData[] = [
        {
          canonicalPath: 'a_i_generated.summary',
          label: 'AI Summary',
          category: 'ai',
          dataType: 'string',
          ai: { can_write: true }
        }
      ];

      const groups = groupAttributesByPath(attributes);

      expect(groups[0].tags).toContain('AI');
    });

    it('should handle multiple tags for complex attributes', () => {
      const attributes: AttributeData[] = [
        {
          canonicalPath: 'descriptive.brand',
          label: 'Brand',
          category: 'descriptive',
          dataType: 'string',
          foundation: true
        },
        {
          canonicalPath: 'descriptive.brand',
          label: 'RICS Brand',
          category: 'descriptive',
          dataType: 'string',
          importerColumns: ['RICS_Brand']
        },
        {
          canonicalPath: 'descriptive.brand',
          label: 'Old Brand',
          category: 'descriptive',
          dataType: 'string',
          legacyPaths: ['brand_old']
        }
      ];

      const groups = groupAttributesByPath(attributes);

      expect(groups[0].tags).toContain('Core');
      expect(groups[0].tags).toContain('Vendor');
      expect(groups[0].tags).toContain('Legacy');
    });
  });

  describe('filterGroupedAttributes', () => {
    const sampleGroups = groupAttributesByPath([
      {
        canonicalPath: 'descriptive.gender',
        label: 'Gender',
        category: 'descriptive',
        dataType: 'string'
      },
      {
        canonicalPath: 'descriptive.size',
        label: 'Size',
        category: 'descriptive',
        dataType: 'string'
      },
      {
        canonicalPath: 'sku_core.sku',
        label: 'SKU',
        category: 'sku_core',
        dataType: 'string'
      }
    ]);

    it('should return all groups when search term is empty', () => {
      const filtered = filterGroupedAttributes(sampleGroups, '');
      expect(filtered).toHaveLength(3);
    });

    it('should filter by canonical path', () => {
      const filtered = filterGroupedAttributes(sampleGroups, 'gender');
      expect(filtered).toHaveLength(1);
      expect(filtered[0].canonicalPath).toBe('descriptive.gender');
    });

    it('should filter by display name', () => {
      const filtered = filterGroupedAttributes(sampleGroups, 'Size');
      expect(filtered).toHaveLength(1);
      expect(filtered[0].displayName).toBe('Size');
    });

    it('should be case-insensitive', () => {
      const filtered = filterGroupedAttributes(sampleGroups, 'SKU');
      expect(filtered).toHaveLength(1);
      expect(filtered[0].displayName).toBe('SKU');
    });

    it('should search across multiple fields', () => {
      const filtered = filterGroupedAttributes(sampleGroups, 'descriptive');
      expect(filtered).toHaveLength(2);
    });
  });
});
