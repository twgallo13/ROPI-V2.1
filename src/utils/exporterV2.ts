/**
 * Firestore Export Utilities v2
 * Uses new Product schema with field mapping
 * Created: 2025-11-15
 */

import { collection, query, where, getDocs } from 'firebase/firestore';
import { db } from '../firebase';
import type { Product as LegacyProduct, Variant } from '../types';
import type { Product as NewProduct } from '../types/product-schema';
import { FIRESTORE_TO_EXPORT_MAP, getNestedValue } from './fieldMapping';
import { legacyToNew } from './schemaAdapter';

export type ExportRow = Record<string, any>;

export type ExportResult = {
  csv: string;
  rowCount: number;
  errors: string[];
};

/**
 * Escape CSV value
 */
function escapeCsvValue(value: any): string {
  if (value === null || value === undefined) return '';
  
  // Handle arrays
  if (Array.isArray(value)) {
    value = value.join(', ');
  }
  
  const str = String(value);
  
  // Wrap in quotes if contains comma, quote, or newline
  if (str.includes(',') || str.includes('"') || str.includes('\n')) {
    return `"${str.replace(/"/g, '""')}"`;
  }
  
  return str;
}

/**
 * Get export value from new Product schema
 */
function getExportValue(product: NewProduct, firestorePath: string): any {
  const value = getNestedValue(product, firestorePath);
  
  // Special handling for certain fields
  if (firestorePath === 'descriptive.material' && Array.isArray(value)) {
    return value.join(', ');
  }
  if (firestorePath === 'descriptive.keywords' && Array.isArray(value)) {
    return value.join(', ');
  }
  if (firestorePath === 'technical.website' && Array.isArray(value)) {
    return value.join(', ');
  }
  if (firestorePath === 'descriptive.madeIn' && Array.isArray(value)) {
    return value.join(', ');
  }
  
  // Format booleans
  if (typeof value === 'boolean') {
    return value ? 'TRUE' : 'FALSE';
  }
  
  // Format dates
  if (typeof value === 'string' && /^\d{4}-\d{2}-\d{2}T/.test(value)) {
    return new Date(value).toLocaleDateString();
  }
  
  return value ?? '';
}

/**
 * Build export row from product and variant
 */
function buildExportRow(
  product: NewProduct,
  variant: Variant | null
): ExportRow {
  const row: ExportRow = {};
  
  // Export mapped fields (excludes source.rics.* automatically)
  for (const [firestorePath, exportHeader] of Object.entries(FIRESTORE_TO_EXPORT_MAP)) {
    row[exportHeader] = getExportValue(product, firestorePath);
  }
  
  // Add variant-specific fields if present
  if (variant) {
    row['Variant SKU'] = variant.sku;
    row['Size'] = variant.size;
    row['Color'] = variant.color;
    row['Variant Price'] = variant.price;
  }
  
  return row;
}

/**
 * Expand product into rows (one per variant, or single row if no variants)
 */
function expandProductToRows(
  legacyProduct: Partial<LegacyProduct>,
  variants: Variant[]
): ExportRow[] {
  // Convert legacy to new schema
  const newProduct = legacyToNew(legacyProduct);
  
  if (!variants || variants.length === 0) {
    // No variants - single row
    return [buildExportRow(newProduct, null)];
  }
  
  // Multiple variants - one row per variant
  return variants.map(variant => buildExportRow(newProduct, variant));
}

/**
 * Generate CSV from export rows
 */
function generateCSV(rows: ExportRow[]): string {
  if (rows.length === 0) return '';
  
  // Get all unique headers from all rows
  const headerSet = new Set<string>();
  rows.forEach(row => Object.keys(row).forEach(key => headerSet.add(key)));
  const headers = Array.from(headerSet);
  
  // Build CSV lines
  const csvLines: string[] = [];
  
  // Header row
  csvLines.push(headers.map(escapeCsvValue).join(','));
  
  // Data rows
  for (const row of rows) {
    const values = headers.map(header => escapeCsvValue(row[header] ?? ''));
    csvLines.push(values.join(','));
  }
  
  return csvLines.join('\n');
}

/**
 * Export products to CSV
 * @param filters Optional Firestore query filters
 * @param includeAIDescription Include AI-generated HTML description
 */
export async function exportProductsToCSV(
  filters?: { field: string; operator: any; value: any }[],
  includeAIDescription: boolean = true
): Promise<ExportResult> {
  const errors: string[] = [];
  const allRows: ExportRow[] = [];
  
  try {
    // Build Firestore query
    let productsQuery = query(collection(db, 'products'));
    
    if (filters && filters.length > 0) {
      for (const filter of filters) {
        productsQuery = query(productsQuery, where(filter.field, filter.operator, filter.value));
      }
    }
    
    // Fetch products
    const productsSnap = await getDocs(productsQuery);
    
    // Process each product
    for (const productDoc of productsSnap.docs) {
      const product = { id: productDoc.id, ...productDoc.data() } as Partial<LegacyProduct>;
      
      try {
        // Fetch variants
        const variantsSnap = await getDocs(
          collection(db, 'products', productDoc.id, 'variants')
        );
        const variants = variantsSnap.docs.map(d => d.data() as Variant);
        
        // Expand product into rows
        const rows = expandProductToRows(product, variants);
        allRows.push(...rows);
        
      } catch (error) {
        errors.push(`Error processing product ${productDoc.id}: ${error}`);
        console.error(`Error processing product ${productDoc.id}:`, error);
      }
    }
    
    // Generate CSV
    const csv = generateCSV(allRows);
    
    return {
      csv,
      rowCount: allRows.length,
      errors,
    };
    
  } catch (error) {
    errors.push(`Export failed: ${error}`);
    console.error('Export failed:', error);
    
    return {
      csv: '',
      rowCount: 0,
      errors,
    };
  }
}

/**
 * Download CSV to file
 */
export function downloadCSV(content: string, filename: string = 'export.csv'): void {
  const blob = new Blob([content], { type: 'text/csv;charset=utf-8;' });
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.href = url;
  link.download = filename;
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  URL.revokeObjectURL(url);
}

/**
 * Export products by status
 */
export async function exportByStatus(status: string): Promise<ExportResult> {
  return exportProductsToCSV([
    { field: 'status', operator: '==', value: status }
  ]);
}

/**
 * Export validated products ready for upload
 */
export async function exportValidatedProducts(): Promise<ExportResult> {
  return exportProductsToCSV([
    { field: 'status', operator: '==', value: 'validated' }
  ]);
}

/**
 * Export all active products
 */
export async function exportActiveProducts(): Promise<ExportResult> {
  return exportProductsToCSV([
    { field: 'isActive', operator: '==', value: true }
  ]);
}
