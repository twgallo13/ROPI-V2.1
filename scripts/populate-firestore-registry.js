/**
 * Populate Firestore settings/attributes/keys with attribute registry
 * 
 * LP-phase2b-003: Initial Firestore registry population
 * 
 * Usage: node populate-firestore-registry.js
 */

const admin = require('firebase-admin');
const fs = require('fs');
const path = require('path');

// Initialize Firebase Admin
const serviceAccount = require('../service-account.json');
admin.initializeApp({
  credential: admin.credential.cert(serviceAccount)
});

const db = admin.firestore();

async function populateRegistry() {
  console.log('🔄 Loading attribute registry from SDK...');
  
  const registryPath = path.resolve(__dirname, '../packages/sdk/config/attributeRegistry.json');
  const registryData = JSON.parse(fs.readFileSync(registryPath, 'utf8'));
  
  console.log(`📦 Found ${registryData.attributes.length} attributes in registry (version: ${registryData.version})`);
  
  const batch = db.batch();
  const collectionPath = 'settings/attributes/keys';
  let count = 0;
  
  for (const attr of registryData.attributes) {
    const docRef = db.collection(collectionPath).doc(attr.attribute_id);
    
    // Transform SDK format to Firestore format
    const firestoreDoc = {
      label: attr.label,
      category: attr.category || 'general',
      dataType: attr.data_type || 'string',
      required: attr.required_for_completion === true,
      required_for_completion: attr.required_for_completion === true,
      required_for_export: attr.required_for_export === true,
      requiredForExport: attr.required_for_export === true,
      export: attr.exportable !== false,
      exportable: attr.exportable !== false,
      internalOnly: attr.internalOnly === true,
      systemFlag: attr.internalOnly === true,
      // Preserve additional fields
      external_header: attr.external_header,
      import_required: attr.import_required,
      ai_usage_notes: attr.ai_usage_notes,
      status: attr.status || 'active',
      // Metadata
      updatedAt: admin.firestore.FieldValue.serverTimestamp(),
      updatedBy: 'system',
      version: registryData.version
    };
    
    // Remove undefined fields
    Object.keys(firestoreDoc).forEach(key => {
      if (firestoreDoc[key] === undefined) {
        delete firestoreDoc[key];
      }
    });
    
    batch.set(docRef, firestoreDoc, { merge: true });
    count++;
    
    // Commit every 500 docs (Firestore batch limit)
    if (count % 500 === 0) {
      console.log(`  Committing batch (${count} attributes)...`);
      await batch.commit();
    }
  }
  
  // Commit remaining
  if (count % 500 !== 0) {
    console.log(`  Committing final batch (${count} attributes)...`);
    await batch.commit();
  }
  
  console.log(`✅ Successfully populated ${count} attributes to ${collectionPath}`);
  
  // Verify
  const snapshot = await db.collection(collectionPath).limit(3).get();
  console.log(`\n📊 Sample documents (first 3):`);
  snapshot.docs.forEach(doc => {
    console.log(`  - ${doc.id}: ${doc.data().label} (${doc.data().category})`);
  });
  
  return count;
}

// Run
populateRegistry()
  .then(count => {
    console.log(`\n🎉 Registry population complete: ${count} attributes`);
    process.exit(0);
  })
  .catch(error => {
    console.error('❌ Error populating registry:', error);
    process.exit(1);
  });
