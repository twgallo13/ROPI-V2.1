#!/usr/bin/env node
/**
 * Generate Missing Importer Columns Report
 * 
 * Scans attribute-registry-normalized.json and reports which attributes
 * have empty importerColumns arrays.
 */

const fs = require('fs');
const path = require('path');

const REGISTRY_PATH = path.join(__dirname, 'attribute-registry-normalized.json');

console.log('Generating Missing Importer Columns Report...');

// Read the registry
let registry;
try {
  const content = fs.readFileSync(REGISTRY_PATH, 'utf8');
  registry = JSON.parse(content);
  console.log(`Loaded ${registry.length} attributes from registry`);
} catch (error) {
  console.error('Failed to read registry:', error.message);
  process.exit(1);
}

// Find attributes with missing importer columns
const missingImporters = [];
const aiOutputFields = [];
const intentionalNonImportable = [];

for (const attr of registry) {
  if (!attr.importerColumns || attr.importerColumns.length === 0) {
    // Categorize based on path
    if (attr.canonicalPath.startsWith('a_i_generated.')) {
      aiOutputFields.push(attr);
    } else if (attr.canonicalPath === 'technical.variantCount') {
      // Intentionally non-importable per business rule
      intentionalNonImportable.push(attr);
    } else {
      missingImporters.push(attr);
    }
  }
}

// Generate report
const report = {
  timestamp: new Date().toISOString(),
  totalAttributes: registry.length,
  summary: {
    withImporters: registry.length - missingImporters.length - aiOutputFields.length - intentionalNonImportable.length,
    missingImporters: missingImporters.length,
    aiOutputFields: aiOutputFields.length,
    intentionalNonImportable: intentionalNonImportable.length
  },
  aiOutputFields: aiOutputFields.map(a => ({
    canonicalPath: a.canonicalPath,
    label: a.label,
    category: a.category,
    export: a.export
  })),
  intentionalNonImportable: intentionalNonImportable.map(a => ({
    canonicalPath: a.canonicalPath,
    label: a.label,
    category: a.category,
    export: a.export,
    reason: 'Business rule: calculated/derived field, not directly importable'
  })),
  missingImporters: missingImporters.map(a => ({
    canonicalPath: a.canonicalPath,
    label: a.label,
    category: a.category,
    dataType: a.dataType,
    export: a.export
  }))
};

// Output the report
console.log(JSON.stringify(report, null, 2));

// Summary to stderr so it doesn't pollute JSON output
console.error('\n=== SUMMARY ===');
console.error(`Total attributes: ${report.totalAttributes}`);
console.error(`With importers: ${report.summary.withImporters}`);
console.error(`AI output fields (no importers): ${report.summary.aiOutputFields}`);
console.error(`Intentional non-importable: ${report.summary.intentionalNonImportable}`);
console.error(`Missing importers (business fields): ${report.summary.missingImporters}`);

if (report.missingImporters.length > 0) {
  console.error('\n⚠ WARNING: Some business fields are missing importer columns:');
  report.missingImporters.forEach(a => console.error(`  - ${a.canonicalPath}`));
}

process.exit(0);
