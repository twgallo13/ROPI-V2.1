/**
 * RetailOps Import Module
 * Per AOSS Section 3.3 — RetailOps Import Path
 * Version: aoss.v0.6.0
 *
 * This module parses RetailOps CSV exports and transforms them into ImportRow and CoreProduct objects.
 * It handles the actual RetailOps export format with flexible column mapping.
 *
 * Data flow:
 *   RetailOps CSV → ParsedRetailOpsRow[] → ImportRow[] → CoreProduct[]
 */
import type { ImportRow } from '../schemas/importRow';
import type { CoreProduct } from '../schemas/coreProduct';
/**
 * Options for parsing RetailOps CSV
 */
export interface RetailOpsCsvParseOptions {
    /** Field delimiter (default: ",") */
    delimiter?: string;
    /** Whether the first row is a header row (default: true) */
    hasHeaderRow?: boolean;
    /** Whether to trim whitespace from field values (default: true) */
    trimFields?: boolean;
    /** Whether to skip empty rows (default: true) */
    skipEmptyRows?: boolean;
}
/**
 * A parsed row from a RetailOps CSV file
 * Contains the raw column values indexed by header name
 */
export interface ParsedRetailOpsRow {
    /** Raw column values keyed by header name */
    raw: Record<string, string>;
    /** 1-based row number in the original CSV (excluding header) */
    rowNumber: number;
}
/**
 * Result of importing a CSV with potential errors
 */
export interface RetailOpsImportResult {
    /** Successfully parsed products */
    products: CoreProduct[];
    /** Rows that were skipped with reasons */
    skipped: Array<{
        rowNumber: number;
        reason: string;
        raw: Record<string, string>;
    }>;
    /** Total rows processed */
    totalRows: number;
}
/**
 * Parse a RetailOps CSV string into an array of ParsedRetailOpsRow objects
 *
 * @param csv - The raw CSV string
 * @param options - Parsing options
 * @returns Array of parsed rows with raw column values
 *
 * @example
 * ```typescript
 * const csv = `SKU,Brand,Color\nNK-001,Nike,Black\nNK-002,Nike,White`;
 * const rows = parseRetailOpsCsv(csv);
 * // rows[0].raw = { SKU: 'NK-001', Brand: 'Nike', Color: 'Black' }
 * ```
 */
export declare function parseRetailOpsCsv(csv: string, options?: RetailOpsCsvParseOptions): ParsedRetailOpsRow[];
/**
 * Convert a ParsedRetailOpsRow into an ImportRow
 *
 * @param parsed - The parsed CSV row
 * @returns An ImportRow suitable for further processing
 *
 * @example
 * ```typescript
 * const parsed = { raw: { SKU: 'NK-001', Brand: 'Nike' }, rowNumber: 1 };
 * const importRow = retailOpsRowToImportRow(parsed);
 * // importRow.source = 'RETAILOPS_EXPORT'
 * // importRow.styleCode = 'NK-001'
 * ```
 */
export declare function retailOpsRowToImportRow(parsed: ParsedRetailOpsRow): ImportRow;
/**
 * Convert an ImportRow into a CoreProduct (Nike men's footwear MVP)
 *
 * @param row - The ImportRow to convert
 * @returns A CoreProduct object
 * @throws Error if the brand is not NIKE or JORDAN (MVP constraint)
 *
 * @example
 * ```typescript
 * const importRow: ImportRow = { ... };
 * const product = importRowToCoreProduct(importRow);
 * // product.brand = 'NIKE'
 * // product.gender = 'MEN'
 * ```
 */
export declare function importRowToCoreProduct(row: ImportRow): CoreProduct;
/**
 * Parse a RetailOps CSV and convert all rows to CoreProduct objects
 *
 * This is the main entry point for importing RetailOps data.
 * It handles parsing, mapping, and filtering in one call.
 *
 * @param csv - The raw CSV string
 * @param options - Parsing options
 * @returns Array of CoreProduct objects (only NIKE/JORDAN products for MVP)
 *
 * @example
 * ```typescript
 * const csv = fs.readFileSync('retailops-export.csv', 'utf-8');
 * const products = retailOpsCsvToCoreProducts(csv);
 * console.log(`Imported ${products.length} Nike/Jordan products`);
 * ```
 */
export declare function retailOpsCsvToCoreProducts(csv: string, options?: RetailOpsCsvParseOptions): CoreProduct[];
/**
 * Parse a RetailOps CSV and return detailed results including skipped rows
 *
 * @param csv - The raw CSV string
 * @param options - Parsing options
 * @returns Import result with products, skipped rows, and statistics
 */
export declare function retailOpsCsvToCoreProductsWithDetails(csv: string, options?: RetailOpsCsvParseOptions): RetailOpsImportResult;
/**
 * Convert an array of ParsedRetailOpsRow to ImportRow array
 * Useful for intermediate processing or debugging
 */
export declare function parsedRowsToImportRows(parsed: ParsedRetailOpsRow[]): ImportRow[];
/**
 * Convert an array of ImportRow to CoreProduct array
 * Filters out rows that fail validation (non-Nike/Jordan brands)
 */
export declare function importRowsToCoreProducts(rows: ImportRow[]): CoreProduct[];
//# sourceMappingURL=retailOps.d.ts.map