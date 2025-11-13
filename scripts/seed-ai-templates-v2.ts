/**
 * Seed AI Templates (P14.1 - Enhanced with structured config)
 * Run with: npx ts-node scripts/seed-ai-templates-v2.ts
 */

import * as admin from 'firebase-admin';
import * as fs from 'fs';
import * as path from 'path';

// Initialize Firebase Admin (reads from GOOGLE_APPLICATION_CREDENTIALS env var or default credentials)
if (!admin.apps.length) {
  admin.initializeApp();
}

async function seedTemplates() {
  const db = admin.firestore();
  const seedFilePath = path.join(__dirname, 'ai-templates-seed-v2.json');

  console.log('[seed] Loading seed data from:', seedFilePath);
  
  const seedData = JSON.parse(fs.readFileSync(seedFilePath, 'utf-8'));
  const templates = seedData.templates;

  console.log(`[seed] Found ${templates.length} templates to seed`);

  for (const template of templates) {
    const { key, ...data } = template;

    // Convert banned_terms to array if it's a string
    if (typeof data.banned_terms === 'string') {
      data.banned_terms = data.banned_terms
        .split(',')
        .map((t: string) => t.trim())
        .filter((t: string) => t.length > 0);
    }

    // Set metadata
    data.updatedBy = 'seed-script';
    data.updatedAt = admin.firestore.FieldValue.serverTimestamp();

    console.log(`[seed] Writing template: ${key} (v${data.version}) - ${data.status || 'active'}`);

    try {
      await db
        .collection('settings')
        .doc('ai')
        .collection('prompts')
        .doc(key)
        .set(data, { merge: true });
      
      console.log(`[seed] ✓ Successfully wrote template: ${key}`);
    } catch (error) {
      console.error(`[seed] ✗ Failed to write template: ${key}`, error);
    }
  }

  console.log('[seed] Seeding complete!');
  process.exit(0);
}

seedTemplates().catch((error) => {
  console.error('[seed] Fatal error:', error);
  process.exit(1);
});
