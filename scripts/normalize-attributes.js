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

// Simple argument parsing
const isDryRun = process.argv.includes('--dry');

// Dynamically require AttributeSchema from SDK
let AttributeSchema;
try {
  // Try loading from local SDK dist
  const sdk = require('../packages/sdk/dist/index.js');
  AttributeSchema = sdk.AttributeSchema;
  console.log('Loaded AttributeSchema from packages/sdk/dist');
} catch (err) {
  try {
    // Try @ropi-aoss/sdk package
    const sdk = require('@ropi-aoss/sdk');
    AttributeSchema = sdk.AttributeSchema;
    console.log('Loaded AttributeSchema from @ropi-aoss/sdk');
  } catch (err2) {
    console.error('Could not load AttributeSchema. Error:', err.message);
    process.exit(1);
  }
}

if (!admin.apps.length) {
  admin.initializeApp();
}

const db = admin.firestore();

async function run() {
  console.log('Scanning settings/attributes/keys...');
  console.log(`Mode: ${isDryRun ? 'DRY RUN (no writes)' : 'LIVE (will write changes)'}`);
  
  const snapshot = await db.collection('settings').doc('attributes').collection('keys').get();
  console.log(`Found ${snapshot.size} attribute docs.`);

  const errors = [];
  const actions = [];

  for (const doc of snapshot.docs) {
    const id = doc.id;
    const data = doc.data();
    const candidate = { attribute_id: id, ...data };

    try {
      const validated = AttributeSchema.parse(candidate);
      
      // Compare: if any key missing or different (shallow), record action
      const diffs = [];
      for (const k of Object.keys(validated)) {
        // Skip audit fields
        if (['createdAt', 'updatedAt', 'createdBy', 'updatedBy'].includes(k)) continue;
        
        const orig = data[k];
        const val = validated[k];
        if (JSON.stringify(orig) !== JSON.stringify(val)) {
          diffs.push({ key: k, before: orig, after: val });
        }
      }
      
      if (diffs.length > 0) {
        actions.push({ id, diffs });
        if (!isDryRun) {
          await db.collection('settings').doc('attributes').collection('keys').doc(id).set(validated, { merge: true });
          console.log(`Updated ${id}`);
        } else {
          console.log(`DRY: would update ${id} (changes: ${diffs.length})`);
        }
      }
    } catch (err) {
      errors.push({ id, error: err.errors ? err.errors : err.message || String(err) });
      console.error(`Validation failed for ${id}:`, err.message || err);
    }
  }

  console.log(`\nSummary: ${actions.length} docs with diffs, ${errors.length} errors`);
  if (isDryRun) {
    console.log('Dry-run: no writes performed. Rerun without --dry to apply changes.');
  }
  if (errors.length > 0) {
    console.log('Errors sample:', errors.slice(0, 5));
    process.exit(1);
  }
}

run().catch(err => {
  console.error('Script failed:', err);
  process.exit(1);
});
