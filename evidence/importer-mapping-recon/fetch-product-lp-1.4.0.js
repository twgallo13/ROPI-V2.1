/**
 * LP-1.4.0 Evidence Collection Script
 * Fetches product 211737-90h1-8 from Firestore to verify field shapes
 */
const admin = require('firebase-admin');
const path = require('path');
const serviceAccount = require(path.resolve(__dirname, '../../service-account.json'));

admin.initializeApp({
  credential: admin.credential.cert(serviceAccount)
});

const db = admin.firestore();

async function run() {
  const doc = await db.collection('products').doc('211737-90h1-8').get();
  if (!doc.exists) {
    console.log('Product not found');
    return;
  }
  const data = doc.data();
  console.log('=== Product 211737-90h1-8 ===');
  console.log('name:', data.name);
  console.log('title:', data.title);
  console.log('material:', JSON.stringify(data.material), 'isArray:', Array.isArray(data.material));
  console.log('website:', JSON.stringify(data.website), 'isArray:', Array.isArray(data.website));
  console.log('age_group:', data.age_group);
  console.log('class:', data.class);
  console.log('category:', data.category);
  console.log('gender:', data.gender);
  console.log('department:', data.department);
  if (data.attributes) {
    console.log('\n--- attributes sub-object ---');
    console.log('attributes.material:', JSON.stringify(data.attributes.material));
    console.log('attributes.website:', JSON.stringify(data.attributes.website));
    console.log('attributes.age_group:', data.attributes.age_group);
    console.log('attributes.class:', data.attributes.class);
    console.log('attributes.category:', data.attributes.category);
  }
  console.log('\n--- Full Document JSON ---');
  console.log(JSON.stringify(data, null, 2));
}

run().then(function() { process.exit(0); }).catch(function(e) { console.error(e); process.exit(1); });
