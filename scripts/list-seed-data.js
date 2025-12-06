#!/usr/bin/env node

/**
 * List Seed Data from Firestore
 * 
 * Lists sample documents from key collections for E2E testing:
 * - launches: Products with launch dates
 * - observations: User-submitted observations
 * 
 * Usage:
 *   node scripts/list-seed-data.js
 */

const https = require('https');
const { exec } = require('child_process');
const { promisify } = require('util');

const execAsync = promisify(exec);

const PROJECT_ID = 'ropi-bccee';

/**
 * Get access token from gcloud
 */
async function getAccessToken() {
  try {
    const { stdout } = await execAsync('gcloud auth print-access-token');
    return stdout.trim();
  } catch (error) {
    console.error('❌ Failed to get access token.');
    throw new Error(`Failed to get access token: ${error.message}`);
  }
}

/**
 * Query Firestore collection
 */
async function queryCollection(collectionId, accessToken, limit = 5) {
  return new Promise((resolve, reject) => {
    const body = JSON.stringify({
      structuredQuery: {
        from: [{ collectionId }],
        limit: limit
      }
    });
    
    const options = {
      hostname: 'firestore.googleapis.com',
      port: 443,
      path: `/v1/projects/${PROJECT_ID}/databases/(default)/documents:runQuery`,
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${accessToken}`,
        'Content-Type': 'application/json',
        'Content-Length': Buffer.byteLength(body),
      },
    };
    
    const req = https.request(options, (res) => {
      let data = '';
      res.on('data', chunk => data += chunk);
      res.on('end', () => {
        try {
          const result = JSON.parse(data);
          resolve(result);
        } catch (e) {
          reject(new Error(`Failed to parse response: ${data}`));
        }
      });
    });
    
    req.on('error', reject);
    req.write(body);
    req.end();
  });
}

/**
 * Format Firestore document for display
 */
function formatDocument(doc) {
  if (!doc.document) return null;
  
  const name = doc.document.name;
  const id = name.split('/').pop();
  const fields = doc.document.fields || {};
  
  // Extract simple field values
  const data = {};
  for (const [key, value] of Object.entries(fields)) {
    if (value.stringValue !== undefined) data[key] = value.stringValue;
    else if (value.integerValue !== undefined) data[key] = parseInt(value.integerValue);
    else if (value.doubleValue !== undefined) data[key] = value.doubleValue;
    else if (value.booleanValue !== undefined) data[key] = value.booleanValue;
    else if (value.timestampValue !== undefined) data[key] = value.timestampValue;
    else if (value.arrayValue !== undefined) data[key] = '[array]';
    else if (value.mapValue !== undefined) data[key] = '{map}';
    else data[key] = '(unknown type)';
  }
  
  return { id, ...data };
}

/**
 * Main function
 */
async function main() {
  console.log('📊 Listing Seed Data from Firestore\n');
  console.log(`   Project: ${PROJECT_ID}\n`);
  
  const accessToken = await getAccessToken();
  console.log('✅ Got access token\n');
  
  // Collections to check
  const collections = ['launches', 'observations', 'products', 'coreproducts'];
  
  for (const collection of collections) {
    console.log(`\n📁 ${collection.toUpperCase()}`);
    console.log('─'.repeat(50));
    
    try {
      const result = await queryCollection(collection, accessToken);
      
      if (Array.isArray(result) && result.length > 0) {
        let count = 0;
        for (const item of result) {
          if (item.document) {
            count++;
            const doc = formatDocument(item);
            console.log(`   ${count}. ${doc.id}`);
            // Show a few key fields
            const keys = Object.keys(doc).filter(k => k !== 'id').slice(0, 4);
            for (const key of keys) {
              const val = doc[key];
              const display = typeof val === 'string' && val.length > 50 
                ? val.substring(0, 50) + '...' 
                : val;
              console.log(`      └─ ${key}: ${display}`);
            }
          }
        }
        if (count === 0) {
          console.log('   (empty collection)');
        }
      } else if (result.error) {
        console.log(`   ❌ Error: ${result.error.message || JSON.stringify(result.error)}`);
      } else {
        console.log('   (empty collection)');
      }
    } catch (error) {
      console.log(`   ❌ Error: ${error.message}`);
    }
  }
  
  console.log('\n' + '─'.repeat(50));
  console.log('✅ Seed data listing complete');
}

main().catch(console.error);
