#!/usr/bin/env node
/**
 * Create or Update E2E Test Users in Firebase Auth
 * 
 * This script creates or updates E2E test accounts in the staging Firebase project.
 * It reads email addresses from packages/web/.env.e2e.example and uses passwords
 * from environment variables (GitHub secrets in CI).
 * 
 * Required Environment Variables:
 * - E2E_ADMIN_PASSWORD: Password for admin user (theo@shiekh.com)
 * - E2E_USER_PASSWORD: Password for regular user (user@shiekh.com)
 * - E2E_UNVERIFIED_PASSWORD: Password for unverified user (unverified@shiekh.com)
 * 
 * Service Account:
 * - Expects service-account.json in the current directory
 *   (written from SERVICE_ACCOUNT_JSON secret in CI)
 * 
 * Version: aoss.v0.6.9
 */

const admin = require('firebase-admin');
const fs = require('fs');
const path = require('path');

// ANSI color codes for output
const colors = {
  reset: '\x1b[0m',
  green: '\x1b[32m',
  yellow: '\x1b[33m',
  red: '\x1b[31m',
  blue: '\x1b[34m',
};

function log(message, color = 'reset') {
  console.log(`${colors[color]}${message}${colors.reset}`);
}

function parseEnvFile(filePath) {
  const content = fs.readFileSync(filePath, 'utf-8');
  const env = {};
  
  content.split('\n').forEach(line => {
    const match = line.match(/^([^#=]+)=(.*)$/);
    if (match) {
      const key = match[1].trim();
      const value = match[2].trim();
      env[key] = value;
    }
  });
  
  return env;
}

async function createOrUpdateUser(auth, email, password, emailVerified, displayName) {
  try {
    // Check if user exists
    let user;
    try {
      user = await auth.getUserByEmail(email);
      
      // Update existing user
      await auth.updateUser(user.uid, {
        password,
        emailVerified,
        displayName,
      });
      
      log(`✓ Updated user ${email} (emailVerified: ${emailVerified})`, 'green');
      return { uid: user.uid, action: 'updated' };
    } catch (error) {
      if (error.code === 'auth/user-not-found') {
        // Create new user
        user = await auth.createUser({
          email,
          password,
          emailVerified,
          displayName,
        });
        
        log(`✓ Created user ${email} (emailVerified: ${emailVerified})`, 'blue');
        return { uid: user.uid, action: 'created' };
      } else {
        throw error;
      }
    }
  } catch (error) {
    log(`✗ Error processing user ${email}: ${error.message}`, 'red');
    throw error;
  }
}

async function setAdminClaim(auth, uid, email) {
  try {
    await auth.setCustomUserClaims(uid, { role: 'admin' });
    log(`✓ Set admin claim for ${email}`, 'green');
    return true;
  } catch (error) {
    log(`✗ Error setting admin claim for ${email}: ${error.message}`, 'red');
    throw error;
  }
}

async function getClaims(auth, uid, email) {
  try {
    const user = await auth.getUser(uid);
    return user.customClaims || {};
  } catch (error) {
    log(`✗ Error getting claims for ${email}: ${error.message}`, 'red');
    return null;
  }
}

async function main() {
  log('\n🔧 Firebase E2E User Setup (aoss.v0.6.9)', 'blue');
  log('========================================\n', 'blue');
  
  // Validate service account file exists
  const serviceAccountPath = path.join(process.cwd(), 'service-account.json');
  if (!fs.existsSync(serviceAccountPath)) {
    log('✗ No valid service account secret available', 'red');
    log('  Expected: service-account.json in current directory', 'yellow');
    process.exit(1);
  }
  
  // Read E2E email addresses from .env.e2e.example
  const envExamplePath = path.join(__dirname, '..', 'packages', 'web', '.env.e2e.example');
  if (!fs.existsSync(envExamplePath)) {
    log('✗ Cannot find packages/web/.env.e2e.example', 'red');
    process.exit(1);
  }
  
  const envVars = parseEnvFile(envExamplePath);
  const adminEmail = envVars.VITE_E2E_ADMIN_EMAIL;
  const userEmail = envVars.VITE_E2E_USER_EMAIL;
  const unverifiedEmail = envVars.VITE_E2E_UNVERIFIED_EMAIL;
  
  // Additional Theo address from requirements
  const theoOrgEmail = 'theo@shiekhshoes.org';
  
  log('📧 E2E User Emails:', 'blue');
  log(`   Admin: ${adminEmail}`, 'reset');
  log(`   Admin (alt): ${theoOrgEmail}`, 'reset');
  log(`   User: ${userEmail}`, 'reset');
  log(`   Unverified: ${unverifiedEmail}\n`, 'reset');
  
  // Validate password environment variables
  const missingSecrets = [];
  if (!process.env.E2E_ADMIN_PASSWORD) missingSecrets.push('E2E_ADMIN_PASSWORD');
  if (!process.env.E2E_USER_PASSWORD) missingSecrets.push('E2E_USER_PASSWORD');
  if (!process.env.E2E_UNVERIFIED_PASSWORD) missingSecrets.push('E2E_UNVERIFIED_PASSWORD');
  
  if (missingSecrets.length > 0) {
    log('✗ Missing required password secrets:', 'red');
    missingSecrets.forEach(secret => log(`  - ${secret}`, 'yellow'));
    process.exit(1);
  }
  
  // Initialize Firebase Admin
  try {
    const serviceAccount = JSON.parse(fs.readFileSync(serviceAccountPath, 'utf-8'));
    admin.initializeApp({
      credential: admin.credential.cert(serviceAccount),
      projectId: serviceAccount.project_id,
    });
    log(`✓ Initialized Firebase Admin SDK (project: ${serviceAccount.project_id})\n`, 'green');
  } catch (error) {
    log(`✗ Failed to initialize Firebase Admin: ${error.message}`, 'red');
    process.exit(1);
  }
  
  const auth = admin.auth();
  const results = {};
  
  try {
    log('👥 Creating/Updating Users...', 'blue');
    log('─────────────────────────────\n', 'blue');
    
    // Create/update admin user (theo@shiekh.com)
    const admin1 = await createOrUpdateUser(
      auth,
      adminEmail,
      process.env.E2E_ADMIN_PASSWORD,
      true,
      'Theo (E2E Admin)'
    );
    results[adminEmail] = { ...admin1, isAdmin: false };
    
    // Create/update second admin user (theo@shiekhshoes.org)
    const admin2 = await createOrUpdateUser(
      auth,
      theoOrgEmail,
      process.env.E2E_ADMIN_PASSWORD,
      true,
      'Theo Org (E2E Admin)'
    );
    results[theoOrgEmail] = { ...admin2, isAdmin: false };
    
    // Create/update regular user
    const user = await createOrUpdateUser(
      auth,
      userEmail,
      process.env.E2E_USER_PASSWORD,
      true,
      'Test User (E2E)'
    );
    results[userEmail] = { ...user, isAdmin: false };
    
    // Create/update unverified user
    const unverified = await createOrUpdateUser(
      auth,
      unverifiedEmail,
      process.env.E2E_UNVERIFIED_PASSWORD,
      false,
      'Unverified User (E2E)'
    );
    results[unverifiedEmail] = { ...unverified, isAdmin: false };
    
    log('\n🔐 Setting Admin Claims...', 'blue');
    log('──────────────────────────\n', 'blue');
    
    // Set admin claims for both Theo addresses
    await setAdminClaim(auth, admin1.uid, adminEmail);
    results[adminEmail].isAdmin = true;
    
    await setAdminClaim(auth, admin2.uid, theoOrgEmail);
    results[theoOrgEmail].isAdmin = true;
    
    log('\n📋 Verifying Claims...', 'blue');
    log('─────────────────────\n', 'blue');
    
    // Get and display claims for admin users
    const claims1 = await getClaims(auth, admin1.uid, adminEmail);
    log(`${adminEmail}:`, 'reset');
    log(`  Claims: ${JSON.stringify(claims1)}`, 'reset');
    
    const claims2 = await getClaims(auth, admin2.uid, theoOrgEmail);
    log(`${theoOrgEmail}:`, 'reset');
    log(`  Claims: ${JSON.stringify(claims2)}\n`, 'reset');
    
    // Summary
    log('✅ Summary', 'green');
    log('═══════════════════════════════════════', 'green');
    Object.entries(results).forEach(([email, data]) => {
      const action = data.action === 'created' ? '➕ Created' : '🔄 Updated';
      const admin = data.isAdmin ? '(admin claim set)' : '';
      log(`${action}: ${email} ${admin}`, 'green');
    });
    
    log('\n✅ All E2E users successfully configured!', 'green');
    process.exit(0);
    
  } catch (error) {
    log(`\n✗ Fatal error: ${error.message}`, 'red');
    if (error.stack) {
      log(`\nStack trace:\n${error.stack}`, 'yellow');
    }
    process.exit(1);
  }
}

// Run the script
if (require.main === module) {
  main().catch(error => {
    console.error('Unhandled error:', error);
    process.exit(1);
  });
}

module.exports = { createOrUpdateUser, setAdminClaim, getClaims };
