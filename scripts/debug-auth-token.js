#!/usr/bin/env node
/**
 * Debug Auth Token Script
 * 
 * Verifies Firebase Auth tokens and inspects custom claims.
 * Used to diagnose admin 403 errors and authentication issues.
 * 
 * Usage:
 *   1. Manual token inspection (paste token):
 *      node scripts/debug-auth-token.js <ID_TOKEN>
 *   
 *   2. Generate token for specific user (requires uid):
 *      node scripts/debug-auth-token.js --uid <USER_UID>
 *   
 *   3. List all users with admin claims:
 *      node scripts/debug-auth-token.js --list-admins
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

async function verifyToken(token) {
  logHeader('🔍 Token Verification');
  
  try {
    log(`Token (first 40 chars): ${token.substring(0, 40)}...`, colors.cyan);
    
    const decodedToken = await admin.auth().verifyIdToken(token);
    
    logSection('✅ Token Valid');
    
    log('\n📧 User Information:', colors.green);
    console.log(`  UID: ${decodedToken.uid}`);
    console.log(`  Email: ${decodedToken.email || 'N/A'}`);
    console.log(`  Email Verified: ${decodedToken.email_verified ? '✅ Yes' : '❌ No'}`);
    
    logSection('🔐 Custom Claims');
    
    // Extract custom claims (excluding standard JWT fields)
    const standardClaims = [
      'aud', 'auth_time', 'exp', 'firebase', 'iat', 'iss', 'sub',
      'uid', 'email', 'email_verified', 'user_id'
    ];
    
    const customClaims = Object.entries(decodedToken)
      .filter(([key]) => !standardClaims.includes(key))
      .reduce((acc, [key, value]) => ({ ...acc, [key]: value }), {});
    
    if (Object.keys(customClaims).length === 0) {
      log('  ⚠️  No custom claims found', colors.yellow);
    } else {
      console.log(JSON.stringify(customClaims, null, 2));
    }
    
    // Check for admin role
    const hasAdminClaim = decodedToken.role === 'admin';
    const hasAdminInRoles = Array.isArray(decodedToken.roles) && decodedToken.roles.includes('admin');
    
    logSection('🛡️  Admin Access Check');
    
    if (hasAdminClaim) {
      log('  ✅ Admin role detected: claim.role = "admin"', colors.green);
    } else if (hasAdminInRoles) {
      log('  ✅ Admin role detected: claim.roles includes "admin"', colors.green);
    } else {
      log('  ❌ No admin role found', colors.red);
      log('  Expected: claim.role = "admin" OR "admin" in claim.roles[]', colors.yellow);
    }
    
    // Full decoded token for debugging
    logSection('📄 Full Decoded Token');
    console.log(JSON.stringify(decodedToken, null, 2));
    
    return decodedToken;
  } catch (error) {
    log('❌ Token verification failed:', colors.red);
    console.error(error);
    process.exit(1);
  }
}

async function generateTokenForUser(uid) {
  logHeader('🎫 Generate Token for User');
  
  try {
    log(`Fetching user: ${uid}`, colors.cyan);
    
    // Get user record
    const userRecord = await admin.auth().getUser(uid);
    
    log('\n📧 User Record:', colors.green);
    console.log(`  UID: ${userRecord.uid}`);
    console.log(`  Email: ${userRecord.email || 'N/A'}`);
    console.log(`  Email Verified: ${userRecord.emailVerified ? '✅ Yes' : '❌ No'}`);
    console.log(`  Disabled: ${userRecord.disabled ? '❌ Yes' : '✅ No'}`);
    
    logSection('🔐 Custom Claims');
    
    if (!userRecord.customClaims || Object.keys(userRecord.customClaims).length === 0) {
      log('  ⚠️  No custom claims found', colors.yellow);
    } else {
      console.log(JSON.stringify(userRecord.customClaims, null, 2));
    }
    
    // Generate custom token
    const customToken = await admin.auth().createCustomToken(uid);
    
    logSection('🎫 Generated Custom Token');
    log(`\nCustom Token (first 40 chars): ${customToken.substring(0, 40)}...`, colors.cyan);
    log('\nNote: This is a custom token. The client must exchange it for an ID token:', colors.yellow);
    log('  firebase.auth().signInWithCustomToken(customToken)', colors.yellow);
    
    return userRecord;
  } catch (error) {
    log('❌ Failed to generate token:', colors.red);
    console.error(error);
    process.exit(1);
  }
}

async function listAdminUsers() {
  logHeader('👥 List Users with Admin Claims');
  
  try {
    const listUsersResult = await admin.auth().listUsers(1000);
    
    const adminUsers = listUsersResult.users.filter(user => {
      const claims = user.customClaims || {};
      return claims.role === 'admin' || (Array.isArray(claims.roles) && claims.roles.includes('admin'));
    });
    
    if (adminUsers.length === 0) {
      log('⚠️  No users with admin claims found', colors.yellow);
      return;
    }
    
    log(`Found ${adminUsers.length} admin user(s):\n`, colors.green);
    
    for (const user of adminUsers) {
      console.log('─'.repeat(60));
      console.log(`  UID: ${user.uid}`);
      console.log(`  Email: ${user.email || 'N/A'}`);
      console.log(`  Email Verified: ${user.emailVerified ? '✅ Yes' : '❌ No'}`);
      console.log(`  Disabled: ${user.disabled ? '❌ Yes' : '✅ No'}`);
      console.log(`  Custom Claims:`);
      console.log(JSON.stringify(user.customClaims, null, 4));
      console.log();
    }
    
    return adminUsers;
  } catch (error) {
    log('❌ Failed to list users:', colors.red);
    console.error(error);
    process.exit(1);
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
    console.log('  Verify token:    node scripts/debug-auth-token.js <ID_TOKEN>');
    console.log('  Generate token:  node scripts/debug-auth-token.js --uid <USER_UID>');
    console.log('  List admins:     node scripts/debug-auth-token.js --list-admins');
    process.exit(1);
  }
  
  const command = args[0];
  
  if (command === '--list-admins') {
    await listAdminUsers();
  } else if (command === '--uid') {
    if (args.length < 2) {
      log('❌ Missing UID argument', colors.red);
      log('Usage: node scripts/debug-auth-token.js --uid <USER_UID>', colors.yellow);
      process.exit(1);
    }
    await generateTokenForUser(args[1]);
  } else {
    // Assume it's a token to verify
    await verifyToken(command);
  }
}

main().catch(error => {
  log('\n❌ Unexpected error:', colors.red);
  console.error(error);
  process.exit(1);
});
