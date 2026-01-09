/**
 * Admin Evaluator Endpoints
 * 
 * Provides observability and control endpoints for the completion evaluator.
 * 
 * LP-phase2b-003: Live registry integration observability
 */

import { requireAdmin } from '../../middleware/auth';
import type { Request, Response } from 'express';
import { 
  getRegistryMetadata, 
  refreshRegistry, 
  isCacheValid 
} from '../../services/attributeRegistryService';

/**
 * GET /admin/evaluator/status
 * 
 * Returns current evaluator status including:
 * - Registry source (firestore/bundled)
 * - Last refresh timestamp
 * - Cache validity
 * - Attribute count
 * - Load duration
 * - Any errors
 */
export async function getEvaluatorStatus(req: Request, res: Response) {
  await requireAdmin(req, res, async () => {
    try {
      const metadata = getRegistryMetadata();
      const cacheValid = isCacheValid();
      
      res.status(200).json({
        status: 'operational',
        registry: {
          source: metadata.source,
          last_refresh: metadata.lastRefresh?.toISOString() || null,
          attribute_count: metadata.attributeCount,
          load_duration_ms: metadata.loadDurationMs,
          cache_valid: cacheValid,
          error: metadata.error
        },
        timestamp: new Date().toISOString()
      });
    } catch (error: any) {
      console.error('[getEvaluatorStatus] Error:', error);
      res.status(500).json({
        error: 'EVALUATOR_STATUS_ERROR',
        message: error.message || 'Failed to retrieve evaluator status'
      });
    }
  });
}

/**
 * POST /admin/evaluator/refresh
 * 
 * Force refresh the attribute registry cache.
 * Useful for testing or manual updates.
 */
export async function refreshEvaluatorRegistry(req: Request, res: Response) {
  await requireAdmin(req, res, async () => {
    try {
      console.log('[refreshEvaluatorRegistry] Manual refresh requested');
      
      const metadata = await refreshRegistry();
      
      res.status(200).json({
        message: 'Registry refreshed successfully',
        registry: {
          source: metadata.source,
          last_refresh: metadata.lastRefresh?.toISOString() || null,
          attribute_count: metadata.attributeCount,
          load_duration_ms: metadata.loadDurationMs,
          error: metadata.error
        },
        timestamp: new Date().toISOString()
      });
    } catch (error: any) {
      console.error('[refreshEvaluatorRegistry] Error:', error);
      res.status(500).json({
        error: 'REGISTRY_REFRESH_ERROR',
        message: error.message || 'Failed to refresh registry'
      });
    }
  });
}
