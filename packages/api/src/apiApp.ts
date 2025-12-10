/**
 * Unified API Express App
 * 
 * Mounts all API endpoints under a single Cloud Function for hosting rewrites.
 * This allows firebase.json to route /admin/**, /products/**, etc. to one function.
 * 
 * Lisa v1.0.0
 */

import express, { Application, Router } from 'express';
import cors from 'cors';
import { requireAdmin } from './middleware/auth';

// Admin handlers
import {
  listAttributesHandler,
  getAttributeHandler,
  createAttributeHandler,
  updateAttributeHandler,
  deleteAttributeHandler,
} from './endpoints/admin/settings';
import {
  listListsHandler,
  getListHandler,
  createListHandler,
  updateListHandler,
  deleteListHandler,
} from './endpoints/admin/lists.js';
import {
  listUsersHandler,
  getUserHandler,
  createUserHandler,
  updateUserHandler,
  deleteUserHandler,
  resetPasswordHandler,
  getRolesHandler,
} from './endpoints/admin/users';
import {
  getPermissionsHandler,
  updatePermissionsHandler,
  resetPermissionsHandler,
} from './endpoints/admin/permissions';

// User self-profile handlers
import {
  getMeHandler,
  updateMeHandler,
} from './endpoints/users/me';

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

// Reconciliation (Homer v1.0.0)
import reconcileAttributesRouter from './admin/reconcileAttributes';

const app: Application = express();
const api: Router = Router();

// Allow CORS from any origin (handlers themselves perform requireAdmin where needed)
app.use(cors({ origin: true }));
app.use(express.json({ limit: '2mb' }));

/**
 * Admin Settings endpoints
 */
api.get('/admin/settings/attributes', listAttributesHandler);
api.get('/admin/settings/attributes/:id', getAttributeHandler);
api.post('/admin/settings/attributes', createAttributeHandler);
api.put('/admin/settings/attributes/:id', updateAttributeHandler);
api.delete('/admin/settings/attributes/:id', deleteAttributeHandler);

api.get('/admin/settings/lists', listListsHandler);
api.get('/admin/settings/lists/:listId', getListHandler);
api.post('/admin/settings/lists', createListHandler);
api.put('/admin/settings/lists/:listId', updateListHandler);
api.delete('/admin/settings/lists/:listId', deleteListHandler);

/**
 * Admin Users endpoints
 */
api.get('/admin/settings/users', listUsersHandler);
api.get('/admin/settings/users/:uid', getUserHandler);
api.post('/admin/settings/users', createUserHandler);
api.patch('/admin/settings/users/:uid', updateUserHandler);
api.delete('/admin/settings/users/:uid', deleteUserHandler);
api.post('/admin/settings/users/:uid/reset-password', resetPasswordHandler);
api.get('/admin/settings/roles', getRolesHandler);

/**
 * Admin Permissions endpoints
 */
api.get('/admin/permissions', requireAdmin, getPermissionsHandler);
api.patch('/admin/permissions', requireAdmin, updatePermissionsHandler);
api.post('/admin/permissions/reset', requireAdmin, resetPermissionsHandler);

/**
 * User Self-Profile endpoints
 */
api.get('/users/me', getMeHandler);
api.patch('/users/me', updateMeHandler);

/**
 * Products endpoints
 */
api.get('/products', listProductsHandler);
api.get('/products/:productId', getProductHandler);
api.patch('/products/:productId/attributes', patchProductAttributesHandler);

/**
 * Import, batch and sync endpoints
 */
api.post('/processImportBatch', processImportBatchHandler);
api.get('/importBatchStatus', getBatchStatusHandler);
api.post('/syncAttributeRegistry', async (req, res) => {
  try {
    const result = await runSyncAttributeRegistry();
    res.status(200).json(result);
  } catch (err: unknown) {
    console.error('syncAttributeRegistry error:', err);
    const message = err instanceof Error ? err.message : String(err);
    res.status(500).json({ error: 'SYNC_FAILED', message });
  }
});

/**
 * Attribute Reconciliation endpoints (Homer v1.0.0)
 * /admin/reconcile-attributes/analyze - POST - Start reconciliation job
 * /admin/reconcile-attributes/:jobId - GET - Get job status
 * /admin/reconcile-attributes/apply - POST - Apply mappings
 */
api.use('/admin/reconcile-attributes', requireAdmin, reconcileAttributesRouter);

// Lightweight health check
api.get('/healthz', (_req, res) => {
  res.status(200).json({ status: 'ok' });
});

// Mount API under /api to align with hosting rewrites
app.use('/api', api);

// Export both default and named for test compatibility
export const apiApp = app;
export default app;
