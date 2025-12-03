/**
 * ROPI AOSS API
 * Firebase Cloud Functions
 * 
 * Per AOSS Section 6 — API Contracts
 */

import * as admin from 'firebase-admin';
import * as functions from 'firebase-functions';
import { requireAdmin } from './middleware/auth';
import { processImportBatchHandler, getBatchStatusHandler } from './endpoints/processImportBatch';

// Initialize Firebase Admin SDK
admin.initializeApp();

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
