/**
 * Firestore Admin Check for Product 14943667
 * Usage: node check-product-14943667.js
 */

const admin = require('firebase-admin');

// Initialize Firebase Admin
// Uses GOOGLE_APPLICATION_CREDENTIALS env var if set, otherwise uses default
try {
  admin.initializeApp();
} catch (e) {
  console.error('Failed to initialize Firebase Admin:', e.message);
  console.log('Make sure GOOGLE_APPLICATION_CREDENTIALS is set or you have default credentials');
  process.exit(1);
}

const db = admin.firestore();

(async () => {
  try {
    console.log('Checking product 14943667 in Firestore...\n');
    
    const doc = await db.collection('products').doc('14943667').get();
    
    console.log('exists:', doc.exists);
    
    if (doc.exists) {
      const data = doc.data();
      console.log('\nProduct data (first 1000 chars):');
      console.log(JSON.stringify(data, null, 2).slice(0, 1000));
      console.log('\n... (truncated)');
      
      // Show key fields
      console.log('\nKey fields:');
      console.log('- id:', doc.id);
      console.log('- name:', data.name);
      console.log('- brand:', data.brand);
      console.log('- sku:', data.sku);
      console.log('- attributes:', data.attributes ? Object.keys(data.attributes).length + ' keys' : 'undefined');
    } else {
      console.log('\n⚠️ Product 14943667 does NOT exist in Firestore');
    }
    
    process.exit(0);
  } catch (error) {
    console.error('Error checking product:', error);
    process.exit(1);
  }
})();
