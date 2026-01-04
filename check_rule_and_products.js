const admin = require('firebase-admin');

admin.initializeApp();
const db = admin.firestore();

async function checkRule() {
  const ruleId = 'rule_1767479194034_712nhw';
  
  const ruleDoc = await db.collection('settings/smartRules/rules').doc(ruleId).get();
  
  if (!ruleDoc.exists) {
    console.log('❌ Rule NOT FOUND:', ruleId);
    return;
  }
  
  const rule = ruleDoc.data();
  console.log('\n✅ Rule Found:', ruleId);
  console.log('\nFull rule data:');
  console.log(JSON.stringify(rule, null, 2));
}

async function checkProducts() {
  const mpns = ['17-test', '18-test', '19-test', '20-test'];
  
  console.log('\n\n🔍 Checking Products:');
  
  for (const mpn of mpns) {
    const productsSnap = await db.collection('products')
      .where('mpn', '==', mpn)
      .limit(1)
      .get();
    
    if (productsSnap.empty) {
      console.log(`\n❌ Product not found: ${mpn}`);
      continue;
    }
    
    const productDoc = productsSnap.docs[0];
    const product = productDoc.data();
    
    console.log(`\n✅ Product: ${mpn} (${productDoc.id})`);
    console.log(`  Age Group: ${product.attributes?.age_group || 'NOT SET'}`);
    console.log(`  RICS Category: ${product.attributes?.rics_category}`);
    console.log(`  Applied Rules: ${product._appliedRules ? Object.keys(product._appliedRules).join(', ') : 'NONE'}`);
    console.log(`  Smart Rules Ran: ${product._smartRulesRanAt || 'NEVER'}`);
  }
}

async function main() {
  await checkRule();
  await checkProducts();
}

main().then(() => process.exit(0)).catch(console.error);
