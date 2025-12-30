#!/usr/bin/env node
/**
 * migrate-observations-tags.apply.js
 * 
 * LP-obs-studio-cleanup-apply-1.5.0: Production apply script for observations tags backfill.
 * 
 * This script:
 * 1. Reads the accepted dry-run report (local or GCS)
 * 2. Applies tags[] to observation documents that don't have them
 * 3. Logs all changes to an audit collection
 * 4. Supports checkpointing for resumability
 * 5. Can run in sample mode or full mode
 * 
 * ⚠️  WARNING: This script WRITES to Firestore production.
 * Only run after all Apply LP preconditions are met:
 *   - Dry-run accepted
 *   - Snapshot created
 *   - Approvals obtained
 *   - Maintenance window active
 * 
 * Usage:
 *   node scripts/migrate-observations-tags.apply.js <path-to-sa-key.json> [options]
 * 
 * Options:
 *   --report=PATH           Path to dry-run report (local file or gs:// URI)
 *   --sampleFile=PATH       File with observation IDs to process (sample mode)
 *   --applyMode=MODE        'sample' or 'full' (default: full)
 *   --batchSize=N           Documents per batch (default: 500)
 *   --concurrency=N         Parallel batches (default: 1)
 *   --maxRetries=N          Max retries per doc on failure (default: 3)
 *   --auditCollection=NAME  Collection for audit logs (default: _activityLog)
 *   --checkpointGcs=PATH    GCS path for checkpoint file (resumability)
 *   --checkpointLocal=PATH  Local path for checkpoint file
 *   --output=PATH           Output report path (default: /tmp/apply.report.json)
 *   --dryRun=BOOL           If true, simulate but don't write (default: false)
 *   --overwrite=BOOL        Overwrite existing tags (default: false, skip if tags exist)
 * 
 * Examples:
 *   # Sample apply (50 docs)
 *   node scripts/migrate-observations-tags.apply.js /tmp/ropi-prod-sa.json \
 *     --report=/tmp/dryrun.report.json \
 *     --sampleFile=/tmp/sample_ids.txt \
 *     --applyMode=sample
 * 
 *   # Full apply with checkpoint
 *   node scripts/migrate-observations-tags.apply.js /tmp/ropi-prod-sa.json \
 *     --report=gs://ropi-aoss-backups/dryruns/dryrun.json \
 *     --batchSize=500 \
 *     --checkpointGcs=gs://ropi-aoss-backups/checkpoints/apply.checkpoint.json
 */

const admin = require('firebase-admin');
const fs = require('fs');
const path = require('path');
const { execSync } = require('child_process');

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

const reportPath = getArg('report', null);
const sampleFile = getArg('sampleFile', null);
const applyMode = getArg('applyMode', 'full');
const batchSize = parseInt(getArg('batchSize', '500'), 10);
const concurrency = parseInt(getArg('concurrency', '1'), 10);
const maxRetries = parseInt(getArg('maxRetries', '3'), 10);
const auditCollection = getArg('auditCollection', '_activityLog');
const checkpointGcs = getArg('checkpointGcs', null);
const checkpointLocal = getArg('checkpointLocal', null);
const outputPath = getArg('output', '/tmp/migrate-observations-tags.apply.report.json');
const isDryRun = getBoolArg('dryRun', false);
const overwrite = getBoolArg('overwrite', false);

if (!saKeyPath || !reportPath) {
  console.error('Usage: node scripts/migrate-observations-tags.apply.js <sa-key.json> --report=PATH [options]');
  console.error('');
  console.error('Required:');
  console.error('  <sa-key.json>       Path to service account key');
  console.error('  --report=PATH       Path to accepted dry-run report (local or gs://)');
  console.error('');
  console.error('Options:');
  console.error('  --sampleFile=PATH   File with observation IDs (sample mode)');
  console.error('  --applyMode=MODE    "sample" or "full" (default: full)');
  console.error('  --batchSize=N       Docs per batch (default: 500)');
  console.error('  --concurrency=N     Parallel batches (default: 1)');
  console.error('  --maxRetries=N      Retry count (default: 3)');
  console.error('  --auditCollection=  Audit collection (default: _activityLog)');
  console.error('  --checkpointGcs=    GCS checkpoint path');
  console.error('  --checkpointLocal=  Local checkpoint path');
  console.error('  --output=PATH       Output report (default: /tmp/apply.report.json)');
  console.error('  --dryRun=BOOL       Simulate only (default: false)');
  console.error('  --overwrite=BOOL    Overwrite existing tags (default: false)');
  console.error('');
  console.error('⚠️  This script WRITES to Firestore. Ensure all Apply LP preconditions are met.');
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
// HELPER FUNCTIONS
// =============================================================================

/**
 * Load file from local path or GCS URI.
 */
function loadFile(filePath) {
  if (filePath.startsWith('gs://')) {
    const tmpPath = `/tmp/gcs-download-${Date.now()}.json`;
    try {
      execSync(`gsutil cp "${filePath}" "${tmpPath}"`, { stdio: 'pipe' });
      const content = fs.readFileSync(tmpPath, 'utf8');
      fs.unlinkSync(tmpPath);
      return content;
    } catch (err) {
      throw new Error(`Failed to download from GCS: ${filePath} - ${err.message}`);
    }
  } else {
    return fs.readFileSync(filePath, 'utf8');
  }
}

/**
 * Save file to local path or GCS URI.
 */
function saveFile(filePath, content) {
  if (filePath.startsWith('gs://')) {
    const tmpPath = `/tmp/gcs-upload-${Date.now()}.json`;
    fs.writeFileSync(tmpPath, content);
    try {
      execSync(`gsutil cp "${tmpPath}" "${filePath}"`, { stdio: 'pipe' });
      fs.unlinkSync(tmpPath);
    } catch (err) {
      throw new Error(`Failed to upload to GCS: ${filePath} - ${err.message}`);
    }
  } else {
    fs.writeFileSync(filePath, content);
  }
}

/**
 * Load checkpoint (returns null if not found).
 */
function loadCheckpoint() {
  const checkpointPath = checkpointGcs || checkpointLocal;
  if (!checkpointPath) return null;
  
  try {
    const content = loadFile(checkpointPath);
    return JSON.parse(content);
  } catch {
    return null;
  }
}

/**
 * Save checkpoint.
 */
function saveCheckpoint(checkpoint) {
  const checkpointPath = checkpointGcs || checkpointLocal;
  if (!checkpointPath) return;
  
  saveFile(checkpointPath, JSON.stringify(checkpoint, null, 2));
}

/**
 * Sleep helper.
 */
function sleep(ms) {
  return new Promise(resolve => setTimeout(resolve, ms));
}

// =============================================================================
// MAIN APPLY LOGIC
// =============================================================================

async function runApply() {
  console.log('═'.repeat(70));
  console.log('OBSERVATIONS TAGS MIGRATION - APPLY');
  console.log('LP-obs-studio-cleanup-apply-1.5.0');
  console.log('═'.repeat(70));
  console.log('');
  
  if (isDryRun) {
    console.log('🔵 DRY-RUN MODE: No changes will be written to Firestore.');
  } else {
    console.log('🔴 LIVE MODE: This script WILL write to Firestore.');
  }
  console.log('');
  console.log(`Apply mode:       ${applyMode}`);
  console.log(`Batch size:       ${batchSize}`);
  console.log(`Concurrency:      ${concurrency}`);
  console.log(`Max retries:      ${maxRetries}`);
  console.log(`Audit collection: ${auditCollection}`);
  console.log(`Overwrite tags:   ${overwrite}`);
  console.log('');

  const report = {
    meta: {
      timestamp: new Date().toISOString(),
      lp: 'LP-obs-studio-cleanup-apply-1.5.0',
      mode: isDryRun ? 'DRY_RUN' : 'LIVE',
      applyMode,
      batchSize,
      concurrency,
      maxRetries,
      auditCollection,
      overwrite,
      reportSource: reportPath,
    },
    counts: {
      totalCandidates: 0,
      appliedCount: 0,
      skippedCount: 0,
      failedCount: 0,
      retriedCount: 0,
    },
    appliedDocs: [],
    skippedDocs: [],
    failedDocs: [],
    errors: [],
    durationMs: 0,
  };

  const startTime = Date.now();

  try {
    // Load dry-run report
    console.log(`Loading dry-run report: ${reportPath}`);
    const dryRunContent = loadFile(reportPath);
    const dryRun = JSON.parse(dryRunContent);
    console.log(`Dry-run report loaded. Total samples: ${dryRun.counts?.totalProcessed || 'unknown'}`);
    console.log('');

    // Build candidate list
    let candidates = [];

    if (applyMode === 'sample' && sampleFile) {
      // Sample mode: use IDs from file
      console.log(`Loading sample IDs from: ${sampleFile}`);
      const sampleContent = fs.readFileSync(sampleFile, 'utf8');
      const sampleIds = sampleContent.split('\n').map(s => s.trim()).filter(s => s.length > 0);
      
      // Look up these IDs in the dry-run samples
      const sampleMap = new Map();
      for (const s of (dryRun.samples?.wouldMigrate || [])) {
        sampleMap.set(s.id, s);
      }
      for (const s of (dryRun.fullData || [])) {
        if (s.wouldMigrate) sampleMap.set(s.id, s);
      }
      
      for (const id of sampleIds) {
        if (sampleMap.has(id)) {
          candidates.push(sampleMap.get(id));
        } else {
          // ID not in dry-run, we'll fetch it live
          candidates.push({ id, derivedTags: [], fetchLive: true });
        }
      }
      console.log(`Sample mode: ${candidates.length} candidates from file.`);
    } else {
      // Full mode: use all wouldMigrate from dry-run
      if (dryRun.fullData) {
        candidates = dryRun.fullData.filter(d => d.wouldMigrate);
      } else if (dryRun.samples?.wouldMigrate) {
        candidates = dryRun.samples.wouldMigrate;
        console.log('⚠️  Warning: Using samples only. For full apply, run dry-run with --all flag.');
      }
      console.log(`Full mode: ${candidates.length} candidates from dry-run.`);
    }

    report.counts.totalCandidates = candidates.length;

    if (candidates.length === 0) {
      console.log('No candidates to process. Exiting.');
      report.durationMs = Date.now() - startTime;
      fs.writeFileSync(outputPath, JSON.stringify(report, null, 2));
      console.log(`Report written to: ${outputPath}`);
      return report;
    }

    // Load checkpoint if exists
    const checkpoint = loadCheckpoint();
    let processedIds = new Set();
    if (checkpoint) {
      processedIds = new Set(checkpoint.processedIds || []);
      console.log(`Resuming from checkpoint. Already processed: ${processedIds.size}`);
    }

    // Filter out already processed
    const toProcess = candidates.filter(c => !processedIds.has(c.id));
    console.log(`To process: ${toProcess.length}`);
    console.log('');

    // Process in batches
    const batches = [];
    for (let i = 0; i < toProcess.length; i += batchSize) {
      batches.push(toProcess.slice(i, i + batchSize));
    }

    console.log(`Processing ${batches.length} batches...`);
    console.log('');

    for (let batchIdx = 0; batchIdx < batches.length; batchIdx++) {
      const batch = batches[batchIdx];
      console.log(`Batch ${batchIdx + 1}/${batches.length} (${batch.length} docs)...`);

      const batchOps = batch.map(async (candidate) => {
        const docId = candidate.id;
        let derivedTags = candidate.derivedTags || [];
        
        // If we need to fetch live (sample mode with unknown ID)
        if (candidate.fetchLive || derivedTags.length === 0) {
          try {
            const docSnap = await db.collection('observations').doc(docId).get();
            if (!docSnap.exists) {
              report.failedDocs.push({ id: docId, reason: 'Document not found' });
              report.counts.failedCount++;
              return;
            }
            const data = docSnap.data();
            // Re-derive tags using same logic as dry-run
            derivedTags = deriveTagsFromText(data.text);
            if (derivedTags.length === 0) {
              report.skippedDocs.push({ id: docId, reason: 'No tags derived' });
              report.counts.skippedCount++;
              return;
            }
            // Check if already has tags
            if ((data.tags || []).length > 0 && !overwrite) {
              report.skippedDocs.push({ id: docId, reason: 'Already has tags' });
              report.counts.skippedCount++;
              return;
            }
          } catch (err) {
            report.failedDocs.push({ id: docId, reason: err.message });
            report.counts.failedCount++;
            return;
          }
        }

        // Apply tags
        let retries = 0;
        let success = false;

        while (retries <= maxRetries && !success) {
          try {
            if (!isDryRun) {
              // Use arrayUnion to avoid duplicates
              await db.collection('observations').doc(docId).update({
                tags: overwrite ? derivedTags : FieldValue.arrayUnion(...derivedTags),
                _lastMigration: {
                  lp: 'LP-obs-studio-cleanup-apply-1.5.0',
                  timestamp: FieldValue.serverTimestamp(),
                  tagsAdded: derivedTags,
                },
              });

              // Write audit log
              await db.collection(auditCollection).add({
                type: 'migration',
                lp: 'LP-obs-studio-cleanup-apply-1.5.0',
                action: 'apply_tags',
                documentId: docId,
                collection: 'observations',
                tagsApplied: derivedTags,
                timestamp: FieldValue.serverTimestamp(),
                dryRunReportRef: reportPath,
              });
            }

            success = true;
            report.appliedDocs.push({ id: docId, tags: derivedTags });
            report.counts.appliedCount++;
            processedIds.add(docId);

          } catch (err) {
            retries++;
            report.counts.retriedCount++;
            if (retries > maxRetries) {
              report.failedDocs.push({ id: docId, reason: err.message, retries });
              report.counts.failedCount++;
              report.errors.push({ docId, error: err.message });
            } else {
              await sleep(1000 * retries); // Exponential backoff
            }
          }
        }
      });

      // Run batch with concurrency limit
      const chunks = [];
      for (let i = 0; i < batchOps.length; i += concurrency) {
        chunks.push(batchOps.slice(i, i + concurrency));
      }

      for (const chunk of chunks) {
        await Promise.all(chunk);
      }

      // Save checkpoint after each batch
      saveCheckpoint({
        timestamp: new Date().toISOString(),
        processedIds: [...processedIds],
        lastBatch: batchIdx + 1,
        totalBatches: batches.length,
      });

      console.log(`  Applied: ${report.counts.appliedCount}, Skipped: ${report.counts.skippedCount}, Failed: ${report.counts.failedCount}`);
    }

    report.durationMs = Date.now() - startTime;

    // Summary
    console.log('');
    console.log('─'.repeat(70));
    console.log('APPLY COMPLETE');
    console.log('─'.repeat(70));
    console.log(`Total candidates:  ${report.counts.totalCandidates}`);
    console.log(`Applied:           ${report.counts.appliedCount}`);
    console.log(`Skipped:           ${report.counts.skippedCount}`);
    console.log(`Failed:            ${report.counts.failedCount}`);
    console.log(`Retried:           ${report.counts.retriedCount}`);
    console.log(`Duration:          ${(report.durationMs / 1000).toFixed(1)}s`);
    console.log('');

    // Write report
    fs.writeFileSync(outputPath, JSON.stringify(report, null, 2));
    console.log(`Report written to: ${outputPath}`);

    if (report.failedDocs.length > 0) {
      const failedPath = outputPath.replace('.json', '.failed.json');
      fs.writeFileSync(failedPath, JSON.stringify(report.failedDocs, null, 2));
      console.log(`Failed docs written to: ${failedPath}`);
    }

    return report;

  } catch (error) {
    console.error('');
    console.error('❌ FATAL ERROR:', error.message);
    report.error = { message: error.message, stack: error.stack };
    report.durationMs = Date.now() - startTime;
    fs.writeFileSync(outputPath, JSON.stringify(report, null, 2));
    console.error(`Report with error written to: ${outputPath}`);
    process.exit(1);
  }
}

// =============================================================================
// TAG DERIVATION (copied from dry-run for consistency)
// =============================================================================

const TAG_CATEGORIES = {
  color: {
    patterns: [
      /\b(black|white|red|blue|green|yellow|orange|purple|pink|brown|grey|gray|navy|gold|silver|beige|cream|tan|maroon|burgundy|olive|teal|coral|turquoise|ivory|charcoal|khaki|mint|lavender|peach|rust|sand|slate|wine|taupe|fuchsia|magenta|aqua|cyan|indigo|lime|mauve|plum|rose|salmon|scarlet|violet)\b/i,
      /\b(multi[- ]?colou?r(?:ed)?|multicolor|tie[- ]?dye|ombre|heather(?:ed)?|mottled|camo(?:uflage)?)\b/i,
    ],
    weight: 0.95,
  },
  material: {
    patterns: [
      /\b(leather|suede|canvas|nylon|polyester|cotton|wool|silk|denim|mesh|synthetic|rubber|plastic|metal|wood|velvet|satin|lace|linen|fleece|knit|woven|patent|pu|faux|vegan|genuine|full[- ]?grain)\b/i,
    ],
    weight: 0.90,
  },
  size: {
    patterns: [
      /\b(small|medium|large|x[sl]|xxl?|xxxl?|one[- ]?size|os|petite|plus|wide|narrow|regular|slim|relaxed|oversized)\b/i,
    ],
    weight: 0.85,
  },
  style: {
    patterns: [
      /\b(casual|formal|athletic|sport(?:s|y)?|vintage|modern|classic|contemporary|minimalist|bohemian|boho|preppy|streetwear|luxury|designer|retro|trendy|elegant|chic|edgy|grunge|punk|goth|western|cowboy|urban|outdoor|hiking|running|basketball|tennis|golf|yoga|dance|ballet|skate|surf|snow)\b/i,
    ],
    weight: 0.80,
  },
  gender: {
    patterns: [
      /\b(men(?:'?s)?|women(?:'?s)?|unisex|boy(?:'?s)?|girl(?:'?s)?|kid(?:'?s)?|child(?:ren)?(?:'?s)?|infant(?:'?s)?|toddler(?:'?s)?|baby(?:'?s)?|adult(?:'?s)?|youth)\b/i,
    ],
    weight: 0.90,
  },
  feature: {
    patterns: [
      /\b(waterproof|breathable|insulated|padded|cushioned|lightweight|durable|adjustable|removable|reversible|slip[- ]?on|lace[- ]?up|zip(?:per)?|buckle|strap|velcro|elastic|stretch(?:y)?|comfort|arch[- ]?support|memory[- ]?foam|orthopedic|anti[- ]?slip|non[- ]?slip)\b/i,
    ],
    weight: 0.85,
  },
};

function deriveTagsFromText(text) {
  if (!text || typeof text !== 'string') return [];

  const parts = text.split(/[,;|]/).map(p => p.trim().toLowerCase()).filter(p => p.length > 0 && p.length < 80);
  const tagSet = new Set();

  for (const part of parts) {
    for (const [, config] of Object.entries(TAG_CATEGORIES)) {
      for (const pattern of config.patterns) {
        const match = part.match(pattern);
        if (match) {
          const tag = match[0].toLowerCase().trim();
          if (tag.length >= 2) tagSet.add(tag);
        }
      }
    }
    // Uncategorized but valid-looking
    if (part.length >= 2 && part.length <= 30 && /^[a-z][a-z0-9\s\-]+$/i.test(part)) {
      tagSet.add(part);
    }
  }

  return [...tagSet];
}

// =============================================================================
// ENTRY POINT
// =============================================================================

runApply()
  .then(() => process.exit(0))
  .catch((err) => {
    console.error('Fatal error:', err);
    process.exit(1);
  });
