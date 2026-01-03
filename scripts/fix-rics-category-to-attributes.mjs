#!/usr/bin/env node
/**
 * fix-rics-category-to-attributes.mjs
 * 
 * Fixes Smart Rules that use just 'rics_category' to use 'attributes.rics_category'
 * since that's where the field is actually stored in product documents.
 */

import admin from 'firebase-admin';
import { getFirestore } from 'firebase-admin/firestore';

if (!admin.apps.length) {
  admin.initializeApp({ projectId: 'ropi-bccee' });
}
const db = getFirestore();

const DRY_RUN = process.argv.includes('--dry-run');

async function fixRicsCategoryPaths() {
  console.log('=== Fix rics_category → attributes.rics_category ===\n');
  console.log(`Mode: ${DRY_RUN ? 'DRY RUN' : 'LIVE'}\n`);
  
  const rulesSnapshot = await db.collection('settings').doc('smartRules').collection('rules').get();
  console.log(`Found ${rulesSnapshot.size} rules\n`);
  
  let fixedCount = 0;
  
  for (const doc of rulesSnapshot.docs) {
    const data = doc.data();
    const conditionField = data.condition?.field;
    
    if (conditionField === 'rics_category') {
      console.log(`Rule: ${data.name} (${doc.id})`);
      console.log(`  Current field: ${conditionField}`);
      console.log(`  Will change to: attributes.rics_category`);
      
      if (!DRY_RUN) {
        await doc.ref.update({
          'condition.field': 'attributes.rics_category',
          'updatedAt': new Date().toISOString(),
        });
        console.log('  ✅ Fixed!');
      } else {
        console.log('  (dry run - no changes made)');
      }
      fixedCount++;
      console.log('');
    }
  }
  
  console.log(`\n=== Summary ===`);
  console.log(`Total rules: ${rulesSnapshot.size}`);
  console.log(`Rules ${DRY_RUN ? 'to fix' : 'fixed'}: ${fixedCount}`);
  
  if (DRY_RUN && fixedCount > 0) {
    console.log('\nRun without --dry-run to apply changes.');
  }
}

fixRicsCategoryPaths().catch(console.error);
