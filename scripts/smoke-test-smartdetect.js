#!/usr/bin/env node
/**
 * Smoke Test for SmartDetect Applied Metadata
 * 
 * Tests the following for product FD ZAHARA-S-WHT:
 * 1. POST /apiSmartDetect returns suggestions with autoApply
 * 2. Suggestions include ruleId, ruleName, confidence
 * 3. (Manual step would be to apply via UI and check Firestore)
 */

const API_BASE = process.env.API_BASE || 'http://localhost:5000/ropi-bccee/us-central1';

async function smokeTestSmartDetect() {
  console.log('=== SmartDetect Smoke Test ===\n');
  
  const productId = 'FD ZAHARA-S-WHT';
  console.log(`Testing product: ${productId}\n`);
  
  try {
    // Test 1: Call SmartDetect API
    console.log('1. Calling POST /apiSmartDetect...');
    const response = await fetch(`${API_BASE}/apiSmartDetect`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ productId })
    });
    
    if (!response.ok) {
      throw new Error(`HTTP ${response.status}: ${await response.text()}`);
    }
    
    const result = await response.json();
    console.log(`✓ API responded successfully\n`);
    
    // Test 2: Verify response structure
    console.log('2. Verifying response structure...');
    if (!result.suggestions || !Array.isArray(result.suggestions)) {
      throw new Error('Missing or invalid suggestions array');
    }
    console.log(`✓ Found ${result.suggestions.length} suggestions\n`);
    
    // Test 3: Check for autoApply suggestions
    console.log('3. Checking for autoApply suggestions...');
    const autoApplySuggestions = result.suggestions.filter(s => s.autoApply);
    console.log(`✓ Found ${autoApplySuggestions.length} autoApply suggestions\n`);
    
    // Test 4: Verify required metadata fields
    console.log('4. Verifying required metadata fields...');
    let allHaveMetadata = true;
    const missingFields = [];
    
    for (const suggestion of result.suggestions) {
      const required = ['fieldPath', 'currentValue', 'suggestedValue', 'confidence', 'reason', 'ruleId', 'ruleName', 'autoApply'];
      const missing = required.filter(field => suggestion[field] === undefined);
      
      if (missing.length > 0) {
        allHaveMetadata = false;
        missingFields.push({ fieldPath: suggestion.fieldPath, missing });
      }
    }
    
    if (!allHaveMetadata) {
      console.error('✗ Some suggestions are missing required fields:');
      console.error(JSON.stringify(missingFields, null, 2));
      process.exit(1);
    }
    
    console.log('✓ All suggestions have required metadata fields\n');
    
    // Display suggestions summary
    console.log('5. Suggestions Summary:');
    console.log('─'.repeat(80));
    result.suggestions.forEach((s, i) => {
      console.log(`${i + 1}. ${s.ruleName} (${s.ruleId})`);
      console.log(`   Field: ${s.fieldPath}`);
      console.log(`   Suggested: ${JSON.stringify(s.suggestedValue)}`);
      console.log(`   Confidence: ${(s.confidence * 100).toFixed(0)}%`);
      console.log(`   Auto-apply: ${s.autoApply ? 'YES' : 'NO'}`);
      console.log(`   Reason: ${s.reason}`);
      console.log('');
    });
    console.log('─'.repeat(80));
    
    console.log('\n✅ All smoke tests passed!\n');
    console.log('📝 Manual verification steps:');
    console.log('   1. Open product FD ZAHARA-S-WHT in UI');
    console.log('   2. Open AI Workflow panel → Smart Detect');
    console.log('   3. Verify auto-apply suggestions are applied automatically');
    console.log('   4. Check Firestore for ai.smartDetectApplied metadata');
    console.log('   5. Test Undo functionality');
    console.log('   6. Verify field badges appear on applied fields\n');
    
    return result;
    
  } catch (error) {
    console.error('✗ Smoke test failed:', error.message);
    process.exit(1);
  }
}

// Run if called directly
if (require.main === module) {
  smokeTestSmartDetect();
}

module.exports = { smokeTestSmartDetect };
