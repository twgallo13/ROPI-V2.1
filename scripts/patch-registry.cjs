#!/usr/bin/env node
/**
 * Lisa v1.0 - Registry Patcher
 * 
 * This script patches scripts/attribute-registry-normalized.json to:
 * 1. Set technical.variantCount.importerColumns = [] and export = false
 * 2. Remove "Group" from sku_core.department.importerColumns
 * 3. Add "Group" to descriptive.gender.importerColumns
 * 4. Ensure descriptive.primaryColor and descriptive.madeIn keep required importer aliases
 * 5. Ensure descriptive.custom2 and descriptive.custom3 exist with proper aliases
 * 6. Do not modify a_i_generated.* importerColumns
 */

const fs = require('fs');
const path = require('path');

const REGISTRY_PATH = path.join(__dirname, 'attribute-registry-normalized.json');

console.log('Lisa v1.0 Registry Patcher - Starting...');
console.log(`Reading registry from: ${REGISTRY_PATH}`);

// Read the registry
let registry;
try {
  const content = fs.readFileSync(REGISTRY_PATH, 'utf8');
  registry = JSON.parse(content);
  console.log(`✓ Loaded ${registry.length} attributes`);
} catch (error) {
  console.error('✗ Failed to read registry:', error.message);
  process.exit(1);
}

// Track changes
const changes = [];

// Patch 1: technical.variantCount - make non-importable and non-exportable
const variantCount = registry.find(attr => attr.canonicalPath === 'technical.variantCount');
if (variantCount) {
  const hadImporters = variantCount.importerColumns && variantCount.importerColumns.length > 0;
  const hadExport = variantCount.export === true;
  
  variantCount.importerColumns = [];
  variantCount.export = false;
  
  if (hadImporters || hadExport) {
    changes.push('technical.variantCount: removed importerColumns and set export=false');
    console.log('✓ Patched technical.variantCount (non-importable, non-exportable)');
  } else {
    console.log('✓ technical.variantCount already correct');
  }
} else {
  console.log('⚠ technical.variantCount not found in registry');
}

// Patch 2: Remove "Group" from sku_core.department.importerColumns
const department = registry.find(attr => attr.canonicalPath === 'sku_core.department');
if (department) {
  const originalImporters = [...(department.importerColumns || [])];
  department.importerColumns = department.importerColumns.filter(col => col !== 'Group');
  
  if (originalImporters.length !== department.importerColumns.length) {
    changes.push('sku_core.department: removed "Group" from importerColumns');
    console.log('✓ Removed "Group" from sku_core.department.importerColumns');
  } else {
    console.log('✓ "Group" was not in sku_core.department.importerColumns');
  }
} else {
  console.log('⚠ sku_core.department not found in registry');
}

// Patch 3: Add "Group" to descriptive.gender.importerColumns
const gender = registry.find(attr => attr.canonicalPath === 'descriptive.gender');
if (gender) {
  if (!gender.importerColumns) {
    gender.importerColumns = [];
  }
  
  if (!gender.importerColumns.includes('Group')) {
    gender.importerColumns.push('Group');
    changes.push('descriptive.gender: added "Group" to importerColumns');
    console.log('✓ Added "Group" to descriptive.gender.importerColumns');
  } else {
    console.log('✓ "Group" already in descriptive.gender.importerColumns');
  }
} else {
  console.log('⚠ descriptive.gender not found in registry');
}

// Patch 4: Verify descriptive.primaryColor has required aliases
const primaryColor = registry.find(attr => attr.canonicalPath === 'descriptive.primaryColor');
if (primaryColor) {
  const requiredAliases = ['primary_color', 'primaryColor', 'primary_colour', 'Primary Color'];
  const missing = requiredAliases.filter(alias => !primaryColor.importerColumns.includes(alias));
  
  if (missing.length > 0) {
    primaryColor.importerColumns.push(...missing);
    changes.push(`descriptive.primaryColor: added missing aliases: ${missing.join(', ')}`);
    console.log(`✓ Added missing aliases to descriptive.primaryColor: ${missing.join(', ')}`);
  } else {
    console.log('✓ descriptive.primaryColor has all required aliases');
  }
} else {
  console.log('⚠ descriptive.primaryColor not found in registry');
}

// Patch 5: Verify descriptive.madeIn has required aliases
const madeIn = registry.find(attr => attr.canonicalPath === 'descriptive.madeIn');
if (madeIn) {
  const requiredAliases = ['made_in', 'country_of_origin', 'country', 'origin'];
  const missing = requiredAliases.filter(alias => !madeIn.importerColumns.includes(alias));
  
  if (missing.length > 0) {
    madeIn.importerColumns.push(...missing);
    changes.push(`descriptive.madeIn: added missing aliases: ${missing.join(', ')}`);
    console.log(`✓ Added missing aliases to descriptive.madeIn: ${missing.join(', ')}`);
  } else {
    console.log('✓ descriptive.madeIn has all required aliases');
  }
} else {
  console.log('⚠ descriptive.madeIn not found in registry');
}

// Patch 6: Verify descriptive.custom2 exists with correct alias
const custom2 = registry.find(attr => attr.canonicalPath === 'descriptive.custom2');
if (custom2) {
  if (!custom2.importerColumns.includes('Custom 2')) {
    custom2.importerColumns.push('Custom 2');
    changes.push('descriptive.custom2: added "Custom 2" alias');
    console.log('✓ Added "Custom 2" to descriptive.custom2.importerColumns');
  } else {
    console.log('✓ descriptive.custom2 has "Custom 2" alias');
  }
} else {
  console.log('⚠ descriptive.custom2 not found in registry');
}

// Patch 7: Verify descriptive.custom3 exists with correct alias
const custom3 = registry.find(attr => attr.canonicalPath === 'descriptive.custom3');
if (custom3) {
  if (!custom3.importerColumns.includes('Custom 3')) {
    custom3.importerColumns.push('Custom 3');
    changes.push('descriptive.custom3: added "Custom 3" alias');
    console.log('✓ Added "Custom 3" to descriptive.custom3.importerColumns');
  } else {
    console.log('✓ descriptive.custom3 has "Custom 3" alias');
  }
} else {
  console.log('⚠ descriptive.custom3 not found in registry');
}

// Write the patched registry
try {
  fs.writeFileSync(REGISTRY_PATH, JSON.stringify(registry, null, 2) + '\n', 'utf8');
  console.log(`✓ Wrote patched registry to ${REGISTRY_PATH}`);
} catch (error) {
  console.error('✗ Failed to write registry:', error.message);
  process.exit(1);
}

// Summary
console.log('\n=== PATCH SUMMARY ===');
if (changes.length > 0) {
  console.log('Changes applied:');
  changes.forEach(change => console.log(`  - ${change}`));
} else {
  console.log('No changes were needed - registry already correct');
}

console.log('\nLisa v1.0 Registry Patcher - Complete');
process.exit(0);
