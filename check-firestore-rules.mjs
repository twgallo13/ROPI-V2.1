#!/usr/bin/env node
/**
 * Firestore Completion Rules Checker
 * 
 * Checks if settings/exportSettings/completionRules exists in staging Firestore
 * and displays top-level keys (no secrets).
 * 
 * Usage: node check-firestore-rules.mjs
 */

import admin from 'firebase-admin';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';
import { readFileSync } from 'fs';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

// Initialize Firebase Admin SDK
const serviceAccountPath = process.env.GOOGLE_APPLICATION_CREDENTIALS || 
  join(__dirname, '.firebase-credentials.json');

try {
  const serviceAccount = JSON.parse(readFileSync(serviceAccountPath, 'utf8'));
  
  admin.initializeApp({
    credential: admin.credential.cert(serviceAccount),
    projectId: serviceAccount.project_id
  });
  
  console.log(`✅ Connected to Firebase project: ${serviceAccount.project_id}`);
} catch (err) {
  console.error('❌ Error initializing Firebase:', err.message);
  console.error('Set GOOGLE_APPLICATION_CREDENTIALS env var or place .firebase-credentials.json in workspace root');
  process.exit(1);
}

async function checkCompletionRules() {
  const db = admin.firestore();
  const docPath = 'settings/exportSettings/completionRules';
  
  console.log(`\n🔍 Checking Firestore document: ${docPath}\n`);
  
  try {
    const docRef = db.doc(docPath);
    const snapshot = await docRef.get();
    
    if (!snapshot.exists) {
      console.log('❌ Document does NOT exist');
      console.log('\nℹ️  To create it, you can:');
      console.log('   1. Use the Export Settings UI at /settings/export-settings');
      console.log('   2. Or create manually with this structure:');
      console.log(JSON.stringify({
        schemaVersion: '1.0.0',
        rulesVersion: 1,
        exportUnlockThresholdPct: 80,
        segments: [
          {
            id: 'description-seo',
            name: 'Description & SEO',
            enabled: true,
            weightPct: 60,
            ruleType: 'ALL_REQUIRED',
            appliesTo: { mode: 'SELECTED_SITES', sites: ['shiekh', 'karmaloop', 'mltd'] }
          }
        ],
        builtInSegments: {},
        exclusions: {
          media: { affectsCompletion: false, reason: 'Governance policy' },
          pricing: { affectsCompletion: false, reason: 'Governance policy' }
        },
        updatedAt: new Date().toISOString(),
        updatedBy: 'system'
      }, null, 2));
      return;
    }
    
    const data = snapshot.data();
    console.log('✅ Document EXISTS\n');
    console.log('📋 Top-level keys:');
    Object.keys(data).forEach(key => {
      const value = data[key];
      let displayValue = value;
      
      // Redact sensitive values, show types for complex objects
      if (key === 'updatedBy') {
        displayValue = `"${value}"`;
      } else if (Array.isArray(value)) {
        displayValue = `Array(${value.length})`;
      } else if (typeof value === 'object' && value !== null) {
        displayValue = `Object{${Object.keys(value).join(', ')}}`;
      } else if (typeof value === 'string') {
        displayValue = `"${value}"`;
      }
      
      console.log(`  - ${key}: ${displayValue}`);
    });
    
    console.log('\n📊 Configuration summary:');
    console.log(`  Threshold: ${data.exportUnlockThresholdPct}%`);
    console.log(`  Segments: ${data.segments?.length || 0}`);
    console.log(`  Enabled segments: ${data.segments?.filter(s => s.enabled).length || 0}`);
    console.log(`  Schema version: ${data.schemaVersion}`);
    console.log(`  Rules version: ${data.rulesVersion}`);
    console.log(`  Last updated: ${data.updatedAt}`);
    console.log(`  Updated by: ${data.updatedBy}`);
    
    if (data.segments && data.segments.length > 0) {
      console.log('\n📦 Segments:');
      data.segments.forEach((seg, i) => {
        console.log(`  ${i + 1}. ${seg.name} (${seg.id})`);
        console.log(`     - Enabled: ${seg.enabled}`);
        console.log(`     - Weight: ${seg.weightPct}%`);
        console.log(`     - Rule type: ${seg.ruleType}`);
        console.log(`     - Applies to: ${seg.appliesTo.mode} ${seg.appliesTo.mode === 'SELECTED_SITES' ? `[${seg.appliesTo.sites.join(', ')}]` : ''}`);
      });
    }
    
  } catch (err) {
    console.error('❌ Error reading document:', err.message);
    process.exit(1);
  }
}

checkCompletionRules()
  .then(() => {
    console.log('\n✅ Check complete');
    process.exit(0);
  })
  .catch(err => {
    console.error('❌ Fatal error:', err);
    process.exit(1);
  });
