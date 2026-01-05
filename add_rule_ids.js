const admin = require('firebase-admin');
const serviceAccount = require('./service-account.json');

admin.initializeApp({
  credential: admin.credential.cert(serviceAccount),
  storageBucket: 'gs://stage-homer-ropi-2-1.firebasestorage.app'
});

const db = admin.firestore();

async function addRuleIds() {
  console.log('\n🔧 Adding ruleId to shipping dimension rules\n');
  
  const ruleIds = [
    'JiYQZ6PxwjKBHsWiF1gI', // Weight
    'H53rfxHqZ8h7j4abYctd', // Length
    'YyhUxSJOCzOOW8ZuAW0z', // Width
    '6xM28ocd281iw2D6KK4P'  // Height
  ];
  
  for (const docId of ruleIds) {
    const ruleRef = db.collection('settings')
      .doc('smartRules')
      .collection('rules')
      .doc(docId);
    
    const doc = await ruleRef.get();
    const rule = doc.data();
    
    console.log(`\n✓ ${rule.name} (${docId})`);
    
    // Add ruleId if missing
    if (!rule.ruleId) {
      await ruleRef.update({
        ruleId: docId
      });
      console.log(`  - Added ruleId: ${docId}`);
    } else {
      console.log(`  - Already has ruleId: ${rule.ruleId}`);
    }
  }
  
  console.log('\n✨ Done!\n');
  process.exit(0);
}

addRuleIds().catch(err => {
  console.error('Error:', err);
  process.exit(1);
});
