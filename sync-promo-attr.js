#!/usr/bin/env node
const admin = require('firebase-admin');
const fs = require('fs');
const path = require('path');

if (!admin.apps.length) {
  admin.initializeApp({
    projectId: process.env.FIREBASE_PROJECT_ID || 'ropi-aoss-staging',
  });
}

const db = admin.firestore();

async function syncPromoAttribute() {
  console.log('Syncing promo attribute to boolean...');
  
  const registryPath = path.join(__dirname, 'packages/sdk/config/attributeRegistry.json');
  const registryData = JSON.parse(fs.readFileSync(registryPath, 'utf8'));
  
  const promoAttr = registryData.attributes.find(attr => attr.attribute_id === 'promo');
  
  if (!promoAttr) {
    console.error('Promo attribute not found in registry');
    process.exit(1);
  }
  
  console.log('Registry promo attr:', JSON.stringify(promoAttr, null, 2));
  
  const attrRef = db.collection('attributes').doc('promo');
  await attrRef.set(promoAttr, { merge: true });
  
  console.log('✓ Updated promo attribute in Firestore');
  
  const doc = await attrRef.get();
  console.log('Verified:', JSON.stringify(doc.data(), null, 2));
}

syncPromoAttribute()
  .then(() => process.exit(0))
  .catch((err) => {
    console.error('Error:', err);
    process.exit(1);
  });
