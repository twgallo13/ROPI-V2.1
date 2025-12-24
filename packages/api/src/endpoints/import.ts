/**
 * Import Endpoint
 * Per AOSS API Spec — /api/import
 * 
 * LP-2.1.8: Server-side import validation with dry-run support
 * LP-3.0.0: Fix CORS/preflight handling for browser-based imports
 * 
 * HTTP endpoint for uploading and processing RetailOps CSV imports.
 * Admin-only access.
 */

import * as functions from 'firebase-functions';
import cors from 'cors';
import Busboy from 'busboy';
import type { Request as ExpressRequest, Response as ExpressResponse } from 'express';
import { requireAdmin, type AuthenticatedRequest } from '../middleware/auth';
import { processCSVImport, validateCSVImport } from '../services/importService';

// LP-3.0.0: Allowed origins - keep narrow for staging & production
// LP-ATTR-1.3.1: Add firebaseapp.com domains for staging/prod
const ALLOWED_ORIGINS = [
  'https://ropi-aoss-staging.web.app',
  'https://ropi-aoss.web.app',
  'https://ropi-aoss-prod.web.app',
  'https://ropi-aoss-staging.firebaseapp.com',
  'https://ropi-aoss.firebaseapp.com',
];

/**
 * LP-ATTR-1.3.1: Helper to set CORS headers explicitly on every response
 * Ensures CORS headers are present even on error paths (400, 401, 500, etc.)
 * LP-ATTR-1.3.1.1: Support both Express Request and Cloud Functions Request
 */
function setCorsHeaders(res: ExpressResponse, origin: string | undefined): void {
  const allowOrigin = (!origin || ALLOWED_ORIGINS.includes(origin)) ? (origin || '*') : '';
  if (allowOrigin) {
    res.set('Access-Control-Allow-Origin', allowOrigin);
    res.set('Access-Control-Allow-Credentials', 'true');
    res.set('Access-Control-Allow-Headers', 'Content-Type,Authorization,X-Requested-With');
    res.set('Access-Control-Allow-Methods', 'GET,POST,OPTIONS');
  }
}

/**
 * LP-ATTR-1.3.1.1: Helper to get origin from request (supports both Express and Cloud Functions)
 */
function getOrigin(req: any): string | undefined {
  // Try Express/Cloud Functions .get() method first
  if (typeof req.get === 'function') {
    return req.get('Origin');
  }
  // Fall back to direct headers access for tests
  return req.headers?.origin || req.headers?.Origin;
}

// LP-3.0.0: CORS handler with proper origin validation and preflight support
const corsHandler = cors({
  origin: (origin, callback) => {
    // Allow requests with no origin (curl, servers, mobile apps)
    if (!origin) return callback(null, true);
    // Allow whitelisted origins
    if (ALLOWED_ORIGINS.includes(origin)) return callback(null, true);
    // Reject unknown origins
    return callback(new Error('Not allowed by CORS'));
  },
  credentials: true,
  methods: ['GET', 'POST', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization', 'X-Requested-With'],
});

/**
 * Parse multipart/form-data upload
 * Extracts CSV file content from request
 * 
 * LP-3.0.6: Fixed for 2nd Gen Cloud Functions (Cloud Run)
 * Uses rawBody buffer instead of req.pipe() since Cloud Run pre-buffers the body
 */
async function parseUpload(req: ExpressRequest): Promise<{
  csvContent: string;
  fileName: string;
}> {
  return new Promise((resolve, reject) => {
    const busboy = Busboy({ headers: req.headers });
    let csvContent = '';
    let fileName = 'unknown.csv';
    let fileReceived = false;

    busboy.on('file', (fieldName: string, file: NodeJS.ReadableStream, info: { filename: string }) => {
      fileName = info.filename;
      fileReceived = true;
      
      const chunks: Buffer[] = [];
      
      file.on('data', (chunk: Buffer) => {
        chunks.push(chunk);
      });
      
      file.on('end', () => {
        csvContent = Buffer.concat(chunks).toString('utf-8');
      });
    });

    busboy.on('finish', () => {
      if (!fileReceived) {
        reject(new Error('No file uploaded'));
      } else if (!csvContent) {
        reject(new Error('Empty file uploaded'));
      } else {
        resolve({ csvContent, fileName });
      }
    });

    busboy.on('error', (error: Error) => {
      reject(error);
    });

    // LP-3.0.6: 2nd Gen Cloud Functions (Cloud Run) pre-buffer the body
    // Use rawBody if available, otherwise fall back to piping
    const rawBody = (req as any).rawBody;
    if (rawBody && Buffer.isBuffer(rawBody)) {
      busboy.end(rawBody);
    } else if (typeof req.body === 'string') {
      busboy.end(Buffer.from(req.body));
    } else if (Buffer.isBuffer(req.body)) {
      busboy.end(req.body);
    } else {
      // Fallback for 1st Gen functions or emulator
      req.pipe(busboy);
    }
  });
}

/**
 * Import CSV endpoint handler
 * POST /api/import
 * 
 * Accepts multipart/form-data with CSV file
 * Admin-only access
 * 
 * LP-ATTR-1.3.1: Ensure CORS headers on all response paths
 */
async function importHandler(req: AuthenticatedRequest, res: ExpressResponse): Promise<void> {
  // LP-ATTR-1.3.1: Set CORS headers immediately
  const origin = getOrigin(req);
  setCorsHeaders(res, origin);
  
  try {
    // Only accept POST
    if (req.method !== 'POST') {
      res.status(405).json({
        error: 'Method Not Allowed',
        message: 'Only POST requests are supported',
      });
      return;
    }

    // Verify content type
    const contentType = req.headers['content-type'] || '';
    if (!contentType.includes('multipart/form-data')) {
      res.status(400).json({
        error: 'Bad Request',
        message: 'Content-Type must be multipart/form-data',
      });
      return;
    }

    // Parse upload
    const { csvContent, fileName } = await parseUpload(req);

    // Process CSV import
    const result = await processCSVImport(
      csvContent,
      fileName,
      req.auth.uid
    );

    // Return success response
    res.status(200).json({
      success: true,
      batchId: result.batch.batchId,
      fileName: result.batch.fileName,
      rowCount: result.rowCount,
      errorCount: result.errorCount,
      warningCount: result.warningCount,
      status: result.batch.status,
      createdAt: result.batch.createdAt,
    });
  } catch (error) {
    console.error('Import failed:', error);
    
    const errorMessage = error instanceof Error ? error.message : 'Unknown error';
    
    // LP-ATTR-1.3.1: Ensure CORS headers on error response
    const origin = getOrigin(req);
    setCorsHeaders(res, origin);
    
    res.status(500).json({
      error: 'Import Failed',
      message: errorMessage,
    });
  }
}

/**
 * LP-2.1.8: Import dry-run validation endpoint
 * POST /api/admin/imports/dry-run
 * 
 * Validates CSV against attribute registry without persisting.
 * Returns per-row diagnostics.
 * 
 * LP-ATTR-1.3.1: Ensure CORS headers on all response paths
 */
async function dryRunHandler(req: AuthenticatedRequest, res: ExpressResponse): Promise<void> {
  // LP-ATTR-1.3.1: Set CORS headers immediately
  const origin = getOrigin(req);
  setCorsHeaders(res, origin);
  
  try {
    // Only accept POST
    if (req.method !== 'POST') {
      res.status(405).json({
        error: 'Method Not Allowed',
        message: 'Only POST requests are supported',
      });
      return;
    }

    // Verify content type
    const contentType = req.headers['content-type'] || '';
    if (!contentType.includes('multipart/form-data')) {
      res.status(400).json({
        error: 'Bad Request',
        message: 'Content-Type must be multipart/form-data',
      });
      return;
    }

    // Parse upload
    const { csvContent, fileName } = await parseUpload(req);

    // Validate CSV (dry-run only)
    const validationResult = await validateCSVImport(csvContent, { saveReport: true });

    // Return validation diagnostics
    res.status(200).json({
      success: true,
      mode: 'dry-run',
      fileName,
      ...validationResult,
    });
  } catch (error) {
    console.error('Import validation failed:', error);
    
    const errorMessage = error instanceof Error ? error.message : 'Unknown error';
    
    // LP-ATTR-1.3.1: Ensure CORS headers on error response
    const origin = getOrigin(req);
    setCorsHeaders(res, origin);
    
    res.status(500).json({
      error: 'Validation Failed',
      message: errorMessage,
    });
  }
}

/**
 * LP-3.0.0: Helper to handle preflight OPTIONS requests
 */
function handlePreflight(req: functions.https.Request, res: functions.Response): boolean {
  if (req.method === 'OPTIONS') {
    // Preflight handled by cors middleware, just return 204
    res.status(204).send('');
    return true;
  }
  return false;
}

/**
 * LP-ATTR-1.3.1.1: Export Express handlers for apiApp routing
 * These are used by apiApp.ts to mount under /api/importCSV
 */
export { importHandler as importCSVHandler };
export { dryRunHandler as importDryRunHandler };

/**
 * Export Cloud Function with admin auth middleware and CORS
 * LP-3.0.0: Explicit preflight handling before auth check
 * LP-ATTR-1.3.1: Set CORS headers before any processing to ensure they're on all responses
 */
export const importCSV = functions.https.onRequest((req, res) => {
  // LP-ATTR-1.3.1: Set CORS headers FIRST, before any middleware
  const origin = getOrigin(req);
  setCorsHeaders(res as any, origin);
  
  // Handle preflight early
  if (req.method === 'OPTIONS') {
    res.status(204).send('');
    return;
  }
  
  corsHandler(req as any, res as any, async () => {
    await requireAdmin(req, res, async () => {
      await importHandler(req as unknown as AuthenticatedRequest, res);
    });
  });
});

/**
 * LP-2.1.8: Dry-run validation endpoint
 * POST /api/admin/imports/dry-run
 * LP-3.0.0: Explicit preflight handling
 * LP-ATTR-1.3.1: Set CORS headers before any processing to ensure they're on all responses
 */
export const importDryRun = functions.https.onRequest((req, res) => {
  // LP-ATTR-1.3.1: Set CORS headers FIRST, before any middleware
  const origin = getOrigin(req);
  setCorsHeaders(res as any, origin);
  
  // Handle preflight early
  if (req.method === 'OPTIONS') {
    res.status(204).send('');
    return;
  }
  
  corsHandler(req as any, res as any, async () => {
    await requireAdmin(req, res, async () => {
      await dryRunHandler(req as unknown as AuthenticatedRequest, res);
    });
  });
});
