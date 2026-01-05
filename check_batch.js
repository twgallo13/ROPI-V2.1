const admin = require('firebase-admin');

admin.initializeApp();
const db = admin.firestore();

async function checkBatch() {
  const batchId = 'ca7add68-ab36-4083-a528-54b5bac88190';
  
  // Get batch
  const batchDoc = await db.collection('import_batches').doc(batchId).get();
  if (!batchDoc.exists) {
    console.log('❌ Batch not found');
    return;
  }
  
  const batch = batchDoc.data();
  console.log('\n📦 Import Batch:', batchId);
  console.log('Status:', batch.status);
  console.log('Total rows:', batch.totalRows);
  console.log('Processed:', batch.processedCount);
  console.log('Created:', batch.createdCount);
  console.log('Updated:', batch.updatedCount);
  console.log('Blocked:', batch.blockedCount);
  console.log('Errors:', batch.errorCount);
  
  if (batch.smartRulesStats) {
    console.log('\n🎯 Smart Rules Stats:');
    console.log('Processed:', batch.smartRulesStats.processedCount);
    console.log('Auto-applied:', batch.smartRulesStats.autoAppliedCount);
    console.log('Suggestions:', batch.smartRulesStats.suggestionsCount);
    console.log('Conflicts:', batch.smartRulesStats.conflictsCount);
  }
  
  // Get rows
  const rowsSnap = await db.collection('import_batches')
    .doc(batchId)
    .collection('rows')
    .get();
  
  console.log('\n📋 Import Rows:', rowsSnap.size);
  
  // Check each row for Smart Rules data
  for (const rowDoc of rowsSnap.docs) {
    const row = rowDoc.data();
    console.log(`\n  Row: ${row.mpn || 'unknown'}`);
    console.log(`  Status: ${row.status}`);
    console.log(`  Product ID: ${row.productId || 'none'}`);
    
    if (row.smartRulesResult) {
      console.log('  Smart Rules Result:');
      console.log('    Auto-applied:', row.smartRulesResult.autoApplied?.length || 0);
      console.log('    Suggestions:', row.smartRulesResult.suggestions?.length || 0);
      console.log('    Conflicts:', row.smartRulesResult.conflicts?.length || 0);
    } else {
      console.log('  ⚠️  No Smart Rules result');
    }
  }
  
  // Check products
  console.log('\n\n🔍 Checking Products:');
  const productIds = rowsSnap.docs
    .map(doc => doc.data().productId)
    .filter(Boolean);
  
  for (const productId of productIds) {
    const productDoc = await db.collection('products').doc(productId).get();
    if (!productDoc.exists) continue;
    
    const product = productDoc.data();
    console.log(`\n  Product: ${product.mpn}`);
    console.log(`  Age Group: ${product.attributes?.age_group || 'NOT SET'}`);
    console.log(`  RICS Category: ${product.attributes?.rics_category || 'NOT SET'}`);
    
    if (product._appliedRules) {
      console.log('  Applied Rules:');
      Object.entries(product._appliedRules).forEach(([field, rule]) => {
        console.log(`    ${field}: ${rule.ruleId}`);
      });
    } else {
      console.log('  ⚠️  No applied rules');
    }
    
    if (product._smartRulesRanAt) {
      console.log(`  Smart Rules ran at: ${product._smartRulesRanAt}`);
    }
  }
}

checkBatch().then(() => process.exit(0)).catch(console.error);
