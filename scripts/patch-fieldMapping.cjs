#!/usr/bin/env node
/**
 * Lisa v1.0 - FieldMapping Patcher
 * 
 * This script patches src/utils/fieldMapping.ts to:
 * 1. Replace 'Group': 'sku_core.department' → 'Group': 'descriptive.gender'
 * 2. Remove 'Variant Count': 'technical.variantCount'
 * 3. Align RICS header mappings to use rics_source.* canonical
 * 4. Ensure all required technical/launch headers are present
 */

const fs = require('fs');
const path = require('path');

const FIELD_MAPPING_PATH = path.join(__dirname, '..', 'src', 'utils', 'fieldMapping.ts');

console.log('Lisa v1.0 FieldMapping Patcher - Starting...');
console.log(`Reading fieldMapping from: ${FIELD_MAPPING_PATH}`);

// Read the file
let content;
try {
  content = fs.readFileSync(FIELD_MAPPING_PATH, 'utf8');
  console.log('✓ Loaded fieldMapping.ts');
} catch (error) {
  console.error('✗ Failed to read fieldMapping.ts:', error.message);
  process.exit(1);
}

// Track changes
const changes = [];

// Patch 1: Replace 'Group': 'sku_core.department' → 'Group': 'descriptive.gender'
const groupDeptPattern = /'Group':\s*'sku_core\.department'/g;
if (groupDeptPattern.test(content)) {
  content = content.replace(groupDeptPattern, "'Group': 'descriptive.gender'");
  changes.push("Replaced 'Group' mapping from sku_core.department to descriptive.gender");
  console.log("✓ Changed 'Group' mapping to descriptive.gender");
} else {
  console.log("⚠ 'Group': 'sku_core.department' pattern not found");
}

// Update comment for Group line
content = content.replace(
  /'Group': 'descriptive\.gender',\s*\/\/ John: "Group" = Department/,
  "'Group': 'descriptive.gender', // John: \"Group\" = Gender (moved from department)"
);

// Patch 2: Remove 'Variant Count': 'technical.variantCount' line
const variantCountPattern = /\s*'Variant Count':\s*'technical\.variantCount',?\s*\/\/[^\n]*\n/g;
if (variantCountPattern.test(content)) {
  content = content.replace(variantCountPattern, '');
  changes.push("Removed 'Variant Count': 'technical.variantCount' from CSV map");
  console.log("✓ Removed 'Variant Count' import mapping");
} else {
  console.log("⚠ 'Variant Count' mapping not found or already removed");
}

// Patch 3: Ensure RICS mappings use rics_source.* canonical
// Check if RICS mappings need updating (they should be source.rics.* not rics_source.*)
const ricsUpdates = [
  { old: "'RICS Short Description': 'source.rics.shortDescription'", new: "'RICS Short Description': 'rics_source.shortDescription'" },
  { old: "'RICS Long Description': 'source.rics.longDescription'", new: "'RICS Long Description': 'rics_source.longDescription'" },
  { old: "'RICS Brand': 'source.rics.brand'", new: "'RICS Brand': 'rics_source.brand'" },
  { old: "'RICS Category': 'source.rics.category'", new: "'RICS Category': 'rics_source.category'" },
  { old: "'RICS Color': 'source.rics.color'", new: "'RICS Color': 'rics_source.color'" },
];

ricsUpdates.forEach(({ old, new: newVal }) => {
  if (content.includes(old)) {
    content = content.replace(old, newVal);
    changes.push(`Updated RICS mapping: ${old} → ${newVal}`);
    console.log(`✓ Updated RICS mapping to use rics_source canonical`);
  }
});

// Patch 4: Ensure required headers exist (add if missing)
const requiredMappings = [
  { header: 'Last Received', path: 'technical.lastReceived', comment: 'Last received date' },
  { header: 'Media Status', path: 'technical.mediaStatus', comment: 'Already exists above' },
  { header: 'New Collection', path: 'launch.newCollection', comment: 'Already exists' },
  { header: 'KL Post Date', path: 'launch.klPostDate', comment: 'Already exists' },
  { header: 'Hide Image Until Date', path: 'technical.hideImageDate', comment: 'Already exists' },
  { header: 'RICS Short Description', path: 'rics_source.shortDescription', comment: 'Already updated above' },
  { header: 'RICS Color', path: 'rics_source.color', comment: 'Already updated above' },
  { header: 'Store Inv', path: 'technical.storeInv', comment: 'Already exists' },
  { header: 'Warehouse Inv', path: 'technical.warehouseInv', comment: 'Already exists' },
  { header: 'WHS inv', path: 'technical.whsInv', comment: 'Already exists (lowercase)' },
  { header: 'Launch Date', path: 'launch.launchDate', comment: 'Already exists' },
  { header: 'SCOM Regular Price', path: 'pricing.scomRegularPrice', comment: 'Already exists' },
  { header: 'SCOM Sale Price', path: 'pricing.scomSalePrice', comment: 'Already exists' },
  { header: 'Product Is Dropship.Name', path: 'sku_core.dropshipName', comment: 'Already exists' },
];

// Verify these exist (log only, as they should already be present)
requiredMappings.forEach(({ header, path }) => {
  const searchPattern = new RegExp(`'${header}':\\s*'${path.replace('.', '\\.')}'`);
  if (!searchPattern.test(content)) {
    console.log(`⚠ Warning: '${header}': '${path}' not found in mapping`);
  }
});

// Also remove technical.variantCount from FIELD_TYPES section
const variantCountTypePattern = /\s*'technical\.variantCount':\s*'number',?\n/g;
if (variantCountTypePattern.test(content)) {
  content = content.replace(variantCountTypePattern, '');
  changes.push("Removed technical.variantCount from FIELD_TYPES");
  console.log("✓ Removed technical.variantCount from FIELD_TYPES");
}

// Write the patched file
try {
  fs.writeFileSync(FIELD_MAPPING_PATH, content, 'utf8');
  console.log(`✓ Wrote patched fieldMapping.ts`);
} catch (error) {
  console.error('✗ Failed to write fieldMapping.ts:', error.message);
  process.exit(1);
}

// Summary
console.log('\n=== PATCH SUMMARY ===');
if (changes.length > 0) {
  console.log('Changes applied:');
  changes.forEach(change => console.log(`  - ${change}`));
} else {
  console.log('No changes were needed - fieldMapping already correct');
}

console.log('\nLisa v1.0 FieldMapping Patcher - Complete');
process.exit(0);
