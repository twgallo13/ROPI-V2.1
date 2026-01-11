/**
 * Optional migration: set ai_use:false on all attributes that lack the field.
 * RUN THIS ONLY IF YOU WANT ai_use TO BE PRESENT IN EVERY DOCUMENT.
 * Homer should run this with service account credentials (DO NOT RUN LOCALLY WITHOUT CREDENTIALS).
 */
const admin = require('firebase-admin');

if (!admin.apps.length) {
  admin.initializeApp();
}

async function run() {
  const db = admin.firestore();
  const col = db.collection('settings/attributes/keys');
  const snapshot = await col.get();
  console.log(`Found ${snapshot.size} attribute docs`);
  let batch = db.batch();
  let opCount = 0;
  const BATCH_LIMIT = 500;

  for (const doc of snapshot.docs) {
    const data = doc.data();
    if (data.ai_use === undefined) {
      batch.update(doc.ref, { ai_use: false });
      opCount++;
    }
    if (opCount >= BATCH_LIMIT) {
      await batch.commit();
      console.log(`Committed ${opCount} updates`);
      batch = db.batch();
      opCount = 0;
    }
  }

  if (opCount > 0) {
    await batch.commit();
    console.log(`Committed ${opCount} updates`);
  }

  console.log('Done');
  process.exit(0);
}

run().catch(err => {
  console.error('Migration failed:', err);
  process.exit(1);
});