const admin = require('firebase-admin');

admin.initializeApp();

async function triggerSmartRulesOnProduct() {
  const productId = '20-test';
  
  console.log('\n🚀 Triggering Smart Rules on product:', productId);
  console.log('');
  
  try {
    // Clear the skip timestamp to force rules to run again
    const db = admin.firestore();
    const productRef = db.collection('products').doc(productId);
    
    await productRef.update({
      _smartRulesSkipUntil: admin.firestore.FieldValue.delete(),
    });
    
    console.log('✅ Cleared _smartRulesSkipUntil to allow rules to run again');
    console.log('');
    console.log('📝 Next Steps:');
    console.log('   1. Go to Product Editor for product 20-test');
    console.log('   2. Click "Get Suggestions" or save the product');
    console.log('   3. Smart Rules should now evaluate with fixed conditions');
    console.log('');
    console.log('   Or run a new import with your test CSV');
    
  } catch (error) {
    console.error('Error:', error.message);
  }
}

triggerSmartRulesOnProduct().then(() => process.exit(0)).catch(console.error);
