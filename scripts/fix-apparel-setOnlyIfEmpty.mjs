#!/usr/bin/env node
/**
 * fix-apparel-setOnlyIfEmpty.mjs - Add missing setOnlyIfEmpty to Apparel rule
 */

import admin from 'firebase-admin';
import { getFirestore } from 'firebase-admin/firestore';

if (!admin.apps.length) {
  admin.initializeApp({ projectId: 'ropi-bccee' });
}
const db = getFirestore();

async function fixApparelRule() {
  const ruleId = 'rule_1767350520854_xpfska';
  const doc = await db.doc(`settings/smartRules/rules/${ruleId}`).get();
  
  if (!doc.exists) {
    console.log('Apparel rule not found');
    return;
  }
  
  const data = doc.data();
  console.log('Before:', JSON.stringify(data.action, null, 2));
  
  await doc.ref.update({
    'action.setOnlyIfEmpty': true,
    'updatedAt': new Date().toISOString(),
  });
  
  // Verify
  const updated = await doc.ref.get();
  console.log('After:', JSON.stringify(updated.data().action, null, 2));
  console.log('\n✅ Apparel rule setOnlyIfEmpty fixed!');
}

fixApparelRule().catch(console.error);
