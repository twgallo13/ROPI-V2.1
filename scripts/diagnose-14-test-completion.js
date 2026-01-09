#!/usr/bin/env node
/**
 * Diagnostic: Show what completion evaluation sees for product 14-test
 */

const admin = require('firebase-admin');
const sa = require('/tmp/sa.json');

if (!admin.apps.length) {
  admin.initializeApp({ credential: admin.credential.cert(sa) });
}

async function diagnose() {
  // Get product
  const db = admin.firestore();
  const prodSnap = await db.doc('products/14-test').get();
  const product = prodSnap.data();
  
  console.log('=== PRODUCT 14-TEST ATTRIBUTES ===');
  console.log('Product attributes object keys:', Object.keys(product.attributes || {}));
  console.log('\nAttribute values:');
  for (const [key, value] of Object.entries(product.attributes || {})) {
    console.log(`  ${key}: ${JSON.stringify(value)}`);
  }
  
  // Check if SDK registry has required_for_completion flags
  console.log('\n=== SDK REGISTRY CHECK ===');
  const registryPath = require('path').resolve(__dirname, '../packages/sdk/config/attributeRegistry.json');
  const sdkRegistry = require(registryPath);
  
  const skuCoreAttrs = sdkRegistry.attributes.filter(a => a.category === 'sku_core');
  console.log(`\nsku_core attributes (${skuCoreAttrs.length} total):`);
  skuCoreAttrs.forEach(a => {
    const hasValue = product.attributes && product.attributes[a.attribute_id] !== undefined;
    console.log(`  ${a.attribute_id}:`);
    console.log(`    required_for_completion: ${a.required_for_completion}`);
    console.log(`    product has value: ${hasValue}`);
    if (hasValue) {
      console.log(`    value: ${JSON.stringify(product.attributes[a.attribute_id])}`);
    }
  });
  
  // Check what the completion evaluator would see
  console.log('\n=== EXPECTED EVALUATION ===');
  const requiredSkuCore = skuCoreAttrs.filter(a => a.required_for_completion);
  const presentRequired = requiredSkuCore.filter(a => 
    product.attributes && product.attributes[a.attribute_id] !== undefined && product.attributes[a.attribute_id] !== ''
  );
  
  console.log(`Required sku_core attrs: ${requiredSkuCore.length}`);
  console.log(`  IDs: ${requiredSkuCore.map(a => a.attribute_id).join(', ')}`);
  console.log(`Present required attrs: ${presentRequired.length}`);
  console.log(`  IDs: ${presentRequired.map(a => a.attribute_id).join(', ')}`);
  console.log(`ALL_REQUIRED score: ${presentRequired.length === requiredSkuCore.length ? 100 : 0}%`);
  console.log(`\nExpected: Product Core should score 0% (${presentRequired.length}/${requiredSkuCore.length} present)`);
  
  process.exit(0);
}

diagnose().catch(e => { console.error(e); process.exit(1); });
