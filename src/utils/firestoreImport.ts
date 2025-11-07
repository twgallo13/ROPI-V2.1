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
 * Transform row data into Product structure
 */
function transformToProduct(data: Record<string, any>): Partial<Product> {
  // Sanitize MPN for use as document ID
  const sanitizedMpn = sanitizeDocId(data.mpn || '');
  
  return {
    id: sanitizedMpn,
    mpn: sanitizedMpn,
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
    const productData = transformToProduct(firstRow.data);
    const productRef = doc(db, 'products', mpn);
    
    // Write product document
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
      const variant = transformToVariant(row.data);
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
