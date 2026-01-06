#!/usr/bin/env node
/**
 * Test Product Completion Endpoint for 211737-90h1-8
 * LP-export-ui-readiness-1.0.0 HES C Verification
 */

const admin = require('firebase-admin');
const https = require('https');
const path = require('path');
const serviceAccount = require(path.join(__dirname, '..', 'service-account.json'));

if (admin.apps.length === 0) {
  admin.initializeApp({
    credential: admin.credential.cert(serviceAccount),
    projectId: 'ropi-bccee'
  });
}

const PRODUCT_ID = '211737-90h1-8';

async function testProductCompletion() {
  try {
    // Create custom token with admin claim
    console.log('Creating admin token...');
    const customToken = await admin.auth().createCustomToken('test-admin-user', { admin: true });
    
    // Exchange custom token for ID token
    console.log('Exchanging for ID token...');
    const idToken = await exchangeCustomToken(customToken);
    
    // Test product completion endpoint
    console.log(`\n=== Testing GET /api/products/${PRODUCT_ID}/completion ===\n`);
    const result = await callProductCompletionEndpoint(idToken, PRODUCT_ID);
    
    console.log('HTTP Status:', result.status);
    console.log('\nResponse Body:');
    console.log(JSON.stringify(result.body, null, 2));
    
    // Verify siteStatus
    console.log('\n=== Verification ===');
    const readiness = result.body;
    console.log('- ready:', readiness.ready);
    console.log('- completionPct:', readiness.completionPct);
    
    if (readiness.operatorExplanation?.siteStatus) {
      console.log('\n=== Site Status for', PRODUCT_ID, '===');
      readiness.operatorExplanation.siteStatus.forEach(s => {
        console.log(`  - ${s.site}: blocked=${s.blocked}, reason=${s.reason || 'none'}`);
      });
      
      // Check if shiekh.com is present
      const shiekhStatus = readiness.operatorExplanation.siteStatus.find(s => s.site === 'shiekh.com');
      if (shiekhStatus) {
        console.log('\n✅ shiekh.com found in siteStatus:', JSON.stringify(shiekhStatus));
      } else {
        console.log('\n⚠️ shiekh.com NOT found in siteStatus');
      }
    }
    
    // Check for "No sites selected" error
    if (readiness.blockingReasons) {
      const noSitesError = readiness.blockingReasons.find(r => 
        r.message?.includes('No sites selected') || r.type === 'NO_SITES_SELECTED'
      );
      if (noSitesError) {
        console.log('\n❌ FAIL: "No sites selected" error still present:', noSitesError);
      } else {
        console.log('\n✅ PASS: No "No sites selected" error');
      }
    }
    
    process.exit(0);
  } catch (error) {
    console.error('Error:', error.message);
    process.exit(1);
  }
}

function exchangeCustomToken(customToken) {
  return new Promise((resolve, reject) => {
    const data = JSON.stringify({
      token: customToken,
      returnSecureToken: true
    });
    
    const options = {
      hostname: 'identitytoolkit.googleapis.com',
      path: '/v1/accounts:signInWithCustomToken?key=AIzaSyD1aYB4AfqU5n1YfSOtLX5nbEYbnlTfcZ8',
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Content-Length': data.length
      }
    };
    
    const req = https.request(options, (res) => {
      let body = '';
      res.on('data', chunk => body += chunk);
      res.on('end', () => {
        const result = JSON.parse(body);
        if (result.idToken) {
          resolve(result.idToken);
        } else {
          reject(new Error('Token exchange failed: ' + JSON.stringify(result)));
        }
      });
    });
    
    req.on('error', reject);
    req.write(data);
    req.end();
  });
}

function callProductCompletionEndpoint(idToken, productId) {
  return new Promise((resolve, reject) => {
    const options = {
      hostname: 'us-central1-ropi-bccee.cloudfunctions.net',
      path: `/api/products/${productId}/completion`,
      method: 'GET',
      headers: {
        'Authorization': 'Bearer ' + idToken
      }
    };
    
    const req = https.request(options, (res) => {
      let body = '';
      res.on('data', chunk => body += chunk);
      res.on('end', () => {
        try {
          resolve({
            status: res.statusCode,
            body: JSON.parse(body)
          });
        } catch (e) {
          resolve({
            status: res.statusCode,
            body: body
          });
        }
      });
    });
    
    req.on('error', reject);
    req.end();
  });
}

testProductCompletion();
