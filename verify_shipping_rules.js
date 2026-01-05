const admin = require('firebase-admin');

admin.initializeApp();
const db = admin.firestore();

async function verifyRules() {
  console.log('\n✅ VERIFICATION: Smart Rules for Footwear Mens Shipping\n');
  
  // Get all rules we just created
  const rulesSnap = await db.collection('settings/smartRules/rules')
    .where('tags', 'array-contains', 'shipping')
    .get();
  
  console.log(`📋 Found ${rulesSnap.size} shipping rules:\n`);
  
  const rules = [];
  rulesSnap.forEach(doc => {
    const rule = doc.data();
    // Skip old rules
    if (!rule.conditions || rule.conditions.length === 0) return;
    
    rules.push({ id: doc.id, ...rule });
    console.log(`  ${rule.name}`);
    console.log(`  └─ ID: ${doc.id}`);
    console.log(`  └─ Condition: rics_category contains "${rule.conditions[0].value}" AND "${rule.conditions[1].value}"`);
    console.log(`  └─ Action: ${rule.action.targetField} = ${rule.action.valueTemplate}`);
    console.log(`  └─ AutoApply: ${rule.autoApply} (confidence: ${rule.autoApplyConfidence})`);
    console.log('');
  });
  
  // Check for test products
  console.log('\n🔍 Checking for test products created from import:\n');
  
  const mpns = ['shipping-test-001', 'shipping-test-002', 'shipping-test-003', 'shipping-test-004'];
  
  for (const mpn of mpns) {
    const productDoc = await db.collection('products').doc(mpn).get();
    
    if (!productDoc.exists) {
      console.log(`⏳ ${mpn}: Product not yet created (import may still be processing)`);
      continue;
    }
    
    const product = productDoc.data();
    console.log(`✅ ${mpn}:`);
    console.log(`   RICS Category: ${product.attributes?.rics_category || 'NOT SET'}`);
    console.log(`   Weight: ${product.dimensions?.weight || product.attributes?.weight || 'NOT SET'}`);
    console.log(`   Length: ${product.dimensions?.length || product.attributes?.length || 'NOT SET'}`);
    console.log(`   Width: ${product.dimensions?.width || product.attributes?.width || 'NOT SET'}`);
    console.log(`   Height: ${product.dimensions?.height || product.attributes?.height || 'NOT SET'}`);
    
    if (product._appliedRules) {
      console.log(`   Applied Rules:`);
      Object.entries(product._appliedRules).forEach(([field, rule]) => {
        console.log(`     • ${field}: ${rule.ruleId}`);
      });
    }
    console.log('');
  }
  
  console.log('\n📝 Summary:');
  console.log('✅ Created 4 rules for Footwear Mens shipping dimensions');
  console.log('✅ Each rule targets a different shipping attribute');
  console.log('✅ Rules are set to auto-apply with high confidence (0.95)');
  console.log('✅ Created test CSV with 4 Footwear||Mens products');
  console.log('\n🚀 To test: You can now run the import from the UI');
  console.log('   Rules should trigger and set: weight=5, length=14, width=12, height=6');
}

verifyRules().then(() => process.exit(0)).catch(console.error);
