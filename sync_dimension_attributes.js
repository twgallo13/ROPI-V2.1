const admin = require('firebase-admin');
const fs = require('fs');
const path = require('path');

// Initialize Firebase Admin
admin.initializeApp();
const db = admin.firestore();

async function syncDimensionAttributes() {
  try {
    console.log('Loading attribute registry from JSON...');
    const registryPath = path.join(__dirname, 'packages/sdk/config/attributeRegistry.json');
    const registry = JSON.parse(fs.readFileSync(registryPath, 'utf8'));
    
    const dimensionAttrs = ['height', 'length', 'width', 'weight'];
    const batch = db.batch();
    let updateCount = 0;
    
    for (const attrId of dimensionAttrs) {
      const attr = registry.attributes.find(a => a.attribute_id === attrId);
      
      if (!attr) {
        console.log(`⚠️  Attribute ${attrId} not found in registry`);
        continue;
      }
      
      console.log(`\n📝 ${attrId}:`);
      console.log(`   required_for_completion: ${attr.required_for_completion}`);
      console.log(`   category: ${attr.category}`);
      console.log(`   internalOnly: ${attr.internalOnly}`);
      
      const docRef = db.collection('settings').doc('attributes').collection('keys').doc(attrId);
      
      batch.set(docRef, {
        ...attr,
        required: attr.required_for_completion || false,
        required_for_completion: attr.required_for_completion || false,
        lastModified: admin.firestore.FieldValue.serverTimestamp(),
        syncedFrom: 'attributeRegistry.json',
        syncedAt: new Date().toISOString()
      }, { merge: true });
      
      updateCount++;
    }
    
    if (updateCount > 0) {
      console.log(`\n🔄 Committing ${updateCount} attribute updates...`);
      await batch.commit();
      console.log('✅ Successfully synced dimension attributes to Firestore!');
    } else {
      console.log('\n❌ No attributes to update');
    }
    
  } catch (error) {
    console.error('❌ Error:', error.message);
    console.error(error);
    process.exit(1);
  }
  
  process.exit(0);
}

syncDimensionAttributes();
