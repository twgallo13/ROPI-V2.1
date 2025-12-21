/**
 * Import Engine Schema Types
 * Per AOSS Section 3.1 — Import Engine Row Schema
 * 
 * Defines the canonical structure for import rows from RetailOps CSV,
 * including source data, normalized fields, validation results, and metadata.
 */

/**
 * Validation error/warning codes per Section 2.2
 */
export type ValidationCode =
  | 'MISSING_REQUIRED_FIELD'
  | 'INVALID_FORMAT'
  | 'INVALID_VALUE'
  | 'OUT_OF_RANGE'
  | 'DUPLICATE_SKU'
  | 'INVALID_DATE'
  | 'INVALID_PRICE'
  | 'INVALID_QUANTITY'
  | 'UNMAPPED_FIELD'
  | 'NORMALIZATION_FAILED';

/**
 * Validation issue (error or warning)
 */
export interface ValidationIssue {
  code: ValidationCode;
  severity: 'error' | 'warning';
  field: string;
  message: string;
  value?: string;
}

/**
 * Source CSV columns (raw data from RetailOps)
 * Keys are column names from the CSV header
 */
export interface ImportSourceColumns {
  [columnName: string]: string | number | null;
}

/**
 * Normalized product fields mapped from source columns
 * Per AOSS Section 3.2 — Import Normalization Rules
 * LP-2.1.0: MPN is the canonical product identifier
 */
export interface ImportNormalizedFields {
  // Core fields — MPN is primary identifier (LP-2.1.0)
  mpn?: string;
  sku?: string;
  title?: string;
  brand?: string;
  description?: string;
  
  // Attributes
  department?: string;
  class?: string;
  category?: string;
  subcategory?: string;
  gender?: string;
  ageGroup?: string;
  color?: string;
  size?: string;
  material?: string;
  
  // Pricing
  msrp?: number;
  cost?: number;
  retailPrice?: number;
  currency?: string;
  
  // Inventory
  quantity?: number;
  warehouse?: string;
  location?: string;
  
  // Dates
  firstReceived?: string; // ISO date
  launchDate?: string; // ISO date
  
  // Media
  images?: string[];
  primaryImage?: string;
  
  // Additional dynamic fields
  [key: string]: string | number | string[] | undefined;
}

/**
 * Validation results for an import row
 */
export interface ImportValidation {
  isValid: boolean;
  errors: ValidationIssue[];
  warnings: ValidationIssue[];
}

/**
 * Metadata for import row tracking
 */
export interface ImportRowMeta {
  rowId: string; // Unique identifier for this row
  batchId: string; // Import batch identifier
  productId?: string; // Derived from SKU, used for products/{productId}
  importedAt: string; // ISO timestamp
  importedBy: string; // User ID who initiated import
  status: 'pending' | 'processed' | 'failed';
  errorMessage?: string; // If status is 'failed'
  importOutcome?: 'created' | 'updated' | 'skipped_validation_error'; // Result of commit process
}

/**
 * Complete Import Engine Row
 * Per AOSS Section 3.1 — Import Engine Row Schema
 * 
 * Represents a single row from the RetailOps CSV with:
 * - source: Raw CSV columns
 * - normalized: Mapped and normalized fields
 * - validation: Validation results
 * - meta: Tracking metadata
 */
export interface ImportEngineRow {
  rowId: string;
  batchId: string;
  source: {
    columns: ImportSourceColumns;
    lineNumber: number; // Line number in original CSV
  };
  normalized: ImportNormalizedFields;
  validation: ImportValidation;
  meta: ImportRowMeta;
}

/**
 * Import batch metadata
 * Stored in import_batches/{batchId}
 */
export interface ImportBatch {
  batchId: string;
  fileName: string;
  createdAt: string; // ISO timestamp
  createdBy: string; // User ID
  rowCount: number;
  status: 'pending' | 'processed' | 'failed';
  notes?: string;
  processedAt?: string; // ISO timestamp
  errorCount?: number;
  warningCount?: number;
  // Commit process counters (set by processImportBatch)
  createdCount?: number; // Products created
  updatedCount?: number; // Products updated
  blockedCount?: number; // Rows blocked by validation
  processedBy?: string; // User ID who processed/committed the batch
}

/**
 * CSV column mapping configuration
 * Maps RetailOps CSV columns to normalized field names
 */
export interface ColumnMapping {
  sourceColumn: string; // CSV column name
  targetField: string; // Normalized field name
  transform?: 'trim' | 'uppercase' | 'lowercase' | 'number' | 'date' | 'array';
  required?: boolean;
  defaultValue?: string | number;
}

/**
 * Import configuration
 */
export interface ImportConfig {
  mappings: ColumnMapping[];
  skipEmptyRows?: boolean;
  strictMode?: boolean; // Fail on any validation error
}
