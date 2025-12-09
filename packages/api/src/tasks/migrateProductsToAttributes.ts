/**
 * Migration: Migrate Products to Canonical Attributes Map
 * 
 * Scans products in batches and migrates top-level attribute fields
 * into the canonical product.attributes map.
 * 
 * This is an idempotent migration - safe to re-run.
 * 
 * Usage:
 *   pnpm --filter @ropi-aoss/api build
 *   pnpm api:migrate:products-to-attributes
 * 
 * Or with environment:
 *   GOOGLE_APPLICATION_CREDENTIALS=/path/to/sa.json node dist/tasks/migrateProductsToAttributes.js
 * 
 * Lisa v1.0.0
 */

import * as admin from 'firebase-admin';
import * as path from 'path';
import * as fs from 'fs';

// Initialize Firebase Admin if not already done
if (!admin.apps.length) {
  // Try to load credentials from environment
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
    // Try default credentials (GCP environment)
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
  // Additional common top-level keys from imported products
  'category', 'brand', 'department', 'class', 'fit',
];

interface MigrationStats {
  processed: number;
  updated: number;
  skipped: number;
  errors: number;
  errorDetails: Array<{ productId: string; error: string }>;
}

/**
 * Run the migration in batches
 */
async function migrateProductsToAttributes(): Promise<void> {
  console.log('🚀 Starting products migration to canonical attributes map...\n');
  console.log(`📋 Registry keys to migrate: ${REGISTRY_ATTRIBUTE_KEYS.length}`);
  console.log(`   Keys: ${REGISTRY_ATTRIBUTE_KEYS.slice(0, 10).join(', ')}...\n`);

  const stats: MigrationStats = {
    processed: 0,
    updated: 0,
    skipped: 0,
    errors: 0,
    errorDetails: [],
  };

  const BATCH_SIZE = 500;
  let lastDoc: admin.firestore.QueryDocumentSnapshot | null = null;
  let hasMore = true;
  let batchNumber = 0;

  while (hasMore) {
    batchNumber++;
    console.log(`\n📦 Processing batch ${batchNumber}...`);

    let query = db.collection('products').limit(BATCH_SIZE);
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
    const updatePromises: Promise<void>[] = [];

    for (const doc of snapshot.docs) {
      updatePromises.push(processProduct(doc, stats));
    }

    await Promise.all(updatePromises);

    lastDoc = snapshot.docs[snapshot.docs.length - 1];
    
    if (snapshot.size < BATCH_SIZE) {
      hasMore = false;
    }

    // Progress update
    console.log(`   Batch ${batchNumber} complete: ${stats.updated} updated, ${stats.skipped} skipped, ${stats.errors} errors`);
  }

  // Final summary
  console.log('\n─────────────────────────────────────');
  console.log('📊 Migration Complete:');
  console.log(`   Processed: ${stats.processed}`);
  console.log(`   Updated:   ${stats.updated}`);
  console.log(`   Skipped:   ${stats.skipped} (already migrated or no changes)`);
  console.log(`   Errors:    ${stats.errors}`);
  console.log('─────────────────────────────────────\n');

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

    // Build or extend the attributes map
    const existingAttributes = (data.attributes && typeof data.attributes === 'object')
      ? { ...data.attributes }
      : {};

    // Check if already migrated
    if (existingAttributes._migratedAt) {
      stats.skipped++;
      return;
    }

    let changed = false;
    const newAttributes: Record<string, unknown> = { ...existingAttributes };

    // Merge top-level fields into attributes
    for (const key of REGISTRY_ATTRIBUTE_KEYS) {
      const topLevelValue = data[key];
      
      // Skip if top-level doesn't have this key or it's undefined/null
      if (topLevelValue === undefined || topLevelValue === null) {
        continue;
      }

      // Skip if attributes already has this key
      if (newAttributes[key] !== undefined) {
        continue;
      }

      // Migrate the value
      newAttributes[key] = topLevelValue;
      changed = true;
    }

    if (!changed) {
      stats.skipped++;
      return;
    }

    // Add migration marker
    newAttributes._migratedAt = admin.firestore.FieldValue.serverTimestamp();
    newAttributes._migratedVersion = '1.0.0';

    // Update the document
    await doc.ref.update({ attributes: newAttributes });
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
    console.log('✅ Migration completed successfully');
    process.exit(0);
  })
  .catch((error) => {
    console.error('❌ Migration failed:', error);
    process.exit(1);
  });
