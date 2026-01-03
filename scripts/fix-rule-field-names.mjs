#!/usr/bin/env node
/**
 * fix-rule-field-names.mjs - Fix rics_category_path -> rics_category
 * 
 * LP-smart-rules-field-fix-1.0.0: Migrates rules using rics_category_path 
 * to use rics_category (the actual field name in products).
 */

import admin from 'firebase-admin';
import { getFirestore, FieldValue } from 'firebase-admin/firestore';

if (!admin.apps.length) {
  admin.initializeApp({ projectId: 'ropi-bccee' });
}
const db = getFirestore();

const DRY_RUN = process.argv.includes('--dry-run');

async function fixRuleFieldNames() {
  console.log('=== LP-smart-rules-field-fix-1.0.0: Fix Field Names ===\n');
  console.log(`Mode: ${DRY_RUN ? 'DRY RUN' : 'LIVE'}\n`);
  
  const rulesSnapshot = await db.collection('settings/smartRules/rules').get();
  console.log(`Found ${rulesSnapshot.size} rules\n`);
  
  let fixedCount = 0;
  
  for (const doc of rulesSnapshot.docs) {
    const data = doc.data();
    const conditionField = data.condition?.field;
    
    if (conditionField === 'rics_category_path') {
      console.log(`Rule: ${data.name} (${doc.id})`);
      console.log(`  Current field: ${conditionField}`);
      console.log(`  Will change to: rics_category`);
      
      if (!DRY_RUN) {
        await doc.ref.update({
          'condition.field': 'rics_category',
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

fixRuleFieldNames().catch(console.error);
