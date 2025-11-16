// scripts/findProductByMPN.js
import admin from 'firebase-admin';

if (!admin.apps.length) {
  admin.initializeApp({
    credential: admin.credential.applicationDefault(), // or path to service account if needed
  });
}
const db = admin.firestore();

const mpn = process.argv[2];
if (!mpn) {
  console.error('Usage: node scripts/findProductByMPN.js <MPN>');
  process.exit(1);
}

(async () => {
  try {
    const q = db.collection('products').where('sku_core.mpn', '==', mpn);
    const snap = await q.get();
    if (snap.empty) {
      console.log('No product found for MPN', mpn);
      process.exit(0);
    }
    snap.forEach((doc) => {
      console.log('DOC_ID:', doc.id);
      console.log(JSON.stringify(doc.data(), null, 2));
    });
    process.exit(0);
  } catch (err) {
    console.error('Error querying Firestore:', err?.message || err);
    process.exit(2);
  }
})();
