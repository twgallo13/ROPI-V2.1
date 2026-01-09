const admin = require('firebase-admin');
try {
  admin.initializeApp();
} catch(e) {}
const db = admin.firestore();

(async () => {
  const doc = await db.collection('products').doc('14-test').get();
  if (doc.exists) {
    const data = doc.data();
    console.log('Product 14-test attributes:');
    const requiredAttrs = ['sku', 'mpn', 'name', 'brand', 'website', 'product_is_active', 'category', 'class', 'department'];
    requiredAttrs.forEach(attr => {
      const val = data.attributes?.[attr];
      console.log(`${attr}: type=${typeof val} value=${val} hasValue=${!!val}`);
    });
  } else {
    console.log('Product 14-test not found');
  }
})().catch(e => console.error('Error:', e.message));
