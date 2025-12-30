#!/usr/bin/env node
/**
 * migrate-observations-tags.rollback.js
 * 
 * LP-obs-studio-cleanup-apply-1.5.0: Rollback script for observations tags.
 * 
 * This script:
 * 1. Loads the apply report or list of applied doc IDs
 * 2. Removes the tags that were added by the migration
 * 3. Optionally restores from audit log if available
 * 
 * ⚠️  WARNING: This script modifies Firestore.
 * Preferred rollback is via Firestore snapshot restore.
 * Use this script only for targeted/partial rollback.
 * 
 * Usage:
 *   node scripts/migrate-observations-tags.rollback.js <sa-key.json> [options]
 * 
 * Options:
 *   --appliedDocs=PATH      Path to applied docs list (from apply report or JSON array)
 *   --applyReport=PATH      Path to full apply report (alternative to --appliedDocs)
 *   --auditCollection=NAME  Collection with audit logs (default: _activityLog)
 *   --mode=MODE             'remove' (remove tags field) or 'restore' (from audit)
 *   --output=PATH           Output report path
 *   --dryRun=BOOL           Simulate only (default: false)
 * 
 * Examples:
 *   # Remove tags from applied docs
 *   node scripts/migrate-observations-tags.rollback.js /tmp/ropi-prod-sa.json \
 *     --applyReport=/tmp/apply.report.json \
 *     --mode=remove
 * 
 *   # Dry-run rollback
 *   node scripts/migrate-observations-tags.rollback.js /tmp/ropi-prod-sa.json \
 *     --appliedDocs=/tmp/applied_ids.json \
 *     --dryRun=true
 */

const admin = require('firebase-admin');
const fs = require('fs');

// =============================================================================
// CLI ARGUMENT PARSING
// =============================================================================

const args = process.argv.slice(2);
const saKeyPath = args.find(arg => !arg.startsWith('--'));

function getArg(name, defaultValue) {
  const arg = args.find(a => a.startsWith(`--${name}=`));
  return arg ? arg.split('=').slice(1).join('=') : defaultValue;
}

function getBoolArg(name, defaultValue) {
  const val = getArg(name, null);
  if (val === null) return defaultValue;
  return val === 'true' || val === '1';
}

const appliedDocsPath = getArg('appliedDocs', null);
const applyReportPath = getArg('applyReport', null);
const auditCollection = getArg('auditCollection', '_activityLog');
const mode = getArg('mode', 'remove');
const outputPath = getArg('output', '/tmp/migrate-observations-tags.rollback.report.json');
const isDryRun = getBoolArg('dryRun', false);

if (!saKeyPath || (!appliedDocsPath && !applyReportPath)) {
  console.error('Usage: node scripts/migrate-observations-tags.rollback.js <sa-key.json> [options]');
  console.error('');
  console.error('Required (one of):');
  console.error('  --appliedDocs=PATH    JSON file with doc IDs to rollback');
  console.error('  --applyReport=PATH    Full apply report (will extract appliedDocs)');
  console.error('');
  console.error('Options:');
  console.error('  --auditCollection=    Audit collection (default: _activityLog)');
  console.error('  --mode=MODE           "remove" or "restore" (default: remove)');
  console.error('  --output=PATH         Output report path');
  console.error('  --dryRun=BOOL         Simulate only (default: false)');
  console.error('');
  console.error('⚠️  This script modifies Firestore. Prefer snapshot restore for full rollback.');
  process.exit(1);
}

if (!fs.existsSync(saKeyPath)) {
  console.error(`Error: Service account key not found: ${saKeyPath}`);
  process.exit(1);
}

// =============================================================================
// FIREBASE INITIALIZATION
// =============================================================================

const serviceAccount = JSON.parse(fs.readFileSync(saKeyPath, 'utf8'));
admin.initializeApp({
  credential: admin.credential.cert(serviceAccount),
});
const db = admin.firestore();
const FieldValue = admin.firestore.FieldValue;

// =============================================================================
// MAIN ROLLBACK LOGIC
// =============================================================================

async function runRollback() {
  console.log('═'.repeat(70));
  console.log('OBSERVATIONS TAGS MIGRATION - ROLLBACK');
  console.log('LP-obs-studio-cleanup-apply-1.5.0');
  console.log('═'.repeat(70));
  console.log('');

  if (isDryRun) {
    console.log('🔵 DRY-RUN MODE: No changes will be written.');
  } else {
    console.log('🔴 LIVE MODE: This script WILL modify Firestore.');
  }
  console.log(`Mode: ${mode}`);
  console.log('');

  const report = {
    meta: {
      timestamp: new Date().toISOString(),
      lp: 'LP-obs-studio-cleanup-apply-1.5.0',
      mode,
      isDryRun,
    },
    counts: {
      totalDocs: 0,
      rolledBack: 0,
      skipped: 0,
      failed: 0,
    },
    rolledBackDocs: [],
    failedDocs: [],
    durationMs: 0,
  };

  const startTime = Date.now();

  try {
    // Load applied docs
    let appliedDocs = [];

    if (applyReportPath) {
      console.log(`Loading apply report: ${applyReportPath}`);
      const applyReport = JSON.parse(fs.readFileSync(applyReportPath, 'utf8'));
      appliedDocs = applyReport.appliedDocs || [];
    } else if (appliedDocsPath) {
      console.log(`Loading applied docs: ${appliedDocsPath}`);
      const content = fs.readFileSync(appliedDocsPath, 'utf8');
      const parsed = JSON.parse(content);
      // Support array of IDs or array of {id, tags} objects
      appliedDocs = Array.isArray(parsed)
        ? parsed.map(d => typeof d === 'string' ? { id: d } : d)
        : [];
    }

    report.counts.totalDocs = appliedDocs.length;
    console.log(`Total docs to rollback: ${appliedDocs.length}`);
    console.log('');

    if (appliedDocs.length === 0) {
      console.log('No docs to rollback.');
      fs.writeFileSync(outputPath, JSON.stringify(report, null, 2));
      return report;
    }

    // Process rollback
    const batchSize = 500;
    for (let i = 0; i < appliedDocs.length; i += batchSize) {
      const batch = appliedDocs.slice(i, i + batchSize);
      console.log(`Processing batch ${Math.floor(i / batchSize) + 1}...`);

      for (const doc of batch) {
        const docId = doc.id;
        const tagsToRemove = doc.tags || [];

        try {
          if (mode === 'remove') {
            // Remove the tags field entirely or remove specific tags
            if (!isDryRun) {
              if (tagsToRemove.length > 0) {
                await db.collection('observations').doc(docId).update({
                  tags: FieldValue.arrayRemove(...tagsToRemove),
                  _lastMigration: FieldValue.delete(),
                });
              } else {
                // Remove entire tags field
                await db.collection('observations').doc(docId).update({
                  tags: FieldValue.delete(),
                  _lastMigration: FieldValue.delete(),
                });
              }

              // Log rollback to audit
              await db.collection(auditCollection).add({
                type: 'migration',
                lp: 'LP-obs-studio-cleanup-apply-1.5.0',
                action: 'rollback_tags',
                documentId: docId,
                collection: 'observations',
                tagsRemoved: tagsToRemove,
                timestamp: FieldValue.serverTimestamp(),
              });
            }

            report.rolledBackDocs.push({ id: docId });
            report.counts.rolledBack++;

          } else if (mode === 'restore') {
            // Restore from audit log (find previous state)
            // This is more complex and requires audit log to have stored original state
            console.log(`  ⚠️  Restore mode not fully implemented. Use snapshot restore.`);
            report.counts.skipped++;
          }

        } catch (err) {
          report.failedDocs.push({ id: docId, error: err.message });
          report.counts.failed++;
        }
      }
    }

    report.durationMs = Date.now() - startTime;

    // Summary
    console.log('');
    console.log('─'.repeat(70));
    console.log('ROLLBACK COMPLETE');
    console.log('─'.repeat(70));
    console.log(`Total docs:       ${report.counts.totalDocs}`);
    console.log(`Rolled back:      ${report.counts.rolledBack}`);
    console.log(`Skipped:          ${report.counts.skipped}`);
    console.log(`Failed:           ${report.counts.failed}`);
    console.log(`Duration:         ${(report.durationMs / 1000).toFixed(1)}s`);
    console.log('');

    fs.writeFileSync(outputPath, JSON.stringify(report, null, 2));
    console.log(`Report written to: ${outputPath}`);

    return report;

  } catch (error) {
    console.error('❌ Error:', error.message);
    report.error = error.message;
    report.durationMs = Date.now() - startTime;
    fs.writeFileSync(outputPath, JSON.stringify(report, null, 2));
    process.exit(1);
  }
}

runRollback()
  .then(() => process.exit(0))
  .catch((err) => {
    console.error('Fatal error:', err);
    process.exit(1);
  });
