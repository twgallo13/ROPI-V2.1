/**
 * Completion Evaluation Engine Tests
 * 
 * Unit tests for deterministic completion evaluation engine.
 * Uses static fixtures with no mocks or inferred behavior.
 */

import { describe, it, expect } from 'vitest';
import { 
  ProductSnapshot, 
  AttributeRegistry, 
  evaluateCompletion,
  CompletionEvaluationResult 
} from './completionEvaluationEngine';
import { CompletionRulesConfig } from './completionRulesService';
import type { AttributeType } from '../../../sdk/src/schema/attribute';

// Static Attribute Registry for Testing (using canonical structure)
const TEST_ATTRIBUTE_REGISTRY: AttributeRegistry = {
  // Description attributes for different sites
  'title_us': {
    attribute_id: 'title_us',
    label: 'Title - US',
    category: 'description',
    data_type: 'string',
    required_for_completion: true,
    exportable: true,
    internalOnly: false
  } as AttributeType,
  'title_uk': {
    attribute_id: 'title_uk',
    label: 'Title - UK', 
    category: 'description',
    data_type: 'string',
    required_for_completion: true,
    exportable: true,
    internalOnly: false
  } as AttributeType,
  'description_us': {
    attribute_id: 'description_us',
    label: 'Description - US',
    category: 'description',
    data_type: 'string',
    required_for_completion: true,
    exportable: true,
    internalOnly: false
  } as AttributeType,
  
  // SEO attributes
  'meta_title_us': {
    attribute_id: 'meta_title_us',
    label: 'Meta Title - US',
    category: 'seo',
    data_type: 'string',
    required_for_completion: true,
    exportable: true,
    internalOnly: false
  } as AttributeType,
  'meta_title_uk': {
    attribute_id: 'meta_title_uk',
    label: 'Meta Title - UK',
    category: 'seo', 
    data_type: 'string',
    required_for_completion: true,
    exportable: true,
    internalOnly: false
  } as AttributeType,
  
  // Technical attributes (global)
  'dimensions': {
    attribute_id: 'dimensions',
    label: 'Dimensions',
    category: 'technical',
    data_type: 'string',
    required_for_completion: true,
    exportable: true,
    internalOnly: false
  } as AttributeType,
  'weight': {
    attribute_id: 'weight',
    label: 'Weight',
    category: 'technical', 
    data_type: 'string',
    required_for_completion: true,
    exportable: true,
    internalOnly: false
  } as AttributeType
};

// Base Completion Rules Configuration
const TEST_COMPLETION_RULES: CompletionRulesConfig = {
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
      appliesTo: {
        mode: 'ALL_PRODUCTS',
        sites: []
      },
      attributeSelector: {
        source: 'REGISTRY',
        categories: ['description', 'seo'],
        requirementFlag: 'completionRequired',
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
      appliesTo: {
        mode: 'ALL_PRODUCTS',
        sites: []
      },
      attributeSelector: {
        source: 'REGISTRY',
        categories: ['technical'],
        requirementFlag: 'completionRequired',
        siteAware: false,
        includeInternalOnly: false,
        excludeAttributeIds: []
      }
    }
  ],
  builtInSegments: {
    'description-seo': {
      segmentId: 'description-seo',
      lockedSemantics: true
    }
  },
  exclusions: {
    media: {
      affectsCompletion: false,
      reason: 'Media attributes excluded by governance directive'
    },
    pricing: {
      affectsCompletion: false,
      reason: 'Pricing attributes excluded by governance directive'
    }
  }
};

// Test Case 1: 100% Completion - All attributes present
const PRODUCT_100_COMPLETE: ProductSnapshot = {
  productId: 'test-product-100',
  attributes: {
    // Site-specific description attributes
    'title_us': 'US Title',
    'title_uk': 'UK Title',
    'description_us': 'US Description',
    
    // Site-specific SEO attributes
    'meta_title_us': 'US Meta Title',
    'meta_title_uk': 'UK Meta Title',
    
    // Global technical attributes
    'dimensions': '10x20x30 cm',
    'weight': '2.5 kg'
  },
  sites: ['us', 'uk']
};

// Test Case 2: Partial Completion - Missing some attributes  
const PRODUCT_PARTIAL_COMPLETE: ProductSnapshot = {
  productId: 'test-product-partial',
  attributes: {
    // Missing title_uk and description_us
    'title_us': 'US Title',
    
    // Complete SEO
    'meta_title_us': 'US Meta Title',
    'meta_title_uk': 'UK Meta Title',
    
    // Missing weight
    'dimensions': '10x20x30 cm'
  },
  sites: ['us', 'uk']
};

// Test Case 3: Empty Product - All missing
const PRODUCT_EMPTY: ProductSnapshot = {
  productId: 'test-product-empty',
  attributes: {},
  sites: ['us', 'uk']
};

describe('Completion Evaluation Engine', () => {
  it('should calculate 100% completion for complete product', () => {
    const result = evaluateCompletion(
      PRODUCT_100_COMPLETE,
      ['us', 'uk'],
      TEST_ATTRIBUTE_REGISTRY,
      TEST_COMPLETION_RULES,
      '2025-01-01T00:00:00Z' // Fixed timestamp for determinism
    );
    
    expect(result.totalCompletionPct).toBe(100);
    expect(result.hasBlockingSites).toBe(false);
    expect(result.siteBlockingReasons).toHaveLength(0);
    expect(result.evaluationMeta.enabledSegmentCount).toBe(2);
    expect(result.evaluationMeta.evaluatedAt).toBe('2025-01-01T00:00:00Z');
    
    // Exact segment results for complete product
    expect(result.segmentResults[0]).toEqual(expect.objectContaining({
      segmentId: 'description-seo',
      score: 100,
      totalAttributes: 5,
      completedAttributes: 5,
      missingAttributes: []
    }));
    expect(result.segmentResults[1]).toEqual(expect.objectContaining({
      segmentId: 'technical',
      score: 100,
      totalAttributes: 2,
      completedAttributes: 2,
      missingAttributes: []
    }));
  });

  it('should detect site blocking for missing description/SEO attributes', () => {
    const result = evaluateCompletion(
      PRODUCT_PARTIAL_COMPLETE,
      ['us', 'uk'],
      TEST_ATTRIBUTE_REGISTRY,
      TEST_COMPLETION_RULES
    );
    
    expect(result.hasBlockingSites).toBe(true);
    expect(result.totalCompletionPct).toBe(0); // Blocked = 0% completion
    expect(result.siteBlockingReasons).toHaveLength(2);
    expect(result.siteBlockingReasons[0]).toEqual({
      site: 'us',
      reason: 'Missing required Description/SEO attributes',
      missingAttributes: ['description_us']
    });
    expect(result.siteBlockingReasons[1]).toEqual({
      site: 'uk',
      reason: 'Missing required Description/SEO attributes', 
      missingAttributes: ['title_uk']
    });
    
    // Exact segment results
    expect(result.segmentResults[0]).toEqual(expect.objectContaining({
      segmentId: 'description-seo',
      score: 60,
      totalAttributes: 5,
      completedAttributes: 3,
      missingAttributes: ['title_uk', 'description_us']
    }));
    expect(result.segmentResults[1]).toEqual(expect.objectContaining({
      segmentId: 'technical',
      score: 50,
      totalAttributes: 2,
      completedAttributes: 1,
      missingAttributes: ['weight']
    }));
  });

  it('should return 0% completion for empty product', () => {
    const result = evaluateCompletion(
      PRODUCT_EMPTY,
      ['us', 'uk'], 
      TEST_ATTRIBUTE_REGISTRY,
      TEST_COMPLETION_RULES
    );
    
    expect(result.totalCompletionPct).toBe(0);
    expect(result.hasBlockingSites).toBe(true);
    expect(result.siteBlockingReasons).toHaveLength(2);
    expect(result.evaluationMeta.enabledSegmentCount).toBe(2);
    
    // Exact segment results for empty product
    expect(result.segmentResults[0]).toEqual(expect.objectContaining({
      segmentId: 'description-seo',
      score: 0,
      totalAttributes: 5,
      completedAttributes: 0
    }));
    expect(result.segmentResults[1]).toEqual(expect.objectContaining({
      segmentId: 'technical',
      score: 0,
      totalAttributes: 2,
      completedAttributes: 0
    }));
  });

  it('should handle deterministic evaluation without timestamp', () => {
    const result1 = evaluateCompletion(
      PRODUCT_100_COMPLETE,
      ['us'],
      TEST_ATTRIBUTE_REGISTRY,
      TEST_COMPLETION_RULES
    );
    
    const result2 = evaluateCompletion(
      PRODUCT_100_COMPLETE,
      ['us'],
      TEST_ATTRIBUTE_REGISTRY,
      TEST_COMPLETION_RULES
    );
    
    // Results should be identical (deterministic)
    expect(result1.totalCompletionPct).toBe(result2.totalCompletionPct);
    expect(result1.hasBlockingSites).toBe(result2.hasBlockingSites);
    expect(result1.evaluationMeta.evaluatedAt).toBeUndefined();
    expect(result2.evaluationMeta.evaluatedAt).toBeUndefined();
  });

  it('should validate input requirements', () => {
    expect(() => {
      evaluateCompletion(
        PRODUCT_100_COMPLETE,
        [], // Empty sites array
        TEST_ATTRIBUTE_REGISTRY,
        TEST_COMPLETION_RULES
      );
    }).toThrow('Cannot evaluate completion: no sites selected');
    
    expect(() => {
      evaluateCompletion(
        PRODUCT_100_COMPLETE,
        ['us'],
        TEST_ATTRIBUTE_REGISTRY,
        { ...TEST_COMPLETION_RULES, segments: [] } // Empty segments
      );
    }).toThrow('Cannot evaluate completion: no segments configured');
  });
});