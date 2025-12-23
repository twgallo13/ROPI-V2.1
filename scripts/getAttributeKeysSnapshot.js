#!/usr/bin/env node
/**
 * LP-ATTR-1.1.0: Get Attribute Keys Snapshot from Firestore
 * 
 * Queries settings/attributes/keys/* and outputs a snapshot
 */

const admin = require('firebase-admin');
const fs = require('fs');
const path = require('path');

// Parse CLI args
const args = process.argv.slice(2);
const outIdx = args.indexOf('--out');
const outPath = outIdx !== -1 && args[outIdx + 1] ? args[outIdx + 1] : null;
const sampleIdx = args.indexOf('--sample');
const sampleKeys = sampleIdx !== -1 && args[sampleIdx + 1] ? args[sampleIdx + 1].split(',') : ['age_group', 'primary_color', 'descriptive_color', 'gender', 'material'];

// Set credentials if not already set
if (!process.env.GOOGLE_APPLICATION_CREDENTIALS) {
  const saPath = path.resolve(__dirname, '../service-account.json');
  if (fs.existsSync(saPath)) {
    process.env.GOOGLE_APPLICATION_CREDENTIALS = saPath;
  } else {
    console.error('❌ No GOOGLE_APPLICATION_CREDENTIALS set and no service-account.json found');
    process.exit(1);
  }
}

async function main() {
  // Initialize Firebase Admin
  if (!admin.apps.length) {
    admin.initializeApp();
  }
  
  const db = admin.firestore();
  const keysCollection = db.collection('settings/attributes/keys');
  
  console.log(`\n📋 Fetching attribute keys from Firestore...`);
  
  const snapshot = await keysCollection.get();
  
  console.log(`   Total keys: ${snapshot.size}`);
  
  const allKeys = [];
  const sampleDocs = [];
  
  snapshot.forEach(doc => {
    const data = doc.data();
    allKeys.push({
      attribute_id: doc.id,
      canonical: data.canonical,
      source: data.source,
      definition_version: data.definition_version,
      data_type: data.data_type,
      label: data.label,
      required_for_completion: data.required_for_completion,
      required_for_export: data.required_for_export,
      has_aliases: Array.isArray(data.aliases) && data.aliases.length > 0,
      has_allowed_values: Array.isArray(data.allowed_values) && data.allowed_values.length > 0,
      updatedAt: data.updatedAt
    });
    
    if (sampleKeys.includes(doc.id)) {
      sampleDocs.push({ id: doc.id, data });
    }
  });
  
  // Check canonical fields presence
  const withCanonical = allKeys.filter(k => k.canonical === true).length;
  const withSource = allKeys.filter(k => k.source === 'repo').length;
  const withVersion = allKeys.filter(k => k.definition_version).length;
  const withAliases = allKeys.filter(k => k.has_aliases).length;
  
  console.log(`\n📊 Field Presence Summary:`);
  console.log(`   canonical: true  → ${withCanonical}/${allKeys.length}`);
  console.log(`   source: 'repo'   → ${withSource}/${allKeys.length}`);
  console.log(`   definition_version → ${withVersion}/${allKeys.length}`);
  console.log(`   aliases (non-empty) → ${withAliases}/${allKeys.length}`);
  
  console.log(`\n🔍 Sample Documents:`);
  for (const sample of sampleDocs) {
    console.log(`\n   ${sample.id}:`);
    console.log(`     canonical: ${sample.data.canonical}`);
    console.log(`     source: ${sample.data.source}`);
    console.log(`     definition_version: ${sample.data.definition_version}`);
    console.log(`     data_type: ${sample.data.data_type}`);
    console.log(`     aliases: ${JSON.stringify(sample.data.aliases || [])}`);
    if (sample.data.allowed_values) {
      console.log(`     allowed_values: ${sample.data.allowed_values.length} items`);
    }
  }
  
  const output = {
    timestamp: new Date().toISOString(),
    totalKeys: allKeys.length,
    fieldPresence: {
      canonical: withCanonical,
      source_repo: withSource,
      definition_version: withVersion,
      aliases_populated: withAliases
    },
    allKeys,
    sampleDocs: sampleDocs.map(s => ({ id: s.id, ...s.data }))
  };
  
  if (outPath) {
    fs.writeFileSync(outPath, JSON.stringify(output, null, 2));
    console.log(`\n📄 Output saved to: ${outPath}`);
  }
  
  // Verification status
  const allCanonical = withCanonical === allKeys.length;
  const allSourceRepo = withSource === allKeys.length;
  
  console.log(`\n========================================`);
  console.log(`Verification: ${allCanonical && allSourceRepo ? '✅ PASS' : '⚠️ PARTIAL'}`);
  console.log(`========================================\n`);
  
  process.exit(0);
}

main().catch(err => {
  console.error('Error:', err);
  process.exit(1);
});
