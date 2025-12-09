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
import {
  listListsHandler,
  getListHandler,
  createListHandler,
  updateListHandler,
  deleteListHandler,
} from './endpoints/admin/lists';
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

app.get('/admin/settings/lists', listListsHandler);
app.get('/admin/settings/lists/:listId', getListHandler);
app.post('/admin/settings/lists', createListHandler);
app.put('/admin/settings/lists/:listId', updateListHandler);
app.delete('/admin/settings/lists/:listId', deleteListHandler);

/**
 * Admin Users endpoints
 */
app.get('/admin/settings/users', listUsersHandler);
app.get('/admin/settings/users/:uid', getUserHandler);
app.post('/admin/settings/users', createUserHandler);
app.patch('/admin/settings/users/:uid', updateUserHandler);
app.delete('/admin/settings/users/:uid', deleteUserHandler);
app.post('/admin/settings/users/:uid/reset-password', resetPasswordHandler);
app.get('/admin/settings/roles', getRolesHandler);

/**
 * Admin Permissions endpoints
 */
app.get('/admin/permissions', getPermissionsHandler);
app.patch('/admin/permissions', updatePermissionsHandler);
app.post('/admin/permissions/reset', resetPermissionsHandler);

/**
 * User Self-Profile endpoints
 */
app.get('/users/me', getMeHandler);
app.patch('/users/me', updateMeHandler);

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
