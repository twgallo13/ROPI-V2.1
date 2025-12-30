const admin = require('firebase-admin');
const saKeyBase64 = process.env.GCP_SA_KEY_BASE64;
const saKey = JSON.parse(Buffer.from(saKeyBase64, 'base64').toString('utf8'));
if (!admin.apps.length) {
  admin.initializeApp({
    credential: admin.credential.cert(saKey),
    projectId: saKey.project_id
  });
}
const db = admin.firestore();

async function checkProduct(productId) {
  const doc = await db.collection('products').doc(productId).get();
  if (doc.exists) {
    const d = doc.data();
    console.log(`Product ${productId} exists:`);
    console.log('  last_received (top):', d.last_received);
    console.log('  attributes.last_received:', d.attributes?.last_received);
    console.log('  launch_date (top):', d.launch_date);
    console.log('  attributes.launch_date:', d.attributes?.launch_date);
    console.log('  _meta:', d._meta);
    console.log('\nFull JSON:');
    console.log(JSON.stringify(d, null, 2));
  } else {
    console.log(`Product ${productId} NOT FOUND`);
  }
}

const productId = process.argv[2] || '211737-90h1-8ab';
checkProduct(productId).then(() => process.exit(0));
