/**
 * Import Row Validator
 * Per AOSS Section 2.2 — Attribute Validation Schema
 *
 * Validates normalized import rows and generates validation issues.
 */
import type { ImportNormalizedFields, ImportValidation } from '../schema/importEngine';
/**
 * Validate a normalized import row
 *
 * @param normalized - Normalized fields to validate
 * @returns Validation results with errors and warnings
 */
export declare function validateImportRow(normalized: ImportNormalizedFields): ImportValidation;
/**
 * Check if validation allows row to be processed
 * (i.e., no critical errors)
 *
 * @param validation - Validation results
 * @returns True if row can be processed despite warnings
 */
export declare function canProcessRow(validation: ImportValidation): boolean;
