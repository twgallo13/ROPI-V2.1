#!/usr/bin/env node

/**
 * Generate Admin ID Token for Staging Tests (REST API Approach)
 * 
 * Signs in theo@shiekh.com via Firebase Authentication REST API
 * and returns a valid ID token for API endpoint testing.
 * 
 * Usage:
 *   ADMIN_PASSWORD="..." node scripts/generate-admin-token-rest.js
 * 
 * Or if credentials are in CI secrets, they'll be available as env vars:
 *   VITE_E2E_ADMIN_EMAIL=theo@shiekh.com
 *   VITE_E2E_ADMIN_PASSWORD=<secret>
 * 
 * Output:
 *   ID Token suitable for use in curl requests
 */

const https = require('https');
const { promisify } = require('util');
const querystring = require('querystring');

const PROJECT_ID = 'ropi-bccee';
const ADMIN_EMAIL = process.env.VITE_E2E_ADMIN_EMAIL || 'theo@shiekh.com';
const ADMIN_PASSWORD = process.env.VITE_E2E_ADMIN_PASSWORD;

/**
 * Make HTTPS request
 */
function httpsRequest(options, data = null) {
  return new Promise((resolve, reject) => {
    const req = https.request(options, (res) => {
      let body = '';
      res.on('data', (chunk) => {
        body += chunk;
      });
      res.on('end', () => {
        try {
          const result = body ? JSON.parse(body) : {};
          resolve({ status: res.statusCode, body: result });
        } catch (error) {
          reject(new Error(`Failed to parse response: ${error.message}`));
        }
      });
    });

    req.on('error', (error) => {
      reject(new Error(`Request failed: ${error.message}`));
    });

    if (data) {
      req.write(data);
    }
    req.end();
  });
}

/**
 * Sign in with email and password via Firebase REST API
 */
async function signInWithPassword(email, password) {
  console.log(`Signing in ${email}...`);

  const data = JSON.stringify({
    email,
    password,
    returnSecureToken: true,
  });

  const options = {
    hostname: 'identitytoolkit.googleapis.com',
    path: '/v1/accounts:signInWithPassword?key=AIzaSyD1aYB4AfqU5n1YfSOtLX5nbEYbnlTfcZ8',
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Content-Length': data.length,
    },
  };

  const response = await httpsRequest(options, data);

  if (response.status !== 200) {
    const errorMsg = response.body.error?.message || 'Unknown error';
    throw new Error(`Sign-in failed: ${errorMsg}`);
  }

  return response.body.idToken;
}

/**
 * Main function
 */
async function main() {
  try {
    console.log(`\n🔧 Firebase Admin Token Generator (REST API)`);
    console.log(`Project: ${PROJECT_ID}`);
    console.log(`Admin Email: ${ADMIN_EMAIL}\n`);

    if (!ADMIN_PASSWORD) {
      console.error(`\n❌ Error: VITE_E2E_ADMIN_PASSWORD not set\n`);
      console.log(`Set the password via environment variable:`);
      console.log(`  export VITE_E2E_ADMIN_PASSWORD="<password>"`);
      console.log(`  node scripts/generate-admin-token-rest.js\n`);
      process.exit(1);
    }

    // Sign in and get ID token
    const idToken = await signInWithPassword(ADMIN_EMAIL, ADMIN_PASSWORD);

    console.log(`✅ Successfully signed in\n`);
    console.log(`${'='.repeat(80)}`);
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
