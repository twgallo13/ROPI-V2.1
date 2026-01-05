const admin = require('firebase-admin');

admin.initializeApp();
const db = admin.firestore();

async function checkProductsByIds() {
  const ids = ['17-test', '18-test', '19-test', '20-test'];
  
  console.log('\n🔍 Checking Products by Document ID:\n');
  
  for (const id of ids) {
    const productDoc = await db.collection('products').doc(id).get();
    
    if (!productDoc.exists) {
      console.log(`❌ Product NOT FOUND: ${id}`);
      continue;
    }
    
    const product = productDoc.data();
    console.log(`✅ Product: ${id}`);
    console.log(`  MPN: ${product.mpn}`);
    console.log(`  Name: ${product.name}`);
    console.log(`  Age Group: ${product.attributes?.age_group || 'NOT SET'}`);
    console.log(`  RICS Category: ${product.attributes?.rics_category || 'NOT SET'}`);
    
    if (product._appliedRules) {
      console.log(`  Applied Rules:`);
      Object.entries(product._appliedRules).forEach(([field, rule]) => {
        console.log(`    ${field}: ${rule.ruleId} (${rule.ruleName})`);
      });
    } else {
      console.log(`  Applied Rules: NONE`);
    }
    
    console.log(`  Smart Rules Ran: ${product._smartRulesRanAt || 'NEVER'}`);
    console.log('');
  }
}

checkProductsByIds().then(() => process.exit(0)).catch(console.error);
