#!/usr/bin/env node
/**
 * Cleanup non-canonical attribute definitions in Firestore.
 *
 * Canonical source of truth: settings/attributes/keys
 * This script deletes everything under settings/attributes/* EXCEPT preserved subcollections
 * (defaults to: keys, audit) and can run in dry-run mode first.
 *
 * Usage:
 *   node scripts/cleanup-legacy-attributes.mjs \
 *     --project ropi-bccee \
 *     --preserve keys,audit \
 *     --dry-run \
 *     --out inventory/homer-attr-cleanup-YYYY-MM-DD/evidence
 *
 * Environment:
 *   - GOOGLE_APPLICATION_CREDENTIALS pointing to a service account JSON
 *   or
 *   - FIREBASE_SERVICE_ACCOUNT_JSON (base64 or raw JSON string)
 */

import fs from 'fs';
import path from 'path';
import url from 'url';
import process from 'process';
import { initializeApp, cert, getApps } from 'firebase-admin/app';
import { getFirestore } from 'firebase-admin/firestore';

const __dirname = path.dirname(url.fileURLToPath(import.meta.url));

function parseArgs(argv) {
  const args = {};
  for (let i = 2; i < argv.length; i++) {
    const a = argv[i];
    if (a.startsWith('--')) {
      const [k, v] = a.split('=');
      const key = k.replace(/^--/, '');
      if (typeof v !== 'undefined') {
        args[key] = v;
      } else {
        const next = argv[i + 1];
        if (next && !next.startsWith('--')) {
          args[key] = next;
          i++;
        } else {
          args[key] = true;
        }
      }
    }
  }
  return args;
}

function ensureDir(p) {
  fs.mkdirSync(p, { recursive: true });
}

function writeJson(filePath, data) {
  ensureDir(path.dirname(filePath));
  fs.writeFileSync(filePath, JSON.stringify(data, null, 2));
}

function loadServiceAccountFromEnv() {
  const raw = process.env.FIREBASE_SERVICE_ACCOUNT_JSON;
  if (!raw) return undefined;
  try {
    // Support base64-encoded value
    const decoded = Buffer.from(raw, 'base64').toString('utf8');
    const maybeJson = JSON.parse(decoded);
    return maybeJson;
  } catch {
    // Try as raw JSON string
    try {
      return JSON.parse(raw);
    } catch {
      console.warn('FIREBASE_SERVICE_ACCOUNT_JSON is set but not valid JSON (raw or base64). Ignoring.');
      return undefined;
    }
  }
}

async function initFirebase(projectId) {
  if (getApps().length) return;
  const svc = loadServiceAccountFromEnv();
  if (svc) {
    initializeApp({ credential: cert(svc), projectId });
    return;
  }
  // Fallback to default creds (e.g., GOOGLE_APPLICATION_CREDENTIALS)
  initializeApp({ projectId });
}

async function listSubcollections(db, docRef) {
  // Firestore Admin SDK can list subcollections on a DocumentReference
  return docRef.listCollections();
}

async function listCollectionDocIds(collRef, limit = 5000) {
  const docs = await collRef.listDocuments();
  // listDocuments returns DocumentReference[] without fetching data; that's fine
  const ids = docs.map(d => d.id);
  return ids.slice(0, limit);
}

async function batchDeleteCollection(collRef, { dryRun, batchSize = 250 }) {
  const docs = await collRef.listDocuments();
  if (dryRun) return { attempted: docs.length, deleted: 0 };

  let deleted = 0;
  for (let i = 0; i < docs.length; i += batchSize) {
    const chunk = docs.slice(i, i + batchSize);
    const batch = collRef.firestore.batch();
    for (const d of chunk) batch.delete(d);
    await batch.commit();
    deleted += chunk.length;
  }
  return { attempted: docs.length, deleted };
}

async function snapshotAttributesTree(db) {
  const rootDoc = db.doc('settings/attributes');
  const subs = await listSubcollections(db, rootDoc);
  const details = {};
  for (const sub of subs) {
    const ids = await listCollectionDocIds(sub);
    details[sub.id] = { count: ids.length, sample: ids.slice(0, 20) };
  }
  return { path: 'settings/attributes', subcollections: Object.keys(details), details };
}

async function main() {
  const args = parseArgs(process.argv);
  const project = args.project || process.env.GCLOUD_PROJECT || process.env.GCP_PROJECT || process.env.PROJECT_ID;
  if (!project) {
    console.error('Missing --project. Provide --project <id> or set PROJECT_ID env.');
    process.exit(1);
  }
  const preserve = (args.preserve || 'keys,audit')
    .split(',')
    .map(s => s.trim())
    .filter(Boolean);
  const dryRun = !!args['dry-run'] || args.dry === 'true' || args.dry === true;
  const outDir = args.out || path.join('inventory', `homer-attr-cleanup-${new Date().toISOString().slice(0, 10)}`, 'evidence');

  await initFirebase(project);
  const db = getFirestore();

  const before = await snapshotAttributesTree(db);
  writeJson(path.join(outDir, 'before.attributes.tree.json'), before);

  const rootDoc = db.doc('settings/attributes');
  const subs = await listSubcollections(db, rootDoc);
  const toDelete = subs.filter(s => !preserve.includes(s.id));

  const results = [];
  for (const sub of toDelete) {
    const collRef = db.collection(`settings/attributes/${sub.id}`);
    const res = await batchDeleteCollection(collRef, { dryRun });
    results.push({ subcollection: sub.id, ...res });
  }

  const after = await snapshotAttributesTree(db);
  writeJson(path.join(outDir, dryRun ? 'dryrun.after.attributes.tree.json' : 'after.attributes.tree.json'), after);
  writeJson(path.join(outDir, dryRun ? 'dryrun.delete.results.json' : 'delete.results.json'), { project, preserve, dryRun, results, at: new Date().toISOString() });

  // Optional: capture explicit legacy attribute names if present under non-preserved subs
  const legacyNames = [
    'SCOM Regular Price',
    'SCOM Sale Price',
    'Standard Shipping Override',
    'Expedited Override Shipping',
  ];
  const legacyHits = [];
  for (const sub of toDelete) {
    const collRef = db.collection(`settings/attributes/${sub.id}`);
    const docs = await collRef.listDocuments();
    for (const dref of docs) {
      if (legacyNames.includes(dref.id)) legacyHits.push({ sub: sub.id, id: dref.id });
    }
  }
  writeJson(path.join(outDir, 'legacy.hits.json'), { legacyNames, hits: legacyHits });

  console.log('Cleanup complete:', { project, dryRun, preserve, results });
  console.log('Evidence written to:', outDir);
}

main().catch(err => {
  console.error('Cleanup failed:', err);
  process.exit(1);
});
