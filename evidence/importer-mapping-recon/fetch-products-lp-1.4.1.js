/**
 * LP-1.4.1 Evidence Collection Script
 * Fetches products from Firestore to verify field shapes
 */
const admin = require('firebase-admin');
const path = require('path');
const serviceAccount = require(path.resolve(__dirname, '../../service-account.json'));

admin.initializeApp({
  credential: admin.credential.cert(serviceAccount)
});

const db = admin.firestore();

async function run() {
  const skus = ['211737-90h1-8', '451-9204-BLK18'];
  
  for (const sku of skus) {
    console.log('\n=== Product ' + sku + ' ===');
    const doc = await db.collection('products').doc(sku).get();
    if (!doc.exists) {
      console.log('NOT FOUND');
      continue;
    }
    const data = doc.data();
    console.log(JSON.stringify(data, null, 2));
  }
}

run().then(function() { process.exit(0); }).catch(function(e) { console.error(e); process.exit(1); });
