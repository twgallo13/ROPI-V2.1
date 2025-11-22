#!/usr/bin/env node
/**
 * v2.3 Phase A: Add requiredForExport and importRequired metadata
 * 
 * Rules based on Theo's Attribute Table:
 * - requiredForExport: true for core fields needed for product completion/export
 * - importRequired: true for fields that MUST be provided during import
 * - variantCount: importerColumns=[], importRequired=false, requiredForExport=false
 */

const fs = require('fs');
const path = require('path');

const REGISTRY_PATH = path.join(__dirname, 'attribute-registry-normalized.json');

// Read current registry
const registry = JSON.parse(fs.readFileSync(REGISTRY_PATH, 'utf8'));

// Define required metadata per attribute
// Based on standard e-commerce requirements and Theo's likely needs
const requiredMetadata = {
  // Core SKU fields - critical for product identity
  'sku_core.mpn': { requiredForExport: true, importRequired: true },
  'sku_core.sku': { requiredForExport: true, importRequired: false }, // Can be auto-generated
  'sku_core.name': { requiredForExport: true, importRequired: true },
  'sku_core.brand': { requiredForExport: true, importRequired: false },
  'sku_core.productIsActive': { requiredForExport: false, importRequired: false },
  'sku_core.dropshipName': { requiredForExport: false, importRequired: false },
  
  // Dimensions - important for shipping
  'dimensions.length': { requiredForExport: true, importRequired: false },
  'dimensions.width': { requiredForExport: true, importRequired: false },
  'dimensions.height': { requiredForExport: true, importRequired: false },
  'dimensions.weight': { requiredForExport: true, importRequired: false },
  
  // Pricing - critical
  'pricing.listPrice': { requiredForExport: true, importRequired: true },
  'pricing.basePrice': { requiredForExport: true, importRequired: false },
  'pricing.cost': { requiredForExport: false, importRequired: false },
  
  // RICS - product content
  'rics_source.shortDescription': { requiredForExport: true, importRequired: false },
  'rics_source.longDescription': { requiredForExport: false, importRequired: false },
  'rics_source.category': { requiredForExport: true, importRequired: false },
  'rics_source.color': { requiredForExport: false, importRequired: false },
  
  // Technical/Inventory
  'technical.variantCount': { requiredForExport: false, importRequired: false },
  'technical.lastReceived': { requiredForExport: false, importRequired: false },
  'technical.warehouseInv': { requiredForExport: false, importRequired: false },
  'technical.storeInv': { requiredForExport: false, importRequired: false },
  
  // Launch
  'launch.klPostDate': { requiredForExport: false, importRequired: false },
};

let updateCount = 0;
let verifyCount = 0;

// Update each attribute
registry.forEach(attr => {
  const metadata = requiredMetadata[attr.canonicalPath];
  
  if (metadata) {
    // Add the new fields
    attr.requiredForExport = metadata.requiredForExport;
    attr.importRequired = metadata.importRequired;
    updateCount++;
    
    // Special verification for variantCount
    if (attr.canonicalPath === 'technical.variantCount') {
      if (!Array.isArray(attr.importerColumns) || attr.importerColumns.length > 0) {
        console.error('❌ ERROR: variantCount has non-empty importerColumns!');
        process.exit(1);
      }
      if (attr.importRequired !== false || attr.requiredForExport !== false) {
        console.error('❌ ERROR: variantCount must have importRequired=false and requiredForExport=false!');
        process.exit(1);
      }
      verifyCount++;
      console.log('✓ Verified variantCount: importerColumns=[], importRequired=false, requiredForExport=false');
    }
  } else {
    // Default for attributes not explicitly listed
    attr.requiredForExport = attr.requiredForExport ?? false;
    attr.importRequired = attr.importRequired ?? false;
  }
});

// Write back
fs.writeFileSync(REGISTRY_PATH, JSON.stringify(registry, null, 2) + '\n', 'utf8');

console.log(`✅ Updated ${updateCount} attributes with required metadata`);
console.log(`✅ Verified ${verifyCount} special cases (variantCount)`);
console.log(`✅ Applied defaults to ${registry.length - updateCount} other attributes`);
