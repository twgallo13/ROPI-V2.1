const admin = require('firebase-admin');
const serviceAccount = require('./service-account.json');

admin.initializeApp({
  credential: admin.credential.cert(serviceAccount),
  storageBucket: 'gs://stage-homer-ropi-2-1.firebasestorage.app'
});

const db = admin.firestore();

async function fixRuleConditions() {
  console.log('\n🔧 Fixing Smart Rule Conditions\n');
  
  // The 4 shipping dimension rule IDs
  const ruleIds = [
    'JiYQZ6PxwjKBHsWiF1gI', // Weight
    'H53rfxHqZ8h7j4abYctd', // Length
    'YyhUxSJOCzOOW8ZuAW0z', // Width
    '6xM28ocd281iw2D6KK4P'  // Height
  ];
  
  // The correct conditions using attribute ID from registry (rics_category, NOT attributes.rics_category)
  const correctConditions = [
    {
      source: 'rics_category',
      matchType: 'contains',
      value: 'Footwear'
    },
    {
      source: 'rics_category',
      matchType: 'contains',
      value: 'Mens'
    }
  ];
  
  for (const ruleId of ruleIds) {
    const ruleRef = db.collection('settings')
      .doc('smartRules')
      .collection('rules')
      .doc(ruleId);
    
    const doc = await ruleRef.get();
    if (!doc.exists) {
      console.log(`❌ Rule ${ruleId} not found`);
      continue;
    }
    
    const rule = doc.data();
    console.log(`\n📋 Updating: ${rule.name}`);
    console.log(`   Target: ${rule.action?.targetField}`);
    
    // Update with correct conditions and remove any malformed "condition" field
    await ruleRef.update({
      conditions: correctConditions,
      condition: admin.firestore.FieldValue.delete()
    });
    
    console.log(`   ✅ Set 2 conditions:`);
    console.log(`      1. rics_category contains "Footwear"`);
    console.log(`      2. rics_category contains "Mens"`);
  }
  
  console.log('\n\n🎯 Verification:\n');
  
  // Verify all rules now have correct conditions
  for (const ruleId of ruleIds) {
    const ruleRef = db.collection('settings')
      .doc('smartRules')
      .collection('rules')
      .doc(ruleId);
    
    const doc = await ruleRef.get();
    const rule = doc.data();
    
    console.log(`\n${rule.name}:`);
    console.log(`   Has "condition" field: ${rule.condition ? '❌ YES (should be deleted)' : '✅ NO (correct)'}`);
    console.log(`   Has "conditions" array: ${rule.conditions ? '✅ YES' : '❌ NO'}`);
    
    if (rule.conditions && Array.isArray(rule.conditions)) {
      console.log(`   Number of conditions: ${rule.conditions.length}`);
      rule.conditions.forEach((cond, idx) => {
        console.log(`      ${idx + 1}. ${cond.source} ${cond.matchType} "${cond.value}"`);
      });
    }
  }
  
  console.log('\n✨ All rules fixed!\n');
  process.exit(0);
}

fixRuleConditions().catch(err => {
  console.error('Error:', err);
  process.exit(1);
});
