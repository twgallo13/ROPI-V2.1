/**
 * Admin Settings Endpoints
 * Per AOSS Section 6 — API Contracts
 * 
 * Implements CRUD handlers for Attributes, Smart Rules, and AI Templates.
 * All endpoints require admin authentication.
 * 
 * PVS-0.3.0: Added audit endpoints and revert functionality
 */

import { requireAdmin, type AuthenticatedRequest } from '../../middleware/auth';
import type { Request, Response } from 'express';
import {
  listAttributes,
  getAttribute,
  createAttribute,
  updateAttribute,
  deleteAttribute,
  getAttributeUsage,
  getTopValues,
  validateAttributeData,
  ServiceError,
} from '../../services/attributesService';
import {
  listAuditEvents,
  getAuditEvent,
  revertAttribute,
  AuditServiceError,
  type AuditAction,
} from '../../services/auditService';
import { normalizeSynonymsShape } from '../../lib/attributeUtils';

/**
 * Format service error for HTTP response
 */
function handleServiceError(error: unknown, res: Response): void {
  if (error instanceof ServiceError || error instanceof AuditServiceError) {
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
 * LP-3.0.1: Coerce client shapes (allowed_values/synonyms strings) and return structured errors
 */
export async function updateAttributeHandler(req: Request, res: Response) {
  await requireAdmin(req, res, async () => {
    try {
      const attributeId = req.params.id;
      if (!attributeId) {
        res.status(400).json({
          ok: false,
          error: 'INVALID_REQUEST',
          message: 'Attribute ID is required',
          details: null,
        });
        return;
      }

      const payload = { ...req.body };
      if (!payload || typeof payload !== 'object') {
        res.status(400).json({
          ok: false,
          error: 'VALIDATION_ERROR',
          message: 'Request body must be an object',
          details: null,
        });
        return;
      }

      // LP-3.0.1: Coerce common client shapes for allowed_values
      if (typeof payload.allowed_values === 'string') {
        payload.allowed_values = payload.allowed_values
          .split(',')
          .map((s: string) => s.trim())
          .filter(Boolean);
      }

      // LP-3.0.1: Coerce common client shapes for synonyms
      if (payload.synonyms && typeof payload.synonyms === 'string') {
        try {
          // If client sent JSON-like string, attempt parse
          payload.synonyms = JSON.parse(payload.synonyms);
        } catch {
          // Fallback: "a,b,c" -> ["a","b","c"]
          payload.synonyms = payload.synonyms
            .split(',')
            .map((s: string) => s.trim())
            .filter(Boolean);
        }
      }

      // LP-3.0.4: Normalize synonyms to canonical array-of-objects shape
      if (payload.synonyms != null) {
        payload.synonyms = normalizeSynonymsShape(payload.synonyms);
      }

      const authReq = req as AuthenticatedRequest;
      const actor = authReq.auth?.uid || 'system';

      // Fetch the existing attribute
      const existing = await getAttribute(attributeId);

      // Merge existing + patch. Give precedence to patch.
      const merged = {
        ...existing,
        ...payload,
        attribute_id: attributeId, // ensure ID unchanged
      };

      // Validate merged object using AttributeSchema (via validateAttributeData)
      const validation = validateAttributeData(merged);
      if (!validation.success) {
        console.error('Attribute validation failed:', JSON.stringify(validation.errors));
        res.status(400).json({
          ok: false,
          error: 'validation_failed',
          message: 'Invalid attribute data',
          details: validation.errors,
        });
        return;
      }

      // Update attribute with validated data so defaults are applied
      const updated = await updateAttribute(attributeId, validation.data as any, actor);
      res.status(200).json({ ok: true, attribute: updated });
    } catch (error) {
      console.error('Attribute update failed:', error);
      // Extract structured validation details if present
      const err = error as any;
      const details = err?.issues || err?.errors || null;
      
      if (error instanceof ServiceError) {
        res.status(error.statusCode).json({
          ok: false,
          error: error.code,
          message: error.message,
          details,
        });
        return;
      }
      
      res.status(400).json({
        ok: false,
        error: err?.message || 'validation_failed',
        details,
      });
    }
  });
}

/**
 * DELETE /admin/settings/attributes/:id
 * Delete an attribute
 * PVS-0.3.0: Now requires actor for audit trail
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
      
      const authReq = req as AuthenticatedRequest;
      const actor = authReq.auth?.uid || 'system';
      const reason = req.body?.reason as string | undefined;
      
      await deleteAttribute(attributeId, actor, reason);
      res.status(204).send();
    } catch (error) {
      handleServiceError(error, res);
    }
  });
}

/**
 * GET /admin/settings/attributes/:id/usage
 * Get usage information for an attribute
 */
export async function getAttributeUsageHandler(req: Request, res: Response) {
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
      
      const limit = parseInt((req.query.limit as string) || '10', 10);
      const usage = await getAttributeUsage(attributeId, limit);
      res.status(200).json(usage);
    } catch (error) {
      handleServiceError(error, res);
    }
  });
}

/**
 * GET /admin/settings/attributes/:id/top-values
 * Get top distinct values for an attribute across products
 * Used for proposing allowed_values when converting string → enum
 */
export async function getTopValuesHandler(req: Request, res: Response) {
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
      
      const limit = parseInt((req.query.limit as string) || '200', 10);
      const minCount = parseInt((req.query.min_count as string) || '1', 10);
      const sampleSize = parseInt((req.query.sample_size as string) || '50000', 10);
      
      const result = await getTopValues(attributeId, limit, minCount, sampleSize);
      res.status(200).json(result);
    } catch (error) {
      handleServiceError(error, res);
    }
  });
}


// =============================================
// Audit Endpoints (PVS-0.3.0)
// =============================================

/**
 * GET /admin/settings/attributes/:id/audit
 * List audit events for an attribute with pagination
 * 
 * Query params:
 * - limit: number (default 50, max 100)
 * - after: event_id for cursor pagination
 * - actions: comma-separated list of action types to filter
 */
export async function listAuditEventsHandler(req: Request, res: Response) {
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
      
      const limit = parseInt((req.query.limit as string) || '50', 10);
      const after = req.query.after as string | undefined;
      const actionsParam = req.query.actions as string | undefined;
      const actions = actionsParam 
        ? actionsParam.split(',').map(a => a.trim()) as AuditAction[]
        : undefined;
      
      const result = await listAuditEvents(attributeId, { limit, after, actions });
      res.status(200).json(result);
    } catch (error) {
      handleServiceError(error, res);
    }
  });
}

/**
 * GET /admin/settings/attributes/:id/audit/:eventId
 * Get a single audit event
 */
export async function getAuditEventHandler(req: Request, res: Response) {
  await requireAdmin(req, res, async () => {
    try {
      const { id: attributeId, eventId } = req.params;
      if (!attributeId || !eventId) {
        res.status(400).json({
          error: 'INVALID_REQUEST',
          message: 'Attribute ID and Event ID are required',
        });
        return;
      }
      
      const event = await getAuditEvent(attributeId, eventId);
      res.status(200).json(event);
    } catch (error) {
      handleServiceError(error, res);
    }
  });
}

/**
 * POST /admin/settings/attributes/:id/revert
 * Revert an attribute to a previous state (from audit event)
 * 
 * Body:
 * - eventId: string (required) - The audit event ID to revert to
 * - reason: string (optional) - Reason for the revert
 */
export async function revertAttributeHandler(req: Request, res: Response) {
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
      
      const { eventId, reason } = req.body || {};
      if (!eventId) {
        res.status(400).json({
          error: 'INVALID_REQUEST',
          message: 'eventId is required in request body',
        });
        return;
      }
      
      const authReq = req as AuthenticatedRequest;
      const actor = authReq.auth?.uid || 'system';
      
      const reverted = await revertAttribute(attributeId, eventId, actor, reason);
      res.status(200).json(reverted);
    } catch (error) {
      handleServiceError(error, res);
    }
  });
}