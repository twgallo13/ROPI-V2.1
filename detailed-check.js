const admin = require('firebase-admin');
const path = require('path');

const serviceAccount = require(path.resolve('/workspaces/ROPI-V2.1/service-account.json'));
admin.initializeApp({
  credential: admin.credential.cert(serviceAccount),
  projectId: serviceAccount.project_id,
});

const db = admin.firestore();

async function check() {
  console.log('\n📋 Detailed Firebase Attributes Check:\n');
  
  const snapshot = await db.collection('attributes')
    .where('attribute_id', 'in', [
      'scom_regular_price',
      'scom_sale_price',
      'standard_shipping_override',
      'expedited_override_shipping'
    ])
    .get();

  console.log(`Found ${snapshot.size} documents\n`);
  
  snapshot.forEach(doc => {
    const data = doc.data();
    console.log(`Document ID: ${doc.id}`);
    console.log(`Data:`, JSON.stringify(data, null, 2));
    console.log('---\n');
  });

  await admin.app().delete();
}

check().catch(e => console.error('Error:', e.message));
