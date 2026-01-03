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
      summary: 'Export ready: product 100% complete (threshold: 80%)',
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
      message: 'Product completion 75% is below export threshold 80%',
      details: {
        currentCompletion: 75,
        requiredCompletion: 80
      }
    });
    
    // Exact operator explanation for threshold failure
    expect(result.operatorExplanation.summary).toBe('Export blocked: product 75% complete (threshold: 80%)');
    expect(result.operatorExplanation.blockingIssues).toEqual([
      'Product completion 75% is below export threshold 80%'
    ]);
    expect(result.operatorExplanation.actionRequired).toEqual([
      'Increase product completion to 80% or higher'
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
    expect(result.operatorExplanation.summary).toBe('Export blocked: missing Description/SEO attributes for uk');
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
      'Add missing attributes for uk: title_uk'
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
    expect(result.operatorExplanation.summary).toBe('Export ready: product 100% complete (threshold: 80%)');
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
    // PROMPT C: Use explicit timestamp for deterministic output
    const explicitTimestamp = '2026-01-03T13:00:00.000Z';
    const result = await calculateCompletionDrivenExportReadiness(PRODUCT_100_COMPLETE, false, explicitTimestamp);
    
    expect(result).toBeDefined();
    expect(result.ready).toBe(true);
    expect(result.completionPct).toBe(100);
    expect(result.threshold).toBe(80); // Mock config threshold
    expect(result.blockingReasons).toHaveLength(0);
    expect(result.operatorExplanation).toBeDefined();
    expect(result.evaluationTimestamp).toBe(explicitTimestamp); // PROMPT C: Verify determinism
  });
});

// ============================================================================
// PROMPT D: Snapshot-Style Blocking Payload Tests
// ============================================================================

describe('Completion-Driven Export Readiness (Blocking Payloads)', () => {
  
  const DETERMINISTIC_TIMESTAMP = '2026-01-03T13:00:00.000Z';
  
  it('should return actionable 423 payload for threshold-only blocking', async () => {
    // Mock completion engine result for 75% completion (below threshold)
    (evaluateCompletion as any).mockReturnValue({
      totalCompletionPct: 75,
      hasBlockingSites: false,
      siteBlockingReasons: [],
      segmentResults: [
        {
          segmentId: 'description-seo',
          segmentName: 'Description & SEO',
          score: 75,
          weightPct: 60,
          missingAttributes: ['weight']
        },
        {
          segmentId: 'technical',
          segmentName: 'Technical Specifications',
          score: 75,
          weightPct: 40,
          missingAttributes: []
        }
      ]
    });
    
    const result = await calculateCompletionDrivenExportReadiness(
      PRODUCT_75_COMPLETE_BELOW_THRESHOLD,
      false,
      DETERMINISTIC_TIMESTAMP
    );
    
    // PROMPT D: Validate stable, actionable 423 response structure
    expect(result.ready).toBe(false);
    expect(result.completionPct).toBe(75);
    expect(result.threshold).toBe(80);
    expect(result.hasBlockingSites).toBe(false);
    
    // PROMPT D: Exact blocking reasons structure
    expect(result.blockingReasons).toHaveLength(1);
    expect(result.blockingReasons[0]).toEqual({
      type: 'COMPLETION_BELOW_THRESHOLD',
      severity: 'BLOCKING',
      message: 'Product completion 75% is below export threshold 80%',
      details: {
        currentCompletion: 75,
        requiredCompletion: 80
      }
    });
    
    // PROMPT D: Operator explanation with actionable guidance
    expect(result.operatorExplanation.summary).toBe('Export blocked: product 75% complete (threshold: 80%)');
    expect(result.operatorExplanation.blockingIssues).toContain('Product completion 75% is below export threshold 80%');
    expect(result.operatorExplanation.actionRequired).toContain('Increase product completion to 80% or higher');
    
    // PROMPT C: Verify deterministic timestamp
    expect(result.evaluationTimestamp).toBe(DETERMINISTIC_TIMESTAMP);
    expect(result.rulesVersion).toBe(1);
  });
  
  it('should return actionable 423 payload for site Description/SEO blocking', async () => {
    // Mock completion engine result for site blocking (uk missing title_uk)
    (evaluateCompletion as any).mockReturnValue({
      totalCompletionPct: 85, // High completion but site-blocked
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
          score: 80,
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
      ]
    });
    
    const result = await calculateCompletionDrivenExportReadiness(
      PRODUCT_SITE_BLOCKED,
      false,
      DETERMINISTIC_TIMESTAMP
    );
    
    // PROMPT D: Validate stable, actionable 423 response structure
    expect(result.ready).toBe(false);
    expect(result.completionPct).toBe(0); // PROMPT B: Force 0 when site-blocked
    expect(result.threshold).toBe(80);
    expect(result.hasBlockingSites).toBe(true);
    
    // PROMPT B + PROMPT D: Only site blocking reason (no threshold duplicate)
    expect(result.blockingReasons).toHaveLength(1);
    expect(result.blockingReasons[0].type).toBe('SITE_DESCRIPTION_SEO_MISSING');
    expect(result.blockingReasons[0].severity).toBe('BLOCKING');
    expect(result.blockingReasons[0].details.site).toBe('uk');
    expect(result.blockingReasons[0].details.missingAttributes).toEqual(['title_uk']);
    
    // PROMPT D: Operator explanation with specific missing attributes per site
    expect(result.operatorExplanation.summary).toContain('Export blocked');
    expect(result.operatorExplanation.summary).toContain('uk');
    expect(result.operatorExplanation.siteStatus).toHaveLength(2);
    expect(result.operatorExplanation.siteStatus).toContainEqual({
      site: 'us',
      blocked: false
    });
    expect(result.operatorExplanation.siteStatus).toContainEqual({
      site: 'uk',
      blocked: true,
      reason: 'Missing required Description/SEO attributes',
      missingAttributes: ['title_uk']
    });
    expect(result.operatorExplanation.actionRequired).toContain('Add missing attributes for uk: title_uk');
    
    // PROMPT C: Verify deterministic timestamp
    expect(result.evaluationTimestamp).toBe(DETERMINISTIC_TIMESTAMP);
  });
});