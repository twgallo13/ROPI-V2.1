#!/usr/bin/env node
/**
 * Normalize Legacy Attributes Script
 * 
 * Migrates legacy attribute documents from camelCase to snake_case field names.
 * 
 * Usage:
 *   node scripts/normalize-legacy-attributes.js --dry     # Preview changes
 *   node scripts/normalize-legacy-attributes.js --apply   # Apply changes
 * 
 * PVS-0.2.2
 * 
 * WARNING: --apply mode writes to Firestore. Use with caution.
 */

const admin = require('firebase-admin');
const path = require('path');

// Initialize Firebase Admin
const serviceAccountPath = process.env.GOOGLE_APPLICATION_CREDENTIALS ||
  path.join(__dirname, '..', 'packages', 'api', 'credentials', 'service-account.json');

try {
  const serviceAccount = require(serviceAccountPath);
  admin.initializeApp({
    credential: admin.credential.cert(serviceAccount),
    projectId: serviceAccount.project_id,
  });
} catch (err) {
  console.error('❌ Failed to initialize Firebase Admin:');
  console.error('   Set GOOGLE_APPLICATION_CREDENTIALS or place service-account.json in packages/api/credentials/');
  process.exit(1);
}

const db = admin.firestore();
const ATTRIBUTES_COLLECTION = 'settings/attributes/keys';

/**
 * Field mappings: legacy -> canonical
 */
const FIELD_MAPPINGS = {
  dataType: 'data_type',
  allowedValues: 'allowed_values',
  // Note: these are semantic mappings, not just renames
  // export: 'required_for_export',  // handled specially
  // required: 'import_required',    // handled specially
  // description: 'ai_usage_notes',  // handled specially
  // importerColumns: 'external_header', // handled specially (first element)
};

/**
 * Check if a document has legacy fields that need normalization
 */
function needsNormalization(data) {
  return (
    data.dataType !== undefined ||
    data.allowedValues !== undefined ||
    (data.data_type === undefined && data.dataType === undefined) || // missing both
    data.status === undefined
  );
}

/**
 * Normalize a legacy document to canonical schema
 */
function normalizeDocument(data, docId) {
  const normalized = {
    attribute_id: docId,
    label: data.label || docId,
    
    // Core field normalization
    data_type: data.data_type || data.dataType || 'string',
    status: data.status || 'active',
    category: data.category,
    
    // Array fields
    allowed_values: data.allowed_values || data.allowedValues,
    synonyms: data.synonyms,
    
    // Boolean flags with fallbacks
    required_for_completion: data.required_for_completion ?? false,
    required_for_export: data.required_for_export ?? data.export ?? false,
    import_required: data.import_required ?? data.required ?? false,
    
    // String fields with fallbacks
    external_header: data.external_header || 
      (Array.isArray(data.importerColumns) && data.importerColumns[0]) || 
      undefined,
    ai_usage_notes: data.ai_usage_notes || data.description,
    source: data.source || 'json',
    
    // Timestamps (preserve existing)
    createdBy: data.createdBy,
    createdAt: data.createdAt,
    updatedBy: data.updatedBy,
    updatedAt: data.updatedAt,
  };
  
  // Remove undefined values
  Object.keys(normalized).forEach(key => {
    if (normalized[key] === undefined) {
      delete normalized[key];
    }
  });
  
  return normalized;
}

/**
 * Calculate what fields would change
 */
function calculateChanges(original, normalized) {
  const changes = [];
  
  // Check for new/changed fields
  for (const [key, value] of Object.entries(normalized)) {
    if (original[key] !== value) {
      changes.push({
        field: key,
        from: original[key],
        to: value,
        action: original[key] === undefined ? 'add' : 'change',
      });
    }
  }
  
  return changes;
}

async function main() {
  const args = process.argv.slice(2);
  const isDryRun = args.includes('--dry');
  const isApply = args.includes('--apply');
  
  if (!isDryRun && !isApply) {
    console.log('Usage:');
    console.log('  node scripts/normalize-legacy-attributes.js --dry     # Preview changes');
    console.log('  node scripts/normalize-legacy-attributes.js --apply   # Apply changes');
    process.exit(1);
  }
  
  console.log('🔍 Scanning attribute documents...\n');
  
  const snapshot = await db.collection(ATTRIBUTES_COLLECTION).get();
  
  const stats = {
    total: 0,
    needsNormalization: 0,
    hasDataType: 0,
    hasAllowedValues: 0,
    missingStatus: 0,
    missingDataType: 0,
  };
  
  const documentsToUpdate = [];
  
  for (const doc of snapshot.docs) {
    stats.total++;
    const data = doc.data();
    
    // Collect stats
    if (data.dataType !== undefined) stats.hasDataType++;
    if (data.allowedValues !== undefined) stats.hasAllowedValues++;
    if (data.status === undefined) stats.missingStatus++;
    if (data.data_type === undefined && data.dataType === undefined) stats.missingDataType++;
    
    if (needsNormalization(data)) {
      stats.needsNormalization++;
      const normalized = normalizeDocument(data, doc.id);
      const changes = calculateChanges(data, normalized);
      
      documentsToUpdate.push({
        id: doc.id,
        original: data,
        normalized,
        changes,
      });
    }
  }
  
  // Print summary
  console.log('📊 Summary:');
  console.log(`   Total documents: ${stats.total}`);
  console.log(`   Need normalization: ${stats.needsNormalization}`);
  console.log(`   Have legacy dataType: ${stats.hasDataType}`);
  console.log(`   Have legacy allowedValues: ${stats.hasAllowedValues}`);
  console.log(`   Missing status: ${stats.missingStatus}`);
  console.log(`   Missing data_type: ${stats.missingDataType}`);
  console.log('');
  
  if (documentsToUpdate.length === 0) {
    console.log('✅ All documents are already normalized!');
    process.exit(0);
  }
  
  // Print details for each document
  console.log('📝 Documents requiring normalization:\n');
  
  for (const { id, changes } of documentsToUpdate) {
    console.log(`  ${id}:`);
    for (const change of changes) {
      const fromStr = change.from === undefined ? '(undefined)' : JSON.stringify(change.from);
      const toStr = JSON.stringify(change.to);
      const arrow = change.action === 'add' ? '+' : '→';
      console.log(`    ${change.field}: ${fromStr} ${arrow} ${toStr}`);
    }
    console.log('');
  }
  
  if (isDryRun) {
    console.log('🏃 DRY RUN - No changes applied.');
    console.log(`   Would update ${documentsToUpdate.length} documents.`);
    console.log('   Run with --apply to apply changes.');
    process.exit(0);
  }
  
  if (isApply) {
    console.log('⚠️  APPLY MODE - Writing changes to Firestore...\n');
    
    let updated = 0;
    let failed = 0;
    
    for (const { id, normalized } of documentsToUpdate) {
      try {
        const updatePayload = {
          ...normalized,
          updatedBy: 'migration-script',
          updatedAt: new Date().toISOString(),
        };
        delete updatePayload.attribute_id; // Don't write ID as field
        
        await db.collection(ATTRIBUTES_COLLECTION).doc(id).update(updatePayload);
        updated++;
        console.log(`  ✅ Updated: ${id}`);
      } catch (err) {
        failed++;
        console.error(`  ❌ Failed: ${id} - ${err.message}`);
      }
    }
    
    console.log('');
    console.log('📊 Results:');
    console.log(`   Updated: ${updated}`);
    console.log(`   Failed: ${failed}`);
    
    if (failed > 0) {
      process.exit(1);
    }
  }
  
  process.exit(0);
}

main().catch(err => {
  console.error('❌ Script failed:', err);
  process.exit(1);
});
