#!/usr/bin/env node
/**
 * Populate test products with complete required attributes
 */

const admin = require('firebase-admin');

if (!admin.apps.length) {
  const serviceAccount = require('../../../service-account.json');
  admin.initializeApp({
    credential: admin.credential.cert(serviceAccount),
    projectId: 'ropi-bccee'
  });
}

const db = admin.firestore();

// Complete attribute set for test products
const testProductsData = {
  '19-test': {
    mpn: '19-test',
    name: 'Test Product 19 - Athletic Sneaker',
    sku: 'SKU-19-TEST',
    brand: 'Test Brand',
    category: 'footwear',
    department: 'Men\'s',
    class: 'Athletic',
    website: ['shiekh.com'],
    status: 'active',
    product_is_active: true,
    slug: 'test-product-19-athletic-sneaker',
    style_id: 'STYLE-19',
    rics_category: 'Men\'s Footwear > Athletic'
  },
  '16-test': {
    mpn: '16-test',
    name: 'Test Product 16 - Casual Boot',
    sku: 'SKU-16-TEST',
    brand: 'Test Brand',
    category: 'footwear',
    department: 'Women\'s',
    class: 'Casual',
    website: ['shiekh.com', 'karmaloop.com'],
    status: 'active',
    product_is_active: true,
    slug: 'test-product-16-casual-boot',
    style_id: 'STYLE-16',
    rics_category: 'Women\'s Footwear > Casual'
  },
  '15-test': {
    mpn: '15-test',
    name: 'Test Product 15 - Performance Runner',
    sku: 'SKU-15-TEST',
    brand: 'Test Brand Pro',
    category: 'footwear',
    department: 'Men\'s',
    class: 'Performance',
    website: ['shiekh.com'],
    status: 'active',
    product_is_active: true,
    slug: 'test-product-15-performance-runner',
    style_id: 'STYLE-15',
    rics_category: 'Men\'s Footwear > Performance'
  }
};

async function populateTestProducts() {
  try {
    const results = [];
    
    for (const [mpn, attributes] of Object.entries(testProductsData)) {
      console.log(`\n📝 Populating product: ${mpn}`);
      
      const productRef = db.collection('products').doc(mpn);
      const snapshot = await productRef.get();
      
      if (!snapshot.exists) {
        console.log(`  ⚠️  Product ${mpn} does not exist, creating...`);
        await productRef.set({
          mpn,
          productIdentifiers: { mpn },
          attributes: {},
          createdAt: admin.firestore.FieldValue.serverTimestamp()
        });
      }
      
      // Update attributes
      const attributesUpdate = {};
      for (const [key, value] of Object.entries(attributes)) {
        attributesUpdate[`attributes.${key}`] = value;
      }
      
      await productRef.update(attributesUpdate);
      
      console.log(`  ✅ Updated ${Object.keys(attributes).length} attributes`);
      
      // Verify
      const updated = await productRef.get();
      const updatedData = updated.data();
      const attrCount = Object.keys(updatedData.attributes || {}).length;
      
      results.push({
        mpn,
        attributesSet: Object.keys(attributes).length,
        totalAttributes: attrCount,
        success: true
      });
      
      console.log(`  📊 Total attributes now: ${attrCount}`);
    }
    
    console.log('\n✅ All test products populated successfully');
    console.log(JSON.stringify(results, null, 2));
    
    process.exit(0);
  } catch (error) {
    console.error('ERROR:', error);
    process.exit(1);
  }
}

populateTestProducts();
