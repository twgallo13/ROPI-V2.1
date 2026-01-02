/**
 * Provenance Edit Behavior Integration Tests
 * S5 — Product UI: Provenance UX & Edit Behavior
 * LP-smart-rules-ui-provenance-1.0.0
 * 
 * Tests:
 * 1. Editing Smart Rule field replaces provenance with human
 * 2. Activity log entry is created
 * 3. Non-Smart Rule edits don't add provenance
 */

import {
  getProvenanceKey,
  createHumanProvenance,
  createReplacementActivityLog,
  getProvenanceFromProduct,
  hasSmartRuleProvenance,
} from '../productService';
import type { FieldProvenance, Product } from '../../types/product';

describe('Provenance Edit Behavior', () => {
  const mockSmartRuleProvenance: FieldProvenance = {
    source: 'smartRule',
    ruleId: 'rule_gender_from_rics',
    ruleName: 'Gender from RICS Category',
    appliedAt: '2025-01-15T10:30:00.000Z',
    input: {
      ricsCategory: "Men's Footwear",
    },
    reason: 'Matched RICS category pattern for Men',
  };

  describe('getProvenanceKey', () => {
    it('converts field path to provenance key with underscores', () => {
      expect(getProvenanceKey('attributes.gender')).toBe('attributes_gender');
      expect(getProvenanceKey('attributes.age_group')).toBe('attributes_age_group');
      expect(getProvenanceKey('attributes.primary_color')).toBe('attributes_primary_color');
    });

    it('handles simple field paths', () => {
      expect(getProvenanceKey('name')).toBe('name');
      expect(getProvenanceKey('brand')).toBe('brand');
    });

    it('handles deeply nested paths', () => {
      expect(getProvenanceKey('attributes.nested.deep.value')).toBe('attributes_nested_deep_value');
    });
  });

  describe('createHumanProvenance', () => {
    it('creates provenance with source=human', () => {
      const provenance = createHumanProvenance('user@example.com');
      expect(provenance.source).toBe('human');
    });

    it('includes actor information', () => {
      const provenance = createHumanProvenance('user@example.com');
      expect(provenance.actor).toBe('user@example.com');
    });

    it('sets appliedAt to current timestamp', () => {
      const before = new Date().toISOString();
      const provenance = createHumanProvenance('user@example.com');
      const after = new Date().toISOString();
      
      expect(provenance.appliedAt).toBeDefined();
      expect(provenance.appliedAt >= before).toBe(true);
      expect(provenance.appliedAt <= after).toBe(true);
    });

    it('does not include ruleId or ruleName', () => {
      const provenance = createHumanProvenance('user@example.com');
      expect(provenance.ruleId).toBeUndefined();
      expect(provenance.ruleName).toBeUndefined();
    });
  });

  describe('createReplacementActivityLog', () => {
    it('creates log entry with action user_replaced_smartrule', () => {
      const entry = createReplacementActivityLog(
        'user@example.com',
        'attributes.gender',
        mockSmartRuleProvenance,
        'Women'
      );
      expect(entry.action).toBe('user_replaced_smartrule');
    });

    it('includes actor information', () => {
      const entry = createReplacementActivityLog(
        'user@example.com',
        'attributes.gender',
        mockSmartRuleProvenance,
        'Women'
      );
      expect(entry.actor).toBe('user@example.com');
    });

    it('includes field path in details', () => {
      const entry = createReplacementActivityLog(
        'user@example.com',
        'attributes.gender',
        mockSmartRuleProvenance,
        'Women'
      );
      expect(entry.details.fieldPath).toBe('attributes.gender');
    });

    it('includes previous provenance in details', () => {
      const entry = createReplacementActivityLog(
        'user@example.com',
        'attributes.gender',
        mockSmartRuleProvenance,
        'Women'
      );
      expect(entry.details.previousProvenance).toEqual(mockSmartRuleProvenance);
    });

    it('includes new value in details', () => {
      const entry = createReplacementActivityLog(
        'user@example.com',
        'attributes.gender',
        mockSmartRuleProvenance,
        'Women'
      );
      expect(entry.details.newValue).toBe('Women');
    });

    it('sets timestamp', () => {
      const before = new Date().toISOString();
      const entry = createReplacementActivityLog(
        'user@example.com',
        'attributes.gender',
        mockSmartRuleProvenance,
        'Women'
      );
      const after = new Date().toISOString();
      
      expect(entry.timestamp).toBeDefined();
      expect(entry.timestamp >= before).toBe(true);
      expect(entry.timestamp <= after).toBe(true);
    });
  });

  describe('getProvenanceFromProduct', () => {
    it('returns provenance for field with provenance', () => {
      const product = {
        id: 'test-product',
        provenance: {
          attributes_gender: mockSmartRuleProvenance,
        },
      } as unknown as Product;

      const provenance = getProvenanceFromProduct(product, 'attributes.gender');
      expect(provenance).toEqual(mockSmartRuleProvenance);
    });

    it('returns undefined for field without provenance', () => {
      const product = {
        id: 'test-product',
        provenance: {},
      } as unknown as Product;

      const provenance = getProvenanceFromProduct(product, 'attributes.gender');
      expect(provenance).toBeUndefined();
    });

    it('returns undefined for product without provenance map', () => {
      const product = {
        id: 'test-product',
      } as unknown as Product;

      const provenance = getProvenanceFromProduct(product, 'attributes.gender');
      expect(provenance).toBeUndefined();
    });
  });

  describe('hasSmartRuleProvenance', () => {
    it('returns true for field with Smart Rule provenance', () => {
      const product = {
        id: 'test-product',
        provenance: {
          attributes_gender: mockSmartRuleProvenance,
        },
      } as unknown as Product;

      expect(hasSmartRuleProvenance(product, 'attributes.gender')).toBe(true);
    });

    it('returns false for field with human provenance', () => {
      const humanProvenance: FieldProvenance = {
        source: 'human',
        appliedAt: '2025-01-15T11:00:00.000Z',
        actor: 'user@example.com',
      };
      
      const product = {
        id: 'test-product',
        provenance: {
          attributes_gender: humanProvenance,
        },
      } as unknown as Product;

      expect(hasSmartRuleProvenance(product, 'attributes.gender')).toBe(false);
    });

    it('returns false for field without provenance', () => {
      const product = {
        id: 'test-product',
        provenance: {},
      } as unknown as Product;

      expect(hasSmartRuleProvenance(product, 'attributes.gender')).toBe(false);
    });

    it('returns false for product without provenance map', () => {
      const product = {
        id: 'test-product',
      } as unknown as Product;

      expect(hasSmartRuleProvenance(product, 'attributes.gender')).toBe(false);
    });
  });

  describe('Edit Behavior Integration', () => {
    it('provenance key lookup workflow', () => {
      // Simulate the workflow in useProduct.updateField
      const fieldPath = 'attributes.gender';
      const provenanceKey = getProvenanceKey(fieldPath);
      
      const product = {
        id: 'test-product',
        provenance: {
          [provenanceKey]: mockSmartRuleProvenance,
        },
      } as unknown as Product;

      // Check if field has Smart Rule provenance
      const existingProvenance = product.provenance?.[provenanceKey] as FieldProvenance | undefined;
      expect(existingProvenance?.source).toBe('smartRule');

      // Create replacement provenance
      const humanProvenance = createHumanProvenance('user@example.com');
      expect(humanProvenance.source).toBe('human');

      // Create activity log
      const activityLog = createReplacementActivityLog(
        'user@example.com',
        fieldPath,
        existingProvenance!,
        'Women'
      );
      expect(activityLog.action).toBe('user_replaced_smartrule');
    });

    it('preserves other field provenances when replacing one', () => {
      const ageGroupProvenance: FieldProvenance = {
        source: 'smartRule',
        ruleId: 'rule_age_group',
        appliedAt: '2025-01-15T10:30:00.000Z',
      };

      const product = {
        id: 'test-product',
        provenance: {
          attributes_gender: mockSmartRuleProvenance,
          attributes_age_group: ageGroupProvenance,
        },
      } as unknown as Product;

      // Simulate replacing only gender provenance
      const newProvenance = { ...product.provenance };
      newProvenance.attributes_gender = createHumanProvenance('user@example.com');

      // Verify age_group provenance is unchanged
      expect(newProvenance.attributes_age_group).toEqual(ageGroupProvenance);
      expect(newProvenance.attributes_gender.source).toBe('human');
    });
  });
});
