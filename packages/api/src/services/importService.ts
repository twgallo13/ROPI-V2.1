/**
 * Import Service
 * Per AOSS Section 3.1 — Import Engine
 * 
 * Handles CSV import, normalization, validation, and Firestore storage.
 */

import * as admin from 'firebase-admin';
import { v4 as uuidv4 } from 'uuid';
import Papa from 'papaparse';
import {
  buildImportRows,
  type ImportEngineRow,
  type ImportBatch,
  type ImportSourceColumns,
} from '@ropi-aoss/sdk';

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
    dynamicTyping: true, // Convert numbers automatically
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
 * Process CSV import
 * Main service method that orchestrates the entire import flow
 * 
 * @param csvContent - CSV file content
 * @param fileName - Original file name
 * @param userId - User ID who initiated import
 * @returns Import batch with summary
 */
export async function processCSVImport(
  csvContent: string,
  fileName: string,
  userId: string
): Promise<{
  batch: ImportBatch;
  rowCount: number;
  errorCount: number;
  warningCount: number;
}> {
  // Generate batch ID
  const batchId = uuidv4();
  
  try {
    // Parse CSV
    const csvData = parseCSV(csvContent);
    
    // Build import rows with normalization and validation
    const rows = buildImportRows(csvData, batchId, userId);
    
    // Calculate stats
    const { errorCount, warningCount } = calculateRowStats(rows);
    
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
    };
  } catch (error) {
    // Update batch status to failed
    const errorMessage = error instanceof Error ? error.message : 'Unknown error';
    
    await updateBatchStatus(batchId, 'failed', {
      notes: errorMessage,
    });
    
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
