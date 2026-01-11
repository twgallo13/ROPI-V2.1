/**
 * Check production Firestore for existing launchSignups
 * Uses Firebase Admin SDK with environment credentials
 */
import { readFileSync, existsSync } from 'fs';
import { initializeApp, cert, getApps } from 'firebase-admin/app';
import { getFirestore } from 'firebase-admin/firestore';

async function checkProduction() {
  console.log('=== Checking Production Firestore ===\n');
  
  // Check for service account credentials
  const keyPath = process.env.GOOGLE_APPLICATION_CREDENTIALS;
  
  if (!keyPath || !existsSync(keyPath)) {
    console.log('No GOOGLE_APPLICATION_CREDENTIALS found.');
    console.log('Trying to decode from environment...');
    
    // Try to decode from GCP_SA_KEY_BASE64 if available
    const b64Key = process.env.GCP_SA_KEY_BASE64;
    if (b64Key) {
      const keyJson = Buffer.from(b64Key, 'base64').toString('utf8');
      const key = JSON.parse(keyJson);
      
      initializeApp({
        credential: cert(key),
        projectId: 'ropi-bccee',
      });
      console.log('Initialized with decoded credentials.\n');
    } else {
      console.log('No credentials available. Cannot check production.');
      console.log('\nNote: The E2E test failure might be due to:');
      console.log('1. Document already exists (causing update vs create mismatch)');
      console.log('2. Rules deployment propagation delay');
      console.log('3. Different rules version in production vs local\n');
      return;
    }
  } else {
    const key = JSON.parse(readFileSync(keyPath, 'utf8'));
    initializeApp({
      credential: cert(key),
      projectId: 'ropi-bccee',
    });
    console.log('Initialized with GOOGLE_APPLICATION_CREDENTIALS.\n');
  }
  
  const db = getFirestore();
  
  // Check launchSignups collection
  console.log('Checking launchSignups collection...');
  const signupsSnapshot = await db.collection('launchSignups').limit(10).get();
  console.log(`Found ${signupsSnapshot.size} launchSignups documents`);
  
  signupsSnapshot.forEach(doc => {
    console.log(`  - ${doc.id}:`, {
      launchId: doc.data().launchId,
      userUid: doc.data().userUid,
      source: doc.data().source,
      status: doc.data().status,
    });
  });
  
  // Check for specific test document that E2E tries to create
  const testDocId = 'launch_2025_q1_ropi_runner_37d692a11c7a4d592cd66310cc02304825d9813ba4ee5924f6ff57e10058274d';
  const testDoc = await db.collection('launchSignups').doc(testDocId).get();
  
  console.log(`\nTest document ${testDocId.substring(0, 40)}...:`);
  if (testDoc.exists) {
    console.log('  EXISTS! Data:', JSON.stringify(testDoc.data(), null, 2));
    console.log('\n⚠️ This document already exists - the E2E test may be triggering an UPDATE instead of CREATE!');
    console.log('The Firestore rules are different for update vs create.');
  } else {
    console.log('  Does not exist.');
  }
}

checkProduction().catch(err => {
  console.error('Error:', err.message);
});
