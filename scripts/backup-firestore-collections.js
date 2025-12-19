#!/usr/bin/env node
/**
 * Backup Firestore collections to JSON
 * Usage: node scripts/backup-firestore-collections.js --collections=settings/attributes/keys --out=backups/output.json
 */

const admin = require('firebase-admin');
const fs = require('fs');
const path = require('path');

// Parse command line arguments
const args = process.argv.slice(2);
let collections = [];
let outputPath = 'backup.json';

for (const arg of args) {
  if (arg.startsWith('--collections=')) {
    collections = arg.replace('--collections=', '').split(',');
  } else if (arg.startsWith('--out=')) {
    outputPath = arg.replace('--out=', '');
  }
}

if (collections.length === 0) {
  console.error('Usage: node backup-firestore-collections.js --collections=col1,col2 --out=output.json');
  process.exit(1);
}

// Initialize Firebase Admin
if (!admin.apps.length) {
  admin.initializeApp({
    credential: admin.credential.applicationDefault()
  });
}

const db = admin.firestore();

async function backupCollection(collectionPath) {
  console.log(`Backing up collection: ${collectionPath}`);
  const snapshot = await db.collection(collectionPath).get();
  const docs = [];
  
  snapshot.forEach(doc => {
    docs.push({
      id: doc.id,
      path: doc.ref.path,
      data: doc.data()
    });
  });
  
  console.log(`  Found ${docs.length} documents`);
  return docs;
}

async function main() {
  const backup = {
    timestamp: new Date().toISOString(),
    collections: {}
  };
  
  for (const col of collections) {
    try {
      backup.collections[col] = await backupCollection(col);
    } catch (error) {
      console.error(`Error backing up ${col}:`, error.message);
      backup.collections[col] = { error: error.message };
    }
  }
  
  // Ensure output directory exists
  const dir = path.dirname(outputPath);
  if (dir && !fs.existsSync(dir)) {
    fs.mkdirSync(dir, { recursive: true });
  }
  
  // Write backup file
  fs.writeFileSync(outputPath, JSON.stringify(backup, null, 2));
  console.log(`\nBackup saved to: ${outputPath}`);
  console.log(`File size: ${fs.statSync(outputPath).size} bytes`);
  
  // Exit cleanly
  process.exit(0);
}

main().catch(err => {
  console.error('Backup failed:', err);
  process.exit(1);
});
