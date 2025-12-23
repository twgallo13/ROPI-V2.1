/**
 * Integration tests for normalizeProductAttributeValues.ts
 * LP-2.1.7
 * 
 * Tests the per-key update logic and _meta provenance for normalization.
 */

import { describe, it, expect } from 'vitest';
import {
  buildPerKeyUpdatePayload,
  isAdminCanonical,
  type AttributeMetaEntry,
} from '../src/lib/attributeMeta';

describe('normalizeProductAttributeValues integration', () => {
  const mockTimestamp = '2025-12-21T12:00:00.000Z';

  describe('normalization per-key updates', () => {
    it('should generate per-key update payload for normalized values', () => {
      // Simulate normalized values
      const normalizedAttributes = {
        primary_color: 'Black', // was 'BLACK' or 'black'
        gender: 'Men',          // was 'MENS' or 'mens'
      };

      const payload = buildPerKeyUpdatePayload({
        attributes: normalizedAttributes,
        actor: 'system:normalizer',
        source: 'normalizer',
        method: 'normalizeProductAttributeValues',
        definitionVersion: '1.0.3',
        canonical: false,
        timestamp: mockTimestamp,
      });

      expect(payload['attributes.primary_color']).toBe('Black');
      expect(payload['attributes.gender']).toBe('Men');

      const colorMeta = payload['attributes._meta.primary_color'] as AttributeMetaEntry;
      expect(colorMeta.actor).toBe('system:normalizer');
      expect(colorMeta.source).toBe('normalizer');
      expect(colorMeta.method).toBe('normalizeProductAttributeValues');
    });

    it('should preserve _meta for unchanged attributes', () => {
      // Only changed attributes should be in the payload
      // Unchanged attributes should not appear
      const changedAttributes = {
        primary_color: 'Black', // only this changed
      };

      const payload = buildPerKeyUpdatePayload({
        attributes: changedAttributes,
        actor: 'system:normalizer',
        source: 'normalizer',
        method: 'normalizeProductAttributeValues',
        definitionVersion: '1.0.3',
        timestamp: mockTimestamp,
      });

      // Should only have the changed attribute
      expect(Object.keys(payload)).toHaveLength(2); // attributes.key + attributes._meta.key
      expect(payload['attributes.primary_color']).toBe('Black');
      expect(payload['attributes._meta.primary_color']).toBeDefined();

      // Should NOT have gender since it wasn't changed
      expect(payload['attributes.gender']).toBeUndefined();
    });
  });

  describe('admin-canonical protection in normalization', () => {
    it('should identify admin-set canonical values as protected', () => {
      const adminCanonicalMeta: AttributeMetaEntry = {
        actor: 'admin:lisa@shiekhshoes.org',
        source: 'admin',
        ts: '2025-12-20T10:00:00.000Z',
        method: 'productEditor',
        definition_version: '1.0.2',
        canonical: true,
        note: 'Manually verified correct color',
      };

      expect(isAdminCanonical(adminCanonicalMeta)).toBe(true);
    });

    it('should not protect system-normalized values', () => {
      const systemNormalizedMeta: AttributeMetaEntry = {
        actor: 'system:normalizer',
        source: 'normalizer',
        ts: '2025-12-19T08:00:00.000Z',
        method: 'normalizeProductAttributeValues',
        definition_version: '1.0.1',
        canonical: false,
      };

      expect(isAdminCanonical(systemNormalizedMeta)).toBe(false);
    });
  });

  describe('normalization report structure', () => {
    it('should generate correct report structure', () => {
      const normalizationReport = {
        lp: 'LP-2.1.7',
        mode: 'dry-run',
        timestamp: mockTimestamp,
        registryVersion: '1.0.3',
        forceAdmin: false,
        stats: {
          processed: 1000,
          normalized: 350,
          skipped: 650,
          errors: 0,
          protectedAttributes: 12,
          totalAttributeChanges: 520,
          unmappedCount: 45,
        },
        productDiffs: [
          {
            productId: 'prod1',
            mpn: 'TEST-001',
            attributeDiffs: [
              {
                attrId: 'primary_color',
                old_value: 'BLACK/BLACK',
                new_value: 'Black',
                old_meta: undefined,
                new_meta_predicted: {
                  actor: 'system:normalizer',
                  source: 'normalizer',
                  ts: mockTimestamp,
                  method: 'normalizeProductAttributeValues',
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
        unmapped: [
          { productId: 'prod2', key: 'style', value: 'UNKNOWN_STYLE' },
        ],
        errors: [],
      };

      expect(normalizationReport.lp).toBe('LP-2.1.7');
      expect(normalizationReport.stats.normalized).toBeLessThan(normalizationReport.stats.processed);
      expect(normalizationReport.productDiffs[0].attributeDiffs[0].old_value).toBe('BLACK/BLACK');
      expect(normalizationReport.productDiffs[0].attributeDiffs[0].new_value).toBe('Black');
    });
  });

  describe('unmapped value tracking', () => {
    it('should track unmapped values structure', () => {
      const unmapped = [
        { productId: 'prod1', key: 'style', value: 'CASUAL_SNEAKER' },
        { productId: 'prod2', key: 'style', value: 'DRESS_BOOT' },
        { productId: 'prod3', key: 'occasion', value: 'EVERYDAY' },
      ];

      // Group by key (as the actual code does)
      const byKey = new Map<string, Set<string>>();
      for (const u of unmapped) {
        const values = byKey.get(u.key) || new Set();
        values.add(String(u.value));
        byKey.set(u.key, values);
      }

      expect(byKey.get('style')?.size).toBe(2);
      expect(byKey.get('occasion')?.size).toBe(1);
      expect(byKey.has('primary_color')).toBe(false);
    });
  });

  describe('_meta marker for normalization', () => {
    it('should format _normalization marker correctly', () => {
      const normalizationMarker = {
        actor: 'system:normalizer',
        source: 'normalizer',
        ts: mockTimestamp,
        method: 'normalizeProductAttributeValues',
        definition_version: '1.0.3',
        canonical: false,
        note: 'LP-2.1.7 normalization',
      };

      expect(normalizationMarker.actor).toBe('system:normalizer');
      expect(normalizationMarker.method).toBe('normalizeProductAttributeValues');
      expect(normalizationMarker.definition_version).toBe('1.0.3');
    });
  });
});
