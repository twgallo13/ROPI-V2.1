#!/usr/bin/env node

/**
 * Step 3: Import Pipeline Test
 * 
 * Creates a product that matches our test rule and checks if
 * the import pipeline triggers Smart Rules engine correctly.
 */

const admin = require('firebase-admin');

// Initialize Firebase Admin
const key = JSON.parse(Buffer.from(process.env.GCP_SA_KEY_BASE64, 'base64').toString('utf8'));
admin.initializeApp({
  credential: admin.credential.cert(key),
  projectId: key.project_id
});

async function testImportPipeline() {
  console.log('🔍 Step 3: Import Pipeline Engine Test');
  console.log('=' .repeat(50));
  
  const db = admin.firestore();
  const testProductId = `import_test_${Date.now()}`;
  
  try {
    // Create a product that should trigger the test rule
    console.log('📝 1. Creating product that matches test rule...');
    
    const testProduct = {
      productId: testProductId,
      mpn: testProductId,
      title: 'Import Pipeline Test Product',
      attributes: {
        rics_category: 'Apparel||Mens||sampling||Test',  // Contains 'sampling'
        category: 'Apparel',
        brand: 'TestBrand'
        // No gender field - rule should apply
      },
      createdAt: admin.firestore.Timestamp.now(),
      source: 'import_test',
      metadata: {
        importBatch: 'pipeline_test_batch',
        testCase: true
      }
    };
    
    console.log(`   📦 Product ID: ${testProductId}`);
    console.log(`   🏷️  RICS Category: ${testProduct.attributes.rics_category}`);
    console.log(`   👤 Gender field: ${testProduct.attributes.gender || '[empty - rule should apply]'}`);
    
    // Create the product - this should trigger onProductWrite
    await db.collection('products').doc(testProductId).set(testProduct);
    console.log('   ✅ Product created - onProductWrite should trigger');
    
    // Wait a moment for the trigger to fire
    console.log('   ⏱️  Waiting 3 seconds for onProductWrite to process...');
    await new Promise(resolve => setTimeout(resolve, 3000));
    
    // Check if the product was modified by Smart Rules
    console.log('📝 2. Checking if Smart Rules were applied...');
    
    const updatedDoc = await db.collection('products').doc(testProductId).get();
    if (updatedDoc.exists) {
      const updatedData = updatedDoc.data();
      const hasGender = updatedData.attributes?.gender;
      
      console.log(`   📦 Product found: ${updatedDoc.exists}`);
      console.log(`   👤 Gender field after processing: ${hasGender || '[still empty]'}`);
      console.log(`   📊 Expected: "Men's" (from test rule)`);
      
      if (hasGender === "Men's") {
        console.log('   ✅ Smart Rule was applied successfully!');
        
        // Log the evidence
        const evidence = {
          timestamp: new Date().toISOString(),
          testProductId: testProductId,
          originalProduct: testProduct,
          updatedProduct: updatedData,
          ruleApplied: true,
          genderApplied: hasGender,
          ruleWorking: true
        };
        
        const fs = require('fs');
        fs.writeFileSync('artifacts/import_apply_evidence.json', JSON.stringify(evidence, null, 2));
        console.log('   📁 Evidence saved: artifacts/import_apply_evidence.json');
        
      } else {
        console.log('   ❌ Smart Rule was NOT applied');
        console.log('   🔍 This indicates import->engine pipeline issue');
        
        // Log the lack of evidence
        const evidence = {
          timestamp: new Date().toISOString(),
          testProductId: testProductId,
          originalProduct: testProduct,
          updatedProduct: updatedData,
          ruleApplied: false,
          genderApplied: hasGender,
          ruleWorking: false,
          issue: 'Import pipeline not triggering Smart Rules engine'
        };
        
        const fs = require('fs');
        fs.writeFileSync('artifacts/import_apply_evidence.json', JSON.stringify(evidence, null, 2));
      }
    } else {
      console.log('   ❌ Product not found after creation');
    }
    
    // Wait a bit more and check logs
    console.log('📝 3. Checking recent onProductWrite logs...');
    await new Promise(resolve => setTimeout(resolve, 2000));
    
    // Get very recent logs
    const { spawn } = require('child_process');
    const logCheck = spawn('gcloud', [
      'functions', 'logs', 'read', 'onProductWrite',
      '--project=ropi-bccee',
      '--limit=50',
      '--filter', `timestamp>="${new Date(Date.now() - 60000).toISOString()}"`
    ]);
    
    let recentLogs = '';
    logCheck.stdout.on('data', (data) => {
      recentLogs += data.toString();
    });
    
    await new Promise((resolve) => {
      logCheck.on('close', () => {
        // Look for our test product in logs
        const hasOurProduct = recentLogs.includes(testProductId);
        const hasSmartRulesActivity = recentLogs.includes('Smart Rules') || 
                                      recentLogs.includes('smartrule') ||
                                      recentLogs.includes('rule applied');
        
        console.log(`   📋 Our product in logs: ${hasOurProduct}`);
        console.log(`   🧠 Smart Rules activity: ${hasSmartRulesActivity}`);
        
        if (hasOurProduct && hasSmartRulesActivity) {
          console.log('   ✅ Import pipeline triggering engine correctly');
        } else if (hasOurProduct && !hasSmartRulesActivity) {
          console.log('   ❌ Import triggered but engine not called');
        } else {
          console.log('   ❓ No logs found yet (may need more time)');
        }
        
        resolve();
      });
    });
    
    console.log('');
    console.log('📊 STEP 3 VERIFICATION RESULTS');
    console.log('=' .repeat(30));
    
    // Re-check the product one more time
    const finalCheck = await db.collection('products').doc(testProductId).get();
    if (finalCheck.exists) {
      const finalData = finalCheck.data();
      const finalGender = finalData.attributes?.gender;
      
      if (finalGender === "Men's") {
        console.log('🎉 ✅ IMPORT PIPELINE WORKING');
        console.log('   ✅ onProductWrite trigger fires');
        console.log('   ✅ Smart Rules engine evaluates product');
        console.log('   ✅ Test rule correctly applied');
        console.log('   ✅ Gender set to "Men\'s" as expected');
        console.log('   ✅ Import-time Smart Rules execution confirmed');
        
        return true;
      } else {
        console.log('❌ ❌ IMPORT PIPELINE ISSUES DETECTED');
        console.log('   ❌ Smart Rules not applied during import');
        console.log('   🔍 Likely causes:');
        console.log('      • onProductWrite not calling Smart Rules engine');
        console.log('      • Engine validation rejecting rule');
        console.log('      • Guardrail logic blocking application incorrectly');
        console.log('      • Product ID vs MPN mapping issue');
        
        return false;
      }
    }
    
    return false;
    
  } catch (error) {
    console.error('❌ Step 3 test failed:', error);
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

// Run the test
if (require.main === module) {
  testImportPipeline().then(success => {
    console.log('');
    if (success) {
      console.log('🎉 Step 3: Import Pipeline Test - SUCCESS');
      console.log('   ✅ Import triggers engine correctly');
      console.log('   ✅ Smart Rules apply during import-time');
    } else {
      console.log('❌ Step 3: Import Pipeline Test - FAILED'); 
      console.log('   ❌ Import->engine pipeline needs fixing');
    }
    process.exit(success ? 0 : 1);
  }).catch(err => {
    console.error('❌ Test execution failed:', err);
    process.exit(1);
  });
}