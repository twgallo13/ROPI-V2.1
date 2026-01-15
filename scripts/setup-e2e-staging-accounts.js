#!/usr/bin/env node
/**
 * Create/Update E2E Test Accounts for Staging
 * 
 * Creates 3 test accounts with secure passwords:
 * - theo@shiekh.com (admin with custom claim)
 * - user@shiekh.com (regular verified user)
 * - unverified@shiekh.com (unverified user)
 * 
 * Tag: aoss.v0.6.9
 */

const admin = require('firebase-admin');
const crypto = require('crypto');
const fs = require('fs');
const path = require('path');

// ANSI colors
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

function generateSecurePassword(prefix) {
  const random = crypto.randomBytes(8).toString('hex');
  return `${prefix}!${random}#2025`;
}

// Strong generated passwords
const PASSWORDS = {
  admin: generateSecurePassword('RopiE2E-Admin'),
  user: generateSecurePassword('RopiE2E-User'),
  unverified: generateSecurePassword('RopiE2E-Unv'),
};

// User configurations
const USERS = [
  {
    email: 'theo@shiekh.com',
    password: PASSWORDS.admin,
    displayName: 'Theo (Admin E2E)',
    emailVerified: true,
    role: 'admin',
  },
  {
    email: 'user@shiekh.com',
    password: PASSWORDS.user,
    displayName: 'User (E2E)',
    emailVerified: true,
    role: null,
  },
  {
    email: 'unverified@shiekh.com',
    password: PASSWORDS.unverified,
    displayName: 'Unverified (E2E)',
    emailVerified: false,
    role: null,
  },
];

async function createOrUpdateUser(userConfig) {
  const { email, password, displayName, emailVerified, role } = userConfig;
  
  try {
    // Try to get existing user
    const existingUser = await admin.auth().getUserByEmail(email);
    
    log(`  ℹ️  User exists: ${email}`, colors.cyan);
    
    // Update user
    await admin.auth().updateUser(existingUser.uid, {
      password,
      displayName,
      emailVerified,
    });
    
    log(`  ✅ Updated: ${email}`, colors.green);
    log(`     UID: ${existingUser.uid}`, colors.reset);
    log(`     Email Verified: ${emailVerified ? '✅ Yes' : '❌ No'}`, colors.reset);
    
    // Set custom claim if admin
    if (role === 'admin') {
      await admin.auth().setCustomUserClaims(existingUser.uid, { role: 'admin' });
      log(`     Custom Claim: { role: 'admin' } ✅`, colors.green);
      
      // Verify claim was set
      const updatedUser = await admin.auth().getUser(existingUser.uid);
      if (updatedUser.customClaims?.role === 'admin') {
        log(`     Claim Verified: ✅`, colors.green);
      }
    }
    
    return { email, uid: existingUser.uid, action: 'updated', emailVerified, role };
  } catch (error) {
    if (error.code === 'auth/user-not-found') {
      // Create new user
      log(`  ℹ️  Creating new user: ${email}`, colors.cyan);
      
      const newUser = await admin.auth().createUser({
        email,
        password,
        displayName,
        emailVerified,
      });
      
      log(`  ✅ Created: ${email}`, colors.green);
      log(`     UID: ${newUser.uid}`, colors.reset);
      log(`     Email Verified: ${emailVerified ? '✅ Yes' : '❌ No'}`, colors.reset);
      
      // Set custom claim if admin
      if (role === 'admin') {
        await admin.auth().setCustomUserClaims(newUser.uid, { role: 'admin' });
        log(`     Custom Claim: { role: 'admin' } ✅`, colors.green);
      }
      
      return { email, uid: newUser.uid, action: 'created', emailVerified, role };
    }
    throw error;
  }
}

async function main() {
  log('\n' + '='.repeat(60), colors.bright);
  log('E2E Test Accounts Setup (Staging Firebase)', colors.bright + colors.cyan);
  log('='.repeat(60) + '\n', colors.bright);
  
  // Initialize Firebase Admin SDK
  const serviceAccountPath = path.join(__dirname, '..', 'service-account.json');
  
  if (!fs.existsSync(serviceAccountPath)) {
    log('❌ service-account.json not found', colors.red);
    log('Expected location: /workspaces/ROPI-V2.1/service-account.json', colors.yellow);
    process.exit(1);
  }
  
  const serviceAccount = require(serviceAccountPath);
  
  admin.initializeApp({
    credential: admin.credential.cert(serviceAccount),
  });
  
  log(`✅ Firebase Admin SDK initialized`, colors.green);
  log(`   Project: ${serviceAccount.project_id}\n`, colors.cyan);
  
  // Process each user
  const results = [];
  
  for (const userConfig of USERS) {
    log(`\n📧 Processing: ${userConfig.email}`, colors.bright + colors.blue);
    log('-'.repeat(40), colors.blue);
    
    try {
      const result = await createOrUpdateUser(userConfig);
      results.push(result);
    } catch (error) {
      log(`  ❌ Failed: ${error.message}`, colors.red);
      results.push({ email: userConfig.email, error: error.message });
    }
  }
  
  // Summary
  log('\n' + '='.repeat(60), colors.bright);
  log('📊 SUMMARY', colors.bright + colors.cyan);
  log('='.repeat(60) + '\n', colors.bright);
  
  for (const result of results) {
    if (result.error) {
      log(`❌ ${result.email}: ${result.error}`, colors.red);
    } else {
      log(`✅ ${result.email}:`, colors.green);
      log(`   UID: ${result.uid}`, colors.reset);
      log(`   Action: ${result.action}`, colors.reset);
      log(`   Email Verified: ${result.emailVerified ? 'Yes' : 'No'}`, colors.reset);
      if (result.role) {
        log(`   Role: ${result.role} (custom claim set)`, colors.cyan);
      }
    }
  }
  
  // Output passwords for GitHub secrets (DO NOT COMMIT THESE)
  log('\n' + '='.repeat(60), colors.bright);
  log('🔐 PASSWORDS (For GitHub Secrets Only)', colors.bright + colors.yellow);
  log('='.repeat(60), colors.bright);
  log('⚠️  DO NOT COMMIT OR POST PUBLICLY', colors.yellow);
  log('='.repeat(60) + '\n', colors.bright);
  
  console.log('VITE_E2E_ADMIN_PASSWORD=' + PASSWORDS.admin);
  console.log('VITE_E2E_USER_PASSWORD=' + PASSWORDS.user);
  console.log('VITE_E2E_UNVERIFIED_PASSWORD=' + PASSWORDS.unverified);
  
  log('\n✅ Setup complete!', colors.green);
  log('\nNext steps:', colors.bright);
  log('1. Copy passwords above and add to GitHub Actions secrets', colors.yellow);
  log('2. Verify admin user can sign in to preview', colors.yellow);
  log('3. Test admin endpoints return 200 OK', colors.yellow);
}

main().catch(error => {
  log('\n❌ Unexpected error:', colors.red);
  console.error(error);
  process.exit(1);
});
