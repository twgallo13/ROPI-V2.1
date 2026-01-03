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
  getAttributeUsageHandler,
  getTopValuesHandler,
  // PVS-0.3.0 Audit handlers
  listAuditEventsHandler,
  getAuditEventHandler,
  revertAttributeHandler,
} from './endpoints/admin/settings';

// Completion Rules handlers
import {
  getCompletionRulesHandler,
  setCompletionRulesHandler,
  listCompletionRulesVersionsHandler,
  getCompletionRulesVersionHandler,
} from './endpoints/admin/completionRules';

// LP-smart-rules-server-validation-1.0.0: Smart Rules validation endpoint
import {
  validateSmartRuleHandler,
  normalizeSmartRuleHandler,
  getImportEvalHandler,
} from './endpoints/adminSmartRules';
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
  getProductByMpnHandler,
  searchProductsByMpnHandler,
  generateSuggestionsHandler,
  applySuggestionHandler,
} from './endpoints/products';

// LP-obs-studio-cleanup-1.6.5: Aggregated multi-target describe handlers
import {
  describeHandler,
  applyHandler,
} from './endpoints/describe';

// LP-obs-studio-cleanup-1.6.6: Product-level observation handlers
import {
  patchProductObservationHandler,
  getProductObservationHandler,
  deleteProductObservationHandler,
} from './endpoints/productObservation';

// Observations handlers (LP-1.1.1)
import {
  createObservationHandler,
  listObservationsHandler,
  getObservationHandler,
  updateObservationHandler,
  analyzeImageHandler,
  analyzeImageStandaloneHandler,
  removeObservationTagHandler,
} from './endpoints/observations';

// Import / batch / sync
import {
  processImportBatchHandler,
  getBatchStatusHandler,
} from './endpoints/processImportBatch';
import { retailopsImportPreviewApiHandler } from './endpoints/retailopsImportPreview';
import { runSyncAttributeRegistry } from './tasks/syncAttributeRegistry';
// LP-ATTR-1.3.1.1: Import CSV handlers for apiApp routing
import {
  importCSVHandler,
  importDryRunHandler,
} from './endpoints/import';

// LP-registry-health-1.0.0: Registry health check
import {
  registryHealthHandler,
  registryRefreshHandler,
  registryVersionHandler,
} from './endpoints/registryHealth';
import { runVerificationHandler, latestVerificationHandler } from './endpoints/verification';

// Reconciliation (Homer v1.0.0)
import reconcileAttributesRouter from './admin/reconcileAttributes';

// PVS-0.3.1 Mapping handlers
import {
  getGlobalMappingHandler,
  updateGlobalMappingHandler,
  getAttributeMappingHandler,
  updateAttributeMappingHandler,
  deleteAttributeMappingHandler,
  listSourceOverridesHandler,
  getSourceOverrideHandler,
  upsertSourceOverrideHandler,
  deleteSourceOverrideHandler,
  importPreviewHandler,
} from './endpoints/admin/mappings';

const app: Application = express();
const api: Router = Router();

// Allow CORS from any origin (handlers themselves perform requireAdmin where needed)
app.use(cors({ origin: true }));

// LP-ATTR-1.3.1.1: Apply JSON body parser only to non-multipart routes
// Import endpoints (importCSV, importDryRun) handle multipart/form-data with Busboy
app.use((req, res, next) => {
  const contentType = req.headers['content-type'] || '';
  // Skip JSON parsing for multipart requests (file uploads)
  if (contentType.includes('multipart/form-data')) {
    return next();
  }
  // Apply JSON parsing for all other requests
  express.json({ limit: '2mb' })(req, res, next);
});

/**
 * Admin Settings endpoints
 */
api.get('/admin/settings/attributes', listAttributesHandler);
api.get('/admin/settings/attributes/:id', getAttributeHandler);
api.post('/admin/settings/attributes', createAttributeHandler);
api.put('/admin/settings/attributes/:id', updateAttributeHandler);
api.delete('/admin/settings/attributes/:id', deleteAttributeHandler);
api.get('/admin/settings/attributes/:id/usage', getAttributeUsageHandler);
api.get('/admin/settings/attributes/:id/top-values', getTopValuesHandler);
// PVS-0.3.0 Audit endpoints
api.get('/admin/settings/attributes/:id/audit', listAuditEventsHandler);
api.get('/admin/settings/attributes/:id/audit/:eventId', getAuditEventHandler);
api.post('/admin/settings/attributes/:id/revert', revertAttributeHandler);
// PVS-0.3.1 Attribute-level mapping endpoints
api.get('/admin/settings/attributes/:id/mapping', getAttributeMappingHandler);
api.put('/admin/settings/attributes/:id/mapping', updateAttributeMappingHandler);
api.delete('/admin/settings/attributes/:id/mapping', deleteAttributeMappingHandler);
api.get('/admin/settings/attributes/:id/mapping/sources', listSourceOverridesHandler);
api.get('/admin/settings/attributes/:id/mapping/sources/:sourceId', getSourceOverrideHandler);
api.put('/admin/settings/attributes/:id/mapping/sources/:sourceId', upsertSourceOverrideHandler);
api.delete('/admin/settings/attributes/:id/mapping/sources/:sourceId', deleteSourceOverrideHandler);

// PVS-0.3.1 Global mapping endpoints
api.get('/admin/settings/mappings', getGlobalMappingHandler);
api.put('/admin/settings/mappings', updateGlobalMappingHandler);

api.get('/admin/settings/lists', listListsHandler);
api.get('/admin/settings/lists/:listId', getListHandler);
api.post('/admin/settings/lists', createListHandler);
api.put('/admin/settings/lists/:listId', updateListHandler);
api.delete('/admin/settings/lists/:listId', deleteListHandler);

/**
 * Admin Completion Rules endpoints
 */
api.get('/admin/settings/exportSettings/completionRules', getCompletionRulesHandler);
api.put('/admin/settings/exportSettings/completionRules', setCompletionRulesHandler);
api.get('/admin/settings/exportSettings/completionRules/versions', listCompletionRulesVersionsHandler);
api.get('/admin/settings/exportSettings/completionRules/versions/:version', getCompletionRulesVersionHandler);

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
 * Admin Smart Rules validation endpoints (LP-smart-rules-server-validation-1.0.0)
 */
api.post('/admin/validateSmartRule', validateSmartRuleHandler);
api.post('/admin/normalizeSmartRule', normalizeSmartRuleHandler);
api.get('/admin/import-eval/:productId', getImportEvalHandler);

/**
 * Registry health endpoints (LP-registry-health-1.0.0)
 * Public endpoints - no auth required for health/version checks
 */
api.get('/registry/health', registryHealthHandler);
api.get('/registry/registry-version', registryVersionHandler);
api.post('/registry/refresh', requireAdmin, registryRefreshHandler);
api.get('/smartrules/verification/latest', latestVerificationHandler);
api.post('/smartrules/verification/run', requireAdmin, runVerificationHandler);

/**
 * User Self-Profile endpoints
 */
api.get('/users/me', getMeHandler);
api.patch('/users/me', updateMeHandler);

/**
 * Products endpoints
 */
api.get('/products', listProductsHandler);
// LP-obs-studio-cleanup-1.1.0: Register search-mpn BEFORE :productId to avoid route shadowing
api.get('/products/search-mpn', searchProductsByMpnHandler);
api.get('/products/by-mpn/:mpn', getProductByMpnHandler);
api.get('/products/:productId', getProductHandler);
api.patch('/products/:productId/attributes', patchProductAttributesHandler);
// LP-obs-studio-cleanup-1.4.0: Observation-based suggestions endpoints
api.post('/products/:productId/suggestions', generateSuggestionsHandler);
api.post('/products/:productId/apply-suggestion', applySuggestionHandler);
// LP-obs-studio-cleanup-1.6.5: Aggregated multi-target describe endpoints
api.post('/products/:productId/describe', describeHandler);
api.post('/products/:productId/apply', applyHandler);
// LP-obs-studio-cleanup-1.6.6: Product-level observation endpoints
api.get('/products/:productId/observation', getProductObservationHandler);
api.patch('/products/:productId/observation', patchProductObservationHandler);
api.delete('/products/:productId/observation', deleteProductObservationHandler);

/**
 * Observations endpoints (LP-1.1.1)
 */
api.get('/observations', listObservationsHandler);
api.post('/observations', createObservationHandler);
api.post('/observations/analyze-image', analyzeImageStandaloneHandler);
api.get('/observations/:id', getObservationHandler);
api.patch('/observations/:id', updateObservationHandler);
api.post('/observations/:id/tags/remove', removeObservationTagHandler);
api.post('/observations/:id/analyze-image', analyzeImageHandler);

/**
 * Import, batch and sync endpoints
 */
// LP-ATTR-1.3.1.1: Add importCSV and importDryRun routes for /api/* access
api.post('/importCSV', requireAdmin, importCSVHandler);
api.post('/importDryRun', requireAdmin, importDryRunHandler);
// LP-ATTR-1.3.1.1: processImportBatch needs requireAdmin to set req.uid
api.post('/processImportBatch', requireAdmin, processImportBatchHandler);
api.get('/importBatchStatus', getBatchStatusHandler);
// PVS-0.3.1 Import preview with mapping support
api.post('/admin/imports/preview', importPreviewHandler);
// LP-1.1.0: Protect syncAttributeRegistry endpoint (require admin + dryRun default true)
api.post('/syncAttributeRegistry', requireAdmin, async (req, res) => {
  try {
    // dryRun defaults to true for safety
    const dryRun = req.body.dryRun !== false;
    const caller = (req as any).user;
    const callerUid = caller?.uid || 'unknown';
    const callerEmail = caller?.email || 'unknown';

    // Audit log
    console.log(
      `[syncAttributeRegistry] Invoked by uid=${callerUid} email=${callerEmail} dryRun=${dryRun}`
    );

    const result = await runSyncAttributeRegistry(dryRun);
    res.status(200).json(result);
  } catch (err: unknown) {
    console.error('syncAttributeRegistry error:', err);
    const message = err instanceof Error ? err.message : String(err);
    res.status(500).json({ error: 'SYNC_FAILED', message });
  }
});

/**
 * RetailOps endpoints
 */
api.post('/retailops/import-preview', requireAdmin, retailopsImportPreviewApiHandler);

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
