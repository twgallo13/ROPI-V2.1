#!/usr/bin/env node
/**
 * scripts/backup-firestore-collections.js
 *
 * Backs up specified Firestore collections to a JSON file.
 *
 * Usage:
 *   export GOOGLE_APPLICATION_CREDENTIALS=/path/to/service-account.json
 *   node scripts/backup-firestore-collections.js --collections=settings/attributes/keys --out=backups/backup.json
 *
 * Options:
 *   --collections  Comma-separated collection paths (required)
 *   --out          Output file path (required)
 */

const admin = require('firebase-admin');
const fs = require('fs');
const path = require('path');

// Simple argument parsing without yargs
const args = process.argv.slice(2);
const argv = {};
args.forEach(arg => {
  const match = arg.match(/^--(\w+)=(.+)$/);
  if (match) {
    argv[match[1]] = match[2];
  }
});

if (!argv.collections || !argv.out) {
  console.error('Usage: node backup-firestore-collections.js --collections=path --out=file.json');
  process.exit(1);
}

if (!admin.apps.length) {
  admin.initializeApp();
}

const db = admin.firestore();

async function backupCollection(collectionPath) {
  console.log(`Backing up collection: ${collectionPath}`);
  
  // Parse collection path - handle nested collections like settings/attributes/keys
  const pathParts = collectionPath.split('/');
  let ref;
  
  if (pathParts.length === 1) {
    // Simple collection
    ref = db.collection(pathParts[0]);
  } else if (pathParts.length === 3) {
    // Document/subcollection pattern: collection/doc/subcollection
    ref = db.collection(pathParts[0]).doc(pathParts[1]).collection(pathParts[2]);
  } else {
    throw new Error(`Unsupported collection path format: ${collectionPath}`);
  }
  
  const snapshot = await ref.get();
  const docs = [];
  
  snapshot.forEach(doc => {
    docs.push({
      id: doc.id,
      path: doc.ref.path,
      data: doc.data()
    });
  });
  
  console.log(`  Found ${docs.length} documents`);
  return { collectionPath, docs, count: docs.length };
}

async function run() {
  const collections = argv.collections.split(',').map(c => c.trim());
  const outPath = argv.out;
  
  console.log('Starting backup...');
  console.log('Collections to backup:', collections);
  console.log('Output file:', outPath);
  
  const backup = {
    timestamp: new Date().toISOString(),
    collections: []
  };
  
  for (const collectionPath of collections) {
    try {
      const result = await backupCollection(collectionPath);
      backup.collections.push(result);
    } catch (err) {
      console.error(`Failed to backup ${collectionPath}:`, err.message);
      backup.collections.push({
        collectionPath,
        error: err.message,
        docs: [],
        count: 0
      });
    }
  }
  
  // Ensure output directory exists
  const outDir = path.dirname(outPath);
  if (!fs.existsSync(outDir)) {
    fs.mkdirSync(outDir, { recursive: true });
  }
  
  // Write backup file
  fs.writeFileSync(outPath, JSON.stringify(backup, null, 2), 'utf8');
  console.log(`\nBackup complete! Written to: ${outPath}`);
  console.log(`Total documents backed up: ${backup.collections.reduce((sum, c) => sum + c.count, 0)}`);
}

run().catch(err => {
  console.error('Backup failed:', err);
  process.exit(1);
});
