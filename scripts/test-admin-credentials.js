#!/usr/bin/env node

/**
 * Test Admin Credentials
 * 
 * Tests if the admin credentials work by attempting to sign in
 * and provides troubleshooting steps if they don't.
 * 
 * Usage:
 *   VITE_E2E_ADMIN_PASSWORD="password" node scripts/test-admin-credentials.js
 */

const https = require('https');

const PROJECT_ID = 'ropi-bccee';
const ADMIN_EMAIL = process.env.VITE_E2E_ADMIN_EMAIL || 'theo@shiekh.com';
const FIREBASE_API_KEY = 'AIzaSyD1aYB4AfqU5n1YfSOtLX5nbEYbnlTfcZ8';

// List of passwords to try
const PASSWORDS_TO_TRY = [
  process.env.VITE_E2E_ADMIN_PASSWORD,
  'RopiE2E-Admin!...',
  'RopiE2E-Admin!2024',
  'RopiE2E-Admin!2025',
  'test-password-123',
].filter(Boolean);

function httpsRequest(options, data = null) {
  return new Promise((resolve, reject) => {
    const req = https.request(options, (res) => {
      let body = '';
      res.on('data', (chunk) => { body += chunk; });
      res.on('end', () => {
        try {
          const result = body ? JSON.parse(body) : {};
          resolve({ status: res.statusCode, body: result });
        } catch (error) {
          reject(new Error(`Failed to parse response: ${error.message}`));
        }
      });
    });
    req.on('error', (error) => { reject(error); });
    if (data) req.write(data);
    req.end();
  });
}

async function trySignIn(email, password, attempt = 1) {
  const data = JSON.stringify({
    email,
    password,
    returnSecureToken: true,
  });

  const options = {
    hostname: 'identitytoolkit.googleapis.com',
    path: `/v1/accounts:signInWithPassword?key=${FIREBASE_API_KEY}`,
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Content-Length': data.length,
    },
  };

  try {
    const response = await httpsRequest(options, data);
    if (response.status === 200) {
      return { success: true, token: response.body.idToken, password };
    }
    return { 
      success: false, 
      error: response.body.error?.message || 'Unknown error',
      password 
    };
  } catch (error) {
    return { success: false, error: error.message, password };
  }
}

async function main() {
  console.log(`\n🔍 Testing Admin Credentials`);
  console.log(`Project: ${PROJECT_ID}`);
  console.log(`Email: ${ADMIN_EMAIL}`);
  console.log(`API Key: ${FIREBASE_API_KEY.substring(0, 15)}...\n`);
  
  if (PASSWORDS_TO_TRY.length === 0) {
    console.log(`⚠️  No passwords to try. Set VITE_E2E_ADMIN_PASSWORD environment variable.\n`);
    process.exit(1);
  }
  
  console.log(`Testing ${PASSWORDS_TO_TRY.length} password(s)...\n`);
  
  for (let i = 0; i < PASSWORDS_TO_TRY.length; i++) {
    const pwd = PASSWORDS_TO_TRY[i];
    const masked = pwd.substring(0, 3) + '*'.repeat(Math.max(0, pwd.length - 6)) + pwd.substring(Math.max(3, pwd.length - 3));
    
    console.log(`[${i + 1}/${PASSWORDS_TO_TRY.length}] Trying password: ${masked}`);
    const result = await trySignIn(ADMIN_EMAIL, pwd, i + 1);
    
    if (result.success) {
      console.log(`✅ SUCCESS! This password works!\n`);
      console.log(`${'='.repeat(80)}`);
      console.log(`Working Credentials:`);
      console.log(`  Email: ${ADMIN_EMAIL}`);
      console.log(`  Password: ${result.password}`);
      console.log(`${'='.repeat(80)}\n`);
      
      console.log(`To update GitHub secret, run:`);
      console.log(`  gh secret set E2E_ADMIN_PASSWORD --body "${result.password}" --repo twgallo13/ROPI-V2.1\n`);
      
      console.log(`Or export for local use:`);
      console.log(`  export VITE_E2E_ADMIN_PASSWORD="${result.password}"\n`);
      
      console.log(`ID Token (first 50 chars):`);
      console.log(`  ${result.token.substring(0, 50)}...\n`);
      
      process.exit(0);
    } else {
      console.log(`   ❌ Failed: ${result.error}\n`);
    }
  }
  
  console.log(`\n${'='.repeat(80)}`);
  console.log(`❌ All passwords failed!`);
  console.log(`${'='.repeat(80)}\n`);
  
  console.log(`Troubleshooting steps:\n`);
  console.log(`1. Reset password using Firebase Admin script:`);
  console.log(`   gcloud auth application-default login`);
  console.log(`   gcloud config set project ropi-bccee`);
  console.log(`   NEW_ADMIN_PASSWORD="YourNewPassword123!" node scripts/fix-admin-user.js\n`);
  
  console.log(`2. Or manually via Firebase Console:`);
  console.log(`   https://console.firebase.google.com/project/ropi-bccee/authentication/users`);
  console.log(`   - Find theo@shiekh.com`);
  console.log(`   - Click overflow menu (⋮) → Reset password\n`);
  
  console.log(`3. Or create a new admin user for testing:`);
  console.log(`   - Go to Firebase Console → Authentication`);
  console.log(`   - Add user with email and password`);
  console.log(`   - Use Cloud Functions or Admin SDK to set custom claims\n`);
  
  process.exit(1);
}

main();
