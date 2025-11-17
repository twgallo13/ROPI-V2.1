/**
 * Firestore Import Utilities
 * Handles validation and writing of products/variants to Firestore
 * Updated: 2025-11-17 - Write to canonical Product schema fields
 */

import { collection, doc, setDoc, writeBatch } from 'firebase/firestore';
import { db } from '../firebase';
import type { Product, Variant } from '../types';
import { newToLegacy, stripUndefined } from './schemaAdapter';
import type { Product as CanonicalProduct } from '../types/product-schema';

export type ImportRow = {
  rowNumber: number;
  data: Record<string, any>;
};

export type ImportResult = {
  imported: number;
  skipped: number;
  errors: Array<{
    rowNumber: number;
    reason: string;
    raw: string[];
    mpn?: string;
    sku?: string;
  }>;
};

/**
 * Sanitize a string for use as a Firestore document ID
 * Trims whitespace and removes invalid characters
 */
function sanitizeDocId(id: string): string {
  return id.trim().replace(/[\/\x00]/g, '_');
}

/**
 * Recursively remove undefined values from an object
 * Firestore doesn't accept undefined values
 */
function stripUndefined<T>(obj: T): T {
  if (obj && typeof obj === 'object') {
    const out: any = Array.isArray(obj) ? [] : {};
    Object.entries(obj as any).forEach(([k, v]) => {
      if (v === undefined) return;
      if (v && typeof v === 'object') {
        const cleaned = stripUndefined(v);
        if (Array.isArray(cleaned)) out[k] = cleaned;
        else if (Object.keys(cleaned).length > 0 || !Array.isArray(cleaned)) out[k] = cleaned;
      } else {
        out[k] = v;
      }
    });
    return out;
  }
  return obj;
}

/**
 * Validate required fields for a product row
 */
function validateProductRow(data: Record<string, any>): string | null {
  // Require MPN
  if (!data.mpn || !data.mpn.trim()) {
    return 'Missing required field: MPN';
  }
  
  // Require at least one SKU
  if (!data.sku || !data.sku.trim()) {
    return 'Missing required field: sku';
  }
  
  // Validate price if present
  if (data.price !== null && data.price !== undefined) {
    if (typeof data.price !== 'number' || data.price < 0) {
      return 'Price must be a positive number';
    }
  }
  
  return null;
}

/**
 * Normalize material input: split by comma/semicolon, dedupe, filter empty
 */
function normalizeMaterials(material: string | string[] | undefined): string[] {
  if (!material) return [];
  const materials = new Set<string>();
  if (Array.isArray(material)) {
    material.forEach(m => m && materials.add(m.trim()));
  } else if (typeof material === 'string') {
    material.split(/[,;]/).forEach(m => m.trim() && materials.add(m.trim()));
  }
  return Array.from(materials).sort();
}

/**
 * Transform row data into canonical Product structure
 * Maps CSV columns to canonical schema and maintains legacy compatibility
 */
function transformToProduct(data: Record<string, any>): Partial<CanonicalProduct> {
  // Sanitize MPN for use as document ID
  const sanitizedMpn = sanitizeDocId(data.mpn || '');
  
  const canonical: Partial<CanonicalProduct> = {
    sku_core: {
      mpn: sanitizedMpn,
      sku: sanitizedMpn, // Product-level SKU same as MPN
      brand: data.brand || '',
      name: data.rics_short_desc || data.name || '',
      department: data.department || '',
      class: data.class || '',
      category: data.category || '',
      styleId: sanitizedMpn,
      coreProduct: data.core_product || false,
      productIsActive: data.is_active ?? true,
    },
    
    descriptive: {
      ageGroup: data.age_group || '',
      gender: data.gender || '',
      sportsTeam: data.sports_team,
      league: data.league,
      fit: data.fit || '',
      material: normalizeMaterials(data.material || data.materials),
      cutType: data.cut_type,
      closureType: data.closure_type,
      platformHeight: data.platform_height,
      heelType: data.heel_type,
      shoeHeightMap: data.shoe_height_map,
      heelHeight: data.heel_height ? parseFloat(data.heel_height) : undefined,
      outsoleMaterial: data.outsole_material,
      primaryColor: data.rics_color || data.primary_color,
      descriptiveColor: data.descriptive_color,
      keywords: data.keywords ? (Array.isArray(data.keywords) ? data.keywords : [data.keywords]) : [],
      description: undefined,
      familySizing: data.family_sizing || false,
      madeIn: undefined,
      metaName: data.meta_name || '',
      metaDescription: data.meta_description || '',
      slug: undefined,
    },
    
    pricing: {
      map: data.map ? parseFloat(data.map) : undefined,
      promo: data.promo || false,
      scomRegularPrice: data.scom_regular ? parseFloat(data.scom_regular) : undefined,
      scomSalePrice: data.scom_sale ? parseFloat(data.scom_sale) : undefined,
    },
    
    technical: {
      website: Array.isArray(data.website) ? data.website : (data.website ? [data.website] : []),
      height: data.height ?? undefined,
      length: data.length ?? undefined,
      width: data.width ?? undefined,
      weight: data.weight ?? undefined,
      standardShippingOverride: data.standard_shipping_override,
      expeditedOverrideShipping: data.expedited_override_shipping,
      hideImageDate: data.hide_image_date,
      mediaStatus: undefined,
      taxClass: data.taxable === true || data.taxable === 'true',
      status: 'imported',
      lastReceived: data.last_received,
      firstReceived: data.first_received,
      store1: data.store1,
      storeInv: data.store_inv,
      warehouseInv: data.warehouse_inv,
      whsInv: data.whs_inv,
      store4: data.store4,
      totalInv: data.total_inv,
      variantCount: data.variant_count,
      custom2: data.custom2,
      custom3: data.custom3,
    },
    
    launch: {
      hype: data.hype || false,
      fastFashion: data.fastfashion || data.fast_fashion || false,
      newCollection: data.collection || data.new_collection,
      klPostDate: data.kl_post_date,
      launchDate: data.launch_date,
    },
    
    source: {
      rics: {
        shortDescription: data.rics_short_desc,
        longDescription: data.rics_long_desc,
        brand: data.rics_brand,
        category: data.rics_category,
        color: data.rics_color,
      },
    },
    
    ai: undefined,
  };
  
  return canonical;
}

/**
 * Transform row data into Variant structure
 */
function transformToVariant(data: Record<string, any>): Partial<Variant> {
  // Sanitize SKU for use as document ID
  const sanitizedSku = sanitizeDocId(data.sku || '');
  
  return {
    variantId: sanitizedSku,
    sku: sanitizedSku,
    size: data.size || '',
    color: data.color || '',
    price: data.price || 0,
  };
}

/**
 * Group rows by MPN
 */
function groupRowsByProduct(rows: ImportRow[]): Map<string, ImportRow[]> {
  const grouped = new Map<string, ImportRow[]>();
  
  for (const row of rows) {
    const mpn = row.data.mpn;
    if (!mpn) continue;
    
    if (!grouped.has(mpn)) {
      grouped.set(mpn, []);
    }
    grouped.get(mpn)!.push(row);
  }
  
  return grouped;
}

/**
 * Import products and variants to Firestore with batching
 */
export async function importToFirestore(
  rows: ImportRow[],
  rawData: string[][]
): Promise<ImportResult> {
  const result: ImportResult = {
    imported: 0,
    skipped: 0,
    errors: [],
  };
  
  const validatedRows: Array<{ row: ImportRow; mpn: string; sku: string }> = [];
  
  // Validate all rows first
  for (const row of rows) {
    const error = validateProductRow(row.data);
    if (error) {
      result.skipped++;
      result.errors.push({
        rowNumber: row.rowNumber,
        reason: error,
        raw: rawData[row.rowNumber - 1] || [],
        mpn: row.data.mpn,
        sku: row.data.sku,
      });
      continue;
    }
    const mpn = sanitizeDocId(row.data.mpn);
    const sku = sanitizeDocId(row.data.sku);
    validatedRows.push({ row, mpn, sku });
  }
  
  // Group by MPN
  const groupedRows = new Map<string, Array<{ row: ImportRow; sku: string }>>();
  for (const { row, mpn, sku } of validatedRows) {
    if (!groupedRows.has(mpn)) {
      groupedRows.set(mpn, []);
    }
    groupedRows.get(mpn)!.push({ row, sku });
  }
  
  // Process each product and its variants
  for (const [mpn, productRows] of groupedRows) {
    const firstRow = productRows[0].row;
    const canonicalProduct = transformToProduct(firstRow.data);
    
    // Convert canonical to legacy format for Firestore write
    const legacyProduct = newToLegacy(canonicalProduct as CanonicalProduct);
    const productData = stripUndefined(legacyProduct);
    const productRef = doc(db, 'products', mpn);
    
    // Write product document (legacy format with canonical fields mapped)
    try {
      await setDoc(productRef, productData, { merge: true });
    } catch (error) {
      console.error(`Error writing product ${mpn}:`, error);
      result.skipped += productRows.length;
      for (const { row, sku } of productRows) {
        result.errors.push({
          rowNumber: row.rowNumber,
          reason: `Product write failed: ${error instanceof Error ? error.message : String(error)}`,
          raw: rawData[row.rowNumber - 1] || [],
          mpn,
          sku,
        });
      }
      continue; // Skip variants if product write fails
    }
    
    // Write variant documents
    for (const { row, sku } of productRows) {
      const variant = stripUndefined(transformToVariant(row.data));
      const variantRef = doc(db, 'products', mpn, 'variants', sku);
      
      try {
        await setDoc(variantRef, variant);
        result.imported++;
      } catch (error) {
        console.error(`Error writing variant ${sku} for product ${mpn}:`, error);
        result.skipped++;
        result.errors.push({
          rowNumber: row.rowNumber,
          reason: `Variant write failed: ${error instanceof Error ? error.message : String(error)}`,
          raw: rawData[row.rowNumber - 1] || [],
          mpn,
          sku,
        });
      }
    }
  }
  
  return result;
}
