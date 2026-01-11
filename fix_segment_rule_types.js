const admin = require('firebase-admin');
const serviceAccount = require('./service-account.json');

if (!admin.apps.length) {
  admin.initializeApp({ credential: admin.credential.cert(serviceAccount) });
}
const db = admin.firestore();

async function fixSegmentRuleTypes() {
  try {
    console.log('🔧 Fixing segment rule types...\n');
    
    const settingsRef = db.doc('settings/exportSettings');
    const snapshot = await settingsRef.get();
    
    if (!snapshot.exists) {
      console.error('❌ settings/exportSettings not found');
      process.exit(1);
    }
    
    const data = snapshot.data();
    const rules = data.completionRules;
    
    console.log('BEFORE:');
    rules.segments.forEach(seg => {
      console.log(`  ${seg.name}: ${seg.ruleType}`);
    });
    
    // Change Product Core and Taxonomy to ANY_REQUIRED for proportional scoring
    const updatedSegments = rules.segments.map(seg => {
      if (seg.id === 'core-identifiers' || seg.id === 'classification') {
        console.log(`\n🔄 Changing ${seg.name} from ${seg.ruleType} → ANY_REQUIRED`);
        return { ...seg, ruleType: 'ANY_REQUIRED' };
      }
      return seg;
    });
    
    const updatedRules = {
      ...rules,
      segments: updatedSegments,
      rulesVersion: rules.rulesVersion + 1,
      updatedAt: new Date().toISOString(),
      updatedBy: 'admin-script-fix-rule-types'
    };
    
    console.log('\n💾 Saving updated rules...');
    await settingsRef.update({
      completionRules: updatedRules
    });
    
    console.log('\n✅ Rule types fixed!');
    console.log(`   rulesVersion: ${rules.rulesVersion} → ${updatedRules.rulesVersion}\n`);
    
    console.log('AFTER:');
    updatedSegments.forEach(seg => {
      console.log(`  ${seg.name}: ${seg.ruleType}`);
    });
    
    process.exit(0);
  } catch (error) {
    console.error('❌ Error:', error);
    process.exit(1);
  }
}

fixSegmentRuleTypes();
