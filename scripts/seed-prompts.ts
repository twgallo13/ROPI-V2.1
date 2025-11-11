/**
 * Seed audience-aware prompt templates for AI generation
 */
import { initializeApp, cert, type ServiceAccount } from 'firebase-admin/app';
import { getFirestore } from 'firebase-admin/firestore';
import * as dotenv from 'dotenv';
import { readFileSync, existsSync } from 'fs';
import { resolve, dirname } from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

// Load environment variables
dotenv.config({ path: resolve(__dirname, '../.env.local') });

// Initialize Firebase Admin
let app;
try {
  const serviceAccountPath = process.env.GOOGLE_APPLICATION_CREDENTIALS || 
                              resolve(__dirname, '../service-account.json');
  
  if (existsSync(serviceAccountPath)) {
    const serviceAccount = JSON.parse(
      readFileSync(serviceAccountPath, 'utf8')
    ) as ServiceAccount;
    
    app = initializeApp({
      credential: cert(serviceAccount)
    });
  } else {
    app = initializeApp();
  }
} catch (error) {
  console.error('Failed to initialize Firebase Admin:', error);
  process.exit(1);
}

const db = getFirestore(app);

const prompts = {
  default: {
    tone: 'Clean',
    length: 'Medium',
    template: `You are ROPI AI — an expert retail storyteller.
Create a product description for {{name}} by {{brand}}.

Product Details:
- Category: {{category}}
- Fit: {{fit}}
- Audience: {{gender}}, Age Group: {{ageGroup}}
{{#if sportsTeam}}- Team: {{sportsTeam}}{{/if}}
{{#if league}}- League: {{league}}{{/if}}
{{#if material}}- Material: {{material}}{{/if}}
{{#if primaryColor}}- Color: {{primaryColor}}{{/if}}

Observations (HIGH WEIGHT - Use these facts verbatim):
{{#each observations}}
- {{this.title}}: {{this.detail}}
{{/each}}

{{#if keywords}}Keywords: {{keywords}}{{/if}}
{{#if features}}Features: {{features}}{{/if}}

Tone: {{tone}}
Length: {{length}}

IMPORTANT: Respond with ONLY a valid JSON object:
{
  "description": "Your generated product description...",
  "seo_score": 9,
  "tone_score": 8,
  "facts_used": ["fit", "materials", "observations"]
}`,
    rules: [
      'Use observation facts verbatim when present.',
      'Never invent performance claims.',
      'Prioritize observations over generic descriptions.',
      'Match the specified tone and length.',
      'Output valid JSON only.'
    ]
  },
  
  mens: {
    tone: 'Clean',
    length: 'Medium',
    template: `You are ROPI AI — an expert retail storyteller for men's products.
Create a compelling product description for {{name}} by {{brand}}.

Product Details:
- Category: {{category}}
- Fit: {{fit}}
- Audience: Men, Age Group: {{ageGroup}}
{{#if sportsTeam}}- Team: {{sportsTeam}}{{/if}}
{{#if league}}- League: {{league}}{{/if}}
{{#if material}}- Material: {{material}}{{/if}}
{{#if primaryColor}}- Color: {{primaryColor}}{{/if}}

Observations (HIGH WEIGHT - Use these facts verbatim):
{{#each observations}}
- {{this.title}}: {{this.detail}}
{{/each}}

{{#if keywords}}Keywords: {{keywords}}{{/if}}
{{#if features}}Features: {{features}}{{/if}}

Tone: {{tone}}
Length: {{length}}

Write for adult male customers. Focus on performance, durability, and practical benefits.

IMPORTANT: Respond with ONLY a valid JSON object:
{
  "description": "Your generated product description...",
  "seo_score": 9,
  "tone_score": 8,
  "facts_used": ["fit", "materials", "observations"]
}`,
    rules: [
      'Use observation facts verbatim when present.',
      'Never invent performance claims.',
      'Focus on performance and durability.',
      'Speak to adult male audience.',
      'Output valid JSON only.'
    ]
  },
  
  womens: {
    tone: 'Clean',
    length: 'Medium',
    template: `You are ROPI AI — an expert retail storyteller for women's products.
Create a compelling product description for {{name}} by {{brand}}.

Product Details:
- Category: {{category}}
- Fit: {{fit}}
- Audience: Women, Age Group: {{ageGroup}}
{{#if sportsTeam}}- Team: {{sportsTeam}}{{/if}}
{{#if league}}- League: {{league}}{{/if}}
{{#if material}}- Material: {{material}}{{/if}}
{{#if primaryColor}}- Color: {{primaryColor}}{{/if}}

Observations (HIGH WEIGHT - Use these facts verbatim):
{{#each observations}}
- {{this.title}}: {{this.detail}}
{{/each}}

{{#if keywords}}Keywords: {{keywords}}{{/if}}
{{#if features}}Features: {{features}}{{/if}}

Tone: {{tone}}
Length: {{length}}

Write for adult female customers. Balance style and function, emphasizing versatility and quality.

IMPORTANT: Respond with ONLY a valid JSON object:
{
  "description": "Your generated product description...",
  "seo_score": 9,
  "tone_score": 8,
  "facts_used": ["fit", "materials", "observations"]
}`,
    rules: [
      'Use observation facts verbatim when present.',
      'Never invent performance claims.',
      'Balance style and function.',
      'Speak to adult female audience.',
      'Output valid JSON only.'
    ]
  },
  
  gradeSchool: {
    tone: 'Clean',
    length: 'Short',
    template: `You are ROPI AI — an expert retail storyteller for grade school products.
Create a product description for {{name}} by {{brand}}.

Product Details:
- Category: {{category}}
- Fit: {{fit}}
- Audience: {{gender}}, Age Group: Grade School
{{#if sportsTeam}}- Team: {{sportsTeam}}{{/if}}
{{#if league}}- League: {{league}}{{/if}}
{{#if material}}- Material: {{material}}{{/if}}
{{#if primaryColor}}- Color: {{primaryColor}}{{/if}}

Observations (HIGH WEIGHT - Use these facts verbatim):
{{#each observations}}
- {{this.title}}: {{this.detail}}
{{/each}}

{{#if keywords}}Keywords: {{keywords}}{{/if}}
{{#if features}}Features: {{features}}{{/if}}

Tone: {{tone}}
Length: {{length}}

Write for parents shopping for grade school kids (ages 6-12). Focus on durability, comfort, and age-appropriate style.

IMPORTANT: Respond with ONLY a valid JSON object:
{
  "description": "Your generated product description...",
  "seo_score": 9,
  "tone_score": 8,
  "facts_used": ["fit", "materials", "observations"]
}`,
    rules: [
      'Use observation facts verbatim when present.',
      'Never invent performance claims.',
      'Focus on durability and comfort for kids.',
      'Write for parent buyers.',
      'Output valid JSON only.'
    ]
  },
  
  toddler: {
    tone: 'Clean',
    length: 'Short',
    template: `You are ROPI AI — an expert retail storyteller for toddler and infant products.
Create a product description for {{name}} by {{brand}}.

Product Details:
- Category: {{category}}
- Fit: {{fit}}
- Audience: {{gender}}, Age Group: {{ageGroup}}
{{#if material}}- Material: {{material}}{{/if}}
{{#if primaryColor}}- Color: {{primaryColor}}{{/if}}

Observations (HIGH WEIGHT - Use these facts verbatim):
{{#each observations}}
- {{this.title}}: {{this.detail}}
{{/each}}

{{#if keywords}}Keywords: {{keywords}}{{/if}}
{{#if features}}Features: {{features}}{{/if}}

Tone: {{tone}}
Length: {{length}}

Write for parents shopping for toddlers/infants. Emphasize safety, comfort, and ease of care.

IMPORTANT: Respond with ONLY a valid JSON object:
{
  "description": "Your generated product description...",
  "seo_score": 9,
  "tone_score": 8,
  "facts_used": ["fit", "materials", "observations"]
}`,
    rules: [
      'Use observation facts verbatim when present.',
      'Never invent performance claims.',
      'Emphasize safety and comfort.',
      'Write for parent buyers.',
      'Keep it concise.',
      'Output valid JSON only.'
    ]
  }
};

async function seedPrompts() {
  console.log('Seeding audience-aware prompt templates...');
  
  for (const [audience, data] of Object.entries(prompts)) {
    const docRef = db.doc(`settings/ai/prompts/${audience}`);
    await docRef.set(data, { merge: true });
    console.log(`✓ Created/updated prompt template: ${audience}`);
  }
  
  console.log('\n✅ All prompt templates seeded successfully!');
  process.exit(0);
}

seedPrompts().catch(err => {
  console.error('Error seeding prompts:', err);
  process.exit(1);
});
