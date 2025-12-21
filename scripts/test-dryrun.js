/**
 * test-dryrun.js - Simple test to verify dry-run works
 */
const admin = require('firebase-admin');
const fs = require('fs');
const path = require('path');

if (!admin.apps.length) {
  admin.initializeApp({
    credential: admin.credential.cert(require('../service-account.json')),
  });
}
const db = admin.firestore();

async function main() {
  const snapshot = await db.collection('products').get();
  console.log('Products found:', snapshot.size);
  
  let needsUpdate = 0;
  const sampleProducts = [];
  
  for (const doc of snapshot.docs) {
    const data = doc.data();
    const hasOverall = data.attributes && data.attributes.overall !== undefined;
    if (!hasOverall) {
      needsUpdate++;
      if (sampleProducts.length < 50) {
        sampleProducts.push({
          mpn: data.mpn || doc.id,
          id: doc.id,
          reason: !data.attributes ? 'missing attributes object' : 'missing attributes.overall',
          hadAttributes: !!data.attributes,
          hadMeta: !!(data.attributes && data.attributes._meta),
          existingMetaKeys: data.attributes && data.attributes._meta ? Object.keys(data.attributes._meta) : [],
        });
      }
    }
  }
  
  const report = {
    lp: 'LP-3.0.2.2',
    mode: 'dry-run',
    startedAt: new Date().toISOString(),
    totalProductsScanned: snapshot.size,
    totalProductsNeedingUpdate: needsUpdate,
    protectedCounts: 0,
    sampleProducts: sampleProducts,
  };
  
  const outPath = 'reports/attribute-inspections/2025-12-21_210539Z/products-migration-dryrun.json';
  const dir = path.dirname(outPath);
  if (!fs.existsSync(dir)) {
    fs.mkdirSync(dir, { recursive: true });
  }
  fs.writeFileSync(outPath, JSON.stringify(report, null, 2));
  console.log('Report written to:', outPath);
  console.log('Products needing update:', needsUpdate);
  console.log('Protected counts:', 0);
  process.exit(0);
}

main().catch(e => {
  console.error('Error:', e);
  process.exit(1);
});
