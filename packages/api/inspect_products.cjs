const admin = require('firebase-admin');
const fs = require('fs');

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
  const productsSnapshot = await db.collection('products').limit(5).get();
  
  console.log('=== Sample product documents (first 5) ===\n');
  
  for (const doc of productsSnapshot.docs) {
    const data = doc.data();
    console.log(`--- Product ID: ${doc.id} ---`);
    console.log('Full document:');
    console.log(JSON.stringify(data, null, 2));
    console.log('\n');
  }
}

main().then(() => process.exit(0)).catch(err => {
  console.error('Error:', err);
  process.exit(1);
});
