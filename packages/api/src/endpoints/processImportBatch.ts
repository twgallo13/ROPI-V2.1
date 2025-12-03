/**
 * Process Import Batch Endpoint
 * POST /processImportBatch
 * 
 * Converts validated import rows into products/{productId} documents.
 * Admin-only endpoint per AOSS Section 9 security rules.
 */

import type { Request, Response } from 'express';
import { processImportBatch, getBatchStatus } from '../services/productCommitService';

/**
 * Process Import Batch Handler
 * 
 * @param req - Express request with { batchId } in body
 * @param res - Express response
 */
export async function processImportBatchHandler(req: Request, res: Response) {
  try {
    // Extract batchId from body
    const { batchId } = req.body;

    if (!batchId || typeof batchId !== 'string') {
      res.status(400).json({
        success: false,
        message: 'Missing or invalid batchId',
      });
      return;
    }

    // Get user ID from auth middleware
    const userId = (req as any).uid;

    if (!userId) {
      res.status(401).json({
        success: false,
        message: 'User ID not found in request',
      });
      return;
    }

    // Process the batch
    const result = await processImportBatch(batchId, userId);

    res.status(200).json({
      success: true,
      ...result,
    });
  } catch (error) {
    console.error('Process import batch error:', error);
    const errorMessage = error instanceof Error ? error.message : 'Unknown error';
    
    res.status(500).json({
      success: false,
      message: `Failed to process import batch: ${errorMessage}`,
    });
  }
}

/**
 * Get Batch Status Handler
 * 
 * @param req - Express request with batchId query param
 * @param res - Express response
 */
export async function getBatchStatusHandler(req: Request, res: Response) {
  try {
    const { batchId } = req.query;

    if (!batchId || typeof batchId !== 'string') {
      res.status(400).json({
        success: false,
        message: 'Missing or invalid batchId',
      });
      return;
    }

    const status = await getBatchStatus(batchId);

    res.status(200).json({
      success: true,
      ...status,
    });
  } catch (error) {
    console.error('Get batch status error:', error);
    const errorMessage = error instanceof Error ? error.message : 'Unknown error';
    
    res.status(500).json({
      success: false,
      message: `Failed to get batch status: ${errorMessage}`,
    });
  }
}
