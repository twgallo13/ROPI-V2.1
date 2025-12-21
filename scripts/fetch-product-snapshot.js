#!/usr/bin/env node
/**
 * Fetch a product snapshot from Firestore
 * Usage: node scripts/fetch-product-snapshot.js <MPN>
 */
const admin = require('firebase-admin');
const serviceAccount = require('../service-account.json');

if (!admin.apps.length) {
  admin.initializeApp({
    credential: admin.credential.cert(serviceAccount)
  });
}

const db = admin.firestore();
const mpn = process.argv[2];

if (!mpn) {
  console.error('Usage: node scripts/fetch-product-snapshot.js <MPN>');
  process.exit(1);
}

async function fetchProduct() {
  console.error(`Fetching product: ${mpn}`);
  
  const doc = await db.collection('products').doc(mpn).get();
  
  if (!doc.exists) {
    console.error(`Product ${mpn} not found`);
    process.exit(1);
  }
  
  const data = doc.data();
  const snapshot = {
    id: doc.id,
    mpn: data.mpn || doc.id,
    attributes: data.attributes || {},
    _meta: data._meta || {},
    brand: data.brand || '',
    category: data.category || '',
    status: data.status || '',
    websites: data.websites || [],
    fetchedAt: new Date().toISOString()
  };
  
  console.log(JSON.stringify(snapshot, null, 2));
}

fetchProduct()
  .then(() => process.exit(0))
  .catch(err => {
    console.error('Error:', err);
    process.exit(1);
  });
