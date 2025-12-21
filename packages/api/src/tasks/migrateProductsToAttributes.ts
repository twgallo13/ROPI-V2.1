/**
 * Migration: Migrate Products to Canonical Attributes Map
 * LP-2.1.7 — Per-key updates with _meta provenance
 * 
 * Scans products in batches and migrates top-level attribute fields
 * into the canonical product.attributes map using per-key updates.
 * 
 * Features:
 * - Dry-run mode (default): produces audit JSON, does not write
 * - Pilot mode: --apply --limit=N for limited apply
 * - Per-key updates: writes attributes.<key> individually (not wholesale replacement)
 * - _meta provenance: tracks actor, source, timestamp, definition_version
 * - Admin-canonical protection: respects admin-authored canonical values
 * - --force-admin: override admin-canonical protection (requires --admin-note)
 * 
 * Usage:
 *   # Dry-run (default)
 *   pnpm api:migrate:products-to-attributes
 * 
 *   # Pilot apply (100 products)
 *   pnpm api:migrate:products-to-attributes -- --apply --limit=100
 * 
 *   # Full apply
 *   pnpm api:migrate:products-to-attributes -- --apply
 * 
 *   # Force override admin-canonical
 *   pnpm api:migrate:products-to-attributes -- --apply --force-admin --admin-note="Migration required"
 * 
 * Lisa LP-2.1.7
 */

import * as admin from 'firebase-admin';
import * as path from 'path';
import * as fs from 'fs';
import {
  buildPerKeyUpdatePayload,
  isAdminCanonical,
  generateAttributeDiff,
  type AttributeMetaEntry,
  type AttributeDiff,
  type ActorType,
} from '../lib/attributeMeta';

// Initialize Firebase Admin if not already done
if (!admin.apps.length) {
  const credPath = process.env.GOOGLE_APPLICATION_CREDENTIALS;
  const credBase64 = process.env.GCP_SA_KEY_BASE64;
  
  if (credPath && fs.existsSync(credPath)) {
    const serviceAccount = JSON.parse(fs.readFileSync(credPath, 'utf8'));
    admin.initializeApp({
      credential: admin.credential.cert(serviceAccount),
    });
  } else if (credBase64) {
    const serviceAccount = JSON.parse(Buffer.from(credBase64, 'base64').toString('utf8'));
    admin.initializeApp({
      credential: admin.credential.cert(serviceAccount),
    });
  } else {
    admin.initializeApp();
  }
}

const db = admin.firestore();

// Registry attribute keys to migrate from top-level to attributes map
const REGISTRY_ATTRIBUTE_KEYS = [
  'gender', 'age_group', 'ageGroup',
  'primary_color', 'primaryColor', 'secondary_color', 'secondaryColor',
  'material', 'materials',
  'pattern', 'style', 'occasion', 'season',
  'heel_height', 'heel_type', 'toe_style', 'closure_type',
  'width', 'waterproof', 'sustainable',
  'country_of_origin', 'care_instructions',
  'features', 'gtin', 'mpn', 'weight',
  'launch_date', 'end_of_life_date',
  'category', 'brand', 'department', 'class', 'fit',
];

// Parse CLI arguments
const args = process.argv.slice(2);
const DRY_RUN = !args.includes('--apply');
const FORCE_ADMIN = args.includes('--force-admin');
const limitIndex = args.findIndex(a => a.startsWith('--limit='));
const LIMIT = limitIndex >= 0 ? parseInt(args[limitIndex].split('=')[1], 10) : undefined;
const noteIndex = args.findIndex(a => a.startsWith('--admin-note='));
const ADMIN_NOTE = noteIndex >= 0 ? args[noteIndex].split('=').slice(1).join('=') : undefined;

// Load registry version
const registryPath = path.resolve(__dirname, '../../../sdk/config/attributeRegistry.json');
let REGISTRY_VERSION = '0.0.0';
try {
  const registry = JSON.parse(fs.readFileSync(registryPath, 'utf8'));
  REGISTRY_VERSION = registry.version ?? '0.0.0';
} catch {
  console.warn('⚠️ Could not load attributeRegistry.json, using version 0.0.0');
}

interface ProductDiff {
  productId: string;
  mpn: string | undefined;
  attributeDiffs: AttributeDiff[];
  protectedCount: number;
  changeCount: number;
}

interface MigrationStats {
  processed: number;
  updated: number;
  skipped: number;
  errors: number;
  protectedAttributes: number;
  totalAttributeChanges: number;
  productDiffs: ProductDiff[];
  errorDetails: Array<{ productId: string; error: string }>;
}

interface MigrationReport {
  lp: string;
  mode: string;
  timestamp: string;
  registryVersion: string;
  forceAdmin: boolean;
  adminNote?: string;
  limit?: number;
  stats: {
    processed: number;
    updated: number;
    skipped: number;
    errors: number;
    protectedAttributes: number;
    totalAttributeChanges: number;
  };
  productDiffs: ProductDiff[];
  errors: Array<{ productId: string; error: string }>;
}

/**
 * Run the migration in batches
 */
async function migrateProductsToAttributes(): Promise<void> {
  console.log('🚀 Starting LP-2.1.7 products migration...\n');
  console.log(`📋 Mode: ${DRY_RUN ? 'DRY-RUN' : 'APPLY'}`);
  console.log(`📋 Registry version: ${REGISTRY_VERSION}`);
  console.log(`📋 Force admin: ${FORCE_ADMIN}`);
  if (LIMIT) console.log(`📋 Limit: ${LIMIT} products`);
  if (ADMIN_NOTE) console.log(`📋 Admin note: ${ADMIN_NOTE}`);
  console.log(`📋 Registry keys to migrate: ${REGISTRY_ATTRIBUTE_KEYS.length}\n`);

  // Validate force-admin requires admin-note
  if (FORCE_ADMIN && !ADMIN_NOTE) {
    console.error('❌ --force-admin requires --admin-note="reason"');
    process.exit(1);
  }

  const stats: MigrationStats = {
    processed: 0,
    updated: 0,
    skipped: 0,
    errors: 0,
    protectedAttributes: 0,
    totalAttributeChanges: 0,
    productDiffs: [],
    errorDetails: [],
  };

  const BATCH_SIZE = 500;
  let lastDoc: admin.firestore.QueryDocumentSnapshot | null = null;
  let hasMore = true;
  let batchNumber = 0;
  let totalProcessed = 0;

  while (hasMore) {
    // Check limit
    if (LIMIT && totalProcessed >= LIMIT) {
      console.log(`\n🛑 Reached limit of ${LIMIT} products`);
      break;
    }

    batchNumber++;
    const remaining = LIMIT ? Math.min(BATCH_SIZE, LIMIT - totalProcessed) : BATCH_SIZE;
    console.log(`\n📦 Processing batch ${batchNumber}...`);

    let query = db.collection('products').limit(remaining);
    if (lastDoc) {
      query = query.startAfter(lastDoc);
    }

    const snapshot = await query.get();
    
    if (snapshot.empty) {
      hasMore = false;
      break;
    }

    console.log(`   Found ${snapshot.size} products in batch`);

    // Process each document
    for (const doc of snapshot.docs) {
      await processProduct(doc, stats);
      totalProcessed++;
      
      if (LIMIT && totalProcessed >= LIMIT) {
        break;
      }
    }

    lastDoc = snapshot.docs[snapshot.docs.length - 1];
    
    if (snapshot.size < remaining) {
      hasMore = false;
    }

    console.log(`   Batch ${batchNumber}: ${stats.updated} updated, ${stats.skipped} skipped, ${stats.errors} errors`);
  }

  // Generate report
  const report: MigrationReport = {
    lp: 'LP-2.1.7',
    mode: DRY_RUN ? 'dry-run' : 'apply',
    timestamp: new Date().toISOString(),
    registryVersion: REGISTRY_VERSION,
    forceAdmin: FORCE_ADMIN,
    adminNote: ADMIN_NOTE,
    limit: LIMIT,
    stats: {
      processed: stats.processed,
      updated: stats.updated,
      skipped: stats.skipped,
      errors: stats.errors,
      protectedAttributes: stats.protectedAttributes,
      totalAttributeChanges: stats.totalAttributeChanges,
    },
    productDiffs: stats.productDiffs,
    errors: stats.errorDetails,
  };

  // Write report to file
  const dateStr = new Date().toISOString().split('T')[0];
  const reportsDir = path.resolve(__dirname, `../../../../reports/attribute-inspections/${dateStr}`);
  fs.mkdirSync(reportsDir, { recursive: true });
  
  const reportPath = path.join(reportsDir, 'products-migration-audit.json');
  fs.writeFileSync(reportPath, JSON.stringify(report, null, 2));
  console.log(`\n📄 Report written to: ${reportPath}`);

  // Write summary
  const summaryPath = path.join(reportsDir, 'migration-summary.json');
  fs.writeFileSync(summaryPath, JSON.stringify({
    lp: 'LP-2.1.7',
    mode: DRY_RUN ? 'dry-run' : 'apply',
    timestamp: report.timestamp,
    registryVersion: REGISTRY_VERSION,
    totalProductsProcessed: stats.processed,
    totalAttributeChanges: stats.totalAttributeChanges,
    protectedAttributesSkipped: stats.protectedAttributes,
    errorsCount: stats.errors,
    status: stats.errors > 0 ? 'COMPLETED_WITH_ERRORS' : 'SUCCESS',
  }, null, 2));
  console.log(`📄 Summary written to: ${summaryPath}`);

  // Final summary
  console.log('\n─────────────────────────────────────');
  console.log(`📊 Migration ${DRY_RUN ? 'Dry-Run' : 'Apply'} Complete:`);
  console.log(`   Processed: ${stats.processed}`);
  console.log(`   Updated:   ${stats.updated}`);
  console.log(`   Skipped:   ${stats.skipped} (no changes needed)`);
  console.log(`   Errors:    ${stats.errors}`);
  console.log(`   Protected: ${stats.protectedAttributes} admin-canonical attributes preserved`);
  console.log(`   Changes:   ${stats.totalAttributeChanges} total attribute changes`);
  console.log('─────────────────────────────────────\n');

  // Check for blocking conditions
  if (!DRY_RUN) {
    // In apply mode, report results
    if (stats.errors > 0) {
      console.log('⚠️ Completed with errors. Check report for details.');
    }
  } else {
    // In dry-run mode, check for protected attributes threshold
    const protectedPct = (stats.protectedAttributes / Math.max(stats.totalAttributeChanges, 1)) * 100;
    if (stats.protectedAttributes > 1000 || protectedPct > 0.5) {
      console.log('⚠️ WARNING: High number of protected admin-canonical attributes.');
      console.log(`   Protected: ${stats.protectedAttributes} (${protectedPct.toFixed(2)}% of changes)`);
      console.log('   Review required before apply. Use --force-admin with caution.');
    }
  }

  if (stats.errorDetails.length > 0) {
    console.log('❌ Errors:');
    stats.errorDetails.slice(0, 10).forEach(e => {
      console.log(`   ${e.productId}: ${e.error}`);
    });
    if (stats.errorDetails.length > 10) {
      console.log(`   ... and ${stats.errorDetails.length - 10} more errors`);
    }
  }
}

/**
 * Process a single product document
 */
async function processProduct(
  doc: admin.firestore.QueryDocumentSnapshot,
  stats: MigrationStats
): Promise<void> {
  stats.processed++;
  
  try {
    const data = doc.data();
    const productId = doc.id;
    const mpn = data.mpn as string | undefined;

    // Get existing attributes and _meta
    const existingAttributes = (data.attributes && typeof data.attributes === 'object')
      ? data.attributes as Record<string, unknown>
      : {};
    const existingMeta = (existingAttributes._meta && typeof existingAttributes._meta === 'object')
      ? existingAttributes._meta as Record<string, AttributeMetaEntry>
      : {};

    // Skip if already migrated with LP-2.1.7
    if (existingMeta._migration?.method === 'migrateProductsToAttributes' &&
        existingMeta._migration?.definition_version === REGISTRY_VERSION) {
      stats.skipped++;
      return;
    }

    const attributeDiffs: AttributeDiff[] = [];
    const attributesToUpdate: Record<string, unknown> = {};
    let protectedCount = 0;

    // Check each registry key for migration
    for (const key of REGISTRY_ATTRIBUTE_KEYS) {
      const topLevelValue = data[key];
      
      // Skip if top-level doesn't have this key or it's undefined/null
      if (topLevelValue === undefined || topLevelValue === null) {
        continue;
      }

      // Get existing value and meta
      const existingValue = existingAttributes[key];
      const existingAttrMeta = existingMeta[key];

      // Check if admin-canonical protection applies
      if (isAdminCanonical(existingAttrMeta)) {
        protectedCount++;
        stats.protectedAttributes++;
        
        if (!FORCE_ADMIN) {
          // Generate diff showing protection
          attributeDiffs.push(generateAttributeDiff(
            key,
            existingValue,
            topLevelValue,
            existingAttrMeta,
            {
              actor: 'system:migrator' as ActorType,
              source: 'migration',
              method: 'migrateProductsToAttributes',
              definitionVersion: REGISTRY_VERSION,
              canonical: false,
            },
            false // not forcing
          ));
          continue; // Skip this attribute
        }
      }

      // Skip if attribute already has a value (don't overwrite)
      if (existingValue !== undefined && existingValue !== null) {
        // Only migrate if value is different
        if (JSON.stringify(existingValue) === JSON.stringify(topLevelValue)) {
          continue;
        }
      }

      // Plan the migration
      attributesToUpdate[key] = topLevelValue;
      stats.totalAttributeChanges++;

      // Generate diff
      attributeDiffs.push(generateAttributeDiff(
        key,
        existingValue,
        topLevelValue,
        existingAttrMeta,
        {
          actor: 'system:migrator' as ActorType,
          source: 'migration',
          method: 'migrateProductsToAttributes',
          definitionVersion: REGISTRY_VERSION,
          canonical: false,
          note: ADMIN_NOTE,
        },
        FORCE_ADMIN
      ));
    }

    // No changes to make
    if (Object.keys(attributesToUpdate).length === 0) {
      stats.skipped++;
      return;
    }

    // Record product diff
    stats.productDiffs.push({
      productId,
      mpn,
      attributeDiffs,
      protectedCount,
      changeCount: Object.keys(attributesToUpdate).length,
    });

    // If dry-run, don't write
    if (DRY_RUN) {
      stats.updated++;
      return;
    }

    // Build per-key update payload
    const updatePayload = buildPerKeyUpdatePayload({
      attributes: attributesToUpdate,
      actor: 'system:migrator',
      source: 'migration',
      method: 'migrateProductsToAttributes',
      definitionVersion: REGISTRY_VERSION,
      canonical: false,
      note: ADMIN_NOTE,
    });

    // Add migration marker
    updatePayload['attributes._meta._migration'] = {
      actor: 'system:migrator',
      source: 'migration',
      ts: new Date().toISOString(),
      method: 'migrateProductsToAttributes',
      definition_version: REGISTRY_VERSION,
      canonical: false,
      note: ADMIN_NOTE ?? 'LP-2.1.7 migration',
    };

    // Update the document with per-key updates
    await doc.ref.update(updatePayload);
    stats.updated++;
    
  } catch (error) {
    stats.errors++;
    stats.errorDetails.push({
      productId: doc.id,
      error: error instanceof Error ? error.message : String(error),
    });
  }
}

// Run the migration
migrateProductsToAttributes()
  .then(() => {
    console.log(`✅ Migration ${DRY_RUN ? 'dry-run' : 'apply'} completed successfully`);
    process.exit(0);
  })
  .catch((error) => {
    console.error('❌ Migration failed:', error);
    process.exit(1);
  });
