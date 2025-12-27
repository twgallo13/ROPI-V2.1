#!/usr/bin/env node
/**
 * LP-0.1.x Pre-merge Firestore Ghost Check
 * 
 * Checks for products containing 'shiekhshoes.com' in their websites array.
 * This is a read-only verification to ensure staging Firestore doesn't contain
 * ghost values from previous seed script runs.
 * 
 * Lisa v1.0.1 authorization required before merging LP-0.1.1, LP-0.1.2, LP-0.1.3
 */

const admin = require('firebase-admin');
const fs = require('fs');

// Initialize Firebase Admin
if (!admin.apps.length) {
  const credPath = process.env.GOOGLE_APPLICATION_CREDENTIALS;
  const credBase64 = process.env.GCP_SA_KEY_BASE64;
  
  if (credPath && fs.existsSync(credPath)) {
    const serviceAccount = JSON.parse(fs.readFileSync(credPath, 'utf8'));
    admin.initializeApp({
      credential: admin.credential.cert(serviceAccount),
    });
    console.log(`✅ Initialized with credentials from ${credPath}`);
  } else if (credBase64) {
    const serviceAccount = JSON.parse(Buffer.from(credBase64, 'base64').toString('utf8'));
    admin.initializeApp({
      credential: admin.credential.cert(serviceAccount),
    });
    console.log('✅ Initialized with GCP_SA_KEY_BASE64');
  } else {
    console.error('❌ No credentials found. Set GOOGLE_APPLICATION_CREDENTIALS or GCP_SA_KEY_BASE64');
    process.exit(1);
  }
}

const db = admin.firestore();

async function findGhostValues() {
  console.log('\n─────────────────────────────────────');
  console.log('🔍 LP-0.1.x PRE-MERGE FIRESTORE CHECK');
  console.log('   Searching for: shiekhshoes.com');
  console.log('   Collection: products');
  console.log('   Project: ropi-bccee (staging)');
  console.log('─────────────────────────────────────\n');

  try {
    const snap = await db.collection('products')
      .where('websites', 'array-contains', 'shiekhshoes.com')
      .get();

    console.log(`📊 RESULTS: ${snap.size} matches found\n`);

    if (snap.size === 0) {
      console.log('✅ NO GHOST VALUES FOUND');
      console.log('   Staging Firestore is clean.');
      console.log('   Safe to proceed with LP-0.1.x merges.\n');
      return { matches: 0, docs: [] };
    }

    console.log('⚠️  GHOST VALUES DETECTED');
    console.log('   DO NOT MERGE. Create LP-0.1.4 cleanup.\n');

    const samples = [];
    let count = 0;
    snap.forEach(doc => {
      if (count < 10) {
        const data = doc.data();
        const sample = {
          id: doc.id,
          websites: data.websites || [],
          createdAt: data.createdAt ? data.createdAt.toDate?.() || data.createdAt : 'N/A',
          updatedAt: data.updatedAt ? data.updatedAt.toDate?.() || data.updatedAt : 'N/A',
        };
        samples.push(sample);
        console.log(`   📦 ${doc.id}`);
        console.log(`      websites: [${sample.websites.join(', ')}]`);
        console.log(`      createdAt: ${sample.createdAt}`);
        console.log(`      updatedAt: ${sample.updatedAt}`);
        console.log('');
      }
      count++;
    });

    if (snap.size > 10) {
      console.log(`   ... and ${snap.size - 10} more documents\n`);
    }

    return { matches: snap.size, docs: samples };
  } catch (error) {
    console.error('❌ Firestore query failed:', error.message);
    process.exit(1);
  }
}

findGhostValues()
  .then(result => {
    console.log('─────────────────────────────────────');
    console.log('📋 FIRESTORE GHOST CHECK COMPLETE');
    console.log(`   Total matches: ${result.matches}`);
    console.log(`   Recommendation: ${result.matches === 0 ? 'PROCEED WITH MERGES' : 'CREATE LP-0.1.4 CLEANUP'}`);
    console.log('─────────────────────────────────────\n');
    process.exit(result.matches === 0 ? 0 : 1);
  })
  .catch(error => {
    console.error('❌ Ghost check failed:', error);
    process.exit(1);
  });
