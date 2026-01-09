const admin = require('firebase-admin');

try {
  admin.initializeApp();
} catch(e) {}

const db = admin.firestore();

async function updateSegmentNames() {
  try {
    console.log('📝 Updating segment names...');
    
    const settingsRef = db.collection('settings').doc('exportSettings');
    const snapshot = await settingsRef.get();
    const data = snapshot.data();
    
    const completionRules = data.completionRules;
    
    // Update segment names
    const updatedSegments = completionRules.segments.map(seg => {
      if (seg.id === 'materials-fit') {
        return { ...seg, name: 'Technical', description: 'Technical specifications' };
      }
      if (seg.id === 'demographics-color') {
        return { ...seg, name: 'AI Describe', description: 'AI-describable attributes' };
      }
      if (seg.id === 'classification') {
        return { ...seg, name: 'Attribute Details', description: 'Product classification details' };
      }
      return seg;
    });
    
    const updated = {
      ...completionRules,
      segments: updatedSegments,
      updatedAt: new Date().toISOString(),
      updatedBy: 'system:rename-segments'
    };
    
    console.log('\n📊 Updated Segment Names:');
    updated.segments.forEach(seg => {
      console.log(`  ${seg.id}: "${seg.name}"`);
    });
    
    await settingsRef.update({
      'completionRules': updated
    });
    
    console.log('\n✅ Successfully updated segment names');
    process.exit(0);
  } catch (error) {
    console.error('❌ Error:', error.message);
    process.exit(1);
  }
}

updateSegmentNames();
