import admin from 'firebase-admin';
import { readFileSync } from 'fs';

const serviceAccount = JSON.parse(readFileSync('./firebase-credentials.json', 'utf8'));
admin.initializeApp({ credential: admin.credential.cert(serviceAccount) });

const db = admin.firestore();
const doc = await db.collection('products').doc('FD ZAHARA-S-WHT').get();

if (doc.exists) {
  const data = doc.data();
  console.log('Product fields present:');
  console.log('- sku_core:', Object.keys(data.sku_core || {}));
  console.log('- descriptive:', Object.keys(data.descriptive || {}));
  console.log('- rics_source:', data.rics_source ? 'present' : 'MISSING');
  console.log('\nRICS data:', JSON.stringify(data.rics_source, null, 2).substring(0, 500));
} else {
  console.log('Product not found');
}

process.exit(0);
