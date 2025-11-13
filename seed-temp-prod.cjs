/**
 * Production seed script for AI Templates
 * Uses CommonJS for compatibility
 */
const admin = require('firebase-admin');
const fs = require('fs');
const path = require('path');

// Initialize Firebase Admin
if (!admin.apps.length) {
  admin.initializeApp({
    projectId: 'ropi-bccee'
  });
}

async function seedTemplates() {
  const db = admin.firestore();
  const seedFilePath = path.join(__dirname, 'scripts', 'ai-templates-seed-v2.json');

  console.log('[seed] Loading seed data from:', seedFilePath);
  
  const seedData = JSON.parse(fs.readFileSync(seedFilePath, 'utf-8'));
  const templates = seedData.templates;

  console.log(`[seed] Found ${templates.length} templates to seed`);
  console.log(`[seed] Target project: ${admin.app().options.projectId}`);

  for (const template of templates) {
    const { key, ...data } = template;

    // Convert banned_terms to array if it's a string
    if (typeof data.banned_terms === 'string') {
      data.banned_terms = data.banned_terms
        .split(',')
        .map(t => t.trim())
        .filter(t => t.length > 0);
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

  console.log('\n[seed] ========================================');
  console.log('[seed] Seeding complete!');
  console.log('[seed] ========================================');
  console.log('[seed] Templates written to: settings/ai/prompts/{key}');
  console.log('[seed] Total templates: ' + templates.length);
  console.log('[seed] Verify at: https://console.firebase.google.com/project/ropi-bccee/firestore');
  process.exit(0);
}

seedTemplates().catch((error) => {
  console.error('[seed] Fatal error:', error);
  process.exit(1);
});
