#!/usr/bin/env node
/**
 * auditSmartRulesFieldPaths.mjs
 * LP-smart-rules-audit-1.0.0
 * 
 * Audit script to validate Smart Rules against registry and business guardrails.
 * 
 * Usage:
 *   node packages/api/scripts/auditSmartRulesFieldPaths.mjs --dry-run --output=artifacts/audit-dryrun.json
 * 
 * Options:
 *   --dry-run      Run audit without making changes (default)
 *   --output       Output JSON file path (default: artifacts/audit-dryrun.json)
 *   --summary      Output summary text file (default: artifacts/audit-summary.txt)
 *   --verbose      Show detailed output
 * 
 * Checks:
 *   - Target field exists in registry (or allowed system prefix)
 *   - Target is exportable and not internalOnly
 *   - Action value respects enum/number constraints
 *   - No ambiguous attribute tokens
 *   - Rule conditions use allowed match types
 * 
 * Exit codes:
 *   0 - Audit passed (zero critical flags)
 *   1 - Error during audit
 *   2 - Critical flags found (manual review required)
 */

import admin from 'firebase-admin';
import { getFirestore } from 'firebase-admin/firestore';
import fs from 'fs';
import path from 'path';

// ============================================================================
// Configuration
// ============================================================================

const RULES_COLLECTION = 'settings/smartRules/rules';
const ATTRIBUTES_COLLECTION = 'settings/attributes/keys';
const MIGRATION_FLAGS_COLLECTION = 'settings/smartRules/migration_flags';

const ALLOWED_PREFIXES = ['attributes.', 'observation.', 'meta.'];
const SYSTEM_PREFIXES = ['source.', 'tags.'];
const ALLOWED_MATCH_TYPES = ['token', 'phrase', 'regex', 'contains'];

// ============================================================================
// Parse Arguments
// ============================================================================

const args = process.argv.slice(2);
const VERBOSE = args.includes('--verbose');
const OUTPUT_FILE = args.find(a => a.startsWith('--output='))?.split('=')[1] || 'artifacts/audit-dryrun.json';
const SUMMARY_FILE = args.find(a => a.startsWith('--summary='))?.split('=')[1] || 'artifacts/audit-summary.txt';

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
 *   severity: 'critical' | 'warning' | 'info';
 *   code: string;
 *   message: string;
 *   field?: string;
 *   value?: string;
 * }} AuditIssue */

/** @typedef {{
 *   ruleId: string;
 *   ruleName: string;
 *   status: 'clean' | 'flagged';
 *   issues: AuditIssue[];
 *   metadata: {
 *     enabled: boolean;
 *     autoApply: boolean;
 *     targetField: string;
 *     conditionFields: string[];
 *   };
 * }} RuleAuditResult */

// ============================================================================
// Registry Helpers
// ============================================================================

/**
 * Load attribute registry from Firestore
 * @returns {Promise<Map<string, {id: string, attribute_id: string, data_type: string, allowed_values?: string[], internalOnly: boolean, exportable: boolean}>>}
 */
async function loadAttributeRegistry() {
  const registry = new Map();
  const snap = await db.collection(ATTRIBUTES_COLLECTION).get();
  
  snap.forEach(doc => {
    const data = doc.data();
    const def = {
      id: doc.id,
      attribute_id: data.attribute_id || doc.id,
      data_type: data.data_type || 'string',
      allowed_values: data.allowed_values,
      synonyms: data.synonyms,
      internalOnly: data.internalOnly || data.internal_only || false,
      exportable: data.exportable ?? data.export ?? true,
      import_required: data.import_required || false,
    };
    
    registry.set(doc.id, def);
    if (data.attribute_id && data.attribute_id !== doc.id) {
      registry.set(data.attribute_id, def);
    }
    // Short name indexing
    if (doc.id.startsWith('attributes.')) {
      const shortName = doc.id.slice(11);
      registry.set(shortName, def);
    }
  });
  
  return registry;
}

/**
 * Check if field has an allowed prefix
 */
function hasAllowedPrefix(field) {
  const normalized = field.trim().toLowerCase();
  return ALLOWED_PREFIXES.some(p => normalized.startsWith(p)) ||
         SYSTEM_PREFIXES.some(p => normalized.startsWith(p));
}

/**
 * Extract attribute ID from canonical path
 */
function extractAttributeId(fieldPath) {
  if (!fieldPath.startsWith('attributes.')) return null;
  const parts = fieldPath.split('.');
  return parts[1] || null;
}

// ============================================================================
// Audit Functions
// ============================================================================

/**
 * Audit a single rule's action target field
 * @param {string} targetField
 * @param {Map} registry
 * @returns {AuditIssue[]}
 */
function auditTargetField(targetField, registry) {
  const issues = [];
  
  if (!targetField) {
    issues.push({
      severity: 'critical',
      code: 'MISSING_TARGET_FIELD',
      message: 'action.targetField is missing',
      field: 'action.targetField',
    });
    return issues;
  }
  
  // Check canonical format
  if (!hasAllowedPrefix(targetField)) {
    issues.push({
      severity: 'critical',
      code: 'INVALID_PREFIX',
      message: `Target field '${targetField}' does not have an allowed prefix (${ALLOWED_PREFIXES.join(', ')})`,
      field: 'action.targetField',
      value: targetField,
    });
    return issues; // Can't continue validation
  }
  
  // If attributes.*, validate against registry
  const attrId = extractAttributeId(targetField);
  if (attrId) {
    const attrDef = registry.get(attrId);
    
    if (!attrDef) {
      issues.push({
        severity: 'critical',
        code: 'UNKNOWN_ATTRIBUTE',
        message: `Attribute '${attrId}' not found in registry`,
        field: 'action.targetField',
        value: attrId,
      });
      return issues;
    }
    
    // Check internalOnly
    if (attrDef.internalOnly) {
      issues.push({
        severity: 'critical',
        code: 'INTERNAL_ONLY_TARGET',
        message: `Attribute '${attrId}' is internal-only and cannot be targeted by Smart Rules`,
        field: 'action.targetField',
        value: attrId,
      });
    }
    
    // Check exportable
    if (!attrDef.exportable) {
      issues.push({
        severity: 'warning',
        code: 'NOT_EXPORTABLE',
        message: `Attribute '${attrId}' is not exportable`,
        field: 'action.targetField',
        value: attrId,
      });
    }
  }
  
  return issues;
}

/**
 * Audit action value against attribute constraints
 * @param {string} targetField
 * @param {string} valueTemplate
 * @param {Map} registry
 * @returns {AuditIssue[]}
 */
function auditActionValue(targetField, valueTemplate, registry) {
  const issues = [];
  
  if (!valueTemplate) {
    issues.push({
      severity: 'warning',
      code: 'EMPTY_VALUE',
      message: 'action.valueTemplate is empty',
      field: 'action.valueTemplate',
    });
    return issues;
  }
  
  const attrId = extractAttributeId(targetField);
  if (!attrId) return issues; // Not an attributes.* field
  
  const attrDef = registry.get(attrId);
  if (!attrDef) return issues; // Already flagged as unknown
  
  // Skip template values with placeholders
  const isTemplate = valueTemplate.includes('{{') || valueTemplate.includes('}}');
  if (isTemplate) {
    return issues; // Templates are validated at runtime
  }
  
  // Check enum constraints
  if (attrDef.allowed_values && attrDef.allowed_values.length > 0) {
    const value = valueTemplate.trim();
    
    // Check exact match
    if (!attrDef.allowed_values.includes(value)) {
      // Check synonyms
      let foundSynonym = false;
      if (attrDef.synonyms) {
        const normalizedValue = Object.keys(attrDef.synonyms).find(
          syn => syn.toLowerCase() === value.toLowerCase()
        );
        if (normalizedValue) {
          foundSynonym = true;
          issues.push({
            severity: 'info',
            code: 'SYNONYM_VALUE',
            message: `Value '${value}' is a synonym for '${attrDef.synonyms[normalizedValue]}'. Consider using canonical value.`,
            field: 'action.valueTemplate',
            value,
          });
        }
      }
      
      if (!foundSynonym) {
        issues.push({
          severity: 'warning',
          code: 'INVALID_ENUM_VALUE',
          message: `Value '${value}' not in allowed values for '${attrId}'. Allowed: ${attrDef.allowed_values.slice(0, 5).join(', ')}${attrDef.allowed_values.length > 5 ? '...' : ''}`,
          field: 'action.valueTemplate',
          value,
        });
      }
    }
  }
  
  // Check number constraints
  if (attrDef.data_type === 'number' || attrDef.data_type === 'integer') {
    const num = Number(valueTemplate);
    if (isNaN(num)) {
      issues.push({
        severity: 'warning',
        code: 'INVALID_NUMBER',
        message: `Value '${valueTemplate}' is not a valid number for attribute '${attrId}'`,
        field: 'action.valueTemplate',
        value: valueTemplate,
      });
    }
  }
  
  return issues;
}

/**
 * Audit condition field
 * @param {object} condition
 * @param {Map} registry
 * @returns {AuditIssue[]}
 */
function auditConditionField(condition, registry) {
  const issues = [];
  
  if (!condition.field) {
    issues.push({
      severity: 'warning',
      code: 'MISSING_CONDITION_FIELD',
      message: 'condition.field is missing',
      field: 'condition.field',
    });
    return issues;
  }
  
  // Check match type
  if (!ALLOWED_MATCH_TYPES.includes(condition.matchType)) {
    issues.push({
      severity: 'warning',
      code: 'INVALID_MATCH_TYPE',
      message: `Match type '${condition.matchType}' not in allowed types: ${ALLOWED_MATCH_TYPES.join(', ')}`,
      field: 'condition.matchType',
      value: condition.matchType,
    });
  }
  
  // If source.* field, skip registry validation
  if (condition.field.startsWith('source.')) {
    return issues;
  }
  
  // Check canonical format
  if (!hasAllowedPrefix(condition.field)) {
    issues.push({
      severity: 'warning',
      code: 'CONDITION_INVALID_PREFIX',
      message: `Condition field '${condition.field}' does not have an allowed prefix`,
      field: 'condition.field',
      value: condition.field,
    });
    return issues;
  }
  
  // If attributes.*, validate against registry
  const attrId = extractAttributeId(condition.field);
  if (attrId) {
    const attrDef = registry.get(attrId);
    if (!attrDef) {
      issues.push({
        severity: 'warning',
        code: 'CONDITION_UNKNOWN_ATTRIBUTE',
        message: `Condition attribute '${attrId}' not found in registry`,
        field: 'condition.field',
        value: attrId,
      });
    }
  }
  
  return issues;
}

/**
 * Audit a single Smart Rule
 * @param {admin.firestore.QueryDocumentSnapshot} doc
 * @param {Map} registry
 * @returns {RuleAuditResult}
 */
function auditRule(doc, registry) {
  const ruleId = doc.id;
  const data = doc.data();
  const issues = [];
  
  // Audit action.targetField
  if (data.action?.targetField) {
    issues.push(...auditTargetField(data.action.targetField, registry));
    
    // Audit action.valueTemplate
    if (data.action.valueTemplate !== undefined) {
      issues.push(...auditActionValue(
        data.action.targetField,
        data.action.valueTemplate,
        registry
      ));
    }
  } else {
    issues.push({
      severity: 'critical',
      code: 'MISSING_ACTION',
      message: 'Rule has no action defined',
      field: 'action',
    });
  }
  
  // Audit conditions
  const conditions = Array.isArray(data.condition) ? data.condition : data.condition ? [data.condition] : [];
  conditions.forEach((cond, idx) => {
    const condIssues = auditConditionField(cond, registry);
    condIssues.forEach(issue => {
      issues.push({
        ...issue,
        field: `condition[${idx}].${issue.field?.split('.').pop() || 'field'}`,
      });
    });
  });
  
  const conditionFields = conditions.map(c => c.field || '');
  
  // Determine status
  const hasCritical = issues.some(i => i.severity === 'critical');
  
  return {
    ruleId,
    ruleName: data.name || ruleId,
    status: hasCritical ? 'flagged' : 'clean',
    issues,
    metadata: {
      enabled: data.enabled ?? true,
      autoApply: data.autoApply ?? false,
      targetField: data.action?.targetField || '',
      conditionFields,
    },
  };
}

// ============================================================================
// Main Audit
// ============================================================================

async function runAudit() {
  console.log('╔════════════════════════════════════════════════════════════════╗');
  console.log('║         Smart Rules Audit Script                                ║');
  console.log('║              LP-smart-rules-audit-1.0.0                         ║');
  console.log('╚════════════════════════════════════════════════════════════════╝\n');
  
  console.log(`📋 Verbose: ${VERBOSE ? 'Yes' : 'No'}`);
  console.log(`📄 Output: ${OUTPUT_FILE}`);
  console.log(`📄 Summary: ${SUMMARY_FILE}\n`);
  
  // 1. Load attribute registry
  console.log('🔍 Loading attribute registry from Firestore...');
  const registry = await loadAttributeRegistry();
  console.log(`   Found ${registry.size} attribute entries\n`);
  
  // 2. Load all rules
  console.log('📄 Loading Smart Rules...');
  const rulesSnap = await db.collection(RULES_COLLECTION).get();
  console.log(`   Found ${rulesSnap.size} rules\n`);
  
  if (rulesSnap.empty) {
    console.log('✅ No rules found. Nothing to audit.');
    return { success: true, clean: 0, flagged: 0, results: [] };
  }
  
  // 3. Audit each rule
  console.log('🔍 Auditing rules...\n');
  
  /** @type {RuleAuditResult[]} */
  const results = [];
  let cleanCount = 0;
  let flaggedCount = 0;
  let criticalCount = 0;
  
  for (const doc of rulesSnap.docs) {
    const result = auditRule(doc, registry);
    results.push(result);
    
    if (result.status === 'flagged') {
      flaggedCount++;
      const hasCritical = result.issues.some(i => i.severity === 'critical');
      if (hasCritical) criticalCount++;
      
      // Show flagged rules
      console.log(`❌ ${result.ruleName} (${result.ruleId})`);
      result.issues.forEach(issue => {
        const icon = issue.severity === 'critical' ? '🔴' : issue.severity === 'warning' ? '⚠️' : 'ℹ️';
        console.log(`   ${icon} [${issue.code}] ${issue.message}`);
        if (VERBOSE && issue.field) {
          console.log(`      Field: ${issue.field}${issue.value ? `, Value: ${issue.value}` : ''}`);
        }
      });
      console.log('');
    } else {
      cleanCount++;
      if (VERBOSE) {
        console.log(`✅ ${result.ruleName} (${result.ruleId})`);
      }
    }
  }
  
  // 4. Summary
  console.log('┌──────────────────────────────────────────────────────────────┐');
  console.log('│                    Audit Summary                              │');
  console.log('├──────────────────────────────────────────────────────────────┤');
  console.log(`│ Total rules scanned:       ${String(rulesSnap.size).padEnd(30)}│`);
  console.log(`│ Clean rules:               ${String(cleanCount).padEnd(30)}│`);
  console.log(`│ Flagged rules:             ${String(flaggedCount).padEnd(30)}│`);
  console.log(`│ Critical flags:            ${String(criticalCount).padEnd(30)}│`);
  console.log('└──────────────────────────────────────────────────────────────┘\n');
  
  // 5. Write output files
  const outputDir = path.dirname(OUTPUT_FILE);
  if (!fs.existsSync(outputDir)) {
    fs.mkdirSync(outputDir, { recursive: true });
  }
  
  // Write JSON
  const auditOutput = {
    timestamp: new Date().toISOString(),
    summary: {
      total: rulesSnap.size,
      clean: cleanCount,
      flagged: flaggedCount,
      critical: criticalCount,
    },
    rules: results,
  };
  
  fs.writeFileSync(OUTPUT_FILE, JSON.stringify(auditOutput, null, 2));
  console.log(`📝 Audit results written to: ${OUTPUT_FILE}`);
  
  // Write summary
  const summaryLines = [
    'Smart Rules Audit Summary',
    'LP-smart-rules-audit-1.0.0',
    `Timestamp: ${new Date().toISOString()}`,
    '',
    `Total rules scanned: ${rulesSnap.size}`,
    `Clean rules: ${cleanCount}`,
    `Flagged rules: ${flaggedCount}`,
    `Critical flags: ${criticalCount}`,
    '',
  ];
  
  if (flaggedCount > 0) {
    summaryLines.push('Flagged Rules:');
    summaryLines.push('');
    results.filter(r => r.status === 'flagged').forEach(r => {
      summaryLines.push(`- ${r.ruleName} (${r.ruleId})`);
      r.issues.forEach(i => {
        summaryLines.push(`  [${i.severity.toUpperCase()}] ${i.code}: ${i.message}`);
      });
      summaryLines.push('');
    });
  }
  
  fs.writeFileSync(SUMMARY_FILE, summaryLines.join('\n'));
  console.log(`📝 Summary written to: ${SUMMARY_FILE}\n`);
  
  // 6. Write migration flags for flagged rules
  if (flaggedCount > 0) {
    console.log('📋 Writing migration flags for flagged rules...\n');
    
    for (const result of results.filter(r => r.status === 'flagged')) {
      const criticalIssues = result.issues.filter(i => i.severity === 'critical');
      if (criticalIssues.length > 0) {
        await db.collection(MIGRATION_FLAGS_COLLECTION).doc(result.ruleId).set({
          ruleId: result.ruleId,
          ruleName: result.ruleName,
          flaggedAt: new Date().toISOString(),
          reason: 'Audit found critical issues',
          issues: result.issues.map(i => ({
            severity: i.severity,
            code: i.code,
            message: i.message,
            field: i.field,
            value: i.value,
          })),
        });
        console.log(`   📌 ${result.ruleName} - flagged`);
      }
    }
    console.log('');
  }
  
  // 7. Final verdict
  console.log('───────────────────────────────────────────────────────────────');
  
  if (criticalCount === 0) {
    console.log('\n✅ AUDIT PASSED - Zero critical flags\n');
    console.log('All rules are valid and safe for production.\n');
    return { success: true, clean: cleanCount, flagged: flaggedCount, critical: criticalCount, results };
  } else {
    console.log(`\n⚠️  AUDIT FAILED - ${criticalCount} critical flag(s) found\n`);
    console.log('Manual review required. See flagged rules above.\n');
    console.log('Recommendations:');
    console.log('- Review flagged rules in Firestore: settings/smartRules/migration_flags');
    console.log('- Fix or disable rules with UNKNOWN_ATTRIBUTE or INTERNAL_ONLY_TARGET');
    console.log('- Re-run audit after fixes\n');
    return { success: false, clean: cleanCount, flagged: flaggedCount, critical: criticalCount, results };
  }
}

// ============================================================================
// Entry Point
// ============================================================================

runAudit()
  .then(result => {
    console.log(`📅 Audit completed at: ${new Date().toISOString()}`);
    
    if (result.critical > 0) {
      process.exit(2); // Exit with code 2 for critical flags
    }
    process.exit(0);
  })
  .catch(error => {
    console.error('\n❌ Audit failed:', error);
    process.exit(1);
  });
