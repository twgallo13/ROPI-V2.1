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
 */
export declare const DEFAULT_COLUMN_MAPPINGS: ColumnMapping[];
/**
 * Normalize a single row from RetailOps CSV
 *
 * @param sourceColumns - Raw CSV columns
 * @param mappings - Column mapping configuration (defaults to DEFAULT_COLUMN_MAPPINGS)
 * @returns Normalized fields
 */
export declare function normalizeImportRow(sourceColumns: ImportSourceColumns, mappings?: ColumnMapping[]): ImportNormalizedFields;
/**
 * Derive product ID from SKU
 * Per AOSS Section 3.1 — SKU is the unique key for products
 *
 * @param sku - Product SKU
 * @returns Product ID for use in products/{productId}
 */
export declare function deriveProductId(sku: string | undefined): string | undefined;
/**
 * Check if a row is empty (all values null/undefined/empty string)
 *
 * @param sourceColumns - Raw CSV columns
 * @returns True if row is empty
 */
export declare function isEmptyRow(sourceColumns: ImportSourceColumns): boolean;
/**
 * Validate required fields are present after normalization
 *
 * @param normalized - Normalized fields
 * @param mappings - Column mappings (to check required fields)
 * @returns Array of missing required field names
 */
export declare function validateRequiredFields(normalized: ImportNormalizedFields, mappings?: ColumnMapping[]): string[];
//# sourceMappingURL=importNormalizer.d.ts.map