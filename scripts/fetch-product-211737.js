#!/usr/bin/env node
/**
 * LP-1.3.9: Fetch product 211737-90h1-8 from Firestore
 */
const admin = require('firebase-admin');
const fs = require('fs');
const serviceAccount = require('../service-account.json');

admin.initializeApp({ credential: admin.credential.cert(serviceAccount) });
const db = admin.firestore();

async function getProduct() {
  const doc = await db.collection('products').doc('211737-90h1-8').get();
  if (!doc.exists) {
    console.error('Product 211737-90h1-8 NOT FOUND');
    process.exit(1);
  }
  const data = doc.data();
  const snapshot = {
    _docId: doc.id,
    _capturedAt: new Date().toISOString(),
    _note: 'LP-1.3.9 verification - raw Firestore doc for MPN 211737-90h1-8',
    ...data
  };
  console.log(JSON.stringify(snapshot, null, 2));
}

getProduct().then(() => process.exit(0)).catch(e => { console.error(e); process.exit(1); });
