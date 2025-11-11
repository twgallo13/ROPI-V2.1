#!/usr/bin/env ts-node

/**
 * Firestore Seed Script for New Vocab Collections
 * Seeds the following collections under /settings with an items subcollection:
 *  - primaryColors
 *  - descriptiveColors
 *  - cutTypes
 *  - closureTypes
 *  - heelHeights
 *  - platformHeights
 *
 * Each item is a document with shape: { value: string, label: string }
 *
 * Run with:
 *   npx ts-node scripts/seedNewVocab.ts
 */

import { initializeApp, cert, type ServiceAccount } from 'firebase-admin/app';
import { getFirestore, FieldValue } from 'firebase-admin/firestore';
import dotenv from 'dotenv';
import path from 'path';
import fs from 'fs';

// Load environment variables from .env.local if present (keeps parity with other seed scripts)
dotenv.config({ path: path.resolve(path.dirname(new URL(import.meta.url).pathname), '../.env.local') });

// Initialize Firebase Admin similarly to other seed scripts (try service account, fallback to projectId)
let app;
try {
  const serviceAccountPath = process.env.GOOGLE_APPLICATION_CREDENTIALS || path.resolve(path.dirname(new URL(import.meta.url).pathname), '../service-account.json');
  if (fs.existsSync(serviceAccountPath)) {
    const serviceAccount = JSON.parse(fs.readFileSync(serviceAccountPath, 'utf8')) as ServiceAccount;
    app = initializeApp({ credential: cert(serviceAccount) });
  } else {
    const projectId = process.env.VITE_FIREBASE_PROJECT_ID || process.env.GCLOUD_PROJECT || process.env.GOOGLE_CLOUD_PROJECT || 'ropi-bccee';
    console.log(`Using project ID: ${projectId}`);
    app = initializeApp({ projectId });
  }
} catch (err) {
  console.error('Failed to initialize Firebase Admin:', err);
  process.exit(1);
}

const db = getFirestore(app);

// ---- Data to seed ----
const collections: Record<string, string[]> = {
  primaryColors: ['Black', 'White', 'Red', 'Blue'],
  descriptiveColors: ['Rose Gold', 'Patent-leather'],
  cutTypes: ['Low', 'Mid', 'High'],
  closureTypes: ['Lace-up', 'Buckle', 'Zip-up'],
  heelHeights: ['0–1"', '2–3"', '4–5"', '5"+'],
  platformHeights: ['Flat', 'Medium (1–2")', 'High (2–3")'],
};

function slugify(input: string): string {
  return input
    .toLowerCase()
    .normalize('NFKD')
    .replace(/[\u0300-\u036f]/g, '') // strip diacritics
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/(^-|-$)+/g, '');
}

async function seedCollection(settingsKey: string, values: string[]) {
  const colPath = `settings/${settingsKey}/items`;
  let writes = 0;

  for (const value of values) {
    const id = slugify(value);
    const docRef = db.collection(colPath).doc(id);

    // Upsert to make script idempotent
    await docRef.set(
      { value, label: value, updatedAt: FieldValue.serverTimestamp() },
      { merge: true }
    );
    writes += 1;
  }

  console.log(`✅ Seeded ${writes} item(s) to /${colPath}`);
}

async function main() {
  try {
    console.log('🌱 Seeding new settings vocab collections...');

    for (const [key, values] of Object.entries(collections)) {
      console.log(`\n📝 Seeding: /settings/${key}/items`);
      await seedCollection(key, values);
    }

    console.log('\n🎉 All vocab collections seeded successfully.');
    process.exit(0);
  } catch (err) {
    console.error('❌ Error while seeding vocab collections:', err);
    process.exit(1);
  }
}

main();
