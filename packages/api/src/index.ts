/**
 * ROPI AOSS API
 * Firebase Cloud Functions
 * 
 * Per AOSS Section 6 — API Contracts
 * 
 * Lisa v1.0.0
 */

import * as admin from 'firebase-admin';
import * as functions from 'firebase-functions/v1';
import { requireAdmin } from './middleware/auth';
import { processImportBatchHandler, getBatchStatusHandler } from './endpoints/processImportBatch';
import { 
  patchProductAttributesHandler, 
  getProductHandler, 
  listProductsHandler 
} from './endpoints/products';
import { runSyncAttributeRegistry } from './tasks/syncAttributeRegistry';

// Import the unified API Express app
import apiApp from './apiApp';

// LP-smart-rules-whitelist-remediation-1.0.0: Initialize allowed fields cache
import { initializeAllowedFieldsCache } from './lib/allowedTargetFields';

// Initialize Firebase Admin SDK
admin.initializeApp();

// Initialize allowed target fields cache (async, runs in background)
// LP-smart-rules-whitelist-remediation-1.0.0: Populate whitelist from registry
initializeAllowedFieldsCache().catch(err => {
  console.error('[Initialization] Failed to initialize allowed fields cache:', err);
});

// Export the unified API function for hosting rewrites
// Routes: /admin/**, /products/**, /processImportBatch, /importBatchStatus, /syncAttributeRegistry
export const api = functions.https.onRequest(apiApp);

// Export API endpoints (LP-3.0.0: include importDryRun with CORS fix, LP-2.1.9: export endpoints)
export { importCSV, importDryRun } from './endpoints/import';
export { exportApi, exportDryRun, exportRun } from './endpoints/export';

/**
 * Process Import Batch - Convert import rows to products
 * POST /processImportBatch
 * Admin-only
 */
export const processImportBatch = functions.https.onRequest(async (req, res) => {
  // Enable CORS
  res.set('Access-Control-Allow-Origin', '*');
  res.set('Access-Control-Allow-Methods', 'POST, OPTIONS');
  res.set('Access-Control-Allow-Headers', 'Authorization, Content-Type');

  if (req.method === 'OPTIONS') {
    res.status(204).send('');
    return;
  }

  // Require admin
  await requireAdmin(req, res, () => processImportBatchHandler(req, res));
});

/**
 * Get Import Batch Status
 * GET /importBatchStatus?batchId=xxx
 * Admin and Merch can read
 */
export const importBatchStatus = functions.https.onRequest(async (req, res) => {
  // Enable CORS
  res.set('Access-Control-Allow-Origin', '*');
  res.set('Access-Control-Allow-Methods', 'GET, OPTIONS');
  res.set('Access-Control-Allow-Headers', 'Authorization, Content-Type');

  if (req.method === 'OPTIONS') {
    res.status(204).send('');
    return;
  }

  // For now, require admin (can relax to merch+admin later)
  await requireAdmin(req, res, () => getBatchStatusHandler(req, res));
});

/**
 * Sync Attribute Registry
 * POST /syncAttributeRegistry
 * Admin-only - Syncs attribute definitions from JSON/Notion to Firestore
 */
export const syncAttributeRegistry = functions.https.onRequest(async (req, res) => {
  // Enable CORS
  res.set('Access-Control-Allow-Origin', '*');
  res.set('Access-Control-Allow-Methods', 'POST, OPTIONS');
  res.set('Access-Control-Allow-Headers', 'Authorization, Content-Type');

  if (req.method === 'OPTIONS') {
    res.status(204).send('');
    return;
  }

  // [LP-phase2b-003-REMEDIATION] PAUSE: Sync job is disabled to prevent overwrites
  // of user-edited Firestore attributes. Use POST /admin/evaluator/refresh instead
  // to refresh the evaluator cache with current Firestore registry.
  // To re-enable, set SYNC_ATTRIBUTE_REGISTRY_ENABLED=true in deployment env.
  const syncEnabled = process.env.SYNC_ATTRIBUTE_REGISTRY_ENABLED === 'true';
  if (!syncEnabled) {
    res.status(403).json({
      error: 'SYNC_DISABLED',
      message: 'Attribute registry sync is currently paused to prevent overwrites. Use /admin/evaluator/refresh instead.'
    });
    return;
  }

  await requireAdmin(req, res, async () => {
    try {
      const result = await runSyncAttributeRegistry();
      res.status(200).json(result);
    } catch (error) {
      console.error('Sync failed:', error);
      res.status(500).json({ 
        error: 'SYNC_FAILED', 
        message: error instanceof Error ? error.message : 'Unknown error' 
      });
    }
  });
});

/**
 * Get Product
 * GET /products/:productId
 * Admin-only
 */
export const getProduct = functions.https.onRequest(async (req, res) => {
  // Enable CORS
  res.set('Access-Control-Allow-Origin', '*');
  res.set('Access-Control-Allow-Methods', 'GET, OPTIONS');
  res.set('Access-Control-Allow-Headers', 'Authorization, Content-Type');

  if (req.method === 'OPTIONS') {
    res.status(204).send('');
    return;
  }

  // Extract productId from path
  const pathParts = req.path.split('/').filter(Boolean);
  req.params = { productId: pathParts[pathParts.length - 1] };
  
  await getProductHandler(req, res);
});

/**
 * List Products
 * GET /products
 * Admin-only
 */
export const listProducts = functions.https.onRequest(async (req, res) => {
  // Enable CORS
  res.set('Access-Control-Allow-Origin', '*');
  res.set('Access-Control-Allow-Methods', 'GET, OPTIONS');
  res.set('Access-Control-Allow-Headers', 'Authorization, Content-Type');

  if (req.method === 'OPTIONS') {
    res.status(204).send('');
    return;
  }

  await listProductsHandler(req, res);
});

/**
 * Update Product Attributes
 * PATCH /products/:productId/attributes
 * Admin-only - Server-side validated attribute updates
 */
export const updateProductAttributes = functions.https.onRequest(async (req, res) => {
  // Enable CORS
  res.set('Access-Control-Allow-Origin', '*');
  res.set('Access-Control-Allow-Methods', 'PATCH, OPTIONS');
  res.set('Access-Control-Allow-Headers', 'Authorization, Content-Type');

  if (req.method === 'OPTIONS') {
    res.status(204).send('');
    return;
  }

  // Extract productId from path (e.g., /products/ABC123/attributes)
  const pathParts = req.path.split('/').filter(Boolean);
  const productIdIndex = pathParts.indexOf('products') + 1;
  req.params = { productId: pathParts[productIdIndex] || '' };
  
  await patchProductAttributesHandler(req, res);
});

// ============================================================================
// Firestore Triggers — Smart Rules
// LP-smart-rules-3.1.1
// Per AOSS Section 4 — Smart Rules & W1/W2 Workflows
// ============================================================================
export { onProductWrite, onSmartRuleUpdate } from './functions/smartRules';

// ============================================================================
// Smart Rules V2 Callable Functions
// LP-smart-rules-engine-1.0.0
// Per Lisa's S2 requirements — Admin API for testing and application
// ============================================================================
export { 
  getProductSuggestions, 
  applySuggestions, 
  resolveConflict 
} from './functions/smartRulesCallables';
// LP-smart-rules-field-fix-1.0.0: Force redeploy 2026-01-02T19:22:44+00:00
