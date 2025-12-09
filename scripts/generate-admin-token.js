#!/usr/bin/env node

/**
 * Generate Admin ID Token for Staging Tests
 * 
 * Uses Firebase Admin SDK to create a custom token for theo@shiekh.com (admin)
 * Then exchanges it for an ID token via Firebase REST API
 * 
 * Usage:
 *   node scripts/generate-admin-token.js
 * 
 * Output:
 *   ID Token suitable for use in curl requests
 */

const admin = require('firebase-admin');
const https = require('https');
const { promisify } = require('util');

const PROJECT_ID = 'ropi-bccee';
const ADMIN_EMAIL = 'theo@shiekh.com';

/**
 * Initialize Firebase Admin SDK
 * Uses Application Default Credentials (from gcloud auth or GOOGLE_APPLICATION_CREDENTIALS)
 */
function initializeAdmin() {
  if (!admin.apps.length) {
    admin.initializeApp({
      projectId: PROJECT_ID,
    });
  }
  return admin;
}

/**
 * Create a custom token for the admin user
 */
async function createCustomToken() {
  console.log(`Creating custom token for ${ADMIN_EMAIL}...`);
  
  try {
    const token = await admin.auth().createCustomToken(ADMIN_EMAIL, {
      role: 'admin',
    });
    console.log(`✅ Custom token created`);
    return token;
  } catch (error) {
    throw new Error(`Failed to create custom token: ${error.message}`);
  }
}

/**
 * Exchange custom token for ID token via Firebase REST API
 */
function exchangeCustomTokenForIdToken(customToken) {
  return new Promise((resolve, reject) => {
    const data = JSON.stringify({
      token: customToken,
      returnSecureToken: true,
    });

    const options = {
      hostname: 'identitytoolkit.googleapis.com',
      path: '/v1/accounts:signInWithCustomToken?key=AIzaSyAHhm_1fOxVGJCKH6xqmUIVXnvr6Z3OXx8', // Public API key for ropi-bccee
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Content-Length': data.length,
      },
    };

    const req = https.request(options, (res) => {
      let body = '';
      res.on('data', (chunk) => {
        body += chunk;
      });
      res.on('end', () => {
        try {
          const result = JSON.parse(body);
          if (result.idToken) {
            console.log(`✅ ID token obtained`);
            resolve(result.idToken);
          } else {
            reject(new Error(`No idToken in response: ${body}`));
          }
        } catch (error) {
          reject(new Error(`Failed to parse response: ${error.message}`));
        }
      });
    });

    req.on('error', (error) => {
      reject(new Error(`Request failed: ${error.message}`));
    });

    req.write(data);
    req.end();
  });
}

/**
 * Main function
 */
async function main() {
  try {
    console.log(`\n🔧 Firebase Admin Token Generator`);
    console.log(`Project: ${PROJECT_ID}`);
    console.log(`Admin Email: ${ADMIN_EMAIL}\n`);

    // Initialize Firebase Admin SDK
    initializeAdmin();

    // Create custom token
    const customToken = await createCustomToken();

    // Exchange for ID token
    const idToken = await exchangeCustomTokenForIdToken(customToken);

    console.log(`\n${'='.repeat(80)}`);
    console.log(`ID Token (redacted):`);
    console.log(`${idToken.substring(0, 20)}...${idToken.substring(idToken.length - 20)}`);
    console.log(`${'='.repeat(80)}\n`);

    console.log(`Full token for use in scripts:\n`);
    console.log(idToken);

    process.exit(0);
  } catch (error) {
    console.error(`\n❌ Error: ${error.message}\n`);
    process.exit(1);
  }
}

main();
