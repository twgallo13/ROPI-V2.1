/**
 * Schema Adapter - Bidirectional conversion between new Product schema and legacy Firestore
 * Maintains backward compatibility during migration
 * Created: 2025-11-15
 */

import type { Product, LegacyProduct } from '../types/product-schema';
import type { Product as OldProduct } from '../types';

/**
 * Recursively remove undefined values from an object
 * Prevents Firestore "Unsupported field value: undefined" errors
 */
export function stripUndefined<T extends Record<string, any>>(obj: T): T {
  if (obj === null || obj === undefined) {
    return obj;
  }

  if (Array.isArray(obj)) {
    return obj.map(item => 
      typeof item === 'object' && item !== null ? stripUndefined(item) : item
    ).filter(item => item !== undefined) as any;
  }

  if (typeof obj === 'object') {
    const result: any = {};
    for (const [key, value] of Object.entries(obj)) {
      if (value === undefined) {
        continue; // Skip undefined values
      }
      if (typeof value === 'object' && value !== null && !Array.isArray(value) && !(value instanceof Date)) {
        result[key] = stripUndefined(value);
      } else if (Array.isArray(value)) {
        result[key] = stripUndefined(value);
      } else {
        result[key] = value;
      }
    }
    return result as T;
  }

  return obj;
}

/**
 * Convert new Product schema to legacy Firestore format
 * This allows writing new schema data to existing Firestore structure
 */
export function newToLegacy(product: Product): Partial<OldProduct> {
  return {
    // Core identification
    id: product.sku_core.styleId,
    mpn: product.sku_core.mpn,
    name: product.sku_core.name,
    brand: product.sku_core.brand,
    department: product.sku_core.department,
    class: product.sku_core.class,
    category: product.sku_core.category,
    isActive: product.sku_core.productIsActive ?? true, // Coerce boolean, default true
    coreProduct: product.sku_core.coreProduct ?? false, // Coerce boolean, default false

    // Descriptive attributes
    ageGroup: product.descriptive.ageGroup,
    gender: product.descriptive.gender,
    sportsTeam: product.descriptive.sportsTeam,
    league: product.descriptive.league,
    fit: product.descriptive.fit,
    materials: product.descriptive.material,
    cutType: product.descriptive.cutType,
    closureType: product.descriptive.closureType,
    platformHeight: product.descriptive.platformHeight,
    heelType: product.descriptive.heelType,
    primaryColor: product.descriptive.primaryColor,
    descriptiveColor: product.descriptive.descriptiveColor,
    keywords: product.descriptive.keywords,
    familySizing: product.descriptive.familySizing ?? false, // Coerce boolean

    // Legacy boolean fields - coerce to false if undefined
    map: !!product.pricing.map,
    promo: product.pricing.promo ?? false,
    hype: product.launch.hype ?? false,
    fastfashion: product.launch.fastFashion ?? false,

    // Pricing structure (new nested format)
    price: {
      map: product.pricing.map,
      scomRegular: product.pricing.scomRegularPrice,
      scomSale: product.pricing.scomSalePrice,
      ricsRetail: 0, // Will be set from variant data
    },

    // Launch structure
    launch: {
      hype: product.launch.hype,
      fastFashion: product.launch.fastFashion,
      date: product.launch.launchDate,
      newCollection: product.launch.newCollection,
      klPostDate: product.launch.klPostDate,
    },

    // Style structure
    style: {
      id: product.sku_core.styleId,
      shoeHeightMap: product.descriptive.shoeHeightMap,
      heelHeight: product.descriptive.heelHeight,
      soleMaterial: product.descriptive.outsoleMaterial,
    },

    // Shipping/dimensions from technical
    shipping: {
      height: product.technical.height,
      width: product.technical.width,
      length: product.technical.length,
      weight: product.technical.weight,
      standardOverride: !!product.technical.standardShippingOverride,
      expeditedOverride: !!product.technical.expeditedOverrideShipping,
    },

    // Tax (map boolean -> legacy string)
    tax: {
      class: product.technical.taxClass === true ? 'Taxable Goods' : undefined,
    },

    // Media
    media: {
      hideImageDate: product.technical.hideImageDate,
    },

    // RICS fields (from source)
    ricsCategory: product.source?.rics?.category,
    ricsLongDesc: product.source?.rics?.longDescription,

    // Websites
    websites: product.technical.website || [],

    // Status mapping
    status: (product.technical.status as any) || 'intake',

    // AI Context (preserve existing structure)
    aiContext: {
      keywords: [],
      featureBullets: [],
      designNotes: '',
    },

    // Marketing (preserve existing structure, use AI data if available)
    marketing: {
      title: product.descriptive.metaName || '',
      bullets: [],
      seo: product.descriptive.metaDescription || '',
      paragraphDraft: product.ai?.descriptionHtml || '',
      paragraphFinal: product.ai?.descriptionHtml || '',
    },

    variants: [],
    lastUpdated: new Date().toISOString(),
    featured: false,
  };
}

/**
 * Convert legacy Firestore format to new Product schema
 * This allows reading existing data into the new schema structure
 */
export function legacyToNew(legacy: Partial<OldProduct>): Product {
  return {
    sku_core: {
      mpn: legacy.mpn || '',
      sku: legacy.mpn || '', // Fallback to MPN if no specific SKU
      brand: legacy.brand || '',
      name: legacy.name || '',
      department: legacy.department || '',
      class: legacy.class || '',
      category: legacy.category || '',
      styleId: legacy.id || legacy.style?.id || '',
      coreProduct: legacy.coreProduct,
      productIsActive: legacy.isActive ?? true,
    },

    descriptive: {
      ageGroup: legacy.ageGroup || '',
      gender: legacy.gender || '',
      sportsTeam: legacy.sportsTeam,
      league: legacy.league,
      fit: legacy.fit || '',
      material: legacy.materials || (legacy.materialFabric ? [legacy.materialFabric] : []),
      cutType: legacy.cutType,
      closureType: legacy.closureType,
      platformHeight: legacy.platformHeight,
      heelType: legacy.heelType,
      shoeHeightMap: legacy.style?.shoeHeightMap,
      heelHeight: legacy.style?.heelHeight,
      outsoleMaterial: legacy.style?.soleMaterial,
      primaryColor: legacy.primaryColor,
      descriptiveColor: legacy.descriptiveColor,
      keywords: legacy.keywords,
      description: legacy.marketing?.paragraphFinal || legacy.marketing?.paragraphDraft,
      familySizing: legacy.familySizing,
      madeIn: undefined,
      metaName: legacy.marketing?.title || legacy.name || '',
      metaDescription: legacy.marketing?.seo || '',
      slug: undefined,
    },

    pricing: {
      map: legacy.price?.map || (legacy.map ? 0 : undefined),
      promo: legacy.promo,
      scomRegularPrice: legacy.price?.scomRegular,
      scomSalePrice: legacy.price?.scomSale,
    },

    technical: {
      website: legacy.websites,
      height: legacy.shipping?.height || legacy.dimensions?.height,
      length: legacy.shipping?.length || legacy.dimensions?.length,
      width: legacy.shipping?.width || legacy.dimensions?.width,
      weight: legacy.shipping?.weight,
      standardShippingOverride: typeof legacy.shipping?.standardOverride === 'number' ? legacy.shipping.standardOverride : undefined,
      expeditedOverrideShipping: typeof legacy.shipping?.expeditedOverride === 'number' ? legacy.shipping.expeditedOverride : undefined,
      hideImageDate: typeof legacy.media?.hideImageDate === 'string' 
        ? legacy.media.hideImageDate 
        : legacy.media?.hideImageDate?.toISOString?.(),
      mediaStatus: undefined, // Will be calculated
      // Map legacy string -> boolean taxable toggle (exact "Taxable Goods")
      taxClass: typeof legacy.tax?.class === 'string'
        ? /^taxable\s*goods$/i.test(legacy.tax.class)
        : undefined,
      status: legacy.status,
      lastReceived: undefined,
      firstReceived: undefined,
      store1: undefined,
      storeInv: undefined,
      warehouseInv: undefined,
      whsInv: undefined,
      store4: undefined,
      totalInv: undefined,
    },

    launch: {
      hype: legacy.launch?.hype ?? legacy.hype,
      fastFashion: legacy.launch?.fastFashion ?? legacy.fastfashion,
      newCollection: legacy.launch?.newCollection,
      klPostDate: typeof legacy.launch?.klPostDate === 'string'
        ? legacy.launch.klPostDate
        : legacy.launch?.klPostDate?.toISOString?.(),
      launchDate: typeof legacy.launch?.date === 'string'
        ? legacy.launch.date
        : legacy.launch?.date?.toISOString?.(),
    },

    source: {
      rics: {
        shortDescription: undefined,
        longDescription: legacy.ricsLongDesc,
        brand: undefined,
        category: legacy.ricsCategory,
        color: undefined,
      },
    },

    ai: {
      descriptionHtml: legacy.marketing?.paragraphFinal || legacy.marketing?.paragraphDraft,
      descriptionBlocks: undefined,
      seoName: legacy.marketing?.title,
      ropiScore: undefined,
      validationFlags: undefined,
      templateKey: undefined,
      templateOverrideKey: undefined,
      smartDetectSummary: undefined,
    },
  };
}

/**
 * Calculate Media Status based on technical fields
 */
export function calculateMediaStatus(technical: Partial<Product['technical']>): string {
  if (technical.hideImageDate) {
    return 'Images Ready';
  }
  if (technical.mediaStatus) {
    return technical.mediaStatus;
  }
  return 'Pending';
}

/**
 * Merge new Product data into existing legacy product (partial update)
 * This is used when updating only specific fields without overwriting everything
 */
export function mergeIntoLegacy(
  existing: Partial<OldProduct>,
  updates: Partial<Product>
): Partial<OldProduct> {
  const merged = { ...existing };

  if (updates.sku_core) {
    Object.assign(merged, {
      mpn: updates.sku_core.mpn ?? merged.mpn,
      name: updates.sku_core.name ?? merged.name,
      brand: updates.sku_core.brand ?? merged.brand,
      department: updates.sku_core.department ?? merged.department,
      class: updates.sku_core.class ?? merged.class,
      category: updates.sku_core.category ?? merged.category,
      isActive: updates.sku_core.productIsActive ?? merged.isActive,
      coreProduct: updates.sku_core.coreProduct ?? merged.coreProduct,
    });
  }

  if (updates.descriptive) {
    Object.assign(merged, {
      ageGroup: updates.descriptive.ageGroup ?? merged.ageGroup,
      gender: updates.descriptive.gender ?? merged.gender,
      fit: updates.descriptive.fit ?? merged.fit,
      materials: updates.descriptive.material ?? merged.materials,
      familySizing: updates.descriptive.familySizing ?? merged.familySizing,
      keywords: updates.descriptive.keywords ?? merged.keywords,
      sportsTeam: updates.descriptive.sportsTeam ?? merged.sportsTeam,
      league: updates.descriptive.league ?? merged.league,
      cutType: updates.descriptive.cutType ?? merged.cutType,
      closureType: updates.descriptive.closureType ?? merged.closureType,
      primaryColor: updates.descriptive.primaryColor ?? merged.primaryColor,
      descriptiveColor: updates.descriptive.descriptiveColor ?? merged.descriptiveColor,
    });

    // Update marketing fields if meta fields change
    if (updates.descriptive.metaName || updates.descriptive.metaDescription) {
      merged.marketing = {
        ...merged.marketing,
        title: updates.descriptive.metaName ?? merged.marketing?.title ?? '',
        seo: updates.descriptive.metaDescription ?? merged.marketing?.seo ?? '',
        bullets: merged.marketing?.bullets ?? [],
        paragraphDraft: merged.marketing?.paragraphDraft ?? '',
        paragraphFinal: merged.marketing?.paragraphFinal ?? '',
      };
    }
  }

  if (updates.pricing) {
    merged.price = {
      ...merged.price,
      map: updates.pricing.map ?? merged.price?.map,
      scomRegular: updates.pricing.scomRegularPrice ?? merged.price?.scomRegular,
      scomSale: updates.pricing.scomSalePrice ?? merged.price?.scomSale,
      ricsRetail: merged.price?.ricsRetail ?? 0,
    };
    merged.map = !!updates.pricing.map;
    merged.promo = updates.pricing.promo ?? merged.promo;
  }

  if (updates.launch) {
    merged.launch = {
      ...merged.launch,
      hype: updates.launch.hype ?? merged.launch?.hype,
      fastFashion: updates.launch.fastFashion ?? merged.launch?.fastFashion,
      date: updates.launch.launchDate ?? merged.launch?.date,
      newCollection: updates.launch.newCollection ?? merged.launch?.newCollection,
      klPostDate: updates.launch.klPostDate ?? merged.launch?.klPostDate,
    };
    merged.hype = !!updates.launch.hype;
    merged.fastfashion = !!updates.launch.fastFashion;
  }

  if (updates.technical) {
    merged.shipping = {
      ...merged.shipping,
      height: updates.technical.height ?? merged.shipping?.height,
      width: updates.technical.width ?? merged.shipping?.width,
      length: updates.technical.length ?? merged.shipping?.length,
      weight: updates.technical.weight ?? merged.shipping?.weight,
    };
    merged.tax = {
      ...merged.tax,
      class: updates.technical.taxClass === true
        ? 'Taxable Goods'
        : updates.technical.taxClass === false
          ? undefined
          : merged.tax?.class,
    };
    merged.media = {
      ...merged.media,
      hideImageDate: updates.technical.hideImageDate ?? merged.media?.hideImageDate,
    };
    merged.websites = updates.technical.website ?? merged.websites;
  }

  merged.lastUpdated = new Date().toISOString();

  return merged;
}

/**
 * Validate required fields in new Product schema
 * Returns { errors, warnings } where errors block save, warnings are advisory
 */
export function validateProduct(product: Partial<Product>): { errors: string[]; warnings: string[] } {
  const errors: string[] = [];
  const warnings: string[] = [];

  // Hard-required fields (block save)
  if (!product.sku_core?.mpn) errors.push('MPN is required');
  if (!product.sku_core?.brand) errors.push('Brand is required');
  if (!product.sku_core?.name) errors.push('Name is required');
  if (!product.sku_core?.department) errors.push('Department is required');
  if (!product.sku_core?.class) errors.push('Class is required');
  if (!product.sku_core?.category) errors.push('Category is required');
  if (!product.descriptive?.ageGroup) errors.push('Age Group is required');
  if (!product.descriptive?.gender) errors.push('Gender is required');

  // Warning-only fields (advisory, don't block save)
  if (!product.descriptive?.metaName) {
    warnings.push('Meta Name is recommended for SEO');
  } else if (product.descriptive.metaName.length > 60) {
    warnings.push('Meta Name should be ≤60 characters');
  }

  if (!product.descriptive?.metaDescription) {
    warnings.push('Meta Description is recommended for SEO');
  } else if (product.descriptive.metaDescription.length > 155) {
    warnings.push('Meta Description should be ≤155 characters');
  }

  return { errors, warnings };
}
