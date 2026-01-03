import admin from 'firebase-admin';
import { getFirestore } from 'firebase-admin/firestore';

if (!admin.apps.length) {
  admin.initializeApp({ projectId: 'ropi-bccee' });
}
const db = getFirestore();

const rulesSnap = await db.collection('settings/smartRules/rules').get();
console.log('=== SMART RULES DETAILS ===');
console.log('Total rules:', rulesSnap.size);

for (const doc of rulesSnap.docs) {
  const data = doc.data();
  console.log('\n========================================');
  console.log('Rule ID:', doc.id);
  console.log('Name:', data.name);
  console.log('Enabled:', data.enabled);
  console.log('autoApply:', data.autoApply);
  console.log('autoApplyConfidence:', data.autoApplyConfidence);
  console.log('Condition:', JSON.stringify(data.condition, null, 2));
  console.log('Action:', JSON.stringify(data.action, null, 2));
}
