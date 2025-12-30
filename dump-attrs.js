const admin = require('firebase-admin');
const path = require('path');

const serviceAccount = require(path.resolve('/workspaces/ROPI-V2.1/service-account.json'));
admin.initializeApp({
  credential: admin.credential.cert(serviceAccount),
  projectId: serviceAccount.project_id,
});

const db = admin.firestore();

async function check() {
  const snapshot = await db.collection('attributes').limit(100).get();
  console.log(`Total documents: ${snapshot.size}\n`);
  
  // Find our attributes
  const ours = snapshot.docs.filter(doc => {
    const id = doc.id;
    return ['scom_regular_price', 'scom_sale_price', 'standard_shipping_override', 'expedited_override_shipping'].includes(id);
  });

  console.log(`Found ${ours.length} of our attributes:\n`);
  ours.forEach(doc => {
    console.log(`📄 ${doc.id}:`);
    console.log(`   data_type: ${doc.data().data_type}`);
  });

  await admin.app().delete();
}

check().catch(e => console.error('Error:', e.message));
