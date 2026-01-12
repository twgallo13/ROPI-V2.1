const admin = require('firebase-admin');
if (!admin.apps.length) {
  admin.initializeApp({ projectId: 'ropi-bccee' });
}
const db = admin.firestore();

async function checkProducts() {
  console.log('\n🔍 Checking products 104-test and 109-test...');
  
  // Check various case variations
  const testIds = ['104-test', '104-TEST', '109-test', '109-TEST'];
  
  for (const id of testIds) {
    try {
      const doc = await db.collection('products').doc(id).get();
      console.log(`  ${id}: ${doc.exists ? '✅ EXISTS' : '❌ NOT FOUND'}`);
      if (doc.exists) {
        const data = doc.data();
        console.log(`    mpn: ${data.mpn || 'N/A'}, title: ${data.title || data.name || 'N/A'}`);
      }
    } catch (err) {
      console.log(`  ${id}: ❌ ERROR - ${err.message}`);
    }
  }
  
  // Check product_mappings
  console.log('\n🔍 Checking product_mappings...');
  for (const id of testIds) {
    try {
      const doc = await db.collection('product_mappings').doc(id).get();
      if (doc.exists) {
        console.log(`  ${id}: ✅ MAPPED TO ${doc.data().productDocId}`);
      } else {
        console.log(`  ${id}: ❌ NO MAPPING`);
      }
    } catch (err) {
      console.log(`  ${id}: ❌ ERROR - ${err.message}`);
    }
  }
}

checkProducts().then(() => process.exit(0)).catch(err => {
  console.error('Error:', err);
  process.exit(1);
});
