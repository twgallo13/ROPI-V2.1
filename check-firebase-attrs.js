const admin = require('firebase-admin');
const path = require('path');

const serviceAccount = require(path.resolve('/workspaces/ROPI-V2.1/service-account.json'));
admin.initializeApp({
  credential: admin.credential.cert(serviceAccount),
  projectId: serviceAccount.project_id,
});

const db = admin.firestore();

const attrs = [
  'scom_regular_price',
  'scom_sale_price', 
  'standard_shipping_override',
  'expedited_override_shipping'
];

async function check() {
  console.log('\n📋 Firebase Attribute Data Types:\n');
  for (const attr of attrs) {
    const doc = await db.collection('attributes').doc(attr).get();
    if (doc.exists) {
      const data = doc.data();
      console.log(`${attr}:`);
      console.log(`  - data_type: ${data.data_type}`);
      console.log(`  - status: ${data.status}`);
    } else {
      console.log(`${attr}: NOT FOUND`);
    }
  }
  await admin.app().delete();
}

check();
