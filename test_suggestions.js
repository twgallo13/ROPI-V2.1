const admin = require('firebase-admin');
const serviceAccount = require('./service-account.json');

admin.initializeApp({
  credential: admin.credential.cert(serviceAccount),
  storageBucket: 'gs://stage-homer-ropi-2-1.firebasestorage.app'
});

const db = admin.firestore();

async function testSuggestions() {
  console.log('\n🧪 Testing Smart Rules Suggestions\n');
  
  const productRef = db.collection('products').doc('20-test');
  
  // Trigger an update
  await productRef.update({
    _testTrigger: admin.firestore.FieldValue.serverTimestamp(),
    _smartRulesSkipUntil: admin.firestore.FieldValue.delete()
  });
  
  console.log('✅ Triggered Smart Rules evaluation');
  console.log('\nWaiting 5 seconds...\n');
  
  await new Promise(resolve => setTimeout(resolve, 5000));
  
  // Check product metadata
  const doc = await productRef.get();
  const product = doc.data();
  
  console.log('📊 Product Metadata:\n');
  console.log(`Rules Evaluated: ${product._smartRulesEvaluated || 0}`);
  console.log(`Applied Rules: ${Object.keys(product._appliedRules || {}).join(', ')}`);
  console.log(`Suggestions Made: ${product._smartRulesSuggestions?.length || 0}`);
  
  if (product._smartRulesSuggestions && Array.isArray(product._smartRulesSuggestions)) {
    console.log(`\nSuggestions Details:`);
    product._smartRulesSuggestions.forEach(sugg => {
      console.log(`  - ${sugg.targetField}: ${sugg.value} (Rule: ${sugg.ruleName})`);
    });
  }
  
  // Check dimension attributes
  console.log(`\nDimension Attributes:`);
  console.log(`  weight: ${product.attributes?.weight || 'NOT SET'}`);
  console.log(`  height: ${product.attributes?.height || 'NOT SET'}`);
  console.log(`  length: ${product.attributes?.length || 'NOT SET'}`);
  console.log(`  width: ${product.attributes?.width || 'NOT SET'}`);
  
  process.exit(0);
}

testSuggestions().catch(err => {
  console.error('Error:', err);
  process.exit(1);
});
