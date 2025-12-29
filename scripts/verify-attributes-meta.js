// node scripts/verify-attributes-meta.js <path-to-service-account-json>
const admin = require('firebase-admin');
const fs = require('fs');
const path = require('path');

if (process.argv.length < 3) {
  console.error('Usage: node scripts/verify-attributes-meta.js <service-account-json>');
  process.exit(2);
}

const keyFile = process.argv[2];
const key = JSON.parse(fs.readFileSync(keyFile, 'utf8'));
admin.initializeApp({ credential: admin.credential.cert(key) });
const db = admin.firestore();

(async () => {
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
  console.log('settings/attributesMeta:', JSON.stringify(meta, null, 2));

  // Read local registry version
  const registryPath = path.resolve(__dirname, '../packages/sdk/config/attributeRegistry.json');
  const localRegistry = JSON.parse(fs.readFileSync(registryPath, 'utf8'));
  const verLocal = localRegistry.version;
  console.log('Local attributeRegistry.json version:', verLocal);
  
  if (meta.registry_version === verLocal) {
    console.log('OK: registry_version matches local file.');
  } else {
    console.warn('MISMATCH: registry_version (' + meta.registry_version + ') != local file version (' + verLocal + ')');
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
