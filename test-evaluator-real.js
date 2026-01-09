const admin = require('firebase-admin');
const path = require('path');

// Initialize Firebase
try {
  admin.initializeApp();
} catch(e) {
  // Already initialized
}

const db = admin.firestore();

// Import the evaluator function
const { evaluateProductCompletion } = require('./packages/api/dist/services/completionDrivenExportReadiness.js');

(async () => {
  try {
    // Fetch product 14-test
    const productDoc = await db.collection('products').doc('14-test').get();
    if (!productDoc.exists) {
      console.error('Product 14-test not found');
      process.exit(1);
    }
    
    const productData = productDoc.data();
    console.log('Product 14-test found');
    console.log('Attributes:', Object.keys(productData.attributes).slice(0, 10));
    
    // Evaluate completion
    console.log('\nEvaluating completion...');
    const result = await evaluateProductCompletion('14-test', productData, ['shiekh.com']);
    
    console.log('\nEvaluation Result:');
    console.log('Completion %:', result.completionPct);
    console.log('Can Export:', result.canExport);
    console.log('Segment Results:', result.segmentResults?.map(s => ({
      id: s.segmentId,
      score: s.score,
      completed: s.completedAttributes,
      total: s.totalAttributes
    })));
    
    if (result.completionPct !== 0) {
      console.error('\n⚠️ UNEXPECTED: Expected 0% completion but got', result.completionPct + '%');
      process.exit(1);
    } else {
      console.log('\n✅ SUCCESS: Product 14-test correctly shows 0% completion');
    }
    
    process.exit(0);
  } catch (error) {
    console.error('Error:', error);
    process.exit(1);
  }
})();
