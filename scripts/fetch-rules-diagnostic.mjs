import admin from 'firebase-admin';
import { getFirestore } from 'firebase-admin/firestore';

if (!admin.apps.length) {
  admin.initializeApp({ projectId: 'ropi-bccee' });
}
const db = getFirestore();

// List all collections
const collections = await db.listCollections();
console.log('=== ALL COLLECTIONS ===');
for (const col of collections) {
  const snap = await col.limit(1).get();
  console.log(col.id, '- docs:', snap.size > 0 ? 'has data' : 'empty');
}

// Check smartRules specifically
console.log('\n=== smartRules collection ===');
const rulesSnap = await db.collection('smartRules').get();
console.log('Total docs:', rulesSnap.size);

// Also check settings/smartRules path
console.log('\n=== settings/smartRules path ===');
const settingsRulesSnap = await db.collection('settings').doc('smartRules').get();
console.log('Exists:', settingsRulesSnap.exists);
if (settingsRulesSnap.exists) {
  console.log('Data:', JSON.stringify(settingsRulesSnap.data(), null, 2));
}

// Check any subcollections under settings
const settingsCollections = await db.collection('settings').listDocuments();
console.log('\n=== settings documents ===');
for (const docRef of settingsCollections) {
  const doc = await docRef.get();
  console.log(docRef.id, ':', doc.exists ? 'exists' : 'missing');
}
