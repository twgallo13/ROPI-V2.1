/**
 * Unit tests for useProduct field merging functions
 * LP-1.3.7: Verify core and inventory fields are merged to top-level
 * LP-1.3.8: Verify attribute fields are merged to top-level
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

const ATTRIBUTE_FIELDS_TO_TOP_LEVEL = [
  'department', 'class', 'category', 'subcategory',
  'gender', 'age_group', 'ageGroup',
  // LP-1.4.0: Added website field
  'website', 'websites',
  'primary_color', 'primaryColor', 'descriptive_color', 'descriptiveColor',
  'secondary_color', 'secondaryColor',
  'material', 'materials', 'fit', 'cut_type', 'closure_type',
  'league', 'sports_team', 'collection_name',
  'fast_fashion', 'heel_height', 'platform_height', 'heel_type', 'shoe_height_map',
  'hype', 'kl_post_date', 'promo', 'product_is_active',
  'gtin', 'tax_class', 'height', 'length', 'width', 'weight',
];

function mergeCoreFieldsToTopLevel(docData: Record<string, unknown>): Record<string, unknown> {
  const core = docData.core as Record<string, unknown> | undefined;
  const inventory = docData.inventory as Record<string, unknown> | undefined;
  const attributes = docData.attributes as Record<string, unknown> | undefined;
  
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
  
  // LP-1.3.8: Merge attribute fields to top-level
  if (attributes && typeof attributes === 'object') {
    for (const key of ATTRIBUTE_FIELDS_TO_TOP_LEVEL) {
      if ((merged[key] === undefined || merged[key] === null) && attributes[key] !== undefined && attributes[key] !== null) {
        merged[key] = attributes[key];
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
    
    // LP-1.3.8: Attribute fields merged to top-level
    expect(result.department).toBe('Footwear');
    
    // Nested objects preserved
    expect(result.core).toBeDefined();
    expect(result.inventory).toBeDefined();
    expect(result.attributes).toBeDefined();
  });

  // LP-1.3.8 Tests: Attribute field merging
  it('should merge class and category from attributes to top-level', () => {
    const docData = {
      id: '211737-90h1',
      attributes: {
        class: 'Sandle',
        category: 'Slides',
        department: 'Footwear',
        gender: "Men's",
      },
    };

    const result = mergeCoreFieldsToTopLevel(docData);

    expect(result.class).toBe('Sandle');
    expect(result.category).toBe('Slides');
    expect(result.department).toBe('Footwear');
    expect(result.gender).toBe("Men's");
  });

  it('should merge primary_color and descriptive_color from attributes', () => {
    const docData = {
      id: '211737-90h1',
      attributes: {
        primary_color: 'Green',
        descriptive_color: 'Green Croc',
        material: 'Pholyester',
      },
    };

    const result = mergeCoreFieldsToTopLevel(docData);

    expect(result.primary_color).toBe('Green');
    expect(result.descriptive_color).toBe('Green Croc');
    expect(result.material).toBe('Pholyester');
  });

  it('should merge fast_fashion and related fields from attributes', () => {
    const docData = {
      id: '211737-90h1',
      attributes: {
        fast_fashion: 'TRUE',
        hype: 'FALSE',
        product_is_active: 'TRUE',
        promo: 'Allowed',
      },
    };

    const result = mergeCoreFieldsToTopLevel(docData);

    expect(result.fast_fashion).toBe('TRUE');
    expect(result.hype).toBe('FALSE');
    expect(result.product_is_active).toBe('TRUE');
    expect(result.promo).toBe('Allowed');
  });

  it('should merge all fields from exact 211737-90h1 Firestore structure', () => {
    // This matches the actual Firestore document for product 211737-90h1
    const docData = {
      id: '211737-90h1',
      core: {
        mpn: '211737-90H1',
        sku: 'SHK3037625',
        brand: 'Crocs',
        status: 'draft',
      },
      inventory: {
        quantity: 0,
      },
      attributes: {
        gender: "Men's",
        material: 'Pholyester',
        category: 'Slides',
        department: 'Footwear',
        class: 'Sandle',
        rics_color: 'Multi',
        age_group: 'Adults',
        primary_color: 'Green',
        descriptive_color: 'Green Croc',
        league: 'MLB',
        sports_team: 'Los Angeles Dodge',
        fit: 'True to Size',
        fast_fashion: 'TRUE',
        collection_name: 'crocy-123',
      },
    };

    const result = mergeCoreFieldsToTopLevel(docData);

    // Core fields at top-level
    expect(result.mpn).toBe('211737-90H1');
    expect(result.sku).toBe('SHK3037625');
    expect(result.brand).toBe('Crocs');

    // Attribute fields at top-level for CoreInformationTab
    expect(result.department).toBe('Footwear');
    expect(result.class).toBe('Sandle');
    expect(result.category).toBe('Slides');
    expect(result.gender).toBe("Men's");
    expect(result.age_group).toBe('Adults');

    // Attribute fields at top-level for ProductAttributesTab
    expect(result.primary_color).toBe('Green');
    expect(result.descriptive_color).toBe('Green Croc');
    expect(result.material).toBe('Pholyester');
    expect(result.fit).toBe('True to Size');
    expect(result.league).toBe('MLB');
    expect(result.sports_team).toBe('Los Angeles Dodge');
    expect(result.collection_name).toBe('crocy-123');

    // Fast Fashion fields
    expect(result.fast_fashion).toBe('TRUE');
  });

  it('should not overwrite existing top-level attribute fields', () => {
    const docData = {
      id: 'test',
      department: 'Apparel', // Already at top-level
      attributes: {
        department: 'Footwear', // Should NOT overwrite
        class: 'Shoes',
      },
    };

    const result = mergeCoreFieldsToTopLevel(docData);

    expect(result.department).toBe('Apparel'); // Preserved
    expect(result.class).toBe('Shoes'); // Merged
  });
});
/**
 * LP-1.4.0: Tests for name population and multiSelect array coercion
 */
describe('LP-1.4.0: name population and multiSelect coercion', () => {
  // Add MULTI_SELECT_FIELDS constant for LP-1.4.0 tests
  const MULTI_SELECT_FIELDS = ['website', 'websites', 'material', 'materials', 'features'];

  function ensureArray(value: unknown): unknown[] {
    if (value === undefined || value === null || value === '') return [];
    if (Array.isArray(value)) return value;
    if (typeof value === 'string') {
      if (value.includes('|') || value.includes(',') || value.includes(';')) {
        return value.split(/[|,;]/).map(s => s.trim()).filter(s => s.length > 0);
      }
      return [value];
    }
    return [value];
  }

  function mergeCoreFieldsToTopLevelWithLP140(docData: Record<string, unknown>): Record<string, unknown> {
    const core = docData.core as Record<string, unknown> | undefined;
    const inventory = docData.inventory as Record<string, unknown> | undefined;
    const attributes = docData.attributes as Record<string, unknown> | undefined;
    
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
    
    // LP-1.3.8: Merge attribute fields to top-level
    if (attributes && typeof attributes === 'object') {
      for (const key of ATTRIBUTE_FIELDS_TO_TOP_LEVEL) {
        if ((merged[key] === undefined || merged[key] === null) && attributes[key] !== undefined && attributes[key] !== null) {
          merged[key] = attributes[key];
        }
      }
    }
    
    // LP-1.4.0: Ensure name is populated from title if missing
    if (!merged.name && merged.title) {
      merged.name = merged.title;
    }
    if (!merged.name && core?.title) {
      merged.name = core.title;
    }
    
    // LP-1.4.0: Coerce multiSelect fields to arrays
    for (const field of MULTI_SELECT_FIELDS) {
      if (merged[field] !== undefined && merged[field] !== null && !Array.isArray(merged[field])) {
        merged[field] = ensureArray(merged[field]);
      }
    }
    
    // LP-1.4.0: Also ensure attributes.website is an array if present
    if (merged.attributes && typeof merged.attributes === 'object') {
      const attrs = merged.attributes as Record<string, unknown>;
      for (const field of MULTI_SELECT_FIELDS) {
        if (attrs[field] !== undefined && attrs[field] !== null && !Array.isArray(attrs[field])) {
          attrs[field] = ensureArray(attrs[field]);
        }
      }
    }

    return merged;
  }

  it('should populate name from title when name is missing', () => {
    const docData = {
      id: 'test-product',
      title: 'Product Title From Title Field',
    };

    const result = mergeCoreFieldsToTopLevelWithLP140(docData);

    expect(result.name).toBe('Product Title From Title Field');
  });

  it('should populate name from core.title when name and top-level title are missing', () => {
    const docData = {
      id: 'test-product',
      core: {
        title: 'Product Title From Core',
      },
    };

    const result = mergeCoreFieldsToTopLevelWithLP140(docData);

    expect(result.name).toBe('Product Title From Core');
  });

  it('should not overwrite existing name', () => {
    const docData = {
      id: 'test-product',
      name: 'Existing Name',
      title: 'Different Title',
    };

    const result = mergeCoreFieldsToTopLevelWithLP140(docData);

    expect(result.name).toBe('Existing Name');
  });

  it('should coerce website string to array', () => {
    const docData = {
      id: 'test-product',
      website: 'shiekh.com',
    };

    const result = mergeCoreFieldsToTopLevelWithLP140(docData);

    expect(result.website).toEqual(['shiekh.com']);
  });

  it('should coerce material string to array', () => {
    const docData = {
      id: 'test-product',
      material: 'Polyester',
    };

    const result = mergeCoreFieldsToTopLevelWithLP140(docData);

    expect(result.material).toEqual(['Polyester']);
  });

  it('should split pipe-delimited website values', () => {
    const docData = {
      id: 'test-product',
      website: 'shiekh.com|karmaloop.com',
    };

    const result = mergeCoreFieldsToTopLevelWithLP140(docData);

    expect(result.website).toEqual(['shiekh.com', 'karmaloop.com']);
  });

  it('should coerce attributes.website string to array', () => {
    const docData = {
      id: 'test-product',
      attributes: {
        website: 'shiekh.com',
      },
    };

    const result = mergeCoreFieldsToTopLevelWithLP140(docData);

    expect((result.attributes as Record<string, unknown>).website).toEqual(['shiekh.com']);
  });

  it('should leave existing arrays unchanged', () => {
    const docData = {
      id: 'test-product',
      website: ['shiekh.com', 'karmaloop.com'],
      material: ['Cotton', 'Polyester'],
    };

    const result = mergeCoreFieldsToTopLevelWithLP140(docData);

    expect(result.website).toEqual(['shiekh.com', 'karmaloop.com']);
    expect(result.material).toEqual(['Cotton', 'Polyester']);
  });

  it('should handle the exact 211737-90h1-8 Firestore structure with LP-1.4.0 fixes', () => {
    const docData = {
      id: '211737-90h1-8',
      core: {
        mpn: '211737-90H1-8',
        sku: 'SHK3037625-8',
        title: 'Crocs Realtree APX All Terrain Clog',
        brand: 'Crocs',
        status: 'draft',
      },
      attributes: {
        department: 'Footwear',
        class: 'Sandle',
        category: 'Slides',
        gender: "Men's",
        age_group: 'Adults',
        primary_color: 'Green',
        descriptive_color: 'Green Croc',
        material: 'Pholyester', // String, should be coerced to array
        website: 'shiekh.com', // String, should be coerced to array
        fit: 'True to Size',
        sports_team: 'Los Angeles Dodgers',
        collection_name: 'Spring 2025',
      },
      inventory: {
        warehouse_inv: 12,
        store_inv: 88,
      },
    };

    const result = mergeCoreFieldsToTopLevelWithLP140(docData);

    // Name should be populated from core.title
    expect(result.name).toBe('Crocs Realtree APX All Terrain Clog');
    
    // MultiSelect fields should be arrays
    expect(result.material).toEqual(['Pholyester']);
    expect(result.website).toEqual(['shiekh.com']);
    
    // attributes.* should also be arrays
    const attrs = result.attributes as Record<string, unknown>;
    expect(attrs.material).toEqual(['Pholyester']);
    expect(attrs.website).toEqual(['shiekh.com']);
    
    // Other fields should be merged normally
    expect(result.mpn).toBe('211737-90H1-8');
    expect(result.department).toBe('Footwear');
    expect(result.class).toBe('Sandle');
    expect(result.sports_team).toBe('Los Angeles Dodgers');
  });
});