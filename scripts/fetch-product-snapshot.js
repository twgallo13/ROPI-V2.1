/**
 * fetch-product-snapshot.js
 * Fetches product document from Firestore and saves as JSON snapshot
 * 
 * Usage:
 *   node scripts/fetch-product-snapshot.js <MPN> [--out=<path>]
 * 
 * Example:
 *   node scripts/fetch-product-snapshot.js TP12224-LALBLCK --out=reports/product-snapshots/TP12224-LALBLCK.json
 */

const admin = require('firebase-admin');
const fs = require('fs');
const path = require('path');

// Initialize Firebase Admin SDK
if (!admin.apps.length) {
  admin.initializeApp({
    credential: admin.credential.cert(require('../service-account.json')),
  });
}
const db = admin.firestore();

// Parse command line arguments
const args = process.argv.slice(2);
const mpn = args.find(a => !a.startsWith('--'));
const outArg = args.find(a => a.startsWith('--out='));
const outPath = outArg ? outArg.split('=')[1] : null;

async function main() {
  if (!mpn) {
    console.error('Usage: node scripts/fetch-product-snapshot.js <MPN> [--out=<path>]');
    process.exit(1);
  }

  console.log(`Fetching product: ${mpn}`);

  try {
    // Try to find product by MPN field
    const querySnapshot = await db.collection('products')
      .where('mpn', '==', mpn)
      .limit(1)
      .get();

    let doc = null;
    if (!querySnapshot.empty) {
      doc = querySnapshot.docs[0];
    } else {
      // Try by document ID
      const docRef = db.collection('products').doc(mpn);
      const docSnap = await docRef.get();
      if (docSnap.exists) {
        doc = docSnap;
      }
    }

    if (!doc) {
      console.error(`Product not found: ${mpn}`);
      process.exit(1);
    }

    const data = doc.data();
    const snapshot = {
      id: doc.id,
      mpn: data.mpn || doc.id,
      attributes: data.attributes || null,
      '_meta': data._meta || null,
      // Include additional key fields for context
      title: data.title,
      brand: data.brand,
      category: data.category,
      status: data.status,
      websites: data.websites,
      exportReadiness: data.exportReadiness,
      fetchedAt: new Date().toISOString(),
    };

    const jsonOutput = JSON.stringify(snapshot, null, 2);

    if (outPath) {
      // Ensure directory exists
      const dir = path.dirname(outPath);
      if (!fs.existsSync(dir)) {
        fs.mkdirSync(dir, { recursive: true });
      }
      fs.writeFileSync(outPath, jsonOutput);
      console.log(`Saved snapshot to: ${outPath}`);
    } else {
      console.log(jsonOutput);
    }

    process.exit(0);
  } catch (error) {
    console.error('Error fetching product:', error.message);
    process.exit(1);
  }
}

main();
