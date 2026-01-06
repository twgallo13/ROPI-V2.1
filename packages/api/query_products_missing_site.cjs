const admin = require('firebase-admin');
const fs = require('fs');

// Check if already initialized
if (!admin.apps.length) {
  const serviceAccountPath = process.env.GOOGLE_APPLICATION_CREDENTIALS || '/workspaces/ROPI-V2.1/service-account.json';
  const serviceAccount = JSON.parse(fs.readFileSync(serviceAccountPath, 'utf8'));
  admin.initializeApp({
    credential: admin.credential.cert(serviceAccount),
    projectId: 'ropi-bccee'
  });
}

const db = admin.firestore();

async function main() {
  console.log('=== Querying products collection ===\n');
  
  // Get total product count
  const allProductsSnapshot = await db.collection('products').get();
  console.log(`Total products in collection: ${allProductsSnapshot.size}`);
  
  // Query products with completion data
  const productsWithCompletion = [];
  const productsMissingCompletion = [];
  const productsWithSiteMissing = [];
  const productsNotReady = [];
  
  for (const doc of allProductsSnapshot.docs) {
    const data = doc.data();
    const productId = doc.id;
    
    if (data.completion) {
      productsWithCompletion.push({ id: productId, data });
      
      if (!data.completion.ready) {
        productsNotReady.push({ id: productId, data });
      }
      
      // Check for missing site blockers
      const blockers = data.completion.blockers || [];
      const siteMissingBlocker = blockers.find(b => 
        b.code === 'REQUIRED_ATTRIBUTE_MISSING' && 
        (b.message?.toLowerCase().includes('site') || b.attributeId?.toLowerCase().includes('site'))
      );
      
      if (siteMissingBlocker) {
        productsWithSiteMissing.push({ id: productId, data, blocker: siteMissingBlocker });
      }
    } else {
      productsMissingCompletion.push({ id: productId, data });
    }
  }
  
  console.log(`Products with completion data: ${productsWithCompletion.length}`);
  console.log(`Products missing completion data: ${productsMissingCompletion.length}`);
  console.log(`Products not ready (completion.ready=false): ${productsNotReady.length}`);
  console.log(`Products with site-related blockers: ${productsWithSiteMissing.length}`);
  
  // Sample up to 20 products with site missing
  console.log('\n=== Sample products with site-related blockers (up to 20) ===\n');
  
  const sample = productsWithSiteMissing.slice(0, 20);
  for (const { id, data, blocker } of sample) {
    console.log(`--- Product ID: ${id} ---`);
    console.log(`  sites: ${JSON.stringify(data.sites || data.site || 'NOT SET')}`);
    console.log(`  store: ${data.store || 'NOT SET'}`);
    console.log(`  shop: ${data.shop || 'NOT SET'}`);
    console.log(`  completion.ready: ${data.completion?.ready}`);
    console.log(`  completion.percent: ${data.completion?.percent}`);
    console.log(`  blocker: ${JSON.stringify(blocker)}`);
    console.log('');
  }
  
  // Also show products not ready without site blocker for comparison
  console.log('\n=== Sample products not ready without site blocker (up to 10) ===\n');
  const notReadyWithoutSite = productsNotReady.filter(p => 
    !productsWithSiteMissing.find(s => s.id === p.id)
  ).slice(0, 10);
  
  for (const { id, data } of notReadyWithoutSite) {
    console.log(`--- Product ID: ${id} ---`);
    console.log(`  sites: ${JSON.stringify(data.sites || data.site || 'NOT SET')}`);
    console.log(`  completion.ready: ${data.completion?.ready}`);
    console.log(`  completion.percent: ${data.completion?.percent}`);
    console.log(`  blockers: ${JSON.stringify(data.completion?.blockers || [])}`);
    console.log('');
  }
  
  // Summary JSON for HES
  const summary = {
    totalProducts: allProductsSnapshot.size,
    productsWithCompletion: productsWithCompletion.length,
    productsMissingCompletion: productsMissingCompletion.length,
    productsNotReady: productsNotReady.length,
    productsWithSiteMissingBlocker: productsWithSiteMissing.length,
    sampleProductIds: sample.map(s => s.id)
  };
  
  console.log('\n=== SUMMARY JSON ===');
  console.log(JSON.stringify(summary, null, 2));
}

main().then(() => process.exit(0)).catch(err => {
  console.error('Error:', err.message);
  console.error(err.stack);
  process.exit(1);
});
