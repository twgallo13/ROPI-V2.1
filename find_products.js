const admin = require('firebase-admin');
const serviceAccount = require('./service-account.json');

if (!admin.apps.length) {
  admin.initializeApp({ credential: admin.credential.cert(serviceAccount) });
}
const db = admin.firestore();

async function findProducts() {
  const products = await db.collection('products').limit(5).get();
  products.forEach(doc => {
    const data = doc.data();
    console.log(`Product ID: ${doc.id}, MPN: ${data.mpn || 'N/A'}`);
  });
  process.exit(0);
}

findProducts().catch(console.error);
