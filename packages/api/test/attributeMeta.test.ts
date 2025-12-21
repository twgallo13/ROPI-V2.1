/**
 * Unit tests for attributeMeta.ts
 * LP-2.1.7
 */

import { describe, it, expect, beforeEach } from 'vitest';
import {
  createAttributeMeta,
  buildPerKeyUpdatePayload,
  isAdminCanonical,
  getProtectedAttributes,
  generateAttributeDiff,
  type AttributeMetaEntry,
  type ActorType,
} from '../src/lib/attributeMeta';

describe('attributeMeta', () => {
  const mockTimestamp = '2025-12-21T12:00:00.000Z';

  describe('createAttributeMeta', () => {
    it('should create a meta entry with all required fields', () => {
      const meta = createAttributeMeta({
        actor: 'system:migrator',
        source: 'migration',
        method: 'migrateProductsToAttributes',
        definitionVersion: '1.0.3',
        timestamp: mockTimestamp,
      });

      expect(meta).toEqual({
        actor: 'system:migrator',
        source: 'migration',
        ts: mockTimestamp,
        method: 'migrateProductsToAttributes',
        definition_version: '1.0.3',
        canonical: false,
      });
    });

    it('should include note when provided', () => {
      const meta = createAttributeMeta({
        actor: 'admin:theo@example.com',
        source: 'admin',
        method: 'productEditor',
        definitionVersion: '1.0.3',
        canonical: true,
        note: 'Manual correction',
        timestamp: mockTimestamp,
      });

      expect(meta.note).toBe('Manual correction');
      expect(meta.canonical).toBe(true);
    });

    it('should default canonical to false', () => {
      const meta = createAttributeMeta({
        actor: 'system:normalizer',
        source: 'normalizer',
        method: 'normalizeProductAttributeValues',
        definitionVersion: '1.0.3',
        timestamp: mockTimestamp,
      });

      expect(meta.canonical).toBe(false);
    });

    it('should use current time if timestamp not provided', () => {
      const before = new Date().toISOString();
      const meta = createAttributeMeta({
        actor: 'system:migrator',
        source: 'migration',
        method: 'test',
        definitionVersion: '1.0.0',
      });
      const after = new Date().toISOString();

      expect(meta.ts >= before).toBe(true);
      expect(meta.ts <= after).toBe(true);
    });
  });

  describe('buildPerKeyUpdatePayload', () => {
    it('should build per-key update payload for attributes', () => {
      const payload = buildPerKeyUpdatePayload({
        attributes: {
          primary_color: 'Black',
          gender: 'Men',
        },
        actor: 'system:normalizer',
        source: 'normalizer',
        method: 'normalizeProductAttributeValues',
        definitionVersion: '1.0.3',
        timestamp: mockTimestamp,
      });

      expect(payload['attributes.primary_color']).toBe('Black');
      expect(payload['attributes.gender']).toBe('Men');
      expect(payload['attributes._meta.primary_color']).toEqual({
        actor: 'system:normalizer',
        source: 'normalizer',
        ts: mockTimestamp,
        method: 'normalizeProductAttributeValues',
        definition_version: '1.0.3',
        canonical: false,
      });
      expect(payload['attributes._meta.gender']).toEqual({
        actor: 'system:normalizer',
        source: 'normalizer',
        ts: mockTimestamp,
        method: 'normalizeProductAttributeValues',
        definition_version: '1.0.3',
        canonical: false,
      });
    });

    it('should skip internal fields (starting with _)', () => {
      const payload = buildPerKeyUpdatePayload({
        attributes: {
          primary_color: 'Black',
          _internal: 'should be skipped',
        },
        actor: 'system:migrator',
        source: 'migration',
        method: 'test',
        definitionVersion: '1.0.0',
        timestamp: mockTimestamp,
      });

      expect(payload['attributes.primary_color']).toBe('Black');
      expect(payload['attributes._internal']).toBeUndefined();
    });

    it('should apply canonicalOverrides per attribute', () => {
      const payload = buildPerKeyUpdatePayload({
        attributes: {
          primary_color: 'Black',
          gender: 'Men',
        },
        actor: 'system:migrator',
        source: 'migration',
        method: 'test',
        definitionVersion: '1.0.0',
        canonical: false,
        canonicalOverrides: {
          primary_color: true,
        },
        timestamp: mockTimestamp,
      });

      const primaryMeta = payload['attributes._meta.primary_color'] as AttributeMetaEntry;
      const genderMeta = payload['attributes._meta.gender'] as AttributeMetaEntry;

      expect(primaryMeta.canonical).toBe(true);
      expect(genderMeta.canonical).toBe(false);
    });

    it('should include note in all meta entries when provided', () => {
      const payload = buildPerKeyUpdatePayload({
        attributes: {
          primary_color: 'Black',
        },
        actor: 'admin:user@example.com',
        source: 'admin',
        method: 'manualUpdate',
        definitionVersion: '1.0.0',
        note: 'Corrected color',
        timestamp: mockTimestamp,
      });

      const meta = payload['attributes._meta.primary_color'] as AttributeMetaEntry;
      expect(meta.note).toBe('Corrected color');
    });
  });

  describe('isAdminCanonical', () => {
    it('should return true for admin-canonical entries', () => {
      const meta: AttributeMetaEntry = {
        actor: 'admin:theo@example.com',
        source: 'admin',
        ts: mockTimestamp,
        method: 'productEditor',
        definition_version: '1.0.3',
        canonical: true,
      };

      expect(isAdminCanonical(meta)).toBe(true);
    });

    it('should return false for system-canonical entries', () => {
      const meta: AttributeMetaEntry = {
        actor: 'system:migrator',
        source: 'migration',
        ts: mockTimestamp,
        method: 'migrateProductsToAttributes',
        definition_version: '1.0.3',
        canonical: true,
      };

      expect(isAdminCanonical(meta)).toBe(false);
    });

    it('should return false for admin non-canonical entries', () => {
      const meta: AttributeMetaEntry = {
        actor: 'admin:theo@example.com',
        source: 'admin',
        ts: mockTimestamp,
        method: 'productEditor',
        definition_version: '1.0.3',
        canonical: false,
      };

      expect(isAdminCanonical(meta)).toBe(false);
    });

    it('should return false for undefined meta', () => {
      expect(isAdminCanonical(undefined)).toBe(false);
    });
  });

  describe('getProtectedAttributes', () => {
    it('should return protected attribute keys', () => {
      const meta: Record<string, AttributeMetaEntry> = {
        primary_color: {
          actor: 'admin:theo@example.com',
          source: 'admin',
          ts: mockTimestamp,
          method: 'productEditor',
          definition_version: '1.0.3',
          canonical: true,
        },
        gender: {
          actor: 'system:migrator',
          source: 'migration',
          ts: mockTimestamp,
          method: 'migrateProductsToAttributes',
          definition_version: '1.0.3',
          canonical: false,
        },
        age_group: {
          actor: 'admin:lisa@example.com',
          source: 'admin',
          ts: mockTimestamp,
          method: 'productEditor',
          definition_version: '1.0.3',
          canonical: true,
        },
      };

      const protected_ = getProtectedAttributes(meta, ['primary_color', 'gender', 'age_group']);

      expect(protected_).toContain('primary_color');
      expect(protected_).toContain('age_group');
      expect(protected_).not.toContain('gender');
      expect(protected_).toHaveLength(2);
    });

    it('should return empty array for undefined meta', () => {
      const protected_ = getProtectedAttributes(undefined, ['primary_color']);
      expect(protected_).toEqual([]);
    });

    it('should return empty array when no attributes are protected', () => {
      const meta: Record<string, AttributeMetaEntry> = {
        primary_color: {
          actor: 'system:migrator',
          source: 'migration',
          ts: mockTimestamp,
          method: 'migrateProductsToAttributes',
          definition_version: '1.0.3',
          canonical: false,
        },
      };

      const protected_ = getProtectedAttributes(meta, ['primary_color']);
      expect(protected_).toEqual([]);
    });
  });

  describe('generateAttributeDiff', () => {
    it('should generate diff for normal update', () => {
      const diff = generateAttributeDiff(
        'primary_color',
        'BLACK',
        'Black',
        undefined,
        {
          actor: 'system:normalizer' as ActorType,
          source: 'normalizer',
          method: 'normalizeProductAttributeValues',
          definitionVersion: '1.0.3',
          timestamp: mockTimestamp,
        }
      );

      expect(diff.attrId).toBe('primary_color');
      expect(diff.old_value).toBe('BLACK');
      expect(diff.new_value).toBe('Black');
      expect(diff.protected).toBe(false);
      expect(diff.reason).toBe('normal: value will be updated');
    });

    it('should mark protected attributes when admin-canonical exists', () => {
      const oldMeta: AttributeMetaEntry = {
        actor: 'admin:theo@example.com',
        source: 'admin',
        ts: '2025-12-20T00:00:00.000Z',
        method: 'productEditor',
        definition_version: '1.0.2',
        canonical: true,
      };

      const diff = generateAttributeDiff(
        'primary_color',
        'Black',
        'BLACK',
        oldMeta,
        {
          actor: 'system:migrator' as ActorType,
          source: 'migration',
          method: 'migrateProductsToAttributes',
          definitionVersion: '1.0.3',
          timestamp: mockTimestamp,
        },
        false // not forcing
      );

      expect(diff.protected).toBe(true);
      expect(diff.new_value).toBe('Black'); // keeps old value
      expect(diff.reason).toContain('admin-canonical: protected');
    });

    it('should allow force-admin to override protection', () => {
      const oldMeta: AttributeMetaEntry = {
        actor: 'admin:theo@example.com',
        source: 'admin',
        ts: '2025-12-20T00:00:00.000Z',
        method: 'productEditor',
        definition_version: '1.0.2',
        canonical: true,
      };

      const diff = generateAttributeDiff(
        'primary_color',
        'Black',
        'BLACK',
        oldMeta,
        {
          actor: 'system:migrator' as ActorType,
          source: 'migration',
          method: 'migrateProductsToAttributes',
          definitionVersion: '1.0.3',
          timestamp: mockTimestamp,
        },
        true // forcing
      );

      expect(diff.protected).toBe(true);
      expect(diff.new_value).toBe('BLACK'); // uses new value
      expect(diff.reason).toContain('force-admin: overwriting');
    });
  });
});
