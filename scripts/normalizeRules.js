#!/usr/bin/env node
/**
 * normalizeRules.js
 * Scan settings/smartRules/rules and normalize or quarantine invalid rules.
 * 
 * LP-smart-rules-migration-1.0.0 (Lisa canonical)
 *
 * Usage:
 *   node scripts/normalizeRules.js --dry-run        # Preview changes without applying
 *   node scripts/normalizeRules.js                  # Apply normalization
 *   node scripts/normalizeRules.js --quarantine     # Move unfixable rules to quarantine
 *   node scripts/normalizeRules.js --env=staging    # Use staging environment
 *   node scripts/normalizeRules.js --help           # Show help
 */

const admin = require('firebase-admin');
const { z } = require('zod');
const path = require('path');
const fs = require('fs');

// ============================================================================
// Schema Definition (inline to avoid import issues)
// ============================================================================

const ConditionSchema = z.object({
  field: z.string().min(1),
  matchType: z.enum(['token', 'phrase', 'regex', 'contains']),
  value: z.string().default(''),
  options: z.array(z.any()).default([]),
});

const ActionSchema = z.object({
  targetField: z.string().min(1),
  valueTemplate: z.string().default(''),
  confidenceModifier: z.number().optional(),
});

const RuleSchema = z.object({
  ruleId: z.string().optional(),
  name: z.string().min(1),
  description: z.string().default(''),
  enabled: z.boolean().default(true),
  priority: z.number().int().default(100),
  condition: z.union([ConditionSchema, z.array(ConditionSchema)])
    .transform((v) => (Array.isArray(v) ? v : [v])),
  action: ActionSchema,
  autoApply: z.boolean().default(false),
  autoApplyConfidence: z.number().min(0).max(1).optional(),
  tags: z.array(z.string()).default([]),
  packId: z.string().nullable().optional(),
  createdBy: z.string().optional(),
  createdAt: z.any().optional(),
  updatedBy: z.string().optional(),
  updatedAt: z.any().optional(),
});

// ============================================================================
// Initialization
// ============================================================================

function initializeFirebase(env) {
  // Check for existing initialization
  if (admin.apps.length > 0) {
    return admin.firestore();
  }

  // Try to load service account based on environment
  const serviceAccountPath = env === 'staging'
    ? path.resolve(__dirname, '../serviceAccountKey-staging.json')
    : path.resolve(__dirname, '../serviceAccountKey.json');

  if (fs.existsSync(serviceAccountPath)) {
    const serviceAccount = require(serviceAccountPath);
    admin.initializeApp({
      credential: admin.credential.cert(serviceAccount),
    });
    console.log(`Initialized Firebase with service account: ${serviceAccountPath}`);
  } else {
    // Use default credentials (for Cloud Functions or emulator)
    admin.initializeApp();
    console.log('Initialized Firebase with default credentials');
  }

  return admin.firestore();
}

// ============================================================================
// Normalization Logic
// ============================================================================

/**
 * Attempt to normalize a rule to match the canonical schema
 */
function normalizeRule(data) {
  // Apply defaults for missing fields
  const normalized = {
    ...data,
    description: data.description ?? '',
    tags: data.tags ?? [],
    autoApply: data.autoApply ?? false,
    priority: data.priority ?? 100,
    enabled: data.enabled ?? true,
  };

  // Normalize condition to array format
  if (data.condition) {
    if (Array.isArray(data.condition)) {
      normalized.condition = data.condition.map(c => ({
        field: c.field || '',
        matchType: c.matchType || 'contains',
        value: c.value ?? '',
        options: Array.isArray(c.options) ? c.options : [],
      }));
    } else {
      normalized.condition = [{
        field: data.condition.field || '',
        matchType: data.condition.matchType || 'contains',
        value: data.condition.value ?? '',
        options: Array.isArray(data.condition.options) ? data.condition.options : [],
      }];
    }
  } else {
    // No condition - this is likely invalid but we'll let the schema catch it
    normalized.condition = [];
  }

  // Normalize action
  if (data.action) {
    normalized.action = {
      targetField: data.action.targetField || '',
      valueTemplate: data.action.valueTemplate ?? '',
      ...(data.action.confidenceModifier !== undefined && { 
        confidenceModifier: data.action.confidenceModifier 
      }),
    };
  }

  return normalized;
}

/**
 * Validate a rule against the canonical schema
 */
function validateRule(data) {
  try {
    RuleSchema.parse(data);
    return { valid: true, issues: [] };
  } catch (err) {
    const issues = err.errors || err.issues || [{ message: err.message }];
    return { valid: false, issues };
  }
}

// ============================================================================
// Main Migration Logic
// ============================================================================

async function main() {
  // Parse arguments
  const args = process.argv.slice(2);
  const dryRun = args.includes('--dry-run');
  const quarantine = args.includes('--quarantine');
  const help = args.includes('--help') || args.includes('-h');
  const envArg = args.find(a => a.startsWith('--env='));
  const env = envArg ? envArg.split('=')[1] : 'production';

  if (help) {
    console.log(`
normalizeRules.js - Smart Rules Migration Tool

Usage:
  node scripts/normalizeRules.js [options]

Options:
  --dry-run      Preview changes without applying them
  --quarantine   Move unfixable rules to quarantine collection
  --env=<env>    Use specific environment (staging, production)
  --help, -h     Show this help message

Examples:
  node scripts/normalizeRules.js --dry-run
  node scripts/normalizeRules.js --env=staging
  node scripts/normalizeRules.js --quarantine
`);
    process.exit(0);
  }

  console.log('='.repeat(60));
  console.log('Smart Rules Migration Tool');
  console.log('='.repeat(60));
  console.log(`Environment: ${env}`);
  console.log(`Dry run: ${dryRun}`);
  console.log(`Quarantine mode: ${quarantine}`);
  console.log('');

  // Initialize Firebase
  const db = initializeFirebase(env);
  const rulesRef = db.collection('settings').doc('smartRules').collection('rules');
  const quarantineRef = db.collection('settings').doc('smartRules').collection('quarantine');

  // Fetch all rules
  console.log('Fetching rules...');
  const snapshot = await rulesRef.get();
  console.log(`Found ${snapshot.docs.length} rules\n`);

  // Summary counters
  const summary = {
    total: 0,
    valid: 0,
    normalized: 0,
    quarantined: 0,
    failed: 0,
  };

  // Process each rule
  for (const doc of snapshot.docs) {
    summary.total++;
    const data = doc.data();
    const ruleId = doc.id;

    console.log(`Processing rule: ${ruleId}`);
    console.log(`  Name: ${data.name || '(unnamed)'}`);

    // First, check if already valid
    const initialValidation = validateRule(data);
    if (initialValidation.valid) {
      console.log('  ✓ Already valid');
      summary.valid++;
      continue;
    }

    console.log(`  ✗ Invalid: ${JSON.stringify(initialValidation.issues.map(i => i.message || i))}`);

    // Attempt normalization
    const normalized = normalizeRule(data);
    const normalizedValidation = validateRule(normalized);

    if (normalizedValidation.valid) {
      console.log('  → Can be normalized');
      
      if (!dryRun) {
        try {
          await rulesRef.doc(doc.id).set(normalized);
          console.log('  ✓ Normalized and saved');
          summary.normalized++;
        } catch (writeErr) {
          console.error(`  ✗ Failed to save normalized rule: ${writeErr.message}`);
          summary.failed++;
        }
      } else {
        console.log('  (dry-run: would normalize)');
        summary.normalized++;
      }
    } else {
      console.log(`  ✗ Cannot normalize: ${JSON.stringify(normalizedValidation.issues.map(i => i.message || i))}`);
      
      if (quarantine) {
        if (!dryRun) {
          try {
            // Move to quarantine
            await quarantineRef.doc(doc.id).set({
              original: data,
              reason: initialValidation.issues,
              migratedAt: admin.firestore.FieldValue.serverTimestamp(),
            });
            await rulesRef.doc(doc.id).delete();
            console.log('  → Moved to quarantine');
            summary.quarantined++;
          } catch (quarErr) {
            console.error(`  ✗ Failed to quarantine: ${quarErr.message}`);
            summary.failed++;
          }
        } else {
          console.log('  (dry-run: would quarantine)');
          summary.quarantined++;
        }
      } else {
        summary.failed++;
      }
    }
    console.log('');
  }

  // Print summary
  console.log('='.repeat(60));
  console.log('Summary');
  console.log('='.repeat(60));
  console.log(`Total rules:      ${summary.total}`);
  console.log(`Already valid:    ${summary.valid}`);
  console.log(`Normalized:       ${summary.normalized}`);
  console.log(`Quarantined:      ${summary.quarantined}`);
  console.log(`Failed:           ${summary.failed}`);
  console.log('');

  if (dryRun) {
    console.log('This was a dry run. No changes were made.');
    console.log('Run without --dry-run to apply changes.');
  }
}

// ============================================================================
// Entry Point
// ============================================================================

main()
  .then(() => {
    console.log('\nMigration complete.');
    process.exit(0);
  })
  .catch((err) => {
    console.error('Migration failed:', err);
    process.exit(1);
  });
