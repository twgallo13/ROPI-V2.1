#!/usr/bin/env node
/**
 * Write Lisa v1.0 version metadata to staging Firestore
 * Creates/updates settings/meta/lisaVersion document
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

// Read the version from .lisa_version.json
const versionPath = __dirname + '/../.lisa_version.json';
if (!fs.existsSync(versionPath)) {
  console.error('Missing .lisa_version.json file');
  process.exit(1);
}

const versionData = JSON.parse(fs.readFileSync(versionPath, 'utf8'));

async function writeVersion() {
  try {
    await db.collection('settings').doc('meta').set({
      lisaVersion: versionData
    }, { merge: true });
    
    console.log('✓ Wrote Lisa version to staging Firestore settings/meta/lisaVersion');
    console.log('Version:', versionData.version);
    console.log('Timestamp:', versionData.timestamp);
    console.log('Commit:', versionData.commit);
    process.exit(0);
  } catch (error) {
    console.error('✗ Failed to write version:', error.message);
    process.exit(1);
  }
}

writeVersion();
