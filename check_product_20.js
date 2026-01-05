const admin = require('firebase-admin');
const serviceAccount = require('./service-account.json');

admin.initializeApp({
  credential: admin.credential.cert(serviceAccount),
  storageBucket: 'gs://stage-homer-ropi-2-1.firebasestorage.app'
});

admin.firestore().collection('products').doc('20-test').get()
  .then(doc => {
    if (!doc.exists) {
      console.log('Product 20-test not found');
      process.exit(1);
    }
    const data = doc.data();
    
    console.log('\n📦 Product 20-test Full Data:\n');
    console.log('Key fields:');
    console.log(`  id: ${data.id}`);
    console.log(`  title: ${data.title}`);
    console.log(`  rics_category: ${data.rics_category}`);
    console.log(`  brand: ${data.brand}`);
    console.log(`  attributes: ${JSON.stringify(data.attributes, null, 2)}`);
    console.log(`  _appliedRules: ${JSON.stringify(data._appliedRules)}`);
    console.log(`  _smartRulesSkipUntil: ${data._smartRulesSkipUntil}`);
    console.log(`  _smartRulesRanAt: ${JSON.stringify(data._smartRulesRanAt)}`);
    
    process.exit(0);
  })
  .catch(err => {
    console.error('Error:', err);
    process.exit(1);
  });
