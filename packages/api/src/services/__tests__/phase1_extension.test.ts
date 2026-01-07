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
vi.mock('../completionEvaluationEngineEntry', () => ({
  evaluateCompletion: () => ({
    totalCompletionPct: 95,
    hasBlockingSites: false,
    siteBlockingReasons: [],
    segmentResults: []
  })
}));

import { calculateCompletionDrivenExportReadiness } from '../completionDrivenExportReadiness';

describe('Phase 1 Readiness Extension', () => {
  beforeEach(() => {
    // Enable feature via env fallback
    process.env.EXPORT_GLOBAL_MODE_FEATURE = 'true';
  });

  it('exposes mode and productLevelReadiness when feature enabled (product)', async () => {
    const product: any = {
      id: 'p-1',
      sites: ['siteA'],
      attributes: {}
    };

    const result = await calculateCompletionDrivenExportReadiness(product, false, '2026-01-07T00:00:00Z');
    expect(result.ready).toBe(true);
    expect(result.completionPct).toBe(95);
    expect(result.threshold).toBe(80);

    // Phase 1 fields
    expect(result.mode).toBe('GLOBAL');
    expect(result.productLevelReadiness).toBeDefined();
    expect(result.productLevelReadiness?.ready).toBe(result.ready);
    expect(result.productLevelReadiness?.completionPct).toBe(result.completionPct);
  });

  it('does not crash when feature disabled', async () => {
    process.env.EXPORT_GLOBAL_MODE_FEATURE = 'false';
    const product: any = { id: 'p-2', sites: ['siteB'], attributes: {} };
    const result = await calculateCompletionDrivenExportReadiness(product, false, '2026-01-07T00:00:00Z');
    expect(result.mode).toBeUndefined();
    expect(result.productLevelReadiness).toBeUndefined();
  });
});
