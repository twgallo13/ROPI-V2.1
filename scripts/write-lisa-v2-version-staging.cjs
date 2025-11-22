/**
 * Write Lisa v2.0 Version Metadata to Staging Firestore
 * Updates settings/meta/lisaVersion with v2.0 information
 */

const { initializeApp } = require('firebase-admin/app');
const { getFirestore } = require('firebase-admin/firestore');

initializeApp();

const VERSION_DATA = {
  version: 'v2.0',
  timestamp: '2025-11-22T05:43:47Z',
  commit: '612bc93930a390b9d44b5e5aba2f1c42a5695fb4',
  features: [
    'Dynamic importer UI reads from Firestore registry',
    'Registry-driven CSV auto-mapping',
    'Group → descriptive.gender mapping',
    'Variant Count excluded (empty importerColumns)',
    'Custom 2/3 and dropship fields integrated',
    '137 tests passing',
  ],
};

async function writeVersion() {
  const db = getFirestore();
  
  await db.collection('settings').doc('meta').set({
    lisaVersion: VERSION_DATA,
  }, { merge: true });
  
  console.log('✓ Lisa v2.0 version metadata written to staging settings/meta/lisaVersion');
  console.log(JSON.stringify(VERSION_DATA, null, 2));
}

writeVersion().catch(err => {
  console.error('Failed to write version:', err);
  process.exit(1);
});
