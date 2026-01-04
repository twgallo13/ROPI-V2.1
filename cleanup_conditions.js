const admin = require('firebase-admin');
const serviceAccount = require('./service-account.json');

admin.initializeApp({
  credential: admin.credential.cert(serviceAccount),
  storageBucket: 'gs://stage-homer-ropi-2-1.firebasestorage.app'
});

const db = admin.firestore();

async function removeUIConditions() {
  console.log('\n🧹 Removing UI format conditions\n');
  
  const ruleIds = [
    'JiYQZ6PxwjKBHsWiF1gI', // Weight
    'H53rfxHqZ8h7j4abYctd', // Length  
    'YyhUxSJOCzOOW8ZuAW0z', // Width
    '6xM28ocd281iw2D6KK4P'  // Height
  ];
  
  for (const ruleId of ruleIds) {
    const ruleRef = db.collection('settings')
      .doc('smartRules')
      .collection('rules')
      .doc(ruleId);
    
    const doc = await ruleRef.get();
    const rule = doc.data();
    
    console.log(`\n✓ ${rule.name}`);
    
    // Delete the UI format 'condition' field
    await ruleRef.update({
      condition: admin.firestore.FieldValue.delete()
    });
    
    console.log(`  - Removed 'condition' field`);
    console.log(`  - Keeping 'conditions' field for backend`);
  }
  
  console.log('\n✨ Cleanup complete!\n');
  process.exit(0);
}

removeUIConditions().catch(err => {
  console.error('Error:', err);
  process.exit(1);
});
