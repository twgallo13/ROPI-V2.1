#!/usr/bin/env node
/**
 * LP-0.1.4 Products Backup Script
 * 
 * Creates a full JSON backup of the products collection with SHA256 verification.
 * Required before LP-0.1.4 cleanup operations.
 * 
 * Usage:
 *   node scripts/backup-products-lp014.js
 * 
 * Output:
 *   - HOMER_CLEANUP_LP-0.1.4/backups/backup_products_<timestamp>.json
 *   - SHA256 hash and verification log
 * 
 * LP-0.1.4 Pre-run requirement
 * Lisa v1.0.1
 */

const admin = require('firebase-admin');
const fs = require('fs');
const crypto = require('crypto');
const path = require('path');

const BACKUP_DIR = 'HOMER_CLEANUP_LP-0.1.4/backups';
const timestamp = new Date().toISOString().replace(/[:.]/g, '').slice(0, 15) + 'Z';
const outFile = path.join(BACKUP_DIR, `backup_products_${timestamp}.json`);

console.log('─────────────────────────────────────────────────────────');
console.log('📦 LP-0.1.4 FIRESTORE PRODUCTS BACKUP');
console.log('─────────────────────────────────────────────────────────');
console.log(`   Collection: products`);
console.log(`   Project: ropi-bccee (staging)`);
console.log(`   Output: ${outFile}`);
console.log('─────────────────────────────────────────────────────────\n');

// Initialize Firebase Admin with proper credentials
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
 * Convert Firestore document to serializable JSON
 */
function serializeDoc(doc) {
  const data = doc.data();
  const serialized = { _id: doc.id };
  
  function serializeValue(value) {
    if (value === null || value === undefined) {
      return value;
    }
    if (value && typeof value === 'object' && typeof value.toDate === 'function') {
      // Firestore Timestamp
      return {
        _type: 'Timestamp',
        _value: value.toDate().toISOString(),
      };
    }
    if (value && typeof value === 'object' && value._seconds !== undefined) {
      // Firestore Timestamp (raw)
      return {
        _type: 'Timestamp',
        _value: new Date(value._seconds * 1000).toISOString(),
      };
    }
    if (Array.isArray(value)) {
      return value.map(serializeValue);
    }
    if (typeof value === 'object') {
      const result = {};
      for (const [k, v] of Object.entries(value)) {
        result[k] = serializeValue(v);
      }
      return result;
    }
    return value;
  }
  
  for (const [key, value] of Object.entries(data)) {
    serialized[key] = serializeValue(value);
  }
  
  return serialized;
}

async function backupProducts() {
  const startTime = new Date();
  console.log(`\n🔍 Fetching all documents from 'products'...\n`);

  try {
    const snapshot = await db.collection('products').get();
    
    const backup = {
      _metadata: {
        collection: 'products',
        environment: 'staging',
        project: 'ropi-bccee',
        timestamp: startTime.toISOString(),
        documentCount: snapshot.size,
        backupVersion: '1.0.0',
        createdBy: 'backup-products-lp014.js',
        purpose: 'LP-0.1.4 pre-cleanup backup',
      },
      documents: [],
    };

    snapshot.forEach(doc => {
      backup.documents.push(serializeDoc(doc));
    });

    // Ensure output directory exists
    const outDir = path.dirname(outFile);
    if (!fs.existsSync(outDir)) {
      fs.mkdirSync(outDir, { recursive: true });
    }

    // Write backup file
    const jsonContent = JSON.stringify(backup, null, 2);
    fs.writeFileSync(outFile, jsonContent);

    // Calculate SHA256
    const sha256 = crypto.createHash('sha256').update(jsonContent).digest('hex');
    const fileSize = fs.statSync(outFile).size;

    console.log('─────────────────────────────────────────────────────────');
    console.log('📊 BACKUP COMPLETE');
    console.log('─────────────────────────────────────────────────────────');
    console.log(`   File: ${outFile}`);
    console.log(`   Documents: ${backup.documents.length}`);
    console.log(`   Size: ${fileSize} bytes (${(fileSize / 1024).toFixed(2)} KB)`);
    console.log(`   SHA256: ${sha256}`);
    console.log(`   Timestamp: ${startTime.toISOString()}`);
    console.log('─────────────────────────────────────────────────────────\n');

    // Verification: Check for specific docs
    const targetDocs = ['123', 'test-product-001', 'test-product-003'];
    console.log('🔍 VERIFICATION: Checking for LP-0.1.4 target documents...\n');
    
    let allFound = true;
    for (const docId of targetDocs) {
      const found = backup.documents.find(d => d._id === docId);
      if (found) {
        console.log(`   ✓ ${docId} - FOUND`);
        console.log(`     websites: [${(found.websites || []).join(', ')}]`);
      } else {
        console.log(`   ✗ ${docId} - NOT FOUND`);
        allFound = false;
      }
    }

    if (!allFound) {
      console.log('\n⚠️  WARNING: Not all target documents found in backup!');
    }

    console.log('\n─────────────────────────────────────────────────────────');
    console.log('📎 BACKUP ARTIFACTS (for cleanup script)');
    console.log('─────────────────────────────────────────────────────────');
    console.log(`   BACKUP_FILE=${path.resolve(outFile)}`);
    console.log(`   BACKUP_SHA256=${sha256}`);
    console.log(`   BACKUP_SIZE=${fileSize}`);
    console.log(`   BACKUP_DOCS=${backup.documents.length}`);
    console.log('─────────────────────────────────────────────────────────\n');

    // Write metadata file for reference
    const metaFile = outFile.replace('.json', '_meta.json');
    fs.writeFileSync(metaFile, JSON.stringify({
      file: path.resolve(outFile),
      sha256,
      size: fileSize,
      documentCount: backup.documents.length,
      timestamp: startTime.toISOString(),
      targetDocsFound: targetDocs.filter(id => backup.documents.find(d => d._id === id)),
    }, null, 2));
    console.log(`📄 Metadata written to: ${metaFile}\n`);

    return { file: outFile, sha256, size: fileSize, documentCount: backup.documents.length };

  } catch (error) {
    console.error('❌ Backup failed:', error.message);
    console.error(error.stack);
    process.exit(1);
  }
}

backupProducts()
  .then(result => {
    console.log('✅ Backup completed successfully');
    console.log(`\n🔑 Use this SHA256 for cleanup: ${result.sha256}\n`);
    process.exit(0);
  })
  .catch(error => {
    console.error('❌ Backup script failed:', error);
    process.exit(1);
  });
