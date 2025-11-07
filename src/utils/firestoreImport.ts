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
  success: number;
  failed: number;
  errorRows: Array<{
    rowNumber: number;
    data: string[];
    errors: string[];
  }>;
};

/**
 * Validate required fields for a product
 */
function validateProduct(data: Record<string, any>): string[] {
  const errors: string[] = [];
  
  if (!data.product_id) {
    errors.push('Missing required field: product_id');
  }
  
  if (!data.name) {
    errors.push('Missing required field: name');
  }
  
  if (!data.brand) {
    errors.push('Missing required field: brand');
  }
  
  return errors;
}

/**
 * Validate required fields for a variant
 */
function validateVariant(data: Record<string, any>): string[] {
  const errors: string[] = [];
  
  if (!data.sku) {
    errors.push('Missing required field: sku');
  }
  
  if (data.price !== null && data.price !== undefined && data.price < 0) {
    errors.push('Price must be positive');
  }
  
  return errors;
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
    websites: [], // Will be populated from settings or defaults
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
 * Import products and variants to Firestore
 */
export async function importToFirestore(
  rows: ImportRow[],
  rawData: string[][]
): Promise<ImportResult> {
  const result: ImportResult = {
    success: 0,
    failed: 0,
    errorRows: [],
  };
  
  // Group rows by product_id
  const groupedRows = groupRowsByProduct(rows);
  
  // Process each product
  for (const [productId, productRows] of groupedRows) {
    try {
      // Use the first row as the base product data
      const firstRow = productRows[0];
      const productErrors = validateProduct(firstRow.data);
      
      if (productErrors.length > 0) {
        result.failed += productRows.length;
        for (const row of productRows) {
          result.errorRows.push({
            rowNumber: row.rowNumber,
            data: rawData[row.rowNumber - 1] || [],
            errors: productErrors,
          });
        }
        continue;
      }
      
      // Create product document
      const productData = transformToProduct(firstRow.data);
      const productRef = doc(db, 'products', productId);
      
      // Process variants
      const variants: Partial<Variant>[] = [];
      const variantErrors: Array<{ row: ImportRow; errors: string[] }> = [];
      
      for (const row of productRows) {
        const variantValidationErrors = validateVariant(row.data);
        
        if (variantValidationErrors.length > 0) {
          variantErrors.push({ row, errors: variantValidationErrors });
          continue;
        }
        
        const variant = transformToVariant(row.data);
        variants.push(variant);
      }
      
      // If there are variant errors, log them but continue with valid variants
      if (variantErrors.length > 0) {
        result.failed += variantErrors.length;
        for (const { row, errors } of variantErrors) {
          result.errorRows.push({
            rowNumber: row.rowNumber,
            data: rawData[row.rowNumber - 1] || [],
            errors,
          });
        }
      }
      
      // Write product to Firestore
      await setDoc(productRef, productData, { merge: true });
      
      // Write variants in batch
      const batch = writeBatch(db);
      for (const variant of variants) {
        const variantRef = doc(db, 'products', productId, 'variants', variant.sku!);
        batch.set(variantRef, variant);
      }
      await batch.commit();
      
      result.success += variants.length;
      
    } catch (error) {
      console.error(`Error importing product ${productId}:`, error);
      result.failed += productRows.length;
      
      for (const row of productRows) {
        result.errorRows.push({
          rowNumber: row.rowNumber,
          data: rawData[row.rowNumber - 1] || [],
          errors: [`Import failed: ${error}`],
        });
      }
    }
  }
  
  return result;
}

/**
 * Validate all rows before import
 */
export function validateRows(rows: ImportRow[]): {
  valid: ImportRow[];
  invalid: Array<{ row: ImportRow; errors: string[] }>;
} {
  const valid: ImportRow[] = [];
  const invalid: Array<{ row: ImportRow; errors: string[] }> = [];
  
  for (const row of rows) {
    const productErrors = validateProduct(row.data);
    const variantErrors = validateVariant(row.data);
    const allErrors = [...productErrors, ...variantErrors];
    
    if (allErrors.length > 0) {
      invalid.push({ row, errors: allErrors });
    } else {
      valid.push(row);
    }
  }
  
  return { valid, invalid };
}
