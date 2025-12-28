/**
 * LP-importer-mapping-recon-1.0.0: Tests for deduplicated mapping field options
 * 
 * Validates that AVAILABLE_FIELDS has unique targetField entries,
 * specifically ensuring MPN appears only once despite multiple aliases.
 */

import { describe, it, expect } from 'vitest';
import { DEFAULT_COLUMN_MAPPINGS } from '@ropi-aoss/sdk';

/**
 * Recreation of the dedupe logic from ImportMappingStep.tsx
 * for isolated unit testing.
 */
function buildDeduplicatedFields() {
  const uniqueFieldMap = new Map<string, { value: string; label: string; required: boolean }>();
  for (const m of DEFAULT_COLUMN_MAPPINGS as any[]) {
    const key = m.targetField;
    if (!uniqueFieldMap.has(key)) {
      uniqueFieldMap.set(key, { value: key, label: key, required: !!m.required });
    } else if (m.required) {
      // If any alias for this target is required, mark the option as required
      uniqueFieldMap.get(key)!.required = true;
    }
  }
  return Array.from(uniqueFieldMap.values());
}

describe('ImportMappingStep - LP-importer-mapping-recon-1.0.0: Field Deduplication', () => {
  describe('AVAILABLE_FIELDS deduplication', () => {
    it('should have unique value entries (no duplicate targetFields)', () => {
      const fields = buildDeduplicatedFields();
      const values = fields.map(f => f.value);
      const uniqueValues = new Set(values);
      
      expect(values.length).toBe(uniqueValues.size);
    });

    it('should have MPN appear exactly once', () => {
      const fields = buildDeduplicatedFields();
      const mpnFields = fields.filter(f => f.value === 'mpn');
      
      expect(mpnFields.length).toBe(1);
    });

    it('should mark MPN as required (since at least one alias has required=true)', () => {
      const fields = buildDeduplicatedFields();
      const mpnField = fields.find(f => f.value === 'mpn');
      
      expect(mpnField).toBeDefined();
      expect(mpnField!.required).toBe(true);
    });

    it('should have ricsCategory appear exactly once', () => {
      const fields = buildDeduplicatedFields();
      const ricsFields = fields.filter(f => f.value === 'ricsCategory');
      
      expect(ricsFields.length).toBe(1);
    });

    it('should have ricsColor appear exactly once', () => {
      const fields = buildDeduplicatedFields();
      const ricsColorFields = fields.filter(f => f.value === 'ricsColor');
      
      expect(ricsColorFields.length).toBe(1);
    });

    it('should preserve non-required status for optional fields', () => {
      const fields = buildDeduplicatedFields();
      const skuField = fields.find(f => f.value === 'sku');
      
      expect(skuField).toBeDefined();
      expect(skuField!.required).toBe(false);
    });

    it('should include all unique targetFields from DEFAULT_COLUMN_MAPPINGS', () => {
      const fields = buildDeduplicatedFields();
      const expectedTargets = new Set(
        (DEFAULT_COLUMN_MAPPINGS as any[]).map(m => m.targetField)
      );
      
      const actualTargets = new Set(fields.map(f => f.value));
      
      // Every unique target from mappings should be in the deduplicated list
      for (const expected of expectedTargets) {
        expect(actualTargets.has(expected)).toBe(true);
      }
      
      // And the counts should match
      expect(actualTargets.size).toBe(expectedTargets.size);
    });
  });

  describe('Backward compatibility', () => {
    it('should not modify DEFAULT_COLUMN_MAPPINGS (normalizer still has all aliases)', () => {
      // Ensure the source mappings still have multiple MPN aliases
      const mpnMappings = (DEFAULT_COLUMN_MAPPINGS as any[]).filter(
        m => m.targetField === 'mpn'
      );
      
      // There should be multiple aliases for MPN (MPN, mpn, Manufacturer Part Number)
      expect(mpnMappings.length).toBeGreaterThan(1);
      
      // All should map to 'mpn'
      mpnMappings.forEach(m => {
        expect(m.targetField).toBe('mpn');
      });
    });

    it('should not affect RICS mappings in DEFAULT_COLUMN_MAPPINGS', () => {
      const ricsCategoryMappings = (DEFAULT_COLUMN_MAPPINGS as any[]).filter(
        m => m.targetField === 'ricsCategory'
      );
      
      // There should be multiple aliases (RICS Category, rics_category)
      expect(ricsCategoryMappings.length).toBeGreaterThan(1);
    });
  });
});
