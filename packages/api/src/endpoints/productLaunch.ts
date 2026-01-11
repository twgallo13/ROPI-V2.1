/**
 * Product Launch Endpoints
 * 
 * Launch product creation and management
 */

import * as admin from 'firebase-admin';
import { requireAdmin, type AuthenticatedRequest } from '../middleware/auth';
import type { Request, Response } from 'express';
import { normalizeMpn } from '@ropi-aoss/sdk';

/**
 * POST /api/products/:mpn/launch
 * 
 * Save launch metadata on product document
 * 
 * Request body:
 * - isLaunch: boolean (required, must be true)
 * - launchDate: string (required ISO date)
 * - comments?: string (optional)
 * - images: array (required, must have at least 1 image)
 * - metadata?: object (optional additional metadata)
 * 
 * Response:
 * - launch: object - Saved launch metadata
 */
export async function createLaunchHandler(req: Request, res: Response) {
  await requireAdmin(req, res, async () => {
    const mpn = req.params.mpn;
    const { isLaunch, launchDate, comments, images, metadata } = req.body;
    
    if (!mpn) {
      res.status(400).json({ 
        error: 'MISSING_MPN', 
        message: 'MPN is required' 
      });
      return;
    }

    // Validate required fields
    if (isLaunch !== true) {
      res.status(400).json({ 
        error: 'INVALID_IS_LAUNCH', 
        message: 'isLaunch must be true for launch products' 
      });
      return;
    }

    if (!launchDate || typeof launchDate !== 'string') {
      res.status(400).json({ 
        error: 'MISSING_LAUNCH_DATE', 
        message: 'launchDate is required and must be an ISO date string' 
      });
      return;
    }

    // Validate launchDate is a valid date
    const parsedDate = new Date(launchDate);
    if (isNaN(parsedDate.getTime())) {
      res.status(400).json({ 
        error: 'INVALID_LAUNCH_DATE', 
        message: 'launchDate must be a valid ISO date string' 
      });
      return;
    }

    if (!Array.isArray(images) || images.length === 0) {
      res.status(400).json({ 
        error: 'MISSING_IMAGES', 
        message: 'images array is required and must contain at least one image' 
      });
      return;
    }

    try {
      const normalizedMpn = normalizeMpn(mpn);
      
      if (!normalizedMpn) {
        res.status(400).json({ 
          error: 'INVALID_MPN', 
          message: 'MPN normalization failed' 
        });
        return;
      }

      const db = admin.firestore();
      const productRef = db.collection('products').doc(normalizedMpn);

      // Get actor from auth context
      const authReq = req as AuthenticatedRequest;
      const actor = authReq.auth?.uid || 'system';
      const now = new Date().toISOString();

      // Build launch metadata object
      const launchData = {
        isLaunch: true,
        launchDate,
        comments: comments || null,
        images,
        metadata: metadata || {},
        createdAt: now,
        createdBy: actor,
        updatedAt: now,
        updatedBy: actor,
      };

      await db.runTransaction(async (transaction) => {
        const productDoc = await transaction.get(productRef);
        
        if (!productDoc.exists) {
          throw new Error(`Product not found for MPN: ${mpn}`);
        }

        // Update the product with launch metadata
        transaction.update(productRef, {
          launch: launchData,
          status: 'launch', // Update status to indicate this is a launch product
          updatedAt: now,
          updatedBy: actor,
        });
      });

      console.log(`✅ Created launch product for MPN: "${mpn}" with launch date: ${launchDate}`);

      res.status(200).json({
        message: 'Launch product created successfully',
        launch: launchData,
      });
    } catch (error) {
      console.error('Error creating launch product:', error);
      
      if (error instanceof Error && error.message.includes('Product not found')) {
        res.status(404).json({ 
          error: 'PRODUCT_NOT_FOUND', 
          message: error.message 
        });
        return;
      }

      res.status(500).json({ 
        error: 'INTERNAL_ERROR', 
        message: 'Failed to create launch product' 
      });
    }
  });
}

/**
 * GET /api/products/:mpn/launch
 * 
 * Get launch metadata for a product
 * 
 * Response:
 * - launch: object - Launch metadata
 */
export async function getLaunchHandler(req: Request, res: Response) {
  await requireAdmin(req, res, async () => {
    const mpn = req.params.mpn;
    
    if (!mpn) {
      res.status(400).json({ 
        error: 'MISSING_MPN', 
        message: 'MPN is required' 
      });
      return;
    }

    try {
      const normalizedMpn = normalizeMpn(mpn);
      
      if (!normalizedMpn) {
        res.status(400).json({ 
          error: 'INVALID_MPN', 
          message: 'MPN normalization failed' 
        });
        return;
      }

      const db = admin.firestore();
      const productRef = db.collection('products').doc(normalizedMpn);
      const productDoc = await productRef.get();

      if (!productDoc.exists) {
        res.status(404).json({ 
          error: 'PRODUCT_NOT_FOUND', 
          message: `Product not found for MPN: ${mpn}` 
        });
        return;
      }

      const productData = productDoc.data()!;
      const launch = productData.launch || null;

      if (!launch) {
        res.status(404).json({ 
          error: 'NO_LAUNCH_DATA', 
          message: 'Product is not configured as a launch product' 
        });
        return;
      }

      res.status(200).json({
        launch,
      });
    } catch (error) {
      console.error('Error fetching launch data:', error);
      res.status(500).json({ 
        error: 'INTERNAL_ERROR', 
        message: 'Failed to fetch launch data' 
      });
    }
  });
}