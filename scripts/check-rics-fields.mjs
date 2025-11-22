import { initializeApp, cert } from 'firebase-admin/app';
import { getFirestore } from 'firebase-admin/firestore';
import { readFileSync } from 'fs';

async function checkRicsColor() {
  const serviceAccount = JSON.parse(readFileSync('/secrets/staging-service-account.json', 'utf8'));
  initializeApp({ credential: cert(serviceAccount) });
  const db = getFirestore();

  console.log('\n=== Checking RICS Source Fields ===\n');

  const fields = [
    'rics_source.color',
    'rics_source.shortDescription',
    'launch.klPostDate'
  ];

  for (const field of fields) {
    const doc = await db.collection('settings').doc('attributes').collection('keys').doc(field).get();
    const data = doc.data();
    console.log(`${field}:`);
    console.log(`  importerColumns: ${JSON.stringify(data?.importerColumns || [])}`);
    console.log('');
  }
}

checkRicsColor().catch(console.error);
