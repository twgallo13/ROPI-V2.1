/**
 * Firestore Import Utilities v2
 * Uses new Product schema with backward-compatible writes
 * Created: 2025-11-15
 */

import { doc, setDoc } from 'firebase/firestore';
import { db } from '../firebase';
import type { Product as NewProduct, Variant } from '../types/product-schema';
import type { Product as LegacyProduct } from '../types';
import { CSV_TO_FIRESTORE_MAP, FIELD_TYPES, getNestedValue, setNestedValue } from './fieldMapping';
import { newToLegacy, validateProduct, calculateMediaStatus } from './schemaAdapter';

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
 */
function sanitizeDocId(id: string): string {
  return id.trim().replace(/[\/\x00]/g, '_');
}

/**
 * Strip undefined values recursively (Firestore rejects them)
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
 * Transform CSV value based on field type
 */
function transformValue(value: any, fieldType: string): any {
  if (value === null || value === undefined || value === '') return null;

  const trimmed = typeof value === 'string' ? value.trim() : value;

  switch (fieldType) {
    case 'boolean':
      if (typeof trimmed === 'boolean') return trimmed;
      const upper = String(trimmed).toUpperCase();
      if (['TRUE', 'YES', '1', 'Y'].includes(upper)) return true;
      if (['FALSE', 'NO', '0', 'N'].includes(upper)) return false;
      return false;

    case 'number':
      const num = parseFloat(String(trimmed).replace(/[,$]/g, ''));
      return isNaN(num) ? null : num;

    case 'date':
      if (trimmed instanceof Date) return trimmed.toISOString();
      if (typeof trimmed === 'string') {
        const date = new Date(trimmed);
        return isNaN(date.getTime()) ? null : date.toISOString();
      }
      return null;

    case 'array':
      if (Array.isArray(trimmed)) return trimmed;
      return String(trimmed)
        .split(/[,;|]/)
        .map(s => s.trim())
        .filter(Boolean);

    case 'string':
    default:
      return trimmed;
  }
}

/**
 * Map CSV row to new Product schema
 */
function mapRowToProduct(csvRow: Record<string, any>): Partial<NewProduct> {
  const product: any = {
    sku_core: {},
    descriptive: {},
    pricing: {},
    technical: {},
    launch: {},
    source: { rics: {} },
    ai: {},
  };

  // Process each CSV column through the mapping
  for (const [csvHeader, firestorePath] of Object.entries(CSV_TO_FIRESTORE_MAP)) {
    const value = csvRow[csvHeader];
    if (value === undefined || value === null || value === '') continue;

    const fieldType = FIELD_TYPES[firestorePath] || 'string';
    let transformed = transformValue(value, fieldType);

    // Special-case: CSV Tax Class string -> boolean taxable toggle
    if (firestorePath === 'technical.taxClass') {
      if (typeof value === 'string') {
        transformed = /^taxable\s*goods$/i.test(value.trim()) ? true : false;
      }
    }
    if (transformed === null) continue;

    setNestedValue(product, firestorePath, transformed);
  }

  // Auto-calculate Media Status
  if (product.technical) {
    product.technical.mediaStatus = calculateMediaStatus(product.technical);
  }

  return product as Partial<NewProduct>;
}

/**
 * Validate product using new schema rules
 */
function validateImportProduct(product: Partial<NewProduct>): string[] {
  const errors: string[] = [];

  // Check critical required fields
  if (!product.sku_core?.mpn) errors.push('MPN is required');
  if (!product.sku_core?.brand) errors.push('Brand is required');
  if (!product.sku_core?.name) errors.push('Name is required');
  if (!product.sku_core?.department) errors.push('Department is required');
  if (!product.sku_core?.category) errors.push('Category is required');

  // Validate using schema validator
  const { errors: schemaErrors } = validateProduct(product);
  errors.push(...schemaErrors);

  return errors;
}

/**
 * Transform row data into Variant structure
 */
function transformToVariant(data: Record<string, any>): Partial<Variant> {
  const sanitizedSku = sanitizeDocId(data.sku || data.SKU || '');
  
  return {
    variantId: sanitizedSku,
    sku: sanitizedSku,
    size: data.size || data.Size || '',
    color: data.color || data.Color || '',
    price: typeof data.price === 'number' ? data.price : parseFloat(String(data.price || 0)),
  };
}

/**
 * Import products and variants to Firestore using new schema
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

  const validatedRows: Array<{ 
    row: ImportRow; 
    product: Partial<NewProduct>;
    mpn: string; 
    sku: string;
  }> = [];

  // Step 1: Map and validate all rows
  for (const row of rows) {
    // Map CSV row to new Product schema
    const newProduct = mapRowToProduct(row.data);

    // Validate
    const errors = validateImportProduct(newProduct);
    if (errors.length > 0) {
      result.skipped++;
      result.errors.push({
        rowNumber: row.rowNumber,
        reason: errors.join('; '),
        raw: rawData[row.rowNumber - 1] || [],
        mpn: newProduct.sku_core?.mpn,
        sku: row.data.sku || row.data.SKU,
      });
      continue;
    }

    const mpn = sanitizeDocId(newProduct.sku_core!.mpn);
    const sku = sanitizeDocId(row.data.sku || row.data.SKU || mpn);
    
    validatedRows.push({ row, product: newProduct, mpn, sku });
  }

  // Step 2: Group by MPN
  const groupedByMpn = new Map<string, Array<{ 
    row: ImportRow; 
    product: Partial<NewProduct>;
    sku: string;
  }>>();

  for (const { row, product, mpn, sku } of validatedRows) {
    if (!groupedByMpn.has(mpn)) {
      groupedByMpn.set(mpn, []);
    }
    groupedByMpn.get(mpn)!.push({ row, product, sku });
  }

  // Step 3: Write products and variants
  for (const [mpn, productRows] of groupedByMpn) {
    const firstProduct = productRows[0].product;

    try {
      // Convert new schema to legacy Firestore format
      const legacyProduct = newToLegacy(firstProduct as NewProduct);
      const cleaned = stripUndefined(legacyProduct);

      // Write product document
      const productRef = doc(db, 'products', mpn);
      await setDoc(productRef, cleaned, { merge: true });

      // Write variant documents
      for (const { row, sku } of productRows) {
        const variant = transformToVariant(row.data);
        const variantRef = doc(db, 'products', mpn, 'variants', sku);
        
        try {
          await setDoc(variantRef, stripUndefined(variant));
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
    }
  }

  return result;
}

/**
 * Generate error CSV content
 */
export function generateErrorCSV(
  headers: string[],
  errorRows: Array<{ rowNumber: number; reason: string; raw: string[] }>
): string {
  const csvLines: string[] = [];
  
  // Add header with error column
  csvLines.push([...headers, 'Import Error'].map(escapeCSVValue).join(','));
  
  // Add error rows
  for (const row of errorRows) {
    const values = [...row.raw, row.reason].map(escapeCSVValue);
    csvLines.push(values.join(','));
  }
  
  return csvLines.join('\n');
}

/**
 * Escape CSV value
 */
function escapeCSVValue(value: string): string {
  if (value.includes(',') || value.includes('"') || value.includes('\n')) {
    return `"${value.replace(/"/g, '""')}"`;
  }
  return value;
}
