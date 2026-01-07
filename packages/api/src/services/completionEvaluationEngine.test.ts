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

// Classification-focused fixtures to validate requirement flag normalization
const FLAG_REGISTRY_SNAKE: AttributeRegistry = {
  classification_category: {
    attribute_id: 'classification_category',
    label: 'Category',
    category: 'classification',
    data_type: 'string',
    required_for_completion: true,
    exportable: true,
    internalOnly: false
  } as AttributeType,
  classification_style: {
    attribute_id: 'classification_style',
    label: 'Style',
    category: 'classification',
    data_type: 'string',
    required_for_completion: false,
    exportable: true,
    internalOnly: false
  } as AttributeType
};

const FLAG_REGISTRY_CAMEL: AttributeRegistry = {
  classification_group: {
    attribute_id: 'classification_group',
    label: 'Group',
    category: 'classification',
    data_type: 'string',
    requiredForCompletion: true,
    exportable: true,
    internalOnly: false
  } as AttributeType,
  classification_subgroup: {
    attribute_id: 'classification_subgroup',
    label: 'Subgroup',
    category: 'classification',
    data_type: 'string',
    completionRequired: false,
    exportable: true,
    internalOnly: false
  } as AttributeType
};

const FLAG_RULES_SNAKE: CompletionRulesConfig = {
  schemaVersion: '1.0',
  rulesVersion: 1,
  updatedAt: '2025-01-02T00:00:00Z',
  updatedBy: 'test-system',
  exportUnlockThresholdPct: 80,
  segments: [
    {
      id: 'classification',
      name: 'Classification',
      enabled: true,
      weightPct: 100,
      ruleType: 'ALL_REQUIRED',
      appliesTo: {
        mode: 'ALL_PRODUCTS',
        sites: []
      },
      attributeSelector: {
        source: 'REGISTRY',
        categories: ['classification'],
        requirementFlag: 'required_for_completion',
        siteAware: false,
        includeInternalOnly: false,
        excludeAttributeIds: []
      }
    }
  ],
  builtInSegments: {},
  exclusions: {
    media: {
      affectsCompletion: false,
      reason: 'test'
    },
    pricing: {
      affectsCompletion: false,
      reason: 'test'
    }
  }
};

const FLAG_RULES_CAMEL: CompletionRulesConfig = {
  schemaVersion: '1.0',
  rulesVersion: 1,
  updatedAt: '2025-01-02T00:00:00Z',
  updatedBy: 'test-system',
  exportUnlockThresholdPct: 80,
  segments: [
    {
      id: 'classification-camel',
      name: 'Classification (CamelCase)',
      enabled: true,
      weightPct: 100,
      ruleType: 'ALL_REQUIRED',
      appliesTo: {
        mode: 'ALL_PRODUCTS',
        sites: []
      },
      attributeSelector: {
        source: 'REGISTRY',
        categories: ['classification'],
        requirementFlag: 'completionRequired',
        siteAware: false,
        includeInternalOnly: false,
        excludeAttributeIds: []
      }
    }
  ],
  builtInSegments: {},
  exclusions: {
    media: {
      affectsCompletion: false,
      reason: 'test'
    },
    pricing: {
      affectsCompletion: false,
      reason: 'test'
    }
  }
};

const PRODUCT_CLASSIFICATION_COMPLETE: ProductSnapshot = {
  productId: 'classification-complete',
  attributes: {
    classification_category: 'Shoes'
  },
  sites: ['us']
};

const PRODUCT_CLASSIFICATION_CAMEL_COMPLETE: ProductSnapshot = {
  productId: 'classification-camel-complete',
  attributes: {
    classification_group: 'Footwear'
  },
  sites: ['us']
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
    expect(result.evaluationMeta.enabledSegmentCount).toBe(2);
    expect(result.evaluationMeta.evaluatedAt).toBe('2025-01-01T00:00:00Z');
  });

  it('should detect site blocking for missing description/SEO attributes', () => {
    const result = evaluateCompletion(
      PRODUCT_PARTIAL_COMPLETE,
      ['us', 'uk'],
      TEST_ATTRIBUTE_REGISTRY,
      TEST_COMPLETION_RULES
    );
    
    expect(result.hasBlockingSites).toBe(true);
    expect(result.siteBlockingReasons.length).toBeGreaterThan(0);
    expect(result.totalCompletionPct).toBeLessThan(100);
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
    expect(result.evaluationMeta.enabledSegmentCount).toBe(2);
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

  it('normalizes snake_case requirement flag and ignores non-required classification attributes', () => {
    const result = evaluateCompletion(
      PRODUCT_CLASSIFICATION_COMPLETE,
      ['us'],
      FLAG_REGISTRY_SNAKE,
      FLAG_RULES_SNAKE
    );

    expect(result.totalCompletionPct).toBe(100);
    expect(result.segmentResults[0].totalAttributes).toBe(1);
    expect(result.segmentResults[0].missingAttributes).toEqual([]);
  });

  it('normalizes camelCase/legacy requirement flags for classification attributes', () => {
    const result = evaluateCompletion(
      PRODUCT_CLASSIFICATION_CAMEL_COMPLETE,
      ['us'],
      FLAG_REGISTRY_CAMEL,
      FLAG_RULES_CAMEL
    );

    expect(result.totalCompletionPct).toBe(100);
    expect(result.segmentResults[0].totalAttributes).toBe(1);
    expect(result.segmentResults[0].missingAttributes).toEqual([]);
  });
});