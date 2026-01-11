const admin = require('firebase-admin');
const serviceAccount = require('./service-account.json');

if (!admin.apps.length) {
  admin.initializeApp({ credential: admin.credential.cert(serviceAccount) });
}
const db = admin.firestore();

async function checkSegmentTypes() {
  const settingsRef = db.doc('settings/exportSettings');
  const snapshot = await settingsRef.get();
  
  const data = snapshot.data();
  const rules = data.completionRules;
  
  console.log('=== SEGMENT RULE TYPES ===\n');
  rules.segments.forEach(seg => {
    console.log(`${seg.name} (${seg.id}):`);
    console.log(`  Rule Type: ${seg.ruleType}`);
    console.log(`  Weight: ${seg.weightPct}%`);
    console.log(`  Enabled: ${seg.enabled}`);
    console.log('');
  });
  
  process.exit(0);
}

checkSegmentTypes().catch(console.error);
