#!/usr/bin/env node
/**
 * Capture API responses using Firebase Auth with service account
 * HES C API verification helper
 */

const admin = require('firebase-admin');
const fs = require('fs');
const path = require('path');

const EVIDENCE_DIR = path.join(__dirname, '../../../evidence/lp-export-ui-attr-fix');
const PROJECT_ID = 'ropi-bccee';
const STAGING_URL = 'https://ropi-aoss-staging.web.app';

// Initialize Firebase Admin with service account from environment
let serviceAccount;
if (process.env.GCP_SA_KEY_BASE64) {
  const decoded = Buffer.from(process.env.GCP_SA_KEY_BASE64, 'base64').toString();
  serviceAccount = JSON.parse(decoded);
} else {
  console.error('ERROR: GCP_SA_KEY_BASE64 environment variable not set');
  process.exit(1);
}

if (!admin.apps.length) {
  admin.initializeApp({
    credential: admin.credential.cert(serviceAccount),
    projectId: PROJECT_ID
  });
}

// Get Firebase Auth ID token using service account
async function getAuthToken() {
  try {
    console.log('Creating custom token for service account...');
    
    // Create custom token for the service account email
    const uid = serviceAccount.client_email.replace(/@.*/, '').replace(/[^a-zA-Z0-9]/g, '_');
    const customToken = await admin.auth().createCustomToken(uid, {
      admin: true,
      email: serviceAccount.client_email
    });
    
    console.log('Custom token created, exchanging for ID token...');
    
    // Get Firebase API key from environment or use default
    const apiKey = process.env.VITE_FIREBASE_API_KEY || 'AIzaSyD1aYB4AfqU5n1YfSOtLX5nbEYbnlTfcZ8';
    
    // Exchange custom token for ID token
    const response = await fetch(
      `https://identitytoolkit.googleapis.com/v1/accounts:signInWithCustomToken?key=${apiKey}`,
      {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          token: customToken,
          returnSecureToken: true
        })
      }
    );
    
    const data = await response.json();
    
    if (!response.ok) {
      throw new Error(`Token exchange failed: ${JSON.stringify(data)}`);
    }
    
    if (data.idToken) {
      console.log('✓ ID token obtained successfully');
      return data.idToken;
    } else {
      throw new Error(`No idToken in response: ${JSON.stringify(data)}`);
    }
  } catch (error) {
    console.error('Error getting auth token:', error.message);
    throw error;
  }
}

// Make authenticated API call
async function apiCall(endpoint, token) {
  const url = `${STAGING_URL}${endpoint}`;
  console.log(`  → GET ${endpoint}`);
  
  try {
    const response = await fetch(url, {
      headers: {
        'Authorization': `Bearer ${token}`,
        'Content-Type': 'application/json'
      }
    });
    
    const data = await response.json();
    
    if (!response.ok) {
      console.log(`  ✗ HTTP ${response.status}: ${JSON.stringify(data)}`);
    } else {
      console.log(`  ✓ HTTP ${response.status}`);
    }
    
    return data;
  } catch (error) {
    console.error(`  ✗ Error: ${error.message}`);
    throw error;
  }
}

// Capture baseline API responses (SITE_SCOPED mode)
async function captureBaseline() {
  console.log('\n=== Capturing Baseline API Responses ===\n');
  
  const token = await getAuthToken();
  const baselineDir = path.join(EVIDENCE_DIR, 'baseline');
  fs.mkdirSync(baselineDir, { recursive: true });
  
  try {
    // 1. Readiness API
    console.log('1. Export readiness API:');
    const readiness = await apiCall('/api/admin/exports/readiness', token);
    fs.writeFileSync(
      path.join(baselineDir, 'readiness-baseline.json'),
      JSON.stringify(readiness, null, 2)
    );
    console.log(`   Saved: readiness-baseline.json\n`);
    
    // 2. Product completion for test products
    const testProducts = ['18-test', '211737-90h1-8'];
    for (const productId of testProducts) {
      console.log(`2. Product completion for ${productId}:`);
      const completion = await apiCall(`/api/products/${productId}/completion`, token);
      fs.writeFileSync(
        path.join(baselineDir, `product-completion-${productId}-baseline.json`),
        JSON.stringify(completion, null, 2)
      );
      console.log(`   Saved: product-completion-${productId}-baseline.json\n`);
    }
    
    console.log('✓ Baseline API captures complete\n');
  } catch (error) {
    console.error('\n✗ Baseline capture failed:', error.message);
    throw error;
  }
}

// Capture GLOBAL mode API responses
async function captureGlobal() {
  console.log('\n=== Capturing GLOBAL Mode API Responses ===\n');
  
  const token = await getAuthToken();
  const globalDir = path.join(EVIDENCE_DIR, 'global-mode');
  fs.mkdirSync(globalDir, { recursive: true });
  
  try {
    // 1. Readiness API
    console.log('1. Export readiness API (GLOBAL):');
    const readiness = await apiCall('/api/admin/exports/readiness', token);
    fs.writeFileSync(
      path.join(globalDir, 'readiness-global.json'),
      JSON.stringify(readiness, null, 2)
    );
    console.log(`   Saved: readiness-global.json\n`);
    
    // 2. Product completion for test products
    const testProducts = ['18-test', '211737-90h1-8'];
    for (const productId of testProducts) {
      console.log(`2. Product completion for ${productId} (GLOBAL):`);
      const completion = await apiCall(`/api/products/${productId}/completion`, token);
      fs.writeFileSync(
        path.join(globalDir, `product-completion-${productId}-global.json`),
        JSON.stringify(completion, null, 2)
      );
      console.log(`   Saved: product-completion-${productId}-global.json\n`);
    }
    
    console.log('✓ GLOBAL mode API captures complete\n');
  } catch (error) {
    console.error('\n✗ GLOBAL mode capture failed:', error.message);
    throw error;
  }
}

// Main execution
(async () => {
  try {
    const command = process.argv[2];
    
    if (command === 'baseline') {
      await captureBaseline();
    } else if (command === 'global') {
      await captureGlobal();
    } else if (command === 'both') {
      await captureBaseline();
      console.log('\n⏳ Waiting 5 seconds before GLOBAL capture...\n');
      await new Promise(resolve => setTimeout(resolve, 5000));
      await captureGlobal();
    } else {
      console.log('Usage: node capture-api.js [baseline|global|both]');
      console.log('');
      console.log('Commands:');
      console.log('  baseline  - Capture API responses with SITE_SCOPED mode');
      console.log('  global    - Capture API responses with GLOBAL mode');
      console.log('  both      - Capture both baseline and GLOBAL (with 5s gap)');
      process.exit(1);
    }
    
    process.exit(0);
  } catch (error) {
    console.error('\n✗ Fatal error:', error.message);
    process.exit(1);
  }
})();
