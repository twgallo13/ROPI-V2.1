/**
 * RetailOps Export Module
 * Per AOSS Section 4.1 — RetailOps Export Mapping
 * Version: aoss.v0.5.0
 *
 * This module transforms CoreProduct objects into RetailOps-compatible CSV format.
 * Column names and order are sourced from the RetailOps CSV Field Mapping Notion spec.
 */

import type { CoreProduct, ProductImage } from '../schemas/coreProduct';

// ============================================================================
// Types
// ============================================================================

/**
 * A single column mapping definition
 */
export interface RetailOpsColumnMapping {
  /** Exact RetailOps CSV column header */
  name: string;
  /** Dot-path into CoreProduct (empty string if no direct mapping) */
  source: string;
  /** Whether this column is required in the export */
  required: boolean;
  /** Default value when source is missing or empty */
  default?: string | number | boolean | null;
  /** Name of transform function to apply */
  transform?: string;
  /** Human-readable description */
  description?: string;
}

/**
 * The complete export mapping configuration
 */
export interface RetailOpsExportMappingConfig {
  columns: RetailOpsColumnMapping[];
}

/**
 * A single row of RetailOps export data
 * Keys are exact column names, values are the exported values
 */
export type RetailOpsRow = Record<string, string | number | boolean | null>;

// ============================================================================
// Export Mapping Definition
// ============================================================================

/**
 * RetailOps Export Mapping
 * 
 * Column names and order exactly match the RetailOps CSV Field Mapping Notion spec.
 * DO NOT rename, abbreviate, or reorder columns.
 * 
 * For any column that doesn't map cleanly to a CoreProduct field:
 * - source is set to ""
 * - default value is provided if appropriate
 * - TODO comment references what's missing
 */
export const retailOpsExportMapping: RetailOpsExportMappingConfig = {
  columns: [
    {
      name: 'SKU',
      source: 'sku',
      required: true,
      description: 'Internal SKU identifier',
    },
    {
      name: 'Product Name',
      source: '',
      required: true,
      default: '',
      transform: 'buildProductName',
      // TODO: CoreProduct doesn't have a title field. Build from brand + class + colorPrimary.
      description: 'Product display name built from brand, class, and color',
    },
    {
      name: 'Brand',
      source: 'brand',
      required: true,
      description: 'Product brand (NIKE or JORDAN)',
    },
    {
      name: 'Description',
      source: '',
      required: false,
      default: '',
      // TODO: CoreProduct doesn't have a description field. Could use meta.description if available.
      description: 'Product description (not available in CoreProduct)',
    },
    {
      name: 'Department',
      source: 'gender',
      required: false,
      transform: 'mapGenderToDepartment',
      description: 'Maps gender to department (MEN -> Mens)',
    },
    {
      name: 'Category',
      source: 'category',
      required: false,
      description: 'Product category (FOOTWEAR)',
    },
    {
      name: 'Color',
      source: 'colorPrimary',
      required: false,
      description: 'Primary color name',
    },
    {
      name: 'Size',
      source: '',
      required: false,
      default: '',
      // TODO: CoreProduct represents a style, not a size-specific SKU. Size not available at product level.
      description: 'Size value (not available at product level)',
    },
    {
      name: 'MSRP',
      source: 'msrp',
      required: true,
      transform: 'formatCurrency',
      description: 'Manufacturers suggested retail price',
    },
    {
      name: 'Cost',
      source: '',
      required: false,
      default: '',
      // TODO: CoreProduct doesn't have a cost field. Requires inventory/procurement data.
      description: 'Product cost (not available in CoreProduct)',
    },
    {
      name: 'Retail Price',
      source: 'price',
      required: true,
      transform: 'formatCurrency',
      description: 'Selling price',
    },
    {
      name: 'Currency',
      source: '',
      required: false,
      default: 'USD',
      description: 'Currency code. Defaults to USD for MVP.',
    },
    {
      name: 'Quantity',
      source: '',
      required: false,
      default: '',
      // TODO: CoreProduct doesn't have inventory quantity. Requires inventory data.
      description: 'Inventory quantity (not available in CoreProduct)',
    },
    {
      name: 'Warehouse',
      source: '',
      required: false,
      default: '',
      // TODO: CoreProduct doesn't have warehouse info. Requires inventory data.
      description: 'Warehouse location (not available in CoreProduct)',
    },
    {
      name: 'First Received',
      source: '',
      required: false,
      default: '',
      // TODO: CoreProduct doesn't have first received date. Requires inventory data.
      description: 'First received date (not available in CoreProduct)',
    },
    {
      name: 'Launch Date',
      source: 'launchDate',
      required: false,
      transform: 'formatDate',
      description: 'Product launch date',
    },
    {
      name: 'Images',
      source: 'images',
      required: false,
      transform: 'joinImages',
      description: 'Pipe-separated list of image URLs',
    },
    {
      name: 'Primary Image',
      source: 'images',
      required: false,
      transform: 'getPrimaryImage',
      description: 'Primary/hero image URL',
    },
  ],
};

/**
 * Get the ordered list of column names for the CSV header
 */
export function getRetailOpsHeaderRow(): string[] {
  return retailOpsExportMapping.columns.map((col) => col.name);
}

// ============================================================================
// Transform Functions
// ============================================================================

/**
 * Build a product name from CoreProduct fields
 * Format: "{Brand} {Class} - {ColorPrimary}"
 */
function buildProductName(product: CoreProduct): string {
  const parts = [product.brand, product.class, '-', product.colorPrimary].filter(Boolean);
  return parts.join(' ').trim();
}

/**
 * Map gender enum to department string
 */
function mapGenderToDepartment(gender: string): string {
  const mapping: Record<string, string> = {
    MEN: 'Mens',
    WOMEN: 'Womens',
    UNISEX: 'Unisex',
    KIDS: 'Kids',
  };
  return mapping[gender] || gender;
}

/**
 * Format a number as currency (2 decimal places)
 */
function formatCurrency(value: number): string {
  if (typeof value !== 'number' || isNaN(value)) {
    return '';
  }
  return value.toFixed(2);
}

/**
 * Format an ISO date string to YYYY-MM-DD
 */
function formatDate(isoDate: string): string {
  if (!isoDate) {
    return '';
  }
  try {
    const date = new Date(isoDate);
    if (isNaN(date.getTime())) {
      return '';
    }
    return date.toISOString().split('T')[0];
  } catch {
    return '';
  }
}

/**
 * Join image URLs with pipe separator
 */
function joinImages(images: ProductImage[]): string {
  if (!Array.isArray(images) || images.length === 0) {
    return '';
  }
  return images.map((img) => img.url).join('|');
}

/**
 * Get the primary image URL
 * Returns the first image with isPrimary=true, or the first image if none is marked primary
 */
function getPrimaryImage(images: ProductImage[]): string {
  if (!Array.isArray(images) || images.length === 0) {
    return '';
  }
  const primary = images.find((img) => img.isPrimary);
  return primary ? primary.url : images[0]?.url || '';
}

// ============================================================================
// Value Resolution
// ============================================================================

/**
 * Resolve a dot-path value from an object
 * e.g., "images.0.url" resolves to obj.images[0].url
 */
function resolvePath(obj: Record<string, unknown>, path: string): unknown {
  if (!path) {
    return undefined;
  }

  const parts = path.split('.');
  let current: unknown = obj;

  for (const part of parts) {
    if (current === null || current === undefined) {
      return undefined;
    }

    if (typeof current === 'object') {
      current = (current as Record<string, unknown>)[part];
    } else {
      return undefined;
    }
  }

  return current;
}

/**
 * Apply a named transform to a value
 */
function applyTransform(
  transformName: string,
  value: unknown,
  product: CoreProduct
): string | number | boolean | null {
  switch (transformName) {
    case 'buildProductName':
      return buildProductName(product);

    case 'mapGenderToDepartment':
      return mapGenderToDepartment(String(value || ''));

    case 'formatCurrency':
      return formatCurrency(value as number);

    case 'formatDate':
      return formatDate(String(value || ''));

    case 'joinImages':
      return joinImages(value as ProductImage[]);

    case 'getPrimaryImage':
      return getPrimaryImage(value as ProductImage[]);

    default:
      // Unknown transform, return value as-is
      return value as string | number | boolean | null;
  }
}

// ============================================================================
// CSV Escaping
// ============================================================================

/**
 * Escape a value for CSV output
 * - Quote values containing commas, quotes, or newlines
 * - Escape inner quotes as ""
 */
function escapeCSV(value: string | number | boolean | null): string {
  if (value === null || value === undefined) {
    return '';
  }

  const strValue = String(value);

  // Check if quoting is needed
  const needsQuoting = strValue.includes(',') || strValue.includes('"') || strValue.includes('\n') || strValue.includes('\r');

  if (needsQuoting) {
    // Escape inner quotes by doubling them
    const escaped = strValue.replace(/"/g, '""');
    return `"${escaped}"`;
  }

  return strValue;
}

// ============================================================================
// Main Export Functions
// ============================================================================

/**
 * Build a RetailOps row from a CoreProduct
 *
 * Uses the mapping from retailOpsExportMapping to:
 * - Walk through columns in order
 * - Resolve source values from the product
 * - Apply transforms if specified
 * - Use defaults for missing values
 *
 * @param product - A valid CoreProduct object
 * @returns RetailOpsRow with keys = exact column names
 *
 * @example
 * ```typescript
 * const product: CoreProduct = { sku: 'NK-001', ... };
 * const row = buildRetailOpsRow(product);
 * console.log(row['SKU']); // 'NK-001'
 * ```
 */
export function buildRetailOpsRow(product: CoreProduct): RetailOpsRow {
  const row: RetailOpsRow = {};

  for (const column of retailOpsExportMapping.columns) {
    let value: unknown;

    // Resolve source value if source path is provided
    if (column.source) {
      value = resolvePath(product as unknown as Record<string, unknown>, column.source);
    }

    // Apply transform if specified
    if (column.transform) {
      value = applyTransform(column.transform, value, product);
    }

    // Use default if value is missing/empty
    if (value === undefined || value === null || value === '') {
      value = column.default !== undefined ? column.default : '';
    }

    // Convert to string/number/boolean/null
    if (typeof value === 'object') {
      value = String(value);
    }

    row[column.name] = value as string | number | boolean | null;
  }

  return row;
}

/**
 * Build a complete RetailOps CSV from an array of CoreProduct objects
 *
 * @param products - Array of valid CoreProduct objects
 * @returns CSV string with header row and one data row per product
 *
 * @example
 * ```typescript
 * const products: CoreProduct[] = [{ sku: 'NK-001', ... }, { sku: 'NK-002', ... }];
 * const csv = buildRetailOpsCsv(products);
 * // Returns:
 * // "SKU,Product Name,Brand,...\n"
 * // "NK-001,Nike Basketball - Black,NIKE,...\n"
 * // "NK-002,Nike Running - White,NIKE,...\n"
 * ```
 */
export function buildRetailOpsCsv(products: CoreProduct[]): string {
  const headers = getRetailOpsHeaderRow();

  // Build header row
  const headerLine = headers.map(escapeCSV).join(',');

  // Build data rows
  const dataLines = products.map((product) => {
    const row = buildRetailOpsRow(product);
    return headers.map((header) => escapeCSV(row[header])).join(',');
  });

  // Combine header and data rows
  return [headerLine, ...dataLines].join('\n');
}

/**
 * Get column names only (convenience export)
 */
export const RETAILOPS_COLUMN_NAMES = getRetailOpsHeaderRow();

/**
 * Expected header row as a string (for testing)
 */
export const RETAILOPS_HEADER_ROW = getRetailOpsHeaderRow().join(',');
