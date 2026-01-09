#!/usr/bin/env node
/**
 * Fetch attributes registry
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
    console.log('Fetching attributes registry...');
    const snapshot = await db.collection('attributes').get();
    
    const attributes = [];
    snapshot.forEach(doc => {
      const data = doc.data();
      attributes.push({
        id: doc.id,
        name: data.name,
        displayName: data.displayName,
        attributeCategory: data.attributeCategory || data.category,
        required: data.required,
        completionRequired: data.completionRequired,
        dataType: data.dataType
      });
    });
    
    console.log(`Found ${attributes.length} attributes`);
    
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
      console.log(`  ${cat}: ${attrs.join(', ')}`);
    });
    
    process.exit(0);
  } catch (error) {
    console.error('ERROR:', error);
    process.exit(1);
  }
}

fetchAttributesRegistry();
