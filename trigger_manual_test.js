const admin = require('firebase-admin');
const serviceAccount = require('./service-account.json');

admin.initializeApp({
  credential: admin.credential.cert(serviceAccount),
  storageBucket: 'gs://stage-homer-ropi-2-1.firebasestorage.app'
});

const db = admin.firestore();

async function triggerRulesManually() {
  console.log('\n🚀 Manually Triggering Smart Rules Evaluation\n');
  
  const productRef = db.collection('products').doc('20-test');
  
  // Force a product update to trigger onProductWrite
  // Just update a metadata field to cause Smart Rules to run
  await productRef.update({
    _lastManualTrigger: admin.firestore.FieldValue.serverTimestamp(),
    _smartRulesSkipUntil: admin.firestore.FieldValue.delete()
  });
  
  console.log('✅ Updated product to trigger Smart Rules evaluation');
  console.log('\nWaiting 5 seconds for Cloud Functions to process...\n');
  
  await new Promise(resolve => setTimeout(resolve, 5000));
  
  // Check results
  const doc = await productRef.get();
  const product = doc.data();
  
  console.log('📊 Results:\n');
  console.log(`Shipping Dimensions:`);
  console.log(`  - weight: ${product.attributes?.weight || 'NOT SET'}`);
  console.log(`  - height: ${product.attributes?.height || 'NOT SET'}`);
  console.log(`  - length: ${product.attributes?.length || 'NOT SET'}`);
  console.log(`  - width: ${product.attributes?.width || 'NOT SET'}`);
  
  const appliedRules = product._appliedRules || {};
  const dimensionRules = ['weight', 'height', 'length', 'width'].filter(field => appliedRules[field]);
  
  console.log(`\nApplied Rules: ${Object.keys(appliedRules).join(', ')}`);
  console.log(`Dimension Rules Applied: ${dimensionRules.join(', ') || 'NONE'}`);
  
  if (dimensionRules.length === 4) {
    console.log(`\n✅ SUCCESS! All 4 shipping dimension rules applied!`);
  } else if (dimensionRules.length > 0) {
    console.log(`\n⚠️  PARTIAL: Only ${dimensionRules.length}/4 rules applied`);
  } else {
    console.log(`\n❌ Rules did not apply - check logs`);
  }
  
  process.exit(0);
}

triggerRulesManually().catch(err => {
  console.error('Error:', err);
  process.exit(1);
});
