/**
 * Products Endpoints
 * 
 * Server-side validated product operations.
 * 
 * Lisa v1.0.0
 * 
 * References:
 * - Product Completion Workflows (W2): https://www.notion.so/2ba45ee1ec5a80698690f9492961ed8b
 * - Attribute Validation Schema: https://www.notion.so/2b845ee1ec5a805fba0ef665dfb17396
 */

import * as admin from 'firebase-admin';
import { requireAdmin, type AuthenticatedRequest } from '../middleware/auth';
import type { Request, Response } from 'express';
import { getAttribute, ServiceError } from '../services/attributesService';

/**
 * PATCH /products/:productId/attributes
 * 
 * Server-side validated update of product attributes.
 * Validates incoming keys against the attribute registry.
 */
export async function patchProductAttributesHandler(req: Request, res: Response) {
  await requireAdmin(req, res, async () => {
    const productId = req.params.productId;
    
    if (!productId) {
      res.status(400).json({ 
        error: 'MISSING_PRODUCT_ID', 
        message: 'Product ID is required' 
      });
      return;
    }

    const attrs = req.body?.attributes;
    
    if (!attrs || typeof attrs !== 'object' || Array.isArray(attrs)) {
      res.status(400).json({ 
        error: 'INVALID_ATTRIBUTES', 
        message: 'Request body must contain an "attributes" object' 
      });
      return;
    }

    // Validate that all attribute keys exist in the registry
    const invalidKeys: string[] = [];
    const validatedAttrs: Record<string, unknown> = {};

    for (const [key, value] of Object.entries(attrs)) {
      try {
        const attrDef = await getAttribute(key);
        
        // Optional: Validate value against data_type
        if (attrDef.data_type === 'enum' && attrDef.allowed_values) {
          if (typeof value === 'string' && !attrDef.allowed_values.includes(value)) {
            invalidKeys.push(`${key}: value "${value}" not in allowed values`);
            continue;
          }
        }
        
        if (attrDef.data_type === 'boolean' && typeof value !== 'boolean') {
          invalidKeys.push(`${key}: expected boolean, got ${typeof value}`);
          continue;
        }
        
        if (attrDef.data_type === 'number' && typeof value !== 'number') {
          invalidKeys.push(`${key}: expected number, got ${typeof value}`);
          continue;
        }
        
        if (attrDef.data_type === 'multiSelect' && !Array.isArray(value)) {
          invalidKeys.push(`${key}: expected array for multiSelect`);
          continue;
        }
        
        validatedAttrs[key] = value;
      } catch (error) {
        if (error instanceof ServiceError && error.code === 'ATTRIBUTE_NOT_FOUND') {
          // Allow unknown attributes but flag them
          console.warn(`Unknown attribute key: ${key}`);
          validatedAttrs[key] = value;
        } else {
          throw error;
        }
      }
    }

    if (invalidKeys.length > 0) {
      res.status(400).json({ 
        error: 'INVALID_ATTRIBUTE_VALUES', 
        message: 'Some attribute values are invalid',
        details: invalidKeys 
      });
      return;
    }

    const db = admin.firestore();
    const productRef = db.collection('products').doc(productId);

    try {
      // Check if product exists
      const productDoc = await productRef.get();
      if (!productDoc.exists) {
        res.status(404).json({ 
          error: 'PRODUCT_NOT_FOUND', 
          message: `Product '${productId}' not found` 
        });
        return;
      }

      // Get actor from auth context
      const authReq = req as AuthenticatedRequest;
      const actor = authReq.auth?.uid || 'system';
      const now = new Date().toISOString();

      // Build update payload with dot notation for nested attributes
      const updatePayload: Record<string, unknown> = {
        updatedBy: actor,
        updatedAt: now,
      };
      
      for (const [key, value] of Object.entries(validatedAttrs)) {
        updatePayload[`attributes.${key}`] = value;
      }

      await productRef.update(updatePayload);

      // Fetch and return updated product
      const updatedDoc = await productRef.get();
      res.status(200).json({
        id: updatedDoc.id,
        ...updatedDoc.data(),
      });
    } catch (error) {
      console.error('Error updating product attributes:', error);
      res.status(500).json({ 
        error: 'INTERNAL_ERROR', 
        message: 'Failed to update product attributes' 
      });
    }
  });
}

/**
 * GET /products/:productId
 * 
 * Retrieve a single product by ID.
 */
export async function getProductHandler(req: Request, res: Response) {
  await requireAdmin(req, res, async () => {
    const productId = req.params.productId;
    
    if (!productId) {
      res.status(400).json({ 
        error: 'MISSING_PRODUCT_ID', 
        message: 'Product ID is required' 
      });
      return;
    }

    const db = admin.firestore();
    const productRef = db.collection('products').doc(productId);

    try {
      const productDoc = await productRef.get();
      
      if (!productDoc.exists) {
        res.status(404).json({ 
          error: 'PRODUCT_NOT_FOUND', 
          message: `Product '${productId}' not found` 
        });
        return;
      }

      res.status(200).json({
        id: productDoc.id,
        ...productDoc.data(),
      });
    } catch (error) {
      console.error('Error fetching product:', error);
      res.status(500).json({ 
        error: 'INTERNAL_ERROR', 
        message: 'Failed to fetch product' 
      });
    }
  });
}

/**
 * GET /products
 * 
 * List products with optional pagination.
 */
export async function listProductsHandler(req: Request, res: Response) {
  await requireAdmin(req, res, async () => {
    const db = admin.firestore();
    const limit = Math.min(parseInt(req.query.limit as string) || 50, 100);
    const pageToken = req.query.pageToken as string | undefined;

    try {
      let query = db.collection('products')
        .orderBy('updatedAt', 'desc')
        .limit(limit + 1);

      if (pageToken) {
        const lastDoc = await db.collection('products').doc(pageToken).get();
        if (lastDoc.exists) {
          query = query.startAfter(lastDoc);
        }
      }

      const snapshot = await query.get();
      const docs = snapshot.docs;
      const hasMore = docs.length > limit;
      const resultDocs = hasMore ? docs.slice(0, limit) : docs;

      const items = resultDocs.map(doc => ({
        id: doc.id,
        ...doc.data(),
      }));

      res.status(200).json({
        items,
        hasMore,
        pageToken: hasMore ? resultDocs[resultDocs.length - 1]?.id : undefined,
      });
    } catch (error) {
      console.error('Error listing products:', error);
      res.status(500).json({ 
        error: 'INTERNAL_ERROR', 
        message: 'Failed to list products' 
      });
    }
  });
}
