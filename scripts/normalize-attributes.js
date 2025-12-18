#!/usr/bin/env node
/**
 * scripts/normalize-attributes.js
 *
 * Validates and normalizes attribute docs in Firestore using AttributeSchema.
 * Usage:
 *   node scripts/normalize-attributes.js --dry
 *   node scripts/normalize-attributes.js
 *
 * NOTE: This script requires firebase-admin credentials in env or local emulator.
 */

const admin = require('firebase-admin');
const path = require('path');
const { AttributeSchema } = require('@ropi-aoss/sdk'); // ensure workspaces support
const yargs = require('yargs');

const argv = yargs.option('dry', { type: 'boolean', default: true }).argv;

if (!admin.apps.length) {
  // Initialize with default creds; rely on env for production or emulator for local testing
  admin.initializeApp();
}

const db = admin.firestore();

async function run() {
  console.log('Scanning settings/attributes/keys...');
  const snapshot = await db.collection('settings').doc('attributes').collection('keys').get();
  console.log(`Found ${snapshot.size} attribute docs.`);

  const errors = [];
  const actions = [];

  for (const doc of snapshot.docs) {
    const id = doc.id;
    const data = doc.data();
    // Compose object with attribute_id
    const candidate = { attribute_id: id, ...data };

    try {
      const validated = AttributeSchema.parse(candidate);
      // Compare: if any key missing or different (shallow), record action
      const diffs = [];
      for (const k of Object.keys(validated)) {
        const orig = data[k];
        const val = validated[k];
        // Use JSON.stringify for simple deep compare
        if (JSON.stringify(orig) !== JSON.stringify(val)) {
          diffs.push({ key: k, before: orig, after: val });
        }
      }
      if (diffs.length > 0) {
        actions.push({ id, diffs });
        if (!argv.dry) {
          await db.collection('settings').doc('attributes').collection('keys').doc(id).set(validated, { merge: true });
          console.log(`Updated ${id}`);
        } else {
          console.log(`DRY: would update ${id} (changes: ${diffs.length})`);
        }
      }
    } catch (err) {
      errors.push({ id, error: err.errors ? err.errors : err.message || String(err) });
      console.error(`Validation failed for ${id}:`, err);
    }
  }

  console.log(`\nSummary: ${actions.length} docs with diffs, ${errors.length} errors`);
  if (argv.dry) console.log('Dry-run: no writes performed. Rerun without --dry to apply changes.');
  if (errors.length > 0) {
    console.log('Errors sample:', errors.slice(0,5));
    process.exit(1);
  }
}

run().catch(err => {
  console.error('Script failed:', err);
  process.exit(1);
});
