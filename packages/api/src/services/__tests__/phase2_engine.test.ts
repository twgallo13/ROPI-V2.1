import { describe, it, expect, vi, beforeEach } from 'vitest';

// Mock completionRulesService
vi.mock('../completionRulesService', () => ({
  loadCompletionRules: async () => ({ exportUnlockThresholdPct: 80, rulesVersion: 1 })
}));

// Mock exportService
vi.mock('../exportService', () => ({
  loadExportableAttributes: async () => new Map()
}));

// Mock completionEvaluationEngineEntry
const mockEvaluateCompletion = vi.fn();
vi.mock('../completionEvaluationEngineEntry', () => ({
  evaluateCompletion: (...args: any[]) => mockEvaluateCompletion(...args)
}));

import { calculateCompletionDrivenExportReadiness } from '../completionDrivenExportReadiness';

describe('Phase 2: Product-Level Aggregation (GLOBAL Mode)', () => {
  beforeEach(() => {
    mockEvaluateCompletion.mockReset();
    process.env.EXPORT_GLOBAL_MODE_FEATURE = 'true';
    process.env.EXPORT_GLOBAL_LOGS = 'true';
  });

  describe('aggregateProductLevelReadiness', () => {
    it('should aggregate segment scores using BEST-score-per-segment algorithm', async () => {
      // Mock multi-site evaluation: site A has 90% completion, site B has 85%
      // Segment 1: site A 95%, site B 80% → aggregate to 95% (BEST)
      // Segment 2: site A 85%, site B 90% → aggregate to 90% (BEST)
      // Weight: 50% each → (95*50 + 90*50) / 100 = 92.5%
      
      mockEvaluateCompletion.mockImplementation((snapshot, sites, registry, rules) => {
        if (sites[0] === 'siteA') {
          return {
            totalCompletionPct: 90,
            hasBlockingSites: false,
            siteBlockingReasons: [],
            segmentResults: [
              { segmentId: 'seg1', segmentName: 'Segment 1', score: 95, weightPct: 50, missingAttributes: [] },
              { segmentId: 'seg2', segmentName: 'Segment 2', score: 85, weightPct: 50, missingAttributes: ['attr2'] }
            ]
          };
        }
        if (sites[0] === 'siteB') {
          return {
            totalCompletionPct: 85,
            hasBlockingSites: false,
            siteBlockingReasons: [],
            segmentResults: [
              { segmentId: 'seg1', segmentName: 'Segment 1', score: 80, weightPct: 50, missingAttributes: ['attr1'] },
              { segmentId: 'seg2', segmentName: 'Segment 2', score: 90, weightPct: 50, missingAttributes: [] }
            ]
          };
        }
        return { segmentResults: [], totalCompletionPct: 0, hasBlockingSites: false, siteBlockingReasons: [] };
      });

      const product: any = {
        id: 'p-multi-site',
        sites: ['siteA', 'siteB'],
        attributes: {}
      };

      const result = await calculateCompletionDrivenExportReadiness(product, false, '2026-01-07T00:00:00Z');

      expect(result.mode).toBe('GLOBAL');
      expect(result.productLevelReadiness).toBeDefined();
      const pLR = result.productLevelReadiness as any;
      expect(pLR.aggregatedCompletionPct).toBe(92); // Rounded (92.5)
      expect(pLR.segmentScores.length).toBe(2);
      expect(pLR.segmentScores[0].score).toBe(95); // BEST from seg1
      expect(pLR.segmentScores[1].score).toBe(90); // BEST from seg2
      expect(pLR.sitesEvaluated).toEqual(['siteA', 'siteB']);
    });

    it('should collect union of missing attributes across segments', async () => {
      mockEvaluateCompletion.mockImplementation((snapshot, sites) => {
        if (sites[0] === 'siteA') {
          return {
            totalCompletionPct: 75,
            hasBlockingSites: false,
            siteBlockingReasons: [],
            segmentResults: [
              { segmentId: 'seg1', segmentName: 'Segment 1', score: 75, weightPct: 100, missingAttributes: ['attrA', 'attrB'] }
            ]
          };
        }
        if (sites[0] === 'siteB') {
          return {
            totalCompletionPct: 70,
            hasBlockingSites: false,
            siteBlockingReasons: [],
            segmentResults: [
              { segmentId: 'seg1', segmentName: 'Segment 1', score: 70, weightPct: 100, missingAttributes: ['attrB', 'attrC'] }
            ]
          };
        }
        return { segmentResults: [], totalCompletionPct: 0, hasBlockingSites: false, siteBlockingReasons: [] };
      });

      const product: any = { id: 'p-missing', sites: ['siteA', 'siteB'], attributes: {} };
      const result = await calculateCompletionDrivenExportReadiness(product, false, '2026-01-07T00:00:00Z');

      const pLR = result.productLevelReadiness as any;
      expect(pLR.missingGlobalAttributes).toContain('attrA');
      expect(pLR.missingGlobalAttributes).toContain('attrB');
      expect(pLR.missingGlobalAttributes).toContain('attrC');
      expect(pLR.missingGlobalAttributes).toEqual(expect.arrayContaining(['attrA', 'attrB', 'attrC']));
    });

    it('should identify blocking segments (score < 100)', async () => {
      mockEvaluateCompletion.mockImplementation(() => ({
        totalCompletionPct: 85,
        hasBlockingSites: false,
        siteBlockingReasons: [],
        segmentResults: [
          { segmentId: 'seg1', segmentName: 'Complete Segment', score: 100, weightPct: 50, missingAttributes: [] },
          { segmentId: 'seg2', segmentName: 'Blocking Segment', score: 70, weightPct: 50, missingAttributes: ['missing'] }
        ]
      }));

      const product: any = { id: 'p-blocking', sites: ['siteA'], attributes: {} };
      const result = await calculateCompletionDrivenExportReadiness(product, false, '2026-01-07T00:00:00Z');

      const pLR = result.productLevelReadiness as any;
      expect(pLR.blockingSegments).toEqual(['seg2']);
    });

    it('should handle product with no sites (website optional)', async () => {
      mockEvaluateCompletion.mockImplementation(() => ({
        totalCompletionPct: 95,
        hasBlockingSites: false,
        siteBlockingReasons: [],
        segmentResults: [
          { segmentId: 'seg1', segmentName: 'Segment 1', score: 95, weightPct: 100, missingAttributes: [] }
        ]
      }));

      const product: any = { id: 'p-no-sites', attributes: {} }; // No sites field
      const result = await calculateCompletionDrivenExportReadiness(product, false, '2026-01-07T00:00:00Z');

      const pLR = result.productLevelReadiness as any;
      expect(pLR.websiteOptional).toBe(true);
      expect(pLR.sitesEvaluated).toEqual(['__GLOBAL__']);
    });

    it('should return ready true when aggregation >= threshold', async () => {
      mockEvaluateCompletion.mockImplementation(() => ({
        totalCompletionPct: 92,
        hasBlockingSites: false,
        siteBlockingReasons: [],
        segmentResults: [
          { segmentId: 'seg1', segmentName: 'Segment 1', score: 92, weightPct: 100, missingAttributes: [] }
        ]
      }));

      const product: any = { id: 'p-ready', sites: ['siteA'], attributes: {} };
      const result = await calculateCompletionDrivenExportReadiness(product, false, '2026-01-07T00:00:00Z');

      expect(result.ready).toBe(true); // 92% >= 80% threshold
      expect(result.blockingReasons).toEqual([]);
    });

    it('should return ready false when aggregation < threshold', async () => {
      mockEvaluateCompletion.mockImplementation(() => ({
        totalCompletionPct: 75,
        hasBlockingSites: false,
        siteBlockingReasons: [],
        segmentResults: [
          { segmentId: 'seg1', segmentName: 'Segment 1', score: 75, weightPct: 100, missingAttributes: ['attr'] }
        ]
      }));

      const product: any = { id: 'p-blocked', sites: ['siteA'], attributes: {} };
      const result = await calculateCompletionDrivenExportReadiness(product, false, '2026-01-07T00:00:00Z');

      expect(result.ready).toBe(false); // 75% < 80% threshold
      expect(result.blockingReasons.length).toBeGreaterThan(0);
      expect(result.blockingReasons[0].type).toBe('COMPLETION_BELOW_THRESHOLD');
    });

    it('should exclude description-seo site-blocking segment from aggregation', async () => {
      mockEvaluateCompletion.mockImplementation((snapshot, sites) => {
        if (sites[0] === 'siteA') {
          return {
            totalCompletionPct: 90,
            hasBlockingSites: false,
            siteBlockingReasons: [],
            segmentResults: [
              { segmentId: 'description-seo', segmentName: 'Description/SEO', score: 0, weightPct: 20, missingAttributes: ['desc'] },
              { segmentId: 'seg1', segmentName: 'Segment 1', score: 90, weightPct: 80, missingAttributes: [] }
            ]
          };
        }
        return { segmentResults: [], totalCompletionPct: 0, hasBlockingSites: false, siteBlockingReasons: [] };
      });

      const product: any = { id: 'p-no-seo', sites: ['siteA'], attributes: {} };
      const result = await calculateCompletionDrivenExportReadiness(product, false, '2026-01-07T00:00:00Z');

      const pLR = result.productLevelReadiness as any;
      // Should only have seg1 (90% × 100 / 100 = 90%)
      expect(pLR.segmentScores.map((s: any) => s.segmentId)).not.toContain('description-seo');
      expect(pLR.aggregatedCompletionPct).toBe(90);
    });

    it('should preserve siteStatus in operatorExplanation', async () => {
      mockEvaluateCompletion.mockImplementation(() => ({
        totalCompletionPct: 85,
        hasBlockingSites: false,
        siteBlockingReasons: [],
        segmentResults: [
          { segmentId: 'seg1', segmentName: 'Segment 1', score: 85, weightPct: 100, missingAttributes: [] }
        ]
      }));

      const product: any = { id: 'p-status', sites: ['siteA', 'siteB'], attributes: {} };
      const result = await calculateCompletionDrivenExportReadiness(product, false, '2026-01-07T00:00:00Z');

      expect(result.operatorExplanation.siteStatus).toBeDefined();
      expect(result.operatorExplanation.siteStatus.length).toBe(2);
      expect(result.operatorExplanation.siteStatus.map((s: any) => s.site)).toEqual(['siteA', 'siteB']);
    });
  });

  describe('Performance', () => {
    it('should complete 5-site aggregation within 500ms', async () => {
      mockEvaluateCompletion.mockImplementation(() => ({
        totalCompletionPct: 88,
        hasBlockingSites: false,
        siteBlockingReasons: [],
        segmentResults: [
          { segmentId: 'seg1', segmentName: 'Segment 1', score: 88, weightPct: 100, missingAttributes: [] }
        ]
      }));

      const product: any = {
        id: 'p-perf',
        sites: ['siteA', 'siteB', 'siteC', 'siteD', 'siteE'],
        attributes: {}
      };

      const startTime = Date.now();
      const result = await calculateCompletionDrivenExportReadiness(product, false, '2026-01-07T00:00:00Z');
      const duration = Date.now() - startTime;

      expect(duration).toBeLessThan(500);
      expect(result.ready).toBe(true);
    }, { timeout: 1000 });
  });

  describe('Fallback Behavior', () => {
    it('should disable Phase 2 when feature flag is OFF', async () => {
      process.env.EXPORT_GLOBAL_MODE_FEATURE = 'false';

      mockEvaluateCompletion.mockImplementation(() => ({
        totalCompletionPct: 90,
        hasBlockingSites: false,
        siteBlockingReasons: [],
        segmentResults: [
          { segmentId: 'seg1', segmentName: 'Segment 1', score: 90, weightPct: 100, missingAttributes: [] }
        ]
      }));

      const product: any = { id: 'p-fallback', sites: ['siteA'], attributes: {} };
      const result = await calculateCompletionDrivenExportReadiness(product, false, '2026-01-07T00:00:00Z');

      // Should fall through to SITE_SCOPED behavior (mode not present)
      expect(result.mode).toBeUndefined();
    });
  });
});
