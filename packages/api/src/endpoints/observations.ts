/**
 * Observations API Endpoints
 * 
 * Server-side endpoints for observation CRUD operations.
 * 
 * LP-1.1.1: Mobile Observations Capture support
 * 
 * References:
 * - Workflow W1 — Observations: https://www.notion.so/2b845ee1ec5a81b5a4a6d3ea439ec277
 * - Observations Overview: https://www.notion.so/2b845ee1ec5a81e1aeeae43318b38039
 */

import * as admin from 'firebase-admin';
import type { Request, Response } from 'express';
import { requireAuth, type AuthenticatedRequest } from '../middleware/auth';
// Using direct path to SDK config - esbuild alias for @ropi-aoss/sdk points to index.ts, not package root
import attributeRegistry from '../../../sdk/config/attributeRegistry.json';

// Valid top-level product fields
const VALID_PRODUCT_FIELDS = ['mpn', 'sku', 'title', 'name', 'brand', 'category', 'department', 'status', 'style_id', 'description', 'launchDate', 'launchStatus'];

// Get valid attribute IDs from registry
const validAttributeIds = new Set(
  (attributeRegistry as { attributes: Array<{ attribute_id: string }> }).attributes.map(
    (attr) => attr.attribute_id
  )
);

interface FieldLink {
  type: 'product' | 'attribute';
  key: string;
}

interface CreateObservationInput {
  product_mpn: string;
  text: string;
  description?: string;
  images?: Array<{ url: string; thumb?: string; width?: number; height?: number }>;
  fieldLink?: FieldLink | null;
  source?: string;
  severity?: 'low' | 'medium' | 'high';
  tags?: string[];
}

/**
 * Validates a fieldLink object against the attribute registry and product fields.
 */
function validateFieldLink(fieldLink: FieldLink | null | undefined): { valid: boolean; error?: string } {
  if (!fieldLink) {
    return { valid: true };
  }

  if (!['product', 'attribute'].includes(fieldLink.type)) {
    return {
      valid: false,
      error: `Invalid fieldLink type: ${fieldLink.type}. Must be 'product' or 'attribute'.`,
    };
  }

  if (!fieldLink.key || typeof fieldLink.key !== 'string') {
    return {
      valid: false,
      error: 'fieldLink.key is required and must be a string.',
    };
  }

  if (fieldLink.type === 'product') {
    const key = fieldLink.key.replace(/^product\./, '').toLowerCase();
    if (!VALID_PRODUCT_FIELDS.includes(key)) {
      return {
        valid: false,
        error: `Invalid product field: ${key}. Valid fields: ${VALID_PRODUCT_FIELDS.join(', ')}.`,
      };
    }
  } else if (fieldLink.type === 'attribute') {
    const key = fieldLink.key.replace(/^attributes\./, '').toLowerCase();
    if (!validAttributeIds.has(key)) {
      return {
        valid: false,
        error: `Invalid attribute: ${key}. Not found in attribute registry.`,
      };
    }
  }

  return { valid: true };
}

/**
 * POST /api/observations
 * 
 * Create a new observation.
 * Requires authentication (any role with observations permission).
 */
export async function createObservationHandler(req: Request, res: Response) {
  await requireAuth(req, res, async () => {
    const authReq = req as AuthenticatedRequest;
    const body = req.body as CreateObservationInput;

    // Validate required fields
    if (!body.product_mpn) {
      res.status(400).json({
        error: 'MISSING_PRODUCT_MPN',
        message: 'product_mpn is required',
      });
      return;
    }

    if (!body.text || typeof body.text !== 'string' || body.text.trim().length === 0) {
      res.status(400).json({
        error: 'MISSING_TEXT',
        message: 'text is required and must be a non-empty string',
      });
      return;
    }

    // Validate fieldLink if provided
    if (body.fieldLink) {
      const validation = validateFieldLink(body.fieldLink);
      if (!validation.valid) {
        res.status(400).json({
          error: 'INVALID_FIELD_LINK',
          message: validation.error,
        });
        return;
      }
    }

    // Validate severity if provided
    const validSeverities = ['low', 'medium', 'high'];
    if (body.severity && !validSeverities.includes(body.severity)) {
      res.status(400).json({
        error: 'INVALID_SEVERITY',
        message: `severity must be one of: ${validSeverities.join(', ')}`,
      });
      return;
    }

    // Validate tags if provided (must be array of strings)
    if (body.tags !== undefined) {
      if (!Array.isArray(body.tags)) {
        res.status(400).json({
          error: 'INVALID_TAGS',
          message: 'tags must be an array of strings',
        });
        return;
      }
      if (!body.tags.every((tag: unknown) => typeof tag === 'string')) {
        res.status(400).json({
          error: 'INVALID_TAGS',
          message: 'all tags must be strings',
        });
        return;
      }
    }

    const db = admin.firestore();
    const now = admin.firestore.FieldValue.serverTimestamp();

    try {
      // Look up product by MPN to get productId
      const productsSnapshot = await db
        .collection('products')
        .where('mpn', '==', body.product_mpn)
        .limit(1)
        .get();

      let productId: string | null = null;
      if (!productsSnapshot.empty) {
        productId = productsSnapshot.docs[0].id;
      }

      // Create observation document
      const observationData = {
        productId: productId,
        product_mpn: body.product_mpn,
        title: body.text.substring(0, 100), // Use first 100 chars as title
        body: body.description || '',
        text: body.text,
        severity: body.severity || 'medium',
        status: 'open',
        fieldLink: body.fieldLink || null,
        images: body.images || [],
        tags: body.tags || [],
        source: body.source || 'mobile',
        createdBy: {
          uid: authReq.auth?.uid || 'unknown',
          name: authReq.auth?.name || authReq.auth?.email || 'Unknown User',
        },
        createdAt: now,
        updatedAt: now,
      };

      const docRef = await db.collection('observations').add(observationData);

      res.status(201).json({
        id: docRef.id,
        ...observationData,
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      });
    } catch (error) {
      console.error('Error creating observation:', error);
      res.status(500).json({
        error: 'INTERNAL_ERROR',
        message: 'Failed to create observation',
      });
    }
  });
}

/**
 * GET /api/observations
 * 
 * List observations with optional filtering by product_mpn.
 */
export async function listObservationsHandler(req: Request, res: Response) {
  await requireAuth(req, res, async () => {
    const db = admin.firestore();
    const productMpn = req.query.product_mpn as string | undefined;
    const productId = req.query.productId as string | undefined;
    const status = req.query.status as string | undefined;
    const limit = Math.min(parseInt(req.query.limit as string) || 50, 100);

    try {
      let query: admin.firestore.Query = db.collection('observations');

      if (productMpn) {
        query = query.where('product_mpn', '==', productMpn);
      } else if (productId) {
        query = query.where('productId', '==', productId);
      }

      if (status) {
        query = query.where('status', '==', status);
      }

      query = query.orderBy('createdAt', 'desc').limit(limit);

      const snapshot = await query.get();
      const observations = snapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data(),
      }));

      res.status(200).json({
        items: observations,
        count: observations.length,
      });
    } catch (error) {
      console.error('Error listing observations:', error);
      res.status(500).json({
        error: 'INTERNAL_ERROR',
        message: 'Failed to list observations',
      });
    }
  });
}

/**
 * GET /api/observations/:id
 * 
 * Get a single observation by ID.
 */
export async function getObservationHandler(req: Request, res: Response) {
  await requireAuth(req, res, async () => {
    const observationId = req.params.id;

    if (!observationId) {
      res.status(400).json({
        error: 'MISSING_ID',
        message: 'Observation ID is required',
      });
      return;
    }

    const db = admin.firestore();

    try {
      const doc = await db.collection('observations').doc(observationId).get();

      if (!doc.exists) {
        res.status(404).json({
          error: 'NOT_FOUND',
          message: `Observation '${observationId}' not found`,
        });
        return;
      }

      res.status(200).json({
        id: doc.id,
        ...doc.data(),
      });
    } catch (error) {
      console.error('Error getting observation:', error);
      res.status(500).json({
        error: 'INTERNAL_ERROR',
        message: 'Failed to get observation',
      });
    }
  });
}

/**
 * PATCH /api/observations/:id
 * 
 * Update an observation.
 */
export async function updateObservationHandler(req: Request, res: Response) {
  await requireAuth(req, res, async () => {
    const authReq = req as AuthenticatedRequest;
    const observationId = req.params.id;
    const updates = req.body;

    if (!observationId) {
      res.status(400).json({
        error: 'MISSING_ID',
        message: 'Observation ID is required',
      });
      return;
    }

    // Validate fieldLink if being updated
    if (updates.fieldLink) {
      const validation = validateFieldLink(updates.fieldLink);
      if (!validation.valid) {
        res.status(400).json({
          error: 'INVALID_FIELD_LINK',
          message: validation.error,
        });
        return;
      }
    }

    const db = admin.firestore();
    const now = admin.firestore.FieldValue.serverTimestamp();

    try {
      const docRef = db.collection('observations').doc(observationId);
      const doc = await docRef.get();

      if (!doc.exists) {
        res.status(404).json({
          error: 'NOT_FOUND',
          message: `Observation '${observationId}' not found`,
        });
        return;
      }

      // Build update payload
      const updateData: Record<string, unknown> = {
        ...updates,
        updatedAt: now,
        updatedBy: {
          uid: authReq.auth?.uid || 'unknown',
          name: authReq.auth?.name || authReq.auth?.email || 'Unknown User',
        },
      };

      // Handle status change to resolved
      if (updates.status === 'resolved' && doc.data()?.status !== 'resolved') {
        updateData.resolvedAt = now;
        updateData.resolvedBy = {
          uid: authReq.auth?.uid || 'unknown',
          name: authReq.auth?.name || authReq.auth?.email || 'Unknown User',
        };
      }

      await docRef.update(updateData);

      const updated = await docRef.get();
      res.status(200).json({
        id: updated.id,
        ...updated.data(),
      });
    } catch (error) {
      console.error('Error updating observation:', error);
      res.status(500).json({
        error: 'INTERNAL_ERROR',
        message: 'Failed to update observation',
      });
    }
  });
}

/**
 * DELETE /api/observations/:id
 * 
 * LP-1.1.13: Delete an observation.
 * Requires authentication. Only the creator or an admin can delete.
 */
export async function deleteObservationHandler(req: Request, res: Response) {
  await requireAuth(req, res, async () => {
    const authReq = req as AuthenticatedRequest;
    const observationId = req.params.id;

    if (!observationId) {
      res.status(400).json({
        error: 'MISSING_ID',
        message: 'Observation ID is required',
      });
      return;
    }

    const db = admin.firestore();

    try {
      const docRef = db.collection('observations').doc(observationId);
      const doc = await docRef.get();

      if (!doc.exists) {
        res.status(404).json({
          error: 'NOT_FOUND',
          message: `Observation '${observationId}' not found`,
        });
        return;
      }

      const obsData = doc.data();
      const isCreator = obsData?.createdBy?.uid === authReq.auth?.uid;
      const isAdmin = authReq.auth?.role === 'admin';

      if (!isCreator && !isAdmin) {
        res.status(403).json({
          error: 'FORBIDDEN',
          message: 'Only the creator or an admin can delete this observation',
        });
        return;
      }

      await docRef.delete();

      res.status(200).json({
        success: true,
        message: `Observation '${observationId}' deleted`,
        deletedAt: new Date().toISOString(),
        deletedBy: {
          uid: authReq.auth?.uid || 'unknown',
          name: authReq.auth?.name || authReq.auth?.email || 'Unknown User',
        },
      });
    } catch (error) {
      console.error('Error deleting observation:', error);
      res.status(500).json({
        error: 'INTERNAL_ERROR',
        message: 'Failed to delete observation',
      });
    }
  });
}

/**
 * POST /api/observations/analyze-image
 * 
 * AI image analysis endpoint (dev stub) - standalone version.
 * Called during observation capture before the observation is saved.
 * 
 * LP-1.1.1: Dev stub returns deterministic suggestions.
 */
export async function analyzeImageStandaloneHandler(req: Request, res: Response) {
  await requireAuth(req, res, async () => {
    const { imageUrl } = req.body;

    if (!imageUrl) {
      res.status(400).json({
        error: 'MISSING_IMAGE_URL',
        message: 'imageUrl is required in request body',
      });
      return;
    }

    // Dev stub: Return deterministic suggestions based on image URL hash
    // In production, this would call a real AI service (e.g., Google Vision, OpenAI)
    const hash = imageUrl.split('').reduce((a: number, b: string) => {
      a = ((a << 5) - a) + b.charCodeAt(0);
      return a & a;
    }, 0);

    const suggestions = [
      { text: 'hidden pocket', confidence: 0.92 },
      { text: 'zipper detail', confidence: 0.87 },
      { text: 'contrast stitching', confidence: 0.78 },
      { text: 'logo placement', confidence: 0.85 },
      { text: 'material texture', confidence: 0.72 },
    ];

    // Select 2-3 suggestions based on hash
    const selectedCount = 2 + (Math.abs(hash) % 2);
    const startIndex = Math.abs(hash) % suggestions.length;
    const selected = [];
    for (let i = 0; i < selectedCount; i++) {
      selected.push(suggestions[(startIndex + i) % suggestions.length]);
    }

    // Simulate processing delay
    await new Promise(resolve => setTimeout(resolve, 300));

    res.status(200).json({
      imageUrl,
      suggestions: selected,
      model: 'dev-stub-v1',
      processedAt: new Date().toISOString(),
    });
  });
}

/**
 * POST /api/observations/:id/analyze-image
 * 
 * AI image analysis endpoint (dev stub).
 * In production, this would call a real AI service.
 * 
 * LP-1.1.1: Dev stub returns deterministic suggestions.
 */
export async function analyzeImageHandler(req: Request, res: Response) {
  await requireAuth(req, res, async () => {
    const observationId = req.params.id;
    const { imageUrl } = req.body;

    if (!observationId) {
      res.status(400).json({
        error: 'MISSING_ID',
        message: 'Observation ID is required',
      });
      return;
    }

    if (!imageUrl) {
      res.status(400).json({
        error: 'MISSING_IMAGE_URL',
        message: 'imageUrl is required in request body',
      });
      return;
    }

    // Dev stub: Return deterministic suggestions based on image URL hash
    // In production, this would call a real AI service (e.g., Google Vision, OpenAI)
    const hash = imageUrl.split('').reduce((a: number, b: string) => {
      a = ((a << 5) - a) + b.charCodeAt(0);
      return a & a;
    }, 0);

    const suggestions = [
      { id: 's1', text: 'hidden pocket', confidence: 0.92 },
      { id: 's2', text: 'zipper detail', confidence: 0.87 },
      { id: 's3', text: 'contrast stitching', confidence: 0.78 },
      { id: 's4', text: 'logo placement', confidence: 0.85 },
      { id: 's5', text: 'material texture', confidence: 0.72 },
    ];

    // Select 2-3 suggestions based on hash
    const selectedCount = 2 + (Math.abs(hash) % 2);
    const startIndex = Math.abs(hash) % suggestions.length;
    const selected = [];
    for (let i = 0; i < selectedCount; i++) {
      selected.push(suggestions[(startIndex + i) % suggestions.length]);
    }

    // Simulate processing delay
    await new Promise(resolve => setTimeout(resolve, 500));

    res.status(200).json({
      observationId,
      imageUrl,
      suggestions: selected,
      model: 'dev-stub-v1',
      processedAt: new Date().toISOString(),
    });
  });
}
