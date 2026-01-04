const admin = require('firebase-admin');

admin.initializeApp();
const db = admin.firestore();

async function checkProduct18() {
  const productDoc = await db.collection('products').doc('18-test').get();
  
  if (!productDoc.exists) {
    console.log('❌ Product not found');
    return;
  }
  
  const product = productDoc.data();
  
  console.log('\n📦 Product 18-test Full Data:\n');
  console.log(JSON.stringify(product, null, 2));
}

checkProduct18().then(() => process.exit(0)).catch(console.error);
