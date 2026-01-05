const admin = require('firebase-admin');
const serviceAccount = require('./service-account.json');

admin.initializeApp({
  credential: admin.credential.cert(serviceAccount),
  storageBucket: 'gs://stage-homer-ropi-2-1.firebasestorage.app'
});

const db = admin.firestore();

async function listAllRules() {
  console.log('\n📋 All Smart Rules in Firestore\n');
  
  const snapshot = await db.collection('settings')
    .doc('smartRules')
    .collection('rules')
    .where('enabled', '==', true)
    .get();
  
  console.log(`Found ${snapshot.docs.length} enabled rules:\n`);
  
  snapshot.docs.forEach(doc => {
    const rule = doc.data();
    console.log(`✓ ${rule.name}`);
    console.log(`  ID: ${doc.id}`);
    console.log(`  Target: ${rule.action?.targetField || 'N/A'}`);
    console.log(`  Conditions: ${rule.conditions ? Array.isArray(rule.conditions) ? rule.conditions.length : 'single' : 'NONE'}`);
    console.log(`  Action: ${rule.action?.valueTemplate || 'N/A'}`);
    console.log('');
  });
  
  process.exit(0);
}

listAllRules().catch(err => {
  console.error('Error:', err);
  process.exit(1);
});
