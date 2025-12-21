#!/usr/bin/env node
/**
 * LP-2.0.3: Get sample product snapshots to verify _meta provenance
 */

import admin from 'firebase-admin';

const PROJECT_ID = 'ropi-bccee';

if (!admin.apps.length) {
  admin.initializeApp({ projectId: PROJECT_ID });
}

const db = admin.firestore();

async function getSampleSnapshots() {
  // Get products that were normalized (have _normalizedAt)
  const query = await db.collection('products')
    .where('attributes._normalizedAt', '!=', null)
    .limit(5)
    .get();

  console.log('=' .repeat(80));
  console.log('LP-2.0.3: Sample Product Snapshots (showing _meta provenance)');
  console.log('=' .repeat(80));
  console.log(`Timestamp: ${new Date().toISOString()}`);
  console.log(`Found ${query.size} products with _normalizedAt\n`);

  for (const doc of query.docs) {
    const data = doc.data();
    const attrs = data.attributes || {};
    const meta = attrs._meta || {};

    console.log(`\n--- Product: ${doc.id} ---`);
    console.log('Attributes:');
    
    // Show a few sample attributes
    const sampleKeys = ['fit', 'closure_type', 'primary_color', 'category'].filter(k => attrs[k]);
    for (const key of sampleKeys.slice(0, 3)) {
      console.log(`  ${key}: ${JSON.stringify(attrs[key])}`);
      if (meta[key]) {
        console.log(`    _meta.${key}: ${JSON.stringify(meta[key])}`);
      }
    }
    
    // Show _normalizedAt
    if (attrs._normalizedAt) {
      console.log(`\n  _normalizedAt: ${attrs._normalizedAt.toDate?.() || attrs._normalizedAt}`);
    }
  }

  console.log('\n' + '=' .repeat(80));
  process.exit(0);
}

getSampleSnapshots().catch(console.error);
