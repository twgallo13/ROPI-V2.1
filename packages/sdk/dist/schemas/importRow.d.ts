/**
 * Import Row Schema
 * Per AOSS Section 3.1 — Import Engine Row Schema
 * Version: aoss.v0.4.0
 *
 * This module provides the ImportRow type and validation for normalized CSV rows.
 * The schema is defined in /schemas/import-row.schema.json and exposed here with TypeScript types.
 */
import { z } from 'zod';
/**
 * JSON Schema for Import Row
 * Mirrors /schemas/import-row.schema.json
 */
export declare const importRowJsonSchema: {
    readonly $id: "https://ropi-aoss/schemas/import-row.schema.json";
    readonly $schema: "http://json-schema.org/draft-07/schema#";
    readonly title: "AOSS Import Row";
    readonly description: "Normalized representation of a single CSV row from the Import Engine. This schema represents an already-parsed row (after raw CSV → structured row, before full Product mapping).";
    readonly type: "object";
    readonly properties: {
        readonly source: {
            readonly type: "string";
            readonly enum: readonly ["SUPPLIER", "RETAILOPS_EXPORT", "MANUAL"];
            readonly description: "Origin of the import data";
        };
        readonly rowId: {
            readonly type: "string";
            readonly description: "Unique identifier for this row within the import batch";
            readonly minLength: 1;
        };
        readonly originalRowNumber: {
            readonly type: "integer";
            readonly description: "Line number in the original CSV file (1-indexed)";
            readonly minimum: 1;
        };
        readonly styleCode: {
            readonly type: "string";
            readonly description: "Product style code from supplier data";
            readonly minLength: 1;
        };
        readonly brand: {
            readonly type: "string";
            readonly description: "Brand name as provided by supplier";
            readonly minLength: 1;
        };
        readonly color: {
            readonly type: "string";
            readonly description: "Color description from supplier data";
            readonly minLength: 1;
        };
        readonly size: {
            readonly type: "string";
            readonly description: "Size value from supplier data";
            readonly minLength: 1;
        };
        readonly upc: {
            readonly type: "string";
            readonly description: "Universal Product Code (barcode)";
            readonly minLength: 1;
        };
        readonly raw: {
            readonly type: "object";
            readonly description: "Snapshot of the original supplier fields (column name → value)";
            readonly additionalProperties: true;
        };
        readonly normalizedGender: {
            readonly type: "string";
            readonly description: "Gender value normalized to AOSS standard (e.g., 'MEN', 'WOMEN', 'UNISEX')";
        };
        readonly normalizedCategory: {
            readonly type: "string";
            readonly description: "Category value normalized to AOSS standard (e.g., 'FOOTWEAR', 'APPAREL')";
        };
        readonly normalizedSizeScale: {
            readonly type: "string";
            readonly description: "Size scale normalized to AOSS standard (e.g., 'MENS_US', 'WOMENS_US')";
        };
        readonly notes: {
            readonly type: "string";
            readonly description: "Optional notes or comments about this import row";
        };
    };
    readonly required: readonly ["source", "rowId", "originalRowNumber", "styleCode", "brand", "color", "size", "upc", "raw"];
    readonly additionalProperties: false;
};
/**
 * Import source enum
 */
export type ImportSource = 'SUPPLIER' | 'RETAILOPS_EXPORT' | 'MANUAL';
/**
 * Raw supplier data
 * Snapshot of the original supplier fields (column name → value)
 */
export interface ImportRowRaw {
    [key: string]: unknown;
}
/**
 * Zod schema for ImportRowRaw
 */
export declare const ImportRowRawSchema: z.ZodRecord<z.ZodString, z.ZodUnknown>;
/**
 * Zod schema for ImportRow
 * Validates the normalized import row structure
 */
export declare const ImportRowSchema: z.ZodObject<{
    source: z.ZodEnum<["SUPPLIER", "RETAILOPS_EXPORT", "MANUAL"]>;
    rowId: z.ZodString;
    originalRowNumber: z.ZodNumber;
    styleCode: z.ZodString;
    brand: z.ZodString;
    color: z.ZodString;
    size: z.ZodString;
    upc: z.ZodString;
    raw: z.ZodRecord<z.ZodString, z.ZodUnknown>;
    normalizedGender: z.ZodOptional<z.ZodString>;
    normalizedCategory: z.ZodOptional<z.ZodString>;
    normalizedSizeScale: z.ZodOptional<z.ZodString>;
    notes: z.ZodOptional<z.ZodString>;
}, "strip", z.ZodTypeAny, {
    source?: "SUPPLIER" | "RETAILOPS_EXPORT" | "MANUAL";
    brand?: string;
    color?: string;
    size?: string;
    upc?: string;
    rowId?: string;
    originalRowNumber?: number;
    styleCode?: string;
    raw?: Record<string, unknown>;
    normalizedGender?: string;
    normalizedCategory?: string;
    normalizedSizeScale?: string;
    notes?: string;
}, {
    source?: "SUPPLIER" | "RETAILOPS_EXPORT" | "MANUAL";
    brand?: string;
    color?: string;
    size?: string;
    upc?: string;
    rowId?: string;
    originalRowNumber?: number;
    styleCode?: string;
    raw?: Record<string, unknown>;
    normalizedGender?: string;
    normalizedCategory?: string;
    normalizedSizeScale?: string;
    notes?: string;
}>;
/**
 * Import Row Interface
 * Normalized representation of a single CSV row from the Import Engine.
 *
 * This type is inferred from the Zod schema to ensure consistency.
 */
export type ImportRow = z.infer<typeof ImportRowSchema>;
/**
 * Validation result type
 */
export type ValidationResult<T> = {
    ok: true;
    value: T;
} | {
    ok: false;
    errors: string[];
};
/**
 * Validate an ImportRow object
 *
 * @param input - Unknown input to validate
 * @returns ValidationResult with either the validated import row or error messages
 *
 * @example
 * ```typescript
 * const result = validateImportRow(inputData);
 * if (result.ok) {
 *   console.log('Valid import row:', result.value);
 * } else {
 *   console.log('Validation errors:', result.errors);
 * }
 * ```
 */
export declare function validateImportRowSchema(input: unknown): ValidationResult<ImportRow>;
/**
 * Validate an ImportRow object (throws on failure)
 *
 * @param input - Unknown input to validate
 * @returns Validated ImportRow
 * @throws ZodError if validation fails
 */
export declare function validateImportRowSchemaOrThrow(input: unknown): ImportRow;
