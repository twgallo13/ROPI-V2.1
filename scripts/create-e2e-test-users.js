#!/usr/bin/env node

/**
 * Create E2E Test Users in Firebase Auth
 * 
 * Creates the three test users required for E2E testing:
 * - theo@shiekh.com (admin with custom claim: role=admin)
 * - user@shiekh.com (regular verified user)
 * - unverified@shiekh.com (email not verified)
 * 
 * Usage:
 *   node scripts/create-e2e-test-users.js <admin_password> <user_password> <unverified_password>
 * 
 * Requirements:
 *   - gcloud CLI authenticated: gcloud auth application-default login
 *   - Access to Firebase project: ropi-bccee
 * 
 * After running this script:
 *   1. Add the passwords to GitHub secrets:
 *      gh secret set E2E_ADMIN_PASSWORD --body "<admin_password>"
 *      gh secret set E2E_USER_PASSWORD --body "<user_password>"
 *      gh secret set E2E_UNVERIFIED_PASSWORD --body "<unverified_password>"
 *   2. Run set-admin-custom-claim.js to set the admin role:
 *      node scripts/set-admin-custom-claim.js theo@shiekh.com
 * 
 * Related:
 *   - packages/web/.env.e2e.example: Local E2E config
 *   - .github/workflows/e2e-tests.yml: CI E2E workflow
 *   - PROMPT_018C_vC: E2E testing infrastructure
 */

const https = require('https');
const { exec } = require('child_process');
const { promisify } = require('util');

const execAsync = promisify(exec);

// Config
const PROJECT_ID = 'ropi-bccee';

// Test users to create
const TEST_USERS = [
  {
    email: 'theo@shiekh.com',
    displayName: 'Test Admin',
    emailVerified: true,
    role: 'admin', // Will need separate set-admin-custom-claim.js run
  },
  {
    email: 'user@shiekh.com',
    displayName: 'Test User',
    emailVerified: true,
    role: null,
  },
  {
    email: 'unverified@shiekh.com',
    displayName: 'Test Unverified',
    emailVerified: false,
    role: null,
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
 * Create a user in Firebase Auth via REST API
 */
async function createUser(user, password, accessToken) {
  return new Promise((resolve, reject) => {
    const postData = JSON.stringify({
      email: user.email,
      password: password,
      displayName: user.displayName,
      emailVerified: user.emailVerified,
    });

    const options = {
      hostname: 'identitytoolkit.googleapis.com',
      path: `/v1/projects/${PROJECT_ID}/accounts`,
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${accessToken}`,
        'Content-Type': 'application/json',
        'Content-Length': Buffer.byteLength(postData),
      },
    };

    const req = https.request(options, (res) => {
      let data = '';

      res.on('data', (chunk) => {
        data += chunk;
      });

      res.on('end', () => {
        const result = JSON.parse(data);
        if (res.statusCode === 200) {
          resolve({ success: true, uid: result.localId });
        } else if (result.error?.message?.includes('EMAIL_EXISTS')) {
          resolve({ success: false, exists: true, message: 'User already exists' });
        } else {
          reject(new Error(`Failed to create user: ${res.statusCode} ${data}`));
        }
      });
    });

    req.on('error', (error) => {
      reject(error);
    });

    req.write(postData);
    req.end();
  });
}

/**
 * Set custom claims on a user (for admin role)
 */
async function setCustomClaims(uid, customClaims, accessToken) {
  return new Promise((resolve, reject) => {
    const postData = JSON.stringify({
      localId: uid,
      customAttributes: JSON.stringify(customClaims),
    });

    const options = {
      hostname: 'identitytoolkit.googleapis.com',
      path: `/v1/projects/${PROJECT_ID}/accounts:update`,
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${accessToken}`,
        'Content-Type': 'application/json',
        'Content-Length': Buffer.byteLength(postData),
      },
    };

    const req = https.request(options, (res) => {
      let data = '';

      res.on('data', (chunk) => {
        data += chunk;
      });

      res.on('end', () => {
        if (res.statusCode === 200) {
          resolve({ success: true });
        } else {
          reject(new Error(`Failed to set custom claims: ${res.statusCode} ${data}`));
        }
      });
    });

    req.on('error', (error) => {
      reject(error);
    });

    req.write(postData);
    req.end();
  });
}

/**
 * Lookup user by email to get UID (for existing users)
 */
async function getUserByEmail(email, accessToken) {
  return new Promise((resolve, reject) => {
    const postData = JSON.stringify({
      email: [email],
    });

    const options = {
      hostname: 'identitytoolkit.googleapis.com',
      path: `/v1/projects/${PROJECT_ID}/accounts:lookup`,
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${accessToken}`,
        'Content-Type': 'application/json',
        'Content-Length': Buffer.byteLength(postData),
      },
    };

    const req = https.request(options, (res) => {
      let data = '';

      res.on('data', (chunk) => {
        data += chunk;
      });

      res.on('end', () => {
        if (res.statusCode === 200) {
          const result = JSON.parse(data);
          if (result.users && result.users.length > 0) {
            resolve({ found: true, uid: result.users[0].localId });
          } else {
            resolve({ found: false });
          }
        } else {
          reject(new Error(`Failed to lookup user: ${res.statusCode} ${data}`));
        }
      });
    });

    req.on('error', (error) => {
      reject(error);
    });

    req.write(postData);
    req.end();
  });
}

async function main() {
  const args = process.argv.slice(2);
  
  if (args.length !== 3) {
    console.log(`
╔═══════════════════════════════════════════════════════════════════════════════╗
║  CREATE E2E TEST USERS FOR ROPI AOSS                                          ║
╠═══════════════════════════════════════════════════════════════════════════════╣
║                                                                               ║
║  Usage:                                                                       ║
║    node scripts/create-e2e-test-users.js <admin_pw> <user_pw> <unverified_pw> ║
║                                                                               ║
║  Example:                                                                     ║
║    node scripts/create-e2e-test-users.js "SecureP@ss1!" "SecureP@ss2!" "SecureP@ss3!"
║                                                                               ║
║  This script will create:                                                     ║
║    • theo@shiekh.com (admin, emailVerified: true, role: admin)                ║
║    • user@shiekh.com (regular user, emailVerified: true)                      ║
║    • unverified@shiekh.com (unverified, emailVerified: false)                 ║
║                                                                               ║
║  Prerequisites:                                                               ║
║    • gcloud auth application-default login                                    ║
║    • Access to Firebase project: ropi-bccee                                   ║
║                                                                               ║
╚═══════════════════════════════════════════════════════════════════════════════╝
`);
    process.exit(1);
  }

  const passwords = {
    'theo@shiekh.com': args[0],
    'user@shiekh.com': args[1],
    'unverified@shiekh.com': args[2],
  };

  console.log('═══════════════════════════════════════════════════════════════════');
  console.log('  CREATE E2E TEST USERS FOR ROPI AOSS');
  console.log('  Firebase Project: ropi-bccee');
  console.log('═══════════════════════════════════════════════════════════════════');
  console.log();

  let accessToken;
  try {
    console.log('→ Getting access token from gcloud...');
    accessToken = await getAccessToken();
    console.log('✓ Access token acquired');
  } catch (error) {
    console.error('✗ Failed to get access token');
    console.error('  Run: gcloud auth application-default login');
    process.exit(1);
  }

  let adminUid = null;
  const results = [];

  for (const user of TEST_USERS) {
    console.log();
    console.log(`→ Processing: ${user.email}`);
    console.log(`  Display Name: ${user.displayName}`);
    console.log(`  Email Verified: ${user.emailVerified}`);
    
    try {
      const result = await createUser(user, passwords[user.email], accessToken);
      
      if (result.success) {
        console.log(`✓ Created user: ${user.email} (UID: ${result.uid})`);
        results.push({ email: user.email, status: 'created', uid: result.uid });
        
        if (user.role === 'admin') {
          adminUid = result.uid;
        }
      } else if (result.exists) {
        console.log(`⚠ User already exists: ${user.email}`);
        
        // Look up the existing user's UID
        const lookup = await getUserByEmail(user.email, accessToken);
        if (lookup.found) {
          results.push({ email: user.email, status: 'exists', uid: lookup.uid });
          if (user.role === 'admin') {
            adminUid = lookup.uid;
          }
        } else {
          results.push({ email: user.email, status: 'exists', uid: 'unknown' });
        }
      }
    } catch (error) {
      console.error(`✗ Failed to create user ${user.email}: ${error.message}`);
      results.push({ email: user.email, status: 'error', error: error.message });
    }
  }

  // Set admin custom claim
  if (adminUid) {
    console.log();
    console.log(`→ Setting admin custom claim for theo@shiekh.com (UID: ${adminUid})`);
    try {
      await setCustomClaims(adminUid, { role: 'admin' }, accessToken);
      console.log('✓ Admin custom claim set: { role: "admin" }');
    } catch (error) {
      console.error(`✗ Failed to set admin claim: ${error.message}`);
      console.log('  You may need to run: node scripts/set-admin-custom-claim.js theo@shiekh.com');
    }
  }

  // Summary
  console.log();
  console.log('═══════════════════════════════════════════════════════════════════');
  console.log('  SUMMARY');
  console.log('═══════════════════════════════════════════════════════════════════');
  
  for (const result of results) {
    const icon = result.status === 'created' ? '✓' : result.status === 'exists' ? '⚠' : '✗';
    console.log(`  ${icon} ${result.email}: ${result.status}${result.uid ? ` (UID: ${result.uid})` : ''}`);
  }

  console.log();
  console.log('═══════════════════════════════════════════════════════════════════');
  console.log('  NEXT STEPS');
  console.log('═══════════════════════════════════════════════════════════════════');
  console.log();
  console.log('  1. Add passwords to GitHub secrets:');
  console.log();
  console.log(`     gh secret set E2E_ADMIN_PASSWORD --body "${args[0]}"`);
  console.log(`     gh secret set E2E_USER_PASSWORD --body "${args[1]}"`);
  console.log(`     gh secret set E2E_UNVERIFIED_PASSWORD --body "${args[2]}"`);
  console.log();
  console.log('  2. Trigger E2E workflow to verify:');
  console.log();
  console.log('     gh workflow run e2e-tests.yml');
  console.log();
  console.log('═══════════════════════════════════════════════════════════════════');
}

main().catch((error) => {
  console.error('Fatal error:', error.message);
  process.exit(1);
});
