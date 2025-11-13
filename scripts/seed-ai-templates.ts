import * as admin from 'firebase-admin';
import * as fs from 'fs';
import * as path from 'path';

// Initialize Firebase Admin if not already initialized
if (!admin.apps.length) {
  admin.initializeApp();
}

const db = admin.firestore();

interface AITemplate {
  key: string;
  scope: string;
  title: string;
  prompt_body: string;
  seo_rules: string;
  tone_rules: string;
  length_rules: string;
  examples: Array<{ label: string; input: string; output: string }>;
  banned_terms: string | string[];
  version: string;
  updatedBy: string;
  updatedAt: any;
}

async function seedAITemplates() {
  try {
    console.log('[seedAITemplates] Starting...');

    // Load seed data
    const seedPath = path.join(__dirname, '../scripts/ai-templates-seed.json');
    const seedData = JSON.parse(fs.readFileSync(seedPath, 'utf-8'));

    const templates: AITemplate[] = seedData.templates;

    for (const template of templates) {
      // Convert banned_terms string to array if needed
      const bannedTerms = typeof template.banned_terms === 'string'
        ? template.banned_terms.split(',').map(t => t.trim()).filter(t => t.length > 0)
        : template.banned_terms;

      const templateData: any = {
        key: template.key,
        scope: template.scope,
        title: template.title,
        prompt_body: template.prompt_body,
        seo_rules: template.seo_rules,
        tone_rules: template.tone_rules,
        length_rules: template.length_rules,
        examples: template.examples,
        banned_terms: bannedTerms,
        version: template.version,
        updatedBy: 'system',
        updatedAt: admin.firestore.FieldValue.serverTimestamp(),
      };

      await db
        .collection('settings')
        .doc('ai')
        .collection('prompts')
        .doc(template.key)
        .set(templateData);

      console.log(`[seedAITemplates] Seeded template: ${template.key}`);
    }

    console.log(`[seedAITemplates] Successfully seeded ${templates.length} templates`);
    process.exit(0);
  } catch (error) {
    console.error('[seedAITemplates] Error:', error);
    process.exit(1);
  }
}

seedAITemplates();
