const admin = require('firebase-admin');
const path = require('path');

const serviceAccount = require(path.resolve('/workspaces/ROPI-V2.1/service-account.json'));
admin.initializeApp({
  credential: admin.credential.cert(serviceAccount),
  projectId: serviceAccount.project_id,
});

const db = admin.firestore();

async function check() {
  console.log('\n📋 Complete SCOM & Shipping Attributes:\n');
  
  const attrs = ['scom_regular_price', 'scom_sale_price', 'standard_shipping_override', 'expedited_override_shipping'];
  
  for (const attr of attrs) {
    const doc = await db.collection('attributes').doc(attr).get();
    if (doc.exists) {
      const data = doc.data();
      console.log(`\n${attr}:`);
      console.log(JSON.stringify(data, null, 2));
    }
  }

  await admin.app().delete();
}

check().catch(e => console.error('❌ Error:', e.message));
