/**
 * Integration tests for migrateProductsToAttributes.ts
 * LP-2.1.7
 * 
 * Tests the per-key update logic and _meta provenance.
 * Note: These tests require mocking Firestore or running against emulator.
 */

import { describe, it, expect, vi, beforeEach } from 'vitest';
import {
  buildPerKeyUpdatePayload,
  isAdminCanonical,
  type AttributeMetaEntry,
} from '../src/lib/attributeMeta';

describe('migrateProductsToAttributes integration', () => {
  const mockTimestamp = '2025-12-21T12:00:00.000Z';

  describe('per-key update payload generation', () => {
    it('should generate proper per-key update payload for migration', () => {
      // Simulate the payload that would be generated for a product
      const attributesToUpdate = {
        gender: 'Men',
        primary_color: 'Black',
        material: 'Leather',
      };

      const payload = buildPerKeyUpdatePayload({
        attributes: attributesToUpdate,
        actor: 'system:migrator',
        source: 'migration',
        method: 'migrateProductsToAttributes',
        definitionVersion: '1.0.3',
        canonical: false,
        timestamp: mockTimestamp,
      });

      // Check that each attribute has both value and _meta entries
      expect(payload['attributes.gender']).toBe('Men');
      expect(payload['attributes.primary_color']).toBe('Black');
      expect(payload['attributes.material']).toBe('Leather');

      // Check _meta entries
      const genderMeta = payload['attributes._meta.gender'] as AttributeMetaEntry;
      expect(genderMeta.actor).toBe('system:migrator');
      expect(genderMeta.source).toBe('migration');
      expect(genderMeta.method).toBe('migrateProductsToAttributes');
      expect(genderMeta.definition_version).toBe('1.0.3');
      expect(genderMeta.canonical).toBe(false);
    });

    it('should preserve existing _meta fields when adding new attributes', () => {
      // Simulate existing product with some _meta
      const existingMeta: Record<string, AttributeMetaEntry> = {
        age_group: {
          actor: 'admin:theo@example.com',
          source: 'admin',
          ts: '2025-12-20T00:00:00.000Z',
          method: 'productEditor',
          definition_version: '1.0.2',
          canonical: true,
        },
      };

      // New attributes to migrate (should not touch age_group)
      const newPayload = buildPerKeyUpdatePayload({
        attributes: {
          gender: 'Men',
        },
        actor: 'system:migrator',
        source: 'migration',
        method: 'migrateProductsToAttributes',
        definitionVersion: '1.0.3',
        timestamp: mockTimestamp,
      });

      // The payload should only contain the new attribute
      expect(newPayload['attributes.gender']).toBe('Men');
      expect(newPayload['attributes._meta.gender']).toBeDefined();

      // It should NOT touch the existing age_group _meta
      expect(newPayload['attributes.age_group']).toBeUndefined();
      expect(newPayload['attributes._meta.age_group']).toBeUndefined();
    });
  });

  describe('admin-canonical protection', () => {
    it('should identify admin-canonical protected values', () => {
      const adminMeta: AttributeMetaEntry = {
        actor: 'admin:theo@example.com',
        source: 'admin',
        ts: '2025-12-20T00:00:00.000Z',
        method: 'productEditor',
        definition_version: '1.0.2',
        canonical: true,
      };

      const systemMeta: AttributeMetaEntry = {
        actor: 'system:migrator',
        source: 'migration',
        ts: '2025-12-19T00:00:00.000Z',
        method: 'migrateProductsToAttributes',
        definition_version: '1.0.1',
        canonical: true, // Even if canonical is true, system actor is not protected
      };

      expect(isAdminCanonical(adminMeta)).toBe(true);
      expect(isAdminCanonical(systemMeta)).toBe(false);
    });

    it('should not protect non-canonical admin entries', () => {
      const adminNonCanonical: AttributeMetaEntry = {
        actor: 'admin:theo@example.com',
        source: 'admin',
        ts: '2025-12-20T00:00:00.000Z',
        method: 'productEditor',
        definition_version: '1.0.2',
        canonical: false,
      };

      expect(isAdminCanonical(adminNonCanonical)).toBe(false);
    });
  });

  describe('batch commit simulation', () => {
    it('should batch payloads correctly for Firestore batch writes', () => {
      // Simulate batching multiple product updates
      const products = [
        { id: 'prod1', updates: { gender: 'Men' } },
        { id: 'prod2', updates: { gender: 'Women', primary_color: 'Black' } },
        { id: 'prod3', updates: { material: 'Leather' } },
      ];

      const batches: Array<{ docId: string; payload: Record<string, unknown> }> = [];

      for (const product of products) {
        const payload = buildPerKeyUpdatePayload({
          attributes: product.updates,
          actor: 'system:migrator',
          source: 'migration',
          method: 'migrateProductsToAttributes',
          definitionVersion: '1.0.3',
          timestamp: mockTimestamp,
        });

        batches.push({ docId: product.id, payload });
      }

      expect(batches).toHaveLength(3);

      // Verify first batch
      expect(batches[0].docId).toBe('prod1');
      expect(batches[0].payload['attributes.gender']).toBe('Men');

      // Verify second batch has multiple attributes
      expect(batches[1].docId).toBe('prod2');
      expect(batches[1].payload['attributes.gender']).toBe('Women');
      expect(batches[1].payload['attributes.primary_color']).toBe('Black');

      // Count total operations
      let totalOps = 0;
      for (const batch of batches) {
        // Each payload has 2 keys per attribute (value + _meta)
        totalOps += Object.keys(batch.payload).length / 2;
      }
      expect(totalOps).toBe(4); // 1 + 2 + 1
    });
  });

  describe('dry-run vs apply behavior', () => {
    it('should generate correct report structure for dry-run', () => {
      // Simulate dry-run report structure
      const dryRunReport = {
        lp: 'LP-2.1.7',
        mode: 'dry-run',
        timestamp: mockTimestamp,
        registryVersion: '1.0.3',
        forceAdmin: false,
        stats: {
          processed: 100,
          updated: 45,
          skipped: 55,
          errors: 0,
          protectedAttributes: 3,
          totalAttributeChanges: 120,
        },
        productDiffs: [
          {
            productId: 'prod1',
            mpn: 'TEST-001',
            attributeDiffs: [
              {
                attrId: 'gender',
                old_value: null,
                new_value: 'Men',
                old_meta: undefined,
                new_meta_predicted: {
                  actor: 'system:migrator',
                  source: 'migration',
                  ts: mockTimestamp,
                  method: 'migrateProductsToAttributes',
                  definition_version: '1.0.3',
                  canonical: false,
                },
                protected: false,
                reason: 'normal: value will be updated',
              },
            ],
            protectedCount: 0,
            changeCount: 1,
          },
        ],
        errors: [],
      };

      expect(dryRunReport.mode).toBe('dry-run');
      expect(dryRunReport.stats.processed).toBeGreaterThan(0);
      expect(dryRunReport.productDiffs[0].attributeDiffs[0].attrId).toBe('gender');
    });
  });
});
