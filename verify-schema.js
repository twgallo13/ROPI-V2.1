const admin = require('firebase-admin');
try { admin.initializeApp(); } catch(e) {}
const db = admin.firestore();

(async () => {
  const settingsDoc = await db.collection('settings').doc('exportSettings').get();
  const rules = settingsDoc.data().completionRules;
  
  console.log('✅ Completion Rules Schema Validation:');
  
  const checks = [
    { field: 'schemaVersion', exists: !!rules.schemaVersion, value: rules.schemaVersion },
    { field: 'rulesVersion', exists: typeof rules.rulesVersion === 'number', value: rules.rulesVersion },
    { field: 'updatedAt', exists: !!rules.updatedAt, value: 'present' },
    { field: 'updatedBy', exists: !!rules.updatedBy, value: rules.updatedBy },
    { field: 'exportUnlockThresholdPct', exists: typeof rules.exportUnlockThresholdPct === 'number', value: rules.exportUnlockThresholdPct },
    { field: 'segments', exists: Array.isArray(rules.segments), value: rules.segments.length + ' items' },
    { field: 'builtInSegments', exists: typeof rules.builtInSegments === 'object', value: 'object' },
    { field: 'exclusions', exists: rules.exclusions && !!rules.exclusions.media && !!rules.exclusions.pricing, value: 'media, pricing' }
  ];
  
  checks.forEach(check => {
    const status = check.exists ? '✓' : '✗';
    console.log('  ' + status + ' ' + check.field + ': ' + check.value);
  });
  
  const allValid = checks.every(c => c.exists);
  console.log('\n' + (allValid ? '✅ All required fields present - validation should pass' : '❌ Some fields missing'));
  
  process.exit(allValid ? 0 : 1);
})().catch(e => {
  console.error('Error:', e.message);
  process.exit(1);
});
