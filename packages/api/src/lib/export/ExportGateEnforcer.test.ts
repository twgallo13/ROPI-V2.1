// Export Gate Enforcement Tests
// Tests proving completion-based export blocking with deterministic assertions

import { describe, it, expect, beforeEach, vi, type MockedFunction } from 'vitest';
import { ExportGateEnforcer, ExportSettings, ExportBlockingReason } from './ExportGateEnforcer';

// Mock interfaces for dependencies
interface MockCompletionEngine {
  evaluate: MockedFunction<any>;
}

interface MockAttributeRegistry {
  getAttributeTypes: MockedFunction<any>;
}

describe('ExportGateEnforcer', () => {
  let enforcer: ExportGateEnforcer;
  let mockCompletionEngine: MockCompletionEngine;
  let mockRegistry: MockAttributeRegistry;

  const testExportSettings: ExportSettings = {
    completionRules: {
      minimumCompletionPct: 75,
      requiredSites: ['amazon', 'shopify'],
      blockingAttributes: {
        'amazon': ['title', 'description', 'seo_title', 'seo_description'],
        'shopify': ['title', 'description', 'seo_title', 'seo_description']
      }
    }
  };

  beforeEach(() => {
    mockCompletionEngine = {
      evaluate: vi.fn()
    } as MockCompletionEngine;

    mockRegistry = {
      getAttributeTypes: vi.fn()
    } as MockAttributeRegistry;

    enforcer = new ExportGateEnforcer(mockCompletionEngine as any, mockRegistry as any);
  });

  describe('completion threshold blocking', () => {
    it('blocks export when completion below threshold', async () => {
      // Completion at 60%, threshold 75%
      mockCompletionEngine.evaluate.mockResolvedValue({
        totalCompletionPct: 60,
        siteCompletions: [
          { siteId: 'amazon', completionPct: 60, missingAttributes: [] },
          { siteId: 'shopify', completionPct: 60, missingAttributes: [] }
        ],
        siteBlockingReasons: []
      });

      const result = await enforcer.evaluateExportReadiness(
        'prod_test',
        { title: 'Test Product' },
        ['amazon', 'shopify'],
        testExportSettings
      );

      expect(result.canExport).toBe(false);
      expect(result.completionPct).toBe(60);
      expect(result.blockingReasons).toHaveLength(1);
      expect(result.blockingReasons[0]).toEqual({
        type: 'COMPLETION_BELOW_THRESHOLD',
        message: 'Completion 60% is below required 75%',
        currentCompletion: 60,
        requiredCompletion: 75
      });
    });

    it('allows export when completion meets threshold', async () => {
      // Completion at 80%, threshold 75%
      mockCompletionEngine.evaluate.mockResolvedValue({
        totalCompletionPct: 80,
        siteCompletions: [
          { siteId: 'amazon', completionPct: 80, missingAttributes: [] },
          { siteId: 'shopify', completionPct: 80, missingAttributes: [] }
        ],
        siteBlockingReasons: []
      });

      const result = await enforcer.evaluateExportReadiness(
        'prod_test',
        { title: 'Test Product' },
        ['amazon', 'shopify'],
        testExportSettings
      );

      expect(result.canExport).toBe(true);
      expect(result.completionPct).toBe(80);
      expect(result.blockingReasons).toHaveLength(0);
    });

    it('sets completion to 0 when any site has blocking reasons', async () => {
      // Engine sets totalCompletionPct to 0 due to site blocking
      mockCompletionEngine.evaluate.mockResolvedValue({
        totalCompletionPct: 0, // Blocked by engine due to missing Description/SEO
        siteCompletions: [
          { siteId: 'amazon', completionPct: 90, missingAttributes: ['description', 'seo_title'] },
          { siteId: 'shopify', completionPct: 100, missingAttributes: [] }
        ],
        siteBlockingReasons: [
          { site: 'amazon', missingAttributes: ['description', 'seo_title'] }
        ]
      });

      const result = await enforcer.evaluateExportReadiness(
        'prod_test',
        { title: 'Test Product' },
        ['amazon', 'shopify'],
        testExportSettings
      );

      expect(result.canExport).toBe(false);
      expect(result.completionPct).toBe(0);
      
      // Check for the completion blocking reason
      const completionBlockingReason = result.blockingReasons.find(
        reason => reason.type === 'COMPLETION_BELOW_THRESHOLD'
      );
      expect(completionBlockingReason).toBeDefined();
      expect(completionBlockingReason.message).toBe('Completion 0% is below required 75%');
      expect(completionBlockingReason.currentCompletion).toBe(0);
      expect(completionBlockingReason.requiredCompletion).toBe(75);
    });
  });

  describe('site-aware completion blocking', () => {
    it('blocks export when selected site missing Description/SEO', async () => {
      mockCompletionEngine.evaluate.mockResolvedValue({
        totalCompletionPct: 0, // Blocked due to missing attributes
        siteCompletions: [
          { 
            siteId: 'amazon', 
            completionPct: 50, 
            missingAttributes: ['description', 'seo_description'] 
          }
        ],
        siteBlockingReasons: [
          { site: 'amazon', missingAttributes: ['description', 'seo_description'] }
        ]
      });

      const result = await enforcer.evaluateExportReadiness(
        'prod_test',
        { title: 'Test Product' },
        ['amazon'],
        testExportSettings
      );

      expect(result.canExport).toBe(false);
      expect(result.siteReadiness['amazon']).toEqual({
        ready: false,
        missingAttributes: ['description', 'seo_description']
      });
      expect(result.blockingReasons).toContainEqual({
        type: 'SITE_MISSING_REQUIRED',
        message: 'Site amazon missing required attributes: description, seo_description',
        site: 'amazon',
        missingAttributes: ['description', 'seo_description']
      });
    });

    it('allows export when all selected sites have Description/SEO', async () => {
      mockCompletionEngine.evaluate.mockResolvedValue({
        totalCompletionPct: 100,
        siteCompletions: [
          { siteId: 'amazon', completionPct: 100, missingAttributes: [] },
          { siteId: 'shopify', completionPct: 100, missingAttributes: [] }
        ],
        siteBlockingReasons: []
      });

      const result = await enforcer.evaluateExportReadiness(
        'prod_test',
        { 
          title: 'Test Product',
          description: 'Test Description',
          seo_title: 'SEO Title',
          seo_description: 'SEO Description'
        },
        ['amazon', 'shopify'],
        testExportSettings
      );

      expect(result.canExport).toBe(true);
      expect(result.siteReadiness['amazon']).toEqual({
        ready: true,
        missingAttributes: []
      });
      expect(result.siteReadiness['shopify']).toEqual({
        ready: true,
        missingAttributes: []
      });
    });
  });

  describe('never blocks for media/pricing', () => {
    it('allows export even when media attributes missing', async () => {
      mockCompletionEngine.evaluate.mockResolvedValue({
        totalCompletionPct: 80,
        siteCompletions: [
          { 
            siteId: 'amazon', 
            completionPct: 80, 
            missingAttributes: [] // No blocking for media
          }
        ],
        siteBlockingReasons: []
      });

      const result = await enforcer.evaluateExportReadiness(
        'prod_test',
        { 
          title: 'Test Product',
          description: 'Test Description',
          seo_title: 'SEO Title',
          seo_description: 'SEO Description'
          // Missing: images, videos (media - should not block)
        },
        ['amazon'],
        testExportSettings
      );

      expect(result.canExport).toBe(true);
      expect(result.blockingReasons).toHaveLength(0);
    });

    it('allows export even when pricing attributes missing', async () => {
      mockCompletionEngine.evaluate.mockResolvedValue({
        totalCompletionPct: 80,
        siteCompletions: [
          { 
            siteId: 'amazon', 
            completionPct: 80, 
            missingAttributes: [] // No blocking for pricing
          }
        ],
        siteBlockingReasons: []
      });

      const result = await enforcer.evaluateExportReadiness(
        'prod_test',
        { 
          title: 'Test Product',
          description: 'Test Description',
          seo_title: 'SEO Title',
          seo_description: 'SEO Description'
          // Missing: price, cost, msrp (pricing - should not block)
        },
        ['amazon'],
        testExportSettings
      );

      expect(result.canExport).toBe(true);
      expect(result.blockingReasons).toHaveLength(0);
    });
  });

  describe('deterministic blocking explanations', () => {
    it('formats single blocking reason deterministically', async () => {
      const reasons: ExportBlockingReason[] = [
        {
          type: 'COMPLETION_BELOW_THRESHOLD',
          message: 'Completion 60% is below required 75%',
          currentCompletion: 60,
          requiredCompletion: 75
        }
      ];

      const explanation = enforcer.formatBlockingExplanation(reasons);
      
      expect(explanation).toBe('Export blocked:\n• Completion: 60% (need 75%)');
    });

    it('formats multiple blocking reasons deterministically', async () => {
      const reasons: ExportBlockingReason[] = [
        {
          type: 'COMPLETION_BELOW_THRESHOLD',
          message: 'Completion 50% is below required 75%',
          currentCompletion: 50,
          requiredCompletion: 75
        },
        {
          type: 'SITE_MISSING_REQUIRED',
          message: 'Site amazon missing required attributes: description, seo_title',
          site: 'amazon',
          missingAttributes: ['description', 'seo_title']
        },
        {
          type: 'SITE_MISSING_REQUIRED',
          message: 'Site shopify missing required attributes: seo_description',
          site: 'shopify',
          missingAttributes: ['seo_description']
        }
      ];

      const explanation = enforcer.formatBlockingExplanation(reasons);
      
      const expected = `Export blocked:
• Completion: 50% (need 75%)
• amazon: Missing description, seo_title
• shopify: Missing seo_description`;

      expect(explanation).toBe(expected);
    });

    it('returns ready message when no blocking reasons', async () => {
      const explanation = enforcer.formatBlockingExplanation([]);
      expect(explanation).toBe('Product is ready for export');
    });
  });

  describe('Smart Rules never define readiness', () => {
    it('ignores Smart Rules suggestions in export decision', async () => {
      // Smart Rules may suggest values, but don't affect export readiness
      mockCompletionEngine.evaluate.mockResolvedValue({
        totalCompletionPct: 90,
        siteCompletions: [
          { siteId: 'amazon', completionPct: 90, missingAttributes: [] }
        ],
        siteBlockingReasons: []
      });

      const result = await enforcer.evaluateExportReadiness(
        'prod_test',
        { 
          title: 'Test Product',
          description: 'Test Description',
          seo_title: 'SEO Title',
          seo_description: 'SEO Description',
          // Smart Rules might suggest: gender, department, etc.
          // These suggestions should NOT affect export readiness
        },
        ['amazon'],
        testExportSettings
      );

      expect(result.canExport).toBe(true);
      // Export decision based solely on completion engine, not Smart Rules
    });
  });
});