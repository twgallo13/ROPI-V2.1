const admin = require('firebase-admin');
const path = require('path');

const serviceAccount = require(path.resolve('/workspaces/ROPI-V2.1/service-account.json'));
admin.initializeApp({
  credential: admin.credential.cert(serviceAccount),
  projectId: serviceAccount.project_id,
});

const db = admin.firestore();

async function check() {
  // Get first few products to check structure
  const snapshot = await db.collection('products').limit(5).get();
  
  console.log(`\nFound ${snapshot.size} products. Checking structure:\n`);
  
  snapshot.docs.forEach((doc, idx) => {
    const product = doc.data();
    console.log(`Product ${idx + 1}: ${doc.id}`);
    console.log(`  scom_regular_price: ${product.scom_regular_price}`);
    console.log(`  scom_sale_price: ${product.scom_sale_price}`);
    console.log(`  pricing?.scom_regular_price: ${product.pricing?.scom_regular_price}`);
    console.log(`  pricing?.scom_sale_price: ${product.pricing?.scom_sale_price}`);
    console.log(`  standard_shipping_override: ${product.standard_shipping_override}`);
    console.log(`  expedited_override_shipping: ${product.expedited_override_shipping}`);
    console.log('');
  });

  await admin.app().delete();
}

check().catch(e => console.error('❌ Error:', e.message));
