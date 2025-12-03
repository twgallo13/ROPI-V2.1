/**
 * Import Engine Row Builder
 * Per AOSS Section 3.1 — Import Engine Row Schema
 * 
 * Creates complete Import Engine Row objects from CSV data.
 */

import { v4 as uuidv4 } from 'uuid';
import type {
  ImportEngineRow,
  ImportSourceColumns,
  ImportNormalizedFields,
  ImportValidation,
  ImportRowMeta,
  ColumnMapping,
} from '../schema/importEngine';
import {
  normalizeImportRow,
  deriveProductId,
  isEmptyRow,
  validateRequiredFields,
  DEFAULT_COLUMN_MAPPINGS,
} from '../normalization/importNormalizer';
import { validateImportRow } from '../validators/importValidator';

/**
 * Options for building import rows
 */
export interface BuildRowOptions {
  batchId: string;
  lineNumber: number;
  userId: string;
  mappings?: ColumnMapping[];
  skipEmpty?: boolean;
}

/**
 * Build a complete Import Engine Row from CSV source data
 * 
 * @param sourceColumns - Raw CSV columns
 * @param options - Build options
 * @returns Complete Import Engine Row or null if row should be skipped
 */
export function buildImportRow(
  sourceColumns: ImportSourceColumns,
  options: BuildRowOptions
): ImportEngineRow | null {
  const { batchId, lineNumber, userId, mappings = DEFAULT_COLUMN_MAPPINGS, skipEmpty = true } = options;
  
  // Skip empty rows if configured
  if (skipEmpty && isEmptyRow(sourceColumns)) {
    return null;
  }
  
  // Generate unique row ID
  const rowId = uuidv4();
  
  // Normalize the row
  const normalized: ImportNormalizedFields = normalizeImportRow(sourceColumns, mappings);
  
  // Validate normalized data
  let validation: ImportValidation = validateImportRow(normalized);
  
  // Check for missing required fields
  const missingFields = validateRequiredFields(normalized, mappings);
  if (missingFields.length > 0) {
    validation.errors.push({
      code: 'MISSING_REQUIRED_FIELD',
      severity: 'error',
      field: 'required_fields',
      message: `Missing required fields: ${missingFields.join(', ')}`,
    });
    validation.isValid = false;
  }
  
  // Derive product ID from SKU
  const productId = deriveProductId(normalized.sku);
  
  // Build metadata
  const meta: ImportRowMeta = {
    rowId,
    batchId,
    productId,
    importedAt: new Date().toISOString(),
    importedBy: userId,
    status: validation.isValid ? 'pending' : 'failed',
    errorMessage: validation.isValid ? undefined : validation.errors.map(e => e.message).join('; '),
  };
  
  // Build complete row
  const row: ImportEngineRow = {
    rowId,
    batchId,
    source: {
      columns: sourceColumns,
      lineNumber,
    },
    normalized,
    validation,
    meta,
  };
  
  return row;
}

/**
 * Build multiple import rows from CSV data
 * 
 * @param csvData - Array of CSV rows (each row is an object with column names as keys)
 * @param batchId - Import batch ID
 * @param userId - User ID who initiated import
 * @param mappings - Optional column mappings (defaults to DEFAULT_COLUMN_MAPPINGS)
 * @returns Array of Import Engine Rows (skipped rows are excluded)
 */
export function buildImportRows(
  csvData: Record<string, string | number | null>[],
  batchId: string,
  userId: string,
  mappings?: ColumnMapping[]
): ImportEngineRow[] {
  const rows: ImportEngineRow[] = [];
  
  for (let i = 0; i < csvData.length; i++) {
    const lineNumber = i + 2; // +2 because line 1 is header and array is 0-indexed
    const sourceColumns: ImportSourceColumns = csvData[i];
    
    const row = buildImportRow(sourceColumns, {
      batchId,
      lineNumber,
      userId,
      mappings,
      skipEmpty: true,
    });
    
    if (row) {
      rows.push(row);
    }
  }
  
  return rows;
}
