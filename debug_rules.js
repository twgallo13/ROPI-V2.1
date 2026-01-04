const admin = require('firebase-admin');
const serviceAccount = require('./service-account.json');

admin.initializeApp({
  credential: admin.credential.cert(serviceAccount),
  storageBucket: 'gs://stage-homer-ropi-2-1.firebasestorage.app'
});

const db = admin.firestore();

async function debugRules() {
  console.log('\n🔧 Debugging Rule Evaluation\n');
  
  // Get the rules
  const rulesSnapshot = await db.collection('settings')
    .doc('smartRules')
    .collection('rules')
    .get();
  
  console.log(`Found ${rulesSnapshot.docs.length} total rules\n`);
  
  // Get product
  const productDoc = await db.collection('products').doc('20-test').get();
  const product = productDoc.data();
  
  const rics = product.attributes?.rics_category;
  console.log(`Product RICS Category: "${rics}"\n`);
  
  // Check each shipping dimension rule
  const shippingRuleIds = [
    'JiYQZ6PxwjKBHsWiF1gI', // Weight
    'H53rfxHqZ8h7j4abYctd', // Length  
    'YyhUxSJOCzOOW8ZuAW0z', // Width
    '6xM28ocd281iw2D6KK4P'  // Height
  ];
  
  for (const ruleId of shippingRuleIds) {
    const ruleDoc = await db.collection('settings')
      .doc('smartRules')
      .collection('rules')
      .doc(ruleId)
      .get();
    
    const rule = ruleDoc.data();
    console.log(`\n${'='.repeat(60)}`);
    console.log(`Rule: ${rule.name}`);
    console.log(`${'='.repeat(60)}`);
    
    // Check which conditions are being used
    console.log(`\nConditions to evaluate:`);
    
    if (rule.conditions && Array.isArray(rule.conditions)) {
      console.log(`  ✓ Using 'conditions' array (${rule.conditions.length} items):`);
      rule.conditions.forEach((c, i) => {
        console.log(`    ${i+1}. ${c.source} ${c.matchType} "${c.value}"`);
        const matches = rics?.includes(c.value);
        console.log(`       Product matches: ${matches ? '✅ YES' : '❌ NO'}`);
      });
    }
    
    if (rule.condition && Array.isArray(rule.condition)) {
      console.log(`  ⚠️  Has 'condition' array (${rule.condition.length} items) - should be ignored:`);
      rule.condition.forEach((c, i) => {
        console.log(`    ${i+1}. ${c.field} ${c.matchType} "${c.value}"`);
      });
    }
    
    // Simulate evaluation
    if (rule.conditions && Array.isArray(rule.conditions) && rule.conditions.length > 0) {
      const allMatch = rule.conditions.every(c => rics?.includes(c.value));
      console.log(`\n  Expected result: ${allMatch ? '✅ ALL CONDITIONS MATCH' : '❌ SOME CONDITIONS FAIL'}`);
    }
  }
  
  process.exit(0);
}

debugRules().catch(err => {
  console.error('Error:', err);
  process.exit(1);
});
