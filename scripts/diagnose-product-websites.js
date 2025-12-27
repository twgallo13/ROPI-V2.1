#!/usr/bin/env node
/**
 * Diagnose Product Websites Field
 * 
 * Checks the current state of websites and attributes.website for a product
 * to help debug checkbox toggle issues.
 */

const admin = require('firebase-admin');
const fs = require('fs');

// Initialize Firebase Admin
if (!admin.apps.length) {
  const credPath = process.env.GOOGLE_APPLICATION_CREDENTIALS;
  const credBase64 = process.env.GCP_SA_KEY_BASE64;
  
  if (credPath && fs.existsSync(credPath)) {
    const serviceAccount = JSON.parse(fs.readFileSync(credPath, 'utf8'));
    admin.initializeApp({
      credential: admin.credential.cert(serviceAccount),
    });
  } else if (credBase64) {
    const serviceAccount = JSON.parse(Buffer.from(credBase64, 'base64').toString('utf8'));
    admin.initializeApp({
      credential: admin.credential.cert(serviceAccount),
    });
  } else {
    console.error('❌ No credentials found');
    process.exit(1);
  }
}

const db = admin.firestore();

async function diagnoseProduct(productId) {
  console.log(`\n🔍 Diagnosing product: ${productId}\n`);
  
  try {
    const doc = await db.collection('products').doc(productId).get();
    
    if (!doc.exists) {
      console.log(`❌ Product ${productId} not found`);
      return;
    }
    
    const data = doc.data();
    
    console.log('─────────────────────────────────────');
    console.log('📦 PRODUCT WEBSITES DIAGNOSIS');
    console.log('─────────────────────────────────────');
    console.log(`ID: ${doc.id}`);
    console.log(`Name: ${data.name || 'N/A'}`);
    console.log('');
    console.log('📍 websites (top-level):');
    console.log(`   Type: ${typeof data.websites}`);
    console.log(`   IsArray: ${Array.isArray(data.websites)}`);
    console.log(`   Value: ${JSON.stringify(data.websites)}`);
    console.log('');
    console.log('📍 attributes.website:');
    console.log(`   Type: ${typeof data.attributes?.website}`);
    console.log(`   IsArray: ${Array.isArray(data.attributes?.website)}`);
    console.log(`   Value: ${JSON.stringify(data.attributes?.website)}`);
    console.log('');
    console.log('📍 meta.cleanup (if exists):');
    console.log(`   Value: ${JSON.stringify(data.meta?.cleanup, null, 2)}`);
    console.log('');
    console.log('📍 exportReadiness:');
    console.log(`   Overall: ${data.exportReadiness?.overall}`);
    console.log(`   byWebsite keys: ${Object.keys(data.exportReadiness?.byWebsite || {}).join(', ')}`);
    console.log('─────────────────────────────────────');
    
    // Check for mismatches
    const topLevel = data.websites || [];
    const attrLevel = data.attributes?.website || [];
    
    if (JSON.stringify(topLevel) !== JSON.stringify(attrLevel)) {
      console.log('\n⚠️  MISMATCH DETECTED:');
      console.log(`   websites:            ${JSON.stringify(topLevel)}`);
      console.log(`   attributes.website:  ${JSON.stringify(attrLevel)}`);
    } else {
      console.log('\n✅ websites and attributes.website are in sync');
    }
    
  } catch (error) {
    console.error('❌ Error:', error.message);
  }
}

// Get product ID from command line or use default test products
const productIds = process.argv.slice(2);
if (productIds.length === 0) {
  // Check common test products
  Promise.all([
    diagnoseProduct('test-product-001'),
    diagnoseProduct('test-product-002'),
    diagnoseProduct('test-product-003'),
    diagnoseProduct('123'),
    diagnoseProduct('14943667'),
  ]).then(() => process.exit(0));
} else {
  Promise.all(productIds.map(id => diagnoseProduct(id))).then(() => process.exit(0));
}
