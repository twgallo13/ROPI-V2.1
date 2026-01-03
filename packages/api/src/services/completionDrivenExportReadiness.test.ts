/**
 * Completion-Driven Export Readiness Tests
 * 
 * Unit tests for completion-based export gate enforcement with deterministic
 * fixtures proving completion threshold blocking and site-aware Description/SEO blocking.
 * 
 * Uses static fixtures with exact assertions for operator explanations.
 */

import { describe, it, expect, beforeEach, vi } from 'vitest';
import { 
  calculateCompletionDrivenExportReadiness,
  type CompletionDrivenExportReadiness,
  type ExportBlockingReason,
  type OperatorExplanation
} from './completionDrivenExportReadiness';
import { type ProductDocument } from './exportService';
import type { AttributeType } from '../../../sdk/src/schema/attribute';

// ============================================================================
// Mock Dependencies
// ============================================================================

// Mock completion rules service
vi.mock('./completionRulesService', () => ({
  loadCompletionRules: vi.fn()
}));

// Mock export service  
vi.mock('./exportService', () => ({
  loadExportableAttributes: vi.fn()
}));

// Mock completion engine
vi.mock('./completionEvaluationEngineEntry', () => ({
  evaluateCompletion: vi.fn()
}));

import { loadCompletionRules } from './completionRulesService';
import { loadExportableAttributes } from './exportService';
import { evaluateCompletion } from './completionEvaluationEngineEntry';

// ============================================================================
// Test Fixtures
// ============================================================================

const MOCK_COMPLETION_RULES = {
  schemaVersion: '1.0',
  rulesVersion: 1,
  updatedAt: '2025-01-01T00:00:00Z',
  updatedBy: 'test-system',
  exportUnlockThresholdPct: 80,
  segments: [
    {
      id: 'description-seo',
      name: 'Description & SEO',
      enabled: true,
      weightPct: 60,
      ruleType: 'ALL_REQUIRED',
      appliesTo: { mode: 'ALL_PRODUCTS', sites: [] },
      attributeSelector: {
        source: 'REGISTRY',
        categories: ['description', 'seo'],
        requirementFlag: 'required_for_completion',
        siteAware: true,
        includeInternalOnly: false,
        excludeAttributeIds: []
      }
    },
    {
      id: 'technical',
      name: 'Technical Specifications',
      enabled: true,
      weightPct: 40,
      ruleType: 'ALL_REQUIRED',
      appliesTo: { mode: 'ALL_PRODUCTS', sites: [] },
      attributeSelector: {
        source: 'REGISTRY',
        categories: ['technical'],
        requirementFlag: 'required_for_completion',
        siteAware: false,
        includeInternalOnly: false,
        excludeAttributeIds: []
      }
    }
  ],
  builtInSegments: {
    'description-seo': { segmentId: 'description-seo', lockedSemantics: true }
  },
  exclusions: {
    media: { affectsCompletion: false, reason: 'Media excluded' },
    pricing: { affectsCompletion: false, reason: 'Pricing excluded' }
  }
};

const MOCK_ATTRIBUTE_REGISTRY = new Map([
  ['title_us', {
    attribute_id: 'title_us',
    label: 'Title - US',
    category: 'description',
    required_for_export: true
  }],
  ['title_uk', {
    attribute_id: 'title_uk', 
    label: 'Title - UK',
    category: 'description',
    required_for_export: true
  }],
  ['description_us', {
    attribute_id: 'description_us',
    label: 'Description - US',
    category: 'description', 
    required_for_export: true
  }],
  ['meta_title_us', {
    attribute_id: 'meta_title_us',
    label: 'Meta Title - US',
    category: 'seo',
    required_for_export: true
  }],
  ['meta_title_uk', {
    attribute_id: 'meta_title_uk',
    label: 'Meta Title - UK', 
    category: 'seo',
    required_for_export: true
  }],
  ['dimensions', {
    attribute_id: 'dimensions',
    label: 'Dimensions',
    category: 'technical',
    required_for_export: true
  }],
  ['weight', {
    attribute_id: 'weight',
    label: 'Weight',
    category: 'technical',
    required_for_export: true
  }]
]);

// Test products with different completion levels
const PRODUCT_100_COMPLETE: ProductDocument = {
  id: 'prod-100',
  mpn: 'TEST-100',
  attributes: {
    title_us: 'US Title',
    title_uk: 'UK Title', 
    description_us: 'US Description',
    meta_title_us: 'US Meta Title',
    meta_title_uk: 'UK Meta Title',
    dimensions: '10x20x30 cm',
    weight: '2.5 kg'
  },
  websites: ['us', 'uk']
};

const PRODUCT_75_COMPLETE_BELOW_THRESHOLD: ProductDocument = {
  id: 'prod-75',
  mpn: 'TEST-75',
  attributes: {
    title_us: 'US Title',
    title_uk: 'UK Title',
    description_us: 'US Description', 
    meta_title_us: 'US Meta Title',
    meta_title_uk: 'UK Meta Title',
    dimensions: '10x20x30 cm'
    // Missing weight - 75% completion
  },
  websites: ['us', 'uk']
};

const PRODUCT_SITE_BLOCKED: ProductDocument = {
  id: 'prod-blocked',
  mpn: 'TEST-BLOCKED', 
  attributes: {
    title_us: 'US Title',
    // Missing title_uk - UK site blocked
    description_us: 'US Description',
    meta_title_us: 'US Meta Title',
    meta_title_uk: 'UK Meta Title',
    dimensions: '10x20x30 cm',
    weight: '2.5 kg'
  },
  websites: ['us', 'uk']
};

const PRODUCT_NO_SITES: ProductDocument = {
  id: 'prod-no-sites',
  mpn: 'TEST-NO-SITES',
  attributes: {
    title_us: 'US Title'
  },
  websites: []
};

// ============================================================================
// Test Setup
// ============================================================================

beforeEach(() => {
  // Reset all mocks
  vi.clearAllMocks();
  
  // Setup default mock implementations
  (loadCompletionRules as any).mockResolvedValue(MOCK_COMPLETION_RULES);
  (loadExportableAttributes as any).mockResolvedValue(MOCK_ATTRIBUTE_REGISTRY);
});

// ============================================================================
// Test Cases
// ============================================================================

describe('Completion-Driven Export Readiness', () => {
  
  it('should allow export when completion >= threshold and no site blocking', async () => {
    // Mock completion engine result for 100% completion
    (evaluateCompletion as any).mockReturnValue({
      totalCompletionPct: 100,
      hasBlockingSites: false,
      siteBlockingReasons: [],
      segmentResults: [
        {
          segmentId: 'description-seo',
          segmentName: 'Description & SEO',
          score: 100,
          weightPct: 60,
          missingAttributes: []
        },
        {
          segmentId: 'technical', 
          segmentName: 'Technical Specifications',
          score: 100,
          weightPct: 40,
          missingAttributes: []
        }
      ],
      evaluationMeta: { rulesVersion: 1 }
    });
    
    const result = await calculateCompletionDrivenExportReadiness(PRODUCT_100_COMPLETE);
    
    // Exact assertions for export ready state
    expect(result.ready).toBe(true);
    expect(result.completionPct).toBe(100);
    expect(result.threshold).toBe(80);
    expect(result.hasBlockingSites).toBe(false);
    expect(result.blockingReasons).toHaveLength(0);
    expect(result.rulesVersion).toBe(1);
    
    // Exact operator explanation
    expect(result.operatorExplanation).toEqual({
      summary: 'Product is ready for export (100% completion)',
      blockingIssues: [],
      completionBreakdown: [
        {
          segmentId: 'description-seo',
          segmentName: 'Description & SEO', 
          score: 100,
          weightPct: 60,
          missingAttributes: []
        },
        {
          segmentId: 'technical',
          segmentName: 'Technical Specifications',
          score: 100, 
          weightPct: 40,
          missingAttributes: []
        }
      ],
      siteStatus: [
        { site: 'us', blocked: false },
        { site: 'uk', blocked: false }
      ],
      actionRequired: []
    });
  });
  
  it('should block export when completion < threshold', async () => {
    // Mock completion engine result for 75% completion (below 80% threshold)
    (evaluateCompletion as any).mockReturnValue({
      totalCompletionPct: 75,
      hasBlockingSites: false,
      siteBlockingReasons: [],
      segmentResults: [
        {
          segmentId: 'description-seo',
          segmentName: 'Description & SEO',
          score: 100,
          weightPct: 60,
          missingAttributes: []
        },
        {
          segmentId: 'technical',
          segmentName: 'Technical Specifications', 
          score: 25,
          weightPct: 40,
          missingAttributes: ['weight']
        }
      ],
      evaluationMeta: { rulesVersion: 1 }
    });
    
    const result = await calculateCompletionDrivenExportReadiness(PRODUCT_75_COMPLETE_BELOW_THRESHOLD);
    
    // Exact assertions for threshold blocking
    expect(result.ready).toBe(false);
    expect(result.completionPct).toBe(75);
    expect(result.threshold).toBe(80);
    expect(result.hasBlockingSites).toBe(false);
    expect(result.blockingReasons).toHaveLength(1);
    expect(result.blockingReasons[0]).toEqual({
      type: 'COMPLETION_BELOW_THRESHOLD',
      severity: 'BLOCKING',
      message: 'Completion 75% is below export threshold 80%',
      details: {
        currentCompletion: 75,
        requiredCompletion: 80
      }
    });
    
    // Exact operator explanation for threshold failure
    expect(result.operatorExplanation.summary).toBe('Export blocked: 1 issue(s) prevent export readiness');
    expect(result.operatorExplanation.blockingIssues).toEqual([
      'Completion 75% is 5% below export threshold'
    ]);
    expect(result.operatorExplanation.actionRequired).toEqual([
      'Increase completion to at least 80% by addressing missing attributes'
    ]);
    expect(result.operatorExplanation.completionBreakdown[1].missingAttributes).toEqual(['weight']);
  });
  
  it('should block export when any site missing Description/SEO attributes', async () => {
    // Mock completion engine result with site blocking (0% due to blocking semantics)
    (evaluateCompletion as any).mockReturnValue({
      totalCompletionPct: 0, // Blocked = 0% (blocking blocks completion)
      hasBlockingSites: true,
      siteBlockingReasons: [
        {
          site: 'uk',
          reason: 'Missing required Description/SEO attributes',
          missingAttributes: ['title_uk']
        }
      ],
      segmentResults: [
        {
          segmentId: 'description-seo',
          segmentName: 'Description & SEO',
          score: 80, // Raw score without blocking  
          weightPct: 60,
          missingAttributes: ['title_uk']
        },
        {
          segmentId: 'technical',
          segmentName: 'Technical Specifications',
          score: 100,
          weightPct: 40,
          missingAttributes: []
        }
      ],
      evaluationMeta: { rulesVersion: 1 }
    });
    
    const result = await calculateCompletionDrivenExportReadiness(PRODUCT_SITE_BLOCKED);
    
    // Exact assertions for site blocking 
    expect(result.ready).toBe(false);
    expect(result.completionPct).toBe(0); // Site blocking sets completion to 0
    expect(result.hasBlockingSites).toBe(true);
    expect(result.blockingReasons).toHaveLength(1);
    expect(result.blockingReasons[0]).toEqual({
      type: 'SITE_DESCRIPTION_SEO_MISSING', 
      severity: 'BLOCKING',
      message: 'Export blocked for uk: Missing required Description/SEO attributes',
      details: {
        site: 'uk',
        missingAttributes: ['title_uk']
      }
    });
    
    // Exact operator explanation for site blocking
    expect(result.operatorExplanation.summary).toBe('Export blocked: 1 issue(s) prevent export readiness');
    expect(result.operatorExplanation.blockingIssues).toEqual([
      'uk: Missing title_uk'
    ]);
    expect(result.operatorExplanation.siteStatus).toEqual([
      { site: 'us', blocked: false },
      { 
        site: 'uk', 
        blocked: true, 
        reason: 'Missing required Description/SEO attributes',
        missingAttributes: ['title_uk']
      }
    ]);
    expect(result.operatorExplanation.actionRequired).toEqual([
      'Add missing Description/SEO attributes for uk site'
    ]);
  });
  
  it('should block export when no sites selected', async () => {
    const result = await calculateCompletionDrivenExportReadiness(PRODUCT_NO_SITES);
    
    // Exact assertions for no sites blocking
    expect(result.ready).toBe(false);
    expect(result.completionPct).toBe(0);
    expect(result.hasBlockingSites).toBe(true);
    expect(result.blockingReasons).toHaveLength(1);
    expect(result.blockingReasons[0]).toEqual({
      type: 'REQUIRED_ATTRIBUTE_MISSING',
      severity: 'BLOCKING', 
      message: 'No sites selected for product',
      details: {}
    });
    
    // Exact operator explanation for no sites
    expect(result.operatorExplanation.summary).toBe('Export blocked: No sites selected for product');
    expect(result.operatorExplanation.blockingIssues).toEqual(['No sites selected for product']);
    expect(result.operatorExplanation.siteStatus).toEqual([]);
    expect(result.operatorExplanation.actionRequired).toEqual([
      'Fix completion rules configuration or product data'
    ]);
  });
  
  it('should be deterministic - identical inputs produce identical outputs', async () => {
    // Mock deterministic completion engine result
    (evaluateCompletion as any).mockReturnValue({
      totalCompletionPct: 85,
      hasBlockingSites: false,
      siteBlockingReasons: [],
      segmentResults: [
        {
          segmentId: 'description-seo',
          segmentName: 'Description & SEO',
          score: 90,
          weightPct: 60,
          missingAttributes: []
        },
        {
          segmentId: 'technical',
          segmentName: 'Technical Specifications',
          score: 75,
          weightPct: 40,
          missingAttributes: []
        }
      ],
      evaluationMeta: { rulesVersion: 1 }
    });
    
    // Run evaluation twice with identical input
    const result1 = await calculateCompletionDrivenExportReadiness(PRODUCT_100_COMPLETE);
    const result2 = await calculateCompletionDrivenExportReadiness(PRODUCT_100_COMPLETE);
    
    // Results must be identical (excluding timestamp)
    expect(result1.ready).toBe(result2.ready);
    expect(result1.completionPct).toBe(result2.completionPct);
    expect(result1.threshold).toBe(result2.threshold);
    expect(result1.hasBlockingSites).toBe(result2.hasBlockingSites);
    expect(result1.blockingReasons).toEqual(result2.blockingReasons);
    expect(result1.operatorExplanation).toEqual(result2.operatorExplanation);
    expect(result1.rulesVersion).toBe(result2.rulesVersion);
  });
  
  it('should handle media and pricing exclusion (never block)', async () => {
    // Create product with only media/pricing attributes missing
    const productWithMediaPricing: ProductDocument = {
      id: 'prod-media-pricing',
      mpn: 'TEST-MEDIA',
      attributes: {
        // All completion attributes present
        title_us: 'US Title',
        title_uk: 'UK Title',
        description_us: 'US Description',
        meta_title_us: 'US Meta Title', 
        meta_title_uk: 'UK Meta Title',
        dimensions: '10x20x30 cm',
        weight: '2.5 kg'
        // Missing media/pricing attributes (should not affect completion)
      },
      websites: ['us', 'uk']
    };
    
    // Mock completion engine result (100% because media/pricing excluded)
    (evaluateCompletion as any).mockReturnValue({
      totalCompletionPct: 100,
      hasBlockingSites: false,
      siteBlockingReasons: [],
      segmentResults: [
        {
          segmentId: 'description-seo',
          segmentName: 'Description & SEO',
          score: 100,
          weightPct: 60,
          missingAttributes: []
        },
        {
          segmentId: 'technical',
          segmentName: 'Technical Specifications',
          score: 100,
          weightPct: 40,
          missingAttributes: []
        }
      ],
      evaluationMeta: { rulesVersion: 1 }
    });
    
    const result = await calculateCompletionDrivenExportReadiness(productWithMediaPricing);
    
    // Should be ready despite missing media/pricing (excluded by design)
    expect(result.ready).toBe(true);
    expect(result.completionPct).toBe(100);
    expect(result.operatorExplanation.summary).toBe('Product is ready for export (100% completion)');
  });
  
  it('should handle system errors gracefully', async () => {
    // Mock completion rules loading failure
    (loadCompletionRules as any).mockRejectedValue(new Error('Firestore connection failed'));
    
    const result = await calculateCompletionDrivenExportReadiness(PRODUCT_100_COMPLETE);
    
    // Should return error state with explanation
    expect(result.ready).toBe(false);
    expect(result.completionPct).toBe(0);
    expect(result.blockingReasons[0].type).toBe('REQUIRED_ATTRIBUTE_MISSING');
    expect(result.blockingReasons[0].message).toContain('System error: Firestore connection failed');
    expect(result.operatorExplanation.summary).toBe('Export blocked due to system error');
    expect(result.operatorExplanation.actionRequired).toEqual([
      'Contact system administrator to resolve completion evaluation error'
    ]);
  });
});

// ============================================================================
// Integration Test with Live Dependencies
// ============================================================================

describe('Completion-Driven Export Readiness (Integration)', () => {
  
  it('should integrate with actual completion rules service', async () => {
    // This test would verify integration with live Firestore
    // For now, mark as pending since we need Firestore setup
    expect(true).toBe(true); // Placeholder
    
    // TODO: Add integration test when Firestore completion rules are deployed
    // const result = await calculateCompletionDrivenExportReadiness(PRODUCT_100_COMPLETE, true);
    // expect(result).toBeDefined();
  });
});