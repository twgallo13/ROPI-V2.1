"use strict";
/**
 * Import Engine Row Builder
 * Per AOSS Section 3.1 — Import Engine Row Schema
 *
 * Creates complete Import Engine Row objects from CSV data.
 */
Object.defineProperty(exports, "__esModule", { value: true });
exports.buildImportRow = buildImportRow;
exports.buildImportRows = buildImportRows;
const uuid_1 = require("uuid");
const importNormalizer_1 = require("../normalization/importNormalizer");
const importValidator_1 = require("../validators/importValidator");
/**
 * Build a complete Import Engine Row from CSV source data
 *
 * @param sourceColumns - Raw CSV columns
 * @param options - Build options
 * @returns Complete Import Engine Row or null if row should be skipped
 */
function buildImportRow(sourceColumns, options) {
    const { batchId, lineNumber, userId, mappings = importNormalizer_1.DEFAULT_COLUMN_MAPPINGS, skipEmpty = true } = options;
    // Skip empty rows if configured
    if (skipEmpty && (0, importNormalizer_1.isEmptyRow)(sourceColumns)) {
        return null;
    }
    // Generate unique row ID
    const rowId = (0, uuid_1.v4)();
    // Normalize the row
    const normalized = (0, importNormalizer_1.normalizeImportRow)(sourceColumns, mappings);
    // Validate normalized data
    let validation = (0, importValidator_1.validateImportRow)(normalized);
    // Check for missing required fields
    const missingFields = (0, importNormalizer_1.validateRequiredFields)(normalized, mappings);
    if (missingFields.length > 0) {
        validation.errors.push({
            code: 'MISSING_REQUIRED_FIELD',
            severity: 'error',
            field: 'required_fields',
            message: `Missing required fields: ${missingFields.join(', ')}`,
        });
        validation.isValid = false;
    }
    // Derive product ID from MPN (preferred) or SKU (fallback) — LP-2.1.0
    const productId = (0, importNormalizer_1.deriveProductId)({ mpn: normalized.mpn, sku: normalized.sku });
    // Build metadata
    // LP-3.0.6: Only include errorMessage when there are errors (Firestore rejects undefined)
    const meta = {
        rowId,
        batchId,
        productId,
        importedAt: new Date().toISOString(),
        importedBy: userId,
        status: validation.isValid ? 'pending' : 'failed',
        ...(validation.isValid ? {} : { errorMessage: validation.errors.map(e => e.message).join('; ') }),
    };
    // Build complete row
    const row = {
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
 * LP-1.3.3: Convert client mappings object to ColumnMapping array
 * Client sends { csvHeader: attributeId } object; we convert to ColumnMapping[] format
 */
function convertClientMappings(clientMappings) {
    return Object.entries(clientMappings).map(([sourceColumn, targetField]) => ({
        sourceColumn,
        targetField,
        transform: 'trim',
    }));
}
/**
 * Build multiple import rows from CSV data
 *
 * @param csvData - Array of CSV rows (each row is an object with column names as keys)
 * @param batchId - Import batch ID
 * @param userId - User ID who initiated import
 * @param mappingsOrClientMappings - Optional column mappings: either ColumnMapping[] or client Record<string,string>
 * @returns Array of Import Engine Rows (skipped rows are excluded)
 *
 * LP-1.3.3: Now accepts client mappings as Record<string, string> (csvHeader → attributeId)
 * and converts them to ColumnMapping[] format for normalization.
 */
function buildImportRows(csvData, batchId, userId, mappingsOrClientMappings) {
    const rows = [];
    // LP-1.3.3: Determine mappings format and convert if necessary
    let mappings;
    if (mappingsOrClientMappings) {
        if (Array.isArray(mappingsOrClientMappings)) {
            // Already in ColumnMapping[] format
            mappings = mappingsOrClientMappings;
        }
        else if (typeof mappingsOrClientMappings === 'object' && Object.keys(mappingsOrClientMappings).length > 0) {
            // Client format Record<string, string> — convert to ColumnMapping[]
            mappings = convertClientMappings(mappingsOrClientMappings);
        }
    }
    for (let i = 0; i < csvData.length; i++) {
        const lineNumber = i + 2; // +2 because line 1 is header and array is 0-indexed
        const sourceColumns = csvData[i];
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
//# sourceMappingURL=importRowBuilder.js.map