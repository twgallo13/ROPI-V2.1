const admin = require('firebase-admin');
const serviceAccount = require('./service-account.json');

if (!admin.apps.length) {
  admin.initializeApp({ credential: admin.credential.cert(serviceAccount) });
}
const db = admin.firestore();

async function checkSegments() {
  const settingsRef = db.doc('settings/exportSettings');
  const snapshot = await settingsRef.get();
  
  if (!snapshot.exists) {
    console.error('No settings found');
    return;
  }
  
  const data = snapshot.data();
  const rules = data.completionRules;
  
  console.log('=== ALL SEGMENTS ===\n');
  console.log('Total segments:', rules.segments.length);
  
  rules.segments.forEach((seg, idx) => {
    console.log(`\n${idx + 1}. Segment:`);
    console.log(`   ID: "${seg.id}"`);
    console.log(`   Name: "${seg.name}"`);
    console.log(`   Enabled: ${seg.enabled}`);
    console.log(`   Weight: ${seg.weightPct}%`);
    console.log(`   Site-aware: ${seg.attributeSelector.siteAware}`);
  });
  
  console.log('\n=== BUILT-IN SEGMENTS ===\n');
  console.log(JSON.stringify(rules.builtInSegments, null, 2));
  
  process.exit(0);
}

checkSegments().catch(console.error);
