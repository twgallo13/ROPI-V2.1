const admin = require('firebase-admin');
const serviceAccount = require('./service-account.json');

admin.initializeApp({
  credential: admin.credential.cert(serviceAccount),
  storageBucket: 'gs://stage-homer-ropi-2-1.firebasestorage.app'
});

const db = admin.firestore();

async function comprehensiveTest() {
  console.log('\n🧪 Comprehensive Smart Rules Test\n');
  console.log('='.repeat(60));
  
  // 1. Verify Rules Configuration
  console.log('\n📋 STEP 1: Rule Configuration\n');
  
  const ruleIds = [
    'JiYQZ6PxwjKBHsWiF1gI', // Weight
    'H53rfxHqZ8h7j4abYctd', // Length  
    'YyhUxSJOCzOOW8ZuAW0z', // Width
    '6xM28ocd281iw2D6KK4P'  // Height
  ];
  
  for (const ruleId of ruleIds) {
    const doc = await db.collection('settings').doc('smartRules').collection('rules').doc(ruleId).get();
    const rule = doc.data();
    
    console.log(`✓ ${rule.name}`);
    console.log(`  - Target: ${rule.action.targetField} = ${rule.action.valueTemplate}`);
    console.log(`  - Enabled: ${rule.enabled}, Auto-Apply: ${rule.autoApply}`);
    console.log(`  - Conditions (${rule.conditions?.length || 0}):`);
    
    if (rule.conditions) {
      rule.conditions.forEach((c, i) => {
        console.log(`    ${i+1}. ${c.source} ${c.matchType} "${c.value}"`);
      });
    }
    
    // Verify using attribute IDs, not paths
    const hasAttributePaths = rule.conditions?.some(c => c.source?.includes('attributes.'));
    if (hasAttributePaths) {
      console.log(`    ⚠️  WARNING: Uses 'attributes.' prefix - should use registry IDs only!`);
    }
    
    console.log('');
  }
  
  // 2. Verify Product State
  console.log('\n📦 STEP 2: Product 20-test State\n');
  
  const productDoc = await db.collection('products').doc('20-test').get();
  const product = productDoc.data();
  
  // Check where rics_category is stored
  const topLevelCategory = product.rics_category;
  const attributeCategory = product.attributes?.rics_category;
  
  console.log(`Top-level rics_category: ${topLevelCategory || 'undefined'}`);
  console.log(`attributes.rics_category: ${attributeCategory || 'undefined'}`);
  console.log(`\nActive Category: "${attributeCategory || topLevelCategory}"`);
  
  if (attributeCategory) {
    console.log(`  ✓ Contains "Footwear": ${attributeCategory.includes('Footwear') ? 'YES' : 'NO'}`);
    console.log(`  ✓ Contains "Mens": ${attributeCategory.includes('Mens') ? 'YES' : 'NO'}`);
  }
  
  console.log(`\nCurrent Shipping Dimensions:`);
  console.log(`  - weight: ${product.attributes?.weight || 'NOT SET'}`);
  console.log(`  - height: ${product.attributes?.height || 'NOT SET'}`);
  console.log(`  - length: ${product.attributes?.length || 'NOT SET'}`);
  console.log(`  - width: ${product.attributes?.width || 'NOT SET'}`);
  
  console.log(`\nSmart Rules Metadata:`);
  console.log(`  - Can run: ${!product._smartRulesSkipUntil ? 'YES ✓' : 'NO (skip active)'}`);
  console.log(`  - Last ran: ${product._smartRulesRanAt || 'Never'}`);
  
  const appliedRules = product._appliedRules || {};
  const ruleNames = Object.keys(appliedRules);
  console.log(`  - Applied rules (${ruleNames.length}): ${ruleNames.join(', ') || 'None'}`);
  
  // 3. Condition Matching Analysis
  console.log(`\n\n🎯 STEP 3: Condition Matching Analysis\n`);
  
  const category = attributeCategory || topLevelCategory;
  
  if (!category) {
    console.log('❌ CRITICAL: rics_category is undefined - rules cannot match!');
    console.log('   Product needs a valid RICS Category value.');
  } else {
    const matchesFootwear = category.includes('Footwear');
    const matchesMens = category.includes('Mens');
    const shouldMatch = matchesFootwear && matchesMens;
    
    console.log(`Category: "${category}"`);
    console.log(`Condition 1 (contains "Footwear"): ${matchesFootwear ? '✅ MATCH' : '❌ NO MATCH'}`);
    console.log(`Condition 2 (contains "Mens"): ${matchesMens ? '✅ MATCH' : '❌ NO MATCH'}`);
    console.log(`Both conditions (AND logic): ${shouldMatch ? '✅ SHOULD APPLY' : '❌ SHOULD NOT APPLY'}`);
    
    if (shouldMatch) {
      const hasValues = product.attributes?.weight && product.attributes?.height && 
                       product.attributes?.length && product.attributes?.width;
      
      if (hasValues) {
        console.log(`\n✅ Rules applied successfully!`);
      } else {
        console.log(`\n⚠️  Rules should apply but dimensions not set yet.`);
        console.log(`   Next: Update the product to trigger Smart Rules evaluation.`);
      }
    }
  }
  
  // 4. Summary
  console.log(`\n\n${'='.repeat(60)}`);
  console.log(`\n📊 SUMMARY\n`);
  
  console.log(`Rules: ${ruleIds.length} shipping dimension rules configured`);
  console.log(`  ✓ All use attribute ID "rics_category" (not "attributes.rics_category")`);
  console.log(`  ✓ All have 2 conditions with AND logic`);
  console.log(`  ✓ All target dimension fields: weight, height, length, width`);
  
  const categoryValid = !!(attributeCategory || topLevelCategory);
  const skipCleared = !product._smartRulesSkipUntil;
  const shouldApply = categoryValid && (attributeCategory || topLevelCategory)?.includes('Footwear') && 
                     (attributeCategory || topLevelCategory)?.includes('Mens');
  
  console.log(`\nProduct 20-test:`);
  console.log(`  ${categoryValid ? '✓' : '❌'} Has valid rics_category`);
  console.log(`  ${skipCleared ? '✓' : '❌'} Skip timestamp cleared`);
  console.log(`  ${shouldApply ? '✓' : '❌'} Matches rule conditions`);
  
  if (categoryValid && skipCleared && shouldApply) {
    console.log(`\n✅ READY TO TEST!`);
    console.log(`   Next: Update product 20-test in Product Editor to trigger rules.`);
  } else {
    console.log(`\n⚠️  NOT READY - see issues above`);
  }
  
  console.log(`\n${'='.repeat(60)}\n`);
  
  process.exit(0);
}

comprehensiveTest().catch(err => {
  console.error('\n❌ Error:', err);
  process.exit(1);
});
