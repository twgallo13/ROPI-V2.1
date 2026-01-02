/**
 * normalizeFieldPath.test.ts
 * LP-smart-rules-normalize-1.0.0
 * 
 * Unit tests for field path normalization middleware and validation
 */

import { describe, it, expect, beforeAll, vi } from 'vitest';

// Mock the registry bridge before importing the module
vi.mock('../src/services/registryBridge', () => ({
  loadRegistrySnapshot: vi.fn().mockResolvedValue({
    attributes: new Map([
      ['gender', { id: 'gender', attribute_id: 'gender', label: 'Gender', data_type: 'enum', allowed_values: ['Male', 'Female', 'Unisex'], internalOnly: false }],
      ['rics_category', { id: 'rics_category', attribute_id: 'rics_category', label: 'RICS Category', data_type: 'enum', internalOnly: false }],
      ['department', { id: 'department', attribute_id: 'department', label: 'Department', data_type: 'enum', internalOnly: false }],
      ['age_group', { id: 'age_group', attribute_id: 'age_group', label: 'Age Group', data_type: 'enum', internalOnly: false }],
      ['internal_field', { id: 'internal_field', attribute_id: 'internal_field', label: 'Internal Field', data_type: 'string', internalOnly: true }],
    ]),
    loadedAt: new Date(),
    source: 'firestore',
  }),
  getAttributeByIdFromSnapshot: vi.fn((attrId, snapshot) => {
    return snapshot?.attributes?.get(attrId);
  }),
  isInternalOnlyFromSnapshot: vi.fn((attrId, snapshot) => {
    const def = snapshot?.attributes?.get(attrId);
    return def?.internalOnly || false;
  }),
  getAllowedValuesFromSnapshot: vi.fn((attrId, snapshot) => {
    const def = snapshot?.attributes?.get(attrId);
    return def?.allowed_values;
  }),
  clearRegistrySnapshotCache: vi.fn(),
}));

import {
  hasAllowedPrefix,
  isSystemField,
  normalizeFieldPath,
  normalizeSmartRuleFields,
  validateCanonicalFieldPath,
  ALLOWED_PREFIXES,
  SYSTEM_FIELDS,
} from '../src/middleware/normalizeFieldPath';

describe('normalizeFieldPath', () => {
  describe('hasAllowedPrefix', () => {
    it('should return true for attributes. prefix', () => {
      expect(hasAllowedPrefix('attributes.gender')).toBe(true);
      expect(hasAllowedPrefix('attributes.rics_category')).toBe(true);
    });

    it('should return true for observation. prefix', () => {
      expect(hasAllowedPrefix('observation.source')).toBe(true);
    });

    it('should return true for meta. prefix', () => {
      expect(hasAllowedPrefix('meta.created_at')).toBe(true);
    });

    it('should return false for bare field names', () => {
      expect(hasAllowedPrefix('gender')).toBe(false);
      expect(hasAllowedPrefix('rics_category')).toBe(false);
    });

    it('should be case insensitive', () => {
      expect(hasAllowedPrefix('ATTRIBUTES.gender')).toBe(true);
      expect(hasAllowedPrefix('Attributes.Gender')).toBe(true);
    });
  });

  describe('isSystemField', () => {
    it('should return true for known system fields', () => {
      expect(isSystemField('tags')).toBe(true);
      expect(isSystemField('source')).toBe(true);
      expect(isSystemField('sku')).toBe(true);
    });

    it('should return false for attribute names', () => {
      expect(isSystemField('gender')).toBe(false);
      expect(isSystemField('rics_category')).toBe(false);
    });
  });

  describe('normalizeFieldPath', () => {
    it('should return unchanged for fields with allowed prefix', async () => {
      const result = await normalizeFieldPath('attributes.gender');
      expect(result.success).toBe(true);
      expect(result.normalizedValue).toBe('attributes.gender');
      expect(result.wasChanged).toBe(false);
    });

    it('should prefix bare attribute names with attributes.', async () => {
      const result = await normalizeFieldPath('gender');
      expect(result.success).toBe(true);
      expect(result.normalizedValue).toBe('attributes.gender');
      expect(result.wasChanged).toBe(true);
    });

    it('should handle nested paths (gender.value -> attributes.gender.value)', async () => {
      const result = await normalizeFieldPath('gender.value');
      expect(result.success).toBe(true);
      expect(result.normalizedValue).toBe('attributes.gender.value');
      expect(result.wasChanged).toBe(true);
    });

    it('should reject unknown fields not in registry', async () => {
      const result = await normalizeFieldPath('unknown_field');
      expect(result.success).toBe(false);
      expect(result.error).toContain('Unknown field');
    });

    it('should reject empty field paths', async () => {
      const result = await normalizeFieldPath('');
      expect(result.success).toBe(false);
      expect(result.error).toContain('cannot be empty');
    });

    it('should trim whitespace', async () => {
      const result = await normalizeFieldPath('  gender  ');
      expect(result.success).toBe(true);
      expect(result.normalizedValue).toBe('attributes.gender');
    });
  });

  describe('normalizeSmartRuleFields', () => {
    it('should normalize action.targetField', async () => {
      const rule = {
        name: 'Test Rule',
        action: {
          targetField: 'gender',
          valueTemplate: 'Male',
        },
      };

      const { normalized, errors, changes } = await normalizeSmartRuleFields(rule);

      expect(errors).toHaveLength(0);
      expect(normalized.action?.targetField).toBe('attributes.gender');
      expect(changes).toHaveLength(1);
      expect(changes[0]).toEqual({
        field: 'action.targetField',
        from: 'gender',
        to: 'attributes.gender',
      });
    });

    it('should normalize condition.field', async () => {
      const rule = {
        name: 'Test Rule',
        condition: {
          field: 'rics_category',
          matchType: 'contains',
          value: 'Shirts',
        },
        action: {
          targetField: 'attributes.gender',
          valueTemplate: 'Male',
        },
      };

      const { normalized, errors, changes } = await normalizeSmartRuleFields(rule);

      expect(errors).toHaveLength(0);
      if (Array.isArray(normalized.condition)) {
        expect(normalized.condition[0]?.field).toBe('attributes.rics_category');
      } else {
        expect(normalized.condition?.field).toBe('attributes.rics_category');
      }
      expect(changes.some(c => c.field === 'condition[0].field')).toBe(true);
    });

    it('should normalize array conditions', async () => {
      const rule = {
        name: 'Test Rule',
        condition: [
          { field: 'gender', matchType: 'token', value: 'Men' },
          { field: 'department', matchType: 'contains', value: 'Apparel' },
        ],
        action: {
          targetField: 'attributes.age_group',
          valueTemplate: 'Adult',
        },
      };

      const { normalized, errors, changes } = await normalizeSmartRuleFields(rule);

      expect(errors).toHaveLength(0);
      if (Array.isArray(normalized.condition) && normalized.condition.length >= 2) {
        expect(normalized.condition[0].field).toBe('attributes.gender');
        expect(normalized.condition[1].field).toBe('attributes.department');
      }
      expect(changes).toHaveLength(2);
    });

    it('should return errors for unknown fields', async () => {
      const rule = {
        name: 'Test Rule',
        action: {
          targetField: 'unknown_attr',
          valueTemplate: 'value',
        },
      };

      const { errors } = await normalizeSmartRuleFields(rule);

      expect(errors.length).toBeGreaterThan(0);
      expect(errors[0]).toContain('Unknown field');
    });

    it('should preserve already-normalized fields', async () => {
      const rule = {
        name: 'Test Rule',
        condition: {
          field: 'attributes.gender',
          matchType: 'token',
          value: 'Men',
        },
        action: {
          targetField: 'attributes.department',
          valueTemplate: 'Menswear',
        },
      };

      const { normalized, errors, changes } = await normalizeSmartRuleFields(rule);

      expect(errors).toHaveLength(0);
      expect(changes).toHaveLength(0);
      if (!Array.isArray(normalized.condition)) {
        expect(normalized.condition?.field).toBe('attributes.gender');
      }
      expect(normalized.action?.targetField).toBe('attributes.department');
    });
  });

  describe('validateCanonicalFieldPath', () => {
    it('should accept valid canonical paths', () => {
      expect(validateCanonicalFieldPath('attributes.gender').valid).toBe(true);
      expect(validateCanonicalFieldPath('observation.source').valid).toBe(true);
      expect(validateCanonicalFieldPath('meta.created_at').valid).toBe(true);
    });

    it('should reject paths without allowed prefix', () => {
      const result = validateCanonicalFieldPath('gender');
      expect(result.valid).toBe(false);
      expect(result.error).toContain('must start with allowed prefix');
    });

    it('should reject empty paths', () => {
      const result = validateCanonicalFieldPath('');
      expect(result.valid).toBe(false);
      expect(result.error).toContain('cannot be empty');
    });

    it('should reject paths with prefix but no attribute ID', () => {
      const result = validateCanonicalFieldPath('attributes.');
      expect(result.valid).toBe(false);
      expect(result.error).toContain('must have an attribute ID');
    });
  });
});
