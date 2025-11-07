import { collection, query, where, getDocs, doc, getDoc } from 'firebase/firestore';
import { db } from '../firebase';
import type { Product, Variant } from '../types';

type ColumnMapping = {
  exportName: string;
  productField: string;
  required: boolean;
};

type ExportSettings = {
  requiredFields: string[];
  columnMappings: ColumnMapping[];
  includeAIEnrichment: boolean;
};

type ExportResult = {
  successCsv: string;
  errorCsv: string;
  successCount: number;
  errorCount: number;
};

/**
 * Get a nested field value from an object using dot notation
 * e.g., getNestedValue(product, 'brand') or getNestedValue(product, 'marketing.title')
 */
function getNestedValue(obj: any, path: string): any {
  const keys = path.split('.');
  let value = obj;
  
  for (const key of keys) {
    if (value === null || value === undefined) return null;
    value = value[key];
  }
  
  return value ?? null;
}

/**
 * Escape CSV value - wrap in quotes if contains comma, quote, or newline
 */
function escapeCsvValue(value: any): string {
  if (value === null || value === undefined) return '';
  
  const str = String(value);
  
  // If contains comma, quote, or newline, wrap in quotes and escape internal quotes
  if (str.includes(',') || str.includes('"') || str.includes('\n')) {
    return `"${str.replace(/"/g, '""')}"`;
  }
  
  return str;
}

/**
 * Check if a product has all required fields
 */
function hasRequiredFields(product: Product, requiredFields: string[]): { valid: boolean; missing: string[] } {
  const missing: string[] = [];
  
  for (const field of requiredFields) {
    // Handle variant fields specially
    if (field.startsWith('variants[].')) {
      const variantField = field.replace('variants[].', '');
      const hasField = product.variants.every(v => {
        const val = getNestedValue(v, variantField);
        return val !== null && val !== undefined && val !== '';
      });
      if (!hasField) missing.push(field);
    } else {
      const value = getNestedValue(product, field);
      if (value === null || value === undefined || value === '') {
        missing.push(field);
      }
    }
  }
  
  return { valid: missing.length === 0, missing };
}

/**
 * Expand a product with variants into multiple rows (one per variant)
 */
function expandProductRows(product: Product, mappings: ColumnMapping[], includeAI: boolean): Record<string, any>[] {
  if (!product.variants || product.variants.length === 0) {
    // No variants - return single row with product data
    return [buildRow(product, null, mappings, includeAI)];
  }
  
  // Multiple variants - return one row per variant
  return product.variants.map(variant => buildRow(product, variant, mappings, includeAI));
}

/**
 * Build a single row from product + optional variant
 */
function buildRow(
  product: Product,
  variant: Variant | null,
  mappings: ColumnMapping[],
  includeAI: boolean
): Record<string, any> {
  const row: Record<string, any> = {};
  
  for (const mapping of mappings) {
    let value: any = null;
    
    // Handle variant fields
    if (mapping.productField.startsWith('variants[].')) {
      if (variant) {
        const variantField = mapping.productField.replace('variants[].', '');
        value = getNestedValue(variant, variantField);
      }
    } else {
      // Regular product field
      value = getNestedValue(product, mapping.productField);
    }
    
    // Handle arrays (e.g., websites, keywords)
    if (Array.isArray(value)) {
      value = value.join('; ');
    }
    
    row[mapping.exportName] = value;
  }
  
  // Add AI enrichment fields if enabled
  if (includeAI && product.marketing) {
    row['AI Title'] = product.marketing.title || '';
    row['AI Bullets'] = Array.isArray(product.marketing.bullets) 
      ? product.marketing.bullets.join(' | ') 
      : '';
    row['AI SEO'] = product.marketing.seo || '';
    row['AI Paragraph Draft'] = product.marketing.paragraphDraft || '';
    row['AI Paragraph Final'] = product.marketing.paragraphFinal || '';
  }
  
  return row;
}

/**
 * Convert rows to CSV string
 */
function rowsToCsv(rows: Record<string, any>[]): string {
  if (rows.length === 0) return '';
  
  // Get all unique column names
  const columns = Array.from(new Set(rows.flatMap(r => Object.keys(r))));
  
  // Build CSV
  const lines: string[] = [];
  
  // Header
  lines.push(columns.map(escapeCsvValue).join(','));
  
  // Data rows
  for (const row of rows) {
    const values = columns.map(col => escapeCsvValue(row[col]));
    lines.push(values.join(','));
  }
  
  return lines.join('\n');
}

/**
 * Fetch validated products and export to CSV based on settings
 */
export async function exportValidatedProducts(): Promise<ExportResult> {
  try {
    // Load export settings
    const settingsRef = doc(db, 'settings', 'export');
    const settingsSnap = await getDoc(settingsRef);
    
    if (!settingsSnap.exists()) {
      throw new Error('Export settings not found. Please configure export settings first.');
    }
    
    const settings = settingsSnap.data() as ExportSettings;
    
    // Fetch all validated products
    const productsRef = collection(db, 'products');
    const q = query(productsRef, where('status', '==', 'validated'));
    const snapshot = await getDocs(q);
    
    if (snapshot.empty) {
      throw new Error('No validated products found to export.');
    }
    
    const products = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as Product));
    
    // Separate products into success and error buckets
    const successRows: Record<string, any>[] = [];
    const errorRows: Record<string, any>[] = [];
    
    for (const product of products) {
      const { valid, missing } = hasRequiredFields(product, settings.requiredFields);
      
      if (valid) {
        // Expand product into rows (one per variant)
        const rows = expandProductRows(product, settings.columnMappings, settings.includeAIEnrichment);
        successRows.push(...rows);
      } else {
        // Add to error CSV with missing fields info
        const errorRow = {
          'Product ID': product.id,
          'MPN': product.mpn || '',
          'Name': product.name || '',
          'Brand': product.brand || '',
          'Missing Fields': missing.join(', '),
          'Status': product.status,
        };
        errorRows.push(errorRow);
      }
    }
    
    // Generate CSV strings
    const successCsv = rowsToCsv(successRows);
    const errorCsv = rowsToCsv(errorRows);
    
    return {
      successCsv,
      errorCsv,
      successCount: successRows.length,
      errorCount: errorRows.length,
    };
  } catch (error) {
    console.error('[exporter] export failed', error);
    throw error;
  }
}

/**
 * Download CSV file to browser
 */
export function downloadCsv(csvContent: string, filename: string): void {
  const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
  const link = document.createElement('a');
  const url = URL.createObjectURL(blob);
  
  link.setAttribute('href', url);
  link.setAttribute('download', filename);
  link.style.visibility = 'hidden';
  
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  
  URL.revokeObjectURL(url);
}

/**
 * Main export function - exports validated products and triggers downloads
 */
export async function exportAndDownload(): Promise<{ successCount: number; errorCount: number }> {
  const result = await exportValidatedProducts();
  
  // Download success CSV if any
  if (result.successCount > 0) {
    const timestamp = new Date().toISOString().split('T')[0];
    downloadCsv(result.successCsv, `validated-products-${timestamp}.csv`);
  }
  
  // Download error CSV if any
  if (result.errorCount > 0) {
    const timestamp = new Date().toISOString().split('T')[0];
    downloadCsv(result.errorCsv, `export-errors-${timestamp}.csv`);
  }
  
  return {
    successCount: result.successCount,
    errorCount: result.errorCount,
  };
}
