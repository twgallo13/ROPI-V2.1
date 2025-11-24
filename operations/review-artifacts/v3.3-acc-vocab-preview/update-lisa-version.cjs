#!/usr/bin/env node
const admin = require('firebase-admin');
const path = require('path');

const serviceAccount = require(path.join(__dirname, '../../../service-account.json'));

admin.initializeApp({
  credential: admin.credential.cert(serviceAccount),
});

const db = admin.firestore();

async function updateLisaVersion() {
  try {
    console.log('Updating lisaVersion to v3.3.0...');
    
    await db.doc('settings/meta/lisaVersion/current').set({
      version: 'v3.3.0',
      updatedAt: admin.firestore.FieldValue.serverTimestamp(),
      deployedBy: 'github.copilot',
      deploymentTimestamp: new Date().toISOString(),
      releaseNotes: 'ACC Vocabulary UX & Product-value Preview'
    });
    
    console.log('✅ Successfully updated lisaVersion to v3.3.0');
    process.exit(0);
  } catch (error) {
    console.error('❌ Error updating lisaVersion:', error);
    process.exit(1);
  }
}

updateLisaVersion();
