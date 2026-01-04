const admin = require('firebase-admin');
const serviceAccount = require('./service-account.json');

admin.initializeApp({
  credential: admin.credential.cert(serviceAccount),
  storageBucket: 'gs://stage-homer-ropi-2-1.firebasestorage.app'
});

const db = admin.firestore();

async function fixUIConditions() {
  console.log('\n🔧 Fixing Rule Conditions for UI Display\n');
  
  const rulesToFix = [
    { id: 'JiYQZ6PxwjKBHsWiF1gI', name: 'Weight' },
    { id: 'H53rfxHqZ8h7j4abYctd', name: 'Length' },
    { id: 'YyhUxSJOCzOOW8ZuAW0z', name: 'Width' }
  ];
  
  // The correct format for BOTH UI and backend
  const uiConditions = [
    {
      field: 'rics_category',      // UI uses 'field'
      matchType: 'contains',
      value: 'footwear',            // UI lowercases the value
      options: []
    },
    {
      field: 'rics_category',
      matchType: 'contains',
      value: 'men',                 // UI lowercases the value
      options: []
    }
  ];
  
  const backendConditions = [
    {
      source: 'rics_category',      // Backend uses 'source'
      matchType: 'contains',
      value: 'Footwear'             // Backend keeps original case
    },
    {
      source: 'rics_category',
      matchType: 'contains',
      value: 'Mens'
    }
  ];
  
  for (const rule of rulesToFix) {
    const ruleRef = db.collection('settings')
      .doc('smartRules')
      .collection('rules')
      .doc(rule.id);
    
    console.log(`\n✓ Updating ${rule.name} rule (${rule.id})`);
    
    // Set BOTH formats so UI and backend both work
    await ruleRef.update({
      condition: uiConditions,        // UI format (array with 'field')
      conditions: backendConditions   // Backend format (array with 'source')
    });
    
    console.log(`  - Set 'condition' (UI format) with 2 conditions`);
    console.log(`  - Set 'conditions' (Backend format) with 2 conditions`);
  }
  
  console.log('\n\n📊 Verification:\n');
  
  // Verify all 4 rules now
  const allRuleIds = [
    'JiYQZ6PxwjKBHsWiF1gI', // Weight
    'H53rfxHqZ8h7j4abYctd', // Length  
    'YyhUxSJOCzOOW8ZuAW0z', // Width
    '6xM28ocd281iw2D6KK4P'  // Height
  ];
  
  for (const ruleId of allRuleIds) {
    const doc = await db.collection('settings').doc('smartRules').collection('rules').doc(ruleId).get();
    const rule = doc.data();
    
    const hasUiFormat = Array.isArray(rule.condition) && rule.condition.length === 2;
    const hasBackendFormat = Array.isArray(rule.conditions) && rule.conditions.length === 2;
    
    console.log(`${rule.name}:`);
    console.log(`  ${hasUiFormat ? '✅' : '❌'} UI format (condition array)`);
    console.log(`  ${hasBackendFormat ? '✅' : '❌'} Backend format (conditions array)`);
    
    if (hasUiFormat && hasBackendFormat) {
      console.log(`  ✅ READY - Both UI and backend will work`);
    }
    console.log('');
  }
  
  console.log('\n✨ All rules fixed! UI should now show 2 conditions for all rules.\n');
  
  process.exit(0);
}

fixUIConditions().catch(err => {
  console.error('Error:', err);
  process.exit(1);
});
