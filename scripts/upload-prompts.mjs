/**
 * Upload audience-aware prompt templates to Firestore
 * Uses Firebase client SDK with admin access
 */
import { initializeApp } from 'firebase/app';
import { getFirestore, doc, setDoc } from 'firebase/firestore';
import { readFileSync } from 'fs';
import { resolve, dirname } from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

// Firebase config (read from environment variables)
const firebaseConfig = {
  apiKey: process.env.VITE_FIREBASE_API_KEY || process.env.FIREBASE_API_KEY || 'REPLACE_ME',
  authDomain: process.env.VITE_FIREBASE_AUTH_DOMAIN || 'ropi-bccee.firebaseapp.com',
  projectId: process.env.VITE_FIREBASE_PROJECT_ID || 'ropi-bccee',
  storageBucket: process.env.VITE_FIREBASE_STORAGE_BUCKET || 'ropi-bccee.firebasestorage.app',
  messagingSenderId: process.env.VITE_FIREBASE_MESSAGING_SENDER_ID || '',
  appId: process.env.VITE_FIREBASE_APP_ID || ''
};

if (!firebaseConfig.apiKey || firebaseConfig.apiKey === 'REPLACE_ME') {
  console.error('Missing Firebase API key. Set VITE_FIREBASE_API_KEY (for local dev) or FIREBASE_API_KEY (for Node) in the environment.');
  process.exit(1);
}

const app = initializeApp(firebaseConfig);
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

async function uploadPrompts() {
  console.log('Uploading audience-aware prompt templates to Firestore...\n');
  
  for (const [audience, data] of Object.entries(prompts)) {
    try {
      const docRef = doc(db, 'settings', 'ai', 'prompts', audience);
      await setDoc(docRef, data, { merge: true });
      console.log(`✓ Uploaded prompt template: ${audience}`);
    } catch (error) {
      console.error(`✗ Failed to upload ${audience}:`, error.message);
    }
  }
  
  console.log('\n✅ All prompt templates uploaded successfully!');
  process.exit(0);
}

uploadPrompts().catch(err => {
  console.error('Error uploading prompts:', err);
  process.exit(1);
});
