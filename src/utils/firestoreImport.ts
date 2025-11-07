/**
 * Firestore Import Utilities
 * Handles validation and writing of products/variants to Firestore
 */

import { collection, doc, setDoc, writeBatch } from 'firebase/firestore';
import { db } from '../firebase';
import type { Product, Variant } from '../types';

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
  }>;
};

/**
 * Validate required fields for a product row
 */
function validateProductRow(data: Record<string, any>): string | null {
  // Require product_id (or styleId)
  if (!data.product_id) {
    return 'Missing required field: product_id (or MPN/Style)';
  }
  
  // Require at least one SKU
  if (!data.sku) {
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
 * Transform row data into Product structure
 */
function transformToProduct(data: Record<string, any>): Partial<Product> {
  return {
    id: data.product_id || '',
    mpn: data.product_id || '',
    name: data.name || '',
    brand: data.brand || '',
    department: data.department || '',
    class: data.class || '',
    category: data.category || '',
    ageGroup: data.age_group || '',
    gender: data.gender || '',
    materialFabric: data.material || '',
    fit: data.fit || '',
    sportsTeam: data.sports_team,
    league: data.league,
    shipping: {
      height: data.height || null,
      width: data.width || null,
      length: data.length || null,
      weight: data.weight || null,
    },
    ricsCategory: data.rics_category || '',
    ricsLongDesc: data.rics_long_desc || '',
    keywords: data.keywords ? (Array.isArray(data.keywords) ? data.keywords : [data.keywords]) : [],
    websites: Array.isArray(data.website) ? data.website : (data.website ? [data.website] : []),
    featured: data.featured || false,
    map: data.map || false,
    promo: data.promo || false,
    hype: data.hype || false,
    fastfashion: data.fastfashion || false,
    status: 'intake',
    aiContext: {
      keywords: [],
      featureBullets: [],
      designNotes: '',
    },
    marketing: {
      title: '',
      bullets: [],
      seo: '',
      paragraphDraft: '',
      paragraphFinal: '',
    },
    variants: [],
    lastUpdated: new Date().toISOString(),
  };
}

/**
 * Transform row data into Variant structure
 */
function transformToVariant(data: Record<string, any>): Partial<Variant> {
  return {
    variantId: data.sku || `var-${Date.now()}`,
    sku: data.sku || '',
    size: data.size || '',
    color: data.color || '',
    price: data.price || 0,
  };
}

/**
 * Group rows by product_id
 */
function groupRowsByProduct(rows: ImportRow[]): Map<string, ImportRow[]> {
  const grouped = new Map<string, ImportRow[]>();
  
  for (const row of rows) {
    const productId = row.data.product_id;
    if (!productId) continue;
    
    if (!grouped.has(productId)) {
      grouped.set(productId, []);
    }
    grouped.get(productId)!.push(row);
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
  
  const BATCH_SIZE = 400;
  const validatedRows: Array<{ row: ImportRow; productId: string }> = [];
  
  // Validate all rows first
  for (const row of rows) {
    const error = validateProductRow(row.data);
    if (error) {
      result.skipped++;
      result.errors.push({
        rowNumber: row.rowNumber,
        reason: error,
        raw: rawData[row.rowNumber - 1] || [],
      });
      continue;
    }
    validatedRows.push({ row, productId: row.data.product_id });
  }
  
  // Group by product_id
  const groupedRows = new Map<string, ImportRow[]>();
  for (const { row, productId } of validatedRows) {
    if (!groupedRows.has(productId)) {
      groupedRows.set(productId, []);
    }
    groupedRows.get(productId)!.push(row);
  }
  
  // Process in batches
  const allWrites: Array<() => Promise<void>> = [];
  
  for (const [productId, productRows] of groupedRows) {
    try {
      const firstRow = productRows[0];
      const productData = transformToProduct(firstRow.data);
      const productRef = doc(db, 'products', productId);
      
      // Add product write
      allWrites.push(async () => {
        await setDoc(productRef, productData, { merge: true });
      });
      
      // Add variant writes
      for (const row of productRows) {
        const variant = transformToVariant(row.data);
        const variantRef = doc(db, 'products', productId, 'variants', variant.sku!);
        allWrites.push(async () => {
          await setDoc(variantRef, variant);
        });
        result.imported++;
      }
    } catch (error) {
      console.error(`Error preparing product ${productId}:`, error);
      result.skipped += productRows.length;
      for (const row of productRows) {
        result.errors.push({
          rowNumber: row.rowNumber,
          reason: `Preparation failed: ${error}`,
          raw: rawData[row.rowNumber - 1] || [],
        });
      }
    }
  }
  
  // Execute writes in batches
  for (let i = 0; i < allWrites.length; i += BATCH_SIZE) {
    const batchWrites = allWrites.slice(i, i + BATCH_SIZE);
    const batch = writeBatch(db);
    
    try {
      // Execute all writes in this batch
      for (const write of batchWrites) {
        await write();
      }
    } catch (error) {
      console.error('Batch write error:', error);
      // Continue with next batch
    }
  }
  
  return result;
}
