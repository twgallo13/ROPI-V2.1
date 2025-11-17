/**
 * Migration Script: Populate Canonical Fields from Legacy Data
 * 
 * Reads existing Firestore products and populates canonical schema fields
 * using legacyToNew mapping, then writes back with merge: true.
 * 
 * Usage:
 *   node scripts/migrateLegacyToCanonical.js [--dry-run] [--product-ids=MPN1,MPN2,...]
 * 
 * Options:
 *   --dry-run         Show what would be updated without writing
 *   --product-ids     Comma-separated MPNs to migrate (default: all)
 * 
 * Example:
 *   node scripts/migrateLegacyToCanonical.js --dry-run --product-ids="FD ZAHARA-S-WHT"
 */

const admin = require('firebase-admin');
const path = require('path');

// Initialize Firebase Admin
const serviceAccountPath = process.env.GOOGLE_APPLICATION_CREDENTIALS || 
  path.join(__dirname, '../serviceAccountKey.json');

if (!admin.apps.length) {
  try {
    const serviceAccount = require(serviceAccountPath);
    admin.initializeApp({
      credential: admin.credential.cert(serviceAccount),
    });
    console.log('✓ Firebase Admin initialized');
  } catch (error) {
    console.error('✗ Failed to initialize Firebase Admin:', error.message);
    console.error('  Set GOOGLE_APPLICATION_CREDENTIALS or place serviceAccountKey.json in project root');
    process.exit(1);
  }
}

const db = admin.firestore();

/**
 * Normalize color string: trim, lowercase, dedupe spaces
 */
function normalizeColor(color) {
  if (!color) return undefined;
  return color.trim().replace(/\s+/g, ' ').toLowerCase();
}

/**
 * Normalize materials array: dedupe, filter empty, sort
 */
function normalizeMaterials(...sources) {
  const materials = new Set();
  for (const source of sources) {
    if (!source) continue;
    if (Array.isArray(source)) {
      source.forEach(m => m && materials.add(m.trim()));
    } else if (typeof source === 'string') {
      source.split(/[,;]/).forEach(m => m.trim() && materials.add(m.trim()));
    }
  }
  return Array.from(materials).sort();
}

/**
 * Normalize date to ISO string
 */
function normalizeDate(date) {
  if (!date) return undefined;
  if (typeof date === 'string') return date;
  if (date.toDate) return date.toDate().toISOString(); // Firestore Timestamp
  if (date.toISOString) return date.toISOString();
  return undefined;
}

/**
 * Extract canonical fields from legacy product document
 * Returns only the fields that should be updated (not full newToLegacy conversion)
 */
function extractCanonicalUpdates(legacy) {
  const updates = {};

  // Map RICS short description to name if present
  if (legacy.ricsShortDesc && !legacy.name) {
    updates.name = legacy.ricsShortDesc;
  }

  // Map RICS color to primaryColor if present
  if (legacy.ricsColor) {
    const normalized = normalizeColor(legacy.ricsColor);
    if (normalized && normalized !== normalizeColor(legacy.primaryColor)) {
      updates.primaryColor = normalized;
    }
  }

  // Normalize materials
  if (legacy.materials || legacy.materialFabric || legacy.material) {
    const normalized = normalizeMaterials(
      legacy.materials,
      legacy.materialFabric,
      legacy.material
    );
    if (normalized.length > 0) {
      updates.materials = normalized;
    }
  }

  // Populate inventory fields if missing but available in legacy
  if (legacy.lastReceived !== undefined) updates.lastReceived = normalizeDate(legacy.lastReceived);
  if (legacy.firstReceived !== undefined) updates.firstReceived = normalizeDate(legacy.firstReceived);
  if (legacy.storeInv !== undefined) updates.storeInv = legacy.storeInv;
  if (legacy.store1 !== undefined) updates.store1 = legacy.store1;
  if (legacy.store4 !== undefined) updates.store4 = legacy.store4;
  if (legacy.warehouseInv !== undefined) updates.warehouseInv = legacy.warehouseInv;
  if (legacy.whsInv !== undefined) updates.whsInv = legacy.whsInv;
  if (legacy.totalInv !== undefined) updates.totalInv = legacy.totalInv;
  if (legacy.variantCount !== undefined) updates.variantCount = legacy.variantCount;
  if (legacy.custom2 !== undefined) updates.custom2 = legacy.custom2;
  if (legacy.custom3 !== undefined) updates.custom3 = legacy.custom3;

  // Ensure collection field is set
  if (legacy.collection && !legacy.launch?.newCollection) {
    if (!updates.launch) updates.launch = { ...legacy.launch };
    updates.launch.newCollection = legacy.collection;
  }

  return updates;
}

/**
 * Migrate a single product document
 */
async function migrateProduct(mpn, dryRun = true) {
  const productRef = db.collection('products').doc(mpn);
  const doc = await productRef.get();

  if (!doc.exists) {
    console.log(`✗ Product ${mpn} not found`);
    return { success: false, reason: 'not_found' };
  }

  const legacy = doc.data();
  const updates = extractCanonicalUpdates(legacy);

  if (Object.keys(updates).length === 0) {
    console.log(`  ${mpn}: No canonical updates needed`);
    return { success: true, reason: 'no_updates' };
  }

  console.log(`  ${mpn}: Found ${Object.keys(updates).length} canonical field updates`);
  console.log(`    Updates:`, JSON.stringify(updates, null, 2));

  if (!dryRun) {
    try {
      await productRef.set(updates, { merge: true });
      console.log(`  ✓ ${mpn}: Updated successfully`);
      return { success: true, reason: 'updated', updates };
    } catch (error) {
      console.error(`  ✗ ${mpn}: Update failed:`, error.message);
      return { success: false, reason: 'write_error', error: error.message };
    }
  } else {
    console.log(`  [DRY RUN] Would update ${mpn}`);
    return { success: true, reason: 'dry_run', updates };
  }
}

/**
 * Migrate multiple products
 */
async function migrateProducts(productIds, dryRun = true) {
  console.log(`\n${'='.repeat(60)}`);
  console.log(`Migration: ${dryRun ? 'DRY RUN' : 'LIVE'}`);
  console.log(`Products: ${productIds.length === 0 ? 'ALL' : productIds.join(', ')}`);
  console.log(`${'='.repeat(60)}\n`);

  let targetProducts = productIds;

  // If no specific products specified, fetch all
  if (productIds.length === 0) {
    console.log('Fetching all products...');
    const snapshot = await db.collection('products').get();
    targetProducts = snapshot.docs.map(doc => doc.id);
    console.log(`Found ${targetProducts.length} products\n`);
  }

  const results = {
    total: targetProducts.length,
    updated: 0,
    noUpdates: 0,
    errors: 0,
    notFound: 0,
  };

  for (const mpn of targetProducts) {
    const result = await migrateProduct(mpn, dryRun);
    if (result.success) {
      if (result.reason === 'updated' || result.reason === 'dry_run') {
        results.updated++;
      } else if (result.reason === 'no_updates') {
        results.noUpdates++;
      }
    } else {
      if (result.reason === 'not_found') {
        results.notFound++;
      } else {
        results.errors++;
      }
    }
  }

  console.log(`\n${'='.repeat(60)}`);
  console.log('Migration Summary:');
  console.log(`  Total products:     ${results.total}`);
  console.log(`  Updated:            ${results.updated}`);
  console.log(`  No updates needed:  ${results.noUpdates}`);
  console.log(`  Not found:          ${results.notFound}`);
  console.log(`  Errors:             ${results.errors}`);
  console.log(`${'='.repeat(60)}\n`);

  return results;
}

/**
 * Parse command line arguments
 */
function parseArgs() {
  const args = process.argv.slice(2);
  const dryRun = args.includes('--dry-run');
  const productIdsArg = args.find(arg => arg.startsWith('--product-ids='));
  const productIds = productIdsArg
    ? productIdsArg.replace('--product-ids=', '').split(',').map(s => s.trim())
    : [];

  return { dryRun, productIds };
}

/**
 * Main execution
 */
async function main() {
  const { dryRun, productIds } = parseArgs();

  try {
    await migrateProducts(productIds, dryRun);
    process.exit(0);
  } catch (error) {
    console.error('\n✗ Migration failed:', error);
    process.exit(1);
  }
}

// Run if executed directly
if (require.main === module) {
  main();
}

module.exports = { migrateProduct, migrateProducts };
