const admin = require('firebase-admin');
const serviceAccount = require('./service-account.json');

if (!admin.apps.length) {
  admin.initializeApp({ credential: admin.credential.cert(serviceAccount) });
}
const db = admin.firestore();

async function checkProduct() {
  const doc = await db.collection('products').doc('103-test').get();
  
  if (!doc.exists) {
    console.log('Product not found');
    return;
  }
  
  const data = doc.data();
  
  console.log('=== PRODUCT 103-test ===\n');
  console.log('MPN:', data.mpn);
  console.log('Website:', data.website);
  console.log('\n=== SKU_CORE Attributes ===');
  const coreAttrs = ['brand', 'category', 'class', 'department', 'gender', 'mpn', 'name', 'sku', 'website'];
  coreAttrs.forEach(attr => {
    const value = data[attr] || data.attributes?.[attr];
    console.log(`${attr}: ${value || '(MISSING)'}`);
  });
  
  console.log('\n=== All Top-Level Fields ===');
  Object.keys(data).forEach(key => {
    if (!['attributes', 'created_at', 'updated_at', 'metadata'].includes(key)) {
      console.log(`${key}: ${JSON.stringify(data[key]).substring(0, 50)}`);
    }
  });
  
  console.log('\n=== Attributes Object ===');
  if (data.attributes) {
    Object.keys(data.attributes).forEach(key => {
      console.log(`attributes.${key}: ${JSON.stringify(data.attributes[key]).substring(0, 50)}`);
    });
  }
  
  process.exit(0);
}

checkProduct().catch(console.error);
