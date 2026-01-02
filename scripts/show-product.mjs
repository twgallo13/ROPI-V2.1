import admin from 'firebase-admin';
import { getFirestore } from 'firebase-admin/firestore';

if (!admin.apps.length) {
  admin.initializeApp({ projectId: 'ropi-bccee' });
}
const db = getFirestore();

const productId = process.argv[2] || '2-test';
const productDoc = await db.collection('products').doc(productId).get();

if (!productDoc.exists) {
  console.log(`Product ${productId} not found`);
  process.exit(1);
}

const data = productDoc.data();
console.log('=== PRODUCT:', productId, '===');
console.log('Core:', JSON.stringify(data.core, null, 2));
console.log('\nAttributes:', JSON.stringify(data.attributes, null, 2));
console.log('\nProvenance:', JSON.stringify(data.provenance, null, 2));
console.log('\n_smartRulesRanAt:', data._smartRulesRanAt);
console.log('_appliedRules:', JSON.stringify(data._appliedRules, null, 2));
