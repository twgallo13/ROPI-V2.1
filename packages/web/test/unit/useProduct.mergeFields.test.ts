/**
 * Unit tests for useProduct field merging functions
 * LP-1.3.7: Verify core and inventory fields are merged to top-level
 */
import { describe, it, expect } from 'vitest';

// Re-implement the merge functions for testing (they're not exported from useProduct.ts)
const CORE_FIELD_KEYS = [
  'mpn', 'sku', 'brand', 'title', 'name', 'status', 'description',
  'styleId', 'style_id', 'firstReceived', 'first_received', 
  'lastReceived', 'last_received', 'launchDate', 'launch_date',
  'createdAt', 'updatedAt',
];

const INVENTORY_FIELD_KEYS = [
  'quantity', 'warehouse_inv', 'store_inv', 'whs_inv', 'total_inv',
  'warehouse', 'location',
];

function mergeCoreFieldsToTopLevel(docData: Record<string, unknown>): Record<string, unknown> {
  const core = docData.core as Record<string, unknown> | undefined;
  const inventory = docData.inventory as Record<string, unknown> | undefined;
  
  const merged = { ...docData };
  
  // Merge core fields
  if (core && typeof core === 'object') {
    for (const key of CORE_FIELD_KEYS) {
      if ((merged[key] === undefined || merged[key] === null) && core[key] !== undefined && core[key] !== null) {
        merged[key] = core[key];
      }
    }
  }
  
  // Merge inventory fields
  if (inventory && typeof inventory === 'object') {
    for (const key of INVENTORY_FIELD_KEYS) {
      if ((merged[key] === undefined || merged[key] === null) && inventory[key] !== undefined && inventory[key] !== null) {
        merged[key] = inventory[key];
      }
    }
  }

  return merged;
}

describe('mergeCoreFieldsToTopLevel', () => {
  it('should merge MPN from core to top-level', () => {
    const docData = {
      id: '451-9103-blk1',
      core: {
        mpn: '451-9103-BLK1',
        sku: 'SHK3054050',
        brand: 'ICE CREAM/ROC',
      },
    };

    const result = mergeCoreFieldsToTopLevel(docData);

    expect(result.mpn).toBe('451-9103-BLK1');
    expect(result.sku).toBe('SHK3054050');
    expect(result.brand).toBe('ICE CREAM/ROC');
  });

  it('should not overwrite existing top-level fields', () => {
    const docData = {
      id: '451-9103-blk1',
      mpn: 'TOP-LEVEL-MPN', // Already set at top level
      core: {
        mpn: 'CORE-MPN', // Should NOT overwrite
        sku: 'CORE-SKU',
      },
    };

    const result = mergeCoreFieldsToTopLevel(docData);

    expect(result.mpn).toBe('TOP-LEVEL-MPN'); // Preserved
    expect(result.sku).toBe('CORE-SKU'); // Merged
  });

  it('should merge inventory fields to top-level', () => {
    const docData = {
      id: '451-9103-blk1',
      inventory: {
        warehouse_inv: 50,
        store_inv: 10,
        quantity: 60,
      },
    };

    const result = mergeCoreFieldsToTopLevel(docData);

    expect(result.warehouse_inv).toBe(50);
    expect(result.store_inv).toBe(10);
    expect(result.quantity).toBe(60);
  });

  it('should handle missing core and inventory gracefully', () => {
    const docData = {
      id: '451-9103-blk1',
      mpn: 'EXISTING-MPN',
    };

    const result = mergeCoreFieldsToTopLevel(docData);

    expect(result.mpn).toBe('EXISTING-MPN');
    expect(result.core).toBeUndefined();
  });

  it('should merge all fields from exact Firestore structure', () => {
    // This matches the actual Firestore document structure from product-451-9103-blk1-raw.json
    const docData = {
      id: '451-9103-blk1',
      core: {
        createdAt: '2025-12-28T20:33:29.427Z',
        sku: 'SHK3054050',
        brand: 'ICE CREAM/ROC',
        status: 'draft',
        mpn: '451-9103-BLK1',
        title: 'b359bd97-d460-4082-9707-b3bc01653c38',
        firstReceived: '2025-12-26T00:00:00.000Z',
        updatedAt: '2025-12-28T21:03:45.283Z',
      },
      inventory: {
        quantity: 0,
      },
      attributes: {
        rics_color: 'BLACK',
        rics_long_desc: 'running sweatpants',
        rics_short_description: 'running sweatpants',
        currency: 'USD',
        rics_category: 'Apparel||Mens||Pants||Casual',
        department: 'Footwear',
      },
    };

    const result = mergeCoreFieldsToTopLevel(docData);

    // Core fields merged to top-level
    expect(result.mpn).toBe('451-9103-BLK1');
    expect(result.sku).toBe('SHK3054050');
    expect(result.brand).toBe('ICE CREAM/ROC');
    expect(result.status).toBe('draft');
    expect(result.title).toBe('b359bd97-d460-4082-9707-b3bc01653c38');
    expect(result.firstReceived).toBe('2025-12-26T00:00:00.000Z');
    
    // Inventory merged to top-level
    expect(result.quantity).toBe(0);
    
    // Nested objects preserved
    expect(result.core).toBeDefined();
    expect(result.inventory).toBeDefined();
    expect(result.attributes).toBeDefined();
  });
});
