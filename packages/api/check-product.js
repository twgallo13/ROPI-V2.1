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

async function checkProduct() {
  const doc = await db.collection('products').doc('211737-90h1-8').get();
  if (doc.exists) {
    const d = doc.data();
    console.log('Product 211737-90h1-8 exists:');
    console.log('  launch_date (top):', d.launch_date);
    console.log('  launchDate (top):', d.launchDate);
    console.log('  attributes.launch_date:', d.attributes?.launch_date);
    console.log('  kl_post_date (top):', d.kl_post_date);
    console.log('  attributes.kl_post_date:', d.attributes?.kl_post_date);
    console.log('  hide_image_date (top):', d.hide_image_date);
    console.log('  attributes.hide_image_date:', d.attributes?.hide_image_date);
  } else {
    console.log('Product 211737-90h1-8 NOT FOUND');
  }
}
checkProduct().then(() => process.exit(0));
