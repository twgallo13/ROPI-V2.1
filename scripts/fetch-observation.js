#!/usr/bin/env node
/**
 * Fetch a single observation document from Firestore
 * 
 * Usage: node scripts/fetch-observation.js <docId>
 * 
 * Lisa LP-1.0.4
 */

const admin = require('firebase-admin');

const docId = process.argv[2];

if (!docId) {
  console.error('Usage: node scripts/fetch-observation.js <docId>');
  process.exit(1);
}

if (!admin.apps.length) {
  admin.initializeApp({
    credential: admin.credential.applicationDefault()
  });
}

const db = admin.firestore();

async function fetchObservation(id) {
  try {
    const doc = await db.collection('observations').doc(id).get();
    
    if (!doc.exists) {
      console.error(`Document ${id} not found`);
      process.exit(2);
    }
    
    const data = doc.data();
    // Add document ID to output for reference
    const output = {
      _docId: id,
      _fetchedAt: new Date().toISOString(),
      ...data
    };
    
    console.log(JSON.stringify(output, null, 2));
  } catch (err) {
    console.error('Error fetching document:', err.message);
    process.exit(1);
  }
}

fetchObservation(docId);
