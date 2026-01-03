/**
 * Export Endpoint 423 Response Schema Tests
 * 
 * GOVERNANCE: Lock 423 response schema for operator-visible blocking.
 * Both endpoints (dry-run and run) MUST return identical structured payloads.
 */

import { describe, it, expect, beforeEach, vi } from 'vitest';
import type { Request, Response } from 'express';

// Mock all export dependencies
vi.mock('../services/completionDrivenExportReadiness', () => ({
  calculateCompletionDrivenExportReadiness: vi.fn()
}));

vi.mock('../services/exportService', () => ({
  runDryRunExport: vi.fn(),
  runFullExport: vi.fn()
}));

import { dryRunExportHandler, runExportHandler } from './export';
import { calculateCompletionDrivenExportReadiness } from '../services/completionDrivenExportReadiness';

describe('Export Endpoint 423 Response Schema', () => {
  
  let mockReq: Partial<Request>;
  let mockRes: Partial<Response>;
  let mockJson: any;
  let mockStatus: any;
  
  beforeEach(() => {
    vi.clearAllMocks();
    
    mockJson = vi.fn();
    mockStatus = vi.fn(() => ({ json: mockJson }));
    
    mockReq = {
      body: {
        site: 'us',
        limit: 100,
        format: 'ro_csv'
      }
    };
    
    mockRes = {
      status: mockStatus,
      json: mockJson
    };
  });
  
  it('dry-run endpoint returns locked 423 schema when blocked by threshold', async () => {
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
      evaluationTimestamp: '2026-01-03T14:00:00.000Z',
      rulesVersion: 1
    };
    
    (calculateCompletionDrivenExportReadiness as any).mockResolvedValue(blockedReadiness);
    
    await dryRunExportHandler(mockReq as Request, mockRes as Response);
    
    // Verify 423 status
    expect(mockStatus).toHaveBeenCalledWith(423);
    
    // Verify locked schema structure
    expect(mockJson).toHaveBeenCalledWith({
      success: false,
      error: 'EXPORT_BLOCKED_COMPLETION_GATE',
      message: 'Export blocked by completion requirements',
      readiness: blockedReadiness
    });
    
    // Extract actual payload
    const payload = mockJson.mock.calls[0][0];
    
    // GOVERNANCE: Verify required schema fields
    expect(payload.error).toBe('EXPORT_BLOCKED_COMPLETION_GATE');
    expect(payload.readiness.ready).toBe(false);
    expect(payload.readiness.blockingReasons).toBeDefined();
    expect(Array.isArray(payload.readiness.blockingReasons)).toBe(true);
    expect(payload.readiness.operatorExplanation.summary).toBeDefined();
    expect(Array.isArray(payload.readiness.operatorExplanation.actionRequired)).toBe(true);
    expect(Array.isArray(payload.readiness.operatorExplanation.siteStatus)).toBe(true);
  });
  
  it('run endpoint returns identical 423 schema when blocked by site', async () => {
    // Mock blocked readiness (site blocking)
    const blockedReadiness = {
      ready: false,
      completionPct: 0, // Forced to 0 when site-blocked
      threshold: 80,
      hasBlockingSites: true,
      blockingReasons: [{
        type: 'SITE_DESCRIPTION_SEO_MISSING',
        severity: 'BLOCKING',
        message: 'Product prod-456: missing Description/SEO attributes for uk',
        details: {
          productId: 'prod-456',
          site: 'uk',
          missingAttributes: ['title_uk']
        }
      }],
      operatorExplanation: {
        summary: 'Export blocked: 1 products missing Description/SEO attributes',
        blockingIssues: ['Product prod-456: missing Description/SEO attributes for uk'],
        completionBreakdown: [],
        siteStatus: [],
        actionRequired: ['Fix Description/SEO attributes for 1 products']
      },
      catalogStats: {
        totalProducts: 10,
        blockedByCompletionCount: 0,
        blockedBySiteCount: 1,
        readyCount: 9
      },
      evaluationTimestamp: '2026-01-03T14:00:00.000Z',
      rulesVersion: 1
    };
    
    (calculateCompletionDrivenExportReadiness as any).mockResolvedValue(blockedReadiness);
    
    await runExportHandler(mockReq as Request, mockRes as Response);
    
    // Verify 423 status
    expect(mockStatus).toHaveBeenCalledWith(423);
    
    // Verify locked schema structure (IDENTICAL to dry-run)
    expect(mockJson).toHaveBeenCalledWith({
      success: false,
      error: 'EXPORT_BLOCKED_COMPLETION_GATE',
      message: 'Export blocked by completion requirements',
      readiness: blockedReadiness
    });
    
    // Extract actual payload
    const payload = mockJson.mock.calls[0][0];
    
    // GOVERNANCE: Verify required schema fields (same checks as dry-run)
    expect(payload.error).toBe('EXPORT_BLOCKED_COMPLETION_GATE');
    expect(payload.readiness.ready).toBe(false);
    expect(payload.readiness.blockingReasons).toBeDefined();
    expect(Array.isArray(payload.readiness.blockingReasons)).toBe(true);
    expect(payload.readiness.operatorExplanation.summary).toBeDefined();
    expect(Array.isArray(payload.readiness.operatorExplanation.actionRequired)).toBe(true);
    expect(Array.isArray(payload.readiness.operatorExplanation.siteStatus)).toBe(true);
    
    // GOVERNANCE: Verify site blocking forces completionPct to 0
    expect(payload.readiness.completionPct).toBe(0);
    expect(payload.readiness.hasBlockingSites).toBe(true);
  });
  
  it('verifies catalogStats are present in 423 payload', async () => {
    const blockedReadiness = {
      ready: false,
      completionPct: 70,
      threshold: 80,
      hasBlockingSites: false,
      blockingReasons: [],
      operatorExplanation: {
        summary: 'Export blocked',
        blockingIssues: [],
        completionBreakdown: [],
        siteStatus: [],
        actionRequired: []
      },
      catalogStats: {
        totalProducts: 100,
        blockedByCompletionCount: 25,
        blockedBySiteCount: 5,
        readyCount: 70
      },
      evaluationTimestamp: '2026-01-03T14:00:00.000Z',
      rulesVersion: 1
    };
    
    (calculateCompletionDrivenExportReadiness as any).mockResolvedValue(blockedReadiness);
    
    await dryRunExportHandler(mockReq as Request, mockRes as Response);
    
    const payload = mockJson.mock.calls[0][0];
    
    // GOVERNANCE: catalogStats must be present for operator visibility
    expect(payload.readiness.catalogStats).toBeDefined();
    expect(payload.readiness.catalogStats.totalProducts).toBe(100);
    expect(payload.readiness.catalogStats.blockedByCompletionCount).toBe(25);
    expect(payload.readiness.catalogStats.blockedBySiteCount).toBe(5);
    expect(payload.readiness.catalogStats.readyCount).toBe(70);
  });
});
