#!/usr/bin/env node
/**
 * Extract list of required attributes for Core segment based on rules
 */

const admin = require('firebase-admin');
const fs = require('fs');
const path = require('path');

if (!admin.apps.length) {
  const serviceAccount = require('../../../service-account.json');
  admin.initializeApp({
    credential: admin.credential.cert(serviceAccount),
    projectId: 'ropi-bccee'
  });
}

const db = admin.firestore();

async function extractCoreRequiredAttributes() {
  try {
    // Load rules
    const rulesDoc = await db.doc('settings/exportSettings').get();
    const rules = rulesDoc.data().completionRules;
    
    // Load attributes registry
    const attrsDoc = await db.doc('settings/attributes').get();
    const registry = attrsDoc.data();
    
    // Find Core segment
    const coreSegment = rules.segments.find(s => 
      s.name === 'Core Product Attributes' || s.id === 'core-attributes'
    );
    
    if (!coreSegment) {
      throw new Error('Core segment not found');
    }
    
    console.log(`Core segment: ${coreSegment.name} (${coreSegment.id})`);
    console.log(`Selector: ${coreSegment.attributeSelector.source}`);
    console.log(`Categories: ${coreSegment.attributeSelector.categories.join(', ')}`);
    
    // Find all attributes matching the selector
    const requiredAttrs = [];
    const categories = coreSegment.attributeSelector.categories || [];
    const requirementFlag = coreSegment.attributeSelector.requirementFlag || 'required_for_completion';
    
    for (const [attrId, attrData] of Object.entries(registry)) {
      const attrCategory = attrData.attributeCategory || attrData.category;
      
      // Check if attribute matches category
      if (categories.includes(attrCategory)) {
        // Check if it has the requirement flag (if specified)
        const isRequired = attrData[requirementFlag] === true || 
                          attrData.required_for_completion === true ||
                          attrData.required === true;
        
        requiredAttrs.push({
          id: attrId,
          name: attrData.name || attrId,
          category: attrCategory,
          required: isRequired,
          dataType: attrData.data_type || attrData.dataType
        });
      }
    }
    
    console.log(`\nFound ${requiredAttrs.length} attributes in Core categories`);
    
    // Save full list
    const outputPath = path.join(__dirname, 'core_attributes_full.json');
    fs.writeFileSync(outputPath, JSON.stringify(requiredAttrs, null, 2));
    console.log(`Saved full list: ${outputPath}`);
    
    // Save just IDs for easy reference
    const idsPath = path.join(__dirname, 'core_required_attributes.txt');
    fs.writeFileSync(idsPath, requiredAttrs.map(a => a.id).join('\n'));
    console.log(`Saved IDs list: ${idsPath}`);
    
    // Print summary
    console.log('\nRequired Core Attributes:');
    requiredAttrs.forEach(attr => {
      console.log(`  ${attr.id} (${attr.category}) - ${attr.dataType || 'unknown'} ${attr.required ? '[REQUIRED]' : ''}`);
    });
    
    process.exit(0);
  } catch (error) {
    console.error('ERROR:', error);
    process.exit(1);
  }
}

extractCoreRequiredAttributes();
