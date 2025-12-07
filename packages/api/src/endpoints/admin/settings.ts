/**
 * Admin Settings Endpoints
 * Per AOSS Section 6 — API Contracts
 * 
 * Implements CRUD handlers for Attributes, Smart Rules, and AI Templates.
 * All endpoints require admin authentication.
 */

import { requireAdmin, type AuthenticatedRequest } from '../../middleware/auth';
import type { Request, Response } from 'express';
import {
  listAttributes,
  getAttribute,
  createAttribute,
  updateAttribute,
  deleteAttribute,
  validateAttributeData,
  ServiceError,
} from '../../services/attributesService';

/**
 * Format service error for HTTP response
 */
function handleServiceError(error: unknown, res: Response): void {
  if (error instanceof ServiceError) {
    res.status(error.statusCode).json({
      error: error.code,
      message: error.message,
    });
    return;
  }
  
  console.error('Unexpected error:', error);
  res.status(500).json({
    error: 'INTERNAL_ERROR',
    message: 'An unexpected error occurred',
  });
}

/**
 * GET /admin/settings/attributes
 * List attributes with optional search and pagination
 */
export async function listAttributesHandler(req: Request, res: Response) {
  await requireAdmin(req, res, async () => {
    try {
      const limit = req.query.limit ? parseInt(req.query.limit as string, 10) : undefined;
      const pageToken = req.query.pageToken as string | undefined;
      const q = req.query.q as string | undefined;
      
      const result = await listAttributes({ limit, pageToken, q });
      res.status(200).json(result);
    } catch (error) {
      handleServiceError(error, res);
    }
  });
}

/**
 * GET /admin/settings/attributes/:id
 * Get a single attribute by ID
 */
export async function getAttributeHandler(req: Request, res: Response) {
  await requireAdmin(req, res, async () => {
    try {
      const attributeId = req.params.id;
      if (!attributeId) {
        res.status(400).json({
          error: 'INVALID_REQUEST',
          message: 'Attribute ID is required',
        });
        return;
      }
      
      const attribute = await getAttribute(attributeId);
      res.status(200).json(attribute);
    } catch (error) {
      handleServiceError(error, res);
    }
  });
}

/**
 * POST /admin/settings/attributes
 * Create a new attribute
 */
export async function createAttributeHandler(req: Request, res: Response) {
  await requireAdmin(req, res, async () => {
    try {
      // Validate request body
      const validation = validateAttributeData(req.body);
      if (!validation.success) {
        res.status(400).json({
          error: 'VALIDATION_ERROR',
          message: 'Invalid attribute data',
          errors: validation.errors,
        });
        return;
      }
      
      // Get actor from auth context
      const authReq = req as AuthenticatedRequest;
      const actor = authReq.auth?.uid || 'system';
      
      const created = await createAttribute(validation.data!, actor);
      res.status(201).json(created);
    } catch (error) {
      handleServiceError(error, res);
    }
  });
}

/**
 * PUT /admin/settings/attributes/:id
 * Update an existing attribute
 */
export async function updateAttributeHandler(req: Request, res: Response) {
  await requireAdmin(req, res, async () => {
    try {
      const attributeId = req.params.id;
      if (!attributeId) {
        res.status(400).json({
          error: 'INVALID_REQUEST',
          message: 'Attribute ID is required',
        });
        return;
      }
      
      // Partial validation - allow subset of fields
      // For updates, we don't require all fields
      const patch = req.body;
      if (!patch || typeof patch !== 'object') {
        res.status(400).json({
          error: 'VALIDATION_ERROR',
          message: 'Request body must be an object',
        });
        return;
      }
      
      // Get actor from auth context
      const authReq = req as AuthenticatedRequest;
      const actor = authReq.auth?.uid || 'system';
      
      const updated = await updateAttribute(attributeId, patch, actor);
      res.status(200).json(updated);
    } catch (error) {
      handleServiceError(error, res);
    }
  });
}

/**
 * DELETE /admin/settings/attributes/:id
 * Delete an attribute
 */
export async function deleteAttributeHandler(req: Request, res: Response) {
  await requireAdmin(req, res, async () => {
    try {
      const attributeId = req.params.id;
      if (!attributeId) {
        res.status(400).json({
          error: 'INVALID_REQUEST',
          message: 'Attribute ID is required',
        });
        return;
      }
      
      await deleteAttribute(attributeId);
      res.status(204).send();
    } catch (error) {
      handleServiceError(error, res);
    }
  });
}

