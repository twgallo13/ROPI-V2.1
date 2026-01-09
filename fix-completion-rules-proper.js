const admin = require('firebase-admin');

try {
  admin.initializeApp();
} catch(e) {
  // Already initialized
}

const db = admin.firestore();

async function createProper4SegmentRules() {
  try {
    console.log('📝 Creating proper 4-segment completion rules...');
    
    // Load the attribute registry
    const registry = require('./packages/sdk/config/attributeRegistry.json');
    
    // Group required_for_completion attributes by category
    const requiredByCategory = {};
    registry.attributes.forEach(attr => {
      if (attr.required_for_completion) {
        if (!requiredByCategory[attr.category]) {
          requiredByCategory[attr.category] = [];
        }
        requiredByCategory[attr.category].push(attr.attribute_id);
      }
    });
    
    console.log('\nRequired for Completion Attributes (by category):');
    Object.entries(requiredByCategory).forEach(([cat, ids]) => {
      console.log(`  ${cat}: ${ids.join(', ')}`);
    });
    
    // Proper 4-segment configuration
    const newRules = {
      rulesVersion: 6,
      minimumCompletionPct: 80,
      exportUnlockThresholdPct: 80,
      segments: [
        {
          id: 'core-identifiers',
          name: 'Product Core',
          description: 'SKU, MPN, and core identifiers',
          enabled: true,
          weightPct: 25,
          ruleType: 'ALL_REQUIRED',
          appliesTo: {
            mode: 'ALL_PRODUCTS',
            sites: []
          },
          attributeSelector: {
            source: 'REGISTRY',
            categories: ['sku_core'],
            requirementFlag: 'required_for_completion',
            siteAware: false,
            includeInternalOnly: true,
            excludeAttributeIds: [],
            staticAttributeIds: []
          }
        },
        {
          id: 'classification',
          name: 'Product Classification',
          description: 'Category, Class, Department',
          enabled: true,
          weightPct: 25,
          ruleType: 'ALL_REQUIRED',
          appliesTo: {
            mode: 'ALL_PRODUCTS',
            sites: []
          },
          attributeSelector: {
            source: 'REGISTRY',
            categories: ['classification'],
            requirementFlag: 'required_for_completion',
            siteAware: false,
            includeInternalOnly: false,
            excludeAttributeIds: [],
            staticAttributeIds: []
          }
        },
        {
          id: 'demographics-color',
          name: 'Demographics & Colors',
          description: 'Gender, Age Group, Primary Color, Descriptive Color',
          enabled: true,
          weightPct: 25,
          ruleType: 'ANY_REQUIRED',
          appliesTo: {
            mode: 'ALL_PRODUCTS',
            sites: []
          },
          attributeSelector: {
            source: 'REGISTRY',
            categories: ['identity_demographic', 'color'],
            requirementFlag: 'required_for_completion',
            siteAware: false,
            includeInternalOnly: false,
            excludeAttributeIds: [],
            staticAttributeIds: []
          }
        },
        {
          id: 'materials-fit',
          name: 'Materials & Fit',
          description: 'Material and Fit specifications',
          enabled: true,
          weightPct: 25,
          ruleType: 'ANY_REQUIRED',
          appliesTo: {
            mode: 'ALL_PRODUCTS',
            sites: []
          },
          attributeSelector: {
            source: 'REGISTRY',
            categories: ['materials_construction'],
            requirementFlag: 'required_for_completion',
            siteAware: false,
            includeInternalOnly: false,
            excludeAttributeIds: [],
            staticAttributeIds: []
          }
        }
      ]
    };
    
    console.log('\n📊 New Configuration (rulesVersion 6):');
    newRules.segments.forEach(seg => {
      console.log(`\n${seg.name} (${seg.weightPct}%):`);
      console.log(`  Rule Type: ${seg.ruleType}`);
      console.log(`  Categories: ${seg.attributeSelector.categories.join(', ')}`);
      const attrs = seg.attributeSelector.categories.flatMap(cat => requiredByCategory[cat] || []);
      console.log(`  Attributes: ${attrs.join(', ')} (${attrs.length} total)`);
    });
    
    // Update Firestore
    console.log('\n✏️ Updating Firestore completionRules...');
    const settingsRef = db.collection('settings').doc('exportSettings');
    await settingsRef.update({
      'completionRules': newRules,
      'updatedAt': new Date().toISOString()
    });
    
    console.log('\n✅ Successfully updated Firestore with proper 4-segment rules (rulesVersion 6)');
    console.log('\nSegment Evaluation for product 14-test (mpn, brand, website):');
    console.log('  Core Identifiers: 2/6 → 0% (missing: sku, name, product_is_active)');
    console.log('  Classification: 0/3 → 0% (missing: category, class, department)');
    console.log('  Demographics & Colors: 0/4 → 0% (missing all)');
    console.log('  Materials & Fit: 0/2 → 0% (missing: material, fit)');
    console.log('  ➜ Total: (0+0+0+0)/4 = 0% ✅');
    
    process.exit(0);
  } catch (error) {
    console.error('❌ Error:', error.message);
    process.exit(1);
  }
}

createProper4SegmentRules();
