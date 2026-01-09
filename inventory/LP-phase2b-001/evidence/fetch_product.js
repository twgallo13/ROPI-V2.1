#!/usr/bin/env node
/**
 * Fetch product from Firestore
 */

const admin = require('firebase-admin');
const fs = require('fs');
const path = require('path');

// Reuse existing Firebase Admin instance or initialize if needed
if (!admin.apps.length) {
  const serviceAccount = require('../../../service-account.json');
  admin.initializeApp({
    credential: admin.credential.cert(serviceAccount),
    projectId: 'ropi-bccee'
  });
}

const db = admin.firestore();

async function fetchProduct(productId) {
  try {
    console.log(`Fetching product: ${productId}...`);
    const docRef = db.collection('products').doc(productId);
    const snapshot = await docRef.get();
    
    if (!snapshot.exists) {
      console.error(`ERROR: Product ${productId} not found`);
      process.exit(1);
    }
    
    const data = snapshot.data();
    
    // Save full product
    const outputPath = path.join(__dirname, `product_${productId}.full.json`);
    fs.writeFileSync(outputPath, JSON.stringify(data, null, 2));
    console.log(`✅ Saved full product to: ${outputPath}`);
    
    // Extract and save attributes summary
    const attributes = data.attributes || {};
    const attrSummary = Object.entries(attributes).map(([name, attrData]) => ({
      name,
      category: attrData.attributeCategory || attrData.category,
      value: attrData.value,
      displayValue: attrData.displayValue
    }));
    
    const attrPath = path.join(__dirname, `product_${productId}.attributes.json`);
    fs.writeFileSync(attrPath, JSON.stringify(attrSummary, null, 2));
    console.log(`✅ Saved attributes to: ${attrPath}`);
    console.log(`   Total attributes: ${attrSummary.length}`);
    
    // Group by category
    const byCategory = {};
    attrSummary.forEach(attr => {
      const cat = attr.category || 'uncategorized';
      if (!byCategory[cat]) byCategory[cat] = [];
      byCategory[cat].push(attr.name);
    });
    
    console.log('\nAttributes by category:');
    Object.entries(byCategory).forEach(([cat, attrs]) => {
      console.log(`  ${cat}: ${attrs.join(', ')}`);
    });
    
    process.exit(0);
  } catch (error) {
    console.error('ERROR fetching product:', error);
    process.exit(1);
  }
}

const productId = process.argv[2] || '19-test';
fetchProduct(productId);
