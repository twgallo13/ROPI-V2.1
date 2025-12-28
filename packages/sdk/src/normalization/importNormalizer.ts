/**
 * Import Normalization Rules
 * Per AOSS Section 3.2 — Import Normalization Rules
 * LP-importer-mapping-recon-1.1.0: Canonicalize mappings to registry attribute IDs
 * 
 * Transforms raw RetailOps CSV data into normalized product fields.
 * Uses canonical Attribute Registry IDs for all targetField values.
 */

import type { ImportSourceColumns, ImportNormalizedFields, ColumnMapping } from '../schema/importEngine';
import { LEGACY_TO_REGISTRY } from './legacyToRegistryMap';

/**
 * Helper to normalize a targetField to its canonical registry attribute_id.
 * Accepts either canonical registry IDs or legacy camelCase keys and ensures
 * callers of the normalizer always get registry IDs.
 * 
 * @param targetField - The field to normalize (legacy or registry format)
 * @returns Canonical registry attribute_id
 */
export function normalizeTargetFieldToRegistry(targetField: string): string {
  if (!targetField) return targetField;
  
  // If it's a known legacy key, translate it
  const mapped = LEGACY_TO_REGISTRY[targetField];
  if (mapped) {
    return mapped;
  }
  
  // Otherwise assume it's already canonical
  return targetField;
}

/**
 * Helper to check if a CSV header matches a sourceColumn definition.
 * Supports both string and array sourceColumn formats (LP-1.1.0).
 * 
 * @param sourceColumn - String or array of aliases to match
 * @param header - CSV header to check
 * @returns True if header matches any alias (case-insensitive)
 */
export function sourceColumnMatchesHeader(
  sourceColumn: string | string[],
  header: string
): boolean {
  const normalizedHeader = header.toLowerCase().trim();
  
  if (Array.isArray(sourceColumn)) {
    return sourceColumn.some(alias => alias.toLowerCase().trim() === normalizedHeader);
  }
  
  return sourceColumn.toLowerCase().trim() === normalizedHeader;
}

/**
 * Default column mappings for RetailOps CSV
 * Maps common RO column names to AOSS normalized fields
 * 
 * LP-2.1.0: MPN-first — MPN is required, SKU is optional
 * LP-importer-mapping-recon-1.1.0: Use canonical Attribute Registry IDs for targetField
 * 
 * Note: sourceColumn may be a string or an array of aliases.
 * targetField must be the canonical Attribute Registry attribute_id.
 * Source of truth: evidence/importer-mapping-recon/attribute-registry.json (v1.1.4)
 */
export const DEFAULT_COLUMN_MAPPINGS: ColumnMapping[] = [
  // ======================================================================
  // Core Identifiers (category: sku_core)
  // MPN is required (LP-2.1.0), SKU is optional
  // ======================================================================
  { sourceColumn: ['MPN', 'mpn', 'Manufacturer Part Number'], targetField: 'mpn', required: true, transform: 'trim' },
  { sourceColumn: ['SKU', 'sku', 'Style'], targetField: 'sku', required: false, transform: 'trim' },
  { sourceColumn: ['Product Name', 'Name', 'name', 'Title'], targetField: 'name', required: false, transform: 'trim' },
  { sourceColumn: ['Brand', 'brand'], targetField: 'brand', required: false, transform: 'trim' },
  { sourceColumn: ['Description', 'description'], targetField: 'description', transform: 'trim' },
  { sourceColumn: ['Style ID', 'styleId', 'style_id'], targetField: 'style_id', transform: 'trim' },
  { sourceColumn: ['GTIN', 'gtin', 'UPC', 'upc'], targetField: 'gtin', transform: 'trim' },
  
  // ======================================================================
  // Classification (category: classification)
  // ======================================================================
  { sourceColumn: ['Department', 'department'], targetField: 'department', transform: 'trim' },
  { sourceColumn: ['Class', 'class'], targetField: 'class', transform: 'trim' },
  { sourceColumn: ['Category', 'category'], targetField: 'category', transform: 'trim' },
  { sourceColumn: ['Subcategory', 'subcategory'], targetField: 'subcategory', transform: 'trim' },
  
  // ======================================================================
  // Identity / Demographic (category: identity_demographic)
  // ======================================================================
  { sourceColumn: ['Gender', 'gender'], targetField: 'gender', transform: 'lowercase' },
  { sourceColumn: ['Age Group', 'ageGroup', 'age_group'], targetField: 'age_group', transform: 'trim' },
  
  // ======================================================================
  // Colors (category: color)
  // Registry: primary_color, descriptive_color
  // ======================================================================
  { sourceColumn: ['Color', 'Primary Color', 'color', 'primary_color'], targetField: 'primary_color', transform: 'trim' },
  { sourceColumn: ['Descriptive Color', 'DescriptiveColor', 'descriptive_color'], targetField: 'descriptive_color', transform: 'trim' },
  
  // ======================================================================
  // Materials & Construction (category: materials_construction)
  // ======================================================================
  { sourceColumn: ['Material', 'material'], targetField: 'material', transform: 'trim' },
  { sourceColumn: ['Closure Type', 'closure', 'closure_type'], targetField: 'closure_type', transform: 'trim' },
  { sourceColumn: ['Cut Type', 'cut_type'], targetField: 'cut_type', transform: 'trim' },
  
  // ======================================================================
  // Sizing / Measurements (category: measurements)
  // ======================================================================
  { sourceColumn: ['Size', 'size'], targetField: 'size', transform: 'trim' },
  { sourceColumn: ['Shoe Width', 'shoe_width'], targetField: 'shoe_width', transform: 'trim' },
  { sourceColumn: ['Weight', 'weight'], targetField: 'weight', transform: 'number' },
  
  // ======================================================================
  // RICS Reference Fields (category: rics_reference)
  // Note: rics_category and rics_color are reference fields (not in registry)
  // ======================================================================
  { sourceColumn: ['RICS Category', 'rics_category', 'ricsCategory'], targetField: 'rics_category', transform: 'trim' },
  { sourceColumn: ['RICS Color', 'rics_color', 'ricsColor'], targetField: 'rics_color', transform: 'trim' },
  { sourceColumn: ['RICS Long Description', 'RICS Long Desc', 'rics_long_desc'], targetField: 'rics_long_desc', transform: 'trim' },
  { sourceColumn: ['RICS Short Description', 'RICS Short Desc', 'rics_short_description'], targetField: 'rics_short_description', transform: 'trim' },
  
  // ======================================================================
  // Pricing
  // ======================================================================
  { sourceColumn: ['MSRP', 'msrp'], targetField: 'msrp', transform: 'number' },
  { sourceColumn: ['Cost', 'cost'], targetField: 'cost', transform: 'number' },
  { sourceColumn: ['Retail Price', 'retailPrice', 'retail_price'], targetField: 'retail_price', transform: 'number' },
  { sourceColumn: ['Currency', 'currency'], targetField: 'currency', transform: 'uppercase', defaultValue: 'USD' },
  
  // ======================================================================
  // Inventory / Logistics
  // ======================================================================
  { sourceColumn: ['Quantity', 'Qty', 'quantity'], targetField: 'quantity', transform: 'number', defaultValue: 0 },
  { sourceColumn: ['Warehouse', 'warehouse'], targetField: 'warehouse', transform: 'trim' },
  { sourceColumn: ['Location', 'location'], targetField: 'location', transform: 'trim' },
  
  // ======================================================================
  // Lifecycle / Dates (category: lifecycle)
  // ======================================================================
  { sourceColumn: ['First Received', 'firstReceived', 'first_received'], targetField: 'first_received', transform: 'date' },
  { sourceColumn: ['Launch Date', 'launchDate', 'launch_date'], targetField: 'launch_date', transform: 'date' },
  
  // ======================================================================
  // Media
  // ======================================================================
  { sourceColumn: ['Images', 'images', 'image_urls'], targetField: 'images', transform: 'array' },
  { sourceColumn: ['Primary Image', 'primaryImage', 'primary_image'], targetField: 'primary_image', transform: 'trim' },
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
 * Find the value from sourceColumns for a given sourceColumn definition.
 * Supports both string and array sourceColumn formats (LP-1.1.0).
 * 
 * @param sourceColumns - Raw CSV columns
 * @param sourceColumn - String or array of aliases to match
 * @returns The value from the first matching header, or undefined
 */
function findSourceValue(
  sourceColumns: ImportSourceColumns,
  sourceColumn: string | string[]
): string | number | null | undefined {
  if (Array.isArray(sourceColumn)) {
    // Try each alias in order
    for (const alias of sourceColumn) {
      // Check both exact match and case-insensitive match
      if (sourceColumns[alias] !== undefined) {
        return sourceColumns[alias];
      }
      // Try case-insensitive match
      const key = Object.keys(sourceColumns).find(
        k => k.toLowerCase().trim() === alias.toLowerCase().trim()
      );
      if (key && sourceColumns[key] !== undefined) {
        return sourceColumns[key];
      }
    }
    return undefined;
  }
  
  // Single string sourceColumn
  if (sourceColumns[sourceColumn] !== undefined) {
    return sourceColumns[sourceColumn];
  }
  // Try case-insensitive match
  const key = Object.keys(sourceColumns).find(
    k => k.toLowerCase().trim() === sourceColumn.toLowerCase().trim()
  );
  return key ? sourceColumns[key] : undefined;
}

/**
 * Normalize a single row from RetailOps CSV
 * LP-importer-mapping-recon-1.1.0: Use canonical registry IDs for all targetField values
 * 
 * @param sourceColumns - Raw CSV columns
 * @param mappings - Column mapping configuration (defaults to DEFAULT_COLUMN_MAPPINGS)
 * @returns Normalized fields with canonical registry attribute IDs
 */
export function normalizeImportRow(
  sourceColumns: ImportSourceColumns,
  mappings: ColumnMapping[] = DEFAULT_COLUMN_MAPPINGS
): ImportNormalizedFields {
  const normalized: ImportNormalizedFields = {};

  for (const mapping of mappings) {
    // LP-1.1.0: Support array sourceColumn
    const sourceValue = findSourceValue(sourceColumns, mapping.sourceColumn as string | string[]);
    
    // Apply transformation
    let normalizedValue = applyTransform(sourceValue, mapping.transform);
    
    // Use default value if no value found and default is specified
    if (normalizedValue === undefined && mapping.defaultValue !== undefined) {
      normalizedValue = mapping.defaultValue;
    }
    
    // Set normalized field using canonical registry ID
    // LP-1.1.0: Ensure targetField is canonical registry attribute_id
    if (normalizedValue !== undefined) {
      const canonicalTarget = normalizeTargetFieldToRegistry(mapping.targetField);
      normalized[canonicalTarget] = normalizedValue;
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
 * LP-importer-mapping-recon-1.1.0: Use canonical registry IDs
 * 
 * @param normalized - Normalized fields
 * @param mappings - Column mappings (to check required fields)
 * @returns Array of missing required field names (deduplicated, canonical registry IDs)
 */
export function validateRequiredFields(
  normalized: ImportNormalizedFields,
  mappings: ColumnMapping[] = DEFAULT_COLUMN_MAPPINGS
): string[] {
  const missingFields = new Set<string>();
  
  for (const mapping of mappings) {
    if (mapping.required) {
      // Use canonical registry ID for field lookup
      const canonicalTarget = normalizeTargetFieldToRegistry(mapping.targetField);
      const value = normalized[canonicalTarget];
      if (value === undefined || value === null || value === '') {
        missingFields.add(canonicalTarget);
      }
    }
  }
  
  return Array.from(missingFields);
}
