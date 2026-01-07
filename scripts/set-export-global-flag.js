// scripts/set-export-global-flag.js — disable flag
// Usage: node scripts/set-export-global-flag.js disable

const admin = require('firebase-admin');
const serviceAccount = require('../service-account.json');

admin.initializeApp({
  credential: admin.credential.cert(serviceAccount),
  projectId: serviceAccount.project_id || 'ropi-bccee'
});

const mode = process.argv[2] || 'disable';

async function main() {
  const db = admin.firestore();
  const docRef = db.collection('settings').doc('exportSettings');
  
  if (mode === 'disable') {
    await docRef.set({ exportGlobalMode: { enabled: false, mode: 'SITE_SCOPED' } }, { merge: true });
    console.log('Flag disabled: exportGlobalMode.enabled = false');
  } else if (mode === 'enable') {
    await docRef.set({ exportGlobalMode: { enabled: true, mode: 'GLOBAL' } }, { merge: true });
    console.log('Flag enabled: exportGlobalMode.enabled = true, mode = GLOBAL');
  }
}

main().catch(e => {
  console.error('Error:', e);
  process.exit(1);
});
