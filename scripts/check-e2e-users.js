#!/usr/bin/env node

/**
 * Check E2E Test Users in Firebase Auth
 * 
 * Verifies the three test users exist and have correct properties:
 * - theo@shiekh.com (admin with custom claim: role=admin, emailVerified: true)
 * - user@shiekh.com (regular verified user, emailVerified: true)
 * - unverified@shiekh.com (email NOT verified, emailVerified: false)
 * 
 * Usage:
 *   node scripts/check-e2e-users.js
 */

const https = require('https');
const { exec } = require('child_process');
const { promisify } = require('util');

const execAsync = promisify(exec);

const PROJECT_ID = 'ropi-bccee';

const EXPECTED_USERS = [
  {
    email: 'theo@shiekh.com',
    expectedEmailVerified: true,
    expectedRole: 'admin',
  },
  {
    email: 'user@shiekh.com',
    expectedEmailVerified: true,
    expectedRole: null,
  },
  {
    email: 'unverified@shiekh.com',
    expectedEmailVerified: false,
    expectedRole: null,
  },
];

/**
 * Get access token from gcloud
 */
async function getAccessToken() {
  try {
    const { stdout } = await execAsync('gcloud auth print-access-token');
    return stdout.trim();
  } catch (error) {
    console.error('❌ Failed to get access token.');
    console.error('   Run: gcloud auth application-default login');
    throw new Error(`Failed to get access token: ${error.message}`);
  }
}

/**
 * Look up user by email via Identity Toolkit API
 */
async function getUserByEmail(email, accessToken) {
  return new Promise((resolve, reject) => {
    const postData = JSON.stringify({ email: [email] });
    
    const options = {
      hostname: 'identitytoolkit.googleapis.com',
      port: 443,
      path: `/v1/projects/${PROJECT_ID}/accounts:lookup`,
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${accessToken}`,
        'Content-Type': 'application/json',
        'Content-Length': Buffer.byteLength(postData),
        'x-goog-user-project': PROJECT_ID,
      },
    };
    
    const req = https.request(options, (res) => {
      let data = '';
      res.on('data', chunk => data += chunk);
      res.on('end', () => {
        try {
          const result = JSON.parse(data);
          if (result.users && result.users.length > 0) {
            resolve(result.users[0]);
          } else {
            resolve(null);
          }
        } catch (e) {
          reject(new Error(`Failed to parse response: ${data}`));
        }
      });
    });
    
    req.on('error', reject);
    req.write(postData);
    req.end();
  });
}

/**
 * Main function
 */
async function main() {
  console.log('🔍 Checking E2E Test Users in Firebase Auth\n');
  console.log(`   Project: ${PROJECT_ID}\n`);
  
  const accessToken = await getAccessToken();
  console.log('✅ Got access token\n');
  
  let allPassed = true;
  
  for (const expected of EXPECTED_USERS) {
    console.log(`📧 ${expected.email}`);
    
    try {
      const user = await getUserByEmail(expected.email, accessToken);
      
      if (!user) {
        console.log(`   ❌ User NOT FOUND\n`);
        allPassed = false;
        continue;
      }
      
      console.log(`   ✅ User exists`);
      console.log(`   └─ localId: ${user.localId}`);
      console.log(`   └─ displayName: ${user.displayName || '(not set)'}`);
      console.log(`   └─ emailVerified: ${user.emailVerified || false}`);
      
      // Check emailVerified
      const actualVerified = user.emailVerified || false;
      if (actualVerified !== expected.expectedEmailVerified) {
        console.log(`   ❌ MISMATCH: emailVerified is ${actualVerified}, expected ${expected.expectedEmailVerified}`);
        allPassed = false;
      } else {
        console.log(`   ✅ emailVerified matches expected (${expected.expectedEmailVerified})`);
      }
      
      // Check custom claims (if admin expected)
      if (user.customAttributes) {
        try {
          const claims = JSON.parse(user.customAttributes);
          console.log(`   └─ customClaims: ${JSON.stringify(claims)}`);
          
          if (expected.expectedRole === 'admin') {
            if (claims.role === 'admin') {
              console.log(`   ✅ Admin role is set`);
            } else {
              console.log(`   ❌ MISMATCH: Expected admin role, got ${claims.role}`);
              allPassed = false;
            }
          }
        } catch {
          console.log(`   └─ customClaims: (unable to parse)`);
        }
      } else if (expected.expectedRole === 'admin') {
        console.log(`   ❌ MISMATCH: Expected admin role, but no custom claims set`);
        allPassed = false;
      }
      
      console.log('');
    } catch (error) {
      console.log(`   ❌ Error: ${error.message}\n`);
      allPassed = false;
    }
  }
  
  console.log('─'.repeat(50));
  if (allPassed) {
    console.log('✅ All E2E test users are correctly configured!');
  } else {
    console.log('❌ Some E2E test users need attention.');
    console.log('\nTo fix unverified user emailVerified=false:');
    console.log('  1. Go to Firebase Console > Authentication > Users');
    console.log('  2. Find unverified@shiekh.com');
    console.log('  3. Delete and recreate with emailVerified: false');
    console.log('  Or use: node scripts/create-e2e-test-users.js --update-unverified');
    process.exit(1);
  }
}

main().catch(console.error);
