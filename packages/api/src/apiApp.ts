/**
 * Unified API Express App
 * 
 * Mounts all API endpoints under a single Cloud Function for hosting rewrites.
 * This allows firebase.json to route /admin/**, /products/**, etc. to one function.
 * 
 * Lisa v1.0.0
 */

import express, { Application } from 'express';
import cors from 'cors';

// Admin handlers
import {
  listAttributesHandler,
  getAttributeHandler,
  createAttributeHandler,
  updateAttributeHandler,
  deleteAttributeHandler,
} from './endpoints/admin/settings';

// Product handlers
import {
  patchProductAttributesHandler,
  getProductHandler,
  listProductsHandler,
} from './endpoints/products';

// Import / batch / sync
import {
  processImportBatchHandler,
  getBatchStatusHandler,
} from './endpoints/processImportBatch';
import { runSyncAttributeRegistry } from './tasks/syncAttributeRegistry';

const app: Application = express();

// Allow CORS from any origin (handlers themselves perform requireAdmin where needed)
app.use(cors({ origin: true }));
app.use(express.json({ limit: '2mb' }));

/**
 * Admin Settings endpoints
 */
app.get('/admin/settings/attributes', listAttributesHandler);
app.get('/admin/settings/attributes/:id', getAttributeHandler);
app.post('/admin/settings/attributes', createAttributeHandler);
app.put('/admin/settings/attributes/:id', updateAttributeHandler);
app.delete('/admin/settings/attributes/:id', deleteAttributeHandler);

/**
 * Products endpoints
 */
app.get('/products', listProductsHandler);
app.get('/products/:productId', getProductHandler);
app.patch('/products/:productId/attributes', patchProductAttributesHandler);

/**
 * Import, batch and sync endpoints
 */
app.post('/processImportBatch', processImportBatchHandler);
app.get('/importBatchStatus', getBatchStatusHandler);
app.post('/syncAttributeRegistry', async (req, res) => {
  try {
    const result = await runSyncAttributeRegistry();
    res.status(200).json(result);
  } catch (err: unknown) {
    console.error('syncAttributeRegistry error:', err);
    const message = err instanceof Error ? err.message : String(err);
    res.status(500).json({ error: 'SYNC_FAILED', message });
  }
});

export default app;
