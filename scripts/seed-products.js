#!/usr/bin/env node

/**
 * Seed Sample Products to Staging Firestore
 * 
 * Related: PROMPT_016 (AOSS_SEED_PRODUCTS_AND_AUDIT_v1.0)
 * 
 * Seeds 3 realistic product documents into Firestore products collection
 * in staging project (ropi-bccee).
 */

const admin = require('firebase-admin');
const path = require('path');
const fs = require('fs');

// Initialize Firebase Admin with project ID
// Uses application default credentials from Firebase CLI
try {
  admin.initializeApp({
    projectId: 'ropi-bccee'
  });
  console.log('✅ Firebase Admin initialized');
} catch (error) {
  console.error('❌ Firebase initialization failed:', error.message);
  process.exit(1);
}

const db = admin.firestore();

// Sample product data
const products = [
  {
    id: 'sku-1001',
    data: {
      sku: 'SKU-1001',
      name: 'Ropi Runner — Black Leather',
      brand: 'Ropi',
      category: 'Sneakers',
      status: 'In Progress',
      websites: ['shiekh.com'],
      attributes: {
        color: 'Black',
        material: 'Leather',
        fit: 'Regular'
      },
      firstReceived: admin.firestore.Timestamp.fromDate(new Date(Date.now() - 20 * 24 * 60 * 60 * 1000)),
      launchDate: admin.firestore.Timestamp.fromDate(new Date(Date.now() + 10 * 24 * 60 * 60 * 1000)),
      images: [],
      createdAt: admin.firestore.FieldValue.serverTimestamp(),
      updatedAt: admin.firestore.FieldValue.serverTimestamp()
    }
  },
  {
    id: 'sku-1002',
    data: {
      sku: 'SKU-1002',
      name: 'Ropi Classic — White Canvas',
      brand: 'Ropi',
      category: 'Casual',
      status: 'Draft',
      websites: ['shiekh.com'],
      attributes: {
        color: 'White',
        material: 'Canvas',
        fit: 'Narrow'
      },
      firstReceived: admin.firestore.Timestamp.fromDate(new Date(Date.now() - 12 * 24 * 60 * 60 * 1000)),
      launchDate: admin.firestore.Timestamp.fromDate(new Date(Date.now() + 25 * 24 * 60 * 60 * 1000)),
      images: [],
      createdAt: admin.firestore.FieldValue.serverTimestamp(),
      updatedAt: admin.firestore.FieldValue.serverTimestamp()
    }
  },
  {
    id: 'sku-1003',
    data: {
      sku: 'SKU-1003',
      name: 'Ropi HighTop — Brown Suede',
      brand: 'Ropi',
      category: 'Boots',
      status: 'Export-ready',
      websites: ['shiekh.com'],
      attributes: {
        color: 'Brown',
        material: 'Suede',
        fit: 'Wide'
      },
      firstReceived: admin.firestore.Timestamp.fromDate(new Date(Date.now() - 45 * 24 * 60 * 60 * 1000)),
      launchDate: admin.firestore.Timestamp.fromDate(new Date(Date.now() - 2 * 24 * 60 * 60 * 1000)),
      images: [],
      createdAt: admin.firestore.FieldValue.serverTimestamp(),
      updatedAt: admin.firestore.FieldValue.serverTimestamp()
    }
  }
];

async function seedProducts() {
  console.log('\n📦 Seeding products to ropi-bccee...\n');
  
  const results = [];
  
  for (const product of products) {
    try {
      console.log(`Seeding product: ${product.id} (${product.data.name})...`);
      
      // Write to Firestore
      await db.collection('products').doc(product.id).set(product.data);
      
      console.log(`✅ Successfully seeded: ${product.id}`);
      results.push({
        id: product.id,
        status: 'success',
        name: product.data.name
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
      const doc = await db.collection('products').doc(product.id).get();
      
      if (doc.exists) {
        const data = doc.data();
        console.log(`✅ Read back: ${product.id}`);
        
        // Convert timestamps to readable format for JSON output
        const jsonData = {
          id: doc.id,
          ...data,
          firstReceived: data.firstReceived?.toDate?.()?.toISOString() || data.firstReceived,
          launchDate: data.launchDate?.toDate?.()?.toISOString() || data.launchDate,
          createdAt: data.createdAt?.toDate?.()?.toISOString() || data.createdAt,
          updatedAt: data.updatedAt?.toDate?.()?.toISOString() || data.updatedAt
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
    const snapshot = await db.collection('products').limit(10).get();
    
    console.log(`   Found ${snapshot.size} products`);
    
    snapshot.forEach(doc => {
      console.log(`   - ${doc.id}: ${doc.data().name || '(no name)'}`);
    });
    
    return snapshot.size;
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
