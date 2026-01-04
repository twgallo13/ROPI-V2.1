const admin = require('firebase-admin');

admin.initializeApp();
const db = admin.firestore();

async function findRecentProducts() {
  // Get most recent products
  const productsSnap = await db.collection('products')
    .orderBy('createdAt', 'desc')
    .limit(10)
    .get();
  
  console.log(`\n📦 ${productsSnap.size} Most Recent Products:\n`);
  
  productsSnap.forEach(doc => {
    const product = doc.data();
    console.log(`ID: ${doc.id}`);
    console.log(`  MPN: ${product.mpn}`);
    console.log(`  Name: ${product.name}`);
    console.log(`  Created: ${product.createdAt}`);
    console.log(`  Age Group: ${product.attributes?.age_group || 'NOT SET'}`);
    console.log(`  RICS Category: ${product.attributes?.rics_category || 'NOT SET'}`);
    console.log(`  Smart Rules Ran: ${product._smartRulesRanAt || 'NEVER'}`);
    console.log('');
  });
}

findRecentProducts().then(() => process.exit(0)).catch(console.error);
