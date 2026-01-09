#!/usr/bin/env node
/**
 * Fetch completion rules from Firestore
 */

const admin = require('firebase-admin');
const fs = require('fs');
const path = require('path');

// Initialize Firebase Admin with service account
const serviceAccount = require('../../../service-account.json');

admin.initializeApp({
  credential: admin.credential.cert(serviceAccount),
  projectId: 'ropi-bccee'
});

const db = admin.firestore();

async function fetchCompletionRules() {
  try {
    console.log('Fetching settings/exportSettings...');
    const docRef = db.doc('settings/exportSettings');
    const snapshot = await docRef.get();
    
    if (!snapshot.exists) {
      console.error('ERROR: settings/exportSettings document not found');
      process.exit(1);
    }
    
    const data = snapshot.data();
    const rules = data.completionRules;
    
    if (!rules) {
      console.error('ERROR: completionRules field missing');
      process.exit(1);
    }
    
    // Save to file
    const outputPath = path.join(__dirname, 'completionRules.json');
    fs.writeFileSync(outputPath, JSON.stringify(rules, null, 2));
    
    console.log(`✅ Saved completion rules to: ${outputPath}`);
    console.log(`   rulesVersion: ${rules.rulesVersion}`);
    console.log(`   segments: ${rules.segments?.length || 0}`);
    
    process.exit(0);
  } catch (error) {
    console.error('ERROR fetching rules:', error);
    process.exit(1);
  }
}

fetchCompletionRules();
