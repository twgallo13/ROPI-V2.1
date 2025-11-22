#!/usr/bin/env node
/**
 * Fetch Firestore settings/meta/lisaVersion document
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

async function fetchLisaVersion() {
  try {
    const docRef = db.collection('settings').doc('meta').collection('meta').doc('lisaVersion');
    const snapshot = await docRef.get();
    
    if (!snapshot.exists) {
      console.error('lisaVersion document not found at settings/meta/meta/lisaVersion');
      // Try alternate path
      const altDocRef = db.collection('settings').doc('lisaVersion');
      const altSnapshot = await altDocRef.get();
      
      if (!altSnapshot.exists) {
        console.log(JSON.stringify({
          error: "Document not found",
          paths_tried: ["settings/meta/meta/lisaVersion", "settings/lisaVersion"],
          note: "lisaVersion may not be stored in Firestore yet"
        }, null, 2));
        process.exit(0);
      } else {
        console.log(JSON.stringify(altSnapshot.data(), null, 2));
        process.exit(0);
      }
    }
    
    const data = snapshot.data();
    console.log(JSON.stringify(data, null, 2));
    process.exit(0);
  } catch (error) {
    console.error('Failed to fetch document:', error.message);
    process.exit(1);
  }
}

fetchLisaVersion();
