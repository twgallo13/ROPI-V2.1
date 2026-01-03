/**
 * Export Service
 * LP-2.1.9 — Export & PDP Alignment
 * 
 * Centralized export logic for generating RO CSV and other feed formats.
 * Ensures exports use MPN as primary key, export only attributes with 
 * export: true, use definition_version and data_type tokens, map enum/multiSelect 
 * via allowed_values and synonyms, and include _meta provenance where helpful.
 * 
 * Features:
 * - MPN as primary identifier (required for all export rows)
 * - Attribute selection based on export: true flag
 * - Per-site export filters (exportForSites)
 * - Enum/multiSelect canonical value mapping with synonyms
 * - Export readiness scoring based on requiredForExport flags
 * - _meta provenance columns (optional)
 * - Batched/streaming export for large datasets
 */

import * as admin from 'firebase-admin';
import { loadRegistryMap, type AttributeDefinition } from './attributeValidator';

// ============================================================================
// Types
// ============================================================================

/**
 * Export configuration options
 */
export interface ExportOptions {
  /** Target site for per-site attribute filtering */
  site?: string;
  /** Maximum rows to export (for dry-run/preview) */
  limit?: number;
  /** Include _meta provenance columns */
  includeMeta?: boolean;
  /** Export format */
  format?: 'ro_csv' | 'json' | 'csv';
  /** Delimiter for multiSelect values (default: '|') */
  multiSelectDelimiter?: string;
  /** Page size for batched queries (default: 1000) */
  pageSize?: number;
}

/**
 * Product document from Firestore
 */
export interface ProductDocument {
  id: string;
  mpn?: string;
  sku?: string;
  skus?: string[];
  title?: string;
  brand?: string;
  description?: string;
  status?: string;
  attributes?: Record<string, unknown>;
  pricing?: {
    msrp?: number;
    cost?: number;
    retailPrice?: number;
    currency?: string;
  };
  media?: {
    images?: Array<{ url: string; alt?: string; isPrimary?: boolean }>;
  };
  statusFlags?: {
    ready_for_export?: boolean;
    [key: string]: boolean | undefined;
  };
  _meta?: Record<string, AttributeMeta>;
  createdAt?: string;
  updatedAt?: string;
  createdBy?: string;
  updatedBy?: string;
}

/**
 * Attribute metadata for provenance tracking
 */
export interface AttributeMeta {
  actor?: string;
  source?: string;
  ts?: string;
  definition_version?: string;
  canonical?: boolean;
}

/**
 * Export row with validation info
 */
export interface ExportRow {
  /** Row number (1-indexed) */
  rowNumber: number;
  /** Product MPN (primary key) */
  mpn: string;
  /** Product ID in Firestore */
  productId: string;
  /** Whether the product is export-ready */
  exportReady: boolean;
  /** Missing required attributes */
  missingAttributes: string[];
  /** Warnings for non-canonical values */
  warnings: ExportWarning[];
  /** Column values for export */
  columns: Record<string, string | number | boolean | null>;
  /** Meta columns if requested */
  metaColumns?: Record<string, string>;
}

/**
 * Export warning for unknown/non-canonical values
 */
export interface ExportWarning {
  code: string;
  attribute: string;
  message: string;
  value?: unknown;
}

/**
 * Export summary statistics
 */
export interface ExportSummary {
  totalProducts: number;
  exportedProducts: number;
  skippedProducts: number;
  exportReadyCount: number;
  notExportReadyCount: number;
  warningCount: number;
  errorCodes: Record<string, number>;
  missingAttributeCounts: Record<string, number>;
}

/**
 * Complete export result
 */
export interface ExportResult {
  timestamp: string;
  options: ExportOptions;
  summary: ExportSummary;
  rows: ExportRow[];
  csvContent?: string;
  columnHeaders?: string[];
}

/**
 * Dry-run preview result
 */
export interface DryRunResult {
  timestamp: string;
  options: ExportOptions;
  summary: ExportSummary;
  sampleRows: ExportRow[];
  sampleCsv: string;
  columnHeaders: string[];
  attributesIncluded: string[];
  attributesExcluded: string[];
}

// ============================================================================
// Constants
// ============================================================================

const DEFAULT_PAGE_SIZE = 1000;
const DEFAULT_MULTISELECT_DELIMITER = '|';

/**
 * Core columns that always appear first in exports
 */
const CORE_COLUMNS = ['MPN', 'SKU'];

/**
 * Columns to skip (handled separately)
 */
const SKIP_ATTRIBUTE_IDS = new Set([
  'mpn', 'sku', 'skus', 'title', 'brand', 'description', 
  'status', 'pricing', 'media', 'statusFlags', 'createdAt', 
  'updatedAt', 'createdBy', 'updatedBy', '_meta'
]);

// ============================================================================
// Registry Management
// ============================================================================

/**
 * Extended attribute definition for export
 */
export interface ExportAttributeDefinition extends AttributeDefinition {
  export?: boolean;
  exportForSites?: string[];
  required_for_export?: boolean;
  requiredForExport?: boolean;
  category?: string;
  external_header?: string;
}

/**
 * Load exportable attributes from registry
 */
export async function loadExportableAttributes(
  site?: string
): Promise<Map<string, ExportAttributeDefinition>> {
  const registry = await loadRegistryMap();
  const exportable = new Map<string, ExportAttributeDefinition>();

  for (const [id, def] of registry) {
    const exportDef = def as ExportAttributeDefinition;
    
    // Skip if not exportable
    // Default export to true if not specified (for backward compat)
    const isExportable = exportDef.export !== false;
    
    if (!isExportable) continue;

    // If site filter specified, check exportForSites
    if (site && exportDef.exportForSites && exportDef.exportForSites.length > 0) {
      if (!exportDef.exportForSites.includes(site)) continue;
    }

    exportable.set(id, exportDef);
  }

  return exportable;
}

/**
 * Get sorted column headers for export
 */
export function getExportColumnHeaders(
  attributes: Map<string, ExportAttributeDefinition>,
  includeMeta: boolean = false
): string[] {
  const headers = [...CORE_COLUMNS];

  // Sort attributes by category then label
  const sorted = Array.from(attributes.entries()).sort((a, b) => {
    const catA = a[1].category || 'zzz';
    const catB = b[1].category || 'zzz';
    if (catA !== catB) return catA.localeCompare(catB);
    return (a[1].label || a[0]).localeCompare(b[1].label || b[0]);
  });

  for (const [id, def] of sorted) {
    if (SKIP_ATTRIBUTE_IDS.has(id)) continue;
    
    // Use external_header if available, otherwise label or id
    const header = def.external_header || def.label || id;
    headers.push(header);

    // Add meta column if requested
    if (includeMeta) {
      headers.push(`${header}_meta`);
    }
  }

  return headers;
}

// ============================================================================
// Value Mapping & Normalization
// ============================================================================

/**
 * Map a value to its canonical form using allowed_values and synonyms
 */
export function mapToCanonical(
  value: unknown,
  def: ExportAttributeDefinition
): { canonical: string | null; warning?: ExportWarning } {
  if (value === null || value === undefined || value === '') {
    return { canonical: null };
  }

  const strValue = String(value).trim();

  // For enum and multiSelect types, check against allowed_values
  if ((def.data_type === 'enum' || def.data_type === 'multiSelect') && def.allowed_values) {
    // Direct match (case-insensitive)
    const directMatch = def.allowed_values.find(
      av => av.toLowerCase() === strValue.toLowerCase()
    );
    if (directMatch) {
      return { canonical: directMatch };
    }

    // Check synonyms mapping
    if (def.synonyms && typeof def.synonyms === 'object' && !Array.isArray(def.synonyms)) {
      const synonymMap = def.synonyms as Record<string, string>;
      const lowerValue = strValue.toLowerCase();
      for (const [synonym, canonical] of Object.entries(synonymMap)) {
        if (synonym.toLowerCase() === lowerValue) {
          return { canonical };
        }
      }
    }

    // Not found - return verbatim with warning
    return {
      canonical: strValue,
      warning: {
        code: 'unknown_export_value',
        attribute: def.id,
        message: `Value "${strValue}" not in allowed_values for ${def.label}`,
        value: strValue
      }
    };
  }

  // For non-enum types, return as-is
  return { canonical: strValue };
}

/**
 * Format multiSelect value for export
 */
export function formatMultiSelect(
  value: unknown,
  def: ExportAttributeDefinition,
  delimiter: string = DEFAULT_MULTISELECT_DELIMITER
): { formatted: string | null; warnings: ExportWarning[] } {
  const warnings: ExportWarning[] = [];

  if (value === null || value === undefined) {
    return { formatted: null, warnings };
  }

  // Parse array if string
  let values: string[];
  if (Array.isArray(value)) {
    values = value.map(v => String(v).trim()).filter(v => v);
  } else if (typeof value === 'string') {
    // Try parsing as pipe or comma-delimited
    if (value.includes('|')) {
      values = value.split('|').map(v => v.trim()).filter(v => v);
    } else if (value.includes(',')) {
      values = value.split(',').map(v => v.trim()).filter(v => v);
    } else {
      values = [value.trim()];
    }
  } else {
    values = [String(value).trim()];
  }

  // Map each value to canonical
  const canonicalValues: string[] = [];
  for (const v of values) {
    const result = mapToCanonical(v, def);
    if (result.canonical) {
      canonicalValues.push(result.canonical);
    }
    if (result.warning) {
      warnings.push(result.warning);
    }
  }

  return {
    formatted: canonicalValues.length > 0 ? canonicalValues.join(delimiter) : null,
    warnings
  };
}

/**
 * Format a value for CSV export based on data type
 */
export function formatValueForExport(
  value: unknown,
  def: ExportAttributeDefinition,
  options: ExportOptions
): { formatted: string | number | boolean | null; warnings: ExportWarning[] } {
  const warnings: ExportWarning[] = [];

  if (value === null || value === undefined) {
    return { formatted: null, warnings };
  }

  switch (def.data_type) {
    case 'enum': {
      const result = mapToCanonical(value, def);
      if (result.warning) warnings.push(result.warning);
      return { formatted: result.canonical, warnings };
    }

    case 'multiSelect': {
      const result = formatMultiSelect(
        value, 
        def, 
        options.multiSelectDelimiter || DEFAULT_MULTISELECT_DELIMITER
      );
      return { formatted: result.formatted, warnings: result.warnings };
    }

    case 'boolean': {
      const boolVal = typeof value === 'boolean' 
        ? value 
        : String(value).toLowerCase() === 'true' || value === '1' || value === 1;
      return { formatted: boolVal, warnings };
    }

    case 'number':
    case 'currency': {
      const numVal = typeof value === 'number' ? value : parseFloat(String(value));
      if (isNaN(numVal)) {
        return { formatted: null, warnings };
      }
      return { formatted: numVal, warnings };
    }

    case 'date': {
      // Ensure ISO 8601 format
      if (value instanceof Date) {
        return { formatted: value.toISOString(), warnings };
      }
      const dateStr = String(value);
      const parsed = Date.parse(dateStr);
      if (!isNaN(parsed)) {
        return { formatted: new Date(parsed).toISOString(), warnings };
      }
      return { formatted: dateStr, warnings };
    }

    case 'string':
    default: {
      // Sanitize for CSV (replace newlines, escape quotes)
      let strVal = String(value);
      strVal = strVal.replace(/\r?\n/g, ' ').replace(/"/g, '""');
      return { formatted: strVal, warnings };
    }
  }
}

// ============================================================================
// Export Readiness
// ============================================================================

/**
 * Missing attribute with ID and human-readable label
 * LP-export-readiness-attribute-registry-1.0.0
 */
export interface MissingAttribute {
  id: string;
  label: string;
}

/**
 * Calculate export readiness for a product
 */
export function calculateExportReadiness(
  product: ProductDocument,
  attributes: Map<string, ExportAttributeDefinition>
): { ready: boolean; missingAttributes: MissingAttribute[] } {
  const missing: MissingAttribute[] = [];

  // MPN is always required
  if (!product.mpn || product.mpn.trim() === '') {
    missing.push({
      id: 'mpn',
      label: 'MPN'
    });
  }

  // Check required_for_export attributes
  for (const [id, def] of attributes) {
    const isRequired = def.required_for_export || def.requiredForExport;
    if (!isRequired) continue;

    // Check if attribute has a value
    const value = product.attributes?.[id];
    if (value === undefined || value === null || value === '') {
      missing.push({
        id: id,
        label: def.label || id
      });
    }
  }

  return {
    ready: missing.length === 0,
    missingAttributes: missing
  };
}

// ============================================================================
// Product Export Processing
// ============================================================================

/**
 * Build export row from product document
 */
export function buildExportRow(
  product: ProductDocument,
  rowNumber: number,
  attributes: Map<string, ExportAttributeDefinition>,
  options: ExportOptions
): ExportRow {
  const warnings: ExportWarning[] = [];
  const columns: Record<string, string | number | boolean | null> = {};
  const metaColumns: Record<string, string> = {};

  // Check export readiness
  const readiness = calculateExportReadiness(product, attributes);

  // Core columns
  columns['MPN'] = product.mpn || null;
  
  // SKUs - comma-separated if multiple
  const skus = product.skus?.length 
    ? product.skus.join(',') 
    : product.sku || null;
  columns['SKU'] = skus;

  // Process each exportable attribute
  for (const [id, def] of attributes) {
    if (SKIP_ATTRIBUTE_IDS.has(id)) continue;

    const header = def.external_header || def.label || id;
    const value = product.attributes?.[id];

    const result = formatValueForExport(value, def, options);
    columns[header] = result.formatted;
    warnings.push(...result.warnings);

    // Add meta column if requested
    if (options.includeMeta) {
      const meta = product._meta?.[id];
      if (meta) {
        metaColumns[`${header}_meta`] = JSON.stringify({
          actor: meta.actor,
          source: meta.source,
          ts: meta.ts,
          definition_version: meta.definition_version || def.definition_version,
          canonical: meta.canonical ?? true
        });
      } else {
        metaColumns[`${header}_meta`] = '';
      }
    }
  }

  return {
    rowNumber,
    mpn: product.mpn || '',
    productId: product.id,
    exportReady: readiness.ready,
    missingAttributes: readiness.missingAttributes,
    warnings,
    columns,
    metaColumns: options.includeMeta ? metaColumns : undefined
  };
}

// ============================================================================
// CSV Generation
// ============================================================================

/**
 * Escape a value for CSV
 */
function escapeCsvValue(value: string | number | boolean | null): string {
  if (value === null || value === undefined) return '';
  const str = String(value);
  // Quote if contains comma, quote, or newline
  if (str.includes(',') || str.includes('"') || str.includes('\n') || str.includes('\r')) {
    return `"${str.replace(/"/g, '""')}"`;
  }
  return str;
}

/**
 * Generate CSV content from export rows
 */
export function generateCsvContent(
  headers: string[],
  rows: ExportRow[]
): string {
  const lines: string[] = [];

  // Header row
  lines.push(headers.map(h => escapeCsvValue(h)).join(','));

  // Data rows
  for (const row of rows) {
    const values = headers.map(h => {
      // Check main columns first, then meta columns
      if (h in row.columns) {
        return escapeCsvValue(row.columns[h]);
      }
      if (row.metaColumns && h in row.metaColumns) {
        return escapeCsvValue(row.metaColumns[h]);
      }
      return '';
    });
    lines.push(values.join(','));
  }

  return lines.join('\n');
}

// ============================================================================
// Main Export Functions
// ============================================================================

/**
 * Run dry-run export preview
 */
export async function runDryRunExport(
  options: ExportOptions = {}
): Promise<DryRunResult> {
  const db = admin.firestore();
  const timestamp = new Date().toISOString();

  // Load exportable attributes
  const attributes = await loadExportableAttributes(options.site);
  const headers = getExportColumnHeaders(attributes, options.includeMeta);

  // Get non-exportable attributes for info
  const fullRegistry = await loadRegistryMap();
  const excludedAttrs: string[] = [];
  for (const [id] of fullRegistry) {
    if (!attributes.has(id) && !SKIP_ATTRIBUTE_IDS.has(id)) {
      excludedAttrs.push(id);
    }
  }

  // Query sample products
  const limit = options.limit || 10;
  const snapshot = await db.collection('products')
    .where('mpn', '!=', null)
    .limit(limit)
    .get();

  const rows: ExportRow[] = [];
  const summary: ExportSummary = {
    totalProducts: 0,
    exportedProducts: 0,
    skippedProducts: 0,
    exportReadyCount: 0,
    notExportReadyCount: 0,
    warningCount: 0,
    errorCodes: {},
    missingAttributeCounts: {}
  };

  let rowNumber = 1;
  for (const doc of snapshot.docs) {
    const product = { id: doc.id, ...doc.data() } as ProductDocument;
    summary.totalProducts++;

    // Skip products without MPN
    if (!product.mpn) {
      summary.skippedProducts++;
      summary.errorCodes['missing_mpn'] = (summary.errorCodes['missing_mpn'] || 0) + 1;
      continue;
    }

    const row = buildExportRow(product, rowNumber++, attributes, options);
    rows.push(row);
    summary.exportedProducts++;

    if (row.exportReady) {
      summary.exportReadyCount++;
    } else {
      summary.notExportReadyCount++;
      for (const attr of row.missingAttributes) {
        summary.missingAttributeCounts[attr] = (summary.missingAttributeCounts[attr] || 0) + 1;
      }
    }

    summary.warningCount += row.warnings.length;
    for (const warning of row.warnings) {
      summary.errorCodes[warning.code] = (summary.errorCodes[warning.code] || 0) + 1;
    }
  }

  // Generate sample CSV
  const sampleCsv = generateCsvContent(headers, rows);

  return {
    timestamp,
    options,
    summary,
    sampleRows: rows,
    sampleCsv,
    columnHeaders: headers,
    attributesIncluded: Array.from(attributes.keys()),
    attributesExcluded: excludedAttrs
  };
}

/**
 * Run full export with batching
 */
export async function runFullExport(
  options: ExportOptions = {}
): Promise<ExportResult> {
  const db = admin.firestore();
  const timestamp = new Date().toISOString();
  const pageSize = options.pageSize || DEFAULT_PAGE_SIZE;

  // Load exportable attributes
  const attributes = await loadExportableAttributes(options.site);
  const headers = getExportColumnHeaders(attributes, options.includeMeta);

  const rows: ExportRow[] = [];
  const summary: ExportSummary = {
    totalProducts: 0,
    exportedProducts: 0,
    skippedProducts: 0,
    exportReadyCount: 0,
    notExportReadyCount: 0,
    warningCount: 0,
    errorCodes: {},
    missingAttributeCounts: {}
  };

  let rowNumber = 1;
  let lastDoc: admin.firestore.DocumentSnapshot | null = null;
  let hasMore = true;

  // Batched query with pagination
  while (hasMore) {
    let query = db.collection('products')
      .orderBy('mpn')
      .limit(pageSize);

    if (lastDoc) {
      query = query.startAfter(lastDoc);
    }

    const snapshot = await query.get();
    
    if (snapshot.empty) {
      hasMore = false;
      break;
    }

    for (const doc of snapshot.docs) {
      const product = { id: doc.id, ...doc.data() } as ProductDocument;
      summary.totalProducts++;

      // Skip products without MPN
      if (!product.mpn) {
        summary.skippedProducts++;
        summary.errorCodes['missing_mpn'] = (summary.errorCodes['missing_mpn'] || 0) + 1;
        continue;
      }

      const row = buildExportRow(product, rowNumber++, attributes, options);
      rows.push(row);
      summary.exportedProducts++;

      if (row.exportReady) {
        summary.exportReadyCount++;
      } else {
        summary.notExportReadyCount++;
        for (const attr of row.missingAttributes) {
          summary.missingAttributeCounts[attr] = (summary.missingAttributeCounts[attr] || 0) + 1;
        }
      }

      summary.warningCount += row.warnings.length;
      for (const warning of row.warnings) {
        summary.errorCodes[warning.code] = (summary.errorCodes[warning.code] || 0) + 1;
      }
    }

    lastDoc = snapshot.docs[snapshot.docs.length - 1];

    // Check if we should continue (for limited exports)
    if (options.limit && rows.length >= options.limit) {
      hasMore = false;
    }

    // Safety check for batching
    if (snapshot.docs.length < pageSize) {
      hasMore = false;
    }
  }

  // Generate CSV content
  const csvContent = generateCsvContent(headers, rows);

  return {
    timestamp,
    options,
    summary,
    rows,
    csvContent,
    columnHeaders: headers
  };
}

/**
 * Save export to file system
 */
export async function saveExportToFile(
  result: ExportResult,
  basePath: string
): Promise<{ csvPath: string; summaryPath: string }> {
  const fs = await import('fs/promises');
  const path = await import('path');

  // Create directory if needed
  const dateDir = new Date().toISOString().split('T')[0];
  const exportDir = path.join(basePath, dateDir);
  await fs.mkdir(exportDir, { recursive: true });

  // Generate timestamp for filename
  const timestamp = new Date().toISOString().replace(/[:.]/g, '-');

  // Save CSV
  const csvFilename = `ro-export-${timestamp}.csv`;
  const csvPath = path.join(exportDir, csvFilename);
  if (result.csvContent) {
    await fs.writeFile(csvPath, result.csvContent, 'utf-8');
  }

  // Save summary JSON
  const summaryFilename = `export-summary-${timestamp}.json`;
  const summaryPath = path.join(exportDir, summaryFilename);
  await fs.writeFile(summaryPath, JSON.stringify({
    timestamp: result.timestamp,
    options: result.options,
    summary: result.summary,
    columnHeaders: result.columnHeaders,
    rowCount: result.rows.length
  }, null, 2), 'utf-8');

  return { csvPath, summaryPath };
}

// ============================================================================
// Exports
// ============================================================================

export {
  DEFAULT_PAGE_SIZE,
  DEFAULT_MULTISELECT_DELIMITER,
  CORE_COLUMNS,
  SKIP_ATTRIBUTE_IDS
};
