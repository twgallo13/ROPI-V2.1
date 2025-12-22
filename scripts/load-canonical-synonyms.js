/**
 * LP-2.1.9: Load Canonical Value Synonyms to Firestore
 * 
 * This script:
 * 1. Backs up existing attribute definitions
 * 2. Applies synonyms mappings and allowed_values extensions
 * 3. Updates definition_version to 1.0.4
 */

const admin = require('firebase-admin');
const fs = require('fs');
const path = require('path');

// Initialize Firebase Admin with service account
const serviceAccount = require('../service-account.json');

admin.initializeApp({
  credential: admin.credential.cert(serviceAccount),
  projectId: 'ropi-bccee'
});

const db = admin.firestore();

// Load canonical mapping
const canonicalMapping = require('../reports/attribute-inspections/canonical-value-synonyms.json');

async function main() {
  const date = new Date().toISOString().split('T')[0];
  const backupDir = path.join(__dirname, '../reports/attribute-inspections', date);
  const logFile = path.join(__dirname, '../logs/lp-2.1.9-load-canonical-apply.log');
  
  // Ensure directories exist
  fs.mkdirSync(backupDir, { recursive: true });
  fs.mkdirSync(path.dirname(logFile), { recursive: true });
  
  const logs = [];
  const log = (msg) => {
    console.log(msg);
    logs.push(`${new Date().toISOString()} ${msg}`);
  };
  
  log('=== LP-2.1.9: Load Canonical Value Synonyms ===');
  log(`Date: ${date}`);
  log(`Backup directory: ${backupDir}`);
  
  // Get attribute IDs to update (skip metadata fields)
  const attributeIds = Object.keys(canonicalMapping).filter(k => !k.startsWith('_'));
  log(`\nAttributes to update: ${attributeIds.join(', ')}`);
  
  // Backup existing documents
  log('\n--- Phase 1: Backup existing attribute definitions ---');
  const backups = {};
  
  for (const attrId of attributeIds) {
    try {
      const docRef = db.collection('settings').doc('attributes').collection('keys').doc(attrId);
      const doc = await docRef.get();
      
      if (doc.exists) {
        backups[attrId] = doc.data();
        log(`✓ Backed up: ${attrId}`);
      } else {
        log(`⚠ Not found (will create): ${attrId}`);
        backups[attrId] = null;
      }
    } catch (err) {
      log(`✗ Error backing up ${attrId}: ${err.message}`);
    }
  }
  
  // Save backups
  const backupFile = path.join(backupDir, 'pre-canonical-snapshots.json');
  fs.writeFileSync(backupFile, JSON.stringify(backups, null, 2));
  log(`\nBackup saved to: ${backupFile}`);
  
  // Apply updates
  log('\n--- Phase 2: Apply canonical synonyms and allowed_values ---');
  const results = { success: [], failed: [] };
  
  for (const attrId of attributeIds) {
    const mapping = canonicalMapping[attrId];
    const docRef = db.collection('settings').doc('attributes').collection('keys').doc(attrId);
    
    try {
      const doc = await docRef.get();
      const existingData = doc.exists ? doc.data() : {};
      
      // Prepare update
      const update = {
        definition_version: canonicalMapping._version || '1.0.4',
        updatedAt: admin.firestore.FieldValue.serverTimestamp(),
        updatedBy: 'sync-canonical-maps',
        source: 'repo'
      };
      
      // Merge synonyms
      if (mapping.synonyms && Object.keys(mapping.synonyms).length > 0) {
        const existingSynonyms = existingData.synonyms || {};
        update.synonyms = { ...existingSynonyms, ...mapping.synonyms };
        log(`  ${attrId}: Adding ${Object.keys(mapping.synonyms).length} synonyms`);
      }
      
      // Extend allowed_values
      if (mapping.allowed_values_extend && mapping.allowed_values_extend.length > 0) {
        const existingAllowed = existingData.allowed_values || [];
        const newValues = mapping.allowed_values_extend.filter(v => !existingAllowed.includes(v));
        if (newValues.length > 0) {
          update.allowed_values = [...existingAllowed, ...newValues];
          log(`  ${attrId}: Adding allowed_values: ${newValues.join(', ')}`);
        }
      }
      
      // Apply update with merge
      await docRef.set(update, { merge: true });
      log(`✓ Updated: ${attrId}`);
      results.success.push(attrId);
      
    } catch (err) {
      log(`✗ Failed to update ${attrId}: ${err.message}`);
      results.failed.push({ id: attrId, error: err.message });
    }
  }
  
  // Summary
  log('\n--- Summary ---');
  log(`Success: ${results.success.length}`);
  log(`Failed: ${results.failed.length}`);
  
  if (results.failed.length > 0) {
    log('\nFailed updates:');
    results.failed.forEach(f => log(`  - ${f.id}: ${f.error}`));
  }
  
  // Write log file
  fs.writeFileSync(logFile, logs.join('\n'));
  log(`\nLog saved to: ${logFile}`);
  
  // Output JSON result
  const result = {
    date,
    backupFile,
    logFile,
    attributesUpdated: results.success,
    attributesFailed: results.failed,
    version: canonicalMapping._version
  };
  
  console.log('\n=== RESULT ===');
  console.log(JSON.stringify(result, null, 2));
  
  process.exit(results.failed.length > 0 ? 1 : 0);
}

main().catch(err => {
  console.error('Fatal error:', err);
  process.exit(1);
});
