import { initializeApp, getApps } from 'firebase-admin/app';
import { getFirestore, FieldValue } from 'firebase-admin/firestore';
import fs from 'fs';
import path from 'path';

function ensureDir(p) { fs.mkdirSync(p, { recursive: true }); }

async function main() {
  const project = 'ropi-bccee';
  if (!getApps().length) initializeApp({ projectId: project });
  const db = getFirestore();
  
  const outDir = 'inventory/homer-attr-cleanup-2026-01-09/evidence';
  ensureDir(outDir);

  // BEFORE: snapshot settings/attributes document fields
  const docRef = db.doc('settings/attributes');
  const docSnap = await docRef.get();
  const beforeData = docSnap.data() || {};
  const beforeFields = Object.keys(beforeData);
  console.log('BEFORE fields on settings/attributes:', beforeFields);
  fs.writeFileSync(path.join(outDir, 'doc.before.json'), JSON.stringify({ fields: beforeFields, count: beforeFields.length }, null, 2));

  // DELETE all fields by overwriting with empty doc
  await docRef.set({}, { merge: false });
  console.log('✅ Cleared settings/attributes document (all fields deleted)');

  // AFTER: verify document is empty
  const afterSnap = await docRef.get();
  const afterData = afterSnap.data() || {};
  const afterFields = Object.keys(afterData);
  console.log('AFTER fields on settings/attributes:', afterFields.length === 0 ? '(empty)' : afterFields);
  fs.writeFileSync(path.join(outDir, 'doc.after.json'), JSON.stringify({ fields: afterFields, count: afterFields.length }, null, 2));

  // VERIFY keys subcollection still intact
  const keysRef = db.collection('settings/attributes/keys');
  const keysDocs = await keysRef.listDocuments();
  console.log(`✅ settings/attributes/keys subcollection: ${keysDocs.length} attributes intact`);
  
  // Verify one sample attribute
  const scomReg = await db.doc('settings/attributes/keys/scom_regular_price').get();
  if (scomReg.exists) {
    console.log(`✅ Sample: scom_regular_price still exists and is accessible`);
  } else {
    console.log('⚠️  scom_regular_price not found');
  }

  console.log('\n✅ Document cleanup complete. Evidence:', outDir);
}

main().catch(e => { console.error(e); process.exit(1); });
