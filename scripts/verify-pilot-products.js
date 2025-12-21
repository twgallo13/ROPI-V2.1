/**
 * verify-pilot-products.js
 * Verifies that pilot products have attributes.overall after migration
 */

const admin = require('firebase-admin');

// Initialize Firebase Admin SDK
if (!admin.apps.length) {
  admin.initializeApp({
    credential: admin.credential.cert(require('../service-account.json')),
  });
}
const db = admin.firestore();

const pilotProducts = [
  '123', '14943667', '14943678', '207012-001', '209473-1001',
  '209516-1001', '209516-6916', '209710-6916', '211116-001', '212350-90H'
];

async function main() {
  console.log('Verifying pilot products after LP-3.0.2.1 migration...\n');
  
  const results = [];
  let allPass = true;

  for (const mpn of pilotProducts) {
    const doc = await db.collection('products').doc(mpn).get();
    if (!doc.exists) {
      console.log(`❌ ${mpn}: Product not found`);
      allPass = false;
      results.push({ mpn, exists: false, hasOverall: false, pass: false });
      continue;
    }
    
    const data = doc.data();
    const hasAttributes = !!data.attributes;
    const hasOverall = !!(data.attributes && data.attributes.overall !== undefined);
    const hasMeta = !!(data.attributes && data.attributes._meta);
    const overallIsObject = hasOverall && typeof data.attributes.overall === 'object';
    
    const pass = hasAttributes && hasOverall && overallIsObject;
    if (!pass) allPass = false;
    
    console.log(`${pass ? '✅' : '❌'} ${mpn}: attributes=${hasAttributes}, overall=${hasOverall} (type: ${typeof data.attributes?.overall}), _meta=${hasMeta}`);
    
    results.push({
      mpn,
      exists: true,
      hasAttributes,
      hasOverall,
      overallType: typeof data.attributes?.overall,
      hasMeta,
      pass,
    });
  }

  console.log('\n' + '='.repeat(60));
  console.log(`Verification: ${allPass ? '✅ ALL PASS' : '❌ SOME FAILED'}`);
  console.log(`Passed: ${results.filter(r => r.pass).length}/${results.length}`);
  console.log('='.repeat(60));

  // Output JSON summary
  const summary = {
    lp: 'LP-3.0.2.1',
    verifiedAt: new Date().toISOString(),
    allPass,
    passed: results.filter(r => r.pass).length,
    total: results.length,
    results,
  };
  
  require('fs').writeFileSync(
    'reports/attribute-inspections/pilot-verification.json',
    JSON.stringify(summary, null, 2)
  );
  console.log('\nSaved verification to: reports/attribute-inspections/pilot-verification.json');
  
  process.exit(allPass ? 0 : 1);
}

main();
