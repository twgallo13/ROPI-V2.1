#!/usr/bin/env node

/**
 * Seed Sample Products to Staging Firestore using REST API
 * 
 * Related: PROMPT_016 (AOSS_SEED_PRODUCTS_AND_AUDIT_v1.0)
 * 
 * Seeds 3 realistic product documents into Firestore products collection
 * in staging project (ropi-bccee) using Firestore REST API.
 */

const https = require('https');
const fs = require('fs');
const path = require('path');

const PROJECT_ID = 'ropi-bccee';
const FIREBASE_TOKEN = process.env.FIREBASE_TOKEN || '';

if (!FIREBASE_TOKEN) {
  console.error('❌ FIREBASE_TOKEN not set');
  process.exit(1);
}

// Sample product data
const products = [
  {
    id: 'sku-1001',
    data: {
      sku: { stringValue: 'SKU-1001' },
      name: { stringValue: 'Ropi Runner — Black Leather' },
      brand: { stringValue: 'Ropi' },
      category: { stringValue: 'Sneakers' },
      status: { stringValue: 'In Progress' },
      websites: { arrayValue: { values: [{ stringValue: 'shiekh.com' }] } },
      attributes: {
        mapValue: {
          fields: {
            color: { stringValue: 'Black' },
            material: { stringValue: 'Leather' },
            fit: { stringValue: 'Regular' }
          }
        }
      },
      firstReceived: { timestampValue: new Date(Date.now() - 20 * 24 * 60 * 60 * 1000).toISOString() },
      launchDate: { timestampValue: new Date(Date.now() + 10 * 24 * 60 * 60 * 1000).toISOString() },
      images: { arrayValue: { values: [] } },
      createdAt: { timestampValue: new Date().toISOString() },
      updatedAt: { timestampValue: new Date().toISOString() }
    }
  },
  {
    id: 'sku-1002',
    data: {
      sku: { stringValue: 'SKU-1002' },
      name: { stringValue: 'Ropi Classic — White Canvas' },
      brand: { stringValue: 'Ropi' },
      category: { stringValue: 'Casual' },
      status: { stringValue: 'Draft' },
      websites: { arrayValue: { values: [{ stringValue: 'shiekh.com' }] } },
      attributes: {
        mapValue: {
          fields: {
            color: { stringValue: 'White' },
            material: { stringValue: 'Canvas' },
            fit: { stringValue: 'Narrow' }
          }
        }
      },
      firstReceived: { timestampValue: new Date(Date.now() - 12 * 24 * 60 * 60 * 1000).toISOString() },
      launchDate: { timestampValue: new Date(Date.now() + 25 * 24 * 60 * 60 * 1000).toISOString() },
      images: { arrayValue: { values: [] } },
      createdAt: { timestampValue: new Date().toISOString() },
      updatedAt: { timestampValue: new Date().toISOString() }
    }
  },
  {
    id: 'sku-1003',
    data: {
      sku: { stringValue: 'SKU-1003' },
      name: { stringValue: 'Ropi HighTop — Brown Suede' },
      brand: { stringValue: 'Ropi' },
      category: { stringValue: 'Boots' },
      status: { stringValue: 'Export-ready' },
      websites: { arrayValue: { values: [{ stringValue: 'shiekh.com' }] } },
      attributes: {
        mapValue: {
          fields: {
            color: { stringValue: 'Brown' },
            material: { stringValue: 'Suede' },
            fit: { stringValue: 'Wide' }
          }
        }
      },
      firstReceived: { timestampValue: new Date(Date.now() - 45 * 24 * 60 * 60 * 1000).toISOString() },
      launchDate: { timestampValue: new Date(Date.now() - 2 * 24 * 60 * 60 * 1000).toISOString() },
      images: { arrayValue: { values: [] } },
      createdAt: { timestampValue: new Date().toISOString() },
      updatedAt: { timestampValue: new Date().toISOString() }
    }
  }
];

function writeDocument(docId, fields) {
  return new Promise((resolve, reject) => {
    const postData = JSON.stringify({ fields });
    
    const options = {
      hostname: 'firestore.googleapis.com',
      port: 443,
      path: `/v1/projects/${PROJECT_ID}/databases/(default)/documents/products/${docId}`,
      method: 'PATCH',
      headers: {
        'Authorization': `Bearer ${FIREBASE_TOKEN}`,
        'Content-Type': 'application/json',
        'Content-Length': Buffer.byteLength(postData)
      }
    };
    
    const req = https.request(options, (res) => {
      let data = '';
      
      res.on('data', (chunk) => {
        data += chunk;
      });
      
      res.on('end', () => {
        if (res.statusCode === 200) {
          resolve(JSON.parse(data));
        } else {
          reject(new Error(`HTTP ${res.statusCode}: ${data}`));
        }
      });
    });
    
    req.on('error', (error) => {
      reject(error);
    });
    
    req.write(postData);
    req.end();
  });
}

function readDocument(docId) {
  return new Promise((resolve, reject) => {
    const options = {
      hostname: 'firestore.googleapis.com',
      port: 443,
      path: `/v1/projects/${PROJECT_ID}/databases/(default)/documents/products/${docId}`,
      method: 'GET',
      headers: {
        'Authorization': `Bearer ${FIREBASE_TOKEN}`
      }
    };
    
    const req = https.request(options, (res) => {
      let data = '';
      
      res.on('data', (chunk) => {
        data += chunk;
      });
      
      res.on('end', () => {
        if (res.statusCode === 200) {
          resolve(JSON.parse(data));
        } else {
          reject(new Error(`HTTP ${res.statusCode}: ${data}`));
        }
      });
    });
    
    req.on('error', (error) => {
      reject(error);
    });
    
    req.end();
  });
}

function listDocuments() {
  return new Promise((resolve, reject) => {
    const options = {
      hostname: 'firestore.googleapis.com',
      port: 443,
      path: `/v1/projects/${PROJECT_ID}/databases/(default)/documents/products?pageSize=10`,
      method: 'GET',
      headers: {
        'Authorization': `Bearer ${FIREBASE_TOKEN}`
      }
    };
    
    const req = https.request(options, (res) => {
      let data = '';
      
      res.on('data', (chunk) => {
        data += chunk;
      });
      
      res.on('end', () => {
        if (res.statusCode === 200) {
          resolve(JSON.parse(data));
        } else {
          reject(new Error(`HTTP ${res.statusCode}: ${data}`));
        }
      });
    });
    
    req.on('error', (error) => {
      reject(error);
    });
    
    req.end();
  });
}

function convertFirestoreToJSON(fields) {
  const result = {};
  
  for (const [key, value] of Object.entries(fields)) {
    if (value.stringValue !== undefined) {
      result[key] = value.stringValue;
    } else if (value.timestampValue !== undefined) {
      result[key] = value.timestampValue;
    } else if (value.arrayValue !== undefined) {
      result[key] = value.arrayValue.values?.map(v => v.stringValue || v) || [];
    } else if (value.mapValue !== undefined) {
      result[key] = convertFirestoreToJSON(value.mapValue.fields || {});
    }
  }
  
  return result;
}

async function seedProducts() {
  console.log('\n📦 Seeding products to ropi-bccee using Firestore REST API...\n');
  
  const results = [];
  
  for (const product of products) {
    try {
      console.log(`Seeding product: ${product.id} (${product.data.name.stringValue})...`);
      
      await writeDocument(product.id, product.data);
      
      console.log(`✅ Successfully seeded: ${product.id}`);
      results.push({
        id: product.id,
        status: 'success',
        name: product.data.name.stringValue
      });
    } catch (error) {
      console.error(`❌ Failed to seed ${product.id}:`, error.message);
      results.push({
        id: product.id,
        status: 'failed',
        error: error.message
      });
    }
  }
  
  console.log('\n📊 Seeding Results:');
  console.log(`   Success: ${results.filter(r => r.status === 'success').length}`);
  console.log(`   Failed: ${results.filter(r => r.status === 'failed').length}`);
  
  if (results.some(r => r.status === 'failed')) {
    console.error('\n❌ Some products failed to seed');
    process.exit(1);
  }
  
  return results;
}

async function readBackProducts() {
  console.log('\n📖 Reading back seeded products from Firestore...\n');
  
  const readBackData = [];
  
  for (const product of products) {
    try {
      const doc = await readDocument(product.id);
      
      if (doc && doc.fields) {
        console.log(`✅ Read back: ${product.id}`);
        
        const jsonData = {
          id: product.id,
          ...convertFirestoreToJSON(doc.fields)
        };
        
        readBackData.push(jsonData);
      } else {
        console.error(`❌ Document ${product.id} not found in Firestore`);
      }
    } catch (error) {
      console.error(`❌ Failed to read ${product.id}:`, error.message);
    }
  }
  
  return readBackData;
}

async function queryProducts() {
  console.log('\n🔍 Querying products collection (limit 10)...\n');
  
  try {
    const result = await listDocuments();
    
    const count = result.documents?.length || 0;
    console.log(`   Found ${count} products`);
    
    result.documents?.forEach(doc => {
      const docId = doc.name.split('/').pop();
      const name = doc.fields.name?.stringValue || '(no name)';
      console.log(`   - ${docId}: ${name}`);
    });
    
    return count;
  } catch (error) {
    console.error('❌ Failed to query products:', error.message);
    return 0;
  }
}

async function saveArtifacts(readBackData) {
  console.log('\n💾 Saving artifacts...\n');
  
  const artifactsDir = path.join(__dirname, '..', 'HOMER_PROMPT_016_ARTIFACTS');
  
  // Create artifacts directory
  if (!fs.existsSync(artifactsDir)) {
    fs.mkdirSync(artifactsDir, { recursive: true });
    console.log(`✅ Created directory: ${artifactsDir}`);
  }
  
  // Save sample_products.json
  const jsonPath = path.join(artifactsDir, 'sample_products.json');
  fs.writeFileSync(jsonPath, JSON.stringify(readBackData, null, 2));
  console.log(`✅ Saved: ${jsonPath}`);
  
  return jsonPath;
}

async function main() {
  try {
    // Seed products
    await seedProducts();
    
    // Read back products
    const readBackData = await readBackProducts();
    
    // Query products collection
    await queryProducts();
    
    // Save artifacts
    await saveArtifacts(readBackData);
    
    console.log('\n✅ Product seeding complete!\n');
    process.exit(0);
  } catch (error) {
    console.error('\n❌ Product seeding failed:', error);
    process.exit(1);
  }
}

main();
