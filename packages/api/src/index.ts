/**
 * ROPI AOSS API
 * Firebase Cloud Functions
 * 
 * Per AOSS Section 6 — API Contracts
 * 
 * Lisa v1.0.0
 */

import * as admin from 'firebase-admin';
import * as functions from 'firebase-functions';
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

// Initialize Firebase Admin SDK
admin.initializeApp();

// Export the unified API function for hosting rewrites
// Routes: /admin/**, /products/**, /processImportBatch, /importBatchStatus, /syncAttributeRegistry
export const api = functions.https.onRequest(apiApp);

// Export API endpoints
export { importCSV } from './endpoints/import';

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
