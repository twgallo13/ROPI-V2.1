import { initializeApp, cert } from 'firebase-admin/app';
import { getFirestore } from 'firebase-admin/firestore';
import { readFileSync } from 'fs';

async function checkProduct() {
  const serviceAccount = JSON.parse(readFileSync('/secrets/staging-service-account.json', 'utf8'));
  initializeApp({ credential: cert(serviceAccount) });
  const db = getFirestore();

  const doc = await db.collection('products').doc('XTEST-456').get();
  
  if (!doc.exists) {
    console.log('Product XTEST-456 not found');
    return;
  }

  const data = doc.data();
  console.log(JSON.stringify(data, null, 2));
}

checkProduct().catch(console.error);
