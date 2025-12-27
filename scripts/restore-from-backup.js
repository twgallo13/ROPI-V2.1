#!/usr/bin/env node
/**
 * LP-0.1.4 — Restore from Backup
 * 
 * Restores Firestore documents from a backup JSON file created by backup-products-lp014.js.
 * This script is for emergency rollback if the cleanup operation produces unexpected results.
 * 
 * Usage:
 *   node scripts/restore-from-backup.js --file=backup.json --dry-run     # Preview restore
 *   node scripts/restore-from-backup.js --file=backup.json --write --yes # Actually restore
 * 
 * Arguments:
 *   --file=<path>     Path to backup JSON file (required)
 *   --dry-run         Preview what would be restored (default)
 *   --write           Actually perform the restore
 *   --yes             Skip confirmation prompt
 *   --doc=<id>        Restore only a specific document (optional)
 * 
 * LP-0.1.4 rollback script
 * Lisa v1.0.1
 */

const admin = require('firebase-admin');
const fs = require('fs');
const readline = require('readline');

// Parse command line args
const args = process.argv.slice(2);
const getArg = (name) => {
  const arg = args.find(a => a.startsWith(`--${name}=`));
  return arg ? arg.split('=')[1] : null;
};

const backupFile = getArg('file');
const isDryRun = !args.includes('--write');
const skipConfirm = args.includes('--yes');
const specificDoc = getArg('doc');

console.log('═══════════════════════════════════════════════════════════');
console.log('🔄 LP-0.1.4 RESTORE FROM BACKUP');
console.log('═══════════════════════════════════════════════════════════');
console.log(`   Mode: ${isDryRun ? 'DRY-RUN (no writes)' : '⚠️  WRITE MODE'}`);
console.log(`   Backup File: ${backupFile || '(not provided)'}`);
console.log(`   Specific Doc: ${specificDoc || '(all documents)'}`);
console.log('═══════════════════════════════════════════════════════════\n');

// Validate required arguments
if (!backupFile) {
  console.error('❌ REQUIRED: --file=<path-to-backup.json>');
  process.exit(1);
}

if (!fs.existsSync(backupFile)) {
  console.error(`❌ Backup file not found: ${backupFile}`);
  process.exit(1);
}

// Initialize Firebase Admin
if (!admin.apps.length) {
  const credPath = process.env.GOOGLE_APPLICATION_CREDENTIALS;
  const credBase64 = process.env.GCP_SA_KEY_BASE64;
  
  if (credPath && fs.existsSync(credPath)) {
    const serviceAccount = JSON.parse(fs.readFileSync(credPath, 'utf8'));
    admin.initializeApp({
      credential: admin.credential.cert(serviceAccount),
    });
    console.log(`✅ Initialized with credentials from ${credPath}`);
  } else if (credBase64) {
    const serviceAccount = JSON.parse(Buffer.from(credBase64, 'base64').toString('utf8'));
    admin.initializeApp({
      credential: admin.credential.cert(serviceAccount),
    });
    console.log('✅ Initialized with GCP_SA_KEY_BASE64');
  } else {
    console.error('❌ No credentials found. Set GOOGLE_APPLICATION_CREDENTIALS or GCP_SA_KEY_BASE64');
    process.exit(1);
  }
}

const db = admin.firestore();

/**
 * Prompt user for confirmation
 */
async function confirmRestore(count) {
  if (skipConfirm || isDryRun) return true;
  
  const rl = readline.createInterface({
    input: process.stdin,
    output: process.stdout,
  });
  
  return new Promise((resolve) => {
    console.log('\n⚠️  WARNING: This will OVERWRITE Firestore data with backup values.');
    console.log(`   ${count} documents will be restored.\n`);
    rl.question('Are you sure you want to proceed? (y/N): ', (answer) => {
      rl.close();
      resolve(answer.toLowerCase() === 'y' || answer.toLowerCase() === 'yes');
    });
  });
}

/**
 * Deserialize backup document to Firestore-compatible format
 */
function deserializeDoc(backupDoc) {
  const data = { ...backupDoc };
  delete data._id; // Remove the ID field, it's used for doc reference
  
  function deserializeValue(value) {
    if (value === null || value === undefined) {
      return value;
    }
    if (value && typeof value === 'object' && value._type === 'Timestamp') {
      return admin.firestore.Timestamp.fromDate(new Date(value._value));
    }
    if (Array.isArray(value)) {
      return value.map(deserializeValue);
    }
    if (typeof value === 'object') {
      const result = {};
      for (const [k, v] of Object.entries(value)) {
        result[k] = deserializeValue(v);
      }
      return result;
    }
    return value;
  }
  
  const result = {};
  for (const [key, value] of Object.entries(data)) {
    result[key] = deserializeValue(value);
  }
  
  return result;
}

async function restoreFromBackup() {
  console.log(`\n📂 Loading backup file: ${backupFile}\n`);
  
  const backup = JSON.parse(fs.readFileSync(backupFile, 'utf8'));
  
  console.log('📋 BACKUP METADATA:');
  console.log(`   Collection: ${backup._metadata.collection}`);
  console.log(`   Environment: ${backup._metadata.environment}`);
  console.log(`   Backup Time: ${backup._metadata.timestamp}`);
  console.log(`   Document Count: ${backup._metadata.documentCount}`);
  console.log('');

  // Filter documents if specific doc requested
  let docsToRestore = backup.documents;
  if (specificDoc) {
    docsToRestore = backup.documents.filter(d => d._id === specificDoc);
    if (docsToRestore.length === 0) {
      console.error(`❌ Document '${specificDoc}' not found in backup.`);
      process.exit(1);
    }
    console.log(`🎯 Restoring only document: ${specificDoc}\n`);
  }

  console.log('📋 RESTORE PREVIEW:\n');
  
  for (const doc of docsToRestore) {
    console.log(`   📦 ${doc._id}`);
    if (doc.websites) {
      console.log(`      websites: [${doc.websites.join(', ')}]`);
    }
  }

  console.log(`\n   Total: ${docsToRestore.length} document(s) to restore\n`);

  // Dry-run exit
  if (isDryRun) {
    console.log('═══════════════════════════════════════════════════════════');
    console.log('🔍 DRY-RUN COMPLETE');
    console.log(`   ${docsToRestore.length} documents would be restored.`);
    console.log('   Run with --write to actually perform restore.');
    console.log('═══════════════════════════════════════════════════════════\n');
    
    // Show sample restore for one doc
    if (docsToRestore.length > 0) {
      const sample = docsToRestore[0];
      console.log('📎 SAMPLE RESTORE DATA (first document):');
      console.log(`   Document ID: ${sample._id}`);
      console.log(`   Websites: [${(sample.websites || []).join(', ')}]`);
    }
    
    return { restored: 0, errors: 0, total: docsToRestore.length };
  }

  // Confirm before writing
  const confirmed = await confirmRestore(docsToRestore.length);
  if (!confirmed) {
    console.log('❌ Restore cancelled by user.');
    process.exit(0);
  }

  console.log('\n🔄 Performing restore...\n');
  
  let restored = 0;
  let errors = 0;

  for (const backupDoc of docsToRestore) {
    try {
      const docId = backupDoc._id;
      const data = deserializeDoc(backupDoc);
      
      // Add restore metadata
      data._restoreNote = `Restored from backup on ${new Date().toISOString()}`;
      data._restoreSource = backupFile;
      
      await db.collection(backup._metadata.collection).doc(docId).set(data);
      console.log(`   ✓ Restored: ${docId}`);
      restored++;
    } catch (error) {
      console.error(`   ✗ Failed: ${backupDoc._id}: ${error.message}`);
      errors++;
    }
  }

  console.log('\n═══════════════════════════════════════════════════════════');
  console.log('📊 RESTORE COMPLETE');
  console.log(`   Restored: ${restored} documents`);
  console.log(`   Errors: ${errors} documents`);
  console.log('═══════════════════════════════════════════════════════════\n');

  return { restored, errors, total: docsToRestore.length };
}

restoreFromBackup()
  .then(result => {
    if (result.errors > 0) {
      console.log('⚠️  Some documents failed to restore. Check logs above.');
      process.exit(1);
    }
    console.log('✅ Restore script completed successfully');
    process.exit(0);
  })
  .catch(error => {
    console.error('❌ Restore script failed:', error);
    process.exit(1);
  });
