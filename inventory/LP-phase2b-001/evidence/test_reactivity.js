#!/usr/bin/env node
/**
 * Reactivity Test: Toggle attribute and measure completion change
 */

const admin = require('firebase-admin');

if (!admin.apps.length) {
  const serviceAccount = require('../../../service-account.json');
  admin.initializeApp({
    credential: admin.credential.cert(serviceAccount),
    projectId: 'ropi-bccee'
  });
}

const db = admin.firestore();

async function testReactivity() {
  try {
    const mpn = '19-test';
    const testAttr = 'style_id';
    
    console.log(`🧪 Reactivity Test: ${mpn}`);
    console.log(`   Test attribute: ${testAttr}\n`);
    
    // Get baseline
    const productRef = db.collection('products').doc(mpn);
    let snapshot = await productRef.get();
    let data = snapshot.data();
    const originalValue = data.attributes[testAttr];
    const baselineAttrCount = Object.keys(data.attributes || {}).length;
    
    console.log(`✅ Baseline: ${baselineAttrCount} attributes`);
    console.log(`   ${testAttr} = "${originalValue}"`);
    
    // Remove attribute
    console.log(`\n⏳ Removing ${testAttr}...`);
    const start = Date.now();
    await productRef.update({
      [`attributes.${testAttr}`]: admin.firestore.FieldValue.delete()
    });
    
    // Verify removed
    snapshot = await productRef.get();
    data = snapshot.data();
    const removedAttrCount = Object.keys(data.attributes || {}).length;
    const removalTime = Date.now() - start;
    
    console.log(`✅ Removed in ${removalTime}ms`);
    console.log(`   Attributes now: ${removedAttrCount} (was ${baselineAttrCount})`);
    
    // Restore attribute
    console.log(`\n⏳ Restoring ${testAttr}...`);
    const restoreStart = Date.now();
    await productRef.update({
      [`attributes.${testAttr}`]: originalValue
    });
    
    // Verify restored
    snapshot = await productRef.get();
    data = snapshot.data();
    const restoredAttrCount = Object.keys(data.attributes || {}).length;
    const restoreTime = Date.now() - restoreStart;
    
    console.log(`✅ Restored in ${restoreTime}ms`);
    console.log(`   Attributes now: ${restoredAttrCount}`);
    
    // Summary
    console.log(`\n📊 Reactivity Test Results:`);
    console.log(`   Removal latency: ${removalTime}ms`);
    console.log(`   Restore latency: ${restoreTime}ms`);
    console.log(`   Attribute count: ${baselineAttrCount} → ${removedAttrCount} → ${restoredAttrCount}`);
    console.log(`   Status: ${restoredAttrCount === baselineAttrCount ? '✅ PASS' : '❌ FAIL'}`);
    
    if (removalTime < 2000 && restoreTime < 2000) {
      console.log(`\n✅ Reactivity SLA met: All operations < 2000ms`);
    } else {
      console.log(`\n⚠️  Reactivity SLA warning: Some operations >= 2000ms`);
    }
    
    process.exit(0);
  } catch (error) {
    console.error('ERROR:', error);
    process.exit(1);
  }
}

testReactivity();
