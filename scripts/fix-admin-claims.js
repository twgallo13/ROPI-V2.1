#!/usr/bin/env node
/**
 * Fix Admin Claims Script
 * 
 * Sets admin claims for specific users and ensures emailVerified is true.
 * Fixes the 403 "Admin role required" errors by setting proper custom claims.
 * 
 * Usage:
 *   1. Set admin claim by email:
 *      node scripts/fix-admin-claims.js --email theo@shiekh.com
 *   
 *   2. Set admin claim by UID:
 *      node scripts/fix-admin-claims.js --uid <USER_UID>
 *   
 *   3. Set admin for multiple emails:
 *      node scripts/fix-admin-claims.js --emails theo@shiekh.com,theo@shiekhshoes.org
 * 
 * Tag: lisa.auth-debug.v0.1.0
 */

const admin = require('firebase-admin');
const fs = require('fs');
const path = require('path');

// ANSI colors for console output
const colors = {
  reset: '\x1b[0m',
  bright: '\x1b[1m',
  red: '\x1b[31m',
  green: '\x1b[32m',
  yellow: '\x1b[33m',
  blue: '\x1b[34m',
  cyan: '\x1b[36m',
};

function log(message, color = colors.reset) {
  console.log(`${color}${message}${colors.reset}`);
}

function logHeader(title) {
  console.log('\n' + '='.repeat(60));
  log(title, colors.bright + colors.cyan);
  console.log('='.repeat(60) + '\n');
}

function logSection(title) {
  log(`\n${title}`, colors.bright + colors.blue);
  log('-'.repeat(title.length), colors.blue);
}

async function setAdminClaim(uid, email) {
  logHeader(`🔧 Setting Admin Claim for ${email || uid}`);
  
  try {
    // Get current user record
    const userRecord = await admin.auth().getUser(uid);
    
    log('📧 Current User State:', colors.cyan);
    console.log(`  UID: ${userRecord.uid}`);
    console.log(`  Email: ${userRecord.email || 'N/A'}`);
    console.log(`  Email Verified: ${userRecord.emailVerified ? '✅ Yes' : '❌ No'}`);
    console.log(`  Disabled: ${userRecord.disabled ? '❌ Yes' : '✅ No'}`);
    
    log('\n🔐 Current Custom Claims:', colors.cyan);
    if (!userRecord.customClaims || Object.keys(userRecord.customClaims).length === 0) {
      log('  (None)', colors.yellow);
    } else {
      console.log(JSON.stringify(userRecord.customClaims, null, 2));
    }
    
    // Set admin claim
    await admin.auth().setCustomUserClaims(uid, { role: 'admin' });
    log('\n✅ Admin claim set: { role: "admin" }', colors.green);
    
    // Ensure email is verified
    if (!userRecord.emailVerified) {
      await admin.auth().updateUser(uid, { emailVerified: true });
      log('✅ Email verified set to true', colors.green);
    }
    
    // Verify the changes
    const updatedUser = await admin.auth().getUser(uid);
    
    logSection('✅ Updated User State');
    console.log(`  UID: ${updatedUser.uid}`);
    console.log(`  Email: ${updatedUser.email || 'N/A'}`);
    console.log(`  Email Verified: ${updatedUser.emailVerified ? '✅ Yes' : '❌ No'}`);
    console.log(`  Custom Claims:`);
    console.log(JSON.stringify(updatedUser.customClaims, null, 2));
    
    log('\n⚠️  IMPORTANT: User must refresh their token for changes to take effect!', colors.yellow);
    log('In browser console, run:', colors.yellow);
    log('  firebase.auth().currentUser.getIdToken(true).then(t => console.log("Token refreshed"))', colors.cyan);
    
    return updatedUser;
  } catch (error) {
    log('❌ Failed to set admin claim:', colors.red);
    console.error(error);
    throw error;
  }
}

async function setAdminByEmail(email) {
  try {
    log(`🔍 Looking up user by email: ${email}`, colors.cyan);
    const userRecord = await admin.auth().getUserByEmail(email);
    return await setAdminClaim(userRecord.uid, email);
  } catch (error) {
    if (error.code === 'auth/user-not-found') {
      log(`❌ User not found: ${email}`, colors.red);
      log('This user may not exist in Firebase Auth', colors.yellow);
      return null;
    }
    throw error;
  }
}

async function main() {
  // Initialize Firebase Admin SDK
  const serviceAccountPath = path.join(__dirname, '..', 'service-account.json');
  
  if (!fs.existsSync(serviceAccountPath)) {
    log('❌ service-account.json not found', colors.red);
    log('Expected location: /workspaces/ROPI-V2.1/service-account.json', colors.yellow);
    log('\nTo fix: Place your Firebase service account JSON file at the expected location', colors.yellow);
    process.exit(1);
  }
  
  const serviceAccount = require(serviceAccountPath);
  
  admin.initializeApp({
    credential: admin.credential.cert(serviceAccount),
  });
  
  log(`✅ Firebase Admin SDK initialized (project: ${serviceAccount.project_id})`, colors.green);
  
  // Parse command line arguments
  const args = process.argv.slice(2);
  
  if (args.length === 0) {
    log('\n❌ Usage:', colors.red);
    console.log('  By email:    node scripts/fix-admin-claims.js --email theo@shiekh.com');
    console.log('  By UID:      node scripts/fix-admin-claims.js --uid <USER_UID>');
    console.log('  Multiple:    node scripts/fix-admin-claims.js --emails theo@shiekh.com,theo@shiekhshoes.org');
    process.exit(1);
  }
  
  const command = args[0];
  
  if (command === '--email') {
    if (args.length < 2) {
      log('❌ Missing email argument', colors.red);
      process.exit(1);
    }
    await setAdminByEmail(args[1]);
  } else if (command === '--uid') {
    if (args.length < 2) {
      log('❌ Missing UID argument', colors.red);
      process.exit(1);
    }
    await setAdminClaim(args[1]);
  } else if (command === '--emails') {
    if (args.length < 2) {
      log('❌ Missing emails argument', colors.red);
      process.exit(1);
    }
    const emails = args[1].split(',').map(e => e.trim());
    
    logHeader(`🔧 Setting Admin Claims for ${emails.length} Users`);
    
    let successCount = 0;
    let failureCount = 0;
    
    for (const email of emails) {
      try {
        await setAdminByEmail(email);
        successCount++;
      } catch (error) {
        failureCount++;
        log(`❌ Failed for ${email}`, colors.red);
      }
    }
    
    logSection('📊 Summary');
    log(`  ✅ Success: ${successCount}`, colors.green);
    if (failureCount > 0) {
      log(`  ❌ Failures: ${failureCount}`, colors.red);
    }
  } else {
    log('❌ Unknown command', colors.red);
    process.exit(1);
  }
  
  log('\n✅ Done!', colors.green);
}

main().catch(error => {
  log('\n❌ Unexpected error:', colors.red);
  console.error(error);
  process.exit(1);
});
