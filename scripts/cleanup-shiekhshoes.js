#!/usr/bin/env node
/**
 * LP-0.1.4 — Cleanup: Remove shiekhshoes.com from staging Firestore
 * 
 * This script removes 'shiekhshoes.com' from the websites array of all products
 * that contain it. It is idempotent and safe to run multiple times.
 * 
 * Usage:
 *   node scripts/cleanup-shiekhshoes.js                # Dry-run mode (default)
 *   node scripts/cleanup-shiekhshoes.js --dry-run      # Explicit dry-run
 *   node scripts/cleanup-shiekhshoes.js --write        # Actually perform cleanup (requires Lisa approval)
 *   node scripts/cleanup-shiekhshoes.js --write --yes  # Skip confirmation prompt
 * 
 * Environment Variables:
 *   GOOGLE_APPLICATION_CREDENTIALS - Path to service account JSON
 *   GCP_SA_KEY_BASE64              - Base64-encoded service account JSON
 * 
 * Safety Features:
 *   - Dry-run by default (no writes unless --write flag)
 *   - Confirmation prompt before writes
 *   - Detailed logging of all changes
 *   - Backup of original values before modification
 * 
 * LP-0.1.4 — cleanup: remove shiekhshoes.com from staging
 * Lisa v1.0.1 authorization required before running with --write
 */

const admin = require('firebase-admin');
const fs = require('fs');
const readline = require('readline');

// Parse command line args
const args = process.argv.slice(2);
const isDryRun = !args.includes('--write');
const skipConfirm = args.includes('--yes');

console.log('─────────────────────────────────────────────────────────');
console.log('🧹 LP-0.1.4 FIRESTORE CLEANUP: shiekhshoes.com');
console.log('─────────────────────────────────────────────────────────');
console.log(`   Mode: ${isDryRun ? 'DRY-RUN (no writes)' : '⚠️  WRITE MODE'}`);
console.log(`   Target: products.websites containing 'shiekhshoes.com'`);
console.log(`   Action: Remove 'shiekhshoes.com' from websites array`);
console.log('─────────────────────────────────────────────────────────\n');

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
 * Prompt user for confirmation (unless --yes flag or dry-run)
 */
async function confirmCleanup(count) {
  if (skipConfirm || isDryRun) return true;
  
  const rl = readline.createInterface({
    input: process.stdin,
    output: process.stdout,
  });
  
  return new Promise((resolve) => {
    console.log('\n⚠️  WARNING: This will modify Firestore data.');
    console.log(`   ${count} documents will be updated.\n`);
    rl.question('Are you sure you want to proceed? (y/N): ', (answer) => {
      rl.close();
      resolve(answer.toLowerCase() === 'y' || answer.toLowerCase() === 'yes');
    });
  });
}

async function cleanupShiekhshoes() {
  const targetValue = 'shiekhshoes.com';
  const results = {
    found: 0,
    cleaned: 0,
    skipped: 0,
    errors: 0,
    backups: [],
  };

  try {
    // Find all documents with shiekhshoes.com
    console.log(`\n🔍 Searching for documents with '${targetValue}'...\n`);
    
    const snap = await db.collection('products')
      .where('websites', 'array-contains', targetValue)
      .get();

    results.found = snap.size;
    console.log(`📊 Found: ${results.found} documents\n`);

    if (results.found === 0) {
      console.log('✅ No documents to clean. Firestore is already clean.\n');
      return results;
    }

    // Display what will be cleaned
    console.log('📋 CLEANUP PREVIEW:\n');
    const docs = [];
    snap.forEach(doc => {
      const data = doc.data();
      const originalWebsites = data.websites || [];
      const cleanedWebsites = originalWebsites.filter(w => w !== targetValue);
      
      docs.push({
        id: doc.id,
        original: originalWebsites,
        cleaned: cleanedWebsites,
        ref: doc.ref,
      });

      console.log(`   📦 ${doc.id}`);
      console.log(`      Before: [${originalWebsites.join(', ')}]`);
      console.log(`      After:  [${cleanedWebsites.join(', ')}]`);
      console.log('');

      // Store backup
      results.backups.push({
        id: doc.id,
        originalWebsites: originalWebsites,
        timestamp: new Date().toISOString(),
      });
    });

    // Dry-run exit
    if (isDryRun) {
      console.log('─────────────────────────────────────────────────────────');
      console.log('🔍 DRY-RUN COMPLETE');
      console.log(`   ${results.found} documents would be updated.`);
      console.log('   Run with --write to actually perform cleanup.');
      console.log('─────────────────────────────────────────────────────────\n');
      
      // Output backup data for reference
      console.log('📎 BACKUP DATA (for recovery if needed):');
      console.log(JSON.stringify(results.backups, null, 2));
      console.log('');
      
      return results;
    }

    // Confirm before writing
    const confirmed = await confirmCleanup(results.found);
    if (!confirmed) {
      console.log('❌ Cleanup cancelled by user.');
      process.exit(0);
    }

    // Perform cleanup
    console.log('\n🧹 Performing cleanup...\n');
    
    for (const doc of docs) {
      try {
        await doc.ref.update({
          websites: doc.cleaned,
          updatedAt: admin.firestore.FieldValue.serverTimestamp(),
          _cleanupNote: `LP-0.1.4: Removed shiekhshoes.com on ${new Date().toISOString()}`,
        });
        console.log(`   ✓ Cleaned: ${doc.id}`);
        results.cleaned++;
      } catch (error) {
        console.error(`   ✗ Failed: ${doc.id}: ${error.message}`);
        results.errors++;
      }
    }

    console.log('\n─────────────────────────────────────────────────────────');
    console.log('📊 CLEANUP COMPLETE');
    console.log(`   Found:   ${results.found} documents`);
    console.log(`   Cleaned: ${results.cleaned} documents`);
    console.log(`   Errors:  ${results.errors} documents`);
    console.log('─────────────────────────────────────────────────────────\n');

    // Output backup data
    console.log('📎 BACKUP DATA (for recovery if needed):');
    console.log(JSON.stringify(results.backups, null, 2));
    console.log('');

    return results;

  } catch (error) {
    console.error('❌ Cleanup failed:', error.message);
    process.exit(1);
  }
}

// Verification function to run after cleanup
async function verifyCleanup() {
  console.log('\n🔍 VERIFICATION: Checking for remaining ghost values...\n');
  
  const snap = await db.collection('products')
    .where('websites', 'array-contains', 'shiekhshoes.com')
    .get();

  if (snap.size === 0) {
    console.log('✅ VERIFICATION PASSED: No documents contain shiekhshoes.com');
    return true;
  } else {
    console.log(`⚠️  VERIFICATION FAILED: ${snap.size} documents still contain shiekhshoes.com`);
    snap.forEach(doc => console.log(`   - ${doc.id}`));
    return false;
  }
}

cleanupShiekhshoes()
  .then(async (results) => {
    // Run verification after write mode
    if (!isDryRun && results.cleaned > 0) {
      const verified = await verifyCleanup();
      if (!verified) {
        console.log('\n⚠️  Some documents may need manual review.');
        process.exit(1);
      }
    }
    
    console.log('\n✅ LP-0.1.4 cleanup script completed successfully');
    process.exit(0);
  })
  .catch(error => {
    console.error('❌ Cleanup script failed:', error);
    process.exit(1);
  });
