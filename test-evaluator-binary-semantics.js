#!/usr/bin/env node

/**
 * Test Evaluator with Binary Segment Semantics
 * 
 * Tests the new evaluator implementation against test vectors
 * to verify binary segment evaluation works correctly
 */

const fs = require('fs');
const path = require('path');
const { execSync } = require('child_process');

// Test configuration
const TEST_SEED = 12345;
const TEMP_DIR = '/tmp/evaluator-test-' + Date.now();

// Create test input
const completionRules = {
  rulesVersion: 4,
  segments: [
    {
      id: 'core-attributes',
      name: 'Core Product Attributes',
      enabled: true,
      weightPct: 80,
      ruleType: 'ALL_REQUIRED',
      attributeSelector: {
        source: 'REGISTRY',
        categories: ['sku_core'],
        requirementFlag: 'required_for_completion'
      }
    },
    {
      id: 'seo-attributes',
      name: 'SEO & Marketing',
      enabled: true,
      weightPct: 20,
      ruleType: 'ALL_REQUIRED',
      attributeSelector: {
        source: 'REGISTRY',
        categories: ['description'],
        requirementFlag: 'required_for_completion'
      }
    }
  ]
};

const attributeRegistry = {
  attributes: [
    {
      attribute_id: 'sku',
      category: 'sku_core',
      required_for_completion: true,
      label: 'SKU'
    },
    {
      attribute_id: 'mpn',
      category: 'sku_core',
      required_for_completion: true,
      label: 'MPN'
    },
    {
      attribute_id: 'name',
      category: 'sku_core',
      required_for_completion: true,
      label: 'Name'
    },
    {
      attribute_id: 'brand',
      category: 'sku_core',
      required_for_completion: true,
      label: 'Brand'
    },
    {
      attribute_id: 'website',
      category: 'sku_core',
      required_for_completion: true,
      label: 'Website'
    },
    {
      attribute_id: 'product_is_active',
      category: 'sku_core',
      required_for_completion: true,
      label: 'Active Status'
    }
  ]
};

// Test cases
const testCases = [
  {
    name: 'Complete Core Attributes (All 6 required)',
    product: {
      id: 'product-complete',
      sku: 'SKU-001',
      mpn: 'MPN-001',
      name: 'Product Name',
      brand: 'Brand Name',
      website: 'https://example.com',
      product_is_active: true
    },
    expectedCoreStatus: 'complete',
    expectedCoreScore: 100,
    expectedMinCompletion: 80
  },
  {
    name: 'Missing website (1 of 6 core required)',
    product: {
      id: 'product-missing-website',
      sku: 'SKU-002',
      mpn: 'MPN-002',
      name: 'Product Name',
      brand: 'Brand Name',
      product_is_active: true
      // website is MISSING
    },
    expectedCoreStatus: 'blocked',
    expectedCoreScore: 0,
    expectedMaxCompletion: 79
  },
  {
    name: 'Missing product_is_active (1 of 6 core required)',
    product: {
      id: 'product-missing-active',
      sku: 'SKU-003',
      mpn: 'MPN-003',
      name: 'Product Name',
      brand: 'Brand Name',
      website: 'https://example.com'
      // product_is_active is MISSING
    },
    expectedCoreStatus: 'blocked',
    expectedCoreScore: 0,
    expectedMaxCompletion: 79
  },
  {
    name: 'Missing multiple core attributes',
    product: {
      id: 'product-missing-multiple',
      sku: 'SKU-004',
      name: 'Product Name'
      // missing: mpn, brand, website, product_is_active
    },
    expectedCoreStatus: 'blocked',
    expectedCoreScore: 0,
    expectedMaxCompletion: 79
  }
];

// Ensure temp dir exists
if (!fs.existsSync(TEMP_DIR)) {
  fs.mkdirSync(TEMP_DIR, { recursive: true });
}

console.log('🧪 Evaluator Binary Segment Semantics Test Suite\n');
console.log(`Test Temp Dir: ${TEMP_DIR}\n`);

let passCount = 0;
let failCount = 0;

for (const testCase of testCases) {
  console.log(`\n📋 Test: ${testCase.name}`);
  
  // Create test input
  const inputFile = path.join(TEMP_DIR, `input-${testCase.product.id}.json`);
  const outputFile = path.join(TEMP_DIR, `output-${testCase.product.id}.json`);
  
  const testInput = {
    snapshot: testCase.product,
    rules: completionRules,
    attributeRegistry: attributeRegistry
  };
  
  fs.writeFileSync(inputFile, JSON.stringify(testInput, null, 2));
  
  // Run evaluator
  try {
    execSync(`node packages/engine/bin/evaluate.js --input "${inputFile}" --out "${outputFile}" --seed ${TEST_SEED}`, {
      cwd: '/workspaces/ROPI-V2.1',
      stdio: 'pipe'
    });
    
    // Read output
    const output = JSON.parse(fs.readFileSync(outputFile, 'utf8'));
    const result = output.completion_result;
    
    // Find core segment
    const coreSegment = result.segments.find(s => s.id === 'core-attributes');
    
    if (!coreSegment) {
      console.log(`  ❌ FAIL: No core-attributes segment in output`);
      failCount++;
      continue;
    }
    
    // Validate
    const coreStatusMatch = coreSegment.status === testCase.expectedCoreStatus;
    const coreScoreMatch = coreSegment.score === testCase.expectedCoreScore;
    const completionCheck = testCase.expectedMinCompletion 
      ? result.completionPct >= testCase.expectedMinCompletion
      : testCase.expectedMaxCompletion 
      ? result.completionPct <= testCase.expectedMaxCompletion
      : true;
    
    const passed = coreStatusMatch && coreScoreMatch && completionCheck;
    
    if (passed) {
      console.log(`  ✅ PASS`);
      console.log(`     Core Status: ${coreSegment.status} (expected: ${testCase.expectedCoreStatus})`);
      console.log(`     Core Score: ${coreSegment.score} (expected: ${testCase.expectedCoreScore})`);
      console.log(`     Completion: ${result.completionPct}%`);
      console.log(`     Missing: ${coreSegment.missingAttributes.join(', ') || 'none'}`);
      passCount++;
    } else {
      console.log(`  ❌ FAIL`);
      if (!coreStatusMatch) {
        console.log(`     ✗ Core Status: ${coreSegment.status} (expected: ${testCase.expectedCoreStatus})`);
      }
      if (!coreScoreMatch) {
        console.log(`     ✗ Core Score: ${coreSegment.score} (expected: ${testCase.expectedCoreScore})`);
      }
      if (!completionCheck) {
        console.log(`     ✗ Completion: ${result.completionPct}% (expected ${testCase.expectedMinCompletion ? '>=' : '<='} ${testCase.expectedMinCompletion || testCase.expectedMaxCompletion})`);
      }
      console.log(`     Missing: ${coreSegment.missingAttributes.join(', ') || 'none'}`);
      failCount++;
    }
    
  } catch (error) {
    console.log(`  ❌ FAIL: Evaluation error`);
    console.log(`     ${error.message}`);
    failCount++;
  }
}

// Summary
console.log(`\n${'='.repeat(50)}`);
console.log(`📊 Test Results: ${passCount} passed, ${failCount} failed`);
console.log(`Success Rate: ${Math.round((passCount / (passCount + failCount)) * 100)}%`);

if (failCount === 0) {
  console.log(`\n✅ All tests passed!`);
  process.exit(0);
} else {
  console.log(`\n❌ Some tests failed`);
  process.exit(1);
}
