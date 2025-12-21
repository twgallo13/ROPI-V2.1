#!/usr/bin/env node
/**
 * LP-2.1.5.1: Count products missing MPN
 * 
 * Scans all products in Firestore and counts those without mpn field.
 * Used to assess migration readiness for MPN-first imports.
 * 
 * Usage:
 *   GOOGLE_APPLICATION_CREDENTIALS=<path> node scripts/count-products-missing-mpn.js
 */

const admin = require('firebase-admin');

// Initialize with default credentials (uses GOOGLE_APPLICATION_CREDENTIALS env var)
if (!admin.apps.length) {
  admin.initializeApp();
}

const db = admin.firestore();

async function countMissingMpn() {
  console.log('Scanning products collection for missing MPN...');
  
  const snapshot = await db.collection('products').select('mpn', 'sku').get();
  
  let total = 0;
  let missing = 0;
  let hasOnlySku = 0;
  const missingMpnIds = [];
  
  snapshot.forEach(doc => {
    total++;
    const data = doc.data();
    const mpn = data.mpn;
    const sku = data.sku;
    
    if (!mpn || String(mpn).trim() === '') {
      missing++;
      missingMpnIds.push(doc.id);
      
      // Check if it has SKU instead
      if (sku && String(sku).trim() !== '') {
        hasOnlySku++;
      }
    }
  });
  
  const result = {
    scanDate: new Date().toISOString(),
    totalProducts: total,
    missingMpnCount: missing,
    missingMpnPercent: total > 0 ? ((missing / total) * 100).toFixed(2) : '0.00',
    hasSkuButNoMpn: hasOnlySku,
    sampleMissingMpnIds: missingMpnIds.slice(0, 10), // First 10 for review
  };
  
  console.log(JSON.stringify(result, null, 2));
  return result;
}

countMissingMpn()
  .then(() => process.exit(0))
  .catch(err => {
    console.error('Error:', err);
    process.exit(1);
  });
