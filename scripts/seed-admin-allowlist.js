#!/usr/bin/env node

/**
 * Seed Admin Allow-List to Firestore
 * 
 * Seeds metadata/admins document with admin email list.
 * Pattern based on seed-products-rest.js from PROMPT_016.
 * 
 * Usage:
 *   node scripts/seed-admin-allowlist.js
 * 
 * Requirements:
 *   - gcloud CLI authenticated: gcloud auth login
 *   - Firestore REST API access token
 * 
 * Related:
 *   - PROMPT_018B Spec: See HOMER_PROMPT_018B_AUDIT.txt
 *   - Section 9 — Security & IAM: https://www.notion.so/2b845ee1ec5a81739de7fc1743de9a33
 */

const https = require('https');
const { exec } = require('child_process');
const { promisify } = require('util');

const execAsync = promisify(exec);

// Config
const PROJECT_ID = 'ropi-bccee'; // Staging project
const COLLECTION = 'metadata';
const DOCUMENT_ID = 'admins';

// Admin emails to seed
const ADMIN_EMAILS = [
  'theo@shiekhshoes.org',
  'theo@shiekh.com',
];

/**
 * Get Firestore access token using gcloud
 */
async function getAccessToken() {
  try {
    const { stdout } = await execAsync('gcloud auth print-access-token');
    return stdout.trim();
  } catch (error) {
    console.error('❌ Failed to get access token. Make sure you are logged in with gcloud:');
    console.error('   Run: gcloud auth login');
    throw error;
  }
}

/**
 * Make HTTP request using curl (more reliable in dev container)
 */
async function curlRequest(url, method, accessToken, data) {
  const dataFile = '/tmp/firestore-admin-data.json';
  const fs = require('fs');
  
  // Write data to temp file
  fs.writeFileSync(dataFile, JSON.stringify(data));
  
  const curlCommand = `curl -X ${method} "${url}" \
    -H "Authorization: Bearer ${accessToken}" \
    -H "Content-Type: application/json" \
    -d @${dataFile} \
    -s -w "\\n%{http_code}"`;
  
  try {
    const { stdout } = await execAsync(curlCommand);
    const lines = stdout.trim().split('\n');
    const statusCode = parseInt(lines[lines.length - 1]);
    const body = lines.slice(0, -1).join('\n');
    
    // Clean up temp file
    fs.unlinkSync(dataFile);
    
    if (statusCode >= 200 && statusCode < 300) {
      return { statusCode, body: JSON.parse(body || '{}') };
    } else {
      throw new Error(`HTTP ${statusCode}: ${body}`);
    }
  } catch (error) {
    // Clean up temp file on error
    try { fs.unlinkSync(dataFile); } catch {}
    throw error;
  }
}

/**
 * Seed admin allow-list to Firestore
 */
async function seedAdminAllowlist() {
  console.log('================================================================================');
  console.log('SEED ADMIN ALLOW-LIST TO FIRESTORE');
  console.log('================================================================================\n');

  console.log(`📋 Configuration:`);
  console.log(`   Project: ${PROJECT_ID}`);
  console.log(`   Collection: ${COLLECTION}`);
  console.log(`   Document: ${DOCUMENT_ID}`);
  console.log(`   Admin Emails: ${ADMIN_EMAILS.join(', ')}\n`);

  // Get access token
  console.log('🔐 Getting access token from gcloud...');
  const accessToken = await getAccessToken();
  console.log('✅ Access token obtained\n');

  // Prepare admin document
  const adminDoc = {
    fields: {
      emails: {
        arrayValue: {
          values: ADMIN_EMAILS.map(email => ({ stringValue: email }))
        }
      },
      updatedAt: {
        timestampValue: new Date().toISOString()
      },
      updatedBy: {
        stringValue: 'system'
      }
    }
  };

  console.log('📝 Admin document to seed:');
  console.log(JSON.stringify(adminDoc, null, 2));
  console.log('');

  // Firestore REST API endpoint (PATCH for upsert)
  const url = `https://firestore.googleapis.com/v1/projects/${PROJECT_ID}/databases/(default)/documents/${COLLECTION}/${DOCUMENT_ID}`;
  
  console.log(`🚀 Seeding admin allow-list to Firestore...`);
  console.log(`   URL: ${url}\n`);

  try {
    const result = await curlRequest(url, 'PATCH', accessToken, adminDoc);
    console.log('✅ Admin allow-list seeded successfully!');
    console.log(`   Status: ${result.statusCode}`);
    console.log(`   Document: ${COLLECTION}/${DOCUMENT_ID}\n`);
    
    console.log('📄 Seeded Document:');
    console.log(JSON.stringify(result.body, null, 2));
    console.log('');
    
    console.log('================================================================================');
    console.log('✅ SEED COMPLETE');
    console.log('================================================================================\n');
    
    console.log('Next Steps:');
    console.log('1. Verify in Firebase Console:');
    console.log(`   https://console.firebase.google.com/project/${PROJECT_ID}/firestore/databases/(default)/data/~2F${COLLECTION}~2F${DOCUMENT_ID}`);
    console.log('2. Test admin detection by signing in as one of the admin emails');
    console.log('3. Check browser console for "Admin check" log messages\n');
    
    return result.body;
  } catch (error) {
    console.error('❌ Failed to seed admin allow-list:', error.message);
    console.error('');
    console.error('Troubleshooting:');
    console.error('- Verify gcloud is authenticated: gcloud auth list');
    console.error('- Verify project access: gcloud projects list');
    console.error('- Check Firestore is enabled for project');
    console.error('- Check Firestore security rules allow metadata writes (should be denied from client, OK from server)\n');
    throw error;
  }
}

// Run script
if (require.main === module) {
  seedAdminAllowlist()
    .then(() => {
      console.log('✅ Script completed successfully');
      process.exit(0);
    })
    .catch((error) => {
      console.error('❌ Script failed:', error);
      process.exit(1);
    });
}

module.exports = { seedAdminAllowlist };
