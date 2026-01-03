#!/usr/bin/env node
/**
 * fix-rule-field-paths.mjs - Fix rics_category to attributes.rics_category
 */

import admin from 'firebase-admin';
import { getFirestore } from 'firebase-admin/firestore';

if (!admin.apps.length) {
  admin.initializeApp({ projectId: 'ropi-bccee' });
}
const db = getFirestore();

const DRY_RUN = process.argv.includes('--dry-run');

async function fixRuleFieldPaths() {
  console.log('=== LP-smart-rules-field-fix-1.0.1: Fix Field Paths ===\n');
  console.log(`Mode: ${DRY_RUN ? 'DRY RUN' : 'LIVE'}\n`);
  
  const snap = await db.collection('settings/smartRules/rules').get();
  console.log(`Found ${snap.size} rules\n`);
  
  let fixedCount = 0;
  
  for (const doc of snap.docs) {
    const data = doc.data();
    const conditionField = data.condition?.field;
    
    // Check if field needs prefixing with attributes.
    if (conditionField && !conditionField.startsWith('attributes.') && !conditionField.startsWith('source.')) {
      console.log(`Rule: ${data.name} (${doc.id})`);
      console.log(`  Current field: ${conditionField}`);
      const newField = `attributes.${conditionField}`;
      console.log(`  Will change to: ${newField}`);
      
      if (!DRY_RUN) {
        await doc.ref.update({
          'condition.field': newField,
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
  console.log(`Total rules: ${snap.size}`);
  console.log(`Rules ${DRY_RUN ? 'to fix' : 'fixed'}: ${fixedCount}`);
  
  if (DRY_RUN && fixedCount > 0) {
    console.log('\nRun without --dry-run to apply changes.');
  }
}

fixRuleFieldPaths().catch(console.error);
