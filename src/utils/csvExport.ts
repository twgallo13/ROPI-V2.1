/**
 * CSV Export Utilities
 * Handles exporting products and variants to CSV format
 */

import type { Product, Variant } from '../types';

export type ExportRow = {
  product_id: string;
  sku: string;
  title: string;
  brand: string;
  category: string;
  price: number;
  images: string;
  familySizing: boolean;
};

/**
 * Escape CSV value (wrap in quotes if needed)
 */
function escapeCSVValue(value: string | number): string {
  const strValue = String(value);
  if (strValue.includes(',') || strValue.includes('"') || strValue.includes('\n')) {
    return `"${strValue.replace(/"/g, '""')}"`;
  }
  return strValue;
}

/**
 * Convert products and their variants to CSV export rows
 */
export function productsToExportRows(products: Product[]): ExportRow[] {
  const rows: ExportRow[] = [];
  
  for (const product of products) {
    // If product has variants, create a row for each variant
    if (product.variants && product.variants.length > 0) {
      for (const variant of product.variants) {
        rows.push({
          product_id: product.id,
          sku: variant.sku,
          title: product.name,
          brand: product.brand,
          category: product.category,
          price: variant.price,
          images: '', // Will be populated from actual image data if available
          familySizing: product.familySizing || false,
        });
      }
    } else {
      // If no variants, create a single row for the product
      rows.push({
        product_id: product.id,
        sku: product.mpn, // Use MPN as fallback SKU
        title: product.name,
        brand: product.brand,
        category: product.category,
        price: 0, // No price available without variants
        images: '',
        familySizing: product.familySizing || false,
      });
    }
  }
  
  return rows;
}

/**
 * Generate CSV content from export rows
 */
export function generateExportCSV(rows: ExportRow[]): string {
  const headers = ['product_id', 'sku', 'title', 'brand', 'category', 'price', 'images', 'familySizing'];
  const csvLines: string[] = [];
  
  // Add header row
  csvLines.push(headers.join(','));
  
  // Add data rows
  for (const row of rows) {
    const values = [
      escapeCSVValue(row.product_id),
      escapeCSVValue(row.sku),
      escapeCSVValue(row.title),
      escapeCSVValue(row.brand),
      escapeCSVValue(row.category),
      escapeCSVValue(row.price),
      escapeCSVValue(row.images),
      escapeCSVValue(row.familySizing ? 'true' : 'false'),
    ];
    csvLines.push(values.join(','));
  }
  
  return csvLines.join('\n');
}

/**
 * Download CSV content as a file
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
 * Export selected products to CSV
 */
export function exportProductsToCSV(products: Product[], filename?: string): void {
  const rows = productsToExportRows(products);
  const csvContent = generateExportCSV(rows);
  const exportFilename = filename || `products-export-${new Date().toISOString().split('T')[0]}.csv`;
  downloadCSV(csvContent, exportFilename);
}
