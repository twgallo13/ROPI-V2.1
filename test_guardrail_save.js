#!/usr/bin/env node
/**
 * Test Guardrail Save Flow
 * Verifies that setOnlyIfEmpty persists correctly through the save chain
 */

const admin = require('firebase-admin');
const path = require('path');

// Load service account
const serviceAccountPath = process.env.GOOGLE_APPLICATION_CREDENTIALS || 
  path.join(__dirname, 'service-account.json');

if (!admin.apps.length) {
  admin.initializeApp({
    credential: admin.credential.cert(require(serviceAccountPath)),
    projectId: 'ropi-bccee'
  });
}

const db = admin.firestore();

async function testGuardrailSave() {
  console.log('🧪 Testing Guardrail setOnlyIfEmpty Persistence\n');
  
  const testRuleId = `test_guardrail_${Date.now()}`;
  
  // Step 1: Create a rule WITH setOnlyIfEmpty = true
  console.log('📝 Step 1: Creating rule with setOnlyIfEmpty = true');
  
  const testRule = {
    ruleId: testRuleId,
    name: 'Test Guardrail Save',
    description: 'Testing setOnlyIfEmpty persistence',
    enabled: true,
    priority: 100,
    condition: {
      field: 'source.rics.category',
      matchType: 'contains',
      value: 'test'
    },
    action: {
      targetField: 'attributes.test_field',
      valueTemplate: 'Test Value',
      setOnlyIfEmpty: true  // ← KEY FIELD TO TEST
    },
    autoApply: false,
    autoApplyConfidence: 0.9,
    tags: ['test'],
    createdAt: admin.firestore.Timestamp.now(),
    createdBy: 'test-script',
    updatedAt: admin.firestore.Timestamp.now(),
    updatedBy: 'test-script'
  };
  
  console.log('   Writing rule:', testRuleId);
  console.log('   action.setOnlyIfEmpty:', testRule.action.setOnlyIfEmpty);
  
  await db.collection('settings/smartRules/rules').doc(testRuleId).set(testRule);
  console.log('   ✅ Rule created\n');
  
  // Step 2: Read it back
  console.log('📖 Step 2: Reading rule back from Firestore');
  
  const snapshot = await db.collection('settings/smartRules/rules').doc(testRuleId).get();
  const readRule = snapshot.data();
  
  console.log('   Rule ID:', readRule.ruleId);
  console.log('   Rule name:', readRule.name);
  console.log('   action.targetField:', readRule.action.targetField);
  console.log('   action.valueTemplate:', readRule.action.valueTemplate);
  console.log('   action.setOnlyIfEmpty:', readRule.action.setOnlyIfEmpty);
  console.log('   action.setOnlyIfEmpty type:', typeof readRule.action.setOnlyIfEmpty);
  
  if (readRule.action.setOnlyIfEmpty === true) {
    console.log('   ✅ setOnlyIfEmpty persisted correctly!\n');
  } else {
    console.log('   ❌ setOnlyIfEmpty was NOT persisted (value:', readRule.action.setOnlyIfEmpty, ')\n');
  }
  
  // Step 3: Update with setOnlyIfEmpty = false
  console.log('📝 Step 3: Updating rule with setOnlyIfEmpty = false');
  
  await db.collection('settings/smartRules/rules').doc(testRuleId).update({
    'action.setOnlyIfEmpty': false,
    updatedAt: admin.firestore.Timestamp.now()
  });
  console.log('   ✅ Rule updated\n');
  
  // Step 4: Read again
  console.log('📖 Step 4: Reading updated rule');
  
  const snapshot2 = await db.collection('settings/smartRules/rules').doc(testRuleId).get();
  const readRule2 = snapshot2.data();
  
  console.log('   action.setOnlyIfEmpty:', readRule2.action.setOnlyIfEmpty);
  console.log('   action.setOnlyIfEmpty type:', typeof readRule2.action.setOnlyIfEmpty);
  
  if (readRule2.action.setOnlyIfEmpty === false) {
    console.log('   ✅ setOnlyIfEmpty = false persisted correctly!\n');
  } else {
    console.log('   ❌ setOnlyIfEmpty = false was NOT persisted (value:', readRule2.action.setOnlyIfEmpty, ')\n');
  }
  
  // Step 5: Check schema validation
  console.log('🔍 Step 5: Checking if SDK schema accepts setOnlyIfEmpty');
  
  try {
    // Import the SDK schema
    const { validateSmartRule } = require('./packages/sdk/dist/index.js');
    
    const testPayload = {
      ruleId: 'test',
      name: 'Test',
      enabled: true,
      priority: 100,
      condition: { field: 'test', matchType: 'contains', value: 'test' },
      action: {
        targetField: 'test',
        valueTemplate: 'test',
        setOnlyIfEmpty: true
      },
      autoApply: false,
      tags: []
    };
    
    validateSmartRule(testPayload);
    console.log('   ✅ SDK schema accepts setOnlyIfEmpty field\n');
  } catch (err) {
    console.log('   ❌ SDK schema validation failed:', err.message, '\n');
  }
  
  // Cleanup
  console.log('🧹 Cleanup: Deleting test rule');
  await db.collection('settings/smartRules/rules').doc(testRuleId).delete();
  console.log('   ✅ Test rule deleted\n');
  
  console.log('✅ Test complete!');
  process.exit(0);
}

testGuardrailSave().catch(err => {
  console.error('❌ Test failed:', err);
  process.exit(1);
});
