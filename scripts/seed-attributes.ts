#!/usr/bin/env ts-node

/**
 * Firestore Seed Script for Attributes
 * Seeds /settings/attributes with starter vocabulary data
 * Run with: npm run seed:attributes
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

// Seed data for attributes
const attributesData = {
  departments: ['Footwear', 'Apparel', 'Accessories'],
  classes: ['Running', 'Basketball', 'Lifestyle', 'Tops', 'Hoodies', 'Hats'],
  categories: ['Shoes', 'Tops', 'Hoodies', 'Hats', 'Pants', 'Shorts', 'Jerseys', 'Bottoms', 'Bags'],
  ageGroups: ['Adult', 'Youth', 'Toddler'],
  genders: ['Mens', 'Womens', 'Unisex'],
  statuses: ['intake', 'in-progress', 'validated', 'uploaded'],
  websites: ['Shiekh.com', 'Karmaloop.com'],
  sportsTeams: ['Lakers', 'Dodgers', 'Raiders', '49ers'],
  leagues: ['NBA', 'MLB', 'NFL'],
};

async function seedAttributes() {
  try {
    console.log('🌱 Starting attributes seed...\n');

    console.log('📝 Writing /settings/attributes...');
    await db.collection('settings').doc('attributes').set(attributesData);
    console.log('✅ Attributes seeded successfully');

    console.log('\n🎉 Seed completed successfully!');
    console.log('\nSeeded document:');
    console.log('  - /settings/attributes');
    console.log('\nAttribute keys:');
    Object.keys(attributesData).forEach(key => {
      const count = (attributesData as any)[key].length;
      console.log(`    - ${key}: ${count} items`);
    });
    
    process.exit(0);
  } catch (error) {
    console.error('❌ Error seeding attributes:', error);
    process.exit(1);
  }
}

// Run the seed function
seedAttributes();
