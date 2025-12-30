"use strict";
/**
 * Import Row Schema
 * Per AOSS Section 3.1 — Import Engine Row Schema
 * Version: aoss.v0.4.0
 *
 * This module provides the ImportRow type and validation for normalized CSV rows.
 * The schema is defined in /schemas/import-row.schema.json and exposed here with TypeScript types.
 */
Object.defineProperty(exports, "__esModule", { value: true });
exports.ImportRowSchema = exports.ImportRowRawSchema = exports.importRowJsonSchema = void 0;
exports.validateImportRowSchema = validateImportRowSchema;
exports.validateImportRowSchemaOrThrow = validateImportRowSchemaOrThrow;
const zod_1 = require("zod");
/**
 * JSON Schema for Import Row
 * Mirrors /schemas/import-row.schema.json
 */
exports.importRowJsonSchema = {
    "$id": "https://ropi-aoss/schemas/import-row.schema.json",
    "$schema": "http://json-schema.org/draft-07/schema#",
    "title": "AOSS Import Row",
    "description": "Normalized representation of a single CSV row from the Import Engine. This schema represents an already-parsed row (after raw CSV → structured row, before full Product mapping).",
    "type": "object",
    "properties": {
        "source": { "type": "string", "enum": ["SUPPLIER", "RETAILOPS_EXPORT", "MANUAL"], "description": "Origin of the import data" },
        "rowId": { "type": "string", "description": "Unique identifier for this row within the import batch", "minLength": 1 },
        "originalRowNumber": { "type": "integer", "description": "Line number in the original CSV file (1-indexed)", "minimum": 1 },
        "styleCode": { "type": "string", "description": "Product style code from supplier data", "minLength": 1 },
        "brand": { "type": "string", "description": "Brand name as provided by supplier", "minLength": 1 },
        "color": { "type": "string", "description": "Color description from supplier data", "minLength": 1 },
        "size": { "type": "string", "description": "Size value from supplier data", "minLength": 1 },
        "upc": { "type": "string", "description": "Universal Product Code (barcode)", "minLength": 1 },
        "raw": { "type": "object", "description": "Snapshot of the original supplier fields (column name → value)", "additionalProperties": true },
        "normalizedGender": { "type": "string", "description": "Gender value normalized to AOSS standard (e.g., 'MEN', 'WOMEN', 'UNISEX')" },
        "normalizedCategory": { "type": "string", "description": "Category value normalized to AOSS standard (e.g., 'FOOTWEAR', 'APPAREL')" },
        "normalizedSizeScale": { "type": "string", "description": "Size scale normalized to AOSS standard (e.g., 'MENS_US', 'WOMENS_US')" },
        "notes": { "type": "string", "description": "Optional notes or comments about this import row" }
    },
    "required": ["source", "rowId", "originalRowNumber", "styleCode", "brand", "color", "size", "upc", "raw"],
    "additionalProperties": false
};
// ============================================================================
// Zod Schemas for Runtime Validation
// ============================================================================
/**
 * Zod schema for ImportRowRaw
 */
exports.ImportRowRawSchema = zod_1.z.record(zod_1.z.string(), zod_1.z.unknown());
/**
 * Zod schema for ImportRow
 * Validates the normalized import row structure
 */
exports.ImportRowSchema = zod_1.z.object({
    source: zod_1.z.enum(['SUPPLIER', 'RETAILOPS_EXPORT', 'MANUAL']),
    rowId: zod_1.z.string().min(1, 'Row ID is required'),
    originalRowNumber: zod_1.z.number().int().min(1, 'Original row number must be a positive integer'),
    styleCode: zod_1.z.string().min(1, 'Style code is required'),
    brand: zod_1.z.string().min(1, 'Brand is required'),
    color: zod_1.z.string().min(1, 'Color is required'),
    size: zod_1.z.string().min(1, 'Size is required'),
    upc: zod_1.z.string().min(1, 'UPC is required'),
    raw: exports.ImportRowRawSchema,
    normalizedGender: zod_1.z.string().optional(),
    normalizedCategory: zod_1.z.string().optional(),
    normalizedSizeScale: zod_1.z.string().optional(),
    notes: zod_1.z.string().optional(),
});
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
function validateImportRowSchema(input) {
    const result = exports.ImportRowSchema.safeParse(input);
    if (result.success) {
        return { ok: true, value: result.data };
    }
    const errors = result.error.issues.map((issue) => {
        const path = issue.path.join('.');
        return path ? `${path}: ${issue.message}` : issue.message;
    });
    return { ok: false, errors };
}
/**
 * Validate an ImportRow object (throws on failure)
 *
 * @param input - Unknown input to validate
 * @returns Validated ImportRow
 * @throws ZodError if validation fails
 */
function validateImportRowSchemaOrThrow(input) {
    return exports.ImportRowSchema.parse(input);
}
//# sourceMappingURL=importRow.js.map