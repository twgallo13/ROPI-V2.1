#!/usr/bin/env node
/**
 * LP-1.4.5: Migrate shipping override fields from top-level to pricing.shipping.*
 * 
 * This script migrates existing products that have top-level shipping override fields
 * (standard_shipping_override, expedited_override_shipping) into the canonical
 * pricing.shipping.* structure.
 * 
 * Behavior (idempotent):
 * - For each product in Firestore, if pricing.shipping.* is missing and 
 *   top-level shipping overrides exist, copy values to pricing.shipping.*
 * - Does NOT delete top-level keys (use --delete-top-level for cleanup after verification)
 * - Logs each updated doc to evidence/migration/migrate-shipping-<timestamp>.log
 * 
 * Usage:
 *   node scripts/migrate/migrate-shipping-top-level-to-pricing.js [options]
 * 
 * Options:
 *   --dry-run              Show what would be migrated without making changes
 *   --delete-top-level     Also delete top-level shipping fields after migration
 *   --product-ids <ids>    Comma-separated list of product IDs to migrate (optional)
 *   --limit <n>            Limit number of products to process
 * 
 * Environment:
 *   GOOGLE_APPLICATION_CREDENTIALS - Path to Firebase service account JSON
 */

const admin = require('firebase-admin');
const fs = require('fs');
const path = require('path');

// Parse command line arguments
const args = process.argv.slice(2);
const isDryRun = args.includes('--dry-run');
const deleteTopLevel = args.includes('--delete-top-level');
const limitIdx = args.indexOf('--limit');
const limit = limitIdx !== -1 ? parseInt(args[limitIdx + 1], 10) : undefined;
const productIdsIdx = args.indexOf('--product-ids');
const productIds = productIdsIdx !== -1 ? args[productIdsIdx + 1].split(',').map(s => s.trim()) : undefined;

// Initialize Firebase Admin
if (!admin.apps.length) {
  admin.initializeApp({
    credential: admin.credential.applicationDefault(),
  });
}

const db = admin.firestore();

// Ensure evidence directory exists
const evidenceDir = path.join(__dirname, '../../evidence/migration');
if (!fs.existsSync(evidenceDir)) {
  fs.mkdirSync(evidenceDir, { recursive: true });
}

const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
const logFile = path.join(evidenceDir, `migrate-shipping-${timestamp}.log`);

function log(message) {
  const line = `[${new Date().toISOString()}] ${message}`;
  console.log(line);
  fs.appendFileSync(logFile, line + '\n');
}

async function migrateProduct(productRef, product, productId) {
  const updates = {};
  let needsUpdate = false;
  
  // Check if pricing object exists
  const pricing = product.pricing || {};
  const shipping = pricing.shipping || {};
  
  // Check standard_shipping_override
  if (product.standard_shipping_override !== undefined && 
      product.standard_shipping_override !== null &&
      shipping.standard_override === undefined) {
    updates['pricing.shipping.standard_override'] = Number(product.standard_shipping_override);
    needsUpdate = true;
    log(`  - standard_shipping_override: ${product.standard_shipping_override} → pricing.shipping.standard_override`);
  }
  
  // Check expedited_override_shipping
  if (product.expedited_override_shipping !== undefined && 
      product.expedited_override_shipping !== null &&
      shipping.expedited_override === undefined) {
    updates['pricing.shipping.expedited_override'] = Number(product.expedited_override_shipping);
    needsUpdate = true;
    log(`  - expedited_override_shipping: ${product.expedited_override_shipping} → pricing.shipping.expedited_override`);
  }
  
  // Optionally delete top-level fields
  if (deleteTopLevel && needsUpdate) {
    if (product.standard_shipping_override !== undefined) {
      updates['standard_shipping_override'] = admin.firestore.FieldValue.delete();
      log(`  - Deleting top-level standard_shipping_override`);
    }
    if (product.expedited_override_shipping !== undefined) {
      updates['expedited_override_shipping'] = admin.firestore.FieldValue.delete();
      log(`  - Deleting top-level expedited_override_shipping`);
    }
  }
  
  if (!needsUpdate) {
    log(`  - No migration needed (pricing.shipping.* already populated or no top-level values)`);
    return false;
  }
  
  if (isDryRun) {
    log(`  - DRY RUN: Would update with: ${JSON.stringify(updates)}`);
    return true;
  }
  
  // Apply the update
  await productRef.update(updates);
  log(`  - Updated successfully`);
  return true;
}

async function main() {
  log('='.repeat(80));
  log(`LP-1.4.5 Migration: Shipping overrides to pricing.shipping.*`);
  log(`Mode: ${isDryRun ? 'DRY RUN' : 'LIVE'}`);
  log(`Delete top-level: ${deleteTopLevel}`);
  if (limit) log(`Limit: ${limit}`);
  if (productIds) log(`Product IDs: ${productIds.join(', ')}`);
  log('='.repeat(80));
  
  let query = db.collection('products');
  
  // If specific product IDs provided, query only those
  let productsToProcess = [];
  
  if (productIds && productIds.length > 0) {
    for (const id of productIds) {
      const doc = await db.collection('products').doc(id).get();
      if (doc.exists) {
        productsToProcess.push({ ref: doc.ref, data: doc.data(), id: doc.id });
      } else {
        log(`WARNING: Product ${id} not found`);
      }
    }
  } else {
    // Query all products (with optional limit)
    let q = query;
    if (limit) {
      q = q.limit(limit);
    }
    const snapshot = await q.get();
    productsToProcess = snapshot.docs.map(doc => ({ 
      ref: doc.ref, 
      data: doc.data(), 
      id: doc.id 
    }));
  }
  
  log(`Processing ${productsToProcess.length} products...`);
  log('');
  
  let migratedCount = 0;
  let skippedCount = 0;
  let errorCount = 0;
  
  for (const { ref, data, id } of productsToProcess) {
    log(`Processing product: ${id}`);
    try {
      const wasMigrated = await migrateProduct(ref, data, id);
      if (wasMigrated) {
        migratedCount++;
      } else {
        skippedCount++;
      }
    } catch (error) {
      log(`  - ERROR: ${error.message}`);
      errorCount++;
    }
    log('');
  }
  
  log('='.repeat(80));
  log('Migration Summary');
  log('='.repeat(80));
  log(`Total processed: ${productsToProcess.length}`);
  log(`Migrated: ${migratedCount}`);
  log(`Skipped (no changes needed): ${skippedCount}`);
  log(`Errors: ${errorCount}`);
  log(`Log file: ${logFile}`);
  log('='.repeat(80));
  
  if (isDryRun) {
    log('This was a DRY RUN. No changes were made.');
  }
  
  process.exit(errorCount > 0 ? 1 : 0);
}

main().catch(error => {
  console.error('Migration failed:', error);
  process.exit(1);
});
