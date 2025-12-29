#!/usr/bin/env node
/**
 * Boolean Attribute Normalization Migration
 * 
 * LP: LP-product-ordering-import-completeness-0.1.0
 * From: Lisa
 * To: Homer
 * 
 * PURPOSE:
 * Migrates family_sizing, family_sharing, and promo attributes to canonical boolean values.
 * Converts legacy text/select enum values to boolean using deterministic coercion rules.
 * 
 * COERCION RULES (case-insensitive):
 * - TRUE: 'true', '1', 'yes', 'y', 'on', 'allowed'
 * - FALSE: 'false', '0', 'no', 'n', 'off', 'not allowed', 'disallowed'
 * - Invalid: any other value (logged as WARN, skipped)
 * 
 * USAGE:
 *   node migrate-boolean-attrs-to-boolean.js --dry-run   # Preview changes only
 *   node migrate-boolean-attrs-to-boolean.js --apply     # Apply changes to Firestore
 *   node migrate-boolean-attrs-to-boolean.js --apply --force-admin  # Apply to admin-canonical attrs (requires Lisa approval)
 * 
 * OUTPUTS:
 *   - Per-product logs: reports/normalize-booleans/YYYY-MM-DD_HH-MM-SS/
 *   - Summary: reports/normalize-booleans/YYYY-MM-DD_HH-MM-SS/summary.json
 */

const admin = require('firebase-admin');
const fs = require('fs');
const path = require('path');

// Parse CLI args
const args = process.argv.slice(2);
const isDryRun = args.includes('--dry-run');
const isApply = args.includes('--apply');
const forceAdmin = args.includes('--force-admin');

if (!isDryRun && !isApply) {
  console.error('❌ ERROR: Must specify either --dry-run or --apply');
  process.exit(1);
}

if (isDryRun && isApply) {
  console.error('❌ ERROR: Cannot specify both --dry-run and --apply');
  process.exit(1);
}

// Initialize Firebase Admin
if (!admin.apps.length) {
  admin.initializeApp();
}

const db = admin.firestore();

// Attributes to migrate
const TARGET_ATTRIBUTES = ['family_sizing', 'family_sharing', 'promo'];

// Coercion rules per Lisa directive
const TRUE_VALUES = ['true', '1', 'yes', 'y', 'on', 'allowed'];
const FALSE_VALUES = ['false', '0', 'no', 'n', 'off', 'not allowed', 'disallowed'];

/**
 * Coerce value to boolean using deterministic rules
 * @param {any} value - Raw value
 * @returns {{ success: boolean, value?: boolean, error?: string }}
 */
function coerceToBoolean(value) {
  if (value === null || value === undefined || value === '') {
    return { success: false, error: 'empty' };
  }
  
  // Already boolean
  if (typeof value === 'boolean') {
    return { success: true, value };
  }
  
  // Coerce string
  const normalized = String(value).trim().toLowerCase();
  
  if (TRUE_VALUES.includes(normalized)) {
    return { success: true, value: true };
  }
  
  if (FALSE_VALUES.includes(normalized)) {
    return { success: true, value: false };
  }
  
  // Invalid value
  return { success: false, error: `invalid value: "${value}"` };
}

/**
 * Migrate a single product document
 * @param {FirebaseFirestore.DocumentSnapshot} productDoc
 * @returns {Promise<{ productId: string, changes: object[], warnings: string[], skipped: boolean }>}
 */
async function migrateProduct(productDoc) {
  const productId = productDoc.id;
  const data = productDoc.data();
  
  const changes = [];
  const warnings = [];
  let skipped = false;
  
  // Check attributes object
  const attributes = data.attributes || {};
  const _meta = data._meta || {};
  
  for (const attrKey of TARGET_ATTRIBUTES) {
    // Check if attribute exists in attributes.*
    if (attributes[attrKey] !== undefined) {
      const originalValue = attributes[attrKey];
      const coercion = coerceToBoolean(originalValue);
      
      if (!coercion.success) {
        warnings.push(`attributes.${attrKey}: ${coercion.error} (original: ${JSON.stringify(originalValue)})`);
        continue;
      }
      
      // Check if already boolean with correct value
      if (typeof originalValue === 'boolean' && originalValue === coercion.value) {
        // Already correct — skip
        continue;
      }
      
      // Check if admin-canonical (skip unless --force-admin)
      const metaKey = `_meta.${attrKey}`;
      const source = _meta[attrKey]?.source;
      if (source === 'admin' && !forceAdmin) {
        warnings.push(`attributes.${attrKey}: admin-canonical (skipped; use --force-admin to override)`);
        skipped = true;
        continue;
      }
      
      changes.push({
        field: `attributes.${attrKey}`,
        before: originalValue,
        after: coercion.value,
        type: typeof originalValue
      });
    }
    
    // Also check top-level field (legacy)
    if (data[attrKey] !== undefined) {
      const originalValue = data[attrKey];
      const coercion = coerceToBoolean(originalValue);
      
      if (!coercion.success) {
        warnings.push(`${attrKey} (top-level): ${coercion.error} (original: ${JSON.stringify(originalValue)})`);
        continue;
      }
      
      if (typeof originalValue === 'boolean' && originalValue === coercion.value) {
        continue;
      }
      
      changes.push({
        field: attrKey,
        before: originalValue,
        after: coercion.value,
        type: typeof originalValue
      });
    }
  }
  
  return { productId, changes, warnings, skipped };
}

/**
 * Apply changes to Firestore
 * @param {string} productId
 * @param {object[]} changes
 */
async function applyChanges(productId, changes) {
  const productRef = db.collection('products').doc(productId);
  const updateData = {};
  
  for (const change of changes) {
    updateData[change.field] = change.after;
    
    // Update _meta if modifying attributes.*
    if (change.field.startsWith('attributes.')) {
      const attrKey = change.field.split('.')[1];
      updateData[`_meta.${attrKey}`] = {
        source: 'system',
        actor: 'system:migrator',
        method: 'normalizeBooleanAttributes',
        timestamp: admin.firestore.FieldValue.serverTimestamp()
      };
    }
  }
  
  await productRef.update(updateData);
}

/**
 * Main migration logic
 */
async function main() {
  const mode = isDryRun ? 'DRY-RUN' : 'APPLY';
  const timestamp = new Date().toISOString().replace(/[:.]/g, '-').slice(0, -5);
  const reportDir = path.join(__dirname, '../../reports/normalize-booleans', timestamp);
  
  console.log(`\n🔧 Boolean Attribute Migration`);
  console.log(`   LP: LP-product-ordering-import-completeness-0.1.0`);
  console.log(`   Mode: ${mode}`);
  console.log(`   Force Admin: ${forceAdmin ? 'YES' : 'NO'}`);
  console.log(`   Target Attributes: ${TARGET_ATTRIBUTES.join(', ')}`);
  console.log(`   Report Dir: ${reportDir}\n`);
  
  // Create report directory
  if (!fs.existsSync(reportDir)) {
    fs.mkdirSync(reportDir, { recursive: true });
  }
  
  // Fetch all products
  console.log('📦 Fetching products...');
  const productsSnapshot = await db.collection('products').get();
  console.log(`   Found ${productsSnapshot.size} products\n`);
  
  // Migration stats
  const stats = {
    total: productsSnapshot.size,
    processed: 0,
    updated: 0,
    skipped: 0,
    errors: 0,
    warnings: 0,
    changeCount: 0
  };
  
  const results = [];
  
  // Process each product
  for (const productDoc of productsSnapshot.docs) {
    try {
      const result = await migrateProduct(productDoc);
      stats.processed++;
      
      if (result.changes.length > 0) {
        stats.updated++;
        stats.changeCount += result.changes.length;
        
        // Apply changes if --apply
        if (isApply) {
          await applyChanges(result.productId, result.changes);
        }
        
        // Write per-product log
        const logFile = path.join(reportDir, `${result.productId}.json`);
        fs.writeFileSync(logFile, JSON.stringify(result, null, 2));
        
        console.log(`✅ ${result.productId}: ${result.changes.length} change(s)`);
      }
      
      if (result.warnings.length > 0) {
        stats.warnings += result.warnings.length;
        console.log(`⚠️  ${result.productId}: ${result.warnings.length} warning(s)`);
        
        for (const warning of result.warnings) {
          console.log(`   - ${warning}`);
        }
      }
      
      if (result.skipped) {
        stats.skipped++;
      }
      
      results.push(result);
    } catch (error) {
      stats.errors++;
      console.error(`❌ ${productDoc.id}: ${error.message}`);
      
      results.push({
        productId: productDoc.id,
        changes: [],
        warnings: [],
        skipped: false,
        error: error.message
      });
    }
  }
  
  // Write summary
  const summary = {
    lp: 'LP-product-ordering-import-completeness-0.1.0',
    mode,
    timestamp: new Date().toISOString(),
    forceAdmin,
    targetAttributes: TARGET_ATTRIBUTES,
    stats,
    coercionRules: {
      trueValues: TRUE_VALUES,
      falseValues: FALSE_VALUES
    }
  };
  
  const summaryFile = path.join(reportDir, 'summary.json');
  fs.writeFileSync(summaryFile, JSON.stringify(summary, null, 2));
  
  // Print summary
  console.log(`\n📊 Migration Summary`);
  console.log(`   Mode: ${mode}`);
  console.log(`   Total Products: ${stats.total}`);
  console.log(`   Processed: ${stats.processed}`);
  console.log(`   Updated: ${stats.updated}`);
  console.log(`   Changes: ${stats.changeCount}`);
  console.log(`   Skipped (admin-canonical): ${stats.skipped}`);
  console.log(`   Warnings: ${stats.warnings}`);
  console.log(`   Errors: ${stats.errors}`);
  console.log(`\n   Summary: ${summaryFile}\n`);
  
  if (isDryRun) {
    console.log(`✅ DRY-RUN complete. No changes applied.`);
    console.log(`   To apply changes, run with --apply\n`);
  } else {
    console.log(`✅ Migration complete. ${stats.updated} products updated.\n`);
  }
}

// Run migration
main()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error('❌ FATAL:', error);
    process.exit(1);
  });
