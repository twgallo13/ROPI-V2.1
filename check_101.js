const admin = require('firebase-admin');
admin.initializeApp();
const db = admin.firestore();

(async () => {
  const doc = await db.collection('products').doc('101-test').get();
  if (!doc.exists) {
    console.log('Product not found');
    process.exit(1);
  }
  
  const data = doc.data();
  console.log('Firestore raw data for 101-test:');
  console.log('height (top):', data.height);
  console.log('attributes.height:', data.attributes?.height);
  console.log('length (top):', data.length);
  console.log('attributes.length:', data.attributes?.length);
  console.log('width (top):', data.width);
  console.log('attributes.width:', data.attributes?.width);
  console.log('weight (top):', data.weight);
  console.log('attributes.weight:', data.attributes?.weight);
  
  process.exit(0);
})();
