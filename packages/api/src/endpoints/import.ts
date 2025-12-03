/**
 * Import Endpoint
 * Per AOSS API Spec — /api/import
 * 
 * HTTP endpoint for uploading and processing RetailOps CSV imports.
 * Admin-only access.
 */

import * as functions from 'firebase-functions';
import Busboy from 'busboy';
import type { Request as ExpressRequest, Response as ExpressResponse } from 'express';
import { requireAdmin, type AuthenticatedRequest } from '../middleware/auth';
import { processCSVImport } from '../services/importService';

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

/**
 * Import CSV endpoint handler
 * POST /api/import
 * 
 * Accepts multipart/form-data with CSV file
 * Admin-only access
 */
async function importHandler(req: AuthenticatedRequest, res: ExpressResponse): Promise<void> {
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
    
    res.status(500).json({
      error: 'Import Failed',
      message: errorMessage,
    });
  }
}

/**
 * Export Cloud Function with admin auth middleware
 */
export const importCSV = functions.https.onRequest(async (req, res) => {
  // Apply admin auth middleware
  await requireAdmin(req, res, async () => {
    await importHandler(req as unknown as AuthenticatedRequest, res);
  });
});
