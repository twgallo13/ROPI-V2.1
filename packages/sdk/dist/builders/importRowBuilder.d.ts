/**
 * Import Engine Row Builder
 * Per AOSS Section 3.1 — Import Engine Row Schema
 *
 * Creates complete Import Engine Row objects from CSV data.
 */
import type { ImportEngineRow, ImportSourceColumns, ColumnMapping } from '../schema/importEngine';
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
export declare function buildImportRow(sourceColumns: ImportSourceColumns, options: BuildRowOptions): ImportEngineRow | null;
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
export declare function buildImportRows(csvData: Record<string, string | number | null>[], batchId: string, userId: string, mappingsOrClientMappings?: ColumnMapping[] | Record<string, string>): ImportEngineRow[];
