#!/usr/bin/env node
/**
 * Verify settings/meta/lisaVersion exists in staging Firestore
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

async function verifyVersion() {
  try {
    const docRef = db.collection('settings').doc('meta');
    const snapshot = await docRef.get();
    
    if (!snapshot.exists) {
      console.error('✗ settings/meta document does not exist in staging Firestore');
      process.exit(1);
    }
    
    const data = snapshot.data();
    
    if (!data.lisaVersion) {
      console.error('✗ lisaVersion field does not exist in settings/meta');
      console.log('Document data:', JSON.stringify(data, null, 2));
      process.exit(1);
    }
    
    console.log('✓ settings/meta/lisaVersion exists in staging Firestore');
    console.log('\nVersion metadata:');
    console.log(JSON.stringify(data.lisaVersion, null, 2));
    
    if (data.lisaVersion.version === 'v1.0') {
      console.log('\n✓ Confirmed: version = "v1.0"');
      process.exit(0);
    } else {
      console.log(`\n✗ Version mismatch: expected "v1.0", found "${data.lisaVersion.version}"`);
      process.exit(1);
    }
  } catch (error) {
    console.error('✗ Failed to verify version:', error.message);
    process.exit(1);
  }
}

verifyVersion();
