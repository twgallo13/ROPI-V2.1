#!/usr/bin/env node
/**
 * migrateSmartRulesFieldPaths.mjs
 * LP-smart-rules-normalize-1.0.0
 * 
 * Migration script to normalize Smart Rule field paths.
 * Ensures all action.targetField and condition.field values use canonical prefixes.
 * 
 * Usage:
 *   node packages/api/scripts/migrateSmartRulesFieldPaths.mjs --dry-run
 *   node packages/api/scripts/migrateSmartRulesFieldPaths.mjs --apply
 * 
 * Options:
 *   --dry-run    Preview changes without applying (default)
 *   --apply      Apply changes to Firestore
 *   --verbose    Show detailed output
 *   --backup     Export backup before applying (automatic with --apply)
 * 
 * Exit codes:
 *   0 - Success (dry-run or apply completed)
 *   1 - Error during migration
 *   2 - Ambiguous/unknown fields found (manual review required)
 */

import admin from 'firebase-admin';
import { getFirestore } from 'firebase-admin/firestore';
import fs from 'fs';
import path from 'path';

// ============================================================================
// Configuration
// ============================================================================

const RULES_COLLECTION = 'settings/smartRules/rules';
const AUDIT_COLLECTION = 'settings/smartRules/audit';
const MIGRATION_FLAGS_COLLECTION = 'settings/smartRules/migration_flags';
const ATTRIBUTES_COLLECTION = 'settings/attributes/keys';

const ALLOWED_PREFIXES = ['attributes.', 'observation.', 'meta.'];
const SYSTEM_PREFIXES = ['source.', 'tags.'];

// ============================================================================
// Parse Arguments
// ============================================================================

const args = process.argv.slice(2);
const DRY_RUN = !args.includes('--apply');
const VERBOSE = args.includes('--verbose');
const EXPORT_BACKUP = args.includes('--backup') || !DRY_RUN;

// ============================================================================
// Initialize Firebase
// ============================================================================

if (!admin.apps.length) {
  admin.initializeApp({ projectId: 'ropi-bccee' });
}
const db = getFirestore();

// ============================================================================
// Types
// ============================================================================

/** @typedef {{
 *   ruleId: string;
 *   field: 'action.targetField' | `condition.field` | `condition[${number}].field`;
 *   oldValue: string;
 *   newValue: string;
 *   status: 'normalized' | 'flagged';
 *   reason?: string;
 * }} FieldChange */

/** @typedef {{
 *   ruleId: string;
 *   ruleName: string;
 *   changes: FieldChange[];
 *   before: unknown;
 *   after: unknown;
 * }} RuleMigration */

// ============================================================================
// Helpers
// ============================================================================

/**
 * Check if field has an allowed prefix
 * @param {string} field 
 * @returns {boolean}
 */
function hasAllowedPrefix(field) {
  const normalized = field.trim().toLowerCase();
  return ALLOWED_PREFIXES.some(prefix => normalized.startsWith(prefix)) ||
         SYSTEM_PREFIXES.some(prefix => normalized.startsWith(prefix));
}

/**
 * Load attribute registry from Firestore
 * @returns {Promise<Map<string, {id: string, attribute_id: string}>>}
 */
async function loadAttributeRegistry() {
  const registry = new Map();
  const snap = await db.collection(ATTRIBUTES_COLLECTION).get();
  
  snap.forEach(doc => {
    const data = doc.data();
    const attrId = data.attribute_id || doc.id;
    registry.set(doc.id, { id: doc.id, attribute_id: attrId });
    if (attrId !== doc.id) {
      registry.set(attrId, { id: doc.id, attribute_id: attrId });
    }
    // Also index by short name (e.g., 'gender' for doc id 'attributes.gender')
    if (doc.id.startsWith('attributes.')) {
      const shortName = doc.id.slice(11);
      registry.set(shortName, { id: doc.id, attribute_id: attrId });
    }
  });
  
  return registry;
}

/**
 * Normalize a field path
 * @param {string} field 
 * @param {Map<string, {id: string, attribute_id: string}>} registry
 * @returns {{normalized: string, status: 'normalized' | 'flagged', reason?: string}}
 */
function normalizeField(field, registry) {
  const trimmed = field.trim();
  
  // Already has valid prefix
  if (hasAllowedPrefix(trimmed)) {
    return { normalized: trimmed, status: 'normalized' };
  }
  
  // Try to resolve against registry
  const segments = trimmed.split('.');
  const firstSegment = segments[0];
  
  if (registry.has(firstSegment)) {
    // Found in registry - prefix with 'attributes.'
    const normalized = `attributes.${trimmed}`;
    return { normalized, status: 'normalized' };
  }
  
  // Unknown field - flag for manual review
  return {
    normalized: trimmed,
    status: 'flagged',
    reason: `Unknown field '${firstSegment}' - not found in registry. Manual review required.`,
  };
}

/**
 * Process a single rule and determine changes needed
 * @param {admin.firestore.QueryDocumentSnapshot} doc
 * @param {Map<string, {id: string, attribute_id: string}>} registry
 * @returns {RuleMigration | null}
 */
function processRule(doc, registry) {
  const ruleId = doc.id;
  const data = doc.data();
  const changes = [];
  const after = JSON.parse(JSON.stringify(data));
  
  // 1. Check action.targetField
  if (data.action?.targetField && !hasAllowedPrefix(data.action.targetField)) {
    const result = normalizeField(data.action.targetField, registry);
    
    if (result.normalized !== data.action.targetField || result.status === 'flagged') {
      changes.push({
        ruleId,
        field: 'action.targetField',
        oldValue: data.action.targetField,
        newValue: result.normalized,
        status: result.status,
        reason: result.reason,
      });
      
      if (result.status === 'normalized') {
        after.action.targetField = result.normalized;
      }
    }
  }
  
  // 2. Check condition.field (single or array)
  const conditions = Array.isArray(data.condition) ? data.condition : data.condition ? [data.condition] : [];
  const normalizedConditions = [];
  
  for (let i = 0; i < conditions.length; i++) {
    const cond = conditions[i];
    const condCopy = { ...cond };
    
    if (cond.field && !hasAllowedPrefix(cond.field)) {
      const result = normalizeField(cond.field, registry);
      
      if (result.normalized !== cond.field || result.status === 'flagged') {
        const fieldPath = conditions.length === 1 ? 'condition.field' : `condition[${i}].field`;
        changes.push({
          ruleId,
          field: fieldPath,
          oldValue: cond.field,
          newValue: result.normalized,
          status: result.status,
          reason: result.reason,
        });
        
        if (result.status === 'normalized') {
          condCopy.field = result.normalized;
        }
      }
    }
    
    normalizedConditions.push(condCopy);
  }
  
  // Update after state with normalized conditions
  if (normalizedConditions.length > 0) {
    after.condition = Array.isArray(data.condition) ? normalizedConditions : normalizedConditions[0];
  }
  
  // No changes needed
  if (changes.length === 0) {
    return null;
  }
  
  return {
    ruleId,
    ruleName: data.name || ruleId,
    changes,
    before: data,
    after,
  };
}

/**
 * Write audit entry for migration
 * @param {string} ruleId
 * @param {unknown} before
 * @param {unknown} after
 * @param {FieldChange[]} changes
 */
async function writeAuditEntry(ruleId, before, after, changes) {
  const auditId = `migration_${Date.now()}_${ruleId}`;
  
  await db.collection(AUDIT_COLLECTION).doc(auditId).set({
    auditId,
    ruleId,
    action: 'migration',
    actor: 'migration-script',
    reason: 'normalizeFieldPath (LP-smart-rules-normalize-1.0.0)',
    timestamp: new Date().toISOString(),
    changes: {
      before,
      after,
      fieldChanges: changes,
    },
  });
  
  return auditId;
}

/**
 * Write migration flag for rules needing manual review
 * @param {string} ruleId
 * @param {FieldChange[]} flaggedChanges
 */
async function writeMigrationFlag(ruleId, flaggedChanges) {
  await db.collection(MIGRATION_FLAGS_COLLECTION).doc(ruleId).set({
    ruleId,
    flaggedAt: new Date().toISOString(),
    reason: 'Unknown fields requiring manual review',
    fields: flaggedChanges.map(c => ({
      field: c.field,
      value: c.oldValue,
      reason: c.reason,
    })),
  });
}

/**
 * Export backup of all rules
 * @param {admin.firestore.QuerySnapshot} snapshot
 * @returns {string} Backup file path
 */
function exportBackup(snapshot) {
  const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
  const backupDir = path.join(process.cwd(), 'backups');
  
  if (!fs.existsSync(backupDir)) {
    fs.mkdirSync(backupDir, { recursive: true });
  }
  
  const backupPath = path.join(backupDir, `smart-rules-backup-${timestamp}.json`);
  const rules = [];
  
  snapshot.forEach(doc => {
    rules.push({
      id: doc.id,
      data: doc.data(),
    });
  });
  
  fs.writeFileSync(backupPath, JSON.stringify(rules, null, 2));
  return backupPath;
}

// ============================================================================
// Main Migration
// ============================================================================

async function runMigration() {
  console.log('╔════════════════════════════════════════════════════════════════╗');
  console.log('║       Smart Rules Field Path Migration Script                   ║');
  console.log('║               LP-smart-rules-normalize-1.0.0                    ║');
  console.log('╚════════════════════════════════════════════════════════════════╝\n');
  
  console.log(`📋 Mode: ${DRY_RUN ? 'DRY RUN (preview only)' : 'APPLY (live migration)'}`);
  console.log(`📊 Verbose: ${VERBOSE ? 'Yes' : 'No'}`);
  console.log(`💾 Backup: ${EXPORT_BACKUP ? 'Yes' : 'No'}\n`);
  
  // 1. Load attribute registry
  console.log('🔍 Loading attribute registry from Firestore...');
  const registry = await loadAttributeRegistry();
  console.log(`   Found ${registry.size} attribute entries\n`);
  
  // 2. Load all rules
  console.log('📄 Loading Smart Rules...');
  const rulesSnap = await db.collection(RULES_COLLECTION).get();
  console.log(`   Found ${rulesSnap.size} rules\n`);
  
  if (rulesSnap.empty) {
    console.log('✅ No rules found. Nothing to migrate.');
    return { success: true, migrated: 0, flagged: 0 };
  }
  
  // 3. Export backup (if requested or applying)
  if (EXPORT_BACKUP) {
    console.log('💾 Exporting backup...');
    const backupPath = exportBackup(rulesSnap);
    console.log(`   Backup saved to: ${backupPath}\n`);
  }
  
  // 4. Process rules
  console.log('🔄 Processing rules...\n');
  
  /** @type {RuleMigration[]} */
  const migrations = [];
  /** @type {RuleMigration[]} */
  const flagged = [];
  
  for (const doc of rulesSnap.docs) {
    const migration = processRule(doc, registry);
    
    if (migration) {
      const hasFlagged = migration.changes.some(c => c.status === 'flagged');
      
      if (hasFlagged) {
        flagged.push(migration);
      } else {
        migrations.push(migration);
      }
    }
  }
  
  // 5. Display results
  console.log('┌──────────────────────────────────────────────────────────────┐');
  console.log('│                    Migration Summary                          │');
  console.log('├──────────────────────────────────────────────────────────────┤');
  console.log(`│ Total rules scanned:    ${String(rulesSnap.size).padEnd(36)}│`);
  console.log(`│ Rules to migrate:       ${String(migrations.length).padEnd(36)}│`);
  console.log(`│ Rules flagged:          ${String(flagged.length).padEnd(36)}│`);
  console.log(`│ Rules unchanged:        ${String(rulesSnap.size - migrations.length - flagged.length).padEnd(36)}│`);
  console.log('└──────────────────────────────────────────────────────────────┘\n');
  
  // 6. Show changes to apply
  if (migrations.length > 0) {
    console.log('📝 Changes to apply:\n');
    
    for (const m of migrations) {
      console.log(`  📌 ${m.ruleName} (${m.ruleId})`);
      for (const c of m.changes) {
        console.log(`     • ${c.field}: "${c.oldValue}" → "${c.newValue}"`);
      }
      console.log('');
    }
  }
  
  // 7. Show flagged rules
  if (flagged.length > 0) {
    console.log('⚠️  Flagged for manual review:\n');
    
    for (const m of flagged) {
      console.log(`  ❓ ${m.ruleName} (${m.ruleId})`);
      for (const c of m.changes) {
        console.log(`     • ${c.field}: "${c.oldValue}"`);
        console.log(`       Reason: ${c.reason}`);
      }
      console.log('');
    }
  }
  
  // 8. Apply changes (if not dry-run)
  if (!DRY_RUN && migrations.length > 0) {
    console.log('🚀 Applying migrations...\n');
    
    for (const m of migrations) {
      try {
        // Update rule
        await db.collection(RULES_COLLECTION).doc(m.ruleId).update({
          ...m.after,
          updatedBy: 'migration-script',
          updatedAt: new Date().toISOString(),
        });
        
        // Write audit
        const auditId = await writeAuditEntry(m.ruleId, m.before, m.after, m.changes);
        
        console.log(`   ✅ ${m.ruleName} - migrated (audit: ${auditId})`);
      } catch (error) {
        console.error(`   ❌ ${m.ruleName} - FAILED:`, error.message);
      }
    }
    
    console.log('');
  }
  
  // 9. Write migration flags for manual review
  if (!DRY_RUN && flagged.length > 0) {
    console.log('📋 Writing migration flags for manual review...\n');
    
    for (const m of flagged) {
      const flaggedChanges = m.changes.filter(c => c.status === 'flagged');
      await writeMigrationFlag(m.ruleId, flaggedChanges);
      console.log(`   📌 ${m.ruleName} - flagged for review`);
    }
    
    console.log('');
  }
  
  // 10. Final summary
  console.log('───────────────────────────────────────────────────────────────');
  
  if (DRY_RUN) {
    console.log(`\n💡 Dry run complete. Run with --apply to execute migration.`);
    
    if (flagged.length > 0) {
      console.log(`\n⚠️  ${flagged.length} rule(s) have unknown fields requiring manual review.`);
      console.log('   Review these fields and either:');
      console.log('   - Add them to the attribute registry');
      console.log('   - Manually fix the rules');
      console.log('   - Use an allowed prefix (attributes., observation., meta.)');
    }
  } else {
    console.log(`\n✅ Migration complete!`);
    console.log(`   • ${migrations.length} rule(s) migrated`);
    console.log(`   • ${flagged.length} rule(s) flagged for manual review`);
  }
  
  console.log(`\n📅 Completed at: ${new Date().toISOString()}`);
  
  return {
    success: true,
    migrated: migrations.length,
    flagged: flagged.length,
    changes: migrations,
    flags: flagged,
  };
}

// ============================================================================
// Entry Point
// ============================================================================

runMigration()
  .then(result => {
    if (result.flagged > 0 && !DRY_RUN) {
      process.exit(2); // Exit with code 2 for flagged rules
    }
    process.exit(0);
  })
  .catch(error => {
    console.error('\n❌ Migration failed:', error);
    process.exit(1);
  });
