#!/usr/bin/env node
/**
 * LP-seed-test-product-1.0.0: Seed Test Product for Capture Testing
 * 
 * Steps:
 * 1. Discovery - Query for mpn/sku = "211737-90h1-8" or "451-9204-blk18a"
 * 2. Create new product if not found
 * 3. Ensure observation eligibility
 * 4. Output artifacts for HES
 * 
 * Usage:
 *   node scripts/seed-test-product-lp-1.0.0.js
 * 
 * Requires:
 *   - gcloud auth (uses REST API with gcloud access token)
 */

const https = require('https');
const { exec } = require('child_process');
const { promisify } = require('util');
const fs = require('fs');
const path = require('path');

const execAsync = promisify(exec);

const PROJECT_ID = 'ropi-bccee';
const ARTIFACTS_DIR = '/tmp/seed-test-product-lp-1.0.0';

// Target MPNs in priority order
const TARGET_MPNS = ['211737-90h1-8', '451-9204-blk18a'];

// Test product template
const TEST_PRODUCT_TEMPLATE = {
  mpn: '211737-90h1-8',
  sku: '211737-90h1-8',
  brand: 'TestBrand',
  name: 'Test Shoe 211737',
  firstReceived: '2025-12-01T00:00:00Z',
  statusFlags: { completion_status: 'incomplete' },
  observationEligible: true,
  stagingSeed: true,
  testProduct: true,
};

/**
 * Get access token from gcloud
 */
async function getAccessToken() {
  const { stdout } = await execAsync('gcloud auth print-access-token');
  return stdout.trim();
}

/**
 * Query Firestore for a product by MPN or SKU
 */
async function queryProductByField(field, value, accessToken) {
  return new Promise((resolve, reject) => {
    const body = JSON.stringify({
      structuredQuery: {
        from: [{ collectionId: 'products' }],
        where: {
          fieldFilter: {
            field: { fieldPath: field },
            op: 'EQUAL',
            value: { stringValue: value }
          }
        },
        limit: 1
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
 * Get a Firestore document by ID
 */
async function getDocumentById(docId, accessToken) {
  return new Promise((resolve, reject) => {
    const options = {
      hostname: 'firestore.googleapis.com',
      port: 443,
      path: `/v1/projects/${PROJECT_ID}/databases/(default)/documents/products/${docId}`,
      method: 'GET',
      headers: {
        'Authorization': `Bearer ${accessToken}`,
      },
    };
    
    const req = https.request(options, (res) => {
      let data = '';
      res.on('data', chunk => data += chunk);
      res.on('end', () => {
        try {
          const result = JSON.parse(data);
          resolve({ statusCode: res.statusCode, body: result });
        } catch (e) {
          reject(new Error(`Failed to parse response: ${data}`));
        }
      });
    });
    
    req.on('error', reject);
    req.end();
  });
}

/**
 * Create a new Firestore document
 */
async function createDocument(docId, fields, accessToken) {
  return new Promise((resolve, reject) => {
    const body = JSON.stringify({ fields });
    
    const options = {
      hostname: 'firestore.googleapis.com',
      port: 443,
      path: `/v1/projects/${PROJECT_ID}/databases/(default)/documents/products?documentId=${encodeURIComponent(docId)}`,
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
          resolve({ statusCode: res.statusCode, body: result });
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
 * Update a Firestore document (PATCH)
 */
async function updateDocument(docId, fields, updateMask, accessToken) {
  return new Promise((resolve, reject) => {
    const body = JSON.stringify({ fields });
    const maskParams = updateMask.map(f => `updateMask.fieldPaths=${f}`).join('&');
    
    const options = {
      hostname: 'firestore.googleapis.com',
      port: 443,
      path: `/v1/projects/${PROJECT_ID}/databases/(default)/documents/products/${encodeURIComponent(docId)}?${maskParams}`,
      method: 'PATCH',
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
          resolve({ statusCode: res.statusCode, body: result });
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
 * Convert Firestore REST format to plain JSON
 */
function convertFirestoreToJSON(fields) {
  if (!fields) return null;
  
  const result = {};
  for (const [key, value] of Object.entries(fields)) {
    if (value.stringValue !== undefined) {
      result[key] = value.stringValue;
    } else if (value.integerValue !== undefined) {
      result[key] = parseInt(value.integerValue, 10);
    } else if (value.doubleValue !== undefined) {
      result[key] = value.doubleValue;
    } else if (value.booleanValue !== undefined) {
      result[key] = value.booleanValue;
    } else if (value.timestampValue !== undefined) {
      result[key] = value.timestampValue;
    } else if (value.nullValue !== undefined) {
      result[key] = null;
    } else if (value.arrayValue !== undefined) {
      result[key] = (value.arrayValue.values || []).map(v => {
        if (v.stringValue !== undefined) return v.stringValue;
        if (v.integerValue !== undefined) return parseInt(v.integerValue, 10);
        if (v.booleanValue !== undefined) return v.booleanValue;
        if (v.mapValue !== undefined) return convertFirestoreToJSON(v.mapValue.fields);
        return v;
      });
    } else if (value.mapValue !== undefined) {
      result[key] = convertFirestoreToJSON(value.mapValue.fields);
    } else {
      result[key] = value;
    }
  }
  return result;
}

/**
 * Convert plain JSON to Firestore REST format
 */
function convertToFirestoreFields(obj) {
  const fields = {};
  for (const [key, value] of Object.entries(obj)) {
    if (value === null) {
      fields[key] = { nullValue: null };
    } else if (typeof value === 'string') {
      fields[key] = { stringValue: value };
    } else if (typeof value === 'number') {
      if (Number.isInteger(value)) {
        fields[key] = { integerValue: String(value) };
      } else {
        fields[key] = { doubleValue: value };
      }
    } else if (typeof value === 'boolean') {
      fields[key] = { booleanValue: value };
    } else if (Array.isArray(value)) {
      fields[key] = {
        arrayValue: {
          values: value.map(v => {
            if (typeof v === 'string') return { stringValue: v };
            if (typeof v === 'number') return { integerValue: String(v) };
            if (typeof v === 'boolean') return { booleanValue: v };
            if (typeof v === 'object') return { mapValue: { fields: convertToFirestoreFields(v) } };
            return { stringValue: String(v) };
          })
        }
      };
    } else if (typeof value === 'object') {
      fields[key] = { mapValue: { fields: convertToFirestoreFields(value) } };
    }
  }
  return fields;
}

/**
 * Save artifact to file
 */
function saveArtifact(name, data) {
  if (!fs.existsSync(ARTIFACTS_DIR)) {
    fs.mkdirSync(ARTIFACTS_DIR, { recursive: true });
  }
  const filePath = path.join(ARTIFACTS_DIR, name);
  fs.writeFileSync(filePath, JSON.stringify(data, null, 2));
  console.log(`   📄 Saved: ${filePath}`);
  return filePath;
}

/**
 * Main execution
 */
async function main() {
  console.log('================================================================================');
  console.log('LP-seed-test-product-1.0.0: Seed Test Product for Capture Testing');
  console.log('================================================================================\n');
  
  console.log(`📋 Configuration:`);
  console.log(`   Project: ${PROJECT_ID}`);
  console.log(`   Target MPNs: ${TARGET_MPNS.join(', ')}`);
  console.log(`   Artifacts: ${ARTIFACTS_DIR}\n`);
  
  // Get access token
  console.log('🔐 Getting access token from gcloud...');
  const accessToken = await getAccessToken();
  console.log('✅ Access token obtained\n');
  
  const actions = [];
  let foundDoc = null;
  let foundDocId = null;
  let foundMpn = null;
  
  // Step 1: Discovery - Query for existing products
  console.log('📍 Step 1: Discovery - Querying for existing products...\n');
  
  for (const mpn of TARGET_MPNS) {
    console.log(`   Querying mpn == "${mpn}"...`);
    const mpnResult = await queryProductByField('mpn', mpn, accessToken);
    
    if (Array.isArray(mpnResult) && mpnResult[0]?.document) {
      const doc = mpnResult[0].document;
      foundDocId = doc.name.split('/').pop();
      foundDoc = convertFirestoreToJSON(doc.fields);
      foundMpn = mpn;
      console.log(`   ✅ Found by mpn: products/${foundDocId}`);
      break;
    }
    
    console.log(`   Querying sku == "${mpn}"...`);
    const skuResult = await queryProductByField('sku', mpn, accessToken);
    
    if (Array.isArray(skuResult) && skuResult[0]?.document) {
      const doc = skuResult[0].document;
      foundDocId = doc.name.split('/').pop();
      foundDoc = convertFirestoreToJSON(doc.fields);
      foundMpn = mpn;
      console.log(`   ✅ Found by sku: products/${foundDocId}`);
      break;
    }
    
    console.log(`   ❌ Not found for "${mpn}"`);
  }
  
  // Also check if doc exists by document ID (sometimes the doc ID is the mpn)
  if (!foundDoc) {
    for (const mpn of TARGET_MPNS) {
      console.log(`   Checking document ID "${mpn}"...`);
      const docResult = await getDocumentById(mpn, accessToken);
      if (docResult.statusCode === 200 && docResult.body.fields) {
        foundDocId = mpn;
        foundDoc = convertFirestoreToJSON(docResult.body.fields);
        foundMpn = mpn;
        console.log(`   ✅ Found by document ID: products/${foundDocId}`);
        break;
      }
    }
  }
  
  console.log('');
  
  if (foundDoc) {
    // Found existing product - save orig_product_doc.json
    actions.push({
      action: 'checked_existing',
      found: true,
      doc_path: `products/${foundDocId}`
    });
    
    foundDoc._docId = foundDocId;
    foundDoc._queriedAt = new Date().toISOString();
    saveArtifact('orig_product_doc.json', foundDoc);
    
    // Step 3: Ensure observation eligibility
    console.log('📍 Step 3: Checking observation eligibility...\n');
    
    const needsUpdate = [];
    if (foundDoc.observationEligible !== true) {
      needsUpdate.push('observationEligible');
    }
    if (foundDoc.stagingSeed !== true) {
      needsUpdate.push('stagingSeed');
    }
    
    if (needsUpdate.length > 0) {
      console.log(`   ⚠️  Product needs update: ${needsUpdate.join(', ')}`);
      
      const updateFields = {
        observationEligible: { booleanValue: true },
        stagingSeed: { booleanValue: true },
        updatedAt: { timestampValue: new Date().toISOString() }
      };
      
      const updateResult = await updateDocument(
        foundDocId,
        updateFields,
        ['observationEligible', 'stagingSeed', 'updatedAt'],
        accessToken
      );
      
      if (updateResult.statusCode === 200) {
        console.log('   ✅ Product updated successfully');
        actions.push({
          action: 'updated_existing',
          doc_path: `products/${foundDocId}`,
          fields_updated: needsUpdate
        });
        
        // Save updated doc
        const updatedDoc = convertFirestoreToJSON(updateResult.body.fields);
        updatedDoc._docId = foundDocId;
        updatedDoc._updatedAt = new Date().toISOString();
        saveArtifact('updated_product_doc.json', updatedDoc);
      } else {
        console.log(`   ❌ Failed to update: ${JSON.stringify(updateResult.body)}`);
      }
    } else {
      console.log('   ✅ Product already has observationEligible: true and stagingSeed: true');
    }
    
  } else {
    // Step 2: Create new test product
    console.log('📍 Step 2: Creating new test product...\n');
    
    actions.push({
      action: 'checked_existing',
      found: false,
      doc_path: null
    });
    
    const newDocId = `test-product-${Date.now()}`;
    const newProduct = {
      ...TEST_PRODUCT_TEMPLATE,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };
    
    const fields = convertToFirestoreFields(newProduct);
    
    console.log(`   Creating document: products/${newDocId}`);
    console.log(`   Product data: ${JSON.stringify(newProduct, null, 2)}`);
    
    const createResult = await createDocument(newDocId, fields, accessToken);
    
    if (createResult.statusCode === 200) {
      console.log('   ✅ Product created successfully');
      actions.push({
        action: 'created_new',
        doc_path: `products/${newDocId}`
      });
      
      const createdDoc = convertFirestoreToJSON(createResult.body.fields);
      createdDoc._docId = newDocId;
      createdDoc._createdAt = new Date().toISOString();
      saveArtifact('new_product_doc.json', createdDoc);
      
      foundDocId = newDocId;
      foundMpn = TEST_PRODUCT_TEMPLATE.mpn;
    } else {
      console.log(`   ❌ Failed to create: ${JSON.stringify(createResult.body)}`);
      process.exit(1);
    }
  }
  
  console.log('');
  
  // Generate summary
  console.log('================================================================================');
  console.log('SUMMARY');
  console.log('================================================================================\n');
  
  console.log('Actions performed:');
  actions.forEach((a, i) => {
    console.log(`   ${i + 1}. ${a.action}: ${a.doc_path || '(none)'}`);
  });
  console.log('');
  
  console.log('Artifacts saved:');
  const files = fs.readdirSync(ARTIFACTS_DIR);
  files.forEach(f => console.log(`   - ${path.join(ARTIFACTS_DIR, f)}`));
  console.log('');
  
  console.log('Next steps:');
  console.log(`   1. Test API: curl "https://ropi-aoss-staging.web.app/api/products/by-mpn/${foundMpn}"`);
  console.log(`   2. Test search: curl "https://ropi-aoss-staging.web.app/api/products/search-mpn?q=${foundMpn.slice(0, 3)}"`);
  console.log('   3. Test UI: https://ropi-aoss-staging.web.app/observations/capture');
  console.log('');
  
  // Return summary for HES
  return {
    foundMpn,
    foundDocId,
    actions,
    artifactsDir: ARTIFACTS_DIR
  };
}

main()
  .then(result => {
    console.log('✅ LP-seed-test-product-1.0.0 completed successfully\n');
    console.log('Result:', JSON.stringify(result, null, 2));
    process.exit(0);
  })
  .catch(error => {
    console.error('❌ LP-seed-test-product-1.0.0 failed:', error);
    process.exit(1);
  });
