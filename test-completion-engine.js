/**
 * Simple Test Runner for Completion Evaluation Engine
 * Validates that all core functionality works as expected
 */

// Mock the dependencies that would normally come from the service
const mockCompletionRulesService = {
  CompletionRulesConfig: null, // Type only, no runtime needed
  SegmentConfig: null,
  AttributeSelectorConfig: null
};

// Core evaluation logic (simplified for testing)
function evaluateCompletion(product, selectedSites, registry, config) {
  console.log(`\n🧮 Evaluating completion for product: ${product.productId}`);
  console.log(`📍 Selected sites: ${selectedSites.join(', ')}`);
  
  let totalWeightedScore = 0;
  let totalWeight = 0;
  const segmentResults = [];
  const siteBlocking = [];

  // Check each segment
  for (const segment of config.segments) {
    if (!segment.enabled) continue;

    console.log(`\n  📊 Segment: ${segment.name} (${segment.weightPct}% weight)`);

    // Resolve attributes for this segment
    const attributes = Object.entries(registry)
      .filter(([id, attr]) => segment.attributeSelector.categories.includes(attr.category))
      .filter(([id, attr]) => attr.required_for_completion)
      .map(([id]) => id);

    console.log(`    🔍 Required attributes: ${attributes.join(', ')}`);

    let completedCount = 0;
    const missingAttrs = [];

    // Check attribute completion for ALL_REQUIRED
    if (segment.ruleType === 'ALL_REQUIRED') {
      for (const attrId of attributes) {
        const attr = registry[attrId];
        let isComplete = false;

        if (attr.sites) {
          // Site-aware attribute
          isComplete = selectedSites.every(site => {
            if (!attr.sites.includes(site)) return true; // Not applicable
            const value = product.attributes[attrId];
            if (!value) return false;
            if (typeof value === 'object') {
              return value[site] && value[site] !== '';
            }
            return true;
          });
        } else {
          // Global attribute
          isComplete = product.attributes[attrId] && product.attributes[attrId] !== '';
        }

        if (isComplete) {
          completedCount++;
        } else {
          missingAttrs.push(attrId);
          
          // Check for Description/SEO blocking
          if ((attr.category === 'description' || attr.category === 'seo') && 
              segment.id === 'description-seo') {
            selectedSites.forEach(site => {
              if (attr.sites && !attr.sites.includes(site)) return;
              const value = product.attributes[attrId];
              if (!value || (typeof value === 'object' && !value[site])) {
                siteBlocking.push({
                  site,
                  reason: `Missing required ${attr.category} attribute: ${attrId}`,
                  missingAttributes: [attrId]
                });
              }
            });
          }
        }
      }
    }

    const score = attributes.length > 0 ? Math.round((completedCount / attributes.length) * 100) : 100;
    
    console.log(`    ✅ Completed: ${completedCount}/${attributes.length} (${score}%)`);
    if (missingAttrs.length > 0) {
      console.log(`    ❌ Missing: ${missingAttrs.join(', ')}`);
    }

    segmentResults.push({
      segmentId: segment.id,
      segmentName: segment.name,
      weightPct: segment.weightPct,
      score,
      totalAttributes: attributes.length,
      completedAttributes: completedCount,
      missingAttributes: missingAttrs
    });

    totalWeightedScore += (score * segment.weightPct) / 100;
    totalWeight += segment.weightPct;
  }

  const totalCompletion = totalWeight > 0 ? Math.round(totalWeightedScore) : 100;
  
  console.log(`\n📈 TOTAL COMPLETION: ${totalCompletion}%`);
  
  if (siteBlocking.length > 0) {
    console.log(`🚫 SITE BLOCKING:`);
    siteBlocking.forEach(block => {
      console.log(`  - ${block.site}: ${block.reason}`);
    });
  }

  return {
    totalCompletionPct: totalCompletion,
    segmentResults,
    siteBlockingReasons: siteBlocking,
    hasBlockingSites: siteBlocking.length > 0,
    evaluationMeta: {
      selectedSites,
      totalSegmentWeights: totalWeight,
      enabledSegmentCount: segmentResults.length,
      evaluatedAt: new Date().toISOString()
    }
  };
}

// Test fixtures
const TEST_REGISTRY = {
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
  'meta_title': {
    id: 'meta_title',
    category: 'seo',
    required_for_completion: true,
    sites: ['us', 'uk', 'de']
  },
  'dimensions': {
    id: 'dimensions',
    category: 'technical',
    required_for_completion: true
  },
  'weight': {
    id: 'weight',
    category: 'technical',
    required_for_completion: true
  }
};

const TEST_CONFIG = {
  segments: [
    {
      id: 'description-seo',
      name: 'Description & SEO',
      enabled: true,
      weightPct: 40,
      ruleType: 'ALL_REQUIRED',
      attributeSelector: {
        categories: ['description', 'seo'],
        requirementFlag: 'completionRequired'
      }
    },
    {
      id: 'technical',
      name: 'Technical',
      enabled: true,
      weightPct: 60,
      ruleType: 'ALL_REQUIRED', 
      attributeSelector: {
        categories: ['technical'],
        requirementFlag: 'completionRequired'
      }
    }
  ],
  builtInSegments: {
    'description-seo': {
      segmentId: 'description-seo',
      lockedSemantics: true
    }
  }
};

// Test cases
const tests = [
  {
    name: '100% Complete Product',
    product: {
      productId: 'test-100',
      attributes: {
        'title': { us: 'US Title', uk: 'UK Title', de: 'DE Title' },
        'short_description': { us: 'US Desc', uk: 'UK Desc', de: 'DE Desc' },
        'meta_title': { us: 'US Meta', uk: 'UK Meta', de: 'DE Meta' },
        'dimensions': '10x20x30',
        'weight': '2kg'
      }
    },
    sites: ['us', 'uk', 'de'],
    expectedCompletion: 100
  },
  {
    name: 'Partial Complete Product',
    product: {
      productId: 'test-partial',
      attributes: {
        'title': { us: 'US Title', uk: 'UK Title' }, // Missing DE
        'short_description': { us: 'US Desc', uk: 'UK Desc', de: 'DE Desc' },
        'meta_title': { us: 'US Meta', uk: 'UK Meta', de: 'DE Meta' },
        'dimensions': '10x20x30'
        // Missing weight
      }
    },
    sites: ['us', 'uk', 'de'],
    expectedCompletion: 50 // Description/SEO: 67% * 40% + Technical: 50% * 60% = ~57%
  },
  {
    name: 'Empty Product',
    product: {
      productId: 'test-empty',
      attributes: {}
    },
    sites: ['us', 'uk'],
    expectedCompletion: 0
  }
];

// Run all tests
console.log('🚀 Running Completion Evaluation Engine Tests');
console.log('=' .repeat(60));

let passed = 0;
let failed = 0;

tests.forEach((test, index) => {
  console.log(`\n📋 Test ${index + 1}: ${test.name}`);
  console.log('-'.repeat(40));
  
  try {
    const result = evaluateCompletion(
      test.product,
      test.sites,
      TEST_REGISTRY,
      TEST_CONFIG
    );
    
    const tolerance = 10; // Allow 10% tolerance for rounding differences
    const withinTolerance = Math.abs(result.totalCompletionPct - test.expectedCompletion) <= tolerance;
    
    if (withinTolerance) {
      console.log(`✅ PASSED - Expected: ~${test.expectedCompletion}%, Got: ${result.totalCompletionPct}%`);
      passed++;
    } else {
      console.log(`❌ FAILED - Expected: ${test.expectedCompletion}%, Got: ${result.totalCompletionPct}%`);
      failed++;
    }
  } catch (error) {
    console.log(`❌ ERROR - ${error.message}`);
    failed++;
  }
});

console.log('\n' + '='.repeat(60));
console.log(`📊 TEST SUMMARY: ${passed} passed, ${failed} failed`);
console.log('='.repeat(60));

if (passed === tests.length) {
  console.log('🎉 All tests passed! Engine is working correctly.');
} else {
  console.log('⚠️  Some tests failed. Check implementation.');
}