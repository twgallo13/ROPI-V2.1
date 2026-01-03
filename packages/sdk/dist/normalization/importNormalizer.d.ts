/**
 * Import Normalization Rules
 * Per AOSS Section 3.2 — Import Normalization Rules
 * LP-importer-mapping-recon-1.1.0: Canonicalize mappings to registry attribute IDs
 * LP-importer-mapping-recon-1.4.0: Add value canonicalization and multiSelect array typing
 *
 * Transforms raw RetailOps CSV data into normalized product fields.
 * Uses canonical Attribute Registry IDs for all targetField values.
 */
import type { ImportSourceColumns, ImportNormalizedFields, ColumnMapping } from '../schema/importEngine';
/**
 * LP-1.4.0: Apply canonicalization to a value using the corrections table
 * Performs case-insensitive lookup and returns the canonical value if found.
 *
 * @param value - The raw value to canonicalize
 * @param targetField - The attribute ID to look up corrections for
 * @returns Canonicalized value or original if no correction found
 */
export declare function canonicalizeValue(value: string, targetField: string): string;
/**
 * LP-1.4.0: Convert a value to an array for multiSelect fields
 * Splits strings by common delimiters (|, ,, ;) or wraps single values.
 *
 * @param value - The value to convert
 * @returns Array of values
 */
export declare function toMultiSelectArray(value: string | string[] | undefined): string[];
/**
 * LP-1.4.0: Check if a field should be stored as an array
 */
export declare function isMultiSelectField(targetField: string): boolean;
/**
 * Helper to normalize a targetField to its canonical registry attribute_id.
 * Accepts either canonical registry IDs or legacy camelCase keys and ensures
 * callers of the normalizer always get registry IDs.
 *
 * @param targetField - The field to normalize (legacy or registry format)
 * @returns Canonical registry attribute_id
 */
export declare function normalizeTargetFieldToRegistry(targetField: string): string;
/**
 * Helper to check if a CSV header matches a sourceColumn definition.
 * Supports both string and array sourceColumn formats (LP-1.1.0).
 *
 * @param sourceColumn - String or array of aliases to match
 * @param header - CSV header to check
 * @returns True if header matches any alias (case-insensitive)
 */
export declare function sourceColumnMatchesHeader(sourceColumn: string | string[], header: string): boolean;
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
export declare const DEFAULT_COLUMN_MAPPINGS: ColumnMapping[];
/**
 * Apply transformation to a value based on transform type
 * LP-1.4.6: Exported for unit testing; date transform tolerant of MM/DD/YY, M/D/YYYY, YYYY-MM-DD
 */
export declare function applyTransform(value: string | number | null | undefined, transform?: ColumnMapping['transform']): string | number | string[] | boolean | undefined;
/**
 * Normalize a single row from RetailOps CSV
 * LP-importer-mapping-recon-1.1.0: Use canonical registry IDs for all targetField values
 * LP-importer-mapping-recon-1.4.0: Apply value canonicalization and multiSelect array typing
 *
 * @param sourceColumns - Raw CSV columns
 * @param mappings - Column mapping configuration (defaults to DEFAULT_COLUMN_MAPPINGS)
 * @returns Normalized fields with canonical registry attribute IDs
 */
export declare function normalizeImportRow(sourceColumns: ImportSourceColumns, mappings?: ColumnMapping[]): ImportNormalizedFields;
/**
 * Derive product ID from MPN (preferred) or SKU (fallback)
 * LP-2.1.0: MPN-first — prefer MPN for productId derivation
 * Per Product Schema / Attribute Registry — MPN is canonical
 *
 * @param options - Object containing mpn and/or sku
 * @returns Product ID for use in products/{productId}
 */
export declare function deriveProductId({ mpn, sku }: {
    mpn?: string;
    sku?: string;
}): string | undefined;
/**
 * Check if a row is empty (all values null/undefined/empty string)
 *
 * @param sourceColumns - Raw CSV columns
 * @returns True if row is empty
 */
export declare function isEmptyRow(sourceColumns: ImportSourceColumns): boolean;
/**
 * Validate required fields are present after normalization
 * LP-importer-mapping-recon-1.1.0: Use canonical registry IDs
 *
 * @param normalized - Normalized fields
 * @param mappings - Column mappings (to check required fields)
 * @returns Array of missing required field names (deduplicated, canonical registry IDs)
 */
export declare function validateRequiredFields(normalized: ImportNormalizedFields, mappings?: ColumnMapping[]): string[];
