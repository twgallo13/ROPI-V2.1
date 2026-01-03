/**
 * Test Fixtures for Completion Evaluation Engine
 * 
 * Static, explicit test fixtures covering all specified scenarios:
 * - 100% completion
 * - Partial completion 
 * - Multi-site blocking
 * - Segment weight math validation
 * - Description+SEO blocking
 * 
 * These fixtures are deterministic and contain NO mocks that infer behavior.
 * All test data is explicitly defined.
 */

import { 
  ProductSnapshot, 
  AttributeRegistry, 
  evaluateCompletion,
  CompletionEvaluationResult 
} from './completionEvaluationEngine';
import { CompletionRulesConfig } from './completionRulesService';

// Static Attribute Registry for Testing
export const TEST_ATTRIBUTE_REGISTRY: AttributeRegistry = {
  // Description category
  'title': {
    id: 'title',
    category: 'description',
    required_for_completion: true,
    sites: ['us', 'uk', 'de']
  },
  'short_description': {
    id: 'short_description', 
    category: 'description',
    required_for_completion: true,
    sites: ['us', 'uk', 'de']
  },
  'long_description': {
    id: 'long_description',
    category: 'description', 
    required_for_completion: true,
    sites: ['us', 'uk']
  },
  
  // SEO category
  'meta_title': {
    id: 'meta_title',
    category: 'seo',
    required_for_completion: true,
    sites: ['us', 'uk', 'de']
  },
  'meta_description': {
    id: 'meta_description',
    category: 'seo',
    required_for_completion: true,
    sites: ['us', 'uk', 'de']
  },
  
  // Technical category
  'dimensions': {
    id: 'dimensions',
    category: 'technical',
    required_for_completion: true
    // No sites = applies to all sites
  },
  'weight': {
    id: 'weight',
    category: 'technical', 
    required_for_completion: true
  },
  'material': {
    id: 'material',
    category: 'technical',
    required_for_completion: false // Not required
  },
  
  // Marketing category
  'brand': {
    id: 'brand',
    category: 'marketing',
    required_for_completion: true
  },
  'features': {
    id: 'features',
    category: 'marketing',
    required_for_completion: true,
    sites: ['us', 'uk']
  },
  
  // Media category (should be excluded)
  'main_image': {
    id: 'main_image',
    category: 'media',
    required_for_completion: true
  },
  
  // Pricing category (should be excluded) 
  'base_price': {
    id: 'base_price',
    category: 'pricing',
    required_for_completion: true
  }
};

// Base Completion Rules Configuration
export const TEST_COMPLETION_RULES: CompletionRulesConfig = {
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
      weightPct: 40,
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
      weightPct: 35,
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
    },
    {
      id: 'marketing',
      name: 'Marketing Content',
      enabled: true,
      weightPct: 25,
      ruleType: 'ANY_REQUIRED',
      appliesTo: {
        mode: 'ONLY_SELECTED_SITES',
        sites: ['us', 'uk']
      },
      attributeSelector: {
        source: 'REGISTRY',
        categories: ['marketing'],
        requirementFlag: 'completionRequired',
        siteAware: true,
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
export const PRODUCT_100_COMPLETE: ProductSnapshot = {
  productId: 'test-product-100',
  attributes: {
    // Description (site-aware)
    'title': { us: 'US Title', uk: 'UK Title', de: 'DE Titel' },
    'short_description': { us: 'US Short Desc', uk: 'UK Short Desc', de: 'DE Kurze Beschreibung' },
    'long_description': { us: 'US Long Description', uk: 'UK Long Description' },
    
    // SEO (site-aware)
    'meta_title': { us: 'US Meta Title', uk: 'UK Meta Title', de: 'DE Meta Titel' },
    'meta_description': { us: 'US Meta Desc', uk: 'UK Meta Desc', de: 'DE Meta Beschreibung' },
    
    // Technical (global)
    'dimensions': '10x20x30 cm',
    'weight': '2.5 kg',
    'material': 'Aluminum', // Not required, but present
    
    // Marketing (site-aware)
    'brand': 'TestBrand',
    'features': { us: 'US Features', uk: 'UK Features' },
    
    // Media/Pricing (should be ignored)
    'main_image': 'image.jpg',
    'base_price': { us: 99.99, uk: 89.99 }
  },
  sites: ['us', 'uk', 'de']
};

// Test Case 2: Partial Completion - Missing some attributes
export const PRODUCT_PARTIAL_COMPLETE: ProductSnapshot = {
  productId: 'test-product-partial',
  attributes: {
    // Description - missing long_description
    'title': { us: 'US Title', uk: 'UK Title', de: 'DE Titel' },
    'short_description': { us: 'US Short Desc', uk: 'UK Short Desc', de: 'DE Kurze Beschreibung' },
    // long_description missing
    
    // SEO - complete
    'meta_title': { us: 'US Meta Title', uk: 'UK Meta Title', de: 'DE Meta Titel' },
    'meta_description': { us: 'US Meta Desc', uk: 'UK Meta Desc', de: 'DE Meta Beschreibung' },
    
    // Technical - missing weight
    'dimensions': '10x20x30 cm',
    // weight missing
    
    // Marketing - partial
    'brand': 'TestBrand',
    'features': { us: 'US Features' } // Missing UK
  },
  sites: ['us', 'uk', 'de']
};

// Test Case 3: Multi-Site Blocking - Missing Description/SEO for some sites
export const PRODUCT_BLOCKING_SITES: ProductSnapshot = {
  productId: 'test-product-blocking',
  attributes: {
    // Description - missing DE values
    'title': { us: 'US Title', uk: 'UK Title' }, // Missing DE
    'short_description': { us: 'US Short Desc', uk: 'UK Short Desc' }, // Missing DE
    'long_description': { us: 'US Long Description', uk: 'UK Long Description' },
    
    // SEO - complete for US/UK, missing DE
    'meta_title': { us: 'US Meta Title', uk: 'UK Meta Title' }, // Missing DE
    'meta_description': { us: 'US Meta Desc', uk: 'UK Meta Desc' }, // Missing DE
    
    // Technical - complete
    'dimensions': '10x20x30 cm',
    'weight': '2.5 kg',
    
    // Marketing - complete  
    'brand': 'TestBrand',
    'features': { us: 'US Features', uk: 'UK Features' }
  },
  sites: ['us', 'uk', 'de']
};

// Test Case 4: Segment Weight Math Validation
export const RULES_WEIGHT_MATH: CompletionRulesConfig = {
  ...TEST_COMPLETION_RULES,
  segments: [
    {
      id: 'segment-40',
      name: 'Segment 40%',
      enabled: true,
      weightPct: 40,
      ruleType: 'ALL_REQUIRED',
      appliesTo: { mode: 'ALL_PRODUCTS', sites: [] },
      attributeSelector: {
        source: 'REGISTRY',
        categories: ['description'],
        requirementFlag: 'completionRequired',
        siteAware: true,
        includeInternalOnly: false,
        excludeAttributeIds: []
      }
    },
    {
      id: 'segment-30',
      name: 'Segment 30%', 
      enabled: true,
      weightPct: 30,
      ruleType: 'ALL_REQUIRED',
      appliesTo: { mode: 'ALL_PRODUCTS', sites: [] },
      attributeSelector: {
        source: 'REGISTRY',
        categories: ['seo'],
        requirementFlag: 'completionRequired',
        siteAware: true,
        includeInternalOnly: false,
        excludeAttributeIds: []
      }
    },
    {
      id: 'segment-30-2',
      name: 'Segment 30% #2',
      enabled: true,
      weightPct: 30,
      ruleType: 'ALL_REQUIRED',
      appliesTo: { mode: 'ALL_PRODUCTS', sites: [] },
      attributeSelector: {
        source: 'REGISTRY',
        categories: ['technical'],
        requirementFlag: 'completionRequired',
        siteAware: false,
        includeInternalOnly: false,
        excludeAttributeIds: []
      }
    }
  ]
};

// Product for weight math test - specific completion levels
export const PRODUCT_WEIGHT_MATH: ProductSnapshot = {
  productId: 'test-weight-math',
  attributes: {
    // Description: 2/3 complete = 67% (40% weight)
    'title': { us: 'US Title', uk: 'UK Title' }, // Missing DE
    'short_description': { us: 'US Short Desc', uk: 'UK Short Desc', de: 'DE Kurze Beschreibung' },
    'long_description': { us: 'US Long Description', uk: 'UK Long Description' },
    
    // SEO: 2/2 complete = 100% (30% weight) 
    'meta_title': { us: 'US Meta Title', uk: 'UK Meta Title', de: 'DE Meta Titel' },
    'meta_description': { us: 'US Meta Desc', uk: 'UK Meta Desc', de: 'DE Meta Beschreibung' },
    
    // Technical: 1/2 complete = 50% (30% weight)
    'dimensions': '10x20x30 cm',
    // weight missing
  },
  sites: ['us', 'uk', 'de']
};

// Test Case 5: Empty Product - All missing
export const PRODUCT_EMPTY: ProductSnapshot = {
  productId: 'test-product-empty',
  attributes: {},
  sites: ['us', 'uk']
};

// Expected Results
export const EXPECTED_RESULTS = {
  PRODUCT_100_COMPLETE: {
    totalCompletionPct: 100,
    hasBlockingSites: false,
    enabledSegments: 3,
    descriptionSeoScore: 100,
    technicalScore: 100,
    marketingScore: 100
  },
  
  PRODUCT_PARTIAL_COMPLETE: {
    totalCompletionPct: 57, // Calculated: (67% * 40% + 100% * 35% + 50% * 25%) / 100
    hasBlockingSites: true, // Missing long_description for DE
    enabledSegments: 3,
    descriptionSeoScore: 67, // 4/6 attributes (missing long_description for DE)
    technicalScore: 50, // 1/2 attributes
    marketingScore: 100 // ANY_REQUIRED, has brand
  },
  
  PRODUCT_BLOCKING_SITES: {
    totalCompletionPct: 0, // Blocked by missing Description/SEO
    hasBlockingSites: true,
    blockedSites: ['de'],
    enabledSegments: 3
  },
  
  PRODUCT_WEIGHT_MATH: {
    // Formula: round((67 * 40 + 100 * 30 + 50 * 30) / 100)
    // = round((2680 + 3000 + 1500) / 100) = round(71.8) = 72
    totalCompletionPct: 72,
    hasBlockingSites: true,
    blockedSites: ['de'], // Missing title for DE
    enabledSegments: 3
  },
  
  PRODUCT_EMPTY: {
    totalCompletionPct: 0,
    hasBlockingSites: true,
    blockedSites: ['us', 'uk'],
    enabledSegments: 3
  }
};

// Test Runner Function
export function runAllTests(): { passed: number; failed: number; results: any[] } {
  const testResults: any[] = [];
  let passed = 0;
  let failed = 0;

  // Test 1: 100% Completion
  try {
    const result = evaluateCompletion(
      PRODUCT_100_COMPLETE,
      ['us', 'uk', 'de'],
      TEST_ATTRIBUTE_REGISTRY,
      TEST_COMPLETION_RULES
    );
    
    const expected = EXPECTED_RESULTS.PRODUCT_100_COMPLETE;
    const testPassed = 
      result.totalCompletionPct === expected.totalCompletionPct &&
      result.hasBlockingSites === expected.hasBlockingSites &&
      result.evaluationMeta.enabledSegmentCount === expected.enabledSegments;
    
    testResults.push({
      name: 'TEST_100_COMPLETE',
      passed: testPassed,
      expected: expected.totalCompletionPct,
      actual: result.totalCompletionPct,
      details: result
    });
    
    if (testPassed) passed++; else failed++;
  } catch (error) {
    failed++;
    testResults.push({
      name: 'TEST_100_COMPLETE',
      passed: false,
      error: error instanceof Error ? error.message : String(error)
    });
  }

  // Test 2: Partial Completion
  try {
    const result = evaluateCompletion(
      PRODUCT_PARTIAL_COMPLETE,
      ['us', 'uk', 'de'],
      TEST_ATTRIBUTE_REGISTRY,
      TEST_COMPLETION_RULES
    );
    
    const expected = EXPECTED_RESULTS.PRODUCT_PARTIAL_COMPLETE;
    const testPassed = 
      result.totalCompletionPct === expected.totalCompletionPct &&
      result.hasBlockingSites === expected.hasBlockingSites;
    
    testResults.push({
      name: 'TEST_PARTIAL_COMPLETE',
      passed: testPassed,
      expected: expected.totalCompletionPct,
      actual: result.totalCompletionPct,
      details: result
    });
    
    if (testPassed) passed++; else failed++;
  } catch (error) {
    failed++;
    testResults.push({
      name: 'TEST_PARTIAL_COMPLETE', 
      passed: false,
      error: error instanceof Error ? error.message : String(error)
    });
  }

  // Test 3: Multi-Site Blocking
  try {
    const result = evaluateCompletion(
      PRODUCT_BLOCKING_SITES,
      ['us', 'uk', 'de'],
      TEST_ATTRIBUTE_REGISTRY,
      TEST_COMPLETION_RULES
    );
    
    const expected = EXPECTED_RESULTS.PRODUCT_BLOCKING_SITES;
    const testPassed = 
      result.hasBlockingSites === expected.hasBlockingSites &&
      result.siteBlockingReasons.some(r => r.site === 'de');
    
    testResults.push({
      name: 'TEST_BLOCKING_SITES',
      passed: testPassed,
      expected: 'Blocking for DE site',
      actual: `Blocking sites: ${result.siteBlockingReasons.map(r => r.site).join(', ')}`,
      details: result
    });
    
    if (testPassed) passed++; else failed++;
  } catch (error) {
    failed++;
    testResults.push({
      name: 'TEST_BLOCKING_SITES',
      passed: false,
      error: error instanceof Error ? error.message : String(error)
    });
  }

  // Test 4: Weight Math
  try {
    const result = evaluateCompletion(
      PRODUCT_WEIGHT_MATH,
      ['us', 'uk', 'de'],
      TEST_ATTRIBUTE_REGISTRY,
      RULES_WEIGHT_MATH
    );
    
    const expected = EXPECTED_RESULTS.PRODUCT_WEIGHT_MATH;
    const testPassed = result.totalCompletionPct === expected.totalCompletionPct;
    
    testResults.push({
      name: 'TEST_WEIGHT_MATH',
      passed: testPassed,
      expected: expected.totalCompletionPct,
      actual: result.totalCompletionPct,
      details: result
    });
    
    if (testPassed) passed++; else failed++;
  } catch (error) {
    failed++;
    testResults.push({
      name: 'TEST_WEIGHT_MATH',
      passed: false,
      error: error instanceof Error ? error.message : String(error)
    });
  }

  // Test 5: Empty Product
  try {
    const result = evaluateCompletion(
      PRODUCT_EMPTY,
      ['us', 'uk'],
      TEST_ATTRIBUTE_REGISTRY,
      TEST_COMPLETION_RULES
    );
    
    const expected = EXPECTED_RESULTS.PRODUCT_EMPTY;
    const testPassed = 
      result.totalCompletionPct === expected.totalCompletionPct &&
      result.hasBlockingSites === expected.hasBlockingSites;
    
    testResults.push({
      name: 'TEST_EMPTY_PRODUCT',
      passed: testPassed,
      expected: expected.totalCompletionPct,
      actual: result.totalCompletionPct,
      details: result
    });
    
    if (testPassed) passed++; else failed++;
  } catch (error) {
    failed++;
    testResults.push({
      name: 'TEST_EMPTY_PRODUCT',
      passed: false,
      error: error instanceof Error ? error.message : String(error)
    });
  }

  return { passed, failed, results: testResults };
}

// Manual test execution function
export function logTestResults(): void {
  console.log('='.repeat(60));
  console.log('COMPLETION EVALUATION ENGINE - TEST RESULTS');
  console.log('='.repeat(60));
  
  const { passed, failed, results } = runAllTests();
  
  console.log(`\nSUMMARY: ${passed} passed, ${failed} failed\n`);
  
  results.forEach((result, i) => {
    console.log(`${i + 1}. ${result.name}`);
    console.log(`   Status: ${result.passed ? '✅ PASSED' : '❌ FAILED'}`);
    
    if (result.error) {
      console.log(`   Error: ${result.error}`);
    } else {
      console.log(`   Expected: ${result.expected}`);
      console.log(`   Actual: ${result.actual}`);
    }
    console.log('');
  });
  
  console.log('='.repeat(60));
}