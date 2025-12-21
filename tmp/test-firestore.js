const admin = require('firebase-admin');
const key = JSON.parse(Buffer.from(process.env.GCP_SA_KEY_BASE64, 'base64').toString('utf-8'));
if (!admin.apps.length) {
  admin.initializeApp({ credential: admin.credential.cert(key) });
}

async function testAttributes() {
  const db = admin.firestore();
  
  // Direct Firestore read to verify data
  const snap = await db.collection('settings').doc('attributes').collection('keys').limit(3).get();
  console.log('First 3 attributes from Firestore:');
  snap.docs.forEach(doc => {
    const data = doc.data();
    console.log('---');
    console.log('ID:', doc.id);
    console.log('Label:', data.label);
    console.log('Status:', data.status);
    console.log('Data type:', data.data_type || data.dataType);
    console.log('allowed_values count:', (data.allowed_values || []).length);
  });
}
testAttributes().catch(console.error);
