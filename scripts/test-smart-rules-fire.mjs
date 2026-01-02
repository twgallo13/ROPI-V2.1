#!/usr/bin/env node
/**
 * test-smart-rules-fire.mjs - D3 Diagnostic: Test if Smart Rules fire
 * 
 * This script:
 * 1. Clears the _smartRulesRanAt flag from product 2-test
 * 2. Triggers a re-evaluation by saving the product
 * 3. Checks if rules were applied
 */

import admin from 'firebase-admin';
import { getFirestore, FieldValue } from 'firebase-admin/firestore';

if (!admin.apps.length) {
  admin.initializeApp({ projectId: 'ropi-bccee' });
}
const db = getFirestore();

const productId = process.argv[2] || '2-test';

async function testSmartRulesFire() {
  console.log(`=== D3 DIAGNOSTIC: Test Smart Rules Fire for ${productId} ===\n`);
  
  // Step 1: Get current product state
  const productRef = db.collection('products').doc(productId);
  const before = await productRef.get();
  
  if (!before.exists) {
    console.error(`Product ${productId} not found`);
    process.exit(1);
  }
  
  const beforeData = before.data();
  console.log('BEFORE:');
  console.log('  department:', beforeData.attributes?.department || 'NOT SET');
  console.log('  gender:', beforeData.attributes?.gender || 'NOT SET');
  console.log('  age_group:', beforeData.attributes?.age_group || 'NOT SET');
  console.log('  _smartRulesRanAt:', beforeData._smartRulesRanAt || 'NOT SET');
  console.log('  _appliedRules:', beforeData._appliedRules || 'NOT SET');
  console.log('');
  
  // Step 2: Clear the _smartRulesRanAt flag to allow re-evaluation
  console.log('Clearing _smartRulesRanAt flag to allow re-evaluation...');
  await productRef.update({
    _smartRulesRanAt: FieldValue.delete(),
    _appliedRules: FieldValue.delete(),
    'attributes.department': FieldValue.delete(),
    'attributes.gender': FieldValue.delete(),
  });
  
  // Step 3: Trigger a product write to invoke onProductWrite trigger
  console.log('Triggering product write to invoke Smart Rules...');
  await productRef.update({
    '_smartRulesTest': new Date().toISOString(),
  });
  
  // Step 4: Wait for trigger to process
  console.log('Waiting 5 seconds for Cloud Function trigger...');
  await new Promise(r => setTimeout(r, 5000));
  
  // Step 5: Check results
  const after = await productRef.get();
  const afterData = after.data();
  
  console.log('\nAFTER:');
  console.log('  department:', afterData.attributes?.department || 'NOT SET');
  console.log('  gender:', afterData.attributes?.gender || 'NOT SET');
  console.log('  age_group:', afterData.attributes?.age_group || 'NOT SET');
  console.log('  _smartRulesRanAt:', afterData._smartRulesRanAt || 'NOT SET');
  console.log('  _appliedRules:', afterData._appliedRules || 'NOT SET');
  
  // Step 6: Verdict
  console.log('\n=== VERDICT ===');
  if (afterData.attributes?.department) {
    console.log('✅ SUCCESS: Smart Rules fired and set department to:', afterData.attributes.department);
  } else {
    console.log('❌ FAILED: Smart Rules did not set department');
    console.log('Check Cloud Function logs: firebase functions:log');
  }
  
  // Clean up test marker
  await productRef.update({
    '_smartRulesTest': FieldValue.delete(),
  });
}

testSmartRulesFire().catch(console.error);
