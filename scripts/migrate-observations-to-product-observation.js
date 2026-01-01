#!/usr/bin/env node
/**
 * LP-observations-consolidation-1.4.0: Migrate legacy observations → product.observation
 * 
 * This script migrates observations from the legacy `observations` collection
 * to product-level `product.observation.tags` (canonical SRoT).
 * 
 * Usage:
 *   node scripts/migrate-observations-to-product-observation.js --dry-run [--out=reports/dryrun.json]
 *   node scripts/migrate-observations-to-product-observation.js --apply [--target=staging]
 *   node scripts/migrate-observations-to-product-observation.js --apply --confirm-production
 * 
 * Options:
 *   --dry-run              Run in preview mode (no writes), generate mapping report
 *   --apply                Apply migration (requires --target or --confirm-production)
 *   --target=staging       Apply to staging project
 *   --target=production    Apply to production (requires --confirm-production)
 *   --confirm-production   Required flag for production writes
 *   --out=<path>           Output file path for dry-run report (default: reports/dryrun-<ts>.json)
 *   --batch-size=<n>       Number of documents per batch (default: 500)
 *   --sample=<n>           Only process first N documents (for testing)
 *   --verbose              Show detailed logging
 * 
 * Decision: Option A - Migrate legacy observations into product.observation
 * 
 * Migration mapping:
 *   - Legacy observation.title → product.observation.tags[] (normalized)
 *   - Legacy observation.body → product.observation.tags[] (if short, else ignored)
 *   - Legacy observation.linkedField → product.observation.tags[] (attribute name)
 *   - Legacy observation.fieldLink.key → product.observation.tags[]
 *   - Legacy observation.images[] → product.observation.images[]
 *   - Legacy observation.severity → Ignored (tags-first model has no severity)
 *   - Legacy observation.status → Marked migrated, not carried over
 * 
 * Activity log:
 *   - Each product updated gets _activityLog entry with migration details
 * 
 * References:
 *   - LP-observations-consolidation-1.4.0 PRD
 *   - LP-obs-studio-cleanup-1.6.6: Product observation endpoint
 */

const admin = require('firebase-admin');
const fs = require('fs');
const path = require('path');

// ============================================
// CLI Argument Parsing
// ============================================

const args = process.argv.slice(2);
const DRY_RUN = args.includes('--dry-run');
const APPLY = args.includes('--apply');
const VERBOSE = args.includes('--verbose');
const CONFIRM_PROD = args.includes('--confirm-production');

const targetArg = args.find(a => a.startsWith('--target='));
const TARGET = targetArg ? targetArg.split('=')[1] : null;

const outArg = args.find(a => a.startsWith('--out='));
const OUTPUT_PATH = outArg 
  ? outArg.split('=')[1] 
  : `reports/dryrun-${new Date().toISOString().replace(/[:.]/g, '-')}.json`;

const batchArg = args.find(a => a.startsWith('--batch-size='));
const BATCH_SIZE = batchArg ? parseInt(batchArg.split('=')[1], 10) : 500;

const sampleArg = args.find(a => a.startsWith('--sample='));
const SAMPLE_SIZE = sampleArg ? parseInt(sampleArg.split('=')[1], 10) : null;

// ============================================
// Validation
// ============================================

if (!DRY_RUN && !APPLY) {
  console.error('❌ Error: Must specify --dry-run or --apply');
  console.log('\nUsage:');
  console.log('  node scripts/migrate-observations-to-product-observation.js --dry-run');
  console.log('  node scripts/migrate-observations-to-product-observation.js --apply --target=staging');
  process.exit(1);
}

if (APPLY && !TARGET && !CONFIRM_PROD) {
  console.error('❌ Error: --apply requires --target=staging or --confirm-production');
  process.exit(1);
}

if (APPLY && TARGET === 'production' && !CONFIRM_PROD) {
  console.error('❌ Error: Production writes require --confirm-production flag');
  process.exit(1);
}

// ============================================
// Firebase Initialization
// ============================================

if (!admin.apps.length) {
  admin.initializeApp();
}
const db = admin.firestore();

// ============================================
// Helper Functions
// ============================================

/**
 * Normalize text to a tag format
 * - Lowercase
 * - Trim whitespace
 * - Replace multiple spaces with single
 * - Max 50 chars
 */
function normalizeTag(text) {
  if (!text || typeof text !== 'string') return null;
  const normalized = text
    .toLowerCase()
    .trim()
    .replace(/\s+/g, ' ')
    .substring(0, 50);
  return normalized.length >= 2 ? normalized : null;
}

/**
 * Extract tags from a legacy observation document
 */
function extractTagsFromObservation(obs) {
  const tags = new Set();
  
  // Title → tag (if reasonable length)
  if (obs.title && obs.title.length <= 50) {
    const tag = normalizeTag(obs.title);
    if (tag) tags.add(tag);
  }
  
  // Body → tag only if very short (under 30 chars)
  if (obs.body && obs.body.length <= 30) {
    const tag = normalizeTag(obs.body);
    if (tag) tags.add(tag);
  }
  
  // LinkedField (legacy string) → tag
  if (obs.linkedField && typeof obs.linkedField === 'string') {
    const tag = normalizeTag(obs.linkedField);
    if (tag) tags.add(tag);
  }
  
  // FieldLink.key → tag
  if (obs.fieldLink && obs.fieldLink.key) {
    const key = obs.fieldLink.key.replace(/^(product\.|attributes\.)/, '');
    const tag = normalizeTag(key);
    if (tag) tags.add(tag);
  }
  
  return Array.from(tags);
}

/**
 * Extract images from a legacy observation document
 */
function extractImagesFromObservation(obs) {
  if (!obs.images || !Array.isArray(obs.images)) return [];
  return obs.images.filter(img => typeof img === 'string' && img.length > 0);
}

/**
 * Log message with optional verbose check
 */
function log(message, forceShow = false) {
  if (VERBOSE || forceShow) {
    console.log(message);
  }
}

// ============================================
// Migration Logic
// ============================================

async function runMigration() {
  const startTime = Date.now();
  console.log('━'.repeat(60));
  console.log(`🔄 LP-observations-consolidation-1.4.0 Migration`);
  console.log(`   Mode: ${DRY_RUN ? '🔍 DRY-RUN (no writes)' : '⚡ APPLY'}`);
  console.log(`   Target: ${TARGET || 'default project'}`);
  console.log(`   Batch size: ${BATCH_SIZE}`);
  if (SAMPLE_SIZE) console.log(`   Sample limit: ${SAMPLE_SIZE}`);
  console.log('━'.repeat(60));
  console.log('');

  // ----------------------------------------
  // Step 1: Fetch all legacy observations
  // ----------------------------------------
  console.log('📖 Step 1: Fetching legacy observations...');
  
  let observationsQuery = db.collection('observations').orderBy('createdAt', 'desc');
  if (SAMPLE_SIZE) {
    observationsQuery = observationsQuery.limit(SAMPLE_SIZE);
  }
  
  const observationsSnapshot = await observationsQuery.get();
  const totalObservations = observationsSnapshot.size;
  
  console.log(`   Found ${totalObservations} legacy observation(s)`);
  
  if (totalObservations === 0) {
    console.log('✅ No observations to migrate. Done.');
    return {
      status: 'success',
      totalObservations: 0,
      productsAffected: 0,
      tagsExtracted: 0,
      conflicts: [],
    };
  }

  // ----------------------------------------
  // Step 2: Group by productId and extract data
  // ----------------------------------------
  console.log('');
  console.log('📊 Step 2: Grouping observations by product...');
  
  const productMap = new Map(); // productId → { tags: Set, images: Set, observations: [] }
  const conflicts = [];
  let tagsExtracted = 0;
  let imagesExtracted = 0;
  
  observationsSnapshot.forEach(doc => {
    const obs = { id: doc.id, ...doc.data() };
    const productId = obs.productId;
    
    if (!productId) {
      conflicts.push({
        type: 'missing_product_id',
        observationId: obs.id,
        message: 'Observation has no productId - cannot migrate',
      });
      return;
    }
    
    // Initialize product entry
    if (!productMap.has(productId)) {
      productMap.set(productId, {
        tags: new Set(),
        images: new Set(),
        observations: [],
        existingTags: [],
        existingImages: [],
      });
    }
    
    const entry = productMap.get(productId);
    
    // Extract tags and images
    const extractedTags = extractTagsFromObservation(obs);
    const extractedImages = extractImagesFromObservation(obs);
    
    extractedTags.forEach(tag => entry.tags.add(tag));
    extractedImages.forEach(img => entry.images.add(img));
    
    tagsExtracted += extractedTags.length;
    imagesExtracted += extractedImages.length;
    
    entry.observations.push({
      id: obs.id,
      title: obs.title,
      status: obs.status,
      tagsExtracted: extractedTags,
      imagesExtracted: extractedImages,
    });
    
    log(`   [${productId}] Observation ${obs.id}: extracted ${extractedTags.length} tags`);
  });
  
  console.log(`   Products affected: ${productMap.size}`);
  console.log(`   Tags extracted: ${tagsExtracted}`);
  console.log(`   Images extracted: ${imagesExtracted}`);
  console.log(`   Conflicts found: ${conflicts.length}`);

  // ----------------------------------------
  // Step 3: Check existing product.observation data
  // ----------------------------------------
  console.log('');
  console.log('🔍 Step 3: Checking existing product observations...');
  
  const productIds = Array.from(productMap.keys());
  let existingDataCount = 0;
  
  // Batch fetch products
  for (let i = 0; i < productIds.length; i += BATCH_SIZE) {
    const batch = productIds.slice(i, i + BATCH_SIZE);
    
    for (const productId of batch) {
      try {
        const productDoc = await db.collection('products').doc(productId).get();
        const entry = productMap.get(productId);
        
        if (!productDoc.exists) {
          conflicts.push({
            type: 'product_not_found',
            productId,
            observationCount: entry.observations.length,
            message: 'Product document does not exist - observations orphaned',
          });
          continue;
        }
        
        const productData = productDoc.data();
        const existingObs = productData?.observation;
        
        if (existingObs && existingObs.tags && existingObs.tags.length > 0) {
          entry.existingTags = existingObs.tags || [];
          entry.existingImages = existingObs.images || [];
          existingDataCount++;
          
          // Check for potential duplicates
          const newTags = Array.from(entry.tags);
          const duplicates = newTags.filter(t => 
            entry.existingTags.map(e => e.toLowerCase()).includes(t.toLowerCase())
          );
          
          if (duplicates.length > 0) {
            conflicts.push({
              type: 'duplicate_tags',
              productId,
              duplicates,
              message: `${duplicates.length} tag(s) already exist on product`,
            });
          }
        }
      } catch (err) {
        conflicts.push({
          type: 'product_fetch_error',
          productId,
          message: err.message,
        });
      }
    }
    
    if (i + BATCH_SIZE < productIds.length) {
      log(`   Processed ${Math.min(i + BATCH_SIZE, productIds.length)}/${productIds.length} products...`);
    }
  }
  
  console.log(`   Products with existing observation data: ${existingDataCount}`);
  console.log(`   Total conflicts after check: ${conflicts.length}`);

  // ----------------------------------------
  // Step 4: Build migration plan
  // ----------------------------------------
  console.log('');
  console.log('📋 Step 4: Building migration plan...');
  
  const migrationPlan = [];
  
  for (const [productId, entry] of productMap) {
    // Skip if product doesn't exist
    const hasProductError = conflicts.find(c => 
      c.productId === productId && (c.type === 'product_not_found' || c.type === 'product_fetch_error')
    );
    if (hasProductError) continue;
    
    // Merge existing and new tags (no duplicates)
    const existingLower = entry.existingTags.map(t => t.toLowerCase());
    const newTags = Array.from(entry.tags).filter(t => !existingLower.includes(t.toLowerCase()));
    const mergedTags = [...entry.existingTags, ...newTags];
    
    // Merge images
    const mergedImages = [...new Set([...entry.existingImages, ...Array.from(entry.images)])];
    
    migrationPlan.push({
      productId,
      observationCount: entry.observations.length,
      observationIds: entry.observations.map(o => o.id),
      existingTags: entry.existingTags,
      newTags,
      mergedTags,
      existingImages: entry.existingImages,
      newImages: Array.from(entry.images).filter(i => !entry.existingImages.includes(i)),
      mergedImages,
    });
  }
  
  console.log(`   Migration plan entries: ${migrationPlan.length}`);
  console.log(`   Total new tags to add: ${migrationPlan.reduce((sum, p) => sum + p.newTags.length, 0)}`);

  // ----------------------------------------
  // Step 5: Execute or report
  // ----------------------------------------
  if (DRY_RUN) {
    console.log('');
    console.log('📄 Step 5: Generating dry-run report...');
    
    const report = {
      meta: {
        lp: 'LP-observations-consolidation-1.4.0',
        mode: 'dry-run',
        timestamp: new Date().toISOString(),
        target: TARGET || 'default',
        sampleSize: SAMPLE_SIZE,
      },
      summary: {
        totalObservations,
        productsAffected: productMap.size,
        tagsExtracted,
        imagesExtracted,
        conflictCount: conflicts.length,
        planEntries: migrationPlan.length,
      },
      conflicts,
      migrationPlan,
      observations: observationsSnapshot.docs.map(doc => ({
        id: doc.id,
        productId: doc.data().productId,
        title: doc.data().title,
        status: doc.data().status,
      })),
    };
    
    // Write report
    const outputDir = path.dirname(OUTPUT_PATH);
    if (!fs.existsSync(outputDir)) {
      fs.mkdirSync(outputDir, { recursive: true });
    }
    fs.writeFileSync(OUTPUT_PATH, JSON.stringify(report, null, 2));
    
    console.log(`   Report written to: ${OUTPUT_PATH}`);
    console.log('');
    console.log('━'.repeat(60));
    console.log('✅ DRY-RUN COMPLETE');
    console.log(`   Duration: ${((Date.now() - startTime) / 1000).toFixed(2)}s`);
    console.log(`   Review ${OUTPUT_PATH} before running --apply`);
    console.log('━'.repeat(60));
    
    return report;
  }
  
  // APPLY MODE
  console.log('');
  console.log('⚡ Step 5: Applying migration...');
  
  const results = {
    success: 0,
    failed: 0,
    skipped: 0,
    errors: [],
  };
  
  // Process in batches
  for (let i = 0; i < migrationPlan.length; i += BATCH_SIZE) {
    const batch = db.batch();
    const batchItems = migrationPlan.slice(i, i + BATCH_SIZE);
    
    for (const plan of batchItems) {
      try {
        const productRef = db.collection('products').doc(plan.productId);
        const now = new Date().toISOString();
        
        batch.update(productRef, {
          observation: {
            tags: plan.mergedTags,
            images: plan.mergedImages,
            updatedAt: now,
            updatedBy: 'migration-script',
            source: 'migration-1.4.0',
          },
          _activityLog: admin.firestore.FieldValue.arrayUnion({
            type: 'observation.migration',
            action: 'migrate-legacy',
            appliedBy: 'migration-script',
            lp: 'LP-observations-consolidation-1.4.0',
            payload: {
              observationIds: plan.observationIds,
              newTags: plan.newTags,
              existingTags: plan.existingTags,
            },
            timestamp: now,
          }),
          updatedAt: now,
          updatedBy: 'migration-script',
        });
        
        results.success++;
      } catch (err) {
        results.failed++;
        results.errors.push({
          productId: plan.productId,
          error: err.message,
        });
      }
    }
    
    // Commit batch
    try {
      await batch.commit();
      log(`   Committed batch ${i / BATCH_SIZE + 1}/${Math.ceil(migrationPlan.length / BATCH_SIZE)}`, true);
    } catch (err) {
      console.error(`   ❌ Batch commit failed:`, err.message);
      results.failed += batchItems.length;
      results.success -= batchItems.length;
    }
  }
  
  // Generate apply report
  const applyReport = {
    meta: {
      lp: 'LP-observations-consolidation-1.4.0',
      mode: 'apply',
      timestamp: new Date().toISOString(),
      target: TARGET || 'default',
      duration: `${((Date.now() - startTime) / 1000).toFixed(2)}s`,
    },
    summary: {
      totalObservations,
      productsAffected: productMap.size,
      tagsExtracted,
      success: results.success,
      failed: results.failed,
      skipped: results.skipped,
    },
    conflicts,
    errors: results.errors,
    migrationPlan,
  };
  
  // Write apply report
  const applyOutputPath = OUTPUT_PATH.replace('dryrun', 'apply');
  const outputDir = path.dirname(applyOutputPath);
  if (!fs.existsSync(outputDir)) {
    fs.mkdirSync(outputDir, { recursive: true });
  }
  fs.writeFileSync(applyOutputPath, JSON.stringify(applyReport, null, 2));
  
  console.log('');
  console.log('━'.repeat(60));
  if (results.failed === 0) {
    console.log('✅ MIGRATION COMPLETE');
  } else {
    console.log('⚠️ MIGRATION COMPLETE WITH ERRORS');
  }
  console.log(`   Duration: ${((Date.now() - startTime) / 1000).toFixed(2)}s`);
  console.log(`   Success: ${results.success}`);
  console.log(`   Failed: ${results.failed}`);
  console.log(`   Report: ${applyOutputPath}`);
  console.log('━'.repeat(60));
  
  return applyReport;
}

// ============================================
// Main
// ============================================

runMigration()
  .then(result => {
    if (result.conflicts && result.conflicts.length > 0 && !DRY_RUN) {
      console.log('\n⚠️ Warning: Migration completed with conflicts. Review report.');
      process.exit(1);
    }
    process.exit(0);
  })
  .catch(err => {
    console.error('\n❌ Migration failed:', err);
    process.exit(1);
  });
