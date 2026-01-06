/**
 * Export Readiness Endpoint Tests
 * LP-export-ui-readiness-1.0.0
 * 
 * Tests for GET /api/admin/exports/readiness endpoint:
 * - Returns 200 with readiness payload when ready === true
 * - Returns 423 with readiness payload when ready === false
 * - Requires admin authentication
 */

import { describe, it, expect, beforeEach, vi } from 'vitest';
import type { Request, Response } from 'express';

// Mock completionDrivenExportReadiness service
vi.mock('../services/completionDrivenExportReadiness', () => ({
  calculateCompletionDrivenExportReadiness: vi.fn()
}));

import { readinessHandler } from './export';
import { calculateCompletionDrivenExportReadiness } from '../services/completionDrivenExportReadiness';

describe('Export Readiness Endpoint (LP-export-ui-readiness-1.0.0)', () => {
  
  let mockReq: Partial<Request>;
  let mockRes: Partial<Response>;
  let mockJson: ReturnType<typeof vi.fn>;
  let mockStatus: ReturnType<typeof vi.fn>;
  
  beforeEach(() => {
    vi.clearAllMocks();
    
    mockJson = vi.fn();
    mockStatus = vi.fn(() => ({ json: mockJson }));
    
    mockReq = {};
    
    mockRes = {
      status: mockStatus,
      json: mockJson
    };
  });

  describe('GET /api/admin/exports/readiness', () => {
    
    it('returns 200 with success:true when readiness.ready === true', async () => {
      // Mock ready readiness
      const readyReadiness = {
        ready: true,
        completionPct: 85,
        threshold: 80,
        hasBlockingSites: false,
        blockingReasons: [],
        operatorExplanation: {
          summary: 'Export ready: all products meet completion requirements',
          blockingIssues: [],
          completionBreakdown: [],
          siteStatus: [
            { site: 'shiekh.com', blocked: false }
          ],
          actionRequired: []
        },
        catalogStats: {
          totalProducts: 10,
          blockedByCompletionCount: 0,
          blockedBySiteCount: 0,
          readyCount: 10
        },
        evaluationTimestamp: '2026-01-07T10:00:00.000Z',
        rulesVersion: 1
      };
      
      vi.mocked(calculateCompletionDrivenExportReadiness).mockResolvedValue(readyReadiness);
      
      await readinessHandler(mockReq as Request, mockRes as Response);
      
      // Verify 200 status
      expect(mockStatus).toHaveBeenCalledWith(200);
      
      // Verify response structure
      expect(mockJson).toHaveBeenCalledWith({
        success: true,
        readiness: readyReadiness
      });
    });

    it('returns 423 with success:false when readiness.ready === false', async () => {
      // Mock blocked readiness
      const blockedReadiness = {
        ready: false,
        completionPct: 75,
        threshold: 80,
        hasBlockingSites: false,
        blockingReasons: [{
          type: 'COMPLETION_BELOW_THRESHOLD',
          severity: 'BLOCKING',
          message: 'Product prod-123: 75% below threshold 80%',
          details: {
            productId: 'prod-123',
            currentCompletion: 75,
            requiredCompletion: 80
          }
        }],
        operatorExplanation: {
          summary: 'Export blocked: 1 products below 80% threshold',
          blockingIssues: ['Product prod-123: 75% below threshold 80%'],
          completionBreakdown: [],
          siteStatus: [],
          actionRequired: ['Increase completion for 1 products to 80% or higher']
        },
        catalogStats: {
          totalProducts: 10,
          blockedByCompletionCount: 1,
          blockedBySiteCount: 0,
          readyCount: 9
        },
        evaluationTimestamp: '2026-01-07T10:00:00.000Z',
        rulesVersion: 1
      };
      
      vi.mocked(calculateCompletionDrivenExportReadiness).mockResolvedValue(blockedReadiness);
      
      await readinessHandler(mockReq as Request, mockRes as Response);
      
      // Verify 423 status (Locked)
      expect(mockStatus).toHaveBeenCalledWith(423);
      
      // Verify response structure
      expect(mockJson).toHaveBeenCalledWith({
        success: false,
        readiness: blockedReadiness
      });
    });

    it('returns 423 when blocked by site Description/SEO requirements', async () => {
      // Mock site-blocked readiness
      const siteBlockedReadiness = {
        ready: false,
        completionPct: 90,
        threshold: 80,
        hasBlockingSites: true,
        blockingReasons: [{
          type: 'SITE_DESCRIPTION_SEO_MISSING',
          severity: 'BLOCKING',
          message: 'Site shiekh.com blocked: missing description, seo_title',
          details: {
            productId: 'prod-456',
            site: 'shiekh.com',
            missingAttributes: ['description', 'seo_title']
          }
        }],
        operatorExplanation: {
          summary: 'Export blocked: site requirements not met',
          blockingIssues: ['Site shiekh.com blocked: missing description, seo_title'],
          completionBreakdown: [],
          siteStatus: [
            { site: 'shiekh.com', blocked: true, reason: 'Missing description, seo_title', missingAttributes: ['description', 'seo_title'] }
          ],
          actionRequired: ['Add description and seo_title for shiekh.com']
        },
        catalogStats: {
          totalProducts: 10,
          blockedByCompletionCount: 0,
          blockedBySiteCount: 1,
          readyCount: 9
        },
        evaluationTimestamp: '2026-01-07T10:00:00.000Z',
        rulesVersion: 1
      };
      
      vi.mocked(calculateCompletionDrivenExportReadiness).mockResolvedValue(siteBlockedReadiness);
      
      await readinessHandler(mockReq as Request, mockRes as Response);
      
      // Verify 423 status
      expect(mockStatus).toHaveBeenCalledWith(423);
      
      // Verify hasBlockingSites flag
      const responsePayload = mockJson.mock.calls[0][0];
      expect(responsePayload.readiness.hasBlockingSites).toBe(true);
      expect(responsePayload.readiness.blockingReasons[0].type).toBe('SITE_DESCRIPTION_SEO_MISSING');
    });

    it('returns 500 when service throws error', async () => {
      vi.mocked(calculateCompletionDrivenExportReadiness).mockRejectedValue(
        new Error('Firestore connection failed')
      );
      
      await readinessHandler(mockReq as Request, mockRes as Response);
      
      // Verify 500 status
      expect(mockStatus).toHaveBeenCalledWith(500);
      
      // Verify error response
      expect(mockJson).toHaveBeenCalledWith({
        success: false,
        error: 'EXPORT_READINESS_CHECK_FAILED',
        message: 'Firestore connection failed'
      });
    });

    it('calls calculateCompletionDrivenExportReadiness with correct parameters', async () => {
      const mockReadiness = {
        ready: true,
        completionPct: 85,
        threshold: 80,
        hasBlockingSites: false,
        blockingReasons: [],
        operatorExplanation: {
          summary: 'Export ready',
          blockingIssues: [],
          completionBreakdown: [],
          siteStatus: [],
          actionRequired: []
        },
        evaluationTimestamp: '2026-01-07T10:00:00.000Z',
        rulesVersion: 1
      };
      
      vi.mocked(calculateCompletionDrivenExportReadiness).mockResolvedValue(mockReadiness);
      
      await readinessHandler(mockReq as Request, mockRes as Response);
      
      // Verify service called with expected parameters
      expect(calculateCompletionDrivenExportReadiness).toHaveBeenCalledTimes(1);
      
      const callArgs = vi.mocked(calculateCompletionDrivenExportReadiness).mock.calls[0];
      
      // First arg: undefined (catalog-level, no specific product)
      expect(callArgs[0]).toBeUndefined();
      
      // Second arg: false (don't force rules refresh)
      expect(callArgs[1]).toBe(false);
      
      // Third arg: ISO timestamp string
      expect(typeof callArgs[2]).toBe('string');
      expect(callArgs[2]).toMatch(/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}/);
    });

    it('includes siteStatus in response when product has selected sites', async () => {
      const readinessWithSites = {
        ready: true,
        completionPct: 80,
        threshold: 80,
        hasBlockingSites: false,
        blockingReasons: [],
        operatorExplanation: {
          summary: 'Export ready',
          blockingIssues: [],
          completionBreakdown: [],
          siteStatus: [
            { site: 'shiekh.com', blocked: false },
            { site: 'ropi-web', blocked: false }
          ],
          actionRequired: []
        },
        catalogStats: {
          totalProducts: 5,
          blockedByCompletionCount: 0,
          blockedBySiteCount: 0,
          readyCount: 5
        },
        evaluationTimestamp: '2026-01-07T10:00:00.000Z',
        rulesVersion: 1
      };
      
      vi.mocked(calculateCompletionDrivenExportReadiness).mockResolvedValue(readinessWithSites);
      
      await readinessHandler(mockReq as Request, mockRes as Response);
      
      expect(mockStatus).toHaveBeenCalledWith(200);
      
      const responsePayload = mockJson.mock.calls[0][0];
      expect(responsePayload.readiness.operatorExplanation.siteStatus).toHaveLength(2);
      expect(responsePayload.readiness.operatorExplanation.siteStatus[0].site).toBe('shiekh.com');
    });
  });
});
