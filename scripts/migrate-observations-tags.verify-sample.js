#!/usr/bin/env node
/**
 * migrate-observations-tags.verify-sample.js
 * 
 * LP-obs-studio-cleanup-apply-1.5.0: Post-apply verification script.
 * 
 * This script:
 * 1. Loads the apply report
 * 2. Samples N applied documents
 * 3. Verifies tags were correctly applied
 * 4. Reports match/mismatch statistics
 * 
 * Usage:
 *   node scripts/migrate-observations-tags.verify-sample.js <sa-key.json> [options]
 * 
 * Options:
 *   --applyReport=PATH   Path to apply report (required)
 *   --sampleSize=N       Number of docs to verify (default: 100)
 *   --output=PATH        Output path (default: /tmp/verify.report.json)
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

const applyReportPath = getArg('applyReport', null);
const sampleSize = parseInt(getArg('sampleSize', '100'), 10);
const outputPath = getArg('output', '/tmp/migrate-observations-tags.verify.report.json');

if (!saKeyPath || !applyReportPath) {
  console.error('Usage: node scripts/migrate-observations-tags.verify-sample.js <sa-key.json> --applyReport=PATH [options]');
  console.error('');
  console.error('Required:');
  console.error('  <sa-key.json>         Path to service account key');
  console.error('  --applyReport=PATH    Path to apply report');
  console.error('');
  console.error('Options:');
  console.error('  --sampleSize=N        Docs to verify (default: 100)');
  console.error('  --output=PATH         Output report path');
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

// =============================================================================
// MAIN VERIFY LOGIC
// =============================================================================

async function runVerify() {
  console.log('═'.repeat(70));
  console.log('OBSERVATIONS TAGS MIGRATION - POST-APPLY VERIFICATION');
  console.log('LP-obs-studio-cleanup-apply-1.5.0');
  console.log('═'.repeat(70));
  console.log('');
  console.log(`Sample size: ${sampleSize}`);
  console.log('');

  const report = {
    meta: {
      timestamp: new Date().toISOString(),
      lp: 'LP-obs-studio-cleanup-apply-1.5.0',
      applyReportPath,
      sampleSize,
    },
    counts: {
      sampleSize: 0,
      sampleMatches: 0,
      sampleMismatches: 0,
      sampleMissing: 0,
    },
    matchRate: 0,
    mismatches: [],
    missing: [],
  };

  try {
    // Load apply report
    console.log(`Loading apply report: ${applyReportPath}`);
    const applyReport = JSON.parse(fs.readFileSync(applyReportPath, 'utf8'));
    const appliedDocs = applyReport.appliedDocs || [];
    
    if (appliedDocs.length === 0) {
      console.log('No applied docs in report. Nothing to verify.');
      fs.writeFileSync(outputPath, JSON.stringify(report, null, 2));
      return report;
    }

    // Random sample
    const shuffled = [...appliedDocs].sort(() => Math.random() - 0.5);
    const sample = shuffled.slice(0, Math.min(sampleSize, shuffled.length));
    report.counts.sampleSize = sample.length;

    console.log(`Verifying ${sample.length} documents...`);
    console.log('');

    for (const doc of sample) {
      const docId = doc.id;
      const expectedTags = new Set((doc.tags || []).map(t => t.toLowerCase()));

      try {
        const snap = await db.collection('observations').doc(docId).get();
        
        if (!snap.exists) {
          report.counts.sampleMissing++;
          report.missing.push({ id: docId });
          continue;
        }

        const data = snap.data();
        const actualTags = new Set((data.tags || []).map(t => t.toLowerCase()));

        // Check if all expected tags are present
        let allPresent = true;
        for (const tag of expectedTags) {
          if (!actualTags.has(tag)) {
            allPresent = false;
            break;
          }
        }

        if (allPresent) {
          report.counts.sampleMatches++;
        } else {
          report.counts.sampleMismatches++;
          report.mismatches.push({
            id: docId,
            expected: [...expectedTags],
            actual: [...actualTags],
          });
        }

      } catch (err) {
        report.counts.sampleMissing++;
        report.missing.push({ id: docId, error: err.message });
      }
    }

    report.matchRate = report.counts.sampleSize > 0
      ? report.counts.sampleMatches / report.counts.sampleSize
      : 0;

    // Summary
    console.log('─'.repeat(70));
    console.log('VERIFICATION RESULTS');
    console.log('─'.repeat(70));
    console.log(`Sample size:      ${report.counts.sampleSize}`);
    console.log(`Matches:          ${report.counts.sampleMatches}`);
    console.log(`Mismatches:       ${report.counts.sampleMismatches}`);
    console.log(`Missing:          ${report.counts.sampleMissing}`);
    console.log(`Match rate:       ${(report.matchRate * 100).toFixed(1)}%`);
    console.log('');

    if (report.matchRate >= 0.99) {
      console.log('✅ VERIFICATION PASSED (≥99% match rate)');
    } else {
      console.log('❌ VERIFICATION FAILED (<99% match rate)');
    }

    fs.writeFileSync(outputPath, JSON.stringify(report, null, 2));
    console.log(`Report written to: ${outputPath}`);

    return report;

  } catch (error) {
    console.error('❌ Error:', error.message);
    report.error = error.message;
    fs.writeFileSync(outputPath, JSON.stringify(report, null, 2));
    process.exit(1);
  }
}

runVerify()
  .then(() => process.exit(0))
  .catch((err) => {
    console.error('Fatal error:', err);
    process.exit(1);
  });
