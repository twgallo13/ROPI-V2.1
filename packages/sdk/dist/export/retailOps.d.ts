/**
 * RetailOps Export Module
 * Per AOSS Section 4.1 — RetailOps Export Mapping
 * Version: aoss.v0.5.0
 *
 * This module transforms CoreProduct objects into RetailOps-compatible CSV format.
 * Column names and order are sourced from the RetailOps CSV Field Mapping Notion spec.
 */
import type { CoreProduct } from '../schemas/coreProduct';
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
export declare const retailOpsExportMapping: RetailOpsExportMappingConfig;
/**
 * Get the ordered list of column names for the CSV header
 */
export declare function getRetailOpsHeaderRow(): string[];
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
export declare function buildRetailOpsRow(product: CoreProduct): RetailOpsRow;
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
export declare function buildRetailOpsCsv(products: CoreProduct[]): string;
/**
 * Get column names only (convenience export)
 */
export declare const RETAILOPS_COLUMN_NAMES: string[];
/**
 * Expected header row as a string (for testing)
 */
export declare const RETAILOPS_HEADER_ROW: string;
