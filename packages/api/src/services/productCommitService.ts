/**
 * Product Commit Service
 * Per AOSS Sections 2.1 (Product Schema), 3.1 (Import Engine), 9 (Firebase Security)
 * 
 * Converts validated import rows into products/{productId} documents.
 * Implements idempotent commit logic with statusFlags initialization.
 * 
 * S3 (LP-smart-rules-import-1.0.0): Integrated Smart Rules Engine V2
 * - Engine runs as canonical import normalization step
 * - Persists per-field provenance and activity logs
 * - Idempotent and safe (skip-window loop prevention)
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
import { normalizeMpn } from '@ropi-aoss/sdk';
import {
  processImportWithSmartRules,
  type SmartRulesImportResult,
} from '../functions/smartRulesImport';
import type { ImportRow, Product as SmartRulesProduct } from '../lib/smartEngineV2';

const FIRESTORE_BATCH_LIMIT = 500;

/**
 * Process result for a single row
 */
interface RowProcessResult {
  rowId: string;
  productId: string;
  outcome: 'created' | 'updated' | 'skipped_validation_error';
  error?: string;
  /** S3: Smart Rules processing statistics */
  smartRules?: {
    suggestionsCount: number;
    autoAppliedCount: number;
    conflictsCount: number;
    skipped: boolean;
    skipReason?: string;
  };
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
  /** S3: Smart Rules batch statistics */
  smartRulesStats?: {
    totalSuggestions: number;
    totalAutoApplied: number;
    totalConflicts: number;
    processedCount: number;
    skippedCount: number;
  };
}

/**
 * Fields that belong in specific product sections (not attributes)
 * LP-1.3.6: Explicit mapping for known field types
 */
const CORE_FIELDS = new Set(['sku', 'title', 'brand', 'description', 'mpn', 'style_id', 'name', 'status']);
const PRICING_FIELDS = new Set(['msrp', 'cost', 'retailPrice', 'scom_regular_price', 'scom_sale_price', 'map']);
const INVENTORY_FIELDS = new Set(['quantity', 'warehouse', 'location', 'warehouse_inv', 'store_inv', 'whs_inv']);
const MEDIA_FIELDS = new Set(['primaryImage', 'images']);
const DATE_FIELDS = new Set(['firstReceived', 'first_received', 'lastReceived', 'last_received', 'launchDate', 'launch_date']);
const META_FIELDS = new Set(['source', 'importedAt', 'normalizedAt', 'validatedAt']);
const DIMENSION_FIELDS = new Set(['height', 'width', 'length', 'weight']);

/**
 * Convert ImportEngineRow to Product document
 * LP-1.3.6: Preserve all normalized fields - don't discard unmapped data
 * 
 * @param row - Import engine row with normalized fields
 * @returns Product document ready for Firestore
 */
export function convertRowToProduct(row: ImportEngineRow): Product {
  const { normalized, validation, meta } = row;
  const now = new Date().toISOString();

  // Build core fields - LP-1.3.6: Include MPN as primary identifier (LP-2.1.0)
  // LP-smart-rules-mpn-1.0.0: Add normalized_mpn for reliable lookups
  const core: ProductCore = {
    sku: normalized.sku || '',
    title: normalized.title || normalized.name || '',
    brand: normalized.brand || '',
    ...(normalized.mpn && { mpn: normalized.mpn }),
    ...(normalized.mpn && { normalized_mpn: normalizeMpn(normalized.mpn) }),
    ...(normalized.style_id && { styleId: normalized.style_id }),
    ...(normalized.description && { description: normalized.description }),
    ...(normalized.first_received && { firstReceived: normalized.first_received }),
    ...(normalized.firstReceived && { firstReceived: normalized.firstReceived }),
    ...(normalized.last_received && { lastReceived: normalized.last_received }),
    ...(normalized.lastReceived && { lastReceived: normalized.lastReceived }),
    ...(normalized.launch_date && { launchDate: normalized.launch_date }),
    ...(normalized.launchDate && { launchDate: normalized.launchDate }),
    status: 'draft', // New imports start as drafts
    createdAt: now,
    updatedAt: now,
  };

  // Build attributes - LP-1.3.6: Include all attribute fields including RICS
  const attributes: ProductAttributes = {};
  
  // Standard attributes
  if (normalized.department) attributes.department = normalized.department;
  if (normalized.class) attributes.class = normalized.class;
  if (normalized.category) attributes.category = normalized.category;
  if (normalized.subcategory) attributes.subcategory = normalized.subcategory;
  if (normalized.gender) attributes.gender = normalized.gender;
  if (normalized.ageGroup) attributes.ageGroup = normalized.ageGroup;
  if (normalized.age_group) attributes.ageGroup = normalized.age_group;
  if (normalized.color) attributes.color = normalized.color;
  if (normalized.size) attributes.size = normalized.size;
  if (normalized.material) attributes.material = normalized.material;
  
  // RICS fields - LP-1.3.6: Preserve reference data
  if (normalized.rics_color) attributes.rics_color = normalized.rics_color;
  if (normalized.rics_category) attributes.rics_category = normalized.rics_category;
  if (normalized.rics_short_description) attributes.rics_short_description = normalized.rics_short_description;
  if (normalized.rics_long_desc) attributes.rics_long_desc = normalized.rics_long_desc;
  
  // LP-1.3.6: Capture ALL remaining normalized fields as attributes
  // This ensures no imported data is silently discarded
  const reservedFields = new Set([
    ...CORE_FIELDS, ...PRICING_FIELDS, ...INVENTORY_FIELDS, 
    ...MEDIA_FIELDS, ...DATE_FIELDS, ...META_FIELDS, ...DIMENSION_FIELDS
  ]);
  
  for (const [key, value] of Object.entries(normalized)) {
    if (value !== undefined && value !== null && value !== '' && !reservedFields.has(key)) {
      // Only add if not already set (standard attributes take precedence)
      if (!(key in attributes)) {
        attributes[key] = value;
      }
    }
  }

  // Build pricing (filter out undefined values) - LP-1.3.6: Include SCOM prices
  let pricing: ProductPricing | undefined = undefined;
  const hasAnyPricing = normalized.msrp || normalized.cost || normalized.retailPrice || 
                        normalized.scom_regular_price || normalized.scom_sale_price || normalized.map;
  if (hasAnyPricing) {
    pricing = { currency: 'USD' };
    if (normalized.msrp) pricing.msrp = Number(normalized.msrp);
    if (normalized.cost) pricing.cost = Number(normalized.cost);
    if (normalized.retailPrice) pricing.retailPrice = Number(normalized.retailPrice);
    if (normalized.scom_regular_price) (pricing as any).scom_regular_price = Number(normalized.scom_regular_price);
    if (normalized.scom_sale_price) (pricing as any).scom_sale_price = Number(normalized.scom_sale_price);
    if (normalized.map) (pricing as any).map = Number(normalized.map);
  }

  // Build inventory (filter out undefined values) - LP-1.3.6: Include warehouse/store inv
  let inventory: ProductInventory | undefined = undefined;
  const hasAnyInventory = normalized.quantity !== undefined || normalized.warehouse_inv || 
                          normalized.store_inv || normalized.whs_inv || normalized.warehouse;
  if (hasAnyInventory) {
    inventory = {};
    if (normalized.quantity !== undefined) inventory.quantity = Number(normalized.quantity);
    if (normalized.warehouse) inventory.warehouse = normalized.warehouse;
    if (normalized.location) inventory.location = normalized.location;
    if (normalized.warehouse_inv) (inventory as any).warehouse_inv = Number(normalized.warehouse_inv);
    if (normalized.store_inv) (inventory as any).store_inv = Number(normalized.store_inv);
    if (normalized.whs_inv) (inventory as any).whs_inv = Number(normalized.whs_inv);
  }
  
  // Build dimensions if present
  let dimensions: any = undefined;
  if (normalized.height || normalized.width || normalized.length || normalized.weight) {
    dimensions = {};
    if (normalized.height) dimensions.height = Number(normalized.height);
    if (normalized.width) dimensions.width = Number(normalized.width);
    if (normalized.length) dimensions.length = Number(normalized.length);
    if (normalized.weight) dimensions.weight = Number(normalized.weight);
  }

  // Build media (filter out undefined values)
  let media: ProductMedia | undefined = undefined;
  if (normalized.primaryImage || normalized.images) {
    media = {};
    if (normalized.primaryImage) media.primaryImage = normalized.primaryImage;
    if (normalized.images) media.images = Array.isArray(normalized.images) ? normalized.images : [normalized.images];
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
  // LP-1.3.6: Include all sections that have data
  const product: Product = {
    core,
    attributes,
    ...(pricing && { pricing }),
    ...(inventory && { inventory }),
    ...(dimensions && { dimensions }),
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
 * S3: Integrated Smart Rules Engine V2 as canonical import normalization step
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
  const { meta, validation, normalized } = row;

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
  const existingData = exists ? productDoc.data() as Product : undefined;

  // Convert row to product document
  const product = convertRowToProduct(row);

  // If updating, preserve createdAt
  if (exists && existingData?.core?.createdAt) {
    product.core.createdAt = existingData.core.createdAt;
  }

  // ============================================================================
  // S3: Smart Rules Engine Integration
  // Run engine as canonical import normalization step
  // ============================================================================
  
  // Build source data for Smart Rules (RICS fields)
  const sourceData: ImportRow['source'] = {
    rics: {
      category: normalized.rics_category || normalized.category || '',
      color: normalized.rics_color || normalized.color || '',
      shortDescription: normalized.rics_short_description || '',
      longDescription: normalized.rics_long_desc || '',
    },
  };
  
  // Build existing product for set-only-if-empty checks
  const existingProduct: SmartRulesProduct | undefined = existingData ? {
    mpn: meta.productId,
    attributes: existingData.attributes || {},
    provenance: (existingData as any).provenance || {},
    _smartRulesRanAt: (existingData as any)._smartRulesRanAt,
    _smartRulesSkipUntil: (existingData as any)._smartRulesSkipUntil,
  } : undefined;
  
  // Process Smart Rules
  const smartRulesResult = await processImportWithSmartRules(
    meta.productId,
    normalized,
    sourceData,
    existingProduct
  );
  
  // Apply Smart Rules updates to product (if not skipped)
  if (!smartRulesResult.skipped && Object.keys(smartRulesResult.updates).length > 0) {
    // Merge Smart Rules attribute updates (flat field names from registry)
    // Extract attribute fields (exclude metadata fields like provenance, _appliedRules, etc.)
    const attributeUpdates: Record<string, unknown> = {};
    for (const [key, value] of Object.entries(smartRulesResult.updates)) {
      if (!key.startsWith('_') && !key.startsWith('provenance')) {
        attributeUpdates[key] = value;
      }
    }
    if (Object.keys(attributeUpdates).length > 0) {
      product.attributes = {
        ...product.attributes,
        ...(attributeUpdates as ProductAttributes),
      };
    }
    
    // Add provenance per-field
    if (smartRulesResult.updates.provenance) {
      (product as any).provenance = {
        ...(existingData as any)?.provenance,
        ...(smartRulesResult.updates.provenance as Record<string, unknown>),
      };
    }
    
    // Add _appliedRules tracking
    if (smartRulesResult.updates._appliedRules) {
      (product as any)._appliedRules = {
        ...(existingData as any)?._appliedRules,
        ...(smartRulesResult.updates._appliedRules as Record<string, unknown>),
      };
    }
    
    // Add _smartConflicts if present
    if (smartRulesResult.updates._smartConflicts) {
      (product as any)._smartConflicts = smartRulesResult.updates._smartConflicts;
    }
    
    // Set _smartRulesRanAt and _smartRulesSkipUntil (loop prevention)
    (product as any)._smartRulesRanAt = smartRulesResult.updates._smartRulesRanAt;
    (product as any)._smartRulesSkipUntil = smartRulesResult.updates._smartRulesSkipUntil;
  }

  // Write product (create or update)
  await productRef.set(product, { merge: true });
  
  // S3: Append activity log entries (separate update to use arrayUnion)
  if (!smartRulesResult.skipped && smartRulesResult.activityLog.length > 0) {
    await productRef.update({
      _activityLog: admin.firestore.FieldValue.arrayUnion(...smartRulesResult.activityLog),
    });
  }

  return {
    rowId: meta.rowId,
    productId: meta.productId,
    outcome: exists ? 'updated' : 'created',
    smartRules: {
      suggestionsCount: smartRulesResult.suggestions.length,
      autoAppliedCount: smartRulesResult.autoApplied.length,
      conflictsCount: smartRulesResult.conflicts.length,
      skipped: smartRulesResult.skipped,
      skipReason: smartRulesResult.skipReason,
    },
  };
}

/**
 * Process an import batch by converting rows to products
 * S3: Includes Smart Rules Engine as canonical normalization step
 * Implements idempotent commit logic with chunked Firestore writes.
 * 
 * @param batchId - Import batch ID
 * @param userId - User ID processing the batch
 * @returns Batch process result with counters and Smart Rules stats
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
  
  // S3: Smart Rules batch statistics
  let smartRulesTotalSuggestions = 0;
  let smartRulesTotalAutoApplied = 0;
  let smartRulesTotalConflicts = 0;
  let smartRulesProcessedCount = 0;
  let smartRulesSkippedCount = 0;

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
      
      // S3: Aggregate Smart Rules statistics
      if (result.smartRules) {
        smartRulesTotalSuggestions += result.smartRules.suggestionsCount;
        smartRulesTotalAutoApplied += result.smartRules.autoAppliedCount;
        smartRulesTotalConflicts += result.smartRules.conflictsCount;
        if (result.smartRules.skipped) {
          smartRulesSkippedCount++;
        } else {
          smartRulesProcessedCount++;
        }
      }

      // Update row meta with importOutcome (non-blocking - don't fail entire import if this errors)
      try {
        await batchRef
          .collection('rows')
          .doc(row.rowId)
          .update({
            'meta.importOutcome': result.outcome,
            // S3: Store Smart Rules result per row
            'meta.smartRulesResult': result.smartRules || null,
          });
      } catch (updateError) {
        // Log but don't fail - product was already created/updated successfully
        console.warn(`Failed to update row ${row.rowId} importOutcome (product ${result.outcome} successfully):`, updateError);
      }
    } catch (error) {
      // Only count as blocked if processRow itself failed (validation errors, missing ID, etc.)
      console.error(`Error processing row ${row.rowId}:`, error);
      blockedCount++;
      results.push({
        rowId: row.rowId,
        productId: row.meta.productId || '',
        outcome: 'skipped_validation_error',
        error: error instanceof Error ? error.message : 'Unknown error',
      });
      
      // Try to update row status even on error (non-blocking)
      try {
        await batchRef
          .collection('rows')
          .doc(row.rowId)
          .update({
            'meta.importOutcome': 'skipped_validation_error',
            'meta.error': error instanceof Error ? error.message : 'Unknown error',
          });
      } catch (updateError) {
        console.warn(`Failed to update row ${row.rowId} error status:`, updateError);
      }
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
    // S3: Smart Rules batch summary
    smartRulesStats: {
      totalSuggestions: smartRulesTotalSuggestions,
      totalAutoApplied: smartRulesTotalAutoApplied,
      totalConflicts: smartRulesTotalConflicts,
      processedCount: smartRulesProcessedCount,
      skippedCount: smartRulesSkippedCount,
    },
  });

  return {
    batchId,
    createdCount,
    updatedCount,
    blockedCount,
    processedAt,
    processedBy: userId,
    results,
    smartRulesStats: {
      totalSuggestions: smartRulesTotalSuggestions,
      totalAutoApplied: smartRulesTotalAutoApplied,
      totalConflicts: smartRulesTotalConflicts,
      processedCount: smartRulesProcessedCount,
      skippedCount: smartRulesSkippedCount,
    },
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
