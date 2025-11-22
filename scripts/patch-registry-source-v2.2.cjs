/* eslint-env node */
/* eslint-disable @typescript-eslint/no-require-imports */
/**
 * Patch attribute-registry.json (SOURCE) with v2.2 importer aliases
 * This adds dropshipName attribute and updates aliases for RICS/inventory fields
 */

const fs = require('fs');
const path = require('path');

const registryPath = path.join(__dirname, 'attribute-registry.json');

console.log('Patching SOURCE registry (attribute-registry.json) with v2.2 aliases...\n');

// Read the source registry
const registry = JSON.parse(fs.readFileSync(registryPath, 'utf-8'));

let updateCount = 0;

// Add sku_core.dropshipName (NEW ATTRIBUTE)
const existingDropship = registry.find(attr => attr.canonicalPath === 'sku_core.dropshipName');
if (!existingDropship) {
  // Find position after sku_core.name to insert
  const nameIdx = registry.findIndex(attr => attr.canonicalPath === 'sku_core.name');
  if (nameIdx !== -1) {
    const newAttr = {
      "key": "dropshipName",
      "canonicalPath": "sku_core.dropshipName",
      "label": "Dropship Name",
      "category": "Core",
      "dataType": "string",
      "required": false,
      "export": true,
      "description": "Dropship supplier name",
      "systemFlag": false,
      "legacyPaths": [],
      "importerColumns": [
        "product_is_dropship_name",
        "Product Is Dropship.Name",
        "Product Is Dropship Name",
        "dropship_name",
        "dropship name"
      ],
      "rules": [],
      "usage": [],
      "examples": {
        "sampleValues": []
      }
    };
    registry.splice(nameIdx + 1, 0, newAttr);
    console.log('✓ Added sku_core.dropshipName with importerColumns:', newAttr.importerColumns);
    updateCount++;
  }
} else {
  console.log('⚠ sku_core.dropshipName already exists, skipping add');
}

// Update rics_source.shortDescription
const ricsShortDesc = registry.find(attr => attr.canonicalPath === 'rics_source.shortDescription');
if (ricsShortDesc) {
  ricsShortDesc.importerColumns = [
    "rics_short_description",
    "RICS Short Description",
    "rics_short_desc"
  ];
  console.log('✓ Updated rics_source.shortDescription importerColumns:', ricsShortDesc.importerColumns);
  updateCount++;
}

// Update rics_source.longDescription
const ricsLongDesc = registry.find(attr => attr.canonicalPath === 'rics_source.longDescription');
if (ricsLongDesc) {
  ricsLongDesc.importerColumns = [
    "rics_long_description",
    "RICS Long Desc",
    "RICS Long Description"
  ];
  console.log('✓ Updated rics_source.longDescription importerColumns:', ricsLongDesc.importerColumns);
  updateCount++;
}

// Verify rics_source.color has all aliases (should already be set from v2.1)
const ricsColor = registry.find(attr => attr.canonicalPath === 'rics_source.color');
if (ricsColor) {
  const requiredAliases = ["rics_color", "RICS Color", "color"];
  const hasAll = requiredAliases.every(alias => 
    ricsColor.importerColumns.some(col => col.toLowerCase() === alias.toLowerCase())
  );
  if (!hasAll) {
    console.log('⚠ rics_source.color missing some aliases, current:', ricsColor.importerColumns);
  } else {
    console.log('✓ Verified rics_source.color has required aliases');
  }
}

// Update rics_source.category
const ricsCategory = registry.find(attr => attr.canonicalPath === 'rics_source.category');
if (ricsCategory) {
  ricsCategory.importerColumns = [
    "rics_category",
    "RICS Category",
    "category"
  ];
  console.log('✓ Updated rics_source.category importerColumns:', ricsCategory.importerColumns);
  updateCount++;
}

// Update sku_core.productIsActive
const productIsActive = registry.find(attr => attr.canonicalPath === 'sku_core.productIsActive');
if (productIsActive) {
  productIsActive.importerColumns = [
    "product_is_active",
    "Product Is Active",
    "is_active"
  ];
  console.log('✓ Updated sku_core.productIsActive importerColumns:', productIsActive.importerColumns);
  updateCount++;
}

// Update technical.lastReceived
const lastReceived = registry.find(attr => attr.canonicalPath === 'technical.lastReceived');
if (lastReceived) {
  lastReceived.importerColumns = [
    "last_received",
    "Last Received",
    "lastReceived"
  ];
  console.log('✓ Updated technical.lastReceived importerColumns:', lastReceived.importerColumns);
  updateCount++;
}

// Update technical.warehouseInv
const warehouseInv = registry.find(attr => attr.canonicalPath === 'technical.warehouseInv');
if (warehouseInv) {
  warehouseInv.importerColumns = [
    "warehouse_inv",
    "Warehouse Inv",
    "warehouseInv",
    "WHS inv",
    "whs_inv"
  ];
  console.log('✓ Updated technical.warehouseInv importerColumns:', warehouseInv.importerColumns);
  updateCount++;
}

// Update technical.storeInv
const storeInv = registry.find(attr => attr.canonicalPath === 'technical.storeInv');
if (storeInv) {
  storeInv.importerColumns = [
    "store_inv",
    "Store Inv",
    "storeInv"
  ];
  console.log('✓ Updated technical.storeInv importerColumns:', storeInv.importerColumns);
  updateCount++;
}

// Verify technical.variantCount remains non-importable
const variantCount = registry.find(attr => attr.canonicalPath === 'technical.variantCount');
if (variantCount) {
  variantCount.importerColumns = [];
  variantCount.export = false;
  console.log('✓ Verified technical.variantCount non-importable (importerColumns=[], export=false)');
  updateCount++;
}

// Verify launch.klPostDate has aliases (from v2.1)
const klPostDate = registry.find(attr => attr.canonicalPath === 'launch.klPostDate');
if (klPostDate && klPostDate.importerColumns.length > 0) {
  console.log('✓ Verified launch.klPostDate has aliases:', klPostDate.importerColumns);
}

// Write back to file
fs.writeFileSync(registryPath, JSON.stringify(registry, null, 2));
console.log(`\n✅ Patched source registry with ${updateCount} updates`);
console.log('   Written to:', registryPath);
console.log('\nNext step: Run normalizeAndSeedAttributes.ts --seed to apply changes to Firestore');
