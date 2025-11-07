#!/usr/bin/env ts-node

/**
 * Firestore Seed Script
 * Seeds initial settings data to Firestore
 * Run with: npm run seed
 */

import { initializeApp, cert, type ServiceAccount } from 'firebase-admin/app';
import { getFirestore } from 'firebase-admin/firestore';
import * as dotenv from 'dotenv';
import { readFileSync, existsSync } from 'fs';
import { resolve } from 'path';

// Load environment variables
dotenv.config({ path: resolve(__dirname, '../.env.local') });

// Initialize Firebase Admin
let app;
try {
  // Try to use service account if available
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
    // Fallback to environment variables
    const projectId = process.env.VITE_FIREBASE_PROJECT_ID || 'ropi-bccee';
    console.log(`Using project ID: ${projectId}`);
    app = initializeApp({
      projectId,
    });
  }
} catch (error) {
  console.error('Failed to initialize Firebase Admin:', error);
  process.exit(1);
}

const db = getFirestore(app);

// Seed data
const settingsData = {
  ai: {
    model: 'gemini-1.5-flash',
    temperature: 0.4,
    tone: 'neutral',
    allowAutoWithoutContext: false,
  },
  vocab: {
    banned: ['100% authentic', 'cheap'],
    synonyms: {
      grey: 'gray',
    },
  },
};

async function seedSettings() {
  try {
    console.log('🌱 Starting Firestore seed...\n');

    // Seed AI settings
    console.log('📝 Writing /settings/ai...');
    await db.collection('settings').doc('ai').set(settingsData.ai);
    console.log('✅ AI settings seeded successfully');

    // Seed Vocabulary settings
    console.log('📝 Writing /settings/vocab...');
    await db.collection('settings').doc('vocab').set(settingsData.vocab);
    console.log('✅ Vocabulary settings seeded successfully');

    console.log('\n🎉 Seed completed successfully!');
    console.log('\nSeeded documents:');
    console.log('  - /settings/ai');
    console.log('  - /settings/vocab');
    
    process.exit(0);
  } catch (error) {
    console.error('❌ Error seeding Firestore:', error);
    process.exit(1);
  }
}

// Run the seed function
seedSettings();
