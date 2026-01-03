/**
 * Admin Completion Rules Endpoints
 * 
 * Implements CRUD handlers for Completion Rules configuration.
 * All endpoints require admin authentication.
 * 
 * Implements exact API contract as specified:
 * - GET /admin/settings/exportSettings/completionRules
 * - PUT /admin/settings/exportSettings/completionRules
 * - GET /admin/settings/exportSettings/completionRules/versions
 * - GET /admin/settings/exportSettings/completionRules/versions/:version
 */

import { requireAdmin, type AuthenticatedRequest } from '../../middleware/auth';
import type { Request, Response } from 'express';
import {
  getCompletionRules,
  setCompletionRules,
  getCompletionRulesVersion,
  listCompletionRulesVersions,
  CompletionRulesServiceError,
  type CompletionRulesConfig,
} from '../../services/completionRulesService';

/**
 * Format service error for HTTP response
 */
function handleCompletionRulesError(error: unknown, res: Response): void {
  if (error instanceof CompletionRulesServiceError) {
    res.status(error.statusCode).json({
      error: error.code,
      message: error.message,
    });
    return;
  }
  
  console.error('Unexpected completion rules error:', error);
  res.status(500).json({
    error: 'INTERNAL_ERROR',
    message: 'An unexpected error occurred',
  });
}

/**
 * GET /admin/settings/exportSettings/completionRules
 * Get the current live Completion Rules configuration
 */
export async function getCompletionRulesHandler(req: Request, res: Response) {
  await requireAdmin(req, res, async () => {
    try {
      const rules = await getCompletionRules();
      
      if (!rules) {
        res.status(404).json({
          error: 'NOT_FOUND',
          message: 'Completion rules not found',
        });
        return;
      }
      
      res.status(200).json(rules);
    } catch (error) {
      handleCompletionRulesError(error, res);
    }
  });
}

/**
 * PUT /admin/settings/exportSettings/completionRules
 * Create or update the Completion Rules configuration
 */
export async function setCompletionRulesHandler(req: Request, res: Response) {
  await requireAdmin(req, res, async () => {
    try {
      const authReq = req as AuthenticatedRequest;
      const updatedBy = authReq.auth?.uid || 'unknown';
      
      if (!req.body || typeof req.body !== 'object') {
        res.status(400).json({
          error: 'INVALID_REQUEST',
          message: 'Request body must be a valid completion rules configuration',
        });
        return;
      }
      
      const rules = await setCompletionRules(req.body as CompletionRulesConfig, updatedBy);
      res.status(200).json(rules);
    } catch (error) {
      handleCompletionRulesError(error, res);
    }
  });
}

/**
 * GET /admin/settings/exportSettings/completionRules/versions
 * List available Completion Rules versions
 */
export async function listCompletionRulesVersionsHandler(req: Request, res: Response) {
  await requireAdmin(req, res, async () => {
    try {
      const limit = req.query.limit ? parseInt(req.query.limit as string, 10) : 10;
      
      if (limit < 1 || limit > 100) {
        res.status(400).json({
          error: 'INVALID_LIMIT',
          message: 'Limit must be between 1 and 100',
        });
        return;
      }
      
      const result = await listCompletionRulesVersions(limit);
      res.status(200).json(result);
    } catch (error) {
      handleCompletionRulesError(error, res);
    }
  });
}

/**
 * GET /admin/settings/exportSettings/completionRules/versions/:version
 * Get a specific version of Completion Rules
 */
export async function getCompletionRulesVersionHandler(req: Request, res: Response) {
  await requireAdmin(req, res, async () => {
    try {
      const versionParam = req.params.version;
      const version = parseInt(versionParam, 10);
      
      if (isNaN(version) || version < 1) {
        res.status(400).json({
          error: 'INVALID_VERSION',
          message: 'Version must be a positive integer',
        });
        return;
      }
      
      const rules = await getCompletionRulesVersion(version);
      
      if (!rules) {
        res.status(404).json({
          error: 'VERSION_NOT_FOUND',
          message: `Completion rules version ${version} not found`,
        });
        return;
      }
      
      res.status(200).json(rules);
    } catch (error) {
      handleCompletionRulesError(error, res);
    }
  });
}