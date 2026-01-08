#!/usr/bin/env node
/**
 * Toggle GLOBAL mode and capture Firestore state
 * HES C Step 2 automation helper
 */

const admin = require('firebase-admin');
const fs = require('fs');
const path = require('path');

const EVIDENCE_DIR = path.join(__dirname, '../../../evidence/lp-export-ui-attr-fix');
const PROJECT_ID = 'ropi-bccee';

// Initialize Firebase Admin with service account from environment
let serviceAccount;
if (process.env.GCP_SA_KEY_BASE64) {
  const decoded = Buffer.from(process.env.GCP_SA_KEY_BASE64, 'base64').toString();
  serviceAccount = JSON.parse(decoded);
} else {
  console.error('ERROR: GCP_SA_KEY_BASE64 environment variable not set');
  process.exit(1);
}

if (!admin.apps.length) {
  admin.initializeApp({
    credential: admin.credential.cert(serviceAccount),
    projectId: PROJECT_ID
  });
}

const db = admin.firestore();

async function captureFirestoreBaseline() {
  console.log('[Baseline] Capturing Firestore state...');
  
  // Get settings/attributesMeta
  const attrsMetaDoc = await db.doc('settings/attributesMeta').get();
  if (attrsMetaDoc.exists) {
    const data = attrsMetaDoc.data();
    const outputPath = path.join(EVIDENCE_DIR, 'baseline/firestore-baseline/settings-attributesMeta.json');
    fs.mkdirSync(path.dirname(outputPath), { recursive: true });
    fs.writeFileSync(outputPath, JSON.stringify(data, null, 2));
    console.log(`✓ Saved: ${outputPath}`);
  } else {
    console.warn('⚠ settings/attributesMeta not found');
  }
  
  // Get a sample classification attribute
  const attrsSnapshot = await db.collection('attributes').limit(1).get();
  if (!attrsSnapshot.empty) {
    const sampleDoc = attrsSnapshot.docs[0];
    const data = sampleDoc.data();
    const outputPath = path.join(EVIDENCE_DIR, `baseline/firestore-baseline/attribute-${sampleDoc.id}.json`);
    fs.writeFileSync(outputPath, JSON.stringify({ id: sampleDoc.id, ...data }, null, 2));
    console.log(`✓ Saved: ${outputPath}`);
  } else {
    console.warn('⚠ No attributes found');
  }
  
  // Get current exportSettings
  const exportSettingsDoc = await db.doc('settings/exportSettings').get();
  const currentMode = exportSettingsDoc.exists ? exportSettingsDoc.data()?.exportGlobalMode : null;
  console.log(`Current exportGlobalMode: ${currentMode}`);
  
  return currentMode;
}

async function toggleGlobalMode(enable) {
  console.log(`[Toggle] Setting exportGlobalMode to ${enable}...`);
  
  const timestamp = new Date().toISOString();
  await db.doc('settings/exportSettings').set({
    exportGlobalMode: enable,
    updatedAt: timestamp,
    updatedBy: 'HES-C-automation'
  }, { merge: true });
  
  // Document toggle
  const toggleEvidence = `
# GLOBAL Mode Toggle Evidence

**Timestamp:** ${timestamp}
**Actor:** HES-C-automation (Homer)
**Firestore Path:** settings/exportSettings
**Field:** exportGlobalMode
**Value Set:** ${enable}
**Method:** Firebase Admin SDK (Node.js script)

## Verification

Firestore document updated successfully.
Wait 30 seconds for cache refresh before API calls.
`;
  
  const dir = enable ? 'global-mode' : 'baseline';
  const outputPath = path.join(EVIDENCE_DIR, `${dir}/toggle-evidence.txt`);
  fs.mkdirSync(path.dirname(outputPath), { recursive: true });
  fs.writeFileSync(outputPath, toggleEvidence);
  console.log(`✓ Toggle evidence saved: ${outputPath}`);
  console.log(`✓ exportGlobalMode set to: ${enable}`);
  console.log(`⏳ Wait 30 seconds for cache refresh...`);
}

async function main() {
  const command = process.argv[2];
  
  if (command === 'capture-baseline') {
    await captureFirestoreBaseline();
  } else if (command === 'enable-global') {
    await toggleGlobalMode(true);
  } else if (command === 'disable-global') {
    await toggleGlobalMode(false);
  } else {
    console.log('Usage:');
    console.log('  node toggle-global.js capture-baseline  # Capture Firestore baseline state');
    console.log('  node toggle-global.js enable-global     # Enable GLOBAL mode');
    console.log('  node toggle-global.js disable-global    # Disable GLOBAL mode');
    process.exit(1);
  }
  
  process.exit(0);
}

main().catch(err => {
  console.error('Error:', err);
  process.exit(1);
});
