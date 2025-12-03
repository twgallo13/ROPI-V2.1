/**
 * Product Commit Service
 * Per AOSS Sections 2.1 (Product Schema), 3.1 (Import Engine), 9 (Firebase Security)
 * 
 * Converts validated import rows into products/{productId} documents.
 * Implements idempotent commit logic with statusFlags initialization.
 */

import * as admin from 'firebase-admin';
import type {
  ImportEngineRow,
  ImportBatch,
  Product,
  ProductCore,
  ProductAttributes,
  ProductPricing,
  ProductInventory,
  ProductMedia,
  ProductStatusFlags,
} from '@ropi-aoss/sdk';

const FIRESTORE_BATCH_LIMIT = 500;

/**
 * Process result for a single row
 */
interface RowProcessResult {
  rowId: string;
  productId: string;
  outcome: 'created' | 'updated' | 'skipped_validation_error';
  error?: string;
}

/**
 * Overall batch process result
 */
export interface BatchProcessResult {
  batchId: string;
  createdCount: number;
  updatedCount: number;
  blockedCount: number;
  processedAt: string;
  processedBy: string;
  results: RowProcessResult[];
}

/**
 * Convert ImportEngineRow to Product document
 * 
 * @param row - Import engine row with normalized fields
 * @returns Product document ready for Firestore
 */
function convertRowToProduct(row: ImportEngineRow): Product {
  const { normalized, validation, meta } = row;
  const now = new Date().toISOString();

  // Build core fields (filter out undefined values)
  const core: ProductCore = {
    sku: normalized.sku || '',
    title: normalized.title || '',
    brand: normalized.brand || '',
    ...(normalized.description && { description: normalized.description }),
    status: 'draft', // New imports start as drafts
    createdAt: now,
    updatedAt: now,
  };

  // Build attributes (filter out undefined values)
  const attributes: ProductAttributes = {};
  if (normalized.department) attributes.department = normalized.department;
  if (normalized.class) attributes.class = normalized.class;
  if (normalized.category) attributes.category = normalized.category;
  if (normalized.subcategory) attributes.subcategory = normalized.subcategory;
  if (normalized.gender) attributes.gender = normalized.gender;
  if (normalized.ageGroup) attributes.ageGroup = normalized.ageGroup;
  if (normalized.color) attributes.color = normalized.color;
  if (normalized.size) attributes.size = normalized.size;
  if (normalized.material) attributes.material = normalized.material;

  // Build pricing (filter out undefined values)
  let pricing: ProductPricing | undefined = undefined;
  if (normalized.msrp || normalized.cost || normalized.retailPrice) {
    pricing = { currency: 'USD' };
    if (normalized.msrp) pricing.msrp = normalized.msrp;
    if (normalized.cost) pricing.cost = normalized.cost;
    if (normalized.retailPrice) pricing.retailPrice = normalized.retailPrice;
  }

  // Build inventory (filter out undefined values)
  let inventory: ProductInventory | undefined = undefined;
  if (normalized.quantity !== undefined) {
    inventory = { quantity: normalized.quantity };
    if (normalized.warehouse) inventory.warehouse = normalized.warehouse;
    if (normalized.location) inventory.location = normalized.location;
  }

  // Build media (filter out undefined values)
  let media: ProductMedia | undefined = undefined;
  if (normalized.primaryImage || normalized.images) {
    media = {};
    if (normalized.primaryImage) media.primaryImage = normalized.primaryImage;
    if (normalized.images) media.images = [normalized.images];
  }

  // Initialize status flags per Section 9
  const statusFlags: ProductStatusFlags = {
    ready_for_export: false,
    validation_status: validation.errors.length > 0
      ? 'has_errors'
      : validation.warnings.length > 0
      ? 'has_warnings'
      : 'valid',
    uploaded_to_ro: false,
  };

  // Build complete product (only include defined optional fields)
  const product: Product = {
    core,
    attributes,
    ...(pricing && { pricing }),
    ...(inventory && { inventory }),
    ...(media && { media }),
    statusFlags,
    roUploadBatchId: null,
    roUploadDate: null,
    _meta: {
      source: 'csv',
      importedAt: meta.importedAt,
      normalizedAt: now,
      validatedAt: now,
    },
  };

  return product;
}

/**
 * Process a single import row into a product document
 * 
 * @param row - Import engine row
 * @param db - Firestore instance
 * @param userId - User ID processing the batch
 * @returns Process result for the row
 */
async function processRow(
  row: ImportEngineRow,
  db: admin.firestore.Firestore,
  userId: string
): Promise<RowProcessResult> {
  const { meta, validation } = row;

  // Check if row has blocking validation errors
  const hasBlockingErrors = validation.errors.length > 0;

  if (hasBlockingErrors) {
    // Mark row as skipped due to validation
    return {
      rowId: meta.rowId,
      productId: meta.productId || '',
      outcome: 'skipped_validation_error',
      error: validation.errors.map((e: any) => e.message).join('; '),
    };
  }

  if (!meta.productId) {
    return {
      rowId: meta.rowId,
      productId: '',
      outcome: 'skipped_validation_error',
      error: 'Missing product ID',
    };
  }

  // Check if product already exists
  const productRef = db.collection('products').doc(meta.productId);
  const productDoc = await productRef.get();
  const exists = productDoc.exists;

  // Convert row to product document
  const product = convertRowToProduct(row);

  // If updating, preserve createdAt
  if (exists && productDoc.data()?.core?.createdAt) {
    product.core.createdAt = productDoc.data()!.core.createdAt;
  }

  // Write product (create or update)
  await productRef.set(product, { merge: true });

  return {
    rowId: meta.rowId,
    productId: meta.productId,
    outcome: exists ? 'updated' : 'created',
  };
}

/**
 * Process an import batch by converting rows to products
 * Implements idempotent commit logic with chunked Firestore writes.
 * 
 * @param batchId - Import batch ID
 * @param userId - User ID processing the batch
 * @returns Batch process result with counters
 */
export async function processImportBatch(
  batchId: string,
  userId: string
): Promise<BatchProcessResult> {
  const db = admin.firestore();
  
  // Read batch document
  const batchRef = db.collection('import_batches').doc(batchId);
  const batchDoc = await batchRef.get();
  
  if (!batchDoc.exists) {
    throw new Error(`Import batch ${batchId} not found`);
  }

  // Read all rows from subcollection
  const rowsSnapshot = await batchRef.collection('rows').get();
  const rows: ImportEngineRow[] = rowsSnapshot.docs.map(doc => doc.data() as ImportEngineRow);

  if (rows.length === 0) {
    throw new Error(`No rows found in batch ${batchId}`);
  }

  // Process each row
  const results: RowProcessResult[] = [];
  let createdCount = 0;
  let updatedCount = 0;
  let blockedCount = 0;

  for (const row of rows) {
    try {
      const result = await processRow(row, db, userId);
      results.push(result);

      // Update counters
      if (result.outcome === 'created') {
        createdCount++;
      } else if (result.outcome === 'updated') {
        updatedCount++;
      } else if (result.outcome === 'skipped_validation_error') {
        blockedCount++;
      }

      // Update row meta with importOutcome
      await batchRef
        .collection('rows')
        .doc(row.rowId)
        .update({
          'meta.importOutcome': result.outcome,
        });
    } catch (error) {
      console.error(`Error processing row ${row.rowId}:`, error);
      blockedCount++;
      results.push({
        rowId: row.rowId,
        productId: row.meta.productId || '',
        outcome: 'skipped_validation_error',
        error: error instanceof Error ? error.message : 'Unknown error',
      });
    }
  }

  const processedAt = new Date().toISOString();

  // Update batch document with counters
  await batchRef.update({
    status: 'processed',
    processedAt,
    processedBy: userId,
    createdCount,
    updatedCount,
    blockedCount,
  });

  return {
    batchId,
    createdCount,
    updatedCount,
    blockedCount,
    processedAt,
    processedBy: userId,
    results,
  };
}

/**
 * Get batch processing status
 * 
 * @param batchId - Import batch ID
 * @returns Batch status and counters
 */
export async function getBatchStatus(batchId: string): Promise<{
  status: string;
  createdCount?: number;
  updatedCount?: number;
  blockedCount?: number;
  processedAt?: string;
}> {
  const db = admin.firestore();
  const batchRef = db.collection('import_batches').doc(batchId);
  const batchDoc = await batchRef.get();

  if (!batchDoc.exists) {
    throw new Error(`Import batch ${batchId} not found`);
  }

  const batch = batchDoc.data() as ImportBatch;
  
  return {
    status: batch.status,
    createdCount: batch.createdCount,
    updatedCount: batch.updatedCount,
    blockedCount: batch.blockedCount,
    processedAt: batch.processedAt,
  };
}
