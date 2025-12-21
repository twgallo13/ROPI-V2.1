/**
 * Import Normalization Rules
 * Per AOSS Section 3.2 — Import Normalization Rules
 * 
 * Transforms raw RetailOps CSV data into normalized product fields.
 */

import type { ImportSourceColumns, ImportNormalizedFields, ColumnMapping } from '../schema/importEngine';

/**
 * Default column mappings for RetailOps CSV
 * Maps common RO column names to AOSS normalized fields
 * 
 * LP-2.1.0: MPN-first — MPN is required, SKU is optional
 * MPN is the canonical product identifier per Product Schema / Attribute Registry
 */
export const DEFAULT_COLUMN_MAPPINGS: ColumnMapping[] = [
  // Core fields — MPN is required (LP-2.1.0), SKU is optional
  { sourceColumn: 'MPN', targetField: 'mpn', required: true, transform: 'trim' },
  { sourceColumn: 'mpn', targetField: 'mpn', required: true, transform: 'trim' },
  { sourceColumn: 'Manufacturer Part Number', targetField: 'mpn', required: true, transform: 'trim' },
  { sourceColumn: 'SKU', targetField: 'sku', required: false, transform: 'trim' },
  { sourceColumn: 'Product Name', targetField: 'title', required: true, transform: 'trim' },
  { sourceColumn: 'Brand', targetField: 'brand', required: true, transform: 'trim' },
  { sourceColumn: 'Description', targetField: 'description', transform: 'trim' },
  
  // Attributes
  { sourceColumn: 'Department', targetField: 'department', transform: 'trim' },
  { sourceColumn: 'Class', targetField: 'class', transform: 'trim' },
  { sourceColumn: 'Category', targetField: 'category', transform: 'trim' },
  { sourceColumn: 'Subcategory', targetField: 'subcategory', transform: 'trim' },
  { sourceColumn: 'Gender', targetField: 'gender', transform: 'lowercase' },
  { sourceColumn: 'Age Group', targetField: 'ageGroup', transform: 'trim' },
  { sourceColumn: 'Color', targetField: 'color', transform: 'trim' },
  { sourceColumn: 'Size', targetField: 'size', transform: 'trim' },
  { sourceColumn: 'Material', targetField: 'material', transform: 'trim' },
  
  // Pricing
  { sourceColumn: 'MSRP', targetField: 'msrp', transform: 'number' },
  { sourceColumn: 'Cost', targetField: 'cost', transform: 'number' },
  { sourceColumn: 'Retail Price', targetField: 'retailPrice', transform: 'number' },
  { sourceColumn: 'Currency', targetField: 'currency', transform: 'uppercase', defaultValue: 'USD' },
  
  // Inventory
  { sourceColumn: 'Quantity', targetField: 'quantity', transform: 'number', defaultValue: 0 },
  { sourceColumn: 'Warehouse', targetField: 'warehouse', transform: 'trim' },
  { sourceColumn: 'Location', targetField: 'location', transform: 'trim' },
  
  // Dates
  { sourceColumn: 'First Received', targetField: 'firstReceived', transform: 'date' },
  { sourceColumn: 'Launch Date', targetField: 'launchDate', transform: 'date' },
  
  // Media (pipe-separated URLs)
  { sourceColumn: 'Images', targetField: 'images', transform: 'array' },
  { sourceColumn: 'Primary Image', targetField: 'primaryImage', transform: 'trim' },
];

/**
 * Apply transformation to a value based on transform type
 */
function applyTransform(
  value: string | number | null | undefined,
  transform?: ColumnMapping['transform']
): string | number | string[] | undefined {
  if (value === null || value === undefined || value === '') {
    return undefined;
  }

  const strValue = String(value);

  switch (transform) {
    case 'trim':
      return strValue.trim();
    
    case 'uppercase':
      return strValue.trim().toUpperCase();
    
    case 'lowercase':
      return strValue.trim().toLowerCase();
    
    case 'number': {
      // Remove currency symbols, commas, etc.
      const cleaned = strValue.replace(/[$,\s]/g, '');
      const num = parseFloat(cleaned);
      return isNaN(num) ? undefined : num;
    }
    
    case 'date': {
      // Try to parse various date formats
      try {
        const date = new Date(strValue);
        if (isNaN(date.getTime())) {
          return undefined;
        }
        return date.toISOString();
      } catch {
        return undefined;
      }
    }
    
    case 'array': {
      // Split by pipe, comma, or semicolon
      return strValue
        .split(/[|,;]/)
        .map(s => s.trim())
        .filter(s => s.length > 0);
    }
    
    default:
      return strValue.trim();
  }
}

/**
 * Normalize a single row from RetailOps CSV
 * 
 * @param sourceColumns - Raw CSV columns
 * @param mappings - Column mapping configuration (defaults to DEFAULT_COLUMN_MAPPINGS)
 * @returns Normalized fields
 */
export function normalizeImportRow(
  sourceColumns: ImportSourceColumns,
  mappings: ColumnMapping[] = DEFAULT_COLUMN_MAPPINGS
): ImportNormalizedFields {
  const normalized: ImportNormalizedFields = {};

  for (const mapping of mappings) {
    const sourceValue = sourceColumns[mapping.sourceColumn];
    
    // Apply transformation
    let normalizedValue = applyTransform(sourceValue, mapping.transform);
    
    // Use default value if no value found and default is specified
    if (normalizedValue === undefined && mapping.defaultValue !== undefined) {
      normalizedValue = mapping.defaultValue;
    }
    
    // Set normalized field if we have a value
    if (normalizedValue !== undefined) {
      normalized[mapping.targetField] = normalizedValue;
    }
  }

  return normalized;
}

/**
 * Derive product ID from MPN (preferred) or SKU (fallback)
 * LP-2.1.0: MPN-first — prefer MPN for productId derivation
 * Per Product Schema / Attribute Registry — MPN is canonical
 * 
 * @param options - Object containing mpn and/or sku
 * @returns Product ID for use in products/{productId}
 */
export function deriveProductId({ mpn, sku }: { mpn?: string; sku?: string }): string | undefined {
  const source = mpn || sku;
  if (!source) {
    return undefined;
  }
  
  // Convert source to lowercase and replace non-alphanumeric with hyphens
  // e.g., "NK-AIR-MAX-270-BLK-10" -> "nk-air-max-270-blk-10"
  return String(source).toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '');
}

/**
 * Check if a row is empty (all values null/undefined/empty string)
 * 
 * @param sourceColumns - Raw CSV columns
 * @returns True if row is empty
 */
export function isEmptyRow(sourceColumns: ImportSourceColumns): boolean {
  return Object.values(sourceColumns).every(
    value => value === null || value === undefined || value === ''
  );
}

/**
 * Validate required fields are present after normalization
 * 
 * @param normalized - Normalized fields
 * @param mappings - Column mappings (to check required fields)
 * @returns Array of missing required field names (deduplicated)
 */
export function validateRequiredFields(
  normalized: ImportNormalizedFields,
  mappings: ColumnMapping[] = DEFAULT_COLUMN_MAPPINGS
): string[] {
  const missingFields = new Set<string>();
  
  for (const mapping of mappings) {
    if (mapping.required) {
      const value = normalized[mapping.targetField];
      if (value === undefined || value === null || value === '') {
        missingFields.add(mapping.targetField);
      }
    }
  }
  
  return Array.from(missingFields);
}
