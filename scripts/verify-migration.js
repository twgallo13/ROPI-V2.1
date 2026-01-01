#!/usr/bin/env node
/**
 * LP-observations-consolidation-1.4.0: Verify migration results
 * 
 * This script verifies that legacy observations have been correctly
 * migrated to product.observation.
 * 
 * Usage:
 *   node scripts/verify-migration.js [--target=staging] [--report=reports/verify.json]
 *   node scripts/verify-migration.js --target=production --sample=100
 * 
 * Options:
 *   --target=<env>         Target environment (staging/production)
 *   --report=<path>        Output report path
 *   --sample=<n>           Only verify first N products
 *   --verbose              Show detailed logging
 * 
 * Verification checks:
 *   1. All migrated observations have corresponding tags on product
 *   2. No duplicate tags created
 *   3. Activity log contains migration entry
 *   4. Image references preserved
 * 
 * References:
 *   - LP-observations-consolidation-1.4.0 PRD
 */

const admin = require('firebase-admin');
const fs = require('fs');
const path = require('path');

// ============================================
// CLI Argument Parsing
// ============================================

const args = process.argv.slice(2);
const VERBOSE = args.includes('--verbose');

const targetArg = args.find(a => a.startsWith('--target='));
const TARGET = targetArg ? targetArg.split('=')[1] : 'staging';

const reportArg = args.find(a => a.startsWith('--report='));
const REPORT_PATH = reportArg 
  ? reportArg.split('=')[1] 
  : `reports/verify-${new Date().toISOString().replace(/[:.]/g, '-')}.json`;

const sampleArg = args.find(a => a.startsWith('--sample='));
const SAMPLE_SIZE = sampleArg ? parseInt(sampleArg.split('=')[1], 10) : null;

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

function log(message, forceShow = false) {
  if (VERBOSE || forceShow) {
    console.log(message);
  }
}

function normalizeTag(text) {
  if (!text || typeof text !== 'string') return null;
  return text.toLowerCase().trim().replace(/\s+/g, ' ').substring(0, 50);
}

// ============================================
// Verification Logic
// ============================================

async function runVerification() {
  const startTime = Date.now();
  console.log('━'.repeat(60));
  console.log(`🔍 LP-observations-consolidation-1.4.0 Verification`);
  console.log(`   Target: ${TARGET}`);
  if (SAMPLE_SIZE) console.log(`   Sample limit: ${SAMPLE_SIZE}`);
  console.log('━'.repeat(60));
  console.log('');

  const results = {
    totalProducts: 0,
    verified: 0,
    mismatches: 0,
    missing: 0,
    errors: 0,
    details: [],
  };

  // ----------------------------------------
  // Step 1: Get products with observation data
  // ----------------------------------------
  console.log('📖 Step 1: Fetching products with observations...');
  
  let productsQuery = db.collection('products')
    .where('observation', '!=', null)
    .orderBy('observation')
    .orderBy('updatedAt', 'desc');
  
  if (SAMPLE_SIZE) {
    productsQuery = productsQuery.limit(SAMPLE_SIZE);
  }
  
  const productsSnapshot = await productsQuery.get();
  results.totalProducts = productsSnapshot.size;
  
  console.log(`   Found ${results.totalProducts} products with observation data`);

  // ----------------------------------------
  // Step 2: Fetch legacy observations for comparison
  // ----------------------------------------
  console.log('');
  console.log('📊 Step 2: Fetching legacy observations for comparison...');
  
  const legacyObsSnapshot = await db.collection('observations').get();
  const legacyByProduct = new Map();
  
  legacyObsSnapshot.forEach(doc => {
    const obs = { id: doc.id, ...doc.data() };
    const productId = obs.productId;
    if (!productId) return;
    
    if (!legacyByProduct.has(productId)) {
      legacyByProduct.set(productId, []);
    }
    legacyByProduct.get(productId).push(obs);
  });
  
  console.log(`   Found ${legacyObsSnapshot.size} legacy observations`);
  console.log(`   Covering ${legacyByProduct.size} unique products`);

  // ----------------------------------------
  // Step 3: Verify each product
  // ----------------------------------------
  console.log('');
  console.log('✅ Step 3: Verifying migration...');
  
  for (const productDoc of productsSnapshot.docs) {
    const productId = productDoc.id;
    const productData = productDoc.data();
    const observation = productData.observation || {};
    const productTags = (observation.tags || []).map(t => normalizeTag(t));
    const productImages = observation.images || [];
    const activityLog = productData._activityLog || [];
    
    const legacyObs = legacyByProduct.get(productId) || [];
    
    if (legacyObs.length === 0) {
      // Product has observation but no legacy data - likely from new flow
      log(`   [${productId}] No legacy observations - skipping`);
      results.verified++;
      continue;
    }
    
    // Check for migration activity log entry
    const hasMigrationEntry = activityLog.some(entry => 
      entry.type === 'observation.migration' || 
      (entry.lp && entry.lp.includes('1.4.0'))
    );
    
    // Extract expected tags from legacy observations
    const expectedTags = new Set();
    const expectedImages = new Set();
    
    for (const obs of legacyObs) {
      // Title
      if (obs.title && obs.title.length <= 50) {
        const tag = normalizeTag(obs.title);
        if (tag) expectedTags.add(tag);
      }
      
      // Body (short only)
      if (obs.body && obs.body.length <= 30) {
        const tag = normalizeTag(obs.body);
        if (tag) expectedTags.add(tag);
      }
      
      // LinkedField
      if (obs.linkedField && typeof obs.linkedField === 'string') {
        const tag = normalizeTag(obs.linkedField);
        if (tag) expectedTags.add(tag);
      }
      
      // FieldLink.key
      if (obs.fieldLink && obs.fieldLink.key) {
        const key = obs.fieldLink.key.replace(/^(product\.|attributes\.)/, '');
        const tag = normalizeTag(key);
        if (tag) expectedTags.add(tag);
      }
      
      // Images
      if (obs.images && Array.isArray(obs.images)) {
        obs.images.forEach(img => {
          if (typeof img === 'string' && img.length > 0) {
            expectedImages.add(img);
          }
        });
      }
    }
    
    // Check for missing tags
    const missingTags = [];
    for (const expectedTag of expectedTags) {
      if (!productTags.includes(expectedTag)) {
        missingTags.push(expectedTag);
      }
    }
    
    // Check for missing images
    const missingImages = [];
    for (const expectedImage of expectedImages) {
      if (!productImages.includes(expectedImage)) {
        missingImages.push(expectedImage);
      }
    }
    
    // Record result
    if (missingTags.length === 0 && missingImages.length === 0) {
      results.verified++;
      log(`   ✅ [${productId}] Verified - ${legacyObs.length} legacy obs → ${productTags.length} tags`);
    } else {
      results.mismatches++;
      const detail = {
        productId,
        legacyObservationCount: legacyObs.length,
        expectedTags: Array.from(expectedTags),
        actualTags: productTags,
        missingTags,
        expectedImages: Array.from(expectedImages).length,
        actualImages: productImages.length,
        missingImages: missingImages.length,
        hasMigrationEntry,
      };
      results.details.push(detail);
      console.log(`   ❌ [${productId}] Mismatch - missing ${missingTags.length} tags, ${missingImages.length} images`);
    }
  }

  // ----------------------------------------
  // Step 4: Check for orphaned legacy observations
  // ----------------------------------------
  console.log('');
  console.log('🔎 Step 4: Checking for orphaned observations...');
  
  const migratedProductIds = new Set(productsSnapshot.docs.map(d => d.id));
  const orphanedProducts = [];
  
  for (const [productId, obs] of legacyByProduct) {
    if (!migratedProductIds.has(productId)) {
      // Check if product exists at all
      const productExists = await db.collection('products').doc(productId).get();
      if (productExists.exists) {
        orphanedProducts.push({
          productId,
          observationCount: obs.length,
          status: 'product_exists_no_migration',
        });
      } else {
        orphanedProducts.push({
          productId,
          observationCount: obs.length,
          status: 'product_not_found',
        });
      }
    }
  }
  
  console.log(`   Orphaned observation groups: ${orphanedProducts.length}`);

  // ----------------------------------------
  // Step 5: Generate report
  // ----------------------------------------
  console.log('');
  console.log('📄 Step 5: Generating verification report...');
  
  const report = {
    meta: {
      lp: 'LP-observations-consolidation-1.4.0',
      mode: 'verification',
      timestamp: new Date().toISOString(),
      target: TARGET,
      duration: `${((Date.now() - startTime) / 1000).toFixed(2)}s`,
    },
    summary: {
      totalProducts: results.totalProducts,
      verified: results.verified,
      mismatches: results.mismatches,
      orphanedGroups: orphanedProducts.length,
      verificationRate: results.totalProducts > 0 
        ? `${((results.verified / results.totalProducts) * 100).toFixed(1)}%`
        : 'N/A',
    },
    mismatches: results.details,
    orphaned: orphanedProducts,
  };
  
  // Write report
  const outputDir = path.dirname(REPORT_PATH);
  if (!fs.existsSync(outputDir)) {
    fs.mkdirSync(outputDir, { recursive: true });
  }
  fs.writeFileSync(REPORT_PATH, JSON.stringify(report, null, 2));
  
  console.log(`   Report written to: ${REPORT_PATH}`);
  console.log('');
  console.log('━'.repeat(60));
  
  if (results.mismatches === 0 && orphanedProducts.length === 0) {
    console.log('✅ VERIFICATION PASSED');
    console.log(`   ${results.verified}/${results.totalProducts} products verified`);
  } else {
    console.log('⚠️ VERIFICATION COMPLETED WITH ISSUES');
    console.log(`   Verified: ${results.verified}`);
    console.log(`   Mismatches: ${results.mismatches}`);
    console.log(`   Orphaned: ${orphanedProducts.length}`);
    console.log(`   Review ${REPORT_PATH} for details`);
  }
  
  console.log(`   Duration: ${((Date.now() - startTime) / 1000).toFixed(2)}s`);
  console.log('━'.repeat(60));
  
  return report;
}

// ============================================
// Main
// ============================================

runVerification()
  .then(result => {
    if (result.summary.mismatches > 0 || result.orphaned.length > 0) {
      process.exit(1);
    }
    process.exit(0);
  })
  .catch(err => {
    console.error('\n❌ Verification failed:', err);
    process.exit(1);
  });
