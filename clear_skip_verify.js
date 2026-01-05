const admin = require('firebase-admin');
const serviceAccount = require('./service-account.json');

admin.initializeApp({
  credential: admin.credential.cert(serviceAccount),
  storageBucket: 'gs://stage-homer-ropi-2-1.firebasestorage.app'
});

async function clearSkipAndVerify() {
  const db = admin.firestore();
  const productRef = db.collection('products').doc('20-test');
  
  console.log('\n🔄 Clearing _smartRulesSkipUntil timestamp...\n');
  
  // First check current state
  let doc = await productRef.get();
  let data = doc.data();
  console.log('BEFORE:');
  console.log(`  _smartRulesSkipUntil: ${data._smartRulesSkipUntil}`);
  if (data._smartRulesSkipUntil) {
    const skipDate = new Date(data._smartRulesSkipUntil);
    console.log(`  (That's: ${skipDate.toISOString()})`);
  }
  
  // Clear it
  await productRef.update({
    _smartRulesSkipUntil: admin.firestore.FieldValue.delete()
  });
  
  console.log('\n✅ Deleted _smartRulesSkipUntil field\n');
  
  // Verify it's gone
  doc = await productRef.get();
  data = doc.data();
  console.log('AFTER:');
  console.log(`  _smartRulesSkipUntil: ${data._smartRulesSkipUntil || 'DELETED ✅'}`);
  
  console.log('\n📋 Summary:');
  console.log(`  RICS Category: ${data.attributes?.rics_category || data.rics_category || 'NOT FOUND'}`);
  console.log(`  Rules can now run: ${!data._smartRulesSkipUntil ? '✅ YES' : '❌ NO'}`);
  
  process.exit(0);
}

clearSkipAndVerify().catch(err => {
  console.error('Error:', err);
  process.exit(1);
});
