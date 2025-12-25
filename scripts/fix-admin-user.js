#!/usr/bin/env node

/**
 * Fix Admin User for E2E Testing
 * 
 * This script helps manage the admin user (theo@shiekh.com) in Firebase Auth
 * by either resetting the password or creating the user if it doesn't exist.
 * 
 * Usage:
 *   FIREBASE_PROJECT_ID=ropi-bccee node scripts/fix-admin-user.js
 * 
 * Prerequisites:
 *   - Firebase Admin credentials configured (via GOOGLE_APPLICATION_CREDENTIALS or gcloud)
 *   - Or run: gcloud auth application-default login
 */

const admin = require('firebase-admin');

const PROJECT_ID = process.env.FIREBASE_PROJECT_ID || 'ropi-bccee';
const ADMIN_EMAIL = 'theo@shiekh.com';
const NEW_PASSWORD = process.env.NEW_ADMIN_PASSWORD || 'RopiE2E-Admin!2024';

console.log(`\n🔧 Firebase Admin User Fixer`);
console.log(`Project: ${PROJECT_ID}`);
console.log(`Admin Email: ${ADMIN_EMAIL}\n`);

// Initialize Firebase Admin
try {
  admin.initializeApp({
    projectId: PROJECT_ID
  });
  console.log('✅ Firebase Admin initialized\n');
} catch (error) {
  console.error('❌ Failed to initialize Firebase Admin:', error.message);
  console.log('\nMake sure you are authenticated. Try running:');
  console.log('  gcloud auth application-default login');
  console.log('  gcloud config set project ropi-bccee\n');
  process.exit(1);
}

async function fixAdminUser() {
  try {
    const auth = admin.auth();
    
    // Try to get the user first
    console.log(`🔍 Checking if user ${ADMIN_EMAIL} exists...`);
    let user;
    try {
      user = await auth.getUserByEmail(ADMIN_EMAIL);
      console.log(`✅ User found: ${user.uid}`);
      console.log(`   Display Name: ${user.displayName || '(not set)'}`);
      console.log(`   Email Verified: ${user.emailVerified}`);
      console.log(`   Disabled: ${user.disabled}`);
      
      // Update the password
      console.log(`\n🔄 Updating password...`);
      await auth.updateUser(user.uid, {
        password: NEW_PASSWORD,
        emailVerified: true,
        disabled: false
      });
      console.log(`✅ Password updated successfully!`);
      
    } catch (error) {
      if (error.code === 'auth/user-not-found') {
        console.log(`⚠️  User not found. Creating new user...`);
        
        // Create the user
        user = await auth.createUser({
          email: ADMIN_EMAIL,
          password: NEW_PASSWORD,
          emailVerified: true,
          displayName: 'Theo (E2E Admin)',
          disabled: false
        });
        
        console.log(`✅ User created successfully!`);
        console.log(`   UID: ${user.uid}`);
      } else {
        throw error;
      }
    }
    
    // Set custom claims to make them admin
    console.log(`\n🔑 Setting admin custom claims...`);
    await auth.setCustomUserClaims(user.uid, {
      admin: true,
      role: 'admin'
    });
    console.log(`✅ Admin claims set successfully!`);
    
    console.log(`\n${'='.repeat(80)}`);
    console.log(`✅ Admin user is ready!`);
    console.log(`${'='.repeat(80)}`);
    console.log(`\nCredentials for E2E testing:`);
    console.log(`  Email: ${ADMIN_EMAIL}`);
    console.log(`  Password: ${NEW_PASSWORD}`);
    console.log(`\nUpdate your GitHub secret:`);
    console.log(`  gh secret set E2E_ADMIN_PASSWORD --body "${NEW_PASSWORD}" --repo twgallo13/ROPI-V2.1`);
    console.log(`\nOr export for local testing:`);
    console.log(`  export VITE_E2E_ADMIN_PASSWORD="${NEW_PASSWORD}"`);
    console.log();
    
  } catch (error) {
    console.error(`\n❌ Error: ${error.message}`);
    console.error(`Code: ${error.code}`);
    console.error(error);
    process.exit(1);
  } finally {
    // Clean up
    await admin.app().delete();
  }
}

fixAdminUser();
