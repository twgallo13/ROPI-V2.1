#!/usr/bin/env node
/**
 * Find Missing User Profile Documents
 * 
 * Scans all Firebase Auth users and identifies those missing the
 * users/profiles/<uid>/data Firestore document.
 * 
 * This helps diagnose 500 errors when updating user attributes.
 * 
 * Tag: fix/api/user-profile-create-or-merge
 */

const admin = require('firebase-admin');
const path = require('path');

// ANSI colors
const colors = {
  reset: '\x1b[0m',
  red: '\x1b[31m',
  green: '\x1b[32m',
  yellow: '\x1b[33m',
  cyan: '\x1b[36m',
  bright: '\x1b[1m',
};

function log(message, color = colors.reset) {
  console.log(`${color}${message}${colors.reset}`);
}

async function main() {
  log('\n' + '='.repeat(60), colors.bright);
  log('Scan for Missing User Profile Documents', colors.bright + colors.cyan);
  log('='.repeat(60) + '\n', colors.bright);
  
  // Initialize Firebase Admin SDK
  const serviceAccountPath = path.join(__dirname, '..', 'service-account.json');
  const serviceAccount = require(serviceAccountPath);
  
  admin.initializeApp({
    credential: admin.credential.cert(serviceAccount),
  });
  
  const db = admin.firestore();
  
  log(`✅ Connected to Firebase project: ${serviceAccount.project_id}\n`, colors.green);
  
  let nextPageToken;
  let totalUsers = 0;
  let missingProfiles = [];
  
  do {
    const listResult = await admin.auth().listUsers(1000, nextPageToken);
    
    for (const user of listResult.users) {
      totalUsers++;
      const uid = user.uid;
      const email = user.email || null;
      
      const docRef = db.doc(`users/profiles/${uid}/data`);
      const snap = await docRef.get();
      
      if (!snap.exists) {
        missingProfiles.push({
          uid,
          email,
          displayName: user.displayName,
        });
        log(`❌ MISSING: ${email || uid}`, colors.red);
        log(`   UID: ${uid}`, colors.reset);
      }
    }
    
    nextPageToken = listResult.pageToken;
  } while (nextPageToken);
  
  // Summary
  log('\n' + '='.repeat(60), colors.bright);
  log('SCAN SUMMARY', colors.bright + colors.cyan);
  log('='.repeat(60) + '\n', colors.bright);
  
  log(`Total Auth users: ${totalUsers}`, colors.cyan);
  log(`Missing profile docs: ${missingProfiles.length}`, missingProfiles.length > 0 ? colors.red : colors.green);
  
  if (missingProfiles.length > 0) {
    log('\n📋 Missing Profiles:', colors.yellow);
    for (const profile of missingProfiles) {
      log(`  - ${profile.email || 'No email'} (${profile.uid})`, colors.yellow);
    }
  } else {
    log('\n✅ All users have profile documents!', colors.green);
  }
  
  process.exit(0);
}

main().catch(error => {
  log('\n❌ Error:', colors.red);
  console.error(error);
  process.exit(1);
});
