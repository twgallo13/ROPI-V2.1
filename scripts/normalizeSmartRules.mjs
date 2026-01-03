#!/usr/bin/env node
/**
 * Smart Rules Normalization Script
 * LP-smart-rules-schema-1.0.0: Migration tool for invalid rules
 * 
 * This script:
 * 1. Scans settings/smartRules/rules/*
 * 2. Validates each rule against the canonical schema
 * 3. Either normalizes fixable rules or quarantines invalid ones
 * 
 * Usage:
 *   node scripts/normalizeSmartRules.mjs [--dry-run] [--quarantine]
 * 
 * Options:
 *   --dry-run      Report issues without making changes
 *   --quarantine   Move invalid rules to quarantine instead of normalizing
 *   --disable      Disable invalid rules instead of quarantining
 */

import { initializeApp, cert } from 'firebase-admin/app';
import { getFirestore, Timestamp } from 'firebase-admin/firestore';
import { readFileSync } from 'fs';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

// Parse command line args
const args = process.argv.slice(2);
const DRY_RUN = args.includes('--dry-run');
const QUARANTINE_MODE = args.includes('--quarantine');
const DISABLE_MODE = args.includes('--disable');

console.log('='.repeat(60));
console.log('Smart Rules Normalization Script');
console.log('LP-smart-rules-schema-1.0.0');
console.log('='.repeat(60));
console.log(`Mode: ${DRY_RUN ? 'DRY RUN' : QUARANTINE_MODE ? 'QUARANTINE' : DISABLE_MODE ? 'DISABLE' : 'NORMALIZE'}`);
console.log('');

// Initialize Firebase Admin
let db;
try {
  // Try to use service account if available
  const serviceAccountPath = join(__dirname, '../service-account.json');
  try {
    const serviceAccount = JSON.parse(readFileSync(serviceAccountPath, 'utf8'));
    initializeApp({
      credential: cert(serviceAccount),
    });
    console.log('✅ Initialized with service account');
  } catch {
    // Fall back to default credentials (emulator or ADC)
    initializeApp();
    console.log('✅ Initialized with default credentials');
  }
  db = getFirestore();
} catch (error) {
  console.error('❌ Failed to initialize Firebase:', error.message);
  process.exit(1);
}

// Collections
const RULES_COLLECTION = 'settings/smartRules/rules';
const QUARANTINE_COLLECTION = 'settings/smartRules/quarantine';
const AUDIT_COLLECTION = 'settings/smartRules/audit';

// Validation rules
function validateRule(rule) {
  const issues = [];
  
  // Required fields
  if (!rule.ruleId) issues.push('Missing ruleId');
  if (!rule.name || typeof rule.name !== 'string') issues.push('Missing or invalid name');
  
  // Condition validation
  if (!rule.condition) {
    issues.push('Missing condition');
  } else if (Array.isArray(rule.condition)) {
    rule.condition.forEach((c, i) => {
      if (!c.field) issues.push(`condition[${i}].field is missing`);
      if (c.options === undefined) issues.push(`condition[${i}].options is undefined (should be {} or object)`);
    });
  } else {
    if (!rule.condition.field) issues.push('condition.field is missing');
    if (rule.condition.options === undefined) issues.push('condition.options is undefined');
  }
  
  // Action validation
  if (!rule.action) {
    issues.push('Missing action');
  } else {
    if (!rule.action.targetField) issues.push('action.targetField is missing');
    if (rule.action.valueTemplate === undefined) issues.push('action.valueTemplate is undefined');
  }
  
  // Check for undefined values
  for (const [key, value] of Object.entries(rule)) {
    if (value === undefined) {
      issues.push(`Field '${key}' is undefined`);
    }
  }
  
  // Description should be string, not undefined
  if (rule.description === undefined) {
    issues.push("description is undefined (should be '' or string)");
  }
  
  // Tags should be array, not undefined
  if (rule.tags === undefined) {
    issues.push('tags is undefined (should be [] or array)');
  }
  
  return issues;
}

// Normalize a rule to be Firestore-safe
function normalizeRule(rule) {
  const normalized = { ...rule };
  
  // Ensure description is string
  if (normalized.description === undefined || normalized.description === null) {
    normalized.description = '';
  }
  
  // Ensure tags is array
  if (!Array.isArray(normalized.tags)) {
    normalized.tags = [];
  }
  
  // Ensure enabled is boolean
  if (typeof normalized.enabled !== 'boolean') {
    normalized.enabled = true;
  }
  
  // Ensure priority is number
  if (typeof normalized.priority !== 'number') {
    normalized.priority = 1000;
  }
  
  // Ensure autoApply is boolean
  if (typeof normalized.autoApply !== 'boolean') {
    normalized.autoApply = false;
  }
  
  // Normalize condition(s)
  if (normalized.condition) {
    if (Array.isArray(normalized.condition)) {
      normalized.condition = normalized.condition.map(c => ({
        field: c.field || '',
        matchType: c.matchType || 'contains',
        value: c.value ?? '',
        options: c.options || {},
      }));
    } else {
      normalized.condition = {
        field: normalized.condition.field || '',
        matchType: normalized.condition.matchType || 'contains',
        value: normalized.condition.value ?? '',
        options: normalized.condition.options || {},
      };
    }
  } else {
    // Create empty condition if missing
    normalized.condition = {
      field: '',
      matchType: 'contains',
      value: '',
      options: {},
    };
  }
  
  // Normalize action
  if (normalized.action) {
    normalized.action = {
      targetField: normalized.action.targetField || '',
      valueTemplate: normalized.action.valueTemplate ?? '',
      ...(normalized.action.confidenceModifier !== undefined && {
        confidenceModifier: normalized.action.confidenceModifier,
      }),
    };
  } else {
    normalized.action = {
      targetField: '',
      valueTemplate: '',
    };
  }
  
  // Remove undefined values
  for (const key of Object.keys(normalized)) {
    if (normalized[key] === undefined) {
      delete normalized[key];
    }
  }
  
  return normalized;
}

// Main migration logic
async function migrate() {
  const stats = {
    total: 0,
    valid: 0,
    normalized: 0,
    quarantined: 0,
    disabled: 0,
    errors: 0,
  };
  
  const report = [];
  
  try {
    // Get all rules
    console.log(`📂 Reading from ${RULES_COLLECTION}...`);
    const rulesSnapshot = await db.collection(RULES_COLLECTION).get();
    stats.total = rulesSnapshot.size;
    console.log(`Found ${stats.total} rules\n`);
    
    for (const doc of rulesSnapshot.docs) {
      const ruleId = doc.id;
      const rule = { ruleId, ...doc.data() };
      
      // Validate
      const issues = validateRule(rule);
      
      if (issues.length === 0) {
        stats.valid++;
        report.push({
          ruleId,
          name: rule.name,
          status: 'VALID',
          issues: [],
        });
        continue;
      }
      
      console.log(`⚠️  Rule ${ruleId} (${rule.name || 'unnamed'}):`);
      issues.forEach(issue => console.log(`   - ${issue}`));
      
      if (DRY_RUN) {
        report.push({
          ruleId,
          name: rule.name,
          status: 'WOULD_FIX',
          issues,
        });
        continue;
      }
      
      try {
        if (QUARANTINE_MODE) {
          // Move to quarantine
          const quarantineRef = db.collection(QUARANTINE_COLLECTION).doc(ruleId);
          await quarantineRef.set({
            ...rule,
            quarantinedAt: Timestamp.now(),
            quarantineReason: issues.join('; '),
          });
          await doc.ref.delete();
          stats.quarantined++;
          console.log(`   ➡️  Quarantined`);
          report.push({
            ruleId,
            name: rule.name,
            status: 'QUARANTINED',
            issues,
          });
        } else if (DISABLE_MODE) {
          // Disable the rule
          await doc.ref.update({
            enabled: false,
            _invalidReason: issues.join('; '),
            _disabledAt: Timestamp.now(),
          });
          stats.disabled++;
          console.log(`   ⏸️  Disabled`);
          report.push({
            ruleId,
            name: rule.name,
            status: 'DISABLED',
            issues,
          });
        } else {
          // Normalize the rule
          const normalized = normalizeRule(rule);
          await doc.ref.set(normalized, { merge: true });
          stats.normalized++;
          console.log(`   ✅ Normalized`);
          report.push({
            ruleId,
            name: rule.name,
            status: 'NORMALIZED',
            issues,
          });
        }
        
        // Write audit entry
        await db.collection(AUDIT_COLLECTION).add({
          action: QUARANTINE_MODE ? 'quarantine' : DISABLE_MODE ? 'disable' : 'normalize',
          ruleId,
          issues,
          timestamp: Timestamp.now(),
          actor: 'migration_script',
        });
        
      } catch (err) {
        stats.errors++;
        console.error(`   ❌ Error: ${err.message}`);
        report.push({
          ruleId,
          name: rule.name,
          status: 'ERROR',
          issues,
          error: err.message,
        });
      }
      
      console.log('');
    }
    
  } catch (err) {
    console.error('❌ Migration failed:', err.message);
    process.exit(1);
  }
  
  // Print summary
  console.log('='.repeat(60));
  console.log('SUMMARY');
  console.log('='.repeat(60));
  console.log(`Total rules:   ${stats.total}`);
  console.log(`Valid:         ${stats.valid}`);
  console.log(`Normalized:    ${stats.normalized}`);
  console.log(`Quarantined:   ${stats.quarantined}`);
  console.log(`Disabled:      ${stats.disabled}`);
  console.log(`Errors:        ${stats.errors}`);
  console.log('');
  
  if (DRY_RUN) {
    console.log('⚠️  DRY RUN - No changes were made');
    console.log('Run without --dry-run to apply changes');
  }
  
  // Output report
  const reportPath = join(__dirname, `../smartrules-migration-report-${Date.now()}.json`);
  const fs = await import('fs/promises');
  await fs.writeFile(reportPath, JSON.stringify({ stats, report }, null, 2));
  console.log(`\n📄 Report saved to: ${reportPath}`);
  
  return stats;
}

// Run
migrate()
  .then(stats => {
    if (stats.errors > 0) {
      process.exit(1);
    }
    process.exit(0);
  })
  .catch(err => {
    console.error('Fatal error:', err);
    process.exit(1);
  });
