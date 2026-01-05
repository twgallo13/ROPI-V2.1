const admin = require('firebase-admin');

admin.initializeApp();
const db = admin.firestore();

async function checkBatchDetailed() {
  const batchId = 'ca7add68-ab36-4083-a528-54b5bac88190';
  
  const batchDoc = await db.collection('import_batches').doc(batchId).get();
  if (!batchDoc.exists) {
    console.log('❌ Batch not found');
    return;
  }
  
  const batch = batchDoc.data();
  console.log('\n📦 Import Batch Full Data:');
  console.log(JSON.stringify(batch, null, 2));
  
  console.log('\n\n📋 Import Rows:');
  const rowsSnap = await db.collection('import_batches')
    .doc(batchId)
    .collection('rows')
    .get();
  
  console.log(`Found ${rowsSnap.size} rows\n`);
  
  rowsSnap.forEach(doc => {
    console.log(`\n--- Row ${doc.id} ---`);
    console.log(JSON.stringify(doc.data(), null, 2));
  });
}

checkBatchDetailed().then(() => process.exit(0)).catch(console.error);
