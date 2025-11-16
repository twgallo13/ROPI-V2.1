#!/usr/bin/env ts-node
/**
 * Count vocab items in Firestore settings collections
 * Reports exact doc counts for verification
 */

import { initializeApp, cert, type ServiceAccount } from 'firebase-admin/app';
import { getFirestore } from 'firebase-admin/firestore';
import * as dotenv from 'dotenv';
import { readFileSync, existsSync } from 'fs';
import { resolve, dirname } from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

dotenv.config({ path: resolve(__dirname, '../.env.local') });

let app;
try {
  const serviceAccountPath = process.env.GOOGLE_APPLICATION_CREDENTIALS || 
                              resolve(__dirname, '../service-account.json');
  
  if (existsSync(serviceAccountPath)) {
    const serviceAccount = JSON.parse(
      readFileSync(serviceAccountPath, 'utf8')
    ) as ServiceAccount;
    
    app = initializeApp({
      credential: cert(serviceAccount),
    });
  } else {
    const projectId = process.env.VITE_FIREBASE_PROJECT_ID || 'ropi-bccee';
    app = initializeApp({ projectId });
  }
} catch (error) {
  console.error('Failed to initialize Firebase Admin:', error);
  process.exit(1);
}

const db = getFirestore(app);

async function countVocabItems() {
  const vocabs = [
    'collections',
    'madeIn',
    'heelTypes',
    'soleMaterials',
    'shoeHeightMaps',
    'taxClasses',
    'primaryColors',
    'descriptiveColors',
    'cutTypes',
    'closureTypes',
    'heelHeights',
    'platformHeights',
  ];

  const counts: Record<string, number> = {};

  for (const vocab of vocabs) {
    try {
      const snapshot = await db.collection('settings').doc(vocab).collection('items').get();
      counts[vocab] = snapshot.size;
    } catch (error) {
      counts[vocab] = 0;
    }
  }

  console.log(JSON.stringify(counts, null, 2));
  process.exit(0);
}

countVocabItems();
