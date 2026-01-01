#!/usr/bin/env node
/**
 * Verify Attributes Meta Script
 * 
 * LP-observations-consolidation-1.5.0: Phase readiness check
 * 
 * Verifies that Firestore settings/attributesMeta.registry_version
 * matches the local attributeRegistry.json version.
 * 
 * Usage:
 *   node scripts/verify-attributes-meta.js <service-account-json>
 *   node scripts/verify-attributes-meta.js --project <project-id>
 *   node scripts/verify-attributes-meta.js --skip-firestore
 * 
 * Environment:
 *   GOOGLE_APPLICATION_CREDENTIALS - Path to service account JSON
 */

const admin = require('firebase-admin');
const fs = require('fs');
const path = require('path');

// Parse arguments
const args = process.argv.slice(2);
const skipFirestore = args.includes('--skip-firestore');
const projectIdx = args.indexOf('--project');
const projectId = projectIdx !== -1 ? args[projectIdx + 1] : null;

// Find service account file
let keyFile = null;
if (!skipFirestore) {
  // Check for explicit path argument
  const explicitPath = args.find(a => a.endsWith('.json') && !a.startsWith('--'));
  if (explicitPath) {
    keyFile = explicitPath;
  } else if (process.env.GOOGLE_APPLICATION_CREDENTIALS) {
    keyFile = process.env.GOOGLE_APPLICATION_CREDENTIALS;
  } else if (fs.existsSync('./service-account.json')) {
    keyFile = './service-account.json';
  }
}

// Read local registry version first
const registryPath = path.resolve(__dirname, '../packages/sdk/config/attributeRegistry.json');
let localRegistry;
let verLocal;

try {
  localRegistry = JSON.parse(fs.readFileSync(registryPath, 'utf8'));
  verLocal = localRegistry.version;
  console.log('📦 Local attributeRegistry.json version:', verLocal);
} catch (err) {
  console.error('❌ Failed to read local attributeRegistry.json:', err.message);
  process.exit(2);
}

if (skipFirestore) {
  console.log('\n⚠️ Skipping Firestore verification (--skip-firestore flag)');
  console.log('✅ Local registry version verified:', verLocal);
  process.exit(0);
}

if (!keyFile) {
  console.error('❌ No service account credentials found.');
  console.error('   Provide a path to service account JSON, set GOOGLE_APPLICATION_CREDENTIALS,');
  console.error('   or use --skip-firestore to skip Firestore verification.');
  process.exit(2);
}

console.log('🔑 Using service account:', keyFile);

const key = JSON.parse(fs.readFileSync(keyFile, 'utf8'));
admin.initializeApp({ 
  credential: admin.credential.cert(key),
  projectId: projectId || key.project_id
});
const db = admin.firestore();

(async () => {
  console.log('\n🔍 Checking Firestore settings/attributesMeta...');
  
  // LP-service-account-ropi-deploy-1.0.0: Check correct path settings/attributesMeta
  const metaRef = db.collection('settings').doc('attributesMeta');
  const metaSnap = await metaRef.get();
  
  if (!metaSnap.exists) {
    console.error('ERROR: settings/attributesMeta not found.');
    // Try to check if attributes exist at all
    const keysCol = db.collection('settings/attributes/keys');
    const keysSnapshot = await keysCol.limit(1).get();
    if (keysSnapshot.empty) {
      console.error('ERROR: No attributes found in settings/attributes/keys');
      process.exit(3);
    }
    console.log('Found attributes in settings/attributes/keys but meta document not yet written.');
    const sampleKeys = await keysCol.limit(5).get();
    console.log('Sample attribute ids:', sampleKeys.docs.map(d => d.id));
    console.log('Note: Meta document not found. Run sync with dryRun=false to create it.');
    process.exit(1);
  }
  
  const meta = metaSnap.data();
  console.log('📄 settings/attributesMeta:', JSON.stringify(meta, null, 2));

  console.log('\n📦 Local attributeRegistry.json version:', verLocal);
  
  if (meta.registry_version === verLocal) {
    console.log('✅ OK: registry_version matches local file.');
  } else {
    console.error('❌ MISMATCH: registry_version (' + meta.registry_version + ') != local file version (' + verLocal + ')');
    process.exit(1);
  }

  // Sample attribute to verify definition_version and syncedAt
  // Skip internal docs starting with underscore
  const keysSnapshot = await db.collection('settings/attributes/keys')
    .where('attribute_id', '>=', 'a')  // Only get actual attributes, skip _meta etc
    .limit(5)
    .get();
  console.log('\nSample attributes with definition_version:');
  keysSnapshot.docs.forEach(doc => {
    const data = doc.data();
    console.log(`  ${doc.id}: definition_version=${data.definition_version}, syncedAt=${data.syncedAt}, syncedBy=${data.syncedBy}`);
  });
  
  // Verify at least one has correct definition_version
  const hasCorrectVersion = keysSnapshot.docs.some(doc => doc.data().definition_version === verLocal);
  if (hasCorrectVersion) {
    console.log('\n✅ Verification complete: Meta and attribute definition_version match registry version.');
    process.exit(0);
  } else {
    console.warn('\n⚠️ Warning: No sampled attributes have definition_version matching registry version.');
    process.exit(1);
  }
})();
