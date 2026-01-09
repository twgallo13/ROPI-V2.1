const admin = require('firebase-admin');

try {
  admin.initializeApp();
} catch(e) {
  // Already initialized
}

const db = admin.firestore();

async function fixCompletionRules() {
  try {
    console.log('📝 Fetching current rules...');
    const settingsRef = db.collection('settings').doc('exportSettings');
    const snapshot = await settingsRef.get();
    const data = snapshot.data();
    
    console.log('Current rulesVersion:', data.completionRules.rulesVersion);
    
    // Load the attribute registry to find the correct categories
    const registry = require('./packages/sdk/config/attributeRegistry.json');
    
    // Find all attributes with required_for_completion = true and group by category
    const categoriesNeeded = {};
    registry.attributes.forEach(attr => {
      if (attr.required_for_completion) {
        if (!categoriesNeeded[attr.category]) {
          categoriesNeeded[attr.category] = [];
        }
        categoriesNeeded[attr.category].push(attr.attribute_id);
      }
    });
    
    console.log('\nAttributesrequired_for_completion by category:');
    Object.entries(categoriesNeeded).forEach(([cat, ids]) => {
      console.log(`  ${cat}: ${ids.length} attrs`);
    });
    
    // Updated rules with correct categories
    const newRules = {
      ...data.completionRules,
      rulesVersion: 6,
      segments: [
        {
          id: 'core-attributes',
          name: 'Core Product Attributes',
          description: 'Core SKU and classification attributes',
          enabled: true,
          weightPct: 25,
          ruleType: 'ALL_REQUIRED',
          appliesTo: {
            mode: 'ALL_PRODUCTS',
            sites: []
          },
          attributeSelector: {
            source: 'REGISTRY',
            categories: ['sku_core', 'classification'],
            requirementFlag: 'required_for_completion',
            siteAware: false,
            includeInternalOnly: true,
            excludeAttributeIds: [],
            staticAttributeIds: []
          }
        },
        {
          id: 'seo-attributes',
          name: 'SEO & Marketing',
          description: 'SEO and marketing attributes',
          enabled: true,
          weightPct: 25,
          ruleType: 'ALL_REQUIRED',
          appliesTo: {
            mode: 'ALL_PRODUCTS',
            sites: []
          },
          attributeSelector: {
            source: 'REGISTRY',
            categories: ['seo'],  // Fixed: was 'description'
            requirementFlag: 'required_for_completion',
            siteAware: false,
            includeInternalOnly: false,
            excludeAttributeIds: [],
            staticAttributeIds: []
          }
        },
        {
          id: 'media-attributes',
          name: 'Media & Images',
          description: 'Product images and media',
          enabled: true,
          weightPct: 25,
          ruleType: 'ANY_REQUIRED',
          appliesTo: {
            mode: 'ALL_PRODUCTS',
            sites: []
          },
          attributeSelector: {
            source: 'REGISTRY',
            categories: ['launch_media'],  // Fixed: was 'media'
            requirementFlag: 'required_for_completion',
            siteAware: false,
            includeInternalOnly: false,
            excludeAttributeIds: [],
            staticAttributeIds: []
          }
        },
        {
          id: 'technical-attributes',
          name: 'Technical Specifications',
          description: 'Technical and materials attributes',
          enabled: true,
          weightPct: 25,
          ruleType: 'ANY_REQUIRED',
          appliesTo: {
            mode: 'ALL_PRODUCTS',
            sites: []
          },
          attributeSelector: {
            source: 'REGISTRY',
            categories: ['materials_construction', 'material_design', 'material_performance', 'measurements', 'dimensions'],
            requirementFlag: 'required_for_completion',
            siteAware: false,
            includeInternalOnly: false,
            excludeAttributeIds: [],
            staticAttributeIds: []
          }
        }
      ]
    };
    
    console.log('\n📊 New configuration:');
    console.log('New rulesVersion:', newRules.rulesVersion);
    newRules.segments.forEach(seg => {
      console.log(`\n${seg.id}:`);
      console.log(`  Weight: ${seg.weightPct}%`);
      console.log(`  Categories: ${seg.attributeSelector.categories.join(', ')}`);
      console.log(`  Rule type: ${seg.ruleType}`);
    });
    
    // Update Firestore
    console.log('\n✏️ Updating Firestore...');
    await settingsRef.update({
      'completionRules': newRules,
      'updatedAt': new Date().toISOString()
    });
    
    console.log('✅ Successfully updated Firestore with corrected categories (rulesVersion 6)');
    process.exit(0);
  } catch (error) {
    console.error('❌ Error:', error.message);
    process.exit(1);
  }
}

fixCompletionRules();
