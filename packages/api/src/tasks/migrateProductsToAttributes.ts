/**
 * Migration: Migrate Products to Canonical Attributes Map
 * 
 * Scans products in batches and migrates top-level attribute fields
 * into the canonical product.attributes map.
 * 
 * LP-2.0.3: Per-key updates with provenance metadata in attributes._meta.<key>
 * 
 * This is an idempotent migration - safe to re-run.
 * 
 * Usage:
 *   pnpm --filter @ropi-aoss/api build
 *   pnpm api:migrate:products-to-attributes
 *   pnpm api:migrate:products-to-attributes --dry-run
 *   pnpm api:migrate:products-to-attributes --limit 100
 * 
 * Lisa v1.0.0 / LP-2.0.3
 */

import * as admin from 'firebase-admin';
import * as path from 'path';
import * as fs from 'fs';

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

const MIGRATION_VERSION = '1.0.0';

interface MigrationStats {
  processed: number;
  updated: number;
  skipped: number;
  errors: number;
  errorDetails: Array<{ productId: string; error: string }>;
  keysMigrated: Map<string, number>;
}

interface DryRunEntry {
  productId: string;
  keysToMigrate: Array<{ key: string; value: unknown }>;
}

/**
 * LP-2.0.3: Run migration with per-key updates and provenance metadata
 */
export async function migrateProductsToAttributes(options?: { 
  dryRun?: boolean; 
  limit?: number;
}): Promise<void> {
  const isDryRun = options?.dryRun ?? false;
  const limit = options?.limit;
  
  console.log('🚀 Starting products migration to canonical attributes map...');
  if (isDryRun) {
    console.log('🔍 DRY RUN MODE - No changes will be written');
  }
  if (limit) {
    console.log(`📊 Limited to ${limit} products`);
  }
  console.log(`📋 Registry keys to migrate: ${REGISTRY_ATTRIBUTE_KEYS.length}\n`);

  const stats: MigrationStats = {
    processed: 0,
    updated: 0,
    skipped: 0,
    errors: 0,
    errorDetails: [],
    keysMigrated: new Map(),
  };

  const dryRunOutput: DryRunEntry[] = [];

  const BATCH_SIZE = limit ? Math.min(limit, 500) : 500;
  let lastDoc: admin.firestore.QueryDocumentSnapshot | null = null;
  let hasMore = true;
  let batchNumber = 0;
  let totalProcessed = 0;

  while (hasMore) {
    batchNumber++;
    
    if (limit && totalProcessed >= limit) {
      break;
    }

    const batchLimit = limit ? Math.min(BATCH_SIZE, limit - totalProcessed) : BATCH_SIZE;
    
    console.log(`\n📦 Processing batch ${batchNumber}...`);

    let query = db.collection('products').limit(batchLimit);
    if (lastDoc) {
      query = query.startAfter(lastDoc);
    }

    const snapshot = await query.get();
    
    if (snapshot.empty) {
      hasMore = false;
      break;
    }

    console.log(`   Found ${snapshot.size} products in batch`);

    for (const doc of snapshot.docs) {
      if (limit && totalProcessed >= limit) {
        break;
      }
      await processProduct(doc, stats, isDryRun, dryRunOutput);
      totalProcessed++;
    }

    lastDoc = snapshot.docs[snapshot.docs.length - 1];
    
    if (snapshot.size < batchLimit) {
      hasMore = false;
    }

    console.log(`   Batch ${batchNumber} complete: ${stats.updated} updated, ${stats.skipped} skipped`);
  }

  // Final summary
  console.log('\n─────────────────────────────────────');
  if (isDryRun) {
    console.log('📊 DRY RUN Summary:');
    console.log(`   Would process: ${stats.processed}`);
    console.log(`   Would update:  ${stats.updated}`);
    console.log(`   Would skip:    ${stats.skipped}`);
    console.log(`   Errors:        ${stats.errors}`);
    
    if (dryRunOutput.length > 0) {
      console.log('\n📝 Sample proposed updates (first 10):');
      dryRunOutput.slice(0, 10).forEach(entry => {
        console.log(`\n   Product: ${entry.productId}`);
        entry.keysToMigrate.forEach(({ key, value }) => {
          const displayValue = typeof value === 'string' ? `"${value}"` : JSON.stringify(value);
          console.log(`     - ${key}: ${displayValue}`);
        });
      });
    }
    
    console.log('\n   ⚠️  No changes were made to Firestore');
  } else {
    console.log('📊 Migration Complete:');
    console.log(`   Processed: ${stats.processed}`);
    console.log(`   Updated:   ${stats.updated}`);
    console.log(`   Skipped:   ${stats.skipped} (already migrated or no changes)`);
    console.log(`   Errors:    ${stats.errors}`);
    
    if (stats.keysMigrated.size > 0) {
      console.log('\n📝 Keys migrated:');
      for (const [key, count] of stats.keysMigrated) {
        console.log(`     ${key}: ${count} products`);
      }
    }
  }
  console.log('─────────────────────────────────────\n');

  if (stats.errorDetails.length > 0) {
    console.log('❌ Errors:');
    stats.errorDetails.slice(0, 10).forEach(e => {
      console.log(`   ${e.productId}: ${e.error}`);
    });
  }
}

/**
 * LP-2.0.3: Process a single product with per-key updates and provenance
 */
async function processProduct(
  doc: admin.firestore.QueryDocumentSnapshot,
  stats: MigrationStats,
  isDryRun: boolean,
  dryRunOutput: DryRunEntry[]
): Promise<void> {
  stats.processed++;
  
  try {
    const data = doc.data();
    const productId = doc.id;

    const existingAttributes = (data.attributes && typeof data.attributes === 'object')
      ? data.attributes as Record<string, unknown>
      : {};
    
    const existingMeta = (existingAttributes._meta && typeof existingAttributes._meta === 'object')
      ? existingAttributes._meta as Record<string, unknown>
      : {};

    // Check if fully migrated (has _migratedAt marker)
    if (existingMeta._migratedAt) {
      stats.skipped++;
      return;
    }

    // LP-2.0.3: Build per-key update payload with dot-notation
    const updatePayload: Record<string, unknown> = {};
    const keysToMigrate: Array<{ key: string; value: unknown }> = [];

    for (const key of REGISTRY_ATTRIBUTE_KEYS) {
      const topLevelValue = data[key];
      
      // Skip if top-level doesn't have this key or it's undefined/null
      if (topLevelValue === undefined || topLevelValue === null) {
        continue;
      }

      // Skip if attributes already has this key with a value
      if (existingAttributes[key] !== undefined) {
        continue;
      }

      // LP-2.0.3: Check if this key was already migrated (has _meta.<key>.migratedAt)
      const existingKeyMeta = existingMeta[key] as Record<string, unknown> | undefined;
      if (existingKeyMeta?.migratedAt) {
        continue;
      }

      // LP-2.0.3: Build per-key update with dot-notation
      updatePayload[`attributes.${key}`] = topLevelValue;
      updatePayload[`attributes._meta.${key}`] = {
        source: 'migration',
        actor: 'system',
        migratedAt: admin.firestore.FieldValue.serverTimestamp(),
        migratedVersion: MIGRATION_VERSION,
      };

      keysToMigrate.push({ key, value: topLevelValue });
      
      // Track stats
      const currentCount = stats.keysMigrated.get(key) || 0;
      stats.keysMigrated.set(key, currentCount + 1);
    }

    if (keysToMigrate.length === 0) {
      stats.skipped++;
      return;
    }

    // LP-2.0.3: Add overall migration marker to _meta
    updatePayload['attributes._meta._migratedAt'] = admin.firestore.FieldValue.serverTimestamp();
    updatePayload['attributes._meta._migratedVersion'] = MIGRATION_VERSION;

    if (isDryRun) {
      dryRunOutput.push({ productId, keysToMigrate });
      stats.updated++;
    } else {
      // LP-2.0.3: Atomic per-key update using dot-notation
      await doc.ref.update(updatePayload);
      stats.updated++;
    }
    
  } catch (error) {
    stats.errors++;
    stats.errorDetails.push({
      productId: doc.id,
      error: error instanceof Error ? error.message : String(error),
    });
  }
}

// CLI entry point
if (require.main === module) {
  const args = process.argv.slice(2);
  const dryRun = args.includes('--dry-run');
  const limitArg = args.find(a => a.startsWith('--limit'));
  const limit = limitArg ? parseInt(limitArg.split('=')[1] || args[args.indexOf('--limit') + 1], 10) : undefined;

  migrateProductsToAttributes({ dryRun, limit })
    .then(() => {
      console.log('✅ Migration completed successfully');
      process.exit(0);
    })
    .catch((error) => {
      console.error('❌ Migration failed:', error);
      process.exit(1);
    });
}

export default migrateProductsToAttributes;
