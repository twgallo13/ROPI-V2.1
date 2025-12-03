#!/usr/bin/env node

/**
 * Set Admin Custom Claim via Firebase Auth API
 * 
 * Sets { "role": "admin" } custom claim on a Firebase Auth user.
 * This is the production-ready IAM mechanism for admin detection.
 * 
 * Usage:
 *   node scripts/set-admin-custom-claim.js <user-email-or-uid>
 * 
 * Example:
 *   node scripts/set-admin-custom-claim.js theo@shiekhshoes.org
 *   node scripts/set-admin-custom-claim.js abc123uid456
 * 
 * Requirements:
 *   - gcloud CLI authenticated: gcloud auth login
 *   - Firebase Auth REST API access token
 * 
 * Related:
 *   - PROMPT_018C_vB Spec: Sprint B — IAM via Custom Claims
 *   - Section 9 — Security & IAM: https://www.notion.so/2b845ee1ec5a81739de7fc1743de9a33
 */

const https = require('https');
const { exec } = require('child_process');
const { promisify } = require('util');

const execAsync = promisify(exec);

// Config
const PROJECT_ID = 'ropi-bccee'; // Firebase project
const API_KEY = process.env.FIREBASE_API_KEY || ''; // Optional, for lookupUser by email

/**
 * Get access token from gcloud
 */
async function getAccessToken() {
  try {
    const { stdout } = await execAsync('gcloud auth print-access-token');
    return stdout.trim();
  } catch (error) {
    throw new Error(`Failed to get access token: ${error.message}`);
  }
}

/**
 * Lookup user UID by email (if email is provided)
 */
async function getUserUidByEmail(email, accessToken) {
  return new Promise((resolve, reject) => {
    const postData = JSON.stringify({ email: [email] });
    
    const options = {
      hostname: 'identitytoolkit.googleapis.com',
      path: `/v1/accounts:lookup?key=${API_KEY}`,
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
            resolve(result.users[0].localId);
          } else {
            reject(new Error(`No user found with email: ${email}`));
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

/**
 * Set custom claims on a user
 */
async function setCustomClaims(uid, customClaims, accessToken) {
  return new Promise((resolve, reject) => {
    const postData = JSON.stringify({
      localId: uid,
      customAttributes: JSON.stringify(customClaims),
    });

    const options = {
      hostname: 'identitytoolkit.googleapis.com',
      path: `/v1/projects/${PROJECT_ID}/accounts:update?key=${API_KEY}`,
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
          resolve(JSON.parse(data));
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
 * Main execution
 */
async function main() {
  console.log('================================================================================');
  console.log('SET ADMIN CUSTOM CLAIM');
  console.log('================================================================================\n');

  // Validate arguments
  const userIdentifier = process.argv[2];
  if (!userIdentifier) {
    console.error('❌ Error: Missing user email or UID');
    console.log('\nUsage: node scripts/set-admin-custom-claim.js <user-email-or-uid>');
    console.log('\nExamples:');
    console.log('  node scripts/set-admin-custom-claim.js theo@shiekhshoes.org');
    console.log('  node scripts/set-admin-custom-claim.js abc123uid456\n');
    process.exit(1);
  }

  console.log(`📋 Configuration:`);
  console.log(`   Project: ${PROJECT_ID}`);
  console.log(`   User: ${userIdentifier}`);
  console.log(`   Custom Claim: { "role": "admin" }\n`);

  try {
    // Get access token
    console.log('🔐 Getting access token from gcloud...');
    const accessToken = await getAccessToken();
    console.log('✅ Access token obtained\n');

    // Determine if input is email or UID
    let uid = userIdentifier;
    if (userIdentifier.includes('@')) {
      console.log(`📧 Looking up UID for email: ${userIdentifier}...`);
      
      if (!API_KEY) {
        console.error('❌ Error: FIREBASE_API_KEY environment variable required for email lookup');
        console.log('\nSet it with:');
        console.log('  export FIREBASE_API_KEY=<your-api-key>\n');
        process.exit(1);
      }
      
      uid = await getUserUidByEmail(userIdentifier, accessToken);
      console.log(`✅ Found UID: ${uid}\n`);
    }

    // Set custom claims
    console.log(`⚙️  Setting custom claims on user ${uid}...`);
    const result = await setCustomClaims(uid, { role: 'admin' }, accessToken);
    
    console.log('✅ CUSTOM CLAIMS SET SUCCESSFULLY');
    console.log('================================================================================\n');
    
    console.log('User Details:');
    console.log(`  UID: ${result.localId}`);
    console.log(`  Email: ${result.email || 'N/A'}`);
    console.log(`  Custom Claims: { "role": "admin" }\n`);
    
    console.log('Next Steps:');
    console.log('1. User must sign out and sign back in for claims to take effect');
    console.log('2. Verify in Firebase Console:');
    console.log(`   https://console.firebase.google.com/project/${PROJECT_ID}/authentication/users`);
    console.log('3. Test admin detection by signing in as this user');
    console.log('4. Check browser console for "Admin check" log messages\n');

  } catch (error) {
    console.error('❌ Failed to set custom claims:', error.message);
    console.error('');
    console.error('Troubleshooting:');
    console.error('- Verify gcloud is authenticated: gcloud auth list');
    console.error('- Verify project access: gcloud projects list');
    console.error('- Check user exists in Firebase Auth');
    console.error('- Ensure FIREBASE_API_KEY is set (for email lookup)\n');
    process.exit(1);
  }
}

main();
