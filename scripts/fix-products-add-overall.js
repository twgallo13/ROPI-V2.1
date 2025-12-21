/**
 * fix-products-add-overall.js
 * LP-3.0.2 — Migration script to add attributes.overall to products missing it
 * 
 * This script scans all products in Firestore and adds `attributes.overall = {}`
 * to any product where attributes or attributes.overall is undefined.
 * 
 * IMPORTANT:
 * - Only run this script AFTER creating a pre-sync backup
 * - First run in dry-run mode to see what would be changed
 * - For production use, run on staging first to validate
 * 
 * Usage:
 *   # Dry-run mode (default) - shows what would be updated without making changes
 *   node scripts/fix-products-add-overall.js
 *   
 *   # Actually apply the changes
 *   node scripts/fix-products-add-overall.js --apply
 *   
 *   # Limit to specific number of products
 *   node scripts/fix-products-add-overall.js --limit=10 --apply
 *
 * Environment:
 *   Expects Firebase Admin SDK to be initialized via environment credentials.
 *   Set GOOGLE_APPLICATION_CREDENTIALS or run in authenticated environment.
 */

const admin = require('firebase-admin');

// Initialize Firebase Admin SDK
if (!admin.apps.length) {
  admin.initializeApp();
}
const db = admin.firestore();

// Parse command line arguments
const args = process.argv.slice(2);
const applyChanges = args.includes('--apply');
const limitArg = args.find(a => a.startsWith('--limit='));
const limit = limitArg ? parseInt(limitArg.split('=')[1], 10) : null;

async function main() {
  console.log('='.repeat(60));
  console.log('LP-3.0.2 — Product attributes.overall Migration');
  console.log('='.repeat(60));
  console.log(`Mode: ${applyChanges ? 'APPLY (making changes)' : 'DRY-RUN (no changes)'}`);
  if (limit) console.log(`Limit: ${limit} products`);
  console.log('');

  try {
    const productsRef = db.collection('products');
    const snapshot = await productsRef.get();
    console.log(`Total products found: ${snapshot.size}`);

    let needsUpdate = 0;
    let updated = 0;
    let batch = db.batch();
    let batchCount = 0;

    const productsNeedingUpdate = [];

    for (const doc of snapshot.docs) {
      const data = doc.data();

      // Check if attributes is missing or attributes.overall is undefined
      const missingAttributes = !data.attributes || typeof data.attributes !== 'object';
      const missingOverall = data.attributes && data.attributes.overall === undefined;

      if (missingAttributes || missingOverall) {
        needsUpdate++;
        productsNeedingUpdate.push({
          id: doc.id,
          sku: data.sku || data.mpn || doc.id,
          reason: missingAttributes ? 'missing attributes object' : 'missing attributes.overall',
        });

        if (applyChanges && (limit === null || updated < limit)) {
          if (missingAttributes) {
            // Initialize both attributes and attributes.overall
            batch.update(doc.ref, {
              'attributes': {},
              'attributes.overall': {},
            });
          } else {
            // Only add attributes.overall
            batch.update(doc.ref, { 'attributes.overall': {} });
          }
          batchCount++;
          updated++;

          // Commit batch every 450 operations (stay under Firestore 500 limit)
          if (batchCount >= 450) {
            await batch.commit();
            console.log(`Committed batch at ${updated} updates`);
            batch = db.batch();
            batchCount = 0;
          }
        }
      }
    }

    // Commit remaining batch
    if (applyChanges && batchCount > 0) {
      await batch.commit();
      console.log(`Committed final batch with ${batchCount} updates`);
    }

    // Summary report
    console.log('');
    console.log('='.repeat(60));
    console.log('Summary');
    console.log('='.repeat(60));
    console.log(`Products scanned: ${snapshot.size}`);
    console.log(`Products needing update: ${needsUpdate}`);

    if (applyChanges) {
      console.log(`Products updated: ${updated}`);
    } else {
      console.log('');
      console.log('Products that would be updated:');
      productsNeedingUpdate.slice(0, 20).forEach(p => {
        console.log(`  - ${p.sku} (${p.id}): ${p.reason}`);
      });
      if (productsNeedingUpdate.length > 20) {
        console.log(`  ... and ${productsNeedingUpdate.length - 20} more`);
      }
      console.log('');
      console.log('To apply changes, run with --apply flag');
    }

    console.log('');
    console.log('Done.');
    process.exit(0);
  } catch (error) {
    console.error('Migration error:', error);
    process.exit(1);
  }
}

main();
