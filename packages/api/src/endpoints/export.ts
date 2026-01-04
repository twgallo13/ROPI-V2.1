/**
 * Export Endpoints
 * LP-2.1.9 — Export & PDP Alignment
 * 
 * Admin endpoints for exporting product data:
 * - POST /api/admin/exports/dry-run - Preview export with sample data
 * - POST /api/admin/exports - Run full export
 * - GET /api/admin/exports/preview - Get export column preview
 */

import * as functions from 'firebase-functions';
import * as admin from 'firebase-admin';
import express from 'express';
import cors from 'cors';
import { requireAdmin } from '../middleware/auth';
import {
  runDryRunExport,
  runFullExport,
  saveExportToFile,
  loadExportableAttributes,
  getExportColumnHeaders,
  type ExportOptions,
  type DryRunResult,
  type ExportResult
} from '../services/exportService';
import { 
  calculateCompletionDrivenExportReadiness,
  type CompletionDrivenExportReadiness
} from '../services/completionDrivenExportReadiness';

// Initialize express app
const app = express();
app.use(cors({ origin: true }));
app.use(express.json());

// ============================================================================
// Handlers
// ============================================================================

/**
 * POST /api/admin/exports/dry-run
 * Run export preview with sample products
 */
export async function dryRunExportHandler(
  req: express.Request,
  res: express.Response
): Promise<void> {
  try {
    const options: ExportOptions = {
      site: req.body.site,
      limit: req.body.limit || 10,
      includeMeta: req.body.includeMeta === true,
      format: req.body.format || 'ro_csv',
      multiSelectDelimiter: req.body.multiSelectDelimiter || '|'
    };

    console.log('[Export] Running dry-run with options:', options);

    // COMPLETION GATE: Check export readiness before processing
    // GOVERNANCE: Capture timestamp at request start for deterministic evaluation
    const evaluatedAt = new Date().toISOString();
    console.log('[Export] Checking completion-driven export readiness...', { evaluatedAt });
    const readinessResult = await calculateCompletionDrivenExportReadiness(undefined, false, evaluatedAt);
    
    if (!readinessResult.ready) {
      console.log('[Export] BLOCKED: Export not ready due to completion requirements:', {
        ready: readinessResult.ready,
        completionPct: readinessResult.completionPct,
        threshold: readinessResult.threshold,
        blockingReasons: readinessResult.blockingReasons.length
      });
      
      res.status(423).json({
        success: false,
        error: 'EXPORT_BLOCKED_COMPLETION_GATE',
        message: 'Export blocked by completion requirements',
        readiness: readinessResult
      });
      return;
    }
    
    console.log('[Export] Completion gate passed - proceeding with dry-run');

    const result = await runDryRunExport(options);

    console.log('[Export] Dry-run complete:', {
      totalProducts: result.summary.totalProducts,
      exportedProducts: result.summary.exportedProducts,
      exportReady: result.summary.exportReadyCount
    });

    res.status(200).json({
      success: true,
      ...result
    });
  } catch (error) {
    console.error('[Export] Dry-run error:', error);
    const message = error instanceof Error ? error.message : 'Unknown error';
    res.status(500).json({
      success: false,
      error: 'EXPORT_DRY_RUN_FAILED',
      message
    });
  }
}

/**
 * POST /api/admin/exports
 * Run full export and save to file
 */
export async function runExportHandler(
  req: express.Request,
  res: express.Response
): Promise<void> {
  try {
    const options: ExportOptions = {
      site: req.body.site,
      limit: req.body.limit,
      includeMeta: req.body.includeMeta === true,
      format: req.body.format || 'ro_csv',
      multiSelectDelimiter: req.body.multiSelectDelimiter || '|',
      pageSize: req.body.pageSize || 1000
    };

    console.log('[Export] Running full export with options:', options);

    // COMPLETION GATE: Check export readiness before processing
    // GOVERNANCE: Capture timestamp at request start for deterministic evaluation
    const evaluatedAt = new Date().toISOString();
    console.log('[Export] Checking completion-driven export readiness...', { evaluatedAt });
    const readinessResult = await calculateCompletionDrivenExportReadiness(undefined, false, evaluatedAt);
    
    if (!readinessResult.ready) {
      console.log('[Export] BLOCKED: Export not ready due to completion requirements:', {
        ready: readinessResult.ready,
        completionPct: readinessResult.completionPct,
        threshold: readinessResult.threshold,
        blockingReasons: readinessResult.blockingReasons.length
      });
      
      res.status(423).json({
        success: false,
        error: 'EXPORT_BLOCKED_COMPLETION_GATE',
        message: 'Export blocked by completion requirements',
        readiness: readinessResult
      });
      return;
    }
    
    console.log('[Export] Completion gate passed - proceeding with full export');

    // Run export
    const result = await runFullExport(options);

    console.log('[Export] Export complete:', {
      totalProducts: result.summary.totalProducts,
      exportedProducts: result.summary.exportedProducts,
      exportReady: result.summary.exportReadyCount
    });

    // Save to file if not a simple preview
    let filePaths: { csvPath: string; summaryPath: string } | null = null;
    if (req.body.save !== false) {
      try {
        // For cloud functions, use /tmp
        const basePath = process.env.EXPORT_BASE_PATH || '/tmp/reports/exports';
        filePaths = await saveExportToFile(result, basePath);
        console.log('[Export] Files saved:', filePaths);
      } catch (saveError) {
        console.warn('[Export] Could not save files:', saveError);
        // Continue without file save - return CSV content in response
      }
    }

    res.status(200).json({
      success: true,
      timestamp: result.timestamp,
      summary: result.summary,
      columnHeaders: result.columnHeaders,
      rowCount: result.rows.length,
      filePaths,
      // Include CSV content if small enough or files couldn't be saved
      csvContent: result.rows.length <= 100 || !filePaths ? result.csvContent : undefined
    });
  } catch (error) {
    console.error('[Export] Export error:', error);
    const message = error instanceof Error ? error.message : 'Unknown error';
    res.status(500).json({
      success: false,
      error: 'EXPORT_FAILED',
      message
    });
  }
}

/**
 * GET /api/admin/exports/preview
 * Get export column headers and attribute info
 */
export async function previewExportHandler(
  req: express.Request,
  res: express.Response
): Promise<void> {
  try {
    const site = req.query.site as string | undefined;
    const includeMeta = req.query.includeMeta === 'true';

    // Load exportable attributes
    const attributes = await loadExportableAttributes(site);
    const headers = getExportColumnHeaders(attributes, includeMeta);

    // Build attribute info
    const attributeInfo = Array.from(attributes.entries()).map(([id, def]) => ({
      id,
      label: def.label,
      dataType: def.data_type,
      requiredForExport: def.required_for_export || def.requiredForExport || false,
      allowedValues: def.allowed_values,
      category: def.category
    }));

    res.status(200).json({
      success: true,
      site: site || null,
      includeMeta,
      columnHeaders: headers,
      columnCount: headers.length,
      attributes: attributeInfo,
      attributeCount: attributes.size
    });
  } catch (error) {
    console.error('[Export] Preview error:', error);
    const message = error instanceof Error ? error.message : 'Unknown error';
    res.status(500).json({
      success: false,
      error: 'EXPORT_PREVIEW_FAILED',
      message
    });
  }
}

// ============================================================================
// Routes
// ============================================================================

// Dry-run endpoint
app.post('/dry-run', (req, res) => {
  requireAdmin(req, res, () => dryRunExportHandler(req, res));
});

// Full export endpoint
app.post('/', (req, res) => {
  requireAdmin(req, res, () => runExportHandler(req, res));
});

// Preview endpoint
app.get('/preview', (req, res) => {
  requireAdmin(req, res, () => previewExportHandler(req, res));
});

// ============================================================================
// Cloud Functions
// ============================================================================

/**
 * Export API Cloud Function
 * Mounted at /api/admin/exports
 */
export const exportApi = functions.https.onRequest(app);

/**
 * Standalone dry-run function for direct invocation
 */
export const exportDryRun = functions.https.onRequest(async (req, res) => {
  // Set CORS headers
  res.set('Access-Control-Allow-Origin', '*');
  res.set('Access-Control-Allow-Methods', 'POST, OPTIONS');
  res.set('Access-Control-Allow-Headers', 'Content-Type, Authorization');

  if (req.method === 'OPTIONS') {
    res.status(204).send('');
    return;
  }

  if (req.method !== 'POST') {
    res.status(405).json({ error: 'Method not allowed' });
    return;
  }

  await requireAdmin(req as express.Request, res as express.Response, async () => {
    await dryRunExportHandler(req as express.Request, res as express.Response);
  });
});

/**
 * Standalone full export function for direct invocation
 */
export const exportRun = functions.https.onRequest(async (req, res) => {
  // Set CORS headers
  res.set('Access-Control-Allow-Origin', '*');
  res.set('Access-Control-Allow-Methods', 'POST, OPTIONS');
  res.set('Access-Control-Allow-Headers', 'Content-Type, Authorization');

  if (req.method === 'OPTIONS') {
    res.status(204).send('');
    return;
  }

  if (req.method !== 'POST') {
    res.status(405).json({ error: 'Method not allowed' });
    return;
  }

  await requireAdmin(req as express.Request, res as express.Response, async () => {
    await runExportHandler(req as express.Request, res as express.Response);
  });
});
