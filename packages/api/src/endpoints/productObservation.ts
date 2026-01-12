/**
 * Product Observation Endpoint
 * 
 * LP-obs-studio-cleanup-1.6.6: Collapse observations into product-level tags.
 * 
 * PATCH /api/products/:productId/observation
 * 
 * Replaces standalone observation documents with a single product.observation
 * object containing tags only. This simplifies the data model and aligns
 * mobile and desktop capture flows.
 * 
 * Features:
 * - Product-level observation tags (no separate collection)
 * - Activity log audit trail
 * - Source tracking (mobile/desktop)
 * - Image references (optional)
 * 
 * References:
 * - Product Completion Workflows (W2): https://www.notion.so/2ba45ee1ec5a80698690f9492961ed8b
 */

import * as admin from 'firebase-admin';
import type { Request, Response } from 'express';
import { requireAuth, type AuthenticatedRequest } from '../middleware/auth';

// ============================================
// Types
// ============================================

interface ProductObservationBody {
  /** Tags to set on the product observation */
  tags: string[];
  /** Optional image URLs associated with the observation */
  images?: string[];
  /** Source of the observation update (mobile/desktop) */
  source?: 'mobile' | 'desktop' | 'api';
  /** Optional action: 'add', 'remove', or 'set' (default: 'set') */
  action?: 'add' | 'remove' | 'set';
}

interface ProductObservation {
  tags: string[];
  images: string[];
  updatedAt: string;
  updatedBy: string;
  source: string;
}

// ============================================
// Handlers
// ============================================

/**
 * PATCH /api/products/:productId/observation
 * 
 * LP-obs-studio-cleanup-1.6.6: Update product-level observation (tags-only).
 * 
 * Request body:
 * {
 *   "tags": ["hidden pocket", "runs small"],
 *   "images": ["https://.../img1.jpg"],
 *   "source": "mobile",
 *   "action": "set" // or "add" or "remove"
 * }
 * 
 * Response:
 * {
 *   "success": true,
 *   "productId": "...",
 *   "observation": { "tags": [...], "images": [...], "updatedAt": "...", "updatedBy": "..." }
 * }
 */
export async function patchProductObservationHandler(req: Request, res: Response) {
  await requireAuth(req, res, async () => {
    // Get product reference from resolveProductIdentifier middleware
    const productRef = res.locals.productDocRef;
    const body = req.body as ProductObservationBody;

    // Validate required fields
    if (!productRef) {
      res.status(400).json({
        error: 'MISSING_PRODUCT_ID',
        message: 'Product ID is required',
      });
      return;
    }

    if (!body.tags || !Array.isArray(body.tags)) {
      res.status(400).json({
        error: 'MISSING_TAGS',
        message: 'tags array is required',
      });
      return;
    }

    // Validate tags are strings
    const invalidTags = body.tags.filter(tag => typeof tag !== 'string');
    if (invalidTags.length > 0) {
      res.status(400).json({
        error: 'INVALID_TAGS',
        message: 'All tags must be strings',
      });
      return;
    }

    const db = admin.firestore();
    const action = body.action || 'set';
    const source = body.source || 'api';
    const images = body.images || [];

    try {
      // Use the resolved product reference from middleware (already exists check done)
      const productDoc = await productRef.get();

      if (!productDoc.exists) {
        res.status(404).json({
          error: 'PRODUCT_NOT_FOUND',
          message: `Product '${productRef.id}' not found`,
        });
        return;
      }

      const authReq = req as AuthenticatedRequest;
      const actor = authReq.auth?.uid || 'system';
      const actorEmail = authReq.auth?.email || authReq.auth?.name || 'unknown';
      const now = new Date().toISOString();

      // Get current observation data
      const productData = productDoc.data() || {};
      const currentObservation = productData.observation || { tags: [], images: [] };
      const currentTags: string[] = currentObservation.tags || [];
      const currentImages: string[] = currentObservation.images || [];

      // Calculate new tags based on action
      let newTags: string[];
      switch (action) {
        case 'add':
          // Add tags without duplicates
          newTags = [...new Set([...currentTags, ...body.tags])];
          break;
        case 'remove':
          // Remove specified tags
          const tagsToRemove = new Set(body.tags.map(t => t.toLowerCase()));
          newTags = currentTags.filter(t => !tagsToRemove.has(t.toLowerCase()));
          break;
        case 'set':
        default:
          // Replace all tags
          newTags = [...new Set(body.tags)];
          break;
      }

      // Calculate new images (merge for add, keep current otherwise)
      const newImages = action === 'add' 
        ? [...new Set([...currentImages, ...images])]
        : images.length > 0 ? images : currentImages;

      // Build observation object
      const observation: ProductObservation = {
        tags: newTags,
        images: newImages,
        updatedAt: now,
        updatedBy: actorEmail,
        source,
      };

      // Build update data
      const updateData: Record<string, unknown> = {
        observation,
        updatedBy: actor,
        updatedAt: now,
      };

      // Add to activity log
      updateData._activityLog = admin.firestore.FieldValue.arrayUnion({
        type: 'observation.update',
        action,
        appliedBy: actor,
        actorEmail,
        productId: productRef.id,
        payload: {
          tags: body.tags,
          images: images,
          source,
        },
        previousTags: currentTags,
        newTags,
        timestamp: now,
      });

      await productRef.update(updateData);

      res.status(200).json({
        success: true,
        productId: productRef.id,
        observation,
      });
    } catch (error) {
      console.error('Error updating product observation:', error);
      res.status(500).json({
        error: 'INTERNAL_ERROR',
        message: 'Failed to update product observation',
      });
    }
  });
}

/**
 * GET /api/products/:productId/observation
 * 
 * Get the current product-level observation.
 */
export async function getProductObservationHandler(req: Request, res: Response) {
  await requireAuth(req, res, async () => {
    // Get product reference from resolveProductIdentifier middleware
    const productRef = res.locals.productDocRef;

    if (!productRef) {
      res.status(400).json({
        error: 'MISSING_PRODUCT_ID',
        message: 'Product ID is required',
      });
      return;
    }

    try {
      const productDoc = await productRef.get();

      if (!productDoc.exists) {
        res.status(404).json({
          error: 'PRODUCT_NOT_FOUND',
          message: `Product '${productRef.id}' not found`,
        });
        return;
      }

      const productData = productDoc.data() || {};
      const observation = productData.observation || { tags: [], images: [], updatedAt: null, updatedBy: null };

      res.status(200).json({
        productId: productRef.id,
        observation,
      });
    } catch (error) {
      console.error('Error getting product observation:', error);
      res.status(500).json({
        error: 'INTERNAL_ERROR',
        message: 'Failed to get product observation',
      });
    }
  });
}

/**
 * DELETE /api/products/:productId/observation
 * 
 * Clear all observation tags from a product.
 */
export async function deleteProductObservationHandler(req: Request, res: Response) {
  await requireAuth(req, res, async () => {
    // Get product reference from resolveProductIdentifier middleware
    const productRef = res.locals.productDocRef;

    if (!productRef) {
      res.status(400).json({
        error: 'MISSING_PRODUCT_ID',
        message: 'Product ID is required',
      });
      return;
    }

    try {
      const productDoc = await productRef.get();

      if (!productDoc.exists) {
        res.status(404).json({
          error: 'PRODUCT_NOT_FOUND',
          message: `Product '${productRef.id}' not found`,
        });
        return;
      }

      const authReq = req as AuthenticatedRequest;
      const actor = authReq.auth?.uid || 'system';
      const actorEmail = authReq.auth?.email || authReq.auth?.name || 'unknown';
      const now = new Date().toISOString();

      const productData = productDoc.data() || {};
      const previousTags = productData.observation?.tags || [];

      // Clear observation
      const observation: ProductObservation = {
        tags: [],
        images: [],
        updatedAt: now,
        updatedBy: actorEmail,
        source: 'api',
      };

      const updateData: Record<string, unknown> = {
        observation,
        updatedBy: actor,
        updatedAt: now,
      };

      // Add to activity log
      updateData._activityLog = admin.firestore.FieldValue.arrayUnion({
        type: 'observation.clear',
        appliedBy: actor,
        actorEmail,
        productId: productRef.id,
        previousTags,
        timestamp: now,
      });

      await productRef.update(updateData);

      res.status(200).json({
        success: true,
        productId: productRef.id,
        observation,
      });
    } catch (error) {
      console.error('Error clearing product observation:', error);
      res.status(500).json({
        error: 'INTERNAL_ERROR',
        message: 'Failed to clear product observation',
      });
    }
  });
}
