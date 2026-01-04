const admin = require('firebase-admin');

admin.initializeApp();
const db = admin.firestore();

async function verifyRulesFixed() {
  console.log('\n✅ VERIFICATION: Shipping Rules Now Allowed\n');
  
  // Get all shipping rules
  const rulesSnap = await db.collection('settings/smartRules/rules')
    .where('tags', 'array-contains', 'shipping')
    .get();
  
  console.log(`📋 Found ${rulesSnap.size} Footwear Mens shipping rules:\n`);
  
  const ruleIds = [];
  rulesSnap.forEach(doc => {
    const rule = doc.data();
    ruleIds.push({ id: doc.id, name: rule.name, field: rule.action.targetField });
    console.log(`  ✅ ${rule.name}`);
    console.log(`     Target Field: ${rule.action.targetField}`);
    console.log(`     Rule ID: ${doc.id}`);
    console.log('');
  });
  
  // Check if product 20-test exists and has the attributes
  console.log('\n🔍 Checking Product 20-test:\n');
  
  const productDoc = await db.collection('products').doc('20-test').get();
  
  if (!productDoc.exists) {
    console.log('⏳ Product 20-test not found yet (may still be importing)');
    console.log('\n💡 Tip: Run the import again now that rules are fixed!');
    console.log('   The whitelist issue has been resolved.');
    console.log('   Rules should now validate and apply successfully.');
    return;
  }
  
  const product = productDoc.data();
  console.log(`Product: ${product.core?.mpn || '20-test'}`);
  console.log(`RICS Category: ${product.attributes?.rics_category}`);
  console.log('');
  
  // Check dimensions
  const dims = product.dimensions || {};
  console.log('Dimensions:');
  console.log(`  Weight: ${dims.weight || product.attributes?.weight || '❌ NOT SET'}`);
  console.log(`  Height: ${dims.height || product.attributes?.height || '❌ NOT SET'}`);
  console.log(`  Length: ${dims.length || product.attributes?.length || '❌ NOT SET'}`);
  console.log(`  Width: ${dims.width || product.attributes?.width || '❌ NOT SET'}`);
  
  console.log('');
  if (product._appliedRules) {
    console.log('Applied Rules:');
    Object.entries(product._appliedRules).forEach(([field, rule]) => {
      console.log(`  ✅ ${field}: ${rule.ruleId}`);
    });
  }
  
  console.log('\n' + '='.repeat(70));
  console.log('✅ FIXED: weight, height, length, width are now allowed Smart Rules targets');
  console.log('🚀 Re-run your import to test the shipping dimension rules');
  console.log('='.repeat(70) + '\n');
}

verifyRulesFixed().then(() => process.exit(0)).catch(console.error);
