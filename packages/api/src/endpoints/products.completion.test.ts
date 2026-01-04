/**
 * Product Completion Endpoint Tests
 * LP-completion-operator-explainability-1.2.0
 * 
 * Tests for GET /api/products/:productId/completion
 * Verifies operator-visible explanation payload structure and completeness.
 */

import { describe, it, expect, beforeEach, vi } from 'vitest';
import type { Request, Response } from 'express';
import * as admin from 'firebase-admin';

// Mock Firebase
vi.mock('firebase-admin', () => ({
  firestore: vi.fn(() => ({
    collection: vi.fn((name) => ({
      doc: vi.fn((id) => ({
        get: vi.fn(),
      }),
    })),
  })),
}));

// Mock completion readiness service
vi.mock('../services/completionDrivenExportReadiness', () => ({
  calculateCompletionDrivenExportReadiness: vi.fn(),
}));

// Mock auth middleware
vi.mock('../middleware/auth', () => ({
  requireAdmin: (req: Request, res: Response, handler: Function) => handler(),
}));

import { getProductCompletionHandler } from './products';
import { calculateCompletionDrivenExportReadiness } from '../services/completionDrivenExportReadiness';

describe('GET /api/products/:productId/completion', () => {
  let mockReq: Partial<Request>;
  let mockRes: Partial<Response>;
  let mockJson: any;
  let mockStatus: any;
  let mockFirestore: any;

  beforeEach(() => {
    vi.clearAllMocks();

    mockJson = vi.fn(() => ({}));
    mockStatus = vi.fn(() => ({ json: mockJson }));

    mockReq = {
      params: {
        productId: 'test-product-123',
      },
    };

    mockRes = {
      status: mockStatus,
      json: mockJson,
    };

    // Setup Firebase mock
    const mockProductRef = {
      get: vi.fn(),
    };
    const mockDoc = vi.fn(() => mockProductRef);
    const mockCollection = vi.fn(() => ({ doc: mockDoc }));
    mockFirestore = {
      collection: mockCollection,
    };

    vi.mocked(admin.firestore).mockReturnValue(mockFirestore as any);
  });

  describe('Basic Endpoint Behavior', () => {
    it('returns 400 if productId is missing', async () => {
      mockReq.params = {};

      await getProductCompletionHandler(mockReq as Request, mockRes as Response);

      expect(mockStatus).toHaveBeenCalledWith(400);
      expect(mockJson).toHaveBeenCalledWith(
        expect.objectContaining({
          error: 'MISSING_PRODUCT_ID',
          message: expect.any(String),
        })
      );
    });

    it('returns 404 if product does not exist', async () => {
      const mockProductDoc = { exists: false };
      const mockProductRef = { get: vi.fn().mockResolvedValue(mockProductDoc) };
      vi.mocked(mockFirestore.collection).mockReturnValue({
        doc: vi.fn().mockReturnValue(mockProductRef),
      } as any);

      await getProductCompletionHandler(mockReq as Request, mockRes as Response);

      expect(mockStatus).toHaveBeenCalledWith(404);
      expect(mockJson).toHaveBeenCalledWith(
        expect.objectContaining({
          error: 'PRODUCT_NOT_FOUND',
        })
      );
    });

    it('returns 200 with CompletionDrivenExportReadiness on success', async () => {
      const mockProductDoc = {
        exists: true,
        data: vi.fn().mockReturnValue({
          id: 'test-product-123',
          name: 'Test Product',
        }),
      };

      const mockProductRef = { get: vi.fn().mockResolvedValue(mockProductDoc) };
      vi.mocked(mockFirestore.collection).mockReturnValue({
        doc: vi.fn().mockReturnValue(mockProductRef),
      } as any);

      const mockReadiness = {
        ready: true,
        completionPct: 95,
        threshold: 80,
        blockingReasons: [],
        operatorExplanation: {
          summary: 'Product 95% complete (export ready)',
          blockingIssues: [],
          completionBreakdown: [],
          siteStatus: [],
          actionRequired: [],
        },
        evaluationTimestamp: '2026-01-04T00:00:00Z',
        rulesVersion: 1,
      };

      vi.mocked(calculateCompletionDrivenExportReadiness).mockResolvedValue(
        mockReadiness
      );

      await getProductCompletionHandler(mockReq as Request, mockRes as Response);

      expect(mockStatus).toHaveBeenCalledWith(200);
      expect(mockJson).toHaveBeenCalledWith(mockReadiness);
    });
  });

  describe('Completion Readiness Schema', () => {
    beforeEach(() => {
      const mockProductDoc = {
        exists: true,
        data: vi.fn().mockReturnValue({}),
      };
      const mockProductRef = { get: vi.fn().mockResolvedValue(mockProductDoc) };
      vi.mocked(mockFirestore.collection).mockReturnValue({
        doc: vi.fn().mockReturnValue(mockProductRef),
      } as any);
    });

    it('returns complete operatorExplanation with all required fields', async () => {
      const mockReadiness = {
        ready: false,
        completionPct: 75,
        threshold: 80,
        hasBlockingSites: false,
        blockingReasons: [
          {
            type: 'COMPLETION_BELOW_THRESHOLD',
            severity: 'BLOCKING',
            message: 'Product 5% below threshold',
            details: {
              currentCompletion: 75,
              requiredCompletion: 80,
            },
          },
        ],
        operatorExplanation: {
          summary: 'Export blocked: product 75% complete (threshold: 80%)',
          blockingIssues: [
            'Product ABC: 75% complete (threshold 80%)',
          ],
          completionBreakdown: [
            {
              segmentId: 'description-seo',
              segmentName: 'Description/SEO',
              score: 50,
              weightPct: 25,
              missingAttributes: ['title', 'description'],
            },
            {
              segmentId: 'pricing',
              segmentName: 'Pricing',
              score: 100,
              weightPct: 25,
              missingAttributes: [],
            },
          ],
          siteStatus: [
            {
              site: 'us',
              blocked: false,
            },
            {
              site: 'uk',
              blocked: true,
              reason: 'Missing Description/SEO for site uk',
              missingAttributes: ['title_uk', 'description_uk'],
            },
          ],
          actionRequired: [
            'Complete Description/SEO segment (title, description)',
            'Complete site-specific attributes for uk (title_uk, description_uk)',
          ],
        },
        catalogStats: undefined,
        evaluationTimestamp: '2026-01-04T12:00:00Z',
        rulesVersion: 1,
      };

      vi.mocked(calculateCompletionDrivenExportReadiness).mockResolvedValue(
        mockReadiness
      );

      await getProductCompletionHandler(mockReq as Request, mockRes as Response);

      const payload = mockJson.mock.calls[0][0];

      // Verify top-level fields
      expect(payload).toHaveProperty('ready');
      expect(payload).toHaveProperty('completionPct');
      expect(payload).toHaveProperty('threshold');
      expect(payload).toHaveProperty('blockingReasons');
      expect(payload).toHaveProperty('operatorExplanation');
      expect(payload).toHaveProperty('evaluationTimestamp');
      expect(payload).toHaveProperty('rulesVersion');

      // Verify operatorExplanation fields
      const explanation = payload.operatorExplanation;
      expect(explanation).toHaveProperty('summary');
      expect(explanation).toHaveProperty('blockingIssues');
      expect(explanation).toHaveProperty('completionBreakdown');
      expect(explanation).toHaveProperty('siteStatus');
      expect(explanation).toHaveProperty('actionRequired');

      // Verify completionBreakdown structure
      expect(Array.isArray(explanation.completionBreakdown)).toBe(true);
      const segment = explanation.completionBreakdown[0];
      expect(segment).toHaveProperty('segmentId');
      expect(segment).toHaveProperty('segmentName');
      expect(segment).toHaveProperty('score');
      expect(segment).toHaveProperty('weightPct');
      expect(segment).toHaveProperty('missingAttributes');

      // Verify siteStatus structure
      expect(Array.isArray(explanation.siteStatus)).toBe(true);
      const siteStatus = explanation.siteStatus[0];
      expect(siteStatus).toHaveProperty('site');
      expect(siteStatus).toHaveProperty('blocked');
    });

    it('returns ready=true when product meets completion threshold', async () => {
      const mockReadiness = {
        ready: true,
        completionPct: 95,
        threshold: 80,
        hasBlockingSites: false,
        blockingReasons: [],
        operatorExplanation: {
          summary: 'Product 95% complete (export ready)',
          blockingIssues: [],
          completionBreakdown: [
            {
              segmentId: 'description-seo',
              segmentName: 'Description/SEO',
              score: 100,
              weightPct: 25,
              missingAttributes: [],
            },
          ],
          siteStatus: [
            {
              site: 'us',
              blocked: false,
            },
          ],
          actionRequired: [],
        },
        evaluationTimestamp: '2026-01-04T12:00:00Z',
        rulesVersion: 1,
      };

      vi.mocked(calculateCompletionDrivenExportReadiness).mockResolvedValue(
        mockReadiness
      );

      await getProductCompletionHandler(mockReq as Request, mockRes as Response);

      const payload = mockJson.mock.calls[0][0];
      expect(payload.ready).toBe(true);
      expect(payload.completionPct).toBe(95);
      expect(payload.operatorExplanation.blockingIssues.length).toBe(0);
      expect(payload.operatorExplanation.actionRequired.length).toBe(0);
    });

    it('includes site-specific blocking in operatorExplanation', async () => {
      const mockReadiness = {
        ready: false,
        completionPct: 0, // Forced to 0 by site blocking
        threshold: 80,
        hasBlockingSites: true,
        blockingReasons: [
          {
            type: 'SITE_DESCRIPTION_SEO_MISSING',
            severity: 'BLOCKING',
            message: 'Missing Description/SEO for site uk',
            details: {
              site: 'uk',
              missingAttributes: ['title_uk', 'description_uk'],
            },
          },
        ],
        operatorExplanation: {
          summary: 'Export blocked: missing Description/SEO attributes for uk',
          blockingIssues: [],
          completionBreakdown: [
            {
              segmentId: 'description-seo',
              segmentName: 'Description/SEO',
              score: 0,
              weightPct: 25,
              missingAttributes: ['title_uk', 'description_uk'],
            },
          ],
          siteStatus: [
            {
              site: 'us',
              blocked: false,
            },
            {
              site: 'uk',
              blocked: true,
              reason: 'Missing Description/SEO for site uk',
              missingAttributes: ['title_uk', 'description_uk'],
            },
          ],
          actionRequired: [
            'Add Description/SEO attributes for uk site (title_uk, description_uk)',
          ],
        },
        evaluationTimestamp: '2026-01-04T12:00:00Z',
        rulesVersion: 1,
      };

      vi.mocked(calculateCompletionDrivenExportReadiness).mockResolvedValue(
        mockReadiness
      );

      await getProductCompletionHandler(mockReq as Request, mockRes as Response);

      const payload = mockJson.mock.calls[0][0];
      const ukSiteStatus = payload.operatorExplanation.siteStatus.find(
        (s: any) => s.site === 'uk'
      );

      expect(ukSiteStatus).toBeDefined();
      expect(ukSiteStatus.blocked).toBe(true);
      expect(ukSiteStatus.missingAttributes).toContain('title_uk');
      expect(ukSiteStatus.missingAttributes).toContain('description_uk');
    });
  });

  describe('Error Handling', () => {
    it('returns 500 on Firestore error', async () => {
      const mockProductRef = {
        get: vi.fn().mockRejectedValue(new Error('Firestore error')),
      };
      vi.mocked(mockFirestore.collection).mockReturnValue({
        doc: vi.fn().mockReturnValue(mockProductRef),
      } as any);

      await getProductCompletionHandler(mockReq as Request, mockRes as Response);

      expect(mockStatus).toHaveBeenCalledWith(500);
      expect(mockJson).toHaveBeenCalledWith(
        expect.objectContaining({
          error: 'INTERNAL_ERROR',
        })
      );
    });

    it('returns 500 on completion evaluation error', async () => {
      const mockProductDoc = {
        exists: true,
        data: vi.fn().mockReturnValue({}),
      };
      const mockProductRef = { get: vi.fn().mockResolvedValue(mockProductDoc) };
      vi.mocked(mockFirestore.collection).mockReturnValue({
        doc: vi.fn().mockReturnValue(mockProductRef),
      } as any);

      vi.mocked(calculateCompletionDrivenExportReadiness).mockRejectedValue(
        new Error('Evaluation failed')
      );

      await getProductCompletionHandler(mockReq as Request, mockRes as Response);

      expect(mockStatus).toHaveBeenCalledWith(500);
      expect(mockJson).toHaveBeenCalledWith(
        expect.objectContaining({
          error: 'INTERNAL_ERROR',
        })
      );
    });
  });
});
