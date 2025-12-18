#!/usr/bin/env node
/**
 * scripts/normalize-attributes-report.js
 *
 * Connects to Firestore, validates attributes against AttributeSchema,
 * and writes detailed diffs for attributes that differ from the validated object.
 *
 * Usage:
 *   export GOOGLE_APPLICATION_CREDENTIALS=/path/to/staging-sa.json
 *   node scripts/normalize-attributes-report.js
 *
 * Output:
 *   - docs/lisa/normalize-dryrun-staging.json  (full array of {id, diffs})
 *   - docs/lisa/normalize-dryrun-staging.md    (human readable summary)
 */

const admin = require('firebase-admin');
const fs = require('fs');
const path = require('path');

// Load AttributeSchema from SDK
let AttributeSchema;
try {
  const sdk = require('../packages/sdk/dist/index.js');
  AttributeSchema = sdk.AttributeSchema;
  console.log('Loaded AttributeSchema from packages/sdk/dist');
} catch (err) {
  console.error('Could not load AttributeSchema:', err.message);
  process.exit(1);
}

if (!admin.apps.length) {
  admin.initializeApp();
}

const db = admin.firestore();

async function run() {
  const outJson = [];
  const collectionPath = 'settings/attributes/keys';
  console.log('Scanning collection:', collectionPath);

  const snap = await db.collection('settings').doc('attributes').collection('keys').get();
  console.log(`Found ${snap.size} documents`);

  // Categorize documents
  const deprecatedDocs = [];
  const validDocs = [];
  const invalidDocs = [];
  const docsWithDiffs = [];

  for (const doc of snap.docs) {
    const id = doc.id;
    const data = doc.data() || {};
    
    // Check if this is a deprecated stub (only has status, deprecated_in_favor_of, deprecatedAt)
    const isDeprecatedStub = data.status === 'deprecated' && 
                             data.deprecated_in_favor_of && 
                             !data.label;
    
    if (isDeprecatedStub) {
      deprecatedDocs.push({ id, data });
      continue;
    }

    // Map actual Firestore fields to AttributeSchema fields
    // The Firestore schema uses different field names than AttributeSchema
    const candidate = {
      attribute_id: id.toLowerCase().replace(/[^a-z0-9_-]/g, '_'),
      label: data.label || id,
      data_type: mapDataType(data.dataType || data.data_type || 'string'),
      status: mapStatus(data.status),
      external_header: data.external_header || data.externalHeader || '',
      category: data.category || '',
      allowed_values: data.allowed_values || data.allowedValues || [],
      synonyms: data.synonyms || [],
      required_for_completion: data.required_for_completion || data.required || false,
      required_for_export: data.required_for_export || data.export || false,
      import_required: data.import_required || false,
      ai_usage_notes: data.ai_usage_notes || data.description || '',
      source: data.source || 'notion',
    };

    try {
      // Zod validation (will throw if invalid)
      const validated = AttributeSchema.parse(candidate);

      // Compute diffs between original candidate and validated
      const diffs = [];
      const keys = new Set([...Object.keys(candidate), ...Object.keys(validated)]);
      for (const k of keys) {
        if (['createdAt','updatedAt','createdBy','updatedBy'].includes(k)) continue;
        
        const before = candidate.hasOwnProperty(k) ? candidate[k] : undefined;
        const after = validated.hasOwnProperty(k) ? validated[k] : undefined;
        const beforeStr = JSON.stringify(before);
        const afterStr = JSON.stringify(after);
        if (beforeStr !== afterStr) {
          diffs.push({ key: k, before, after });
        }
      }

      if (diffs.length > 0) {
        docsWithDiffs.push({ id, diffs, original: data, candidate, validated });
        outJson.push({ id, diffs, schemaMismatch: false });
      }
      validDocs.push({ id, data, candidate, validated });

    } catch (err) {
      // Validation error — capture for report
      const errMsg = err && err.errors ? err.errors : (err && err.message ? err.message : String(err));
      invalidDocs.push({ id, data, candidate, error: errMsg });
      outJson.push({ id, error: errMsg, schemaMismatch: true });
    }
  }

  // Write JSON report
  const jsonPath = path.resolve('docs/lisa/normalize-dryrun-staging.json');
  fs.mkdirSync(path.dirname(jsonPath), { recursive: true });
  fs.writeFileSync(jsonPath, JSON.stringify(outJson, null, 2), 'utf8');
  console.log('Wrote JSON report to', jsonPath);

  // Write markdown summary
  const mdPath = path.resolve('docs/lisa/normalize-dryrun-staging.md');
  const lines = [];
  const now = new Date().toISOString();
  
  lines.push(`# Normalize Dry-Run Report — Staging`);
  lines.push(`**Generated:** ${now}`);
  lines.push('');
  lines.push(`## Summary`);
  lines.push('');
  lines.push(`| Metric | Count |`);
  lines.push(`|--------|-------|`);
  lines.push(`| Total attribute docs scanned | ${snap.size} |`);
  lines.push(`| Deprecated stub docs (skipped) | ${deprecatedDocs.length} |`);
  lines.push(`| Valid docs (no diffs) | ${validDocs.length - docsWithDiffs.length} |`);
  lines.push(`| Docs with diffs | ${docsWithDiffs.length} |`);
  lines.push(`| Docs with validation errors | ${invalidDocs.length} |`);
  lines.push('');
  
  lines.push(`## Schema Mapping Notes`);
  lines.push('');
  lines.push('The Firestore attribute documents use a different schema than `AttributeSchema`:');
  lines.push('');
  lines.push('| Firestore Field | AttributeSchema Field |');
  lines.push('|-----------------|----------------------|');
  lines.push('| `dataType` | `data_type` |');
  lines.push('| `required` | `required_for_completion` |');
  lines.push('| `export` | `required_for_export` |');
  lines.push('| `description` | `ai_usage_notes` |');
  lines.push('| `allowedValues` | `allowed_values` |');
  lines.push('');
  
  if (docsWithDiffs.length > 0) {
    lines.push('## Sample diffs (up to 10)');
    lines.push('');
    docsWithDiffs.slice(0, 10).forEach(item => {
      lines.push(`### ${item.id}`);
      lines.push('');
      item.diffs.forEach(d => {
        lines.push(`- **${d.key}**`);
        lines.push(`  - before: \`${JSON.stringify(d.before)}\``);
        lines.push(`  - after:  \`${JSON.stringify(d.after)}\``);
      });
      lines.push('');
    });
  }

  if (invalidDocs.length > 0) {
    lines.push('## Validation Errors');
    lines.push('');
    lines.push('⚠️ **BLOCKING ISSUE**: The following documents fail schema validation.');
    lines.push('');
    invalidDocs.slice(0, 20).forEach(e => {
      lines.push(`### ${e.id}`);
      lines.push('');
      lines.push('**Original data keys:** ' + Object.keys(e.data).join(', '));
      lines.push('');
      lines.push('**Mapped candidate:**');
      lines.push('```json');
      lines.push(JSON.stringify(e.candidate, null, 2));
      lines.push('```');
      lines.push('');
      lines.push('**Error:**');
      lines.push('```json');
      lines.push(JSON.stringify(e.error, null, 2));
      lines.push('```');
      lines.push('');
    });
  }

  if (deprecatedDocs.length > 0) {
    lines.push('## Deprecated Stubs (Not Processed)');
    lines.push('');
    lines.push(`${deprecatedDocs.length} documents are deprecated stubs with only \`status\`, \`deprecated_in_favor_of\`, and \`deprecatedAt\` fields. These were skipped.`);
    lines.push('');
    lines.push('**Sample deprecated stubs:**');
    lines.push('');
    deprecatedDocs.slice(0, 10).forEach(d => {
      lines.push(`- \`${d.id}\` → deprecated in favor of \`${d.data.deprecated_in_favor_of}\``);
    });
    lines.push('');
  }

  fs.writeFileSync(mdPath, lines.join('\n'), 'utf8');
  console.log('Wrote Markdown report to', mdPath);
  
  // Print summary to console
  console.log('\n=== SUMMARY ===');
  console.log(`Total docs: ${snap.size}`);
  console.log(`Deprecated stubs: ${deprecatedDocs.length}`);
  console.log(`Valid docs: ${validDocs.length}`);
  console.log(`Docs with diffs: ${docsWithDiffs.length}`);
  console.log(`Validation errors: ${invalidDocs.length}`);
  
  if (invalidDocs.length > 0) {
    console.log('\n⚠️  VALIDATION ERRORS FOUND - Normalization blocked');
    process.exit(1);
  }
}

// Helper function to map Firestore dataType to AttributeSchema data_type
function mapDataType(dt) {
  const mapping = {
    'string': 'string',
    'number': 'number',
    'boolean': 'boolean',
    'enum': 'enum',
    'currency': 'currency',
    'json': 'json',
    'object': 'json',
    'array': 'json',
    'multiSelect': 'multiSelect',
    'date': 'date',
    'datetime': 'date',
  };
  return mapping[dt] || 'string';
}

// Helper function to map status values
function mapStatus(status) {
  if (status === 'active' || status === 'deprecated' || status === 'hidden') {
    return status;
  }
  return 'active';
}

run().catch(err => {
  console.error('Script failed:', err);
  process.exit(1);
});
