#!/usr/bin/env node
/**
 * LP-2.0.2: Get sample attribute document snapshots
 */

import admin from 'firebase-admin';

const PROJECT_ID = 'ropi-bccee';

if (!admin.apps.length) {
  admin.initializeApp({ projectId: PROJECT_ID });
}

const db = admin.firestore();

async function getSampleSnapshots() {
  const attributeIds = ['sku', 'mpn', 'category', 'primary_color', 'material'];
  
  console.log('=' .repeat(80));
  console.log('LP-2.0.2: Sample Attribute Document Snapshots');
  console.log('=' .repeat(80));
  console.log(`Timestamp: ${new Date().toISOString()}`);
  console.log('');

  for (const attrId of attributeIds) {
    const docRef = db.doc(`settings/attributes/keys/${attrId}`);
    const snapshot = await docRef.get();
    
    if (snapshot.exists) {
      const data = snapshot.data();
      console.log(`\n--- ${attrId} ---`);
      console.log(JSON.stringify({
        attribute_id: data.attribute_id,
        label: data.label,
        data_type: data.data_type,
        definition_version: data.definition_version,
        canonical: data.canonical,
        category: data.category,
        allowed_values: data.allowed_values?.slice(0, 5),  // First 5 only
        source: data.source,
        updatedAt: data.updatedAt,
      }, null, 2));
    } else {
      console.log(`\n--- ${attrId}: NOT FOUND ---`);
    }
  }

  console.log('\n' + '=' .repeat(80));
  process.exit(0);
}

getSampleSnapshots().catch(console.error);
