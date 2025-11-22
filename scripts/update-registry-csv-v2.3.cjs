#!/usr/bin/env node
/**
 * Update attribute-registry.csv with requiredForExport and importRequired columns
 */

const fs = require('fs');
const path = require('path');

const REGISTRY_JSON = path.join(__dirname, 'attribute-registry-normalized.json');
const REGISTRY_CSV = path.join(__dirname, 'attribute-registry.csv');

// Read JSON registry
const registry = JSON.parse(fs.readFileSync(REGISTRY_JSON, 'utf8'));

// Create CSV content
const header = 'Canonical Path,Label,Category,Data Type,Required,Export,Required For Export,Import Required,Legacy Paths,Importer Columns,Rules,Normalization Note';

const rows = registry.map(attr => {
  const legacyPaths = attr.legacyPaths.join(';');
  const importerColumns = attr.importerColumns.join(';');
  const rules = attr.rules.join(';');
  const normNote = attr.description || '';
  
  return [
    attr.canonicalPath,
    attr.label,
    attr.category,
    attr.dataType,
    attr.required,
    attr.export,
    attr.requiredForExport ?? false,
    attr.importRequired ?? false,
    `"${legacyPaths}"`,
    `"${importerColumns}"`,
    `"${rules}"`,
    `"${normNote}"`
  ].join(',');
});

const csv = [header, ...rows].join('\n') + '\n';

fs.writeFileSync(REGISTRY_CSV, csv, 'utf8');

console.log(`✅ Updated CSV with ${rows.length} attributes including requiredForExport and importRequired columns`);
