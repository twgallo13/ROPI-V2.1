#!/usr/bin/env node
/**
 * Align Registry Version Utility
 * 
 * Ensures Firestore settings/attributesMeta.registry_version matches the local
 * attributeRegistry.json SHA. This prevents CI verify-attributes-meta failures.
 * 
 * Usage:
 *   node align_registry_version.mjs --dry-run --project ropi-bccee
 *   node align_registry_version.mjs --apply --project ropi-bccee
 * 
 * Flags:
 *   --dry-run: Show what would change without modifying Firestore (safe)
 *   --apply: Update Firestore with local registry SHA
 *   --project: Firebase project ID (required)
 */

import admin from 'firebase-admin';
import fs from 'fs';
import crypto from 'crypto';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

// Parse command-line arguments
const args = process.argv.slice(2);
const flags = {
  dryRun: args.includes('--dry-run'),
  apply: args.includes('--apply'),
  project: args[args.indexOf('--project') + 1] || null,
};

if (!flags.dryRun && !flags.apply) {
  console.error('❌ Error: Must specify --dry-run or --apply');
  process.exit(1);
}

if (flags.dryRun && flags.apply) {
  console.error('❌ Error: Cannot specify both --dry-run and --apply');
  process.exit(1);
}

if (!flags.project) {
  console.error('❌ Error: Must specify --project <projectId>');
  process.exit(1);
}

// Initialize Firebase Admin
const serviceAccountPath = process.env.GOOGLE_APPLICATION_CREDENTIALS || process.env.GCP_SA_FILE;
if (!serviceAccountPath && !process.env.GCP_SA_KEY_BASE64) {
  console.error('❌ Error: No service account credentials found');
  console.error('   Set GOOGLE_APPLICATION_CREDENTIALS, GCP_SA_FILE, or GCP_SA_KEY_BASE64');
  process.exit(1);
}

let credential;
if (process.env.GCP_SA_KEY_BASE64) {
  const saJson = Buffer.from(process.env.GCP_SA_KEY_BASE64, 'base64').toString('utf8');
  credential = admin.credential.cert(JSON.parse(saJson));
} else {
  credential = admin.credential.cert(serviceAccountPath);
}

admin.initializeApp({
  credential,
  projectId: flags.project,
});

const db = admin.firestore();

async function computeLocalRegistrySHA() {
  const registryPath = join(__dirname, '../../sdk/config/attributeRegistry.json');
  
  if (!fs.existsSync(registryPath)) {
    console.error(`❌ Error: attributeRegistry.json not found at ${registryPath}`);
    process.exit(1);
  }

  const content = fs.readFileSync(registryPath, 'utf8');
  const sha = crypto.createHash('sha1').update(content).digest('hex');
  
  const parsed = JSON.parse(content);
  const version = parsed.version || 'unknown';
  const attributeCount = Object.keys(parsed.attributes || {}).length;

  return { sha, version, attributeCount, content };
}

async function getFirestoreRegistryVersion() {
  const metaDoc = await db.doc('settings/attributesMeta').get();
  
  if (!metaDoc.exists) {
    return null;
  }

  const data = metaDoc.data();
  return {
    registry_version: data.registry_version || null,
    totalAttributes: data.totalAttributes || 0,
    lastSyncedAt: data.lastSyncedAt || null,
    lastSyncedBy: data.lastSyncedBy || null,
  };
}

async function main() {
  console.log('🔍 Align Registry Version Utility\n');
  console.log(`   Project: ${flags.project}`);
  console.log(`   Mode: ${flags.dryRun ? 'DRY-RUN (safe)' : 'APPLY (will update Firestore)'}\n`);

  // Compute local registry SHA
  console.log('📦 Reading local attributeRegistry.json...');
  const local = await computeLocalRegistrySHA();
  console.log(`   SHA: ${local.sha}`);
  console.log(`   Version: ${local.version}`);
  console.log(`   Attributes: ${local.attributeCount}\n`);

  // Fetch Firestore metadata
  console.log('☁️  Reading Firestore settings/attributesMeta...');
  const firestore = await getFirestoreRegistryVersion();

  if (!firestore) {
    console.log('   ⚠️  Document does not exist\n');
    
    if (flags.apply) {
      console.log('✅ Creating settings/attributesMeta with local registry SHA...');
      await db.doc('settings/attributesMeta').set({
        registry_version: local.sha,
        totalAttributes: local.attributeCount,
        lastSyncedAt: admin.firestore.FieldValue.serverTimestamp(),
        lastSyncedBy: 'align_registry_version.mjs',
        registry_source: 'json',
      });
      console.log('✅ Firestore updated successfully');
    } else {
      console.log('🔄 DRY-RUN: Would create settings/attributesMeta');
    }
    
    process.exit(0);
  }

  console.log(`   SHA: ${firestore.registry_version}`);
  console.log(`   Attributes: ${firestore.totalAttributes}`);
  console.log(`   Last Synced: ${firestore.lastSyncedAt}`);
  console.log(`   Last Synced By: ${firestore.lastSyncedBy}\n`);

  // Compare
  if (local.sha === firestore.registry_version) {
    console.log('✅ Registry versions match - no action needed');
    process.exit(0);
  }

  console.log('⚠️  MISMATCH DETECTED\n');
  console.log(`   Local SHA:     ${local.sha}`);
  console.log(`   Firestore SHA: ${firestore.registry_version}\n`);

  if (Math.abs(local.attributeCount - firestore.totalAttributes) > 5) {
    console.log('⚠️  WARNING: Attribute counts differ significantly');
    console.log(`   Local: ${local.attributeCount}, Firestore: ${firestore.totalAttributes}`);
    console.log('   Manual verification recommended before applying\n');
  }

  if (flags.apply) {
    console.log('✅ Updating Firestore settings/attributesMeta...');
    await db.doc('settings/attributesMeta').set({
      registry_version: local.sha,
      totalAttributes: local.attributeCount,
      lastSyncedAt: admin.firestore.FieldValue.serverTimestamp(),
      lastSyncedBy: 'align_registry_version.mjs',
      registry_source: 'json',
    }, { merge: true });
    console.log('✅ Firestore updated successfully');
    console.log(`   New registry_version: ${local.sha}`);
  } else {
    console.log('🔄 DRY-RUN: Would update Firestore registry_version');
    console.log(`   From: ${firestore.registry_version}`);
    console.log(`   To:   ${local.sha}`);
  }

  process.exit(0);
}

main().catch((error) => {
  console.error('❌ Error:', error.message);
  process.exit(1);
});
