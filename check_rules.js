const admin = require('firebase-admin');
const serviceAccount = require('./service-account.json');

if (!admin.apps.length) {
  admin.initializeApp({ credential: admin.credential.cert(serviceAccount) });
}
const db = admin.firestore();

async function checkRules() {
  console.log('=== CHECKING SPECIFIC SMART RULES ===\n');
  
  // Check specific rule IDs from the products
  const ruleIds = ['rule_1767353025831_ap2zq7', 'rule_1767350520854_xpfska', 'rule_1767344587339_38yo9y'];
  
  for (const ruleId of ruleIds) {
    const doc = await db.collection('smart_rules').doc(ruleId).get();
    if (doc.exists) {
      const rule = doc.data();
      console.log('✅ Rule:', rule.name);
      console.log('   ID:', ruleId);
      console.log('   Enabled:', rule.enabled);
      console.log('   Target:', rule.action.targetField);
      console.log('   Template:', rule.action.valueTemplate);
      console.log('');
    } else {
      console.log('❌ Rule', ruleId, 'NOT FOUND\n');
    }
  }
}

checkRules().then(() => process.exit(0)).catch(console.error);
