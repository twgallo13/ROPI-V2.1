/**
 * Create Product Endpoint
 * 
 * POST /api/products - Create draft product by MPN only
 * 
 * Implementation constraints:
 * - Firestore product document id = normalized_mpn (normalized canonical MPN)
 * - Do not introduce any productId/id fields anywhere
 * - MPN is immutable and canonical identifier
 * - Environment variable required: PRODUCT_IMAGES_BUCKET
 */

import * as admin from 'firebase-admin';
import { requireAdmin, type AuthenticatedRequest } from '../middleware/auth';
import type { Request, Response } from 'express';
import { normalizeMpn } from '@ropi-aoss/sdk';

/**
 * POST /api/products
 * 
 * Create draft product by MPN only.
 * 
 * Request body:
 * - mpn: string (required) - The manufacturer part number
 * 
 * Response:
 * - 201: Product created successfully
 * - 200: Product already exists  
 * - 400: Invalid input or normalization failed
 * - 500: Server error
 */
export async function createProductHandler(req: Request, res: Response) {
  await requireAdmin(req, res, async () => {
    const { mpn } = req.body;
    
    if (!mpn || typeof mpn !== 'string' || mpn.trim().length === 0) {
      res.status(400).json({ 
        error: 'MISSING_MPN', 
        message: 'MPN is required and must be a non-empty string' 
      });
      return;
    }

    const trimmedMpn = mpn.trim();

    try {
      // Normalize MPN using canonical normalizer from SDK
      const normalizedMpn = normalizeMpn(trimmedMpn);
      
      if (!normalizedMpn || normalizedMpn.length === 0) {
        res.status(400).json({ 
          error: 'INVALID_MPN', 
          message: 'MPN normalization failed - invalid MPN format' 
        });
        return;
      }

      const db = admin.firestore();
      
      // Get actor from auth context
      const authReq = req as AuthenticatedRequest;
      const actor = authReq.auth?.uid || 'system';
      const now = new Date().toISOString();

      // Use Firestore transaction to create doc at products/{normalized_mpn}
      const result = await db.runTransaction(async (transaction) => {
        const productRef = db.collection('products').doc(normalizedMpn);
        const productDoc = await transaction.get(productRef);
        
        if (productDoc.exists) {
          // Product already exists, return existing product
          return {
            existed: true,
            product: {
              id: productDoc.id,
              ...productDoc.data(),
            }
          };
        }

        // Create new product with required fields
        const productData = {
          mpn: trimmedMpn,
          normalized_mpn: normalizedMpn,
          status: 'draft',
          sku: null,
          attributes: {},
          createdAt: now,
          updatedAt: now,
          createdBy: actor,
          updatedBy: actor,
        };

        transaction.create(productRef, productData);
        
        return {
          existed: false,
          product: {
            id: normalizedMpn,
            ...productData,
          }
        };
      });

      if (result.existed) {
        console.log(`✅ Product already exists for MPN: "${trimmedMpn}" (normalized: "${normalizedMpn}")`);
        res.status(200).json({
          message: 'Product already exists',
          existed: true,
          product: result.product,
        });
      } else {
        console.log(`🆕 Created new product for MPN: "${trimmedMpn}" (normalized: "${normalizedMpn}")`);
        res.status(201).json({
          message: 'Product created successfully',
          existed: false,
          product: result.product,
        });
      }
    } catch (error) {
      console.error('Error creating product:', error);
      
      if (error instanceof Error) {
        if (error.message.includes('normalizeMpn')) {
          res.status(400).json({ 
            error: 'INVALID_MPN', 
            message: `MPN normalization failed: ${error.message}` 
          });
          return;
        }
      }
      
      res.status(500).json({ 
        error: 'INTERNAL_ERROR', 
        message: 'Failed to create product' 
      });
    }
  });
}