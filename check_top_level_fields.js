const admin = require('firebase-admin');
admin.initializeApp();
const db = admin.firestore();

(async () => {
  console.log('=== CHECKING SAMPLE PRODUCTS FOR TOP-LEVEL FIELDS ===\n');
  
  // Get a few products to see what top-level fields exist
  const productsSnapshot = await db.collection('products').limit(10).get();
  
  const allTopLevelFields = new Set();
  
  productsSnapshot.forEach(doc => {
    const data = doc.data();
    Object.keys(data).forEach(key => {
      if (key !== 'attributes' && key !== 'selected_sites' && 
          !key.startsWith('_') && key !== 'createdAt' && 
          key !== 'updatedAt' && key !== 'updatedBy' &&
          key !== 'modifiedBy' && key !== 'createdBy') {
        allTopLevelFields.add(key);
      }
    });
  });
  
  console.log('Common top-level product fields (excluding metadata):');
  const sorted = Array.from(allTopLevelFields).sort();
  sorted.forEach(field => console.log(`  - ${field}`));
  
  console.log(`\nTotal unique top-level fields: ${allTopLevelFields.size}\n`);
  
  // Now check what's in our mirrored list
  const mirroredFields = new Set([
    'name', 'brand', 'sku', 'mpn',
    'category', 'department', 'gender', 'age_group',
    'primary_color', 'descriptive_color',
    'material', 'fit',
    'height', 'length', 'width', 'weight',
    'class', 'gtin', 'website'
  ]);
  
  console.log('Fields in mirrored list but NOT found at top-level:');
  mirroredFields.forEach(field => {
    if (!allTopLevelFields.has(field)) {
      console.log(`  - ${field}`);
    }
  });
  
  console.log('\nFields at top-level but NOT in mirrored list:');
  allTopLevelFields.forEach(field => {
    if (!mirroredFields.has(field)) {
      console.log(`  - ${field}`);
    }
  });
  
  process.exit(0);
})();
