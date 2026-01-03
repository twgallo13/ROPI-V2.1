#!/usr/bin/env node

/**
 * Step 4 Fix: Import->Engine Pipeline Debug
 * 
 * Tests the exact field mapping and execution path to find why
 * onProductWrite is not applying Smart Rules.
 */

const admin = require('firebase-admin');

// Initialize Firebase Admin
const key = JSON.parse(Buffer.from(process.env.GCP_SA_KEY_BASE64, 'base64').toString('utf8'));
admin.initializeApp({
  credential: admin.credential.cert(key),
  projectId: key.project_id
});

async function debugImportEngine() {
  console.log('🔧 Step 4: Import->Engine Pipeline Debug');
  console.log('=' .repeat(50));
  
  const db = admin.firestore();
  const testProductId = `debug_import_${Date.now()}`;
  
  try {
    // Check if test rule exists
    console.log('📝 1. Verifying test rule configuration...');
    
    const testRuleDoc = await db.doc('settings/smartRules/rules/test-autoapply-sampling').get();
    if (!testRuleDoc.exists) {
      console.log('   ❌ Test rule not found!');
      return false;
    }
    
    const testRuleData = testRuleDoc.data();
    console.log('   ✅ Test rule found:');
    console.log(`      • Name: ${testRuleData.name}`);
    console.log(`      • Enabled: ${testRuleData.enabled}`);
    console.log(`      • Condition field: ${testRuleData.conditions?.[0]?.field}`);
    console.log(`      • Condition value: ${testRuleData.conditions?.[0]?.value}`);
    console.log(`      • Action field: ${testRuleData.actions?.[0]?.targetField}`);
    console.log(`      • Action value: ${testRuleData.actions?.[0]?.valueTemplate}`);
    console.log(`      • Only if empty: ${testRuleData.actions?.[0]?.onlyIfEmpty}`);
    
    // Create test product with exact matching structure
    console.log('');
    console.log('📝 2. Creating test product with precise field mapping...');
    
    const testProduct = {
      // Document ID in Firestore becomes the 'mpn' in onProductWrite
      // So testProductId will map to mpn: testProductId
      
      // Basic product fields
      title: 'Debug Import Pipeline Test Product',
      source: 'debug_test',
      
      // Attributes that should trigger the rule
      attributes: {
        rics_category: 'debug||sampling||test',  // Contains 'sampling'
        category: 'Debug',
        brand: 'TestBrand'
        // No gender field - rule should apply
      },
      
      // Timestamp fields
      createdAt: admin.firestore.Timestamp.now(),
      updatedAt: admin.firestore.Timestamp.now(),
      
      // Import metadata
      metadata: {
        testCase: 'debug_import_engine',
        batch: 'debug_batch'
      }
    };
    
    console.log(`   📦 Product Document ID: ${testProductId}`);
    console.log(`   📦 Maps to mpn: ${testProductId} (in onProductWrite)`);
    console.log(`   🏷️  RICS Category: ${testProduct.attributes.rics_category}`);
    console.log(`   👤 Gender field: ${testProduct.attributes.gender || '[empty - rule should apply]'}`);
    console.log(`   🔍 Matches condition: rics_category contains "sampling" = ${testProduct.attributes.rics_category.includes('sampling')}`);
    
    // Create the product document
    console.log('');
    console.log('📝 3. Creating product document (should trigger onProductWrite)...');
    
    await db.collection('products').doc(testProductId).set(testProduct);
    console.log('   ✅ Product document created');
    console.log('   🔥 onProductWrite trigger should fire now');
    
    // Wait for trigger processing
    console.log('');
    console.log('📝 4. Waiting for onProductWrite processing...');
    
    for (let i = 0; i < 6; i++) {
      console.log(`   ⏱️  Waiting ${i + 1}/6 (${(i + 1) * 2}s)...`);
      await new Promise(resolve => setTimeout(resolve, 2000));
      
      // Check if product was modified
      const checkDoc = await db.collection('products').doc(testProductId).get();
      if (checkDoc.exists) {
        const checkData = checkDoc.data();
        
        // Look for Smart Rules activity indicators
        const hasRulesRanAt = !!checkData._smartRulesRanAt;
        const hasSkipUntil = !!checkData._smartRulesSkipUntil;
        const hasGender = !!checkData.attributes?.gender;
        const hasAppliedRules = !!checkData._appliedRules;
        const hasSuggestions = !!checkData._smartSuggestions;
        const hasErrors = !!checkData._smartRulesErrors;
        
        console.log(`      📊 Smart Rules activity check:`);
        console.log(`         • _smartRulesRanAt: ${hasRulesRanAt}`);
        console.log(`         • _smartRulesSkipUntil: ${hasSkipUntil}`);
        console.log(`         • attributes.gender: ${hasGender ? checkData.attributes.gender : '[still empty]'}`);
        console.log(`         • _appliedRules: ${hasAppliedRules}`);
        console.log(`         • _smartSuggestions: ${hasSuggestions}`);
        console.log(`         • _smartRulesErrors: ${hasErrors}`);
        
        if (hasRulesRanAt || hasSkipUntil || hasGender || hasAppliedRules) {
          console.log('      ✅ Smart Rules activity detected!');
          
          if (hasGender && checkData.attributes.gender === "Men's") {
            console.log('      🎉 Rule applied successfully!');
            
            // Save success evidence
            const evidence = {
              timestamp: new Date().toISOString(),
              testProductId: testProductId,
              originalProduct: testProduct,
              updatedProduct: checkData,
              ruleApplied: true,
              pipelineWorking: true,
              fieldMapping: {
                documentId: testProductId,
                mapsToMpn: testProductId,
                triggerField: 'rics_category',
                triggerValue: 'sampling',
                targetField: 'attributes.gender',
                appliedValue: checkData.attributes.gender
              }
            };
            
            const fs = require('fs');
            fs.writeFileSync('artifacts/import_apply_evidence.json', JSON.stringify(evidence, null, 2));
            
            return true;
          } else {
            console.log('      ⚠️  Rules ran but did not apply (check guardrails)');
          }
          break;
        }
      }
    }
    
    // Final check and diagnosis
    console.log('');
    console.log('📝 5. Final diagnosis...');
    
    const finalDoc = await db.collection('products').doc(testProductId).get();
    if (finalDoc.exists) {
      const finalData = finalDoc.data();
      
      console.log('   📊 Final product state:');
      Object.keys(finalData).forEach(key => {
        if (key.startsWith('_smart') || key === 'attributes') {
          console.log(`      • ${key}: ${JSON.stringify(finalData[key])}`);
        }
      });
      
      if (!finalData._smartRulesRanAt) {
        console.log('');
        console.log('   ❌ DIAGNOSIS: onProductWrite trigger did NOT fire');
        console.log('   🔍 Possible causes:');
        console.log('      • Function not deployed correctly');
        console.log('      • Trigger configuration mismatch');
        console.log('      • Document path mismatch (collection/document structure)');
        console.log('      • Firebase Functions runtime error');
        console.log('      • Permission or authentication issue');
        
        const evidence = {
          timestamp: new Date().toISOString(),
          testProductId: testProductId,
          issue: 'onProductWrite_trigger_not_firing',
          diagnosis: 'Smart Rules trigger function did not execute',
          recommendedActions: [
            'Check Firebase Functions deployment status',
            'Verify trigger configuration in firebase.json',
            'Check function logs for errors',
            'Verify Firestore collection path matches trigger pattern'
          ]
        };
        
        const fs = require('fs');
        fs.writeFileSync('artifacts/import_apply_evidence.json', JSON.stringify(evidence, null, 2));
        
        return false;
      } else {
        console.log('   ⚠️  Rules ran but logic may have issues');
        return false;
      }
    }
    
    return false;
    
  } catch (error) {
    console.error('❌ Debug test failed:', error);
    
    const evidence = {
      timestamp: new Date().toISOString(),
      testProductId: testProductId,
      error: error.message,
      stack: error.stack
    };
    
    const fs = require('fs');
    fs.writeFileSync('artifacts/import_apply_evidence.json', JSON.stringify(evidence, null, 2));
    
    return false;
  } finally {
    // Cleanup
    console.log('');
    console.log('🧹 Cleaning up test product...');
    try {
      await db.collection('products').doc(testProductId).delete();
      console.log('   ✅ Test product deleted');
    } catch (cleanupError) {
      console.error('   ⚠️  Cleanup error:', cleanupError.message);
    }
  }
}

// Run the debug test
if (require.main === module) {
  debugImportEngine().then(success => {
    console.log('');
    if (success) {
      console.log('🎉 Step 4: Import->Engine Pipeline - WORKING');
      console.log('   ✅ onProductWrite trigger fires correctly');
      console.log('   ✅ Smart Rules engine evaluates and applies rules');
      console.log('   ✅ Field mapping working (productId -> mpn)');
    } else {
      console.log('❌ Step 4: Import->Engine Pipeline - NEEDS FIXING');
      console.log('   ❌ See artifacts/import_apply_evidence.json for details');
    }
    process.exit(success ? 0 : 1);
  }).catch(err => {
    console.error('❌ Debug test execution failed:', err);
    process.exit(1);
  });
}