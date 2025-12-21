/**
 * list-sample-products.js
 * Lists sample products from Firestore showing their attributes state
 * 
 * Usage:
 *   node scripts/list-sample-products.js [--limit=N]
 */

const admin = require('firebase-admin');

// Initialize Firebase Admin SDK
if (!admin.apps.length) {
  admin.initializeApp({
    credential: admin.credential.cert(require('../service-account.json')),
  });
}
const db = admin.firestore();

// Parse command line arguments
const args = process.argv.slice(2);
const limitArg = args.find(a => a.startsWith('--limit='));
const limit = limitArg ? parseInt(limitArg.split('=')[1], 10) : 20;

async function main() {
  console.log(`Listing sample products (limit: ${limit})...\n`);

  try {
    const snapshot = await db.collection('products').limit(limit).get();
    
    const products = [];
    for (const doc of snapshot.docs) {
      const data = doc.data();
      products.push({
        id: doc.id,
        mpn: data.mpn || doc.id,
        hasAttributes: !!data.attributes,
        hasOverall: !!(data.attributes && data.attributes.overall),
        hasMeta: !!(data.attributes && data.attributes._meta),
        status: data.status,
      });
    }

    console.log('ID'.padEnd(25) + 'MPN'.padEnd(25) + 'attrs?'.padEnd(8) + 'overall?'.padEnd(10) + '_meta?'.padEnd(8) + 'status');
    console.log('-'.repeat(90));
    
    for (const p of products) {
      console.log(
        p.id.padEnd(25) +
        p.mpn.padEnd(25) +
        (p.hasAttributes ? 'YES' : 'NO').padEnd(8) +
        (p.hasOverall ? 'YES' : 'NO').padEnd(10) +
        (p.hasMeta ? 'YES' : 'NO').padEnd(8) +
        (p.status || 'N/A')
      );
    }

    console.log('\n' + '-'.repeat(90));
    console.log(`Total: ${products.length} products`);
    console.log(`With attributes: ${products.filter(p => p.hasAttributes).length}`);
    console.log(`With attributes.overall: ${products.filter(p => p.hasOverall).length}`);
    console.log(`With attributes._meta: ${products.filter(p => p.hasMeta).length}`);

    process.exit(0);
  } catch (error) {
    console.error('Error:', error.message);
    process.exit(1);
  }
}

main();
