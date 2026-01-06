#!/usr/bin/env node
/**
 * Test Export Readiness Endpoint
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

async function testReadinessEndpoint() {
  try {
    // Create custom token with admin claim
    console.log('Creating admin token...');
    const customToken = await admin.auth().createCustomToken('test-admin-user', { admin: true });
    
    // Exchange custom token for ID token
    console.log('Exchanging for ID token...');
    const idToken = await exchangeCustomToken(customToken);
    
    // Test readiness endpoint
    console.log('\n=== Testing GET /api/admin/exports/readiness ===\n');
    const result = await callReadinessEndpoint(idToken);
    
    console.log('HTTP Status:', result.status);
    console.log('\nResponse Body:');
    console.log(JSON.stringify(result.body, null, 2));
    
    // Verify expected fields
    console.log('\n=== Field Verification ===');
    const readiness = result.body.readiness || result.body;
    console.log('- ready:', readiness.ready);
    console.log('- completionPct:', readiness.completionPct);
    console.log('- threshold:', readiness.threshold);
    console.log('- hasBlockingSites:', readiness.hasBlockingSites);
    console.log('- blockingReasons count:', readiness.blockingReasons?.length || 0);
    console.log('- siteStatus count:', readiness.operatorExplanation?.siteStatus?.length || 0);
    
    if (readiness.operatorExplanation?.siteStatus) {
      console.log('\n=== Site Status ===');
      readiness.operatorExplanation.siteStatus.forEach(s => {
        console.log(`  - ${s.site}: blocked=${s.blocked}`);
      });
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

function callReadinessEndpoint(idToken) {
  return new Promise((resolve, reject) => {
    const options = {
      hostname: 'us-central1-ropi-bccee.cloudfunctions.net',
      path: '/api/admin/exports/readiness',
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

testReadinessEndpoint();
