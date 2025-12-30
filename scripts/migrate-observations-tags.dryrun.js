#!/usr/bin/env node
/**
 * migrate-observations-tags.dryrun.js
 * 
 * LP-obs-studio-cleanup-1.0.0: Migration dry-run script for observations tags.
 * 
 * This script:
 * 1. Samples N observations from Firestore
 * 2. Derives potential tags from comma-separated text fields
 * 3. Writes a dry-run report to /tmp
 * 
 * IMPORTANT: This is a DRY-RUN ONLY script. It does NOT write to Firestore.
 * Any production migration requires explicit Lisa approval and a separate LP.
 * 
 * Usage:
 *   node scripts/migrate-observations-tags.dryrun.js <path-to-sa-key.json> [--limit=N]
 * 
 * Example:
 *   node scripts/migrate-observations-tags.dryrun.js /tmp/ropi-deploy-sa-key.json --limit=100
 */

const admin = require('firebase-admin');
const fs = require('fs');
const path = require('path');

// Parse command line arguments
const args = process.argv.slice(2);
const saKeyPath = args.find(arg => !arg.startsWith('--'));
const limitArg = args.find(arg => arg.startsWith('--limit='));
const limit = limitArg ? parseInt(limitArg.split('=')[1], 10) : 50;

if (!saKeyPath) {
  console.error('Usage: node scripts/migrate-observations-tags.dryrun.js <path-to-sa-key.json> [--limit=N]');
  console.error('');
  console.error('This is a DRY-RUN script. It does NOT modify Firestore.');
  process.exit(1);
}

// Validate SA key file exists
if (!fs.existsSync(saKeyPath)) {
  console.error(`Error: Service account key file not found: ${saKeyPath}`);
  process.exit(1);
}

// Initialize Firebase Admin
const serviceAccount = JSON.parse(fs.readFileSync(saKeyPath, 'utf8'));
admin.initializeApp({
  credential: admin.credential.cert(serviceAccount),
});

const db = admin.firestore();

/**
 * Extract potential tags from observation text.
 * Tags are derived from comma-separated values in the text field.
 */
function deriveTagsFromText(text) {
  if (!text || typeof text !== 'string') return [];
  
  // Split by commas and clean up
  const parts = text.split(',').map(part => part.trim().toLowerCase());
  
  // Filter out empty parts and very long strings (probably not tags)
  const tags = parts.filter(part => part.length > 0 && part.length < 50);
  
  // Deduplicate
  return [...new Set(tags)];
}

async function runDryRunMigration() {
  console.log('='.repeat(60));
  console.log('OBSERVATIONS TAGS MIGRATION - DRY RUN');
  console.log('LP-obs-studio-cleanup-1.0.0');
  console.log('='.repeat(60));
  console.log('');
  console.log('⚠️  THIS IS A DRY-RUN. NO CHANGES WILL BE MADE TO FIRESTORE.');
  console.log('');
  console.log(`Sampling up to ${limit} observations...`);
  console.log('');

  const report = {
    timestamp: new Date().toISOString(),
    lp: 'LP-obs-studio-cleanup-1.0.0',
    mode: 'DRY_RUN',
    limit: limit,
    totalSampled: 0,
    observationsWithoutTags: 0,
    observationsWithExistingTags: 0,
    candidatesForTagDerivation: 0,
    samples: [],
    summary: null,
  };

  try {
    // Query observations (oldest first to get representative sample)
    const snapshot = await db
      .collection('observations')
      .orderBy('createdAt', 'asc')
      .limit(limit)
      .get();

    report.totalSampled = snapshot.size;
    console.log(`Fetched ${snapshot.size} observations.`);
    console.log('');

    for (const doc of snapshot.docs) {
      const data = doc.data();
      const existingTags = data.tags || [];
      const derivedTags = deriveTagsFromText(data.text);

      const sample = {
        id: doc.id,
        product_mpn: data.product_mpn || null,
        text: data.text ? data.text.substring(0, 100) + (data.text.length > 100 ? '...' : '') : null,
        existingTags: existingTags,
        derivedTags: derivedTags,
        hasExistingTags: existingTags.length > 0,
        wouldMigrate: existingTags.length === 0 && derivedTags.length > 0,
      };

      report.samples.push(sample);

      if (existingTags.length > 0) {
        report.observationsWithExistingTags++;
      } else {
        report.observationsWithoutTags++;
        if (derivedTags.length > 0) {
          report.candidatesForTagDerivation++;
        }
      }
    }

    // Summary
    report.summary = {
      totalSampled: report.totalSampled,
      withExistingTags: report.observationsWithExistingTags,
      withoutTags: report.observationsWithoutTags,
      candidatesForMigration: report.candidatesForTagDerivation,
      percentCandidates: report.totalSampled > 0 
        ? ((report.candidatesForTagDerivation / report.totalSampled) * 100).toFixed(1) + '%'
        : '0%',
    };

    console.log('--- SUMMARY ---');
    console.log(`Total sampled: ${report.summary.totalSampled}`);
    console.log(`With existing tags: ${report.summary.withExistingTags}`);
    console.log(`Without tags: ${report.summary.withoutTags}`);
    console.log(`Candidates for tag derivation: ${report.summary.candidatesForMigration} (${report.summary.percentCandidates})`);
    console.log('');

    // Show a few examples
    console.log('--- SAMPLE CANDIDATES (first 5) ---');
    const candidates = report.samples.filter(s => s.wouldMigrate).slice(0, 5);
    for (const c of candidates) {
      console.log(`  ID: ${c.id}`);
      console.log(`  MPN: ${c.product_mpn}`);
      console.log(`  Text: ${c.text}`);
      console.log(`  Derived tags: [${c.derivedTags.join(', ')}]`);
      console.log('');
    }

    // Write report file
    const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
    const reportPath = `/tmp/migrate-observations-tags.dryrun.${timestamp}.json`;
    fs.writeFileSync(reportPath, JSON.stringify(report, null, 2));
    
    console.log('--- REPORT WRITTEN ---');
    console.log(`Report file: ${reportPath}`);
    console.log('');
    console.log('✅ DRY-RUN COMPLETE. No changes made to Firestore.');
    console.log('');
    console.log('To apply this migration in production, a separate LP is required');
    console.log('with explicit Lisa approval and the following steps:');
    console.log('  1. Create LP-obs-studio-cleanup-migration-apply-X.X.X');
    console.log('  2. Review dry-run report with Lisa');
    console.log('  3. Implement and test apply script');
    console.log('  4. Deploy to staging, verify, then production');
    
    return report;

  } catch (error) {
    console.error('Error during dry-run:', error);
    report.error = error.message;
    
    // Still write the report with error info
    const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
    const reportPath = `/tmp/migrate-observations-tags.dryrun.${timestamp}.json`;
    fs.writeFileSync(reportPath, JSON.stringify(report, null, 2));
    
    console.error(`Report with error written to: ${reportPath}`);
    process.exit(1);
  }
}

// Run the dry-run
runDryRunMigration()
  .then(() => {
    process.exit(0);
  })
  .catch((err) => {
    console.error('Fatal error:', err);
    process.exit(1);
  });
