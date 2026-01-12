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
import { resolveProductIdentifier } from './lib/resolveProductIdentifier';

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

// LP-phase2b-003: Evaluator admin endpoints
import {
  getEvaluatorStatus,
  refreshEvaluatorRegistry,
} from './endpoints/admin/evaluator';

// LP-smart-rules-server-validation-1.0.0: Smart Rules validation endpoint
import {
  validateSmartRuleHandler,
  normalizeSmartRuleHandler,
  getImportEvalHandler,
} from './endpoints/adminSmartRules';

// Smart Rules CRUD endpoints
import {
  createRuleHandler,
  updateRuleHandler,
} from './endpoints/rules';
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
  getProductCompletionHandler,
  deleteProductHandler,
  bulkDeleteProductsHandler,
} from './endpoints/products';

// Create Product handler
import {
  createProductHandler,
} from './endpoints/createProduct';

// Product Images handlers
import {
  signImageUploadHandler,
  registerImageHandler,
  getImageViewUrlHandler,
} from './endpoints/productImages';

// Product Launch handlers
import {
  createLaunchHandler,
  getLaunchHandler,
} from './endpoints/productLaunch';

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

// LP-export-ui-readiness-1.0.0: Export readiness endpoint
import { readinessHandler } from './endpoints/export';

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

// Segment Settings Handler (Option A - Binary Segment Evaluator)
import segmentSettingsRouter from './handlers/segmentSettingsHandler';

const app: Application = express();
const api: Router = Router();

// Allow CORS from any origin (handlers themselves perform requireAdmin where needed)
const corsOptions = {
  origin: true,
  methods: ['GET', 'POST', 'PATCH', 'PUT', 'DELETE', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization', 'X-Requested-With'],
  credentials: true
};
app.use(cors(corsOptions));

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
 * Admin Evaluator endpoints
 * LP-phase2b-003: Registry observability and control
 */
api.get('/admin/evaluator/status', getEvaluatorStatus);
api.post('/admin/evaluator/refresh', refreshEvaluatorRegistry);

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
 * Segment Settings endpoints (Option A - Binary Segment Evaluator)
 */
api.use('/admin/settings/segments', segmentSettingsRouter);

/**
 * Admin Smart Rules validation endpoints (LP-smart-rules-server-validation-1.0.0)
 */
api.post('/admin/validateSmartRule', validateSmartRuleHandler);
api.post('/admin/normalizeSmartRule', normalizeSmartRuleHandler);
api.get('/admin/import-eval/:productId', getImportEvalHandler);

/**
 * Smart Rules CRUD endpoints with validation (Step 2.2)
 */
api.post('/admin/rules', requireAdmin, createRuleHandler);
api.put('/admin/rules/:ruleId', requireAdmin, updateRuleHandler);

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
api.post('/products', createProductHandler);
api.get('/products', listProductsHandler);
// LP-obs-studio-cleanup-1.1.0: Register search-mpn BEFORE :productId to avoid route shadowing
api.get('/products/search-mpn', searchProductsByMpnHandler);
api.get('/products/by-mpn/:mpn', getProductByMpnHandler);
// LP-products-list-remediation-006: Register bulk-delete BEFORE :productId routes
api.post('/products/bulk-delete', bulkDeleteProductsHandler);
  api.get('/products/:mpn/completion', resolveProductIdentifier, getProductCompletionHandler);
  api.get('/products/:mpn', resolveProductIdentifier, getProductHandler);
api.patch('/products/:mpn/attributes', resolveProductIdentifier, patchProductAttributesHandler);

// Image upload endpoints - use :mpn parameter for MPN-based routing
api.post('/products/:mpn/images/sign', resolveProductIdentifier, signImageUploadHandler);
api.post('/products/:mpn/images', resolveProductIdentifier, registerImageHandler);
api.get('/products/:mpn/images/:imageId/url', resolveProductIdentifier, getImageViewUrlHandler);

// Launch endpoints - use :mpn parameter for MPN-based routing  
api.post('/products/:mpn/launch', resolveProductIdentifier, createLaunchHandler);
api.get('/products/:mpn/launch', resolveProductIdentifier, getLaunchHandler);
// LP-obs-studio-cleanup-1.4.0: Observation-based suggestions endpoints
api.post('/products/:mpn/suggestions', resolveProductIdentifier, generateSuggestionsHandler);
api.post('/products/:mpn/apply-suggestion', resolveProductIdentifier, applySuggestionHandler);
// LP-obs-studio-cleanup-1.6.5: Aggregated multi-target describe endpoints
api.post('/products/:mpn/describe', resolveProductIdentifier, describeHandler);
api.post('/products/:mpn/apply', resolveProductIdentifier, applyHandler);
// LP-obs-studio-cleanup-1.6.6: Product-level observation endpoints
api.get('/products/:mpn/observation', resolveProductIdentifier, getProductObservationHandler);
api.patch('/products/:mpn/observation', resolveProductIdentifier, patchProductObservationHandler);
api.delete('/products/:mpn/observation', resolveProductIdentifier, deleteProductObservationHandler);
// LP-products-list-remediation-006: Delete single product
api.delete('/products/:mpn', resolveProductIdentifier, deleteProductHandler);

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
// LP-export-ui-readiness-1.0.0: Export readiness endpoint
api.get('/admin/exports/readiness', requireAdmin, readinessHandler);
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

// Also mount at root for direct function calls (without hosting rewrites)
app.use('/', api);

// Add startup logging to show all registered routes
function logRegisteredRoutes() {
  console.log('🚀 API Routes Registered:');
  
  // Log the main app routes
  app._router?.stack?.forEach((middleware: any) => {
    if (middleware.route) {
      const methods = Object.keys(middleware.route.methods).join(', ').toUpperCase();
      console.log(`  [APP] ${methods} ${middleware.route.path}`);
    } else if (middleware.name === 'router' && middleware.regexp?.source) {
      const path = middleware.regexp.source.replace(/\\\//g, '/').replace(/\?\$/, '');
      console.log(`  [MOUNT] Router mounted at: ${path}`);
    }
  });
  
  // Log the API router routes
  console.log('  📍 API Router routes available at both /api/<path> and /<path>:');
  api.stack?.forEach((layer: any) => {
    if (layer.route) {
      const methods = Object.keys(layer.route.methods).join(', ').toUpperCase();
      const apiPath = `/api${layer.route.path}`;
      const rootPath = `${layer.route.path}`;
      console.log(`    ${methods} ${apiPath} OR ${rootPath}`);
    } else if (layer.name === 'router' && layer.regexp) {
      const mountPath = layer.regexp.source.replace(/\\\//g, '/').replace(/\?\$/, '');
      console.log(`    [SUBROUTER] ${mountPath}`);
    }
  });
  
  console.log('✅ Route registration complete');
}

// Call logging function when module is loaded
logRegisteredRoutes();

// Export both default and named for test compatibility
export const apiApp = app;
export default app;
