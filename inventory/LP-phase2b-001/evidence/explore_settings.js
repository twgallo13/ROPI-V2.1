#!/usr/bin/env node
/**
 * Debug: Explore settings/attributes document structure
 */

const admin = require('firebase-admin');

// Reuse existing Firebase Admin instance or initialize if needed
if (!admin.apps.length) {
  const serviceAccount = require('../../../service-account.json');
  admin.initializeApp({
    credential: admin.credential.cert(serviceAccount),
    projectId: 'ropi-bccee'
  });
}

const db = admin.firestore();

async function exploreSettings() {
  try {
    console.log('Fetching settings/attributes...');
    const docRef = db.doc('settings/attributes');
    const snapshot = await docRef.get();
    
    if (!snapshot.exists) {
      console.log('❌ Document does not exist');
      
      // Try to list all documents in settings collection
      console.log('\nListing all documents in settings/ collection:');
      const settingsSnapshot = await db.collection('settings').get();
      settingsSnapshot.forEach(doc => {
        console.log(`  - ${doc.id}`);
      });
      
      process.exit(1);
    }
    
    const data = snapshot.data();
    console.log('\n📄 Document exists! Top-level keys:');
    console.log(Object.keys(data).join(', '));
    
    console.log('\n📋 Full document structure:');
    console.log(JSON.stringify(data, null, 2));
    
    process.exit(0);
  } catch (error) {
    console.error('ERROR:', error);
    process.exit(1);
  }
}

exploreSettings();
