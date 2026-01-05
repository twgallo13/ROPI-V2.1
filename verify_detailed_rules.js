const admin = require('firebase-admin');

admin.initializeApp();
const db = admin.firestore();

async function verifyRuleConditions() {
  console.log('\n🔍 DETAILED RULE VERIFICATION\n');
  console.log('='.repeat(70));
  
  // Get the 4 shipping rules
  const ruleIds = [
    'JiYQZ6PxwjKBHsWiF1gI', // weight
    'H53rfxHqZ8h7j4abYctd', // length
    'YyhUxSJOCzOOW8ZuAW0z', // width
    '6xM28ocd281iw2D6KK4P', // height
  ];
  
  for (const ruleId of ruleIds) {
    const ruleDoc = await db.collection('settings/smartRules/rules').doc(ruleId).get();
    
    if (!ruleDoc.exists) {
      console.log(`\n❌ Rule ${ruleId} NOT FOUND`);
      continue;
    }
    
    const rule = ruleDoc.data();
    console.log(`\n✅ Rule: ${rule.name}`);
    console.log(`   ID: ${ruleId}`);
    console.log(`   Enabled: ${rule.enabled}`);
    console.log(`   AutoApply: ${rule.autoApply}`);
    console.log(`   Target Field: ${rule.action.targetField}`);
    console.log(`   Value: ${rule.action.valueTemplate}`);
    
    console.log('\n   Conditions:');
    if (rule.condition) {
      console.log(`     Single condition: ${rule.condition.source} ${rule.condition.matchType} "${rule.condition.value}"`);
    }
    
    if (rule.conditions && Array.isArray(rule.conditions)) {
      console.log(`     Multiple conditions (${rule.conditions.length}):`);
      rule.conditions.forEach((cond, idx) => {
        console.log(`       ${idx + 1}. ${cond.source} ${cond.matchType} "${cond.value}"`);
      });
    }
    
    if (!rule.condition && (!rule.conditions || rule.conditions.length === 0)) {
      console.log('     ⚠️  NO CONDITIONS FOUND!');
    }
  }
  
  // Check product 20-test
  console.log('\n' + '='.repeat(70));
  console.log('\n📦 Checking Product: 20-test\n');
  
  const productDoc = await db.collection('products').doc('20-test').get();
  
  if (!productDoc.exists) {
    console.log('❌ Product 20-test not found');
    return;
  }
  
  const product = productDoc.data();
  
  console.log(`MPN: ${product.core?.mpn || product.mpn}`);
  console.log(`RICS Category: ${product.attributes?.rics_category}`);
  console.log('');
  
  // Check if it matches condition
  const ricsCategory = product.attributes?.rics_category || '';
  const hasFootwear = ricsCategory.includes('Footwear');
  const hasMens = ricsCategory.includes('Mens');
  
  console.log('Condition Matching:');
  console.log(`  Contains "Footwear": ${hasFootwear ? '✅ YES' : '❌ NO'}`);
  console.log(`  Contains "Mens": ${hasMens ? '✅ YES' : '❌ NO'}`);
  console.log(`  Should Match: ${hasFootwear && hasMens ? '✅ YES' : '❌ NO'}`);
  console.log('');
  
  // Check attributes
  console.log('Current Attribute Values:');
  console.log(`  weight: ${product.attributes?.weight || product.dimensions?.weight || 'NOT SET'}`);
  console.log(`  height: ${product.attributes?.height || product.dimensions?.height || 'NOT SET'}`);
  console.log(`  length: ${product.attributes?.length || product.dimensions?.length || 'NOT SET'}`);
  console.log(`  width: ${product.attributes?.width || product.dimensions?.width || 'NOT SET'}`);
  console.log('');
  
  // Check when Smart Rules last ran
  console.log('Smart Rules Execution:');
  console.log(`  Last Ran: ${product._smartRulesRanAt || 'NEVER'}`);
  console.log(`  Skip Until: ${product._smartRulesSkipUntil ? new Date(product._smartRulesSkipUntil).toISOString() : 'None'}`);
  
  if (product._smartRulesSkipUntil) {
    const skipTime = new Date(product._smartRulesSkipUntil);
    const now = new Date();
    if (skipTime > now) {
      console.log(`  ⚠️  RULES SKIPPED - Will run again after ${skipTime.toISOString()}`);
    }
  }
  
  console.log('');
  
  // Check applied rules
  if (product._appliedRules) {
    console.log('Applied Rules:');
    Object.entries(product._appliedRules).forEach(([field, ruleInfo]) => {
      console.log(`  ${field}: ${ruleInfo.ruleId} (applied: ${ruleInfo.appliedAt})`);
    });
  } else {
    console.log('Applied Rules: NONE');
  }
  
  console.log('\n' + '='.repeat(70));
}

verifyRuleConditions().then(() => process.exit(0)).catch(console.error);
