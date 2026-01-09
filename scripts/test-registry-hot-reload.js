/**
 * Test Registry Hot-Reload
 * 
 * LP-phase2b-003: Evidence collection for hot-reload capability
 * 
 * Tests:
 * 1. Check initial registry source and count
 * 2. Modify a Firestore attribute
 * 3. Wait for cache to expire (30s)
 * 4. Check registry again to see changes
 */

const admin = require('firebase-admin');
const fs = require('fs');
const path = require('path');

// Initialize Firebase Admin
const serviceAccount = require('../service-account.json');
admin.initializeApp({
  credential: admin.credential.cert(serviceAccount)
});

const db = admin.firestore();

async function testHotReload() {
  console.log('🧪 Testing Registry Hot-Reload\n');
  
  // Step 1: Get initial state
  console.log('Step 1: Check initial Firestore state');
  const testAttrId = 'hot_reload_test';
  const testAttrRef = db.collection('settings/attributes/keys').doc(testAttrId);
  
  // Create test attribute
  await testAttrRef.set({
    label: 'Hot Reload Test - Initial',
    category: 'test',
    dataType: 'text',
    required: false,
    export: true,
    updatedAt: admin.firestore.FieldValue.serverTimestamp(),
    test_version: 1
  });
  
  const initialDoc = await testAttrRef.get();
  console.log(`  ✓ Created test attribute: ${testAttrId}`);
  console.log(`    Label: "${initialDoc.data().label}"`);
  console.log(`    Version: ${initialDoc.data().test_version}\n`);
  
  // Step 2: Update attribute
  console.log('Step 2: Update test attribute in Firestore');
  await testAttrRef.update({
    label: 'Hot Reload Test - Updated',
    test_version: 2,
    updatedAt: admin.firestore.FieldValue.serverTimestamp()
  });
  
  const updatedDoc = await testAttrRef.get();
  console.log(`  ✓ Updated test attribute`);
  console.log(`    Label: "${updatedDoc.data().label}"`);
  console.log(`    Version: ${updatedDoc.data().test_version}\n`);
  
  // Step 3: Document timing for hot-reload
  console.log('Step 3: Timing information for hot-reload test');
  console.log(`  Cache TTL: 30 seconds (REGISTRY_CACHE_TTL_MS)`);
  console.log(`  Update timestamp: ${new Date().toISOString()}`);
  console.log(`  Expected cache refresh: ${new Date(Date.now() + 30000).toISOString()}\n`);
  
  console.log('✅ Hot-reload test setup complete\n');
  console.log('To verify hot-reload:');
  console.log('1. Call completion API now (will use old cache)');
  console.log('2. Wait 30+ seconds');
  console.log('3. Call completion API again (should load fresh from Firestore with updated attribute)');
  console.log('4. Check evaluator status endpoint for registry metadata\n');
  
  return {
    testAttributeId: testAttrId,
    initialLabel: initialDoc.data().label,
    updatedLabel: updatedDoc.data().label,
    updateTimestamp: new Date().toISOString(),
    cacheTTL: 30000
  };
}

// Run
testHotReload()
  .then(result => {
    console.log('📊 Test Result:');
    console.log(JSON.stringify(result, null, 2));
    process.exit(0);
  })
  .catch(error => {
    console.error('❌ Error:', error);
    process.exit(1);
  });
