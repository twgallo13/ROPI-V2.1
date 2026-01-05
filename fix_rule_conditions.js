const admin = require('firebase-admin');

admin.initializeApp();
const db = admin.firestore();

async function fixRules() {
  console.log('\n🔧 FIXING SMART RULES - Removing Invalid "condition" Field\n');
  
  const ruleIds = [
    'JiYQZ6PxwjKBHsWiF1gI', // weight
    'H53rfxHqZ8h7j4abYctd', // length
    'YyhUxSJOCzOOW8ZuAW0z', // width
    '6xM28ocd281iw2D6KK4P', // height
  ];
  
  for (const ruleId of ruleIds) {
    const ruleRef = db.collection('settings/smartRules/rules').doc(ruleId);
    const ruleDoc = await ruleRef.get();
    
    if (!ruleDoc.exists) {
      console.log(`❌ Rule ${ruleId} not found`);
      continue;
    }
    
    const rule = ruleDoc.data();
    
    // Remove the malformed "condition" field since we have "conditions" array
    const updates = {
      condition: admin.firestore.FieldValue.delete(),
    };
    
    await ruleRef.update(updates);
    
    console.log(`✅ Fixed: ${rule.name}`);
    console.log(`   Removed invalid "condition" field`);
    console.log(`   Keeping valid "conditions" array with 2 conditions`);
    console.log('');
  }
  
  console.log('✅ All 4 rules fixed!\n');
  console.log('🚀 Now trigger Smart Rules on product 20-test to test');
  console.log('   You can use the Product Editor UI to manually trigger rules');
  console.log('   Or run a new import with the test CSV');
}

fixRules().then(() => process.exit(0)).catch(console.error);
