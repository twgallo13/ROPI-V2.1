#!/usr/bin/env node
/**
 * LP-2.1.5.1: Find duplicate MPN values
 * 
 * Scans all products in Firestore and identifies duplicates.
 * Critical for MPN-first imports since MPN should be unique.
 * 
 * Usage:
 *   GOOGLE_APPLICATION_CREDENTIALS=<path> node scripts/find-duplicate-mpn.js
 */

const admin = require('firebase-admin');

// Initialize with default credentials (uses GOOGLE_APPLICATION_CREDENTIALS env var)
if (!admin.apps.length) {
  admin.initializeApp();
}

const db = admin.firestore();

async function findDuplicateMpn() {
  console.log('Scanning products collection for duplicate MPNs...');
  
  const snapshot = await db.collection('products').select('mpn').get();
  
  const mpnMap = new Map();
  let total = 0;
  
  snapshot.forEach(doc => {
    total++;
    const data = doc.data();
    const mpn = (data.mpn || '').toString().trim().toLowerCase();
    
    if (!mpn) return; // Skip empty MPNs
    
    const existing = mpnMap.get(mpn) || [];
    existing.push(doc.id);
    mpnMap.set(mpn, existing);
  });
  
  // Find duplicates (MPN appears in more than one document)
  const duplicates = [];
  for (const [mpn, ids] of mpnMap.entries()) {
    if (ids.length > 1) {
      duplicates.push({
        mpn,
        count: ids.length,
        documentIds: ids,
      });
    }
  }
  
  // Sort by count (most duplicates first)
  duplicates.sort((a, b) => b.count - a.count);
  
  const result = {
    scanDate: new Date().toISOString(),
    totalProducts: total,
    uniqueMpnCount: mpnMap.size,
    duplicateMpnCount: duplicates.length,
    duplicates: duplicates.slice(0, 50), // First 50 for review
    totalDuplicateDocuments: duplicates.reduce((sum, d) => sum + d.count, 0),
  };
  
  console.log(JSON.stringify(result, null, 2));
  return result;
}

findDuplicateMpn()
  .then(() => process.exit(0))
  .catch(err => {
    console.error('Error:', err);
    process.exit(1);
  });
