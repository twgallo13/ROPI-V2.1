/**
 * Import Service
 * Per AOSS Section 3.1 — Import Engine
 * 
 * LP-2.1.1: MPN-first validation — requires MPN, validates attributes against registry
 * LP-2.1.8: Server-side import validation — validate CSV rows against registry
 * 
 * Handles CSV import, normalization, validation, and Firestore storage.
 */

import * as admin from 'firebase-admin';
import { v4 as uuidv4 } from 'uuid';
import Papa from 'papaparse';
import * as fs from 'fs';
import * as path from 'path';
import {
  buildImportRows,
  type ImportEngineRow,
  type ImportBatch,
  type ImportSourceColumns,
  type ValidationIssue,
} from '@ropi-aoss/sdk';
import { getAttribute } from './attributesService';
import {
  validateBatch,
  clearRegistryCache,
  type BatchValidationResult,
  type RowValidationResult as ValidatorRowResult,
} from './attributeValidator';

/**
 * LP-2.1.8: Re-export validator types
 */
export { BatchValidationResult, ValidatorRowResult };

/**
 * LP-2.1.1: Import validation options
 * LP-1.3.3: Added mappings for client-provided column mappings
 */
export interface ImportValidationOptions {
  /** If true, only validate - don't persist to Firestore */
  dryRun?: boolean;
  /** If true, fail the entire batch on any blocking error */
  strictMode?: boolean;
  /** LP-1.3.3: Client-provided column mappings (csvHeader → attributeId) */
  mappings?: Record<string, string>;
}

/**
 * LP-2.1.1: Validation result for a single row
 */
export interface RowValidationResult {
  lineNumber: number;
  rowId: string;
  isValid: boolean;
  blockingErrors: ValidationIssue[];
  warnings: ValidationIssue[];
  unmappedAttributes: string[];
}

/**
 * LP-2.1.1: Import validation result
 */
export interface ImportValidationResult {
  totalRows: number;
  validRows: number;
  invalidRows: number;
  rowResults: RowValidationResult[];
  hasBlockingErrors: boolean;
}

/**
 * Parse CSV content
 * 
 * @param csvContent - CSV file content as string
 * @returns Parsed rows as array of objects
 */
export function parseCSV(csvContent: string): ImportSourceColumns[] {
  const result = Papa.parse<ImportSourceColumns>(csvContent, {
    header: true,
    skipEmptyLines: true,
    dynamicTyping: false, // LP-0.2.1: Keep all values as strings to preserve MPN/SKU identifiers
    transformHeader: (header: string) => header.trim(),
  });
  
  if (result.errors.length > 0) {
    throw new Error(`CSV parsing failed: ${result.errors.map(e => e.message).join('; ')}`);
  }
  
  return result.data;
}

/**
 * Create import batch in Firestore
 * 
 * @param batch - Import batch data
 * @returns Created batch document
 */
export async function createImportBatch(batch: ImportBatch): Promise<ImportBatch> {
  const db = admin.firestore();
  const batchRef = db.collection('import_batches').doc(batch.batchId);
  
  await batchRef.set(batch);
  
  return batch;
}

/**
 * Save import rows to Firestore subcollection
 * 
 * @param batchId - Batch ID
 * @param rows - Import engine rows
 */
export async function saveImportRows(
  batchId: string,
  rows: ImportEngineRow[]
): Promise<void> {
  const db = admin.firestore();
  const batch = db.batch();
  
  // Use Firestore batched writes for efficiency
  for (const row of rows) {
    const rowRef = db
      .collection('import_batches')
      .doc(batchId)
      .collection('rows')
      .doc(row.rowId);
    
    batch.set(rowRef, row);
  }
  
  await batch.commit();
}

/**
 * Update import batch status
 * 
 * @param batchId - Batch ID
 * @param status - New status
 * @param updates - Additional fields to update
 */
export async function updateBatchStatus(
  batchId: string,
  status: ImportBatch['status'],
  updates?: Partial<ImportBatch>
): Promise<void> {
  const db = admin.firestore();
  const batchRef = db.collection('import_batches').doc(batchId);
  
  await batchRef.update({
    status,
    processedAt: new Date().toISOString(),
    ...updates,
  });
}

/**
 * Calculate error and warning counts from rows
 * 
 * @param rows - Import engine rows
 * @returns Error and warning counts
 */
export function calculateRowStats(rows: ImportEngineRow[]): {
  errorCount: number;
  warningCount: number;
} {
  let errorCount = 0;
  let warningCount = 0;
  
  for (const row of rows) {
    errorCount += row.validation.errors.length;
    warningCount += row.validation.warnings.length;
  }
  
  return { errorCount, warningCount };
}

/**
 * LP-2.1.1: Validate that MPN is present in normalized row
 * Returns blocking error if MPN is missing
 */
function validateMPNRequired(row: ImportEngineRow): ValidationIssue | null {
  if (!row.normalized.mpn) {
    return {
      code: 'MISSING_REQUIRED_FIELD',
      severity: 'error',
      field: 'mpn',
      message: 'MPN (Manufacturer Part Number) is required for import',
    };
  }
  return null;
}

/**
 * LP-2.1.1: Validate attribute value against registry settings
 * Checks data_type compliance and allowed_values for enum/multiSelect
 */
async function validateAttributeValue(
  attributeId: string,
  value: unknown
): Promise<{ error?: ValidationIssue; warning?: ValidationIssue; unmapped?: boolean }> {
  try {
    const attributeDef = await getAttribute(attributeId);
    
    // Check data_type compliance
    const dataType = attributeDef.data_type;
    const actualType = typeof value;
    
    // Type checking based on data_type
    if (dataType === 'number' && actualType !== 'number' && value !== undefined) {
      return {
        warning: {
          code: 'INVALID_VALUE',
          severity: 'warning',
          field: attributeId,
          message: `Expected number for ${attributeId}, got ${actualType}`,
          value: String(value),
        },
      };
    }
    
    // Check enum/multiSelect allowed_values
    if ((dataType === 'enum' || dataType === 'multiSelect') && attributeDef.allowed_values) {
      const allowedValues = attributeDef.allowed_values;
      
      if (dataType === 'enum' && typeof value === 'string') {
        if (!allowedValues.includes(value)) {
          return {
            warning: {
              code: 'INVALID_VALUE',
              severity: 'warning',
              field: attributeId,
              message: `Value '${value}' not in allowed values for ${attributeId}`,
              value: String(value),
            },
            unmapped: true,
          };
        }
      }
      
      if (dataType === 'multiSelect' && Array.isArray(value)) {
        const invalidValues = value.filter(v => !allowedValues.includes(v));
        if (invalidValues.length > 0) {
          return {
            warning: {
              code: 'INVALID_VALUE',
              severity: 'warning',
              field: attributeId,
              message: `Values '${invalidValues.join(', ')}' not in allowed values for ${attributeId}`,
              value: invalidValues.join(', '),
            },
            unmapped: true,
          };
        }
      }
    }
    
    return {};
  } catch (error) {
    // Attribute not found in registry - this is not a blocking error
    // but we should log it as unmapped
    return { unmapped: true };
  }
}

/**
 * LP-2.1.1: Validate import rows against attribute registry
 * 
 * @param rows - Import engine rows to validate
 * @returns Validation result with row-level errors/warnings
 */
export async function validateImportRows(
  rows: ImportEngineRow[]
): Promise<ImportValidationResult> {
  const rowResults: RowValidationResult[] = [];
  let validRows = 0;
  let invalidRows = 0;
  let hasBlockingErrors = false;
  
  for (const row of rows) {
    const blockingErrors: ValidationIssue[] = [];
    const warnings: ValidationIssue[] = [...row.validation.warnings];
    const unmappedAttributes: string[] = [];
    
    // Copy existing errors from SDK validation
    blockingErrors.push(...row.validation.errors);
    
    // LP-2.1.1: Require MPN
    const mpnError = validateMPNRequired(row);
    if (mpnError) {
      blockingErrors.push(mpnError);
    }
    
    // Validate each normalized attribute against registry
    const attributeKeys = Object.keys(row.normalized).filter(
      key => !['mpn', 'sku', 'title', 'brand', 'description'].includes(key)
    );
    
    for (const attrKey of attributeKeys) {
      const value = row.normalized[attrKey];
      if (value !== undefined && value !== null && value !== '') {
        const result = await validateAttributeValue(attrKey, value);
        if (result.error) {
          blockingErrors.push(result.error);
        }
        if (result.warning) {
          warnings.push(result.warning);
        }
        if (result.unmapped) {
          unmappedAttributes.push(attrKey);
        }
      }
    }
    
    const isValid = blockingErrors.length === 0;
    if (isValid) {
      validRows++;
    } else {
      invalidRows++;
      hasBlockingErrors = true;
    }
    
    rowResults.push({
      lineNumber: row.source.lineNumber,
      rowId: row.rowId,
      isValid,
      blockingErrors,
      warnings,
      unmappedAttributes,
    });
  }
  
  return {
    totalRows: rows.length,
    validRows,
    invalidRows,
    rowResults,
    hasBlockingErrors,
  };
}

/**
 * LP-2.1.8: Validate CSV import against attribute registry
 * 
 * Validates rows before any Firestore writes.
 * Produces per-row diagnostics with normalized values.
 * 
 * @param csvContent - CSV file content
 * @param options - Validation options
 * @returns Validation result with row diagnostics
 */
export async function validateCSVImport(
  csvContent: string,
  options: { saveReport?: boolean; reportDir?: string } = {}
): Promise<BatchValidationResult> {
  // Parse CSV
  const csvData = parseCSV(csvContent);
  
  // Validate against registry
  const validationResult = await validateBatch(csvData as Record<string, unknown>[]);
  
  // Save report if requested
  if (options.saveReport) {
    const dateStr = new Date().toISOString().split('T')[0];
    const reportDir = options.reportDir || 
      path.resolve(__dirname, `../../../../reports/attribute-inspections/${dateStr}`);
    
    fs.mkdirSync(reportDir, { recursive: true });
    
    const reportPath = path.join(reportDir, 'import-validation-diagnostics.json');
    fs.writeFileSync(reportPath, JSON.stringify(validationResult, null, 2));
    console.log(`📄 Validation diagnostics written to: ${reportPath}`);
  }
  
  return validationResult;
}

/**
 * Process CSV import
 * Main service method that orchestrates the entire import flow
 * 
 * LP-2.1.1: Added validation layer and dry-run support
 * 
 * @param csvContent - CSV file content
 * @param fileName - Original file name
 * @param userId - User ID who initiated import
 * @param options - Validation options (dryRun, strictMode, mappings)
 * @returns Import batch with summary
 */
export async function processCSVImport(
  csvContent: string,
  fileName: string,
  userId: string,
  options: ImportValidationOptions = {}
): Promise<{
  batch: ImportBatch;
  rowCount: number;
  errorCount: number;
  warningCount: number;
  validationResult?: ImportValidationResult;
}> {
  const { dryRun = false, strictMode = false, mappings: clientMappings } = options;
  
  // Generate batch ID
  const batchId = uuidv4();
  
  try {
    // Parse CSV
    const csvData = parseCSV(csvContent);
    
    // LP-1.3.3: Build import rows with client mappings if provided
    // buildImportRows accepts optional mappings parameter
    const rows = buildImportRows(csvData, batchId, userId, clientMappings);
    
    // LP-2.1.1: Run validation layer (MPN required, attribute registry checks)
    const validationResult = await validateImportRows(rows);
    
    // Calculate stats (includes validation errors)
    let errorCount = 0;
    let warningCount = 0;
    for (const rowResult of validationResult.rowResults) {
      errorCount += rowResult.blockingErrors.length;
      warningCount += rowResult.warnings.length;
    }
    
    // Create batch record
    const batch: ImportBatch = {
      batchId,
      fileName,
      createdAt: new Date().toISOString(),
      createdBy: userId,
      rowCount: rows.length,
      status: 'pending',
      errorCount,
      warningCount,
    };
    
    // LP-2.1.1: If dry-run, return validation results without persisting
    if (dryRun) {
      return {
        batch: { ...batch, status: 'pending', notes: 'DRY RUN - no data persisted' },
        rowCount: rows.length,
        errorCount,
        warningCount,
        validationResult,
      };
    }
    
    // LP-2.1.1: If strict mode and blocking errors, fail the batch
    if (strictMode && validationResult.hasBlockingErrors) {
      const failedBatch: ImportBatch = {
        ...batch,
        status: 'failed',
        notes: `Import blocked: ${validationResult.invalidRows} row(s) with blocking errors (missing MPN or invalid attributes)`,
      };
      
      // Save failed batch record for audit trail
      await createImportBatch(failedBatch);
      
      return {
        batch: failedBatch,
        rowCount: rows.length,
        errorCount,
        warningCount,
        validationResult,
      };
    }
    
    // Save batch to Firestore
    await createImportBatch(batch);
    
    // Save rows to Firestore (batched writes)
    if (rows.length > 0) {
      // Firestore batch write limit is 500, so chunk if needed
      const chunkSize = 500;
      for (let i = 0; i < rows.length; i += chunkSize) {
        const chunk = rows.slice(i, i + chunkSize);
        await saveImportRows(batchId, chunk);
      }
    }
    
    // Update batch status to processed
    await updateBatchStatus(batchId, 'processed', {
      errorCount,
      warningCount,
    });
    
    return {
      batch: { ...batch, status: 'processed', errorCount, warningCount },
      rowCount: rows.length,
      errorCount,
      warningCount,
      validationResult,
    };
  } catch (error) {
    // Update batch status to failed
    const errorMessage = error instanceof Error ? error.message : 'Unknown error';
    
    // Only update if not dry-run (batch might not exist)
    if (!dryRun) {
      try {
        await updateBatchStatus(batchId, 'failed', {
          notes: errorMessage,
        });
      } catch {
        // Ignore update error if batch doesn't exist yet
      }
    }
    
    throw error;
  }
}

/**
 * Get import batch by ID
 * 
 * @param batchId - Batch ID
 * @returns Import batch or null if not found
 */
export async function getImportBatch(batchId: string): Promise<ImportBatch | null> {
  const db = admin.firestore();
  const batchDoc = await db.collection('import_batches').doc(batchId).get();
  
  if (!batchDoc.exists) {
    return null;
  }
  
  return batchDoc.data() as ImportBatch;
}

/**
 * Get import rows for a batch
 * 
 * @param batchId - Batch ID
 * @param limit - Maximum number of rows to return
 * @returns Array of import rows
 */
export async function getImportRows(
  batchId: string,
  limit: number = 100
): Promise<ImportEngineRow[]> {
  const db = admin.firestore();
  const rowsSnapshot = await db
    .collection('import_batches')
    .doc(batchId)
    .collection('rows')
    .limit(limit)
    .get();
  
  return rowsSnapshot.docs.map(doc => doc.data() as ImportEngineRow);
}
