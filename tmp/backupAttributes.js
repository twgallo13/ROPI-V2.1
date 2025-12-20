// tmp/backupAttributes.js
const admin = require('firebase-admin');
const fs = require('fs');
const path = require('path');

if (!admin.apps.length) {
  const keyBase64 = process.env.GCP_SA_KEY_BASE64;
  if (keyBase64) {
    const key = JSON.parse(Buffer.from(keyBase64, 'base64').toString('utf8'));
    admin.initializeApp({ credential: admin.credential.cert(key) });
  } else {
    admin.initializeApp();
  }
}

const db = admin.firestore();
(async () => {
  const snapshots = await db.collection('settings/attributes/keys').get();
  const out = {};
  snapshots.forEach(doc => out[doc.id] = doc.data());
  const ts = new Date().toISOString().replace(/[:.]/g, '-');
  const outPath = path.resolve(__dirname, `../backups/attributes-backup-${ts}.json`);
  fs.writeFileSync(outPath, JSON.stringify(out, null, 2), 'utf8');
  console.log('WROTE BACKUP', outPath);
  console.log('Total documents:', Object.keys(out).length);
  console.log('File size:', fs.statSync(outPath).size, 'bytes');
  // Print first and last few entries
  const keys = Object.keys(out).sort();
  console.log('First 3 entries:', keys.slice(0, 3));
  console.log('Last 3 entries:', keys.slice(-3));
})();
