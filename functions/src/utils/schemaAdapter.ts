/**
 * Minimal schema adapter for functions-side compatibility
 * 
 * This provides a short-term compatibility layer to allow functions (validate, smartDetect)
 * to work with legacy-shaped products from the importer without requiring full migration.
 * 
 * NOTE: This is a minimal implementation covering only essential fields needed by
 * validate and smartDetect handlers. For comprehensive mapping, see the client-side
 * src/utils/schemaAdapter.ts
 * 
 * @module functions/src/utils/schemaAdapter
 */

/**
 * Convert legacy Firestore product format to new Product schema (minimal subset)
 * 
 * Maps only the essential fields needed by validate and smartDetect functions:
 * - SKU core fields (mpn, name, brand, department, class, category)
 * - Descriptive fields (ageGroup, gender, materials, colors)
 * - Pricing (retail_price)
 * - Technical (launchDate from launch.date)
 * - Source (RICS fields)
 * - Status and websites
 * 
 * @param product - Legacy product object from Firestore
 * @returns Product object shaped for new schema (minimal fields only)
 */
export function legacyToNew(product: any): any {
  if (!product) {
    return product;
  }

  // Already new schema - return as-is
  if (product.sku_core) {
    return product;
  }

  return {
    sku_core: {
      mpn: product.mpn || '',
      sku: product.mpn || '',
      brand: product.brand || '',
      name: product.name || '',
      department: product.department || '',
      class: product.class || '',
      category: product.category || '',
      styleId: product.id || '',
      productIsActive: product.isActive ?? true,
    },

    descriptive: {
      ageGroup: product.ageGroup || '',
      gender: product.gender || '',
      fit: product.fit || '',
      // Handle both materials array and materialFabric string
      material: product.materials || (product.materialFabric ? [product.materialFabric] : []),
      primaryColor: product.primaryColor,
      descriptiveColor: product.descriptiveColor,
      sportsTeam: product.sportsTeam,
      league: product.league,
      cutType: product.cutType,
      closureType: product.closureType,
      heelHeight: product.heelHeight,
      platformHeight: product.platformHeight,
      familySizing: product.familySizing,
    },

    pricing: {
      retail_price: product.pricing?.retail_price || product.price?.retail,
    },

    technical: {
      launchDate: product.launch?.date || product.launchDate,
      hype: product.hype,
      fastfashion: product.fastfashion,
      website: product.websites || [],
      status: product.status || 'intake',
    },

    source: {
      rics: {
        category: product.ricsCategory,
        longDescription: product.ricsLongDesc,
      },
    },

    // Preserve original ID
    id: product.id,
  };
}
