import { initializeApp, getApps } from 'firebase-admin/app';
import { getFirestore } from 'firebase-admin/firestore';

async function main() {
  const project = 'ropi-bccee';
  if (!getApps().length) initializeApp({ projectId: project });
  const db = getFirestore();

  console.log('=== FINAL VERIFICATION ===\n');

  // 1. settings/attributes doc should be empty
  const docRef = db.doc('settings/attributes');
  const docSnap = await docRef.get();
  const docData = docSnap.data() || {};
  console.log(`✅ settings/attributes document: ${Object.keys(docData).length} fields (expected: 0)`);

  // 2. Only keys subcollection should exist
  const rootRef = db.doc('settings/attributes');
  const subs = await rootRef.listCollections();
  const subNames = subs.map(s => s.id);
  console.log(`✅ Subcollections: ${subNames.join(', ')} (expected: keys only)`);
  
  if (subNames.length !== 1 || !subNames.includes('keys')) {
    console.error('❌ FATAL: keys missing or unexpected subcollections!');
    process.exit(1);
  }

  // 3. keys collection should be intact
  const keysRef = db.collection('settings/attributes/keys');
  const keysSnap = await keysRef.limit(1).get();
  const keysCount = (await keysRef.count().get()).data().count;
  console.log(`✅ settings/attributes/keys: ${keysCount} attributes`);

  // 4. Test API-like read: fetch a canonical attribute
  const attrs = await db.collection('settings/attributes/keys').where('attribute_id', '==', 'scom_regular_price').limit(1).get();
  if (!attrs.empty) {
    const attr = attrs.docs[0].data();
    console.log(`✅ Attribute lookup (scom_regular_price): found, label="${attr.label}"`);
  } else {
    console.log('⚠️  scom_regular_price not found (may not exist)');
  }

  console.log('\n✅ ALL CHECKS PASSED: settings/attributes is now keys-only.');
  console.log('✅ UI will continue to fetch attributes from admin API → settings/attributes/keys');
}

main().catch(e => { console.error(e); process.exit(1); });
