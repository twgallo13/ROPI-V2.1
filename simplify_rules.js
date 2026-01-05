const admin = require('firebase-admin');
const serviceAccount = require('./service-account.json');

admin.initializeApp({
  credential: admin.credential.cert(serviceAccount),
  storageBucket: 'gs://stage-homer-ropi-2-1.firebasestorage.app'
});

const db = admin.firestore();

async function fixRulesToSimpleFormat() {
  console.log('\n🔧 Converting rules to simple single-condition format\n');
  
  const ruleIds = [
    { id: 'JiYQZ6PxwjKBHsWiF1gI', name: 'Weight' },
    { id: 'H53rfxHqZ8h7j4abYctd', name: 'Length' },
    { id: 'YyhUxSJOCzOOW8ZuAW0z', name: 'Width' },
    { id: '6xM28ocd281iw2D6KK4P', name: 'Height' }
  ];
  
  // For now, use an AND condition that checks both "Footwear" and "Mens"
  // This is simpler than multiple conditions
  const andCondition = {
    matchType: 'and',
    value: [
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
    ]
  };
  
  for (const rule of ruleIds) {
    const ruleRef = db.collection('settings')
      .doc('smartRules')
      .collection('rules')
      .doc(rule.id);
    
    console.log(`\nUpdating ${rule.name}:`);
    
    await ruleRef.update({
      condition: andCondition,                                    // Single AND condition
      conditions: admin.firestore.FieldValue.delete()            // Remove conditions array
    });
    
    console.log(`  ✓ Set single AND condition`);
    console.log(`  ✓ Deleted conditions array`);
  }
  
  console.log('\n✨ All rules converted to simple format!\n');
  process.exit(0);
}

fixRulesToSimpleFormat().catch(err => {
  console.error('Error:', err);
  process.exit(1);
});
