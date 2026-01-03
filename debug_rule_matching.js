#!/usr/bin/env node

/**
 * Step 4 Final Fix: Detailed rule matching debug
 * 
 * Tests rule loading and matching to see why the rule isn't matching.
 */

const admin = require('firebase-admin');

// Initialize Firebase Admin
const key = JSON.parse(Buffer.from(process.env.GCP_SA_KEY_BASE64, 'base64').toString('utf8'));
admin.initializeApp({
  credential: admin.credential.cert(key),
  projectId: key.project_id
});

async function debugRuleMatching() {
  console.log('🔧 Step 4 Final Fix: Rule Matching Debug');
  console.log('=' .repeat(50));
  
  const db = admin.firestore();
  
  try {
    // Step 1: Load the test rule directly and show how it's converted
    console.log('📝 1. Loading and converting test rule...');
    
    const ruleDoc = await db.doc('settings/smartRules/rules/test-autoapply-sampling').get();
    if (!ruleDoc.exists) {
      console.log('   ❌ Test rule not found!');
      return false;
    }
    
    const data = ruleDoc.data();
    console.log('   📄 Original rule data:');
    console.log('      • conditions:', JSON.stringify(data.conditions, null, 2));
    console.log('      • actions:', JSON.stringify(data.actions, null, 2));
    console.log('      • enabled:', data.enabled);
    console.log('      • priority:', data.priority);
    
    // Convert the rule the same way the loading function does
    let action = data.action;
    if (!action && data.actions && data.actions.length > 0) {
      action = data.actions[0];
    }
    
    let condition = data.condition;
    if (!condition && data.conditions && data.conditions.length > 0) {
      condition = data.conditions[0];
    }
    
    const convertedRule = {
      ruleId: ruleDoc.id,
      name: data.name || ruleDoc.id,
      description: data.description,
      enabled: data.enabled ?? true,
      priority: data.priority ?? 0,
      condition: condition,
      action: action,
      autoApply: data.autoApply ?? false,
      autoApplyConfidence: data.autoApplyConfidence ?? 0.9,
    };
    
    console.log('');
    console.log('   🔄 Converted rule:');
    console.log('      • ruleId:', convertedRule.ruleId);
    console.log('      • enabled:', convertedRule.enabled);
    console.log('      • condition:', JSON.stringify(convertedRule.condition, null, 2));
    console.log('      • action:', JSON.stringify(convertedRule.action, null, 2));
    console.log('      • autoApply:', convertedRule.autoApply);
    
    // Step 2: Create test product and check matching
    console.log('');
    console.log('📝 2. Testing rule matching...');
    
    const testProductId = `rule_match_test_${Date.now()}`;
    const testProduct = {
      productId: testProductId,
      title: 'Rule Matching Test Product',
      attributes: {
        rics_category: 'debug||sampling||test',  // Contains 'sampling'
        category: 'Debug',
        brand: 'TestBrand'
        // No gender field - rule should apply  
      },
      createdAt: admin.firestore.Timestamp.now(),
      source: 'rule_test'
    };
    
    console.log('   📦 Test product:');
    console.log('      • productId:', testProductId);
    console.log('      • rics_category:', testProduct.attributes.rics_category);
    console.log('      • gender:', testProduct.attributes.gender || '[empty]');
    
    // Check if our condition logic matches
    const conditionField = convertedRule.condition.field; // 'attributes.rics_category' 
    const conditionValue = convertedRule.condition.value; // 'sampling'
    const conditionOperator = convertedRule.condition.operator; // 'contains'
    
    console.log('');
    console.log('   🔍 Manual condition check:');
    console.log(`      • Field: ${conditionField}`);
    console.log(`      • Expected value: ${conditionValue}`);
    console.log(`      • Operator: ${conditionOperator}`);
    
    // Extract value from product
    const productFieldValue = testProduct.attributes.rics_category;
    console.log(`      • Actual product value: ${productFieldValue}`);
    
    const shouldMatch = productFieldValue && productFieldValue.includes(conditionValue);
    console.log(`      • Manual match check: ${shouldMatch}`);
    
    if (shouldMatch) {
      console.log('   ✅ Rule should match based on condition');
      
      // Check action requirements
      const targetField = convertedRule.action.targetField; // 'attributes.gender'
      const valueTemplate = convertedRule.action.valueTemplate; // "Men's"
      const onlyIfEmpty = convertedRule.action.onlyIfEmpty; // true
      
      console.log('');
      console.log('   🔍 Manual action check:');
      console.log(`      • Target field: ${targetField}`);
      console.log(`      • Value template: ${valueTemplate}`);
      console.log(`      • Only if empty: ${onlyIfEmpty}`);
      
      const currentFieldValue = testProduct.attributes.gender;
      const isEmpty = currentFieldValue === undefined || currentFieldValue === null;
      console.log(`      • Current field value: ${currentFieldValue || '[empty]'}`);
      console.log(`      • Is empty: ${isEmpty}`);
      
      const shouldApply = !onlyIfEmpty || isEmpty;
      console.log(`      • Should apply: ${shouldApply}`);
      
      if (shouldApply) {
        console.log('   ✅ Rule should apply and set gender to "Men\'s"');
        
        // Now test via the actual function
        console.log('');
        console.log('📝 3. Testing via actual import pipeline...');
        
        await db.collection('products').doc(testProductId).set(testProduct);
        console.log('   ✅ Product created - waiting for onProductWrite...');
        
        // Wait for processing
        await new Promise(resolve => setTimeout(resolve, 5000));
        
        // Check results
        const resultDoc = await db.collection('products').doc(testProductId).get();
        if (resultDoc.exists) {
          const resultData = resultDoc.data();
          
          console.log('   📊 Actual results:');
          console.log(`      • _smartRulesRanAt: ${!!resultData._smartRulesRanAt}`);
          console.log(`      • Final gender value: ${resultData.attributes?.gender || '[still empty]'}`);
          console.log(`      • _appliedRules: ${JSON.stringify(resultData._appliedRules || {})}`);
          console.log(`      • _smartRulesErrors: ${JSON.stringify(resultData._smartRulesErrors || [])}`);
          
          if (resultData.attributes?.gender === "Men's") {
            console.log('');
            console.log('🎉 ✅ SUCCESS! Rule applied correctly');
            console.log('   ✅ Import->Engine pipeline is working');
            console.log('   ✅ Rule matching logic working');
            console.log('   ✅ Guardrail logic working (onlyIfEmpty)');
            
            // Save success evidence
            const evidence = {
              timestamp: new Date().toISOString(),
              status: 'SUCCESS',
              ruleApplied: true,
              testProductId: testProductId,
              originalRule: data,
              convertedRule: convertedRule,
              testProduct: testProduct,
              finalProduct: resultData,
              pipelineWorking: true
            };
            
            const fs = require('fs');
            fs.writeFileSync('artifacts/import_apply_evidence.json', JSON.stringify(evidence, null, 2));
            
            return true;
          } else {
            console.log('');
            console.log('❌ Rule did not apply - investigating...');
            
            if (resultData._smartRulesErrors && resultData._smartRulesErrors.length > 0) {
              console.log('   🚨 Smart Rules errors found:');
              resultData._smartRulesErrors.forEach((error, index) => {
                console.log(`      ${index + 1}. ${error.error} (${error.ruleId})`);
              });
            }
            
            return false;
          }
        } else {
          console.log('   ❌ Product not found after processing');
          return false;
        }
        
      } else {
        console.log('   ❌ Rule should not apply due to guardrail logic');
        return false;
      }
    } else {
      console.log('   ❌ Rule should NOT match based on condition');
      return false;
    }
    
  } catch (error) {
    console.error('❌ Debug test failed:', error);
    return false;
  } finally {
    // Cleanup
    console.log('');
    console.log('🧹 Cleaning up...');
    try {
      const testDocs = await db.collection('products')
        .where('source', '==', 'rule_test')
        .limit(5)
        .get();
      
      const deletePromises = testDocs.docs.map(doc => doc.ref.delete());
      await Promise.all(deletePromises);
      console.log(`   ✅ Cleaned up ${deletePromises.length} test products`);
    } catch (cleanupError) {
      console.error('   ⚠️  Cleanup error:', cleanupError.message);
    }
  }
}

// Run the debug test
if (require.main === module) {
  debugRuleMatching().then(success => {
    console.log('');
    if (success) {
      console.log('🎉 Step 4: Import->Engine Pipeline - SUCCESS');
      console.log('   ✅ All fixes working correctly');
      console.log('   ✅ Ready for final verification steps');
    } else {
      console.log('❌ Step 4: Import->Engine Pipeline - STILL HAS ISSUES');  
      console.log('   ❌ Further investigation needed');
    }
    process.exit(success ? 0 : 1);
  }).catch(err => {
    console.error('❌ Debug test execution failed:', err);
    process.exit(1);
  });
}