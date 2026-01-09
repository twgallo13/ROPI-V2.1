const admin = require('firebase-admin');

try {
  admin.initializeApp();
} catch(e) {
  // Already initialized
}

const db = admin.firestore();

async function fixCompletionRulesSchema() {
  try {
    console.log('📝 Fixing completion rules schema...');
    
    const settingsRef = db.collection('settings').doc('exportSettings');
    const snapshot = await settingsRef.get();
    const data = snapshot.data();
    
    const completionRules = data.completionRules;
    
    // Add missing required fields
    const fixed = {
      ...completionRules,
      schemaVersion: '1.0.0',
      updatedAt: new Date().toISOString(),
      updatedBy: 'system:schema-fix',
      builtInSegments: completionRules.builtInSegments || {},
      exclusions: completionRules.exclusions || {
        media: {
          affectsCompletion: false,
          reason: 'Media/images not required for product completion'
        },
        pricing: {
          affectsCompletion: false,
          reason: 'Pricing not required for product completion'
        }
      }
    };
    
    console.log('\n✅ Fixed schema structure:');
    console.log('   schemaVersion:', fixed.schemaVersion);
    console.log('   rulesVersion:', fixed.rulesVersion);
    console.log('   updatedAt:', fixed.updatedAt);
    console.log('   updatedBy:', fixed.updatedBy);
    console.log('   segments:', fixed.segments.length);
    console.log('   builtInSegments:', Object.keys(fixed.builtInSegments).length, 'entries');
    console.log('   exclusions: media, pricing');
    
    // Update Firestore
    console.log('\n✏️ Updating Firestore...');
    await settingsRef.update({
      'completionRules': fixed
    });
    
    console.log('✅ Successfully fixed completion rules schema');
    process.exit(0);
  } catch (error) {
    console.error('❌ Error:', error.message);
    process.exit(1);
  }
}

fixCompletionRulesSchema();
