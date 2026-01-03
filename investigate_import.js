const admin = require('firebase-admin');
const serviceAccount = require('./service-account.json');

admin.initializeApp({
  credential: admin.credential.cert(serviceAccount)
});

const db = admin.firestore();
const batchId = '158c4d42-ec04-46a9-9705-5dccf414bbf0';

async function investigateBatch() {
  console.log('=== INVESTIGATING IMPORT BATCH ===');
  console.log('Batch ID:', batchId);
  console.log('');
  
  // Get batch metadata
  const batchDoc = await db.collection('import_batches').doc(batchId).get();
  if (!batchDoc.exists) {
    console.log('❌ Batch not found');
    return;
  }
  
  const batch = batchDoc.data();
  console.log('Batch Metadata:');
  console.log('  Status:', batch.status);
  console.log('  Row Count:', batch.rowCount);
  console.log('  Created Count:', batch.createdCount);
  console.log('  Updated Count:', batch.updatedCount);
  console.log('  Blocked Count:', batch.blockedCount);
  console.log('  Smart Rules Stats:', JSON.stringify(batch.smartRulesStats, null, 2));
  console.log('');
  
  // Get rows
  const rowsSnapshot = await db.collection('import_batches').doc(batchId).collection('rows').get();
  console.log('Row Details (' + rowsSnapshot.size + ' rows):');
  console.log('');
  
  for (const rowDoc of rowsSnapshot.docs) {
    const row = rowDoc.data();
    console.log('Row', row.source.lineNumber + ':', row.source.columns.sku);
    console.log('  Product ID:', row.meta.productId);
    console.log('  Import Outcome:', row.meta.importOutcome);
    console.log('  Validation Errors:', row.validation.errors.length);
    if (row.validation.errors.length > 0) {
      row.validation.errors.forEach(err => {
        console.log('    -', err.message);
      });
    }
    console.log('  Smart Rules Result:', row.meta.smartRulesResult ? 'Yes' : 'No');
    if (row.meta.smartRulesResult) {
      console.log('    Skipped:', row.meta.smartRulesResult.skipped);
      console.log('    Skip Reason:', row.meta.smartRulesResult.skipReason);
      console.log('    Auto Applied:', row.meta.smartRulesResult.autoAppliedCount);
      console.log('    Suggestions:', row.meta.smartRulesResult.suggestionsCount);
    }
    console.log('');
  }
}

investigateBatch().then(() => process.exit(0)).catch(err => { console.error(err); process.exit(1); });
