import { initializeApp, getApps } from 'firebase-admin/app';
import { getFirestore } from 'firebase-admin/firestore';
import fs from 'fs';
import path from 'path';

function ensureDir(p) { fs.mkdirSync(p, { recursive: true }); }

async function main() {
  const project = 'ropi-bccee';
  if (!getApps().length) initializeApp({ projectId: project });
  const db = getFirestore();
  
  const outDir = 'inventory/homer-attr-cleanup-2026-01-09/evidence';
  ensureDir(outDir);

  // BEFORE: snapshot non-keys subcollections
  const rootRef = db.doc('settings/attributes');
  const subs = await rootRef.listCollections();
  const before = {};
  for (const sub of subs) {
    if (sub.id === 'keys') continue; // skip keys
    const docs = await sub.listDocuments();
    before[sub.id] = docs.length;
  }
  fs.writeFileSync(path.join(outDir, 'before.json'), JSON.stringify({ timestamp: new Date().toISOString(), toDelete: before }, null, 2));
  console.log('BEFORE:', JSON.stringify(before, null, 2));

  // DELETE all non-keys subcollections
  const toDelete = Object.keys(before);
  for (const subId of toDelete) {
    const collRef = db.collection(`settings/attributes/${subId}`);
    const docs = await collRef.listDocuments();
    let deleted = 0;
    for (let i = 0; i < docs.length; i += 250) {
      const batch = db.batch();
      for (const d of docs.slice(i, i + 250)) batch.delete(d);
      await batch.commit();
      deleted += Math.min(250, docs.length - i);
    }
    console.log(`Deleted ${deleted} docs from settings/attributes/${subId}`);
  }

  // AFTER: verify keys still exists
  const keysRef = db.collection('settings/attributes/keys');
  const keysDocs = await keysRef.listDocuments();
  const after = { keys: keysDocs.length };
  fs.writeFileSync(path.join(outDir, 'after.json'), JSON.stringify({ timestamp: new Date().toISOString(), result: after }, null, 2));
  console.log('AFTER:', JSON.stringify(after, null, 2));
  console.log('✅ Cleanup complete. Evidence:', outDir);
}

main().catch(e => { console.error(e); process.exit(1); });
