#!/usr/bin/env node
/**
 * LP-0.1.4 — Cleanup: Remove shiekhshoes.com from staging Firestore
 * 
 * Enhanced version with Lisa's exact write semantics:
 * 1. Remove 'shiekhshoes.com' from websites array
 * 2. Ensure at least one website remains (default: 'shiekh.com')
 * 3. Add meta.cleanup.shiekhshoes audit object
 * 4. Update updatedAt timestamp
 * 5. Log all changes to CSV and JSON files
 * 
 * Usage:
 *   node scripts/cleanup-shiekhshoes-v2.js                          # Dry-run mode (default)
 *   node scripts/cleanup-shiekhshoes-v2.js --dry-run --json-out=file.json  # Save dry-run to JSON
 *   node scripts/cleanup-shiekhshoes-v2.js --write --backup-sha=<sha> --yes
 * 
 * Required flags for write mode:
 *   --write                 Enable write mode (no writes without this)
 *   --backup-sha=<sha256>   SHA256 of backup file (required for traceability)
 *   --yes                   Skip confirmation prompt
 * 
 * LP-0.1.4 — cleanup: remove shiekhshoes.com from staging
 * Lisa v1.0.1 authorization required before running with --write
 */

const admin = require('firebase-admin');
const fs = require('fs');
const path = require('path');
const readline = require('readline');

// Parse command line args
const args = process.argv.slice(2);
const getArg = (name) => {
  const arg = args.find(a => a.startsWith(`--${name}=`));
  return arg ? arg.split('=')[1] : null;
};

const isDryRun = !args.includes('--write');
const skipConfirm = args.includes('--yes');
const backupSha = getArg('backup-sha');
const jsonOut = getArg('json-out');
const auditPrefix = getArg('audit-prefix') || 'HOMER_CLEANUP_LP-0.1.4';

const ARTIFACT_DIR = auditPrefix;
const timestamp = new Date().toISOString().replace(/[:.]/g, '').slice(0, 15) + 'Z';

console.log('═══════════════════════════════════════════════════════════');
console.log('🧹 LP-0.1.4 FIRESTORE CLEANUP: shiekhshoes.com (v2)');
console.log('═══════════════════════════════════════════════════════════');
console.log(`   Mode: ${isDryRun ? 'DRY-RUN (no writes)' : '⚠️  WRITE MODE'}`);
console.log(`   Target: products.websites containing 'shiekhshoes.com'`);
console.log(`   Action: Remove 'shiekhshoes.com', ensure min 1 website`);
console.log(`   Backup SHA: ${backupSha || '(not provided)'}`);
console.log(`   Artifact Dir: ${ARTIFACT_DIR}`);
console.log('═══════════════════════════════════════════════════════════\n');

// Validate write mode requirements
if (!isDryRun && !backupSha) {
  console.error('❌ WRITE MODE REQUIRES --backup-sha=<sha256>');
  console.error('   Run backup first and provide the SHA256 hash.');
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
    console.log(`   ${count} documents will be updated.`);
    console.log(`   Backup SHA: ${backupSha}\n`);
    rl.question('Are you sure you want to proceed? (y/N): ', (answer) => {
      rl.close();
      resolve(answer.toLowerCase() === 'y' || answer.toLowerCase() === 'yes');
    });
  });
}

/**
 * Ensure artifact directory exists
 */
function ensureArtifactDir() {
  const logsDir = path.join(ARTIFACT_DIR, 'logs');
  if (!fs.existsSync(logsDir)) {
    fs.mkdirSync(logsDir, { recursive: true });
  }
  return logsDir;
}

async function cleanupShiekhshoes() {
  const targetValue = 'shiekhshoes.com';
  const defaultWebsite = 'shiekh.com';
  const runTimestamp = new Date().toISOString();
  
  const results = {
    found: 0,
    cleaned: 0,
    skipped: 0,
    errors: 0,
    dryRun: isDryRun,
    backupSha: backupSha,
    timestamp: runTimestamp,
    documents: [],
    csvLines: ['docId,original_websites_json,new_websites_json,removed_count,removed_by,removed_at,backup_sha256'],
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

    // Process each document
    console.log('📋 CLEANUP PREVIEW:\n');
    const docs = [];
    
    snap.forEach(doc => {
      const data = doc.data();
      const originalWebsites = data.websites || [];
      
      // Lisa's semantic rule 1: filter out shiekhshoes.com
      let newWebsites = originalWebsites.filter(w => w !== targetValue);
      
      // Lisa's semantic rule 2: ensure at least one website
      if (newWebsites.length === 0) {
        newWebsites = [defaultWebsite];
      }
      
      const removed = originalWebsites.filter(w => w === targetValue);
      
      const docInfo = {
        docId: doc.id,
        original_websites: originalWebsites,
        proposed_websites: newWebsites,
        removed: removed,
        removed_count: removed.length,
        timestamp: runTimestamp,
        ref: doc.ref,
      };
      
      docs.push(docInfo);
      results.documents.push({
        docId: doc.id,
        original_websites: originalWebsites,
        proposed_websites: newWebsites,
        removed: removed,
        removed_count: removed.length,
        timestamp: runTimestamp,
      });

      // Add CSV line
      results.csvLines.push([
        doc.id,
        JSON.stringify(originalWebsites),
        JSON.stringify(newWebsites),
        removed.length,
        'automation:LP-0.1.4',
        runTimestamp,
        backupSha || 'N/A',
      ].join(','));

      console.log(`   📦 ${doc.id}`);
      console.log(`      Before: [${originalWebsites.join(', ')}]`);
      console.log(`      After:  [${newWebsites.join(', ')}]`);
      console.log(`      Removed: ${removed.length} item(s)`);
      console.log('');
    });

    // Save dry-run JSON output
    const dryRunReport = {
      _metadata: {
        script: 'cleanup-shiekhshoes-v2.js',
        version: '2.0.0',
        mode: isDryRun ? 'dry-run' : 'write',
        timestamp: runTimestamp,
        backupSha: backupSha,
        targetValue: targetValue,
        documentsFound: results.found,
      },
      documents: results.documents,
    };

    // Write dry-run report
    const logsDir = ensureArtifactDir();
    const dryRunFile = jsonOut || path.join(logsDir, `dryrun_report_${timestamp}.json`);
    fs.writeFileSync(dryRunFile, JSON.stringify(dryRunReport, null, 2));
    console.log(`📄 Dry-run report saved to: ${dryRunFile}\n`);

    // Dry-run exit
    if (isDryRun) {
      console.log('═══════════════════════════════════════════════════════════');
      console.log('🔍 DRY-RUN COMPLETE');
      console.log(`   ${results.found} documents would be updated.`);
      console.log('   Run with --write --backup-sha=<sha> to perform cleanup.');
      console.log('═══════════════════════════════════════════════════════════\n');
      
      return results;
    }

    // Confirm before writing
    const confirmed = await confirmCleanup(results.found);
    if (!confirmed) {
      console.log('❌ Cleanup cancelled by user.');
      process.exit(0);
    }

    // Setup run log
    const runLogFile = path.join(logsDir, `run_${timestamp}.log`);
    const runLog = [];
    const log = (msg) => {
      console.log(msg);
      runLog.push(`[${new Date().toISOString()}] ${msg}`);
    };

    // Perform cleanup with Lisa's exact semantics
    log('\n🧹 Performing cleanup with Lisa v1.0.1 semantics...\n');
    
    for (const doc of docs) {
      try {
        // Lisa's semantic rule 3-5: Build the update object
        const updateData = {
          websites: doc.proposed_websites,
          updatedAt: admin.firestore.FieldValue.serverTimestamp(),
          // Lisa's semantic rule 4: Add audit object under meta.cleanup.shiekhshoes
          'meta.cleanup.shiekhshoes': {
            removed: doc.removed,
            removed_at: runTimestamp,
            removed_by: 'automation:LP-0.1.4',
            dry_run: false,
            backup_sha256: backupSha,
          },
        };

        await doc.ref.update(updateData);
        
        // Lisa's semantic rule 6: Log one line per doc
        const logLine = `${doc.docId} | [${doc.original_websites.join(', ')}] => [${doc.proposed_websites.join(', ')}] | ${runTimestamp}`;
        log(`   ✓ ${logLine}`);
        
        results.cleaned++;
      } catch (error) {
        log(`   ✗ Failed: ${doc.docId}: ${error.message}`);
        results.errors++;
      }
    }

    // Write run log
    fs.writeFileSync(runLogFile, runLog.join('\n'));
    console.log(`\n📄 Run log saved to: ${runLogFile}`);

    // Write changes CSV
    const csvFile = path.join(logsDir, `changes_${timestamp}.csv`);
    fs.writeFileSync(csvFile, results.csvLines.join('\n'));
    console.log(`📄 Changes CSV saved to: ${csvFile}`);

    console.log('\n═══════════════════════════════════════════════════════════');
    console.log('📊 CLEANUP COMPLETE');
    console.log(`   Found:   ${results.found} documents`);
    console.log(`   Cleaned: ${results.cleaned} documents`);
    console.log(`   Errors:  ${results.errors} documents`);
    console.log(`   Backup:  ${backupSha}`);
    console.log('═══════════════════════════════════════════════════════════\n');

    return results;

  } catch (error) {
    console.error('❌ Cleanup failed:', error.message);
    process.exit(1);
  }
}

// Verification function to run after cleanup
async function verifyCleanup() {
  console.log('\n🔍 POST-RUN VERIFICATION: Checking for remaining ghost values...\n');
  
  const snap = await db.collection('products')
    .where('websites', 'array-contains', 'shiekhshoes.com')
    .get();

  if (snap.size === 0) {
    console.log('✅ VERIFICATION PASSED: 0 documents contain shiekhshoes.com');
    return true;
  } else {
    console.log(`⚠️  VERIFICATION FAILED: ${snap.size} documents still contain shiekhshoes.com`);
    snap.forEach(doc => console.log(`   - ${doc.id}`));
    return false;
  }
}

// Fetch and display updated documents for spot-check
async function spotCheckDocs(docIds) {
  console.log('\n🔍 SPOT-CHECK: Fetching updated documents...\n');
  
  const results = [];
  for (const docId of docIds) {
    try {
      const doc = await db.collection('products').doc(docId).get();
      if (doc.exists) {
        const data = doc.data();
        results.push({
          docId,
          websites: data.websites,
          meta: data.meta,
          updatedAt: data.updatedAt,
        });
        console.log(`   📦 ${docId}`);
        console.log(`      websites: [${(data.websites || []).join(', ')}]`);
        console.log(`      meta.cleanup.shiekhshoes: ${JSON.stringify(data.meta?.cleanup?.shiekhshoes || 'N/A')}`);
        console.log('');
      } else {
        console.log(`   ⚠️  ${docId} - NOT FOUND`);
      }
    } catch (error) {
      console.log(`   ❌ ${docId} - ERROR: ${error.message}`);
    }
  }
  
  return results;
}

cleanupShiekhshoes()
  .then(async (results) => {
    // Run verification after write mode
    if (!isDryRun && results.cleaned > 0) {
      const verified = await verifyCleanup();
      
      // Spot-check the modified documents
      const targetDocs = results.documents.map(d => d.docId);
      const spotCheck = await spotCheckDocs(targetDocs);
      
      // Save spot-check results
      const logsDir = path.join(ARTIFACT_DIR, 'logs');
      const spotCheckFile = path.join(logsDir, `spotcheck_${timestamp}.json`);
      fs.writeFileSync(spotCheckFile, JSON.stringify(spotCheck, null, 2));
      console.log(`📄 Spot-check results saved to: ${spotCheckFile}`);
      
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
