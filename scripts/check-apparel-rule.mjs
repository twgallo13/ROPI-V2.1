import admin from 'firebase-admin';
import { getFirestore } from 'firebase-admin/firestore';

if (!admin.apps.length) {
  admin.initializeApp({ projectId: 'ropi-bccee' });
}
const db = getFirestore();

const doc = await db.doc('settings/smartRules/rules/rule_1767350520854_xpfska').get();
console.log('Apparel Rule Full Data:');
console.log(JSON.stringify(doc.data(), null, 2));
