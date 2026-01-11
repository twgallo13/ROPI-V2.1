/**
 * Fix Segment Names - Ensure all segments have proper names
 * 
 * This script checks and fixes segment names in the completion rules configuration.
 * - Segments with empty/missing names get auto-generated "Segment N" names
 * - Preserves existing custom names
 */

const admin = require('firebase-admin');
const serviceAccount = require('./service-account.json');

// Initialize Firebase Admin
if (!admin.apps.length) {
  admin.initializeApp({ credential: admin.credential.cert(serviceAccount) });
}
const db = admin.firestore();

async function fixSegmentNames() {
  try {
    console.log('🔍 Fetching completion rules...');
    const settingsRef = db.doc('settings/exportSettings');
    const snapshot = await settingsRef.get();
    
    if (!snapshot.exists) {
      console.error('❌ settings/exportSettings not found');
      process.exit(1);
    }
    
    const data = snapshot.data();
    const rules = data.completionRules;
    
    console.log(`\n📋 Current segments (${rules.segments.length}):`);
    rules.segments.forEach((seg, idx) => {
      console.log(`  ${idx + 1}. ID: "${seg.id}", Name: "${seg.name || '(EMPTY)'}"`);
    });
    
    // Check for segments with missing/empty names
    let needsFix = false;
    const updatedSegments = rules.segments.map((seg, idx) => {
      if (!seg.name || seg.name.trim() === '') {
        needsFix = true;
        const newName = `Segment ${idx + 1}`;
        console.log(`\n🔧 Fixing segment "${seg.id}": "" → "${newName}"`);
        return { ...seg, name: newName };
      }
      return seg;
    });
    
    if (!needsFix) {
      console.log('\n✅ All segments have names - no fix needed');
      process.exit(0);
    }
    
    // Update the rules
    const updatedRules = {
      ...rules,
      segments: updatedSegments,
      rulesVersion: rules.rulesVersion + 1,
      updatedAt: new Date().toISOString(),
      updatedBy: 'admin-script-fix-segment-names'
    };
    
    console.log('\n💾 Saving updated rules...');
    await settingsRef.update({
      completionRules: updatedRules
    });
    
    console.log('\n✅ Segment names fixed successfully!');
    console.log(`   rulesVersion: ${rules.rulesVersion} → ${updatedRules.rulesVersion}`);
    
    console.log('\n📋 Updated segments:');
    updatedSegments.forEach((seg, idx) => {
      console.log(`  ${idx + 1}. ID: "${seg.id}", Name: "${seg.name}"`);
    });
    
    process.exit(0);
  } catch (error) {
    console.error('❌ Error:', error);
    process.exit(1);
  }
}

fixSegmentNames();
