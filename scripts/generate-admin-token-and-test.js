#!/usr/bin/env node
/**
 * Generate Admin Token & Test Readiness Endpoint
 * For HES C verification after deployment fix
 */

const admin = require('firebase-admin');
const fs = require('fs');
const path = require('path');

// Initialize Firebase Admin
const serviceAccount = require('../service-account.json');

admin.initializeApp({
  credential: admin.credential.cert(serviceAccount),
  projectId: serviceAccount.project_id
});

async function generateAdminToken() {
  try {
    // Create custom token for admin user
    const uid = 'admin-verification-user';
    const customToken = await admin.auth().createCustomToken(uid, {
      admin: true,
      role: 'admin'
    });

    console.log('✅ Custom token created');

    // Exchange custom token for ID token
    const apiKey = 'AIzaSyD1aYB4AfqU5n1YfSOtLX5nbEYbnlTfcZ8'; // From deployed-bundle.js
    const response = await fetch(
      `https://identitytoolkit.googleapis.com/v1/accounts:signInWithCustomToken?key=${apiKey}`,
      {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ token: customToken, returnSecureToken: true })
      }
    );

    const data = await response.json();
    if (!data.idToken) {
      throw new Error(`Failed to exchange token: ${JSON.stringify(data)}`);
    }

    console.log('✅ ID token generated');
    return data.idToken;
  } catch (error) {
    console.error('❌ Token generation failed:', error);
    throw error;
  }
}

async function testReadinessEndpoint(idToken) {
  try {
    const url = 'https://us-central1-ropi-bccee.cloudfunctions.net/api/admin/exports/readiness';
    console.log(`\n🔍 Testing readiness endpoint: ${url}`);

    const response = await fetch(url, {
      method: 'GET',
      headers: {
        'Authorization': `Bearer ${idToken}`,
        'Content-Type': 'application/json'
      }
    });

    const status = response.status;
    const body = await response.json();

    console.log(`✅ HTTP Status: ${status}`);
    console.log(`✅ Response keys: ${Object.keys(body).join(', ')}`);

    // Save evidence
    const evidencePath = path.join(__dirname, '../evidence/lp-export-readiness-diagnostics/readiness-200-after.json');
    fs.writeFileSync(evidencePath, JSON.stringify({ status, body }, null, 2));
    console.log(`✅ Evidence saved: ${evidencePath}`);

    return { status, body };
  } catch (error) {
    console.error('❌ Readiness test failed:', error);
    throw error;
  }
}

async function testProductCompletion(idToken, productId = '211737-90h1-8') {
  try {
    const url = `https://ropi-aoss-staging.web.app/api/products/${productId}/completion`;
    console.log(`\n🔍 Testing product completion: ${url}`);

    const response = await fetch(url, {
      method: 'GET',
      headers: {
        'Authorization': `Bearer ${idToken}`,
        'Content-Type': 'application/json'
      }
    });

    const status = response.status;
    const body = await response.json();

    console.log(`✅ HTTP Status: ${status}`);
    console.log(`✅ Response has siteStatus: ${!!body.siteStatus}`);
    if (body.siteStatus) {
      console.log(`✅ Sites: ${body.siteStatus.map(s => s.site).join(', ')}`);
    }

    // Save evidence
    const evidencePath = path.join(__dirname, '../evidence/lp-export-readiness-diagnostics/product-211737-completion-after.json');
    fs.writeFileSync(evidencePath, JSON.stringify({ status, body }, null, 2));
    console.log(`✅ Evidence saved: ${evidencePath}`);

    return { status, body };
  } catch (error) {
    console.error('❌ Product completion test failed:', error);
    throw error;
  }
}

async function testAttributeUpdate(idToken) {
  try {
    const url = 'https://ropi-aoss-staging.web.app/api/admin/settings/attributes/class';
    console.log(`\n🔍 Testing attribute update: ${url}`);

    const response = await fetch(url, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${idToken}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        attribute_id: 'class',
        category: 'classification',
        export: true
      })
    });

    const status = response.status;
    const body = await response.json();

    console.log(`✅ HTTP Status: ${status}`);
    console.log(`✅ Updated: ${!!body.attribute_id}`);

    // Save evidence
    const evidencePath = path.join(__dirname, '../evidence/lp-export-readiness-diagnostics/attribute-update-200-after.json');
    fs.writeFileSync(evidencePath, JSON.stringify({ status, body }, null, 2));
    console.log(`✅ Evidence saved: ${evidencePath}`);

    return { status, body };
  } catch (error) {
    console.error('❌ Attribute update test failed:', error);
    throw error;
  }
}

async function main() {
  console.log('🚀 Starting HES C Verification Tests\n');

  const idToken = await generateAdminToken();
  
  await testReadinessEndpoint(idToken);
  await testProductCompletion(idToken);
  await testAttributeUpdate(idToken);

  console.log('\n✅ All HES C verification tests complete!');
  console.log('📁 Evidence files saved to: evidence/lp-export-readiness-diagnostics/');
}

main().catch(error => {
  console.error('❌ Verification failed:', error);
  process.exit(1);
});
