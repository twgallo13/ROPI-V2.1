// scripts/dumpVocabs.mjs
import admin from 'firebase-admin';

// Initialize with application default credentials (from environment)
admin.initializeApp({
  projectId: 'ropi-bccee'
});

const db = admin.firestore();

async function dump(vocab) {
  const col = db.collection('settings').doc(vocab).collection('items');
  const snap = await col.get();
  console.log(`\n== ${vocab} (${snap.size} items) ==`);
  snap.forEach(doc => {
    console.log(`  ${doc.id}:`, doc.data());
  });
}

(async () => {
  try {
    await dump('heelTypes');
    await dump('shoeHeightMaps');
    await dump('soleMaterials');
    process.exit(0);
  } catch (err) {
    console.error('Error:', err);
    process.exit(1);
  }
})();
