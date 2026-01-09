#!/usr/bin/env node
/**
 * Fetch attributes registry from correct location: settings/attributes/keys
 */

const admin = require('firebase-admin');
const fs = require('fs');
const path = require('path');

// Reuse existing Firebase Admin instance or initialize if needed
if (!admin.apps.length) {
  const serviceAccount = require('../../../service-account.json');
  admin.initializeApp({
    credential: admin.credential.cert(serviceAccount),
    projectId: 'ropi-bccee'
  });
}

const db = admin.firestore();

async function fetchAttributesRegistry() {
  try {
    console.log('Fetching settings/attributes...');
    const docRef = db.doc('settings/attributes');
    const snapshot = await docRef.get();
    
    if (!snapshot.exists) {
      console.error('ERROR: settings/attributes document not found');
      process.exit(1);
    }
    
    const data = snapshot.data();
    const keys = data.keys || {};
    
    console.log(`Found ${Object.keys(keys).length} attributes in registry`);
    
    // Convert to array format
    const attributes = Object.entries(keys).map(([id, attrData]) => ({
      id,
      name: attrData.name || id,
      displayName: attrData.displayName,
      attributeCategory: attrData.attributeCategory || attrData.category,
      required: attrData.required,
      completionRequired: attrData.completionRequired,
      dataType: attrData.dataType
    }));
    
    // Save full registry
    const outputPath = path.join(__dirname, 'attributes_registry.json');
    fs.writeFileSync(outputPath, JSON.stringify(attributes, null, 2));
    console.log(`✅ Saved to: ${outputPath}`);
    
    // Group by category
    const byCategory = {};
    attributes.forEach(attr => {
      const cat = attr.attributeCategory || 'uncategorized';
      if (!byCategory[cat]) byCategory[cat] = [];
      byCategory[cat].push(attr.name || attr.id);
    });
    
    console.log('\n📋 Attributes by category:');
    Object.entries(byCategory).sort().forEach(([cat, attrs]) => {
      console.log(`  ${cat} (${attrs.length}): ${attrs.slice(0, 5).join(', ')}${attrs.length > 5 ? '...' : ''}`);
    });
    
    process.exit(0);
  } catch (error) {
    console.error('ERROR:', error);
    process.exit(1);
  }
}

fetchAttributesRegistry();
