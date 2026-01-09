const admin = require('firebase-admin');

try {
  admin.initializeApp();
} catch(e) {}

const db = admin.firestore();

// Import the evaluator
const { evaluateCompletion } = require('./packages/api/src/services/completionEvaluationEngine');
const { loadCompletionRules } = require('./packages/api/src/services/completionRulesService');
const { loadAttributeRegistryForCompletion, extractSelectedSites, convertToProductSnapshot } = require('./packages/api/src/services/completionDrivenExportReadiness');

(async () => {
  try {
    console.log('🔍 Testing product 14-test evaluation...\n');
    
    // Load product
    const productDoc = await db.collection('products').doc('14-test').get();
    if (!productDoc.exists) {
      console.error('❌ Product not found');
      process.exit(1);
    }
    
    const productData = { id: '14-test', ...productDoc.data() };
    
    // Load rules and registry
    console.log('Loading completion rules and attribute registry...');
    const rules = await loadCompletionRules();
    const registry = await loadAttributeRegistryForCompletion();
    
    console.log('✅ Loaded rules version:', rules.rulesVersion);
    console.log('✅ Loaded', Object.keys(registry).length, 'attributes\n');
    
    // Extract sites and convert product
    const sites = extractSelectedSites(productData);
    const productSnapshot = convertToProductSnapshot(productData);
    
    console.log('Product snapshot:');
    console.log('  ID:', productSnapshot.productId);
    console.log('  Sites:', sites);
    console.log('  Attributes:', Object.keys(productSnapshot.attributes).slice(0, 10).join(', ') + '...');
    
    // Evaluate completion
    console.log('\n📊 Evaluating completion...\n');
    const result = evaluateCompletion(
      productSnapshot,
      sites,
      registry,
      rules,
      new Date().toISOString()
    );
    
    console.log('Evaluation Result:');
    console.log('  Total Completion:', result.totalCompletionPct + '%');
    console.log('  Has Blocking Sites:', result.hasBlockingSites);
    console.log('\nSegment Breakdown:');
    
    result.segmentResults.forEach(seg => {
      const status = seg.score === 100 ? '✓' : (seg.score === 0 ? '✗' : '~');
      console.log(`  ${status} ${seg.segmentName}:`);
      console.log(`      Score: ${seg.score}% (weight: ${seg.weightPct}%)`);
      console.log(`      Completed: ${seg.completedAttributes}/${seg.totalAttributes}`);
      if (seg.missingAttributes.length > 0) {
        console.log(`      Missing: ${seg.missingAttributes.slice(0, 5).join(', ')}${seg.missingAttributes.length > 5 ? '...' : ''}`);
      }
    });
    
    console.log('\n' + (result.totalCompletionPct === 50 ? '✅' : '⚠️') + ' Expected 50%, got ' + result.totalCompletionPct + '%');
    
    process.exit(0);
  } catch (error) {
    console.error('❌ Error:', error.message);
    console.error(error.stack);
    process.exit(1);
  }
})();
