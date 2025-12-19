/**
 * Mapping Endpoints
 * PVS-0.3.1 — Header aliases, value synonyms, and per-source overrides
 * 
 * Endpoints:
 * - GET/PUT /admin/settings/mappings — Global mapping
 * - GET/PUT/DELETE /admin/settings/attributes/{id}/mapping — Attribute-level mapping
 * - GET /admin/settings/attributes/{id}/mapping/sources — List source overrides
 * - PUT/DELETE /admin/settings/attributes/{id}/mapping/sources/{sourceId} — Source overrides
 * - POST /admin/imports/preview — Import preview with mapping application
 */

import { requireAdmin, type AuthenticatedRequest } from '../../middleware/auth';
import type { Request, Response } from 'express';
import {
  getGlobalMapping,
  updateGlobalMapping,
  getAttributeMapping,
  getMergedMapping,
  updateAttributeMapping,
  deleteAttributeMapping,
  listSourceOverrides,
  getSourceOverride,
  upsertSourceOverride,
  deleteSourceOverride,
  previewImportTransform,
  MappingServiceError,
} from '../../services/mappingService';

/**
 * Format service error for HTTP response
 */
function handleMappingError(error: unknown, res: Response): void {
  if (error instanceof MappingServiceError) {
    res.status(error.statusCode).json({
      error: error.code,
      message: error.message,
    });
    return;
  }
  
  console.error('Unexpected mapping error:', error);
  res.status(500).json({
    error: 'INTERNAL_ERROR',
    message: 'An unexpected error occurred',
  });
}

// =============================================
// Global Mapping Endpoints
// =============================================

/**
 * GET /admin/settings/mappings
 * Get the global mapping document
 */
export async function getGlobalMappingHandler(req: Request, res: Response) {
  await requireAdmin(req, res, async () => {
    try {
      const mapping = await getGlobalMapping();
      res.status(200).json(mapping);
    } catch (error) {
      handleMappingError(error, res);
    }
  });
}

/**
 * PUT /admin/settings/mappings
 * Update global mapping with merge or replace semantics
 * 
 * Query params:
 * - merge: boolean (default true) - merge keys or full replace
 * 
 * Body:
 * - aliases: Record<string, string>
 * - value_synonyms: Record<string, Record<string, string[]>>
 * - reason: string (optional)
 */
export async function updateGlobalMappingHandler(req: Request, res: Response) {
  await requireAdmin(req, res, async () => {
    try {
      const merge = req.query.merge !== 'false';
      const { aliases, value_synonyms, reason } = req.body || {};
      
      if (!aliases && !value_synonyms) {
        res.status(400).json({
          error: 'INVALID_REQUEST',
          message: 'At least one of aliases or value_synonyms is required',
        });
        return;
      }
      
      const authReq = req as AuthenticatedRequest;
      const actor = authReq.auth?.uid || 'system';
      
      const updated = await updateGlobalMapping(
        { aliases, value_synonyms },
        actor,
        { merge, reason }
      );
      
      res.status(200).json(updated);
    } catch (error) {
      handleMappingError(error, res);
    }
  });
}

// =============================================
// Attribute-Level Mapping Endpoints
// =============================================

/**
 * GET /admin/settings/attributes/:id/mapping
 * Get merged mapping view for an attribute
 * 
 * Query params:
 * - source: string (optional) - Source ID for source-specific resolution
 * - raw: boolean (default false) - If true, return raw attribute mapping without merge
 */
export async function getAttributeMappingHandler(req: Request, res: Response) {
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
      
      const sourceId = req.query.source as string | undefined;
      const raw = req.query.raw === 'true';
      
      if (raw) {
        const mapping = await getAttributeMapping(attributeId);
        res.status(200).json(mapping || { aliases: {}, value_synonyms: {} });
      } else {
        const merged = await getMergedMapping(attributeId, sourceId);
        res.status(200).json(merged);
      }
    } catch (error) {
      handleMappingError(error, res);
    }
  });
}

/**
 * PUT /admin/settings/attributes/:id/mapping
 * Update attribute-level mapping
 * 
 * Query params:
 * - merge: boolean (default true) - merge keys or full replace
 * 
 * Body:
 * - aliases: Record<string, string>
 * - value_synonyms: Record<string, string[]>
 * - reason: string (optional)
 */
export async function updateAttributeMappingHandler(req: Request, res: Response) {
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
      
      const merge = req.query.merge !== 'false';
      const { aliases, value_synonyms, reason } = req.body || {};
      
      if (!aliases && !value_synonyms) {
        res.status(400).json({
          error: 'INVALID_REQUEST',
          message: 'At least one of aliases or value_synonyms is required',
        });
        return;
      }
      
      const authReq = req as AuthenticatedRequest;
      const actor = authReq.auth?.uid || 'system';
      
      const updated = await updateAttributeMapping(
        attributeId,
        { aliases, value_synonyms },
        actor,
        { merge, reason }
      );
      
      res.status(200).json(updated);
    } catch (error) {
      handleMappingError(error, res);
    }
  });
}

/**
 * DELETE /admin/settings/attributes/:id/mapping
 * Delete attribute-level mapping
 * 
 * Body:
 * - reason: string (optional)
 */
export async function deleteAttributeMappingHandler(req: Request, res: Response) {
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
      const reason = req.body?.reason;
      
      await deleteAttributeMapping(attributeId, actor, reason);
      res.status(204).send();
    } catch (error) {
      handleMappingError(error, res);
    }
  });
}

// =============================================
// Source Override Endpoints
// =============================================

/**
 * GET /admin/settings/attributes/:id/mapping/sources
 * List all sources with overrides for an attribute
 */
export async function listSourceOverridesHandler(req: Request, res: Response) {
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
      
      const result = await listSourceOverrides(attributeId);
      res.status(200).json(result);
    } catch (error) {
      handleMappingError(error, res);
    }
  });
}

/**
 * GET /admin/settings/attributes/:id/mapping/sources/:sourceId
 * Get a specific source override
 */
export async function getSourceOverrideHandler(req: Request, res: Response) {
  await requireAdmin(req, res, async () => {
    try {
      const { id: attributeId, sourceId } = req.params;
      if (!attributeId || !sourceId) {
        res.status(400).json({
          error: 'INVALID_REQUEST',
          message: 'Attribute ID and Source ID are required',
        });
        return;
      }
      
      const override = await getSourceOverride(attributeId, sourceId);
      if (!override) {
        res.status(404).json({
          error: 'SOURCE_OVERRIDE_NOT_FOUND',
          message: `No source override found for source '${sourceId}'`,
        });
        return;
      }
      
      res.status(200).json(override);
    } catch (error) {
      handleMappingError(error, res);
    }
  });
}

/**
 * PUT /admin/settings/attributes/:id/mapping/sources/:sourceId
 * Upsert a source-specific override
 * 
 * Body:
 * - aliases: Record<string, string>
 * - value_synonyms: Record<string, string[]>
 * - reason: string (optional)
 */
export async function upsertSourceOverrideHandler(req: Request, res: Response) {
  await requireAdmin(req, res, async () => {
    try {
      const { id: attributeId, sourceId } = req.params;
      if (!attributeId || !sourceId) {
        res.status(400).json({
          error: 'INVALID_REQUEST',
          message: 'Attribute ID and Source ID are required',
        });
        return;
      }
      
      const { aliases, value_synonyms, reason } = req.body || {};
      
      if (!aliases && !value_synonyms) {
        res.status(400).json({
          error: 'INVALID_REQUEST',
          message: 'At least one of aliases or value_synonyms is required',
        });
        return;
      }
      
      const authReq = req as AuthenticatedRequest;
      const actor = authReq.auth?.uid || 'system';
      
      const override = await upsertSourceOverride(
        attributeId,
        sourceId,
        { aliases, value_synonyms },
        actor,
        reason
      );
      
      res.status(200).json(override);
    } catch (error) {
      handleMappingError(error, res);
    }
  });
}

/**
 * DELETE /admin/settings/attributes/:id/mapping/sources/:sourceId
 * Delete a source-specific override
 * 
 * Body:
 * - reason: string (optional)
 */
export async function deleteSourceOverrideHandler(req: Request, res: Response) {
  await requireAdmin(req, res, async () => {
    try {
      const { id: attributeId, sourceId } = req.params;
      if (!attributeId || !sourceId) {
        res.status(400).json({
          error: 'INVALID_REQUEST',
          message: 'Attribute ID and Source ID are required',
        });
        return;
      }
      
      const authReq = req as AuthenticatedRequest;
      const actor = authReq.auth?.uid || 'system';
      const reason = req.body?.reason;
      
      await deleteSourceOverride(attributeId, sourceId, actor, reason);
      res.status(204).send();
    } catch (error) {
      handleMappingError(error, res);
    }
  });
}

// =============================================
// Import Preview Endpoint
// =============================================

/**
 * POST /admin/imports/preview
 * Preview import transformation with mapping application
 * 
 * Body:
 * - sampleRows: Record<string, unknown>[] - Sample rows to transform
 * - sourceId: string (optional) - Source ID for source-specific mappings
 * - mappingOverrides: object (optional) - Per-request mapping overrides
 *   - aliases: Record<string, string>
 *   - value_synonyms: Record<string, Record<string, string[]>>
 */
export async function importPreviewHandler(req: Request, res: Response) {
  await requireAdmin(req, res, async () => {
    try {
      const { sampleRows, sourceId, mappingOverrides } = req.body || {};
      
      if (!sampleRows || !Array.isArray(sampleRows)) {
        res.status(400).json({
          error: 'INVALID_REQUEST',
          message: 'sampleRows array is required',
        });
        return;
      }
      
      if (sampleRows.length === 0) {
        res.status(400).json({
          error: 'INVALID_REQUEST',
          message: 'sampleRows must contain at least one row',
        });
        return;
      }
      
      // Limit sample size to avoid large processing
      const MAX_SAMPLE_ROWS = 100;
      const limitedRows = sampleRows.slice(0, MAX_SAMPLE_ROWS);
      
      const result = await previewImportTransform(
        limitedRows,
        sourceId,
        mappingOverrides
      );
      
      res.status(200).json({
        ...result,
        truncated: sampleRows.length > MAX_SAMPLE_ROWS,
        originalRowCount: sampleRows.length,
      });
    } catch (error) {
      handleMappingError(error, res);
    }
  });
}
