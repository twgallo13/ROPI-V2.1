/* eslint-env node */
/* eslint-disable @typescript-eslint/no-require-imports */
/**
 * Patch attribute-registry.json (SOURCE) with v2.1 importer aliases
 * This must be applied to the SOURCE file, not the normalized output
 */

const fs = require('fs');
const path = require('path');

const registryPath = path.join(__dirname, 'attribute-registry.json');

console.log('Patching SOURCE registry (attribute-registry.json) with v2.1 aliases...\n');

// Read the source registry
const registry = JSON.parse(fs.readFileSync(registryPath, 'utf-8'));

let updateCount = 0;

// Update rics_source.color
const ricsColor = registry.find(attr => attr.canonicalPath === 'rics_source.color');
if (ricsColor) {
  ricsColor.importerColumns = [
    'RICS Color',
    'rics_color',
    'RICS_COLOR',
    'RICS Source.Color',
    'Color'
  ];
  console.log('✓ Patched rics_source.color importerColumns:', ricsColor.importerColumns);
  updateCount++;
}

// Update rics_source.shortDescription
const ricsShortDesc = registry.find(attr => attr.canonicalPath === 'rics_source.shortDescription');
if (ricsShortDesc) {
  ricsShortDesc.importerColumns = [
    'RICS Source.Short Description',
    'rics_long_desc',
    'RICS Long Description'
  ];
  console.log('✓ Patched rics_source.shortDescription importerColumns:', ricsShortDesc.importerColumns);
  updateCount++;
}

// Update launch.klPostDate
const klPostDate = registry.find(attr => attr.canonicalPath === 'launch.klPostDate');
if (klPostDate) {
  klPostDate.importerColumns = [
    'kl_post_date',
    'KL Post Date',
    'KL_POST_DATE',
    'klPostDate'
  ];
  console.log('✓ Patched launch.klPostDate importerColumns:', klPostDate.importerColumns);
  updateCount++;
}

// Verify technical.variantCount is non-importable
const variantCount = registry.find(attr => attr.canonicalPath === 'technical.variantCount');
if (variantCount) {
  variantCount.importerColumns = [];
  variantCount.export = false;
  console.log('✓ Verified technical.variantCount non-importable (importerColumns=[], export=false)');
  updateCount++;
}

// Write back to file
fs.writeFileSync(registryPath, JSON.stringify(registry, null, 2));
console.log(`\n✅ Patched source registry with ${updateCount} updates`);
console.log('   Written to:', registryPath);
console.log('\nNext step: Run normalizeAndSeedAttributes.ts --seed to apply changes to Firestore');
