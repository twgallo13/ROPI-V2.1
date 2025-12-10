#!/usr/bin/env node
/**
 * Ensure User Profile Documents Exist
 * 
 * Creates minimal profile documents for Firebase Auth users that are
 * missing users/profiles/<uid>/data in Firestore.
 * 
 * Uses set(..., { merge: true }) to avoid overwriting existing data.
 * Sets safe default role: 'viewer' if missing.
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
  log('Ensure All User Profile Documents Exist', colors.bright + colors.cyan);
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
  let createdProfiles = 0;
  let updatedProfiles = 0;
  const results = [];
  
  do {
    const listResult = await admin.auth().listUsers(1000, nextPageToken);
    
    for (const user of listResult.users) {
      totalUsers++;
      const uid = user.uid;
      const email = user.email || null;
      
      const docRef = db.doc(`users/profiles/${uid}/data`);
      const snap = await docRef.get();
      
      if (!snap.exists) {
        // Create new profile document
        const payload = {
          displayName: user.displayName || (email ? email.split('@')[0] : 'user'),
          email,
          role: 'viewer', // Safe default
          emailVerified: user.emailVerified || false,
          createdAt: admin.firestore.FieldValue.serverTimestamp(),
          updatedAt: admin.firestore.FieldValue.serverTimestamp(),
          source: 'ensure-profile-docs',
        };
        
        await docRef.set(payload, { merge: true });
        createdProfiles++;
        
        log(`✅ Created profile: ${email || uid}`, colors.green);
        log(`   UID: ${uid}`, colors.reset);
        log(`   Role: viewer (default)`, colors.cyan);
        
        results.push({
          uid,
          email,
          action: 'created',
        });
      } else {
        // Check if role exists, add if missing
        const data = snap.data() || {};
        
        if (!data.role) {
          await docRef.set({ 
            role: 'viewer',
            updatedAt: admin.firestore.FieldValue.serverTimestamp(),
          }, { merge: true });
          updatedProfiles++;
          
          log(`🔧 Added default role: ${email || uid}`, colors.yellow);
          log(`   UID: ${uid}`, colors.reset);
          
          results.push({
            uid,
            email,
            action: 'updated-role',
          });
        }
      }
    }
    
    nextPageToken = listResult.pageToken;
  } while (nextPageToken);
  
  // Summary
  log('\n' + '='.repeat(60), colors.bright);
  log('REPAIR SUMMARY', colors.bright + colors.cyan);
  log('='.repeat(60) + '\n', colors.bright);
  
  log(`Total Auth users: ${totalUsers}`, colors.cyan);
  log(`Profiles created: ${createdProfiles}`, createdProfiles > 0 ? colors.green : colors.reset);
  log(`Profiles updated (role added): ${updatedProfiles}`, updatedProfiles > 0 ? colors.yellow : colors.reset);
  
  if (results.length > 0) {
    log('\n📋 Actions Taken:', colors.cyan);
    for (const result of results) {
      const actionText = result.action === 'created' ? 'Created' : 'Updated';
      log(`  ${actionText}: ${result.email || 'No email'} (${result.uid})`, colors.green);
    }
  } else {
    log('\n✅ No repairs needed - all profiles exist with roles!', colors.green);
  }
  
  log('\n✅ Profile repair complete!', colors.bright + colors.green);
  
  process.exit(0);
}

main().catch(error => {
  log('\n❌ Error:', colors.red);
  console.error(error);
  process.exit(1);
});
