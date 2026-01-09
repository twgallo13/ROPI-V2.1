#!/usr/bin/env node
/**
 * Compute completion for a product using local evaluation
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

async function evaluateProductCompletion(productId) {
  try {
    // Load rules
    console.log('Loading completion rules...');
    const rulesDoc = await db.doc('settings/exportSettings').get();
    const rules = rulesDoc.data().completionRules;
    
    // Load product
    console.log(`Loading product ${productId}...`);
    const productDoc = await db.collection('products').doc(productId).get();
    const product = productDoc.data();
    
    // Load attributes registry from settings/attributes
    console.log('Loading attributes registry...');
    const attrsDoc = await db.doc('settings/attributes').get();
    if (!attrsDoc.exists) {
      throw new Error('settings/attributes document not found');
    }
    const attrsData = attrsDoc.data();
    const attributesRegistry = attrsData || {};
    
    console.log(`\n📊 Product: ${productId}`);
    console.log(`   Total product attributes: ${Object.keys(product.attributes || {}).length}`);
    console.log(`   Total registry attributes: ${Object.keys(attributesRegistry).length}`);
    
    // Evaluate each segment
    const results = {
      productId,
      rulesVersion: rules.rulesVersion,
      segments: []
    };
    
    for (const segment of rules.segments) {
      console.log(`\n🔍 Evaluating segment: ${segment.name} (${segment.id})`);
      
      let requiredAttributes = [];
      let completedAttributes = [];
      
      if (segment.attributeSelector.source === 'REGISTRY') {
        // Find attributes by category
        const categories = segment.attributeSelector.categories || [];
        console.log(`   Looking for categories: ${categories.join(', ')}`);
        
        // Find attributes in registry that match categories
        for (const [attrId, attrData] of Object.entries(attributesRegistry)) {
          const attrCategory = attrData.attributeCategory || attrData.category;
          if (categories.includes(attrCategory)) {
            requiredAttributes.push(attrId);
            
            // Check if product has this attribute
            if (product.attributes && product.attributes[attrId]) {
              completedAttributes.push(attrId);
            }
          }
        }
      } else if (segment.attributeSelector.source === 'STATIC') {
        // Use static attribute IDs
        requiredAttributes = segment.attributeSelector.staticAttributeIds || [];
        console.log(`   Looking for static IDs: ${requiredAttributes.join(', ')}`);
        
        for (const attrId of requiredAttributes) {
          if (product.attributes && product.attributes[attrId]) {
            completedAttributes.push(attrId);
          }
        }
      }
      
      const segmentResult = {
        segmentId: segment.id,
        segmentName: segment.name,
        weightPct: segment.weightPct,
        requiredAttributesCount: requiredAttributes.length,
        completedAttributesCount: completedAttributes.length,
        completionPct: requiredAttributes.length > 0 
          ? Math.round((completedAttributes.length / requiredAttributes.length) * 100)
          : 0,
        requiredAttributes: requiredAttributes.slice(0, 10), // First 10
        completedAttributes
      };
      
      results.segments.push(segmentResult);
      
      console.log(`   Required: ${segmentResult.requiredAttributesCount}`);
      console.log(`   Completed: ${segmentResult.completedAttributesCount}`);
      console.log(`   Completion: ${segmentResult.completionPct}%`);
    }
    
    // Calculate overall completion
    let totalWeightedCompletion = 0;
    let totalWeight = 0;
    
    for (const seg of results.segments) {
      if (seg.weightPct > 0) {
        totalWeightedCompletion += (seg.completionPct / 100) * seg.weightPct;
        totalWeight += seg.weightPct;
      }
    }
    
    results.overallCompletionPct = totalWeight > 0 
      ? Math.round(totalWeightedCompletion)
      : 0;
    
    console.log(`\n📈 Overall Completion: ${results.overallCompletionPct}%`);
    
    // Save results
    const outputPath = path.join(__dirname, `eval_expected_${productId}.json`);
    fs.writeFileSync(outputPath, JSON.stringify(results, null, 2));
    console.log(`\n✅ Saved evaluation to: ${outputPath}`);
    
    process.exit(0);
  } catch (error) {
    console.error('ERROR:', error);
    process.exit(1);
  }
}

const productId = process.argv[2] || '19-test';
evaluateProductCompletion(productId);
