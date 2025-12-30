const admin = require('firebase-admin');

const saKeyBase64 = process.env.GCP_SA_KEY_BASE64;
const saKey = JSON.parse(Buffer.from(saKeyBase64, 'base64').toString('utf8'));

if (!admin.apps.length) {
  admin.initializeApp({
    credential: admin.credential.cert(saKey),
    projectId: saKey.project_id
  });
}
const db = admin.firestore();

async function getRecentProducts() {
  // Get 211737-90h1-8 and 4 most recently imported
  const snapshot = await db.collection('products')
    .orderBy('_meta.importedAt', 'desc')
    .limit(10)
    .get();
  
  const products = [];
  snapshot.forEach(doc => {
    const d = doc.data();
    products.push({
      id: doc.id,
      importedAt: d._meta?.importedAt,
      hasLaunchDate: !!d.attributes?.launch_date || !!d.launch_date,
      hasKlPostDate: !!d.attributes?.kl_post_date || !!d.kl_post_date
    });
  });
  
  // Always include target product
  const targetProduct = await db.collection('products').doc('211737-90h1-8').get();
  if (targetProduct.exists) {
    const d = targetProduct.data();
    const existing = products.find(p => p.id === '211737-90h1-8');
    if (!existing) {
      products.unshift({
        id: '211737-90h1-8',
        importedAt: d._meta?.importedAt,
        hasLaunchDate: !!d.attributes?.launch_date || !!d.launch_date,
        hasKlPostDate: !!d.attributes?.kl_post_date || !!d.kl_post_date
      });
    }
  }
  
  console.log(JSON.stringify(products.slice(0, 5), null, 2));
}

getRecentProducts().then(() => process.exit(0)).catch(e => { console.error(e); process.exit(1); });
