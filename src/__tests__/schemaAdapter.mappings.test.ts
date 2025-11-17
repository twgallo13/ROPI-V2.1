/**
 * Schema Adapter Canonical Mapping Tests
 * Tests for legacyToNew and newToLegacy field mappings
 */

import { describe, it, expect } from 'vitest';
import { legacyToNew, newToLegacy } from '../utils/schemaAdapter';
import type { Product } from '../types/product-schema';

describe('schemaAdapter canonical mappings', () => {
  describe('legacyToNew', () => {
    it('should map RICS shortDescription to sku_core.name', () => {
      const legacy: any = {
        mpn: 'TEST-001',
        name: 'Generic Name',
        ricsShortDesc: 'RICS Short Description',
        brand: 'Test Brand',
        department: 'Footwear',
        class: 'Athletic',
        category: 'Running',
        ageGroup: 'Adult',
        gender: "Men's",
      };

      const canonical = legacyToNew(legacy);

      expect(canonical.sku_core.name).toBe('RICS Short Description');
    });

    it('should fallback to legacy name if RICS shortDescription missing', () => {
      const legacy: any = {
        mpn: 'TEST-002',
        name: 'Legacy Name',
        brand: 'Test Brand',
        department: 'Footwear',
        class: 'Athletic',
        category: 'Running',
        ageGroup: 'Adult',
        gender: "Men's",
      };

      const canonical = legacyToNew(legacy);

      expect(canonical.sku_core.name).toBe('Legacy Name');
    });

    it('should map RICS color to descriptive.primaryColor', () => {
      const legacy: any = {
        mpn: 'TEST-003',
        name: 'Test Product',
        ricsColor: 'Navy Blue',
        primaryColor: undefined,
        brand: 'Test Brand',
        department: 'Footwear',
        class: 'Athletic',
        category: 'Running',
        ageGroup: 'Adult',
        gender: "Men's",
      };

      const canonical = legacyToNew(legacy);

      expect(canonical.descriptive.primaryColor).toBe('navy blue');
    });

    it('should normalize and dedupe materials array', () => {
      const legacy: any = {
        mpn: 'TEST-004',
        name: 'Test Product',
        materials: ['Leather', 'Synthetic'],
        materialFabric: 'Mesh',
        material: 'Leather, Rubber',
        brand: 'Test Brand',
        department: 'Footwear',
        class: 'Athletic',
        category: 'Running',
        ageGroup: 'Adult',
        gender: "Men's",
      };

      const canonical = legacyToNew(legacy);

      expect(canonical.descriptive.material).toEqual(['Leather', 'Mesh', 'Rubber', 'Synthetic']);
    });

    it('should populate technical inventory fields from legacy', () => {
      const legacy: any = {
        mpn: 'TEST-005',
        name: 'Test Product',
        brand: 'Test Brand',
        department: 'Footwear',
        class: 'Athletic',
        category: 'Running',
        ageGroup: 'Adult',
        gender: "Men's",
        lastReceived: '2025-01-15',
        firstReceived: '2024-12-01',
        storeInv: 10,
        store1: 5,
        store4: 3,
        warehouseInv: 100,
        whsInv: 50,
        totalInv: 110,
        variantCount: 8,
      };

      const canonical = legacyToNew(legacy);

      expect(canonical.technical.lastReceived).toBe('2025-01-15');
      expect(canonical.technical.firstReceived).toBe('2024-12-01');
      expect(canonical.technical.storeInv).toBe(10);
      expect(canonical.technical.store1).toBe(5);
      expect(canonical.technical.store4).toBe(3);
      expect(canonical.technical.warehouseInv).toBe(100);
      expect(canonical.technical.whsInv).toBe(50);
      expect(canonical.technical.totalInv).toBe(110);
      expect(canonical.technical.variantCount).toBe(8);
    });

    it('should populate technical custom fields from legacy', () => {
      const legacy: any = {
        mpn: 'TEST-006',
        name: 'Test Product',
        brand: 'Test Brand',
        department: 'Footwear',
        class: 'Athletic',
        category: 'Running',
        ageGroup: 'Adult',
        gender: "Men's",
        custom2: 'Custom Value 2',
        custom3: 'Custom Value 3',
      };

      const canonical = legacyToNew(legacy);

      expect(canonical.technical.custom2).toBe('Custom Value 2');
      expect(canonical.technical.custom3).toBe('Custom Value 3');
    });

    it('should populate source.rics fields from legacy', () => {
      const legacy: any = {
        mpn: 'TEST-007',
        name: 'Test Product',
        brand: 'Test Brand',
        department: 'Footwear',
        class: 'Athletic',
        category: 'Running',
        ageGroup: 'Adult',
        gender: "Men's",
        ricsShortDesc: 'Short Description',
        ricsLongDesc: 'Long Description',
        ricsCategory: 'Category',
        ricsColor: 'Red',
      };

      const canonical = legacyToNew(legacy);

      expect(canonical.source?.rics?.shortDescription).toBe('Short Description');
      expect(canonical.source?.rics?.longDescription).toBe('Long Description');
      expect(canonical.source?.rics?.category).toBe('Category');
      expect(canonical.source?.rics?.color).toBe('Red');
    });

    it('should map FD ZAHARA-S-WHT sample product correctly', () => {
      const fdZaharaSample: any = {
        mpn: 'FD ZAHARA-S-WHT',
        name: 'ZAHARA S WHT',
        ricsShortDesc: 'Zahara Sandal White',
        brand: 'Fashion Designer',
        department: 'Footwear',
        class: 'Sandals',
        category: 'Women',
        ageGroup: 'Adult',
        gender: "Women's",
        ricsColor: 'White',
        primaryColor: undefined,
        materials: ['Leather', 'Synthetic'],
        lastReceived: '2025-11-15',
        storeInv: 12,
        warehouseInv: 48,
        totalInv: 60,
        variantCount: 6,
        custom2: 'Summer Collection',
        ricsCategory: 'Sandals',
      };

      const canonical = legacyToNew(fdZaharaSample);

      expect(canonical.sku_core.mpn).toBe('FD ZAHARA-S-WHT');
      expect(canonical.sku_core.name).toBe('Zahara Sandal White');
      expect(canonical.descriptive.primaryColor).toBe('white');
      expect(canonical.descriptive.material).toEqual(['Leather', 'Synthetic']);
      expect(canonical.technical.lastReceived).toBe('2025-11-15');
      expect(canonical.technical.storeInv).toBe(12);
      expect(canonical.technical.warehouseInv).toBe(48);
      expect(canonical.technical.totalInv).toBe(60);
      expect(canonical.technical.variantCount).toBe(6);
      expect(canonical.technical.custom2).toBe('Summer Collection');
      expect(canonical.source?.rics?.color).toBe('White');
      expect(canonical.source?.rics?.category).toBe('Sandals');
    });
  });

  describe('newToLegacy', () => {
    it('should write RICS fields to legacy format', () => {
      const canonical: Product = {
        sku_core: {
          mpn: 'TEST-008',
          sku: 'TEST-008',
          brand: 'Test Brand',
          name: 'Test Name',
          department: 'Footwear',
          class: 'Athletic',
          category: 'Running',
          styleId: 'TEST-008',
          productIsActive: true,
        },
        descriptive: {
          ageGroup: 'Adult',
          gender: "Men's",
          fit: 'Regular',
          material: ['Leather', 'Mesh'],
          primaryColor: 'navy blue',
          descriptiveColor: 'Navy',
          keywords: [],
          metaName: '',
          metaDescription: '',
        },
        pricing: {},
        technical: {
          lastReceived: '2025-11-15',
          firstReceived: '2025-11-01',
          storeInv: 20,
          warehouseInv: 80,
          totalInv: 100,
          variantCount: 5,
          custom2: 'Custom 2',
          custom3: 'Custom 3',
        },
        launch: {
          newCollection: 'Fall 2025',
        },
        source: {
          rics: {
            shortDescription: 'RICS Short',
            longDescription: 'RICS Long',
            category: 'RICS Category',
            color: 'Navy',
          },
        },
      };

      const legacy = newToLegacy(canonical);

      expect(legacy.ricsShortDesc).toBe('RICS Short');
      expect(legacy.ricsLongDesc).toBe('RICS Long');
      expect(legacy.ricsCategory).toBe('RICS Category');
      expect((legacy as any).ricsColor).toBe('Navy');
      expect((legacy as any).lastReceived).toBe('2025-11-15');
      expect((legacy as any).firstReceived).toBe('2025-11-01');
      expect((legacy as any).storeInv).toBe(20);
      expect((legacy as any).warehouseInv).toBe(80);
      expect((legacy as any).totalInv).toBe(100);
      expect((legacy as any).variantCount).toBe(5);
      expect((legacy as any).custom2).toBe('Custom 2');
      expect((legacy as any).custom3).toBe('Custom 3');
      expect(legacy.launch?.newCollection).toBe('Fall 2025');
    });

    it('should round-trip canonical fields correctly', () => {
      const original: Product = {
        sku_core: {
          mpn: 'ROUNDTRIP-001',
          sku: 'ROUNDTRIP-001',
          brand: 'Test',
          name: 'Round Trip Test',
          department: 'Footwear',
          class: 'Athletic',
          category: 'Running',
          styleId: 'ROUNDTRIP-001',
          productIsActive: true,
        },
        descriptive: {
          ageGroup: 'Adult',
          gender: "Men's",
          fit: 'Regular',
          material: ['Leather', 'Mesh', 'Rubber'],
          primaryColor: 'black',
          keywords: [],
          metaName: '',
          metaDescription: '',
        },
        pricing: {},
        technical: {
          lastReceived: '2025-11-17',
          storeInv: 15,
          variantCount: 4,
          custom2: 'Test Custom',
        },
        launch: {
          newCollection: 'Winter 2025',
        },
        source: {
          rics: {
            shortDescription: 'Test Short',
            color: 'Black',
          },
        },
      };

      const legacy = newToLegacy(original);
      const roundTripped = legacyToNew(legacy as any);

      // Verify round-trip preserves canonical fields
      expect(roundTripped.technical.lastReceived).toBe(original.technical.lastReceived);
      expect(roundTripped.technical.storeInv).toBe(original.technical.storeInv);
      expect(roundTripped.technical.variantCount).toBe(original.technical.variantCount);
      expect(roundTripped.technical.custom2).toBe(original.technical.custom2);
      expect(roundTripped.launch.newCollection).toBe(original.launch.newCollection);
      expect(roundTripped.source?.rics?.shortDescription).toBe(original.source?.rics?.shortDescription);
      expect(roundTripped.source?.rics?.color).toBe(original.source?.rics?.color);
    });
  });
});
