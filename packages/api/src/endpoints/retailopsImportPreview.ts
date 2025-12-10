/**
 * RetailOps Import Preview Endpoint
 * Per AOSS API Spec — /api/retailops/import-preview
 * 
 * HTTP endpoint for previewing RetailOps CSV imports without persistence.
 * Returns stats, skipped rows, and sample products.
 * Admin-only access.
 */

import * as functions from 'firebase-functions';
import cors from 'cors';
import Busboy from 'busboy';
import type { Request as ExpressRequest, Response as ExpressResponse } from 'express';
import { requireAdmin, type AuthenticatedRequest } from '../middleware/auth';
import { retailOpsCsvToCoreProductsWithDetails, type CoreProduct } from '@ropi-aoss/sdk';

// CORS handler for staging and production origins
const corsHandler = cors({
  origin: ['https://ropi-aoss-staging.web.app', 'https://ropi-aoss.web.app'],
  methods: ['POST', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization'],
});

/**
 * Parse multipart/form-data upload
 * Extracts CSV file content from request
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

    // Pipe request into busboy
    req.pipe(busboy);
  });
}

export interface RetailOpsImportPreviewResponse {
  stats: {
    totalRows: number;
    coreProducts: number;
    skipped: number;
  };
  skipped: Array<{
    rowNumber: number;
    reason: string;
  }>;
  sampleCoreProducts: CoreProduct[];
}

/**
 * RetailOps Import Preview endpoint handler
 * POST /api/retailops/import-preview
 *
 * Accepts multipart/form-data with CSV file
 * Returns preview of import results without persistence
 * Admin-only access
 */
async function retailopsImportPreviewHandler(
  req: AuthenticatedRequest,
  res: ExpressResponse
): Promise<void> {
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
    let csvContent: string;
    try {
      const parsed = await parseUpload(req);
      csvContent = parsed.csvContent;
    } catch (error: any) {
      res.status(400).json({
        error: 'Bad Request',
        message: error.message || 'Failed to parse file upload',
      });
      return;
    }

    // Parse and process CSV
    let result;
    try {
      result = retailOpsCsvToCoreProductsWithDetails(csvContent);
    } catch (error: any) {
      res.status(422).json({
        error: 'Unprocessable Entity',
        message: 'Failed to parse CSV',
        details: error.message,
      });
      return;
    }

    // Extract sample products (first 3-5)
    const sampleSize = Math.min(5, result.products.length);
    const sampleCoreProducts = result.products.slice(0, sampleSize);

    // Build response
    const response: RetailOpsImportPreviewResponse = {
      stats: {
        totalRows: result.totalRows,
        coreProducts: result.products.length,
        skipped: result.skipped.length,
      },
      skipped: result.skipped.map((skip) => ({
        rowNumber: skip.rowNumber,
        reason: skip.reason,
      })),
      sampleCoreProducts,
    };

    res.status(200).json(response);
  } catch (error: any) {
    console.error('Unexpected error in retailops import preview:', error);
    res.status(500).json({
      error: 'Internal Server Error',
      message: error.message || 'An unexpected error occurred',
    });
  }
}

/**
 * Export the endpoint handler
 * Used in apiApp.ts to mount the endpoint
 */
export function createRetailopsImportPreviewEndpoint() {
  return functions.https.onRequest((req: ExpressRequest, res: ExpressResponse) => {
    corsHandler(req, res, async () => {
      // Handle CORS preflight
      if (req.method === 'OPTIONS') {
        res.sendStatus(204);
        return;
      }

      // Require admin authentication
      try {
        await requireAdmin(req as AuthenticatedRequest, res, async () => {
          await retailopsImportPreviewHandler(req as AuthenticatedRequest, res);
        });
      } catch (error: any) {
        res.status(401).json({
          error: 'Unauthorized',
          message: 'Admin authentication required',
        });
      }
    });
  });
}

/**
 * Handler function for use in Express app
 */
export const retailopsImportPreviewApiHandler = async (
  req: AuthenticatedRequest,
  res: ExpressResponse
): Promise<void> => {
  corsHandler(req, res, async () => {
    // Handle CORS preflight
    if (req.method === 'OPTIONS') {
      res.sendStatus(204);
      return;
    }

    // Check authentication
    if (!req.user) {
      res.status(401).json({
        error: 'Unauthorized',
        message: 'Authentication required',
      });
      return;
    }

    await retailopsImportPreviewHandler(req, res);
  });
};
