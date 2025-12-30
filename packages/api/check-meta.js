const admin = require('firebase-admin');
const fs = require('fs');

const saKeyBase64 = process.env.GCP_SA_KEY_BASE64;
const saKey = JSON.parse(Buffer.from(saKeyBase64, 'base64').toString('utf8'));

if (!admin.apps.length) {
  admin.initializeApp({
    credential: admin.credential.cert(saKey),
    projectId: saKey.project_id
  });
}
const db = admin.firestore();

const PRODUCTS = ['211737-90h1-8', '451-9204-blk18a', '211737-90h1-8a'];

async function checkProducts() {
  for (const productId of PRODUCTS) {
    const doc = await db.collection('products').doc(productId).get();
    if (!doc.exists) {
      console.log(`\n${productId}: NOT FOUND`);
      continue;
    }
    
    const data = doc.data();
    const fullPath = `/tmp/normalize-${productId}-firestore-full.json`;
    fs.writeFileSync(fullPath, JSON.stringify(data, null, 2));
    
    console.log(`\n=== ${productId} ===`);
    console.log('Date fields in attributes:');
    
    const dateKeys = ['launch_date', 'kl_post_date', 'hide_image_date', 'first_received'];
    const meta = data._meta || {};
    
    for (const key of dateKeys) {
      const attrValue = data.attributes?.[key];
      const topValue = data[key];
      const metaEntry = meta[key];
      
      if (attrValue || topValue) {
        console.log(`  ${key}:`);
        console.log(`    attributes.${key}: ${attrValue || '(not set)'}`);
        console.log(`    top-level: ${topValue || '(not set)'}`);
        console.log(`    _meta.${key}: ${metaEntry ? JSON.stringify(metaEntry) : '(not set)'}`);
      }
    }
    
    // Check for admin-protected fields
    if (meta.adminProtected && meta.adminProtected.length > 0) {
      console.log(`  Admin-protected keys: ${meta.adminProtected.join(', ')}`);
    }
  }
}

checkProducts().then(() => process.exit(0)).catch(e => {
  console.error(e);
  process.exit(1);
});
