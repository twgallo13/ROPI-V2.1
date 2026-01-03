#!/usr/bin/env node
/**
 * exportRegistrySnapshot.mjs
 * Exports settings/attributes and settings/attributesMeta to a JSON file (backup).
 * 
 * Usage:
 *   node exportRegistrySnapshot.mjs --out artifacts/registry-backup.json
 * 
 * Environment:
 *   Requires GCP_SA_KEY_BASE64 or GOOGLE_APPLICATION_CREDENTIALS to be set.
 */

import fs from 'fs';
import path from 'path';
import admin from 'firebase-admin';
import yargs from 'yargs';
import { hideBin } from 'yargs/helpers';

const argv = yargs(hideBin(process.argv))
  .option('out', { 
    type: 'string', 
    demandOption: true,
    describe: 'Output file path for registry snapshot'
  })
  .argv;

function initAdmin() {
  if (!admin.apps.length) {
    if (process.env.GOOGLE_APPLICATION_CREDENTIALS && fs.existsSync(process.env.GOOGLE_APPLICATION_CREDENTIALS)) {
      admin.initializeApp({ 
        credential: admin.credential.cert(process.env.GOOGLE_APPLICATION_CREDENTIALS) 
      });
    } else if (process.env.GCP_SA_KEY_BASE64) {
      const key = JSON.parse(Buffer.from(process.env.GCP_SA_KEY_BASE64, 'base64').toString('utf8'));
      admin.initializeApp({ 
        credential: admin.credential.cert(key) 
      });
    } else {
      throw new Error('No credentials for admin SDK. Set GOOGLE_APPLICATION_CREDENTIALS or GCP_SA_KEY_BASE64');
    }
  }
}

async function exportSnapshot(outPath) {
  initAdmin();
  const db = admin.firestore();
  
  console.log('Fetching settings/attributes...');
  const attrsSnap = await db.collection('settings').doc('attributes').get();
  
  console.log('Fetching settings/attributesMeta...');
  const metaSnap = await db.collection('settings').doc('attributesMeta').get();
  
  const result = {
    attributes: attrsSnap.exists ? attrsSnap.data() : null,
    attributesMeta: metaSnap.exists ? metaSnap.data() : null,
    exportedAt: new Date().toISOString(),
  };
  
  const dir = path.dirname(outPath);
  fs.mkdirSync(dir, { recursive: true });
  fs.writeFileSync(outPath, JSON.stringify(result, null, 2), 'utf8');
  
  console.log(`✓ Exported registry snapshot to ${outPath}`);
  console.log(`  Attributes count: ${Object.keys(attrsSnap.data() || {}).length}`);
  console.log(`  Registry version: ${metaSnap.data()?.registry_version || 'N/A'}`);
}

(async () => {
  try {
    await exportSnapshot(argv.out);
    process.exit(0);
  } catch (err) {
    console.error('✗ Export failed:', err.message);
    process.exit(1);
  }
})();
