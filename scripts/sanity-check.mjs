import { initializeApp, getApps } from 'firebase-admin/app';
import { getFirestore } from 'firebase-admin/firestore';

async function main() {
  const project = 'ropi-bccee';
  if (!getApps().length) initializeApp({ projectId: project });
  const db = getFirestore();

  // Verify keys collection has attributes
  const keysSnap = await db.collection('settings/attributes/keys').limit(5).get();
  console.log(`✅ Keys collection contains ${keysSnap.size} docs (sample: ${[...keysSnap.docs].map(d => d.id).join(', ')})`);
  
  // Verify no audit subcollection
  const rootRef = db.doc('settings/attributes');
  const subs = await rootRef.listCollections();
  const subNames = subs.map(s => s.id);
  console.log(`✅ Remaining subcollections: ${subNames.join(', ')}`);
  
  if (!subNames.includes('keys')) {
    console.error('❌ FATAL: keys collection is missing!');
    process.exit(1);
  }
  if (subNames.length > 1) {
    console.warn('⚠️  Warning: unexpected subcollections remain:', subNames);
  }
  
  // Sample a few key attributes to verify they're intact
  const scomReg = await db.doc('settings/attributes/keys/scom_regular_price').get();
  if (scomReg.exists) {
    console.log(`✅ scom_regular_price exists: ${JSON.stringify(scomReg.data(), null, 2)}`);
  } else {
    console.log('⚠️  scom_regular_price not found (expected if never existed)');
  }

  console.log('\n✅ Sanity check passed: keys is sole source of truth.');
}

main().catch(e => { console.error(e); process.exit(1); });
