#!/usr/bin/env node
/**
 * Fetch Firestore document snapshot for XTEST-456 (or MISSING-MPN)
 */

const admin = require('firebase-admin');
const fs = require('fs');

const saPath = process.env.GOOGLE_APPLICATION_CREDENTIALS || '/secrets/staging-service-account.json';
if (!fs.existsSync(saPath)) {
  console.error('Missing staging service account JSON at', saPath);
  process.exit(1);
}

const serviceAccount = require(saPath);
admin.initializeApp({ credential: admin.credential.cert(serviceAccount) });
const db = admin.firestore();

async function fetchDoc() {
  try {
    // The doc ID is based on MPN with slashes replaced
    const docId = '_M_I_S_S_I_N_G_-_M_P_N_'; // This is what was created
    const docRef = db.collection('products_v2').doc(docId);
    const snapshot = await docRef.get();
    
    if (!snapshot.exists) {
      console.error('Document not found:', docId);
      process.exit(1);
    }
    
    const data = snapshot.data();
    console.log(JSON.stringify(data, null, 2));
    process.exit(0);
  } catch (error) {
    console.error('Failed to fetch document:', error.message);
    process.exit(1);
  }
}

fetchDoc();
