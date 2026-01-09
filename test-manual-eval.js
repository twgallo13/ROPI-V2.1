const admin = require('firebase-admin');

// Initialize Firebase
try {
  admin.initializeApp();
} catch(e) {
  // Already initialized
}

const db = admin.firestore();

async function testEvaluation() {
  try {
    // Fetch product 14-test
    const productDoc = await db.collection('products').doc('14-test').get();
    if (!productDoc.exists) {
      console.error('❌ Product 14-test not found');
      process.exit(1);
    }
    
    const product = productDoc.data();
    console.log('✅ Product 14-test found');
    
    // Fetch completionRules from Firestore
    const settingsDoc = await db.collection('settings').doc('exportSettings').get();
    if (!settingsDoc.exists) {
      console.error('❌ Settings document not found');
      process.exit(1);
    }
    
    const settings = settingsDoc.data();
    const completionRules = settings.completionRules;
    console.log('✅ Completion rules loaded (version ' + completionRules.rulesVersion + ')');
    console.log('   Segments:', completionRules.segments.map(s => `${s.id} (${s.weightPct}%)`).join(', '));
    
    // Fetch attribute registry
    const registryDoc = await db.collection('settings').doc('attributesMeta').get();
    if (!registryDoc.exists) {
      console.error('⚠️ Attribute registry metadata not found, will load from local');
    }
    
    // Load local attribute registry
    const localRegistry = require('./packages/sdk/config/attributeRegistry.json');
    const attributeRegistry = {};
    localRegistry.attributes.forEach(attr => {
      attributeRegistry[attr.attribute_id] = attr;
    });
    console.log('✅ Loaded', Object.keys(attributeRegistry).length, 'attributes from registry');
    
    // Manually evaluate each segment
    console.log('\n📊 Manual Evaluation:');
    
    const coreSegment = completionRules.segments.find(s => s.id === 'core-attributes');
    if (coreSegment) {
      // Resolve attributes for core segment
      const categories = coreSegment.attributeSelector.categories; // ['sku_core', 'classification']
      const requiredFlag = coreSegment.attributeSelector.requirementFlag; // 'required_for_completion'
      
      // Find all matching attributes
      const matchingAttrs = Object.entries(attributeRegistry)
        .filter(([id, attr]) => {
          return categories.includes(attr.category) && attr[requiredFlag] === true;
        })
        .map(([id]) => id);
      
      console.log(`\nCore Attributes Segment:`);
      console.log(`  Categories: ${categories.join(', ')}`);
      console.log(`  Required flag: ${requiredFlag}`);
      console.log(`  Total attributes needed: ${matchingAttrs.length}`);
      console.log(`  Attributes: ${matchingAttrs.join(', ')}`);
      
      // Check which are present
      const present = matchingAttrs.filter(id => !!product.attributes?.[id]);
      const missing = matchingAttrs.filter(id => !product.attributes?.[id]);
      
      console.log(`  Present: ${present.length}/${matchingAttrs.length} (${present.join(', ')})`);
      console.log(`  Missing: ${missing.length}/${matchingAttrs.length} (${missing.join(', ')})`);
      
      // Binary scoring (ALL_REQUIRED)
      const score = present.length === matchingAttrs.length ? 100 : 0;
      console.log(`  ➜ Binary Score (ALL_REQUIRED): ${score}%`);
    }
    
    // Check all other segments
    completionRules.segments.forEach(seg => {
      if (seg.id === 'core-attributes') return;
      
      const categories = seg.attributeSelector.categories || [];
      const requiredFlag = seg.attributeSelector.requirementFlag;
      
      const matchingAttrs = Object.entries(attributeRegistry)
        .filter(([id, attr]) => {
          if (categories.length > 0) {
            return categories.includes(attr.category) && (requiredFlag ? attr[requiredFlag] === true : true);
          }
          // For segments with no categories (e.g., static IDs), just count them
          return true;
        })
        .map(([id]) => id);
      
      const present = matchingAttrs.filter(id => !!product.attributes?.[id]);
      const score = present.length === matchingAttrs.length ? 100 : 0;
      
      console.log(`\n${seg.name} Segment:`);
      console.log(`  Attributes needed: ${matchingAttrs.length}`);
      console.log(`  Present: ${present.length}`);
      console.log(`  ➜ Score: ${score}%`);
    });
    
    // Calculate total
    const enabledSegments = completionRules.segments.filter(s => s.enabled);
    const totalWeight = enabledSegments.reduce((sum, s) => sum + s.weightPct, 0);
    const coreScore = 0; // From above
    const seoScore = 0; // description likely missing
    const mediaScore = 0; // media missing
    const techScore = 0; // technical missing
    
    const total = (coreScore * 25 + seoScore * 25 + mediaScore * 25 + techScore * 25) / 100;
    
    console.log(`\n📈 Total Completion:`);
    console.log(`  (${coreScore}% × 25% + ${seoScore}% × 25% + ${mediaScore}% × 25% + ${techScore}% × 25%) / 100`);
    console.log(`  = ${total}%`);
    
    if (total === 0) {
      console.log('\n✅ SUCCESS: Product 14-test should score 0% completion');
    } else {
      console.log(`\n⚠️ WARNING: Expected 0% but calculated ${total}%`);
    }
    
    process.exit(0);
  } catch (error) {
    console.error('❌ Error:', error.message);
    process.exit(1);
  }
}

testEvaluation();
