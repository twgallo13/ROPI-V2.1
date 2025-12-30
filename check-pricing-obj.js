const admin = require('firebase-admin');
const path = require('path');

const serviceAccount = require(path.resolve('/workspaces/ROPI-V2.1/service-account.json'));
admin.initializeApp({
  credential: admin.credential.cert(serviceAccount),
  projectId: serviceAccount.project_id,
});

const db = admin.firestore();

async function check() {
  // Get a product that likely has the issue
  const snapshot = await db.collection('products').limit(10).get();
  
  console.log('\n📋 SCOM Price Storage Patterns:\n');
  
  snapshot.docs.forEach((doc, idx) => {
    const product = doc.data();
    console.log(`\nProduct ${idx + 1}: ${doc.id}`);
    console.log(`  product.scom_regular_price: ${JSON.stringify(product.scom_regular_price)}`);
    console.log(`  product.scom_sale_price: ${JSON.stringify(product.scom_sale_price)}`);
    console.log(`  product.pricing: ${JSON.stringify(product.pricing)}`);
    console.log(`  typeof scom_regular: ${typeof product.scom_regular_price}`);
    console.log(`  typeof pricing?.scom_regular: ${typeof product.pricing?.scom_regular_price}`);
  });

  await admin.app().delete();
}

check().catch(e => console.error('❌ Error:', e.message));
