const admin = require('firebase-admin');
const serviceAccount = require('./service-account.json');

admin.initializeApp({
  credential: admin.credential.cert(serviceAccount),
  storageBucket: 'gs://stage-homer-ropi-2-1.firebasestorage.app'
});

const db = admin.firestore();

async function inspectRules() {
  console.log('\n🔍 Inspecting Rule Data Structure\n');
  
  const ruleIds = [
    'JiYQZ6PxwjKBHsWiF1gI', // Weight
    'H53rfxHqZ8h7j4abYctd', // Length  
    'YyhUxSJOCzOOW8ZuAW0z', // Width
    '6xM28ocd281iw2D6KK4P'  // Height (working one)
  ];
  
  for (const ruleId of ruleIds) {
    const doc = await db.collection('settings').doc('smartRules').collection('rules').doc(ruleId).get();
    const rule = doc.data();
    
    console.log(`\n${'='.repeat(60)}`);
    console.log(`Rule: ${rule.name} (${ruleId})`);
    console.log(`${'='.repeat(60)}\n`);
    
    console.log('Full Firestore Data:');
    console.log(JSON.stringify(rule, null, 2));
    
    console.log('\n\nKey Fields:');
    console.log(`  condition (singular): ${rule.condition ? JSON.stringify(rule.condition) : 'NOT SET'}`);
    console.log(`  conditions (array): ${rule.conditions ? JSON.stringify(rule.conditions) : 'NOT SET'}`);
  }
  
  process.exit(0);
}

inspectRules().catch(err => {
  console.error('Error:', err);
  process.exit(1);
});
