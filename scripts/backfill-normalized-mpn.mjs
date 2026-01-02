#!/usr/bin/env node
/**
 * Backfill normalized_mpn for existing products
 * 
 * LP-smart-rules-mpn-1.0.0: Backfill script for reliable MPN lookups
 * 
 * Usage:
 *   node scripts/backfill-normalized-mpn.js --dry-run       # Preview changes
 *   node scripts/backfill-normalized-mpn.js --env staging   # Run on staging
 *   node scripts/backfill-normalized-mpn.js --env prod      # Run on production
 * 
 * Algorithm:
 * - For each product with an MPN field
 * - Compute normalized_mpn using canonical normalizer
 * - Write normalized_mpn if missing or different
 */

import { initializeApp, cert, getApps, getApp } from 'firebase-admin/app';
import { getFirestore } from 'firebase-admin/firestore';

// Parse CLI args
const args = process.argv.slice(2);
const dryRun = args.includes('--dry-run');
const envIndex = args.indexOf('--env');
const env = envIndex !== -1 ? args[envIndex + 1] : 'staging';
const limitIndex = args.indexOf('--limit');
const limit = limitIndex !== -1 ? parseInt(args[limitIndex + 1], 10) : 0;

console.log(`\n🔧 Backfill normalized_mpn`);
console.log(`   Environment: ${env}`);
console.log(`   Dry run: ${dryRun}`);
console.log(`   Limit: ${limit || 'none'}\n`);

// Firebase project mapping
const projectMap = {
  staging: 'ropi-bccee',
  prod: 'ropi-prod',
};

const projectId = projectMap[env];
if (!projectId) {
  console.error(`❌ Unknown environment: ${env}`);
  process.exit(1);
}

// Initialize Firebase Admin
if (!getApps().length) {
  initializeApp({
    projectId,
  });
}

const db = getFirestore();

/**
 * Canonical MPN normalizer (must match SDK normalizeMpn)
 */
function normalizeMpn(mpn) {
  if (!mpn) return '';
  
  return mpn
    .trim()
    .toUpperCase()
    .replace(/[^A-Z0-9-]/g, '')
    .replace(/-+/g, '-')
    .replace(/^-+|-+$/g, '');
}

async function backfillNormalizedMpn() {
  const stats = {
    scanned: 0,
    withMpn: 0,
    needsUpdate: 0,
    updated: 0,
    skipped: 0,
    errors: 0,
  };
  
  const productsRef = db.collection('products');
  let query = productsRef.orderBy('__name__');
  
  if (limit > 0) {
    query = query.limit(limit);
  }
  
  const snapshot = await query.get();
  const total = snapshot.size;
  
  console.log(`📦 Found ${total} products to scan`);
  
  const batches = [];
  let currentBatch = db.batch();
  let batchCount = 0;
  
  for (const doc of snapshot.docs) {
    stats.scanned++;
    
    const data = doc.data();
    const mpn = data.core?.mpn || data.mpn;
    
    if (!mpn) {
      stats.skipped++;
      continue;
    }
    
    stats.withMpn++;
    
    const normalizedMpn = normalizeMpn(mpn);
    const existingNormalized = data.core?.normalized_mpn || data.normalized_mpn;
    
    if (existingNormalized === normalizedMpn) {
      // Already correct
      continue;
    }
    
    stats.needsUpdate++;
    
    if (dryRun) {
      console.log(`  [DRY] ${doc.id}: "${mpn}" → "${normalizedMpn}"`);
      continue;
    }
    
    // Determine where to write: core.normalized_mpn or top-level
    const updateData = data.core 
      ? { 'core.normalized_mpn': normalizedMpn }
      : { normalized_mpn: normalizedMpn };
    
    currentBatch.update(doc.ref, updateData);
    batchCount++;
    
    if (batchCount >= 500) {
      batches.push(currentBatch);
      currentBatch = db.batch();
      batchCount = 0;
    }
  }
  
  // Add remaining batch
  if (batchCount > 0) {
    batches.push(currentBatch);
  }
  
  // Commit batches
  if (!dryRun && batches.length > 0) {
    console.log(`\n📝 Committing ${batches.length} batch(es)...`);
    
    for (let i = 0; i < batches.length; i++) {
      try {
        await batches[i].commit();
        stats.updated += Math.min(500, stats.needsUpdate - (i * 500));
        console.log(`   Batch ${i + 1}/${batches.length} committed`);
      } catch (err) {
        console.error(`   ❌ Batch ${i + 1} failed:`, err.message);
        stats.errors++;
      }
    }
  }
  
  // Summary
  console.log('\n📊 Summary:');
  console.log(`   Scanned:      ${stats.scanned}`);
  console.log(`   With MPN:     ${stats.withMpn}`);
  console.log(`   Needs update: ${stats.needsUpdate}`);
  if (!dryRun) {
    console.log(`   Updated:      ${stats.updated}`);
    console.log(`   Errors:       ${stats.errors}`);
  }
  console.log(`   Skipped (no MPN): ${stats.skipped}`);
  
  return stats;
}

// Run
backfillNormalizedMpn()
  .then((stats) => {
    if (dryRun) {
      console.log('\n✅ Dry run complete. Use --env staging to apply changes.');
    } else {
      console.log('\n✅ Backfill complete.');
    }
    process.exit(0);
  })
  .catch((err) => {
    console.error('\n❌ Backfill failed:', err);
    process.exit(1);
  });
