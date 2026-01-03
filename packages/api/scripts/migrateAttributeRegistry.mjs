#!/usr/bin/env node
/**
 * migrateAttributeRegistry.mjs
 * 
 * Migrates attribute registry from SDK source to Firestore.
 * Supports --dry-run (plan only) and --apply (write changes).
 * 
 * Usage:
 *   node migrateAttributeRegistry.mjs --source packages/sdk/config/attributeRegistry.json --dry-run
 *   node migrateAttributeRegistry.mjs --source packages/sdk/config/attributeRegistry.json --apply
 *
 * Behavior:
 *   - Dry-run: calculates changes and outputs plan (no writes)
 *   - Apply: writes attributes to settings/attributes, updates settings/attributesMeta.registry_version,
 *            writes audit docs under settings/attributes/audit, and creates backup
 *
 * Environment:
 *   Requires GCP_SA_KEY_BASE64 or GOOGLE_APPLICATION_CREDENTIALS to be set.
 */

import fs from 'fs';
import admin from 'firebase-admin';
import yargs from 'yargs';
import { hideBin } from 'yargs/helpers';
import crypto from 'crypto';

const argv = yargs(hideBin(process.argv))
  .option('source', { 
    type: 'string', 
    demandOption: true,
    describe: 'Path to attributeRegistry.json source file'
  })
  .option('dry-run', { 
    type: 'boolean', 
    default: false,
    describe: 'Show planned changes without applying'
  })
  .option('apply', { 
    type: 'boolean', 
    default: false,
    describe: 'Apply migration (write to Firestore)'
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

function normalizeRegistry(src) {
  // Handle array or object depending on registry format
  const attributesArray = Array.isArray(src) ? src : src.attributes || src;
  const attrMap = {};
  
  if (Array.isArray(attributesArray)) {
    attributesArray.forEach(a => { 
      attrMap[a.attribute_id] = a; 
    });
  } else {
    Object.assign(attrMap, attributesArray);
  }
  
  return attrMap;
}

async function run() {
  if (!argv['dry-run'] && !argv['apply']) {
    console.error('Error: Either --dry-run or --apply must be specified');
    process.exit(1);
  }

  initAdmin();
  const db = admin.firestore();
  
  // Load source registry
  console.log(`Loading registry from ${argv.source}...`);
  const src = JSON.parse(fs.readFileSync(argv.source, 'utf8'));
  const attrMap = normalizeRegistry(src);
  console.log(`✓ Loaded ${Object.keys(attrMap).length} attributes from source`);

  // Read current registry meta and data
  const metaDocRef = db.collection('settings').doc('attributesMeta');
  const metaSnap = await metaDocRef.get();
  const currentVersion = metaSnap.exists ? metaSnap.data().registry_version : null;

  // Compute new registry version (hash of payload)
  const payloadStr = JSON.stringify(attrMap);
  const newVersion = crypto.createHash('sha1').update(payloadStr).digest('hex');

  console.log(`Current registry version: ${currentVersion || 'none'}`);
  console.log(`New registry version: ${newVersion}`);

  // Plan diffs
  const existingDocRef = db.collection('settings').doc('attributes');
  const existingSnap = await existingDocRef.get();
  const existingData = existingSnap.exists ? existingSnap.data() : {};

  const toUpdate = [];
  const toAdd = [];
  const toDelete = [];
  
  Object.keys(attrMap).forEach(k => {
    const existing = existingData[k];
    if (!existing) toAdd.push(k);
    else if (JSON.stringify(existing) !== JSON.stringify(attrMap[k])) toUpdate.push(k);
  });
  
  Object.keys(existingData).forEach(k => { 
    if (!attrMap[k]) toDelete.push(k); 
  });

  const plan = { 
    newVersion, 
    currentVersion, 
    added: toAdd, 
    updated: toUpdate, 
    deleted: toDelete,
    summary: {
      totalAttributes: Object.keys(attrMap).length,
      addedCount: toAdd.length,
      updatedCount: toUpdate.length,
      deletedCount: toDelete.length
    }
  };

  console.log('\n=== Migration Plan ===');
  console.log(JSON.stringify(plan, null, 2));

  if (argv['dry-run']) {
    // Write plan artifact
    fs.mkdirSync('artifacts', { recursive: true });
    fs.writeFileSync('artifacts/migrate-plan.json', JSON.stringify(plan, null, 2));
    console.log('\n✓ Dry-run: plan written to artifacts/migrate-plan.json');
    return;
  }

  if (argv['apply']) {
    console.log('\n=== Applying Migration ===');
    
    // Write backup
    fs.mkdirSync('artifacts', { recursive: true });
    const backupPath = 'artifacts/registry-backup-before-apply.json';
    fs.writeFileSync(
      backupPath, 
      JSON.stringify({ 
        existingData, 
        meta: metaSnap.exists ? metaSnap.data() : null,
        backupAt: new Date().toISOString()
      }, null, 2)
    );
    console.log(`✓ Backup written to ${backupPath}`);

    // Apply: overwrite settings/attributes doc with attrMap
    console.log('Writing settings/attributes...');
    await existingDocRef.set(attrMap, { merge: false });
    console.log('✓ Wrote settings/attributes');

    // Update attributesMeta with new version
    console.log('Updating settings/attributesMeta.registry_version...');
    await metaDocRef.set(
      { 
        registry_version: newVersion, 
        updatedAt: admin.firestore.FieldValue.serverTimestamp() 
      }, 
      { merge: true }
    );
    console.log(`✓ Updated registry_version to ${newVersion}`);

    // Write audit doc
    console.log('Writing audit document...');
    const auditRef = db.collection('settings').doc('attributes').collection('audit').doc();
    await auditRef.set({
      action: 'apply_registry_migration',
      version: newVersion,
      previousVersion: currentVersion,
      actor: 'migrateAttributeRegistry.mjs',
      plan: plan,
      timestamp: admin.firestore.FieldValue.serverTimestamp()
    });
    console.log(`✓ Audit doc written to ${auditRef.path}`);

    // Write result artifact
    fs.writeFileSync(
      'artifacts/migrate-apply.txt',
      `Migration applied at ${new Date().toISOString()}\n` +
      `New registry version: ${newVersion}\n` +
      `Previous version: ${currentVersion}\n` +
      `Attributes added: ${toAdd.length}\n` +
      `Attributes updated: ${toUpdate.length}\n` +
      `Attributes deleted: ${toDelete.length}\n` +
      `Total attributes: ${Object.keys(attrMap).length}\n` +
      `Audit doc path: ${auditRef.path}\n`
    );
    console.log('✓ Result written to artifacts/migrate-apply.txt');
    
    console.log('\n✓ Migration applied successfully!');
  }
}

run()
  .then(() => process.exit(0))
  .catch(err => {
    console.error('\n✗ Migration failed:', err.message);
    console.error(err.stack);
    process.exit(1);
  });
