const admin = require('firebase-admin');
const serviceAccount = require('./service-account.json');

admin.initializeApp({
  credential: admin.credential.cert(serviceAccount),
  storageBucket: 'gs://stage-homer-ropi-2-1.firebasestorage.app'
});

const db = admin.firestore();

async function checkRuleFormats() {
  console.log('\n🔍 Checking Rule Format in Firestore\n');
  
  const ruleIds = [
    { id: 'JiYQZ6PxwjKBHsWiF1gI', name: 'Weight' },
    { id: 'H53rfxHqZ8h7j4abYctd', name: 'Length' },
    { id: 'YyhUxSJOCzOOW8ZuAW0z', name: 'Width' },
    { id: '6xM28ocd281iw2D6KK4P', name: 'Height' }
  ];
  
  for (const rule of ruleIds) {
    const doc = await db.collection('settings').doc('smartRules').collection('rules').doc(rule.id).get();
    const data = doc.data();
    
    console.log(`\n${rule.name}:`);
    console.log(`  condition (UI format):`);
    if (Array.isArray(data.condition)) {
      console.log(`    - Array with ${data.condition.length} items`);
      console.log(`    - First item: ${JSON.stringify(data.condition[0])}`);
    } else if (typeof data.condition === 'object') {
      console.log(`    - Single object: ${JSON.stringify(data.condition)}`);
    } else {
      console.log(`    - NOT SET`);
    }
    
    console.log(`  conditions (Backend format):`);
    if (Array.isArray(data.conditions)) {
      console.log(`    - Array with ${data.conditions.length} items`);
      console.log(`    - First item: ${JSON.stringify(data.conditions[0])}`);
    } else {
      console.log(`    - NOT SET`);
    }
  }
  
  process.exit(0);
}

checkRuleFormats().catch(err => {
  console.error('Error:', err);
  process.exit(1);
});
