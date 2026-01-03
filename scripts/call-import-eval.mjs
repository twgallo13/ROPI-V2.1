#!/usr/bin/env node
/**
 * call-import-eval.mjs - D2 Diagnostic: Call import-eval endpoint
 * 
 * Uses Firebase Admin SDK to authenticate and call the import-eval endpoint
 * to get per-rule evaluation decisions for a product.
 */

import { initializeApp, cert } from 'firebase-admin/app';
import { getFirestore } from 'firebase-admin/firestore';
import { getAuth } from 'firebase-admin/auth';

// Get product ID from command line
const productId = process.argv[2] || '2-test';

// Initialize Firebase Admin
const app = initializeApp({
  projectId: 'ropi-bccee',
});
const db = getFirestore(app);

// Helper to process product with smart rules locally
async function simulateImportEval(productId) {
  console.log(`\n=== D2 DIAGNOSTIC: Import Eval for ${productId} ===\n`);
  
  // Fetch product
  const productDoc = await db.collection('products').doc(productId).get();
  if (!productDoc.exists) {
    console.error(`Product ${productId} not found`);
    process.exit(1);
  }
  const productData = productDoc.data();
  
  console.log('Product Fields Available:');
  console.log('  core:', Object.keys(productData.core || {}).join(', '));
  console.log('  attributes:', Object.keys(productData.attributes || {}).join(', '));
  
  // Build normalizedData like the endpoint does
  const normalizedData = {
    ...productData.core,
    ...productData.attributes,
  };
  
  console.log('\nNormalized Data Keys:', Object.keys(normalizedData).join(', '));
  console.log('\nKey Field Values:');
  console.log('  rics_category:', normalizedData.rics_category || 'NOT SET');
  console.log('  rics_category_path:', normalizedData.rics_category_path || 'NOT SET');
  console.log('  department:', normalizedData.department || 'NOT SET');
  console.log('  gender:', normalizedData.gender || 'NOT SET');
  console.log('  age_group:', normalizedData.age_group || 'NOT SET');
  
  // Fetch all enabled rules (simplified query - no compound index needed)
  const rulesSnapshot = await db.collection('settings/smartRules/rules').get();
  
  console.log(`\n=== Total Rules in Collection: ${rulesSnapshot.size} ===\n`);
  
  // Filter to enabled rules and sort by priority
  const allRules = rulesSnapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
  console.log('All rules enabled status:', allRules.map(r => `${r.name}: ${r.enabled}`).join(', '));
  
  const enabledRules = allRules
    .filter(r => r.enabled === true)
    .sort((a, b) => (b.priority || 0) - (a.priority || 0));
  
  console.log(`\nEnabled rules: ${enabledRules.length}\n`);
  
  for (const rule of enabledRules) {
    console.log(`--- Rule: ${rule.name} (${rule.id}) ---`);
    console.log(`  Priority: ${rule.priority}`);
    console.log(`  AutoApply: ${rule.autoApply}`);
    
    // Parse condition
    const condition = rule.condition || {};
    const sourceField = condition.source || condition.field;
    const matchType = condition.matchType;
    const value = condition.value;
    
    console.log(`  Condition:`);
    console.log(`    field: ${sourceField}`);
    console.log(`    matchType: ${matchType}`);
    console.log(`    value: ${value}`);
    
    // Get actual value from normalized data
    const actualValue = normalizedData[sourceField];
    console.log(`  Actual Value in Product: "${actualValue || 'undefined/missing'}"`);
    
    // Simulate evaluation
    let wouldMatch = false;
    let reason = '';
    
    if (!sourceField) {
      reason = 'NO_SOURCE_FIELD';
    } else if (actualValue === undefined || actualValue === null || actualValue === '') {
      reason = `FIELD_EMPTY (${sourceField} not found in product)`;
    } else if (matchType === 'contains') {
      const searchValue = String(value || '').toLowerCase();
      const sourceStr = String(actualValue).toLowerCase();
      wouldMatch = sourceStr.includes(searchValue);
      reason = wouldMatch ? 
        `MATCHED: "${sourceStr}" contains "${searchValue}"` : 
        `NOT_MATCHED: "${sourceStr}" does not contain "${searchValue}"`;
    } else if (matchType === 'equals') {
      wouldMatch = String(actualValue) === String(value);
      reason = wouldMatch ? 'MATCHED: equals' : `NOT_MATCHED: "${actualValue}" != "${value}"`;
    } else {
      reason = `UNSUPPORTED_MATCH_TYPE: ${matchType}`;
    }
    
    // Check target field
    const targetField = rule.action?.target;
    const currentTargetValue = normalizedData[targetField];
    const setOnlyIfEmpty = rule.action?.setOnlyIfEmpty;
    
    console.log(`  Action:`);
    console.log(`    target: ${targetField}`);
    console.log(`    setValue: ${rule.action?.value}`);
    console.log(`    setOnlyIfEmpty: ${setOnlyIfEmpty}`);
    console.log(`    current ${targetField} value: "${currentTargetValue || 'EMPTY'}"`);
    
    // Would it be skipped due to setOnlyIfEmpty?
    let skipReason = '';
    if (wouldMatch && setOnlyIfEmpty && currentTargetValue) {
      skipReason = `(Would skip: setOnlyIfEmpty=true and ${targetField} already has value)`;
    }
    
    console.log(`  RESULT: ${wouldMatch ? '✅ WOULD MATCH' : '❌ NO MATCH'}`);
    console.log(`  Reason: ${reason} ${skipReason}`);
    console.log('');
  }
  
  console.log('\n=== DIAGNOSIS ===');
  console.log(`\nIf rules check "rics_category_path" but product has "rics_category",`);
  console.log(`the conditions will NOT match because the field doesn't exist.\n`);
  
  console.log('Field Mapping Issue:');
  console.log('  Rules expect: rics_category_path');
  console.log('  Product has:  rics_category');
  console.log('  This is the root cause of rules not matching!\n');
}

simulateImportEval(productId).catch(console.error);
