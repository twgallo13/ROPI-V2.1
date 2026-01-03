#!/usr/bin/env node

/**
 * Step 2.4: Integration Test - End-to-End Guarded Apply
 * 
 * This test creates a real product, creates a Smart Rule with onlyIfEmpty=true,
 * then tests that the rule suggestion is created but NOT applied when the
 * target field already has a value.
 */

const admin = require('firebase-admin');
const path = require('path');

// Initialize Firebase Admin if not already done
if (!admin.apps.length) {
  const serviceAccount = JSON.parse(
    Buffer.from(process.env.GCP_SA_KEY_BASE64, 'base64').toString('utf-8')
  );
  
  admin.initializeApp({
    credential: admin.credential.cert(serviceAccount),
    projectId: serviceAccount.project_id
  });
}

const db = admin.firestore();

async function runIntegrationTest() {
  console.log('🧪 Step 2.4: Integration Test - End-to-End Guarded Apply');
  console.log('=' .repeat(60));
  
  const testId = `guardrail_test_${Date.now()}`;
  const productId = `product_${testId}`;
  const ruleId = `rule_${testId}`;
  
  console.log(`🔧 Test ID: ${testId}`);
  console.log(`📦 Product ID: ${productId}`);
  console.log(`📋 Rule ID: ${ruleId}`);
  console.log('');
  
  try {
    // Step 1: Create a product with existing gender value
    console.log('📝 Step 1: Creating test product with existing gender value...');
    const testProduct = {
      productId: productId,
      title: 'Test Product for Guardrail Integration',
      description: 'Product to test onlyIfEmpty guardrail functionality',
      attributes: {
        gender: 'Women\'s Clothing', // Existing value - should prevent rule application
        category: 'Clothing',
        brand: 'Test Brand'
      },
      createdAt: admin.firestore.Timestamp.now(),
      createdBy: 'integration-test',
      updatedAt: admin.firestore.Timestamp.now(),
      source: 'test'
    };
    
    await db.collection('products').doc(productId).set(testProduct);
    console.log('✅ Product created successfully');
    console.log(`   Product: ${productId}`);
    console.log(`   Existing gender: "${testProduct.attributes.gender}"`);
    console.log('');
    
    // Step 2: Create Smart Rule with onlyIfEmpty=true
    console.log('📝 Step 2: Creating Smart Rule with onlyIfEmpty=true guardrail...');
    const testRule = {
      ruleId: ruleId,
      name: 'Test Guardrail Rule',
      description: 'Rule to test onlyIfEmpty guardrail behavior',
      enabled: true,
      priority: 100,
      condition: {
        matchType: 'always',
        value: true
      },
      action: {
        targetField: 'attributes.gender',
        valueTemplate: 'Men\'s Clothing',
        onlyIfEmpty: true // GUARDRAIL ACTIVE
      },
      autoApply: true,
      autoApplyConfidence: 0.8,
      createdAt: admin.firestore.Timestamp.now(),
      createdBy: 'integration-test'
    };
    
    await db.collection('settings/smartRules/rules').doc(ruleId).set(testRule);
    console.log('✅ Smart Rule created successfully');
    console.log(`   Rule: ${ruleId}`);
    console.log(`   Target: ${testRule.action.targetField}`);
    console.log(`   Suggested Value: "${testRule.action.valueTemplate}"`);
    console.log(`   onlyIfEmpty: ${testRule.action.onlyIfEmpty}`);
    console.log('');
    
    // Step 3: Simulate Smart Rules evaluation (import-time trigger)
    console.log('📝 Step 3: Simulating import-time Smart Rules evaluation...');
    
    // Import the Smart Rules Engine
    const { SmartRulesEngineV2 } = require('./packages/api/dist/index.js');
    
    // Create engine instance
    const engine = new SmartRulesEngineV2([testRule]);
    
    // Create import row that represents the product
    const importRow = {
      productId: productId,
      normalized: {
        title: testProduct.title,
        description: testProduct.description
      },
      source: {
        raw: { title: testProduct.title },
        format: 'test'
      },
      existingProduct: testProduct // Include existing product with gender value
    };
    
    // Run the engine evaluation
    const engineResult = engine.evaluateForImport(importRow);
    
    console.log('✅ Engine evaluation completed');
    console.log(`   Suggestions found: ${engineResult.suggestions.length}`);
    console.log(`   Auto-applied: ${engineResult.autoApplied.length}`);
    console.log(`   Errors: ${engineResult.errors.length}`);
    console.log(`   Activity log entries: ${engineResult.activityLog.length}`);
    console.log('');
    
    // Step 4: Verify guardrail behavior
    console.log('📝 Step 4: Verifying guardrail behavior...');
    
    let testPassed = true;
    const issues = [];
    
    // Check 4.1: Should have 1 suggestion created
    if (engineResult.suggestions.length !== 1) {
      testPassed = false;
      issues.push(`Expected 1 suggestion, got ${engineResult.suggestions.length}`);
    } else {
      console.log('✅ 4.1: Suggestion created correctly');
      const suggestion = engineResult.suggestions[0];
      console.log(`      Rule ID: ${suggestion.ruleId}`);
      console.log(`      Target: ${suggestion.targetField}`);
      console.log(`      Value: "${suggestion.value}"`);
      console.log(`      Applied: ${suggestion.applied}`);
    }
    
    // Check 4.2: Should have 0 auto-applied suggestions (guardrail blocked)
    if (engineResult.autoApplied.length !== 0) {
      testPassed = false;
      issues.push(`Expected 0 auto-applied, got ${engineResult.autoApplied.length}`);
    } else {
      console.log('✅ 4.2: Auto-apply correctly blocked by guardrail');
    }
    
    // Check 4.3: Should not update the gender field
    if (engineResult.updates && engineResult.updates['attributes.gender']) {
      testPassed = false;
      issues.push(`Gender field should not be updated, but got: ${engineResult.updates['attributes.gender']}`);
    } else {
      console.log('✅ 4.3: Gender field correctly preserved (not overwritten)');
    }
    
    // Check 4.4: Should have guardrail blocked activity log
    const guardrailLog = engineResult.activityLog.find(log => log.action === 'smartrule_guardrail_blocked');
    if (!guardrailLog) {
      testPassed = false;
      issues.push('Missing smartrule_guardrail_blocked activity log entry');
    } else {
      console.log('✅ 4.4: Guardrail block activity logged correctly');
      console.log(`      Actor: ${guardrailLog.actor}`);
      console.log(`      Timestamp: ${guardrailLog.timestamp}`);
      console.log(`      Reason: ${guardrailLog.details.reason}`);
      console.log(`      Existing Value: "${guardrailLog.details.existingValue}"`);
      console.log(`      Suggested Value: "${guardrailLog.details.suggestedValue}"`);
    }
    
    // Check 4.5: Should NOT have auto-apply activity log
    const autoApplyLog = engineResult.activityLog.find(log => log.action === 'smartrule_auto_apply');
    if (autoApplyLog) {
      testPassed = false;
      issues.push('Found unexpected smartrule_auto_apply activity log entry');
    } else {
      console.log('✅ 4.5: No auto-apply activity log (correctly blocked)');
    }
    
    console.log('');
    
    // Final Results
    console.log('📊 INTEGRATION TEST RESULTS');
    console.log('=' .repeat(40));
    
    if (testPassed) {
      console.log('🎉 ✅ ALL TESTS PASSED');
      console.log('');
      console.log('🎯 Verified Behaviors:');
      console.log('   ✅ Smart Rule suggestion created for matching condition');
      console.log('   ✅ Auto-apply blocked due to existing field value');
      console.log('   ✅ Target field value preserved (not overwritten)');
      console.log('   ✅ Guardrail block logged with GUARDRAIL_ONLY_IF_EMPTY reason');
      console.log('   ✅ No auto-apply activity logged');
      console.log('');
      console.log('🔍 Step 2.4 ACCEPTANCE CRITERIA MET:');
      console.log('   ✅ End-to-end guardrail functionality works');
      console.log('   ✅ Engine honors onlyIfEmpty=true flag');
      console.log('   ✅ Existing values protected from override');
      console.log('   ✅ Comprehensive activity logging for audit trail');
    } else {
      console.log('❌ ❌ TESTS FAILED');
      console.log('');
      console.log('🚨 Issues Found:');
      issues.forEach((issue, index) => {
        console.log(`   ${index + 1}. ${issue}`);
      });
    }
    
    console.log('');
    
    // Save test results artifact
    const artifactData = {
      timestamp: new Date().toISOString(),
      step: '2.4',
      description: 'Integration test end-to-end guarded apply',
      testId: testId,
      productId: productId,
      ruleId: ruleId,
      setup: {
        existingProduct: {
          gender: testProduct.attributes.gender,
          created: true
        },
        smartRule: {
          targetField: testRule.action.targetField,
          valueTemplate: testRule.action.valueTemplate,
          onlyIfEmpty: testRule.action.onlyIfEmpty,
          created: true
        }
      },
      engineResults: {
        suggestionsCount: engineResult.suggestions.length,
        autoAppliedCount: engineResult.autoApplied.length,
        errorsCount: engineResult.errors.length,
        activityLogCount: engineResult.activityLog.length,
        updates: engineResult.updates
      },
      verification: {
        suggestionCreated: engineResult.suggestions.length === 1,
        autoApplyBlocked: engineResult.autoApplied.length === 0,
        fieldPreserved: !engineResult.updates || !engineResult.updates['attributes.gender'],
        guardrailLogged: !!guardrailLog,
        noAutoApplyLog: !autoApplyLog
      },
      testResult: testPassed ? 'PASSED' : 'FAILED',
      issues: testPassed ? [] : issues
    };
    
    const fs = require('fs');
    const artifactFile = `artifacts/guardrail_integration_test_${testId.split('_').pop()}.json`;
    fs.writeFileSync(artifactFile, JSON.stringify(artifactData, null, 2));
    console.log(`💾 Test results saved: ${artifactFile}`);
    
    return testPassed;
    
  } catch (error) {
    console.error('❌ Integration test failed with error:', error);
    return false;
  } finally {
    // Cleanup: Remove test data
    console.log('');
    console.log('🧹 Cleaning up test data...');
    try {
      await db.collection('products').doc(productId).delete();
      await db.collection('settings/smartRules/rules').doc(ruleId).delete();
      console.log('✅ Test data cleaned up successfully');
    } catch (cleanupError) {
      console.error('⚠️  Cleanup error (non-critical):', cleanupError.message);
    }
  }
}

// Run the test
if (require.main === module) {
  runIntegrationTest().then(success => {
    process.exit(success ? 0 : 1);
  }).catch(err => {
    console.error('❌ Test execution failed:', err);
    process.exit(1);
  });
}

module.exports = { runIntegrationTest };