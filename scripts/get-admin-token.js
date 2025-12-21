#!/usr/bin/env node
/**
 * Generate ID token for smoke tests using existing admin user
 */
const admin = require('firebase-admin');
const https = require('https');

const API_KEY = 'AIzaSyD1aYB4AfqU5n1YfSOtLX5nbEYbnlTfcZ8';
const serviceAccount = require('../service-account.json');

const app = admin.initializeApp({ credential: admin.credential.cert(serviceAccount) });

async function getIdToken() {
  // Find theo@shiekh.com or any admin user
  const { users } = await admin.auth().listUsers(50);
  
  const adminUser = users.find(u => u.email === 'theo@shiekh.com' || (u.customClaims && u.customClaims.admin));
  
  if (!adminUser) {
    console.error('No admin user found. Creating token with admin claim...');
    // Create custom token with admin claim
    const customToken = await admin.auth().createCustomToken('smoke-admin', { admin: true });
    return exchangeToken(customToken);
  }
  
  console.error(`Found admin user: ${adminUser.email} (${adminUser.uid})`);
  console.error(`Claims: ${JSON.stringify(adminUser.customClaims || {})}`);
  
  // Create custom token for this user with admin claim
  const customToken = await admin.auth().createCustomToken(adminUser.uid, { admin: true });
  return exchangeToken(customToken);
}

function exchangeToken(customToken) {
  const data = JSON.stringify({
    token: customToken,
    returnSecureToken: true
  });
  
  return new Promise((resolve, reject) => {
    const req = https.request({
      hostname: 'identitytoolkit.googleapis.com',
      path: `/v1/accounts:signInWithCustomToken?key=${API_KEY}`,
      method: 'POST',
      headers: { 'Content-Type': 'application/json', 'Content-Length': data.length }
    }, (res) => {
      let body = '';
      res.on('data', c => body += c);
      res.on('end', () => {
        const result = JSON.parse(body);
        if (result.idToken) resolve(result.idToken);
        else reject(new Error(JSON.stringify(result)));
      });
    });
    req.write(data);
    req.end();
  });
}

getIdToken()
  .then(t => console.log(t))
  .catch(e => console.error(e))
  .finally(() => app.delete());
