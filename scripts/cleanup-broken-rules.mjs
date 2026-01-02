#!/usr/bin/env node
/**
 * cleanup-broken-rules.mjs - Remove rules with undefined condition/action
 */

import admin from 'firebase-admin';
import { getFirestore } from 'firebase-admin/firestore';

if (!admin.apps.length) {
  admin.initializeApp({ projectId: 'ropi-bccee' });
}
const db = getFirestore();

const DRY_RUN = process.argv.includes('--dry-run');

async function cleanupBrokenRules() {
  console.log('=== Cleanup Broken Smart Rules ===\n');
  console.log(`Mode: ${DRY_RUN ? 'DRY RUN' : 'LIVE'}\n`);
  
  const snap = await db.collection('settings/smartRules/rules').get();
  
  let deletedCount = 0;
  
  for (const doc of snap.docs) {
    const data = doc.data();
    
    // Check if condition or action is missing/undefined
    const isBroken = !data.condition || !data.action || 
                     !data.condition.field || !data.action.targetField;
    
    if (isBroken) {
      console.log(`Broken Rule: ${data.name || doc.id}`);
      console.log(`  condition: ${JSON.stringify(data.condition)}`);
      console.log(`  action: ${JSON.stringify(data.action)}`);
      
      if (!DRY_RUN) {
        await doc.ref.delete();
        console.log('  ❌ DELETED');
      } else {
        console.log('  (dry run - would delete)');
      }
      deletedCount++;
      console.log('');
    }
  }
  
  console.log(`\n=== Summary ===`);
  console.log(`Total rules: ${snap.size}`);
  console.log(`Broken rules ${DRY_RUN ? 'found' : 'deleted'}: ${deletedCount}`);
  
  if (DRY_RUN && deletedCount > 0) {
    console.log('\nRun without --dry-run to delete.');
  }
}

cleanupBrokenRules().catch(console.error);
