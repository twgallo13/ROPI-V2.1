const admin = require('firebase-admin');

// Initialize Firebase Admin
const serviceAccount = require('./service-account.json');
admin.initializeApp({
  credential: admin.credential.cert(serviceAccount),
  storageBucket: 'gs://stage-homer-ropi-2-1.firebasestorage.app'
});

const db = admin.firestore();

async function verifyTriggerSetup() {
  console.log('\n🔍 Verifying Smart Rule Trigger Setup\n');
  
  // Get the 4 shipping dimension rules
  const rulesSnapshot = await db.collection('settings')
    .doc('smartRules')
    .collection('rules')
    .where('name', '>=', 'Footwear Mens')
    .where('name', '<=', 'Footwear Mens\uf8ff')
    .get();

  console.log(`Found ${rulesSnapshot.docs.length} shipping dimension rules\n`);

  for (const doc of rulesSnapshot.docs) {
    const rule = doc.data();
    console.log(`\n📋 Rule: ${rule.name} (${doc.id})`);
    console.log(`   Enabled: ${rule.enabled}`);
    console.log(`   Auto Apply: ${rule.autoApply}`);
    console.log(`   Target Field: ${rule.action?.targetField}`);
    console.log(`   Value: ${rule.action?.valueTemplate}`);
    
    // Check both condition formats
    if (rule.condition) {
      console.log(`\n   ⚠️  Has SINGULAR condition field (should not exist):`);
      console.log(`      source: ${rule.condition.source}`);
      console.log(`      matchType: ${rule.condition.matchType}`);
      console.log(`      value: ${rule.condition.value}`);
    }
    
    if (rule.conditions && Array.isArray(rule.conditions)) {
      console.log(`\n   ✅ Has CONDITIONS array (correct): ${rule.conditions.length} conditions`);
      rule.conditions.forEach((cond, idx) => {
        console.log(`      ${idx + 1}. ${cond.source} ${cond.matchType} "${cond.value}"`);
      });
    } else {
      console.log(`\n   ❌ NO conditions array found!`);
    }
  }

  // Check product 20-test
  console.log('\n\n📦 Product 20-test Current State:\n');
  const productDoc = await db.collection('products').doc('20-test').get();
  
  if (!productDoc.exists) {
    console.log('❌ Product 20-test not found!');
    return;
  }

  const product = productDoc.data();
  console.log(`   RICS Category: ${product.rics_category}`);
  console.log(`   Matches "Footwear": ${product.rics_category?.includes('Footwear') ? '✅ YES' : '❌ NO'}`);
  console.log(`   Matches "Mens": ${product.rics_category?.includes('Mens') ? '✅ YES' : '❌ NO'}`);
  
  console.log(`\n   Current Dimension Attributes:`);
  console.log(`   - weight: ${product.attributes?.weight || 'NOT SET'}`);
  console.log(`   - height: ${product.attributes?.height || 'NOT SET'}`);
  console.log(`   - length: ${product.attributes?.length || 'NOT SET'}`);
  console.log(`   - width: ${product.attributes?.width || 'NOT SET'}`);
  
  console.log(`\n   Smart Rules Metadata:`);
  console.log(`   - Skip Until: ${product._smartRulesSkipUntil || 'NOT SET (rules can run!)'}`);
  console.log(`   - Last Ran: ${product._smartRulesRanAt || 'Never'}`);
  console.log(`   - Applied Rules: ${product._appliedRules?.join(', ') || 'None'}`);
  
  console.log('\n✨ Verification Complete!\n');
}

verifyTriggerSetup()
  .then(() => process.exit(0))
  .catch(err => {
    console.error('Error:', err);
    process.exit(1);
  });
