#!/usr/bin/env node
/**
 * Update importer aliases in attribute-registry-normalized.json
 * Metadata-only changes for CSV import header mapping
 */

import * as fs from 'fs';
import * as path from 'path';
import { fileURLToPath } from 'url';
import { dirname } from 'path';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

interface Attribute {
  key: string;
  canonicalPath: string;
  label: string;
  category: string;
  dataType: string;
  required: boolean;
  export: boolean;
  description: string;
  systemFlag: boolean;
  legacyPaths: string[];
  importerColumns: string[];
  rules: string[];
  usage: string[];
  examples: {
    sampleValues: any[];
  };
  bulkEditable?: boolean;
  normalizationNote?: string;
}

// Mapping of CSV headers to canonical paths and their importer columns
const importerMapping: Record<string, { canonicalPath: string; columns: string[] }> = {
  'descriptive.ageGroup': { canonicalPath: 'descriptive.ageGroup', columns: ['age_group'] },
  'descriptive.gender': { canonicalPath: 'descriptive.gender', columns: ['gender'] },
  'sku_core.department': { canonicalPath: 'sku_core.department', columns: ['department'] },
  'sku_core.class': { canonicalPath: 'sku_core.class', columns: ['class'] },
  'sku_core.category': { canonicalPath: 'sku_core.category', columns: ['category'] },
  'technical.website': { canonicalPath: 'technical.website', columns: ['website'] },
  'descriptive.sportsTeam': { canonicalPath: 'descriptive.sportsTeam', columns: ['sports_team'] },
  'descriptive.league': { canonicalPath: 'descriptive.league', columns: ['league'] },
  'descriptive.fit': { canonicalPath: 'descriptive.fit', columns: ['fit'] },
  'descriptive.material': { canonicalPath: 'descriptive.material', columns: ['material'] },
  'pricing.map': { canonicalPath: 'pricing.map', columns: ['map'] },
  'pricing.promo': { canonicalPath: 'pricing.promo', columns: ['promo'] },
  'launch.hype': { canonicalPath: 'launch.hype', columns: ['hype'] },
  'launch.fastFashion': { canonicalPath: 'launch.fastFashion', columns: ['fast_fashion', 'fastfashion'] },
  'descriptive.cutType': { canonicalPath: 'descriptive.cutType', columns: ['cut_type'] },
  'descriptive.closureType': { canonicalPath: 'descriptive.closureType', columns: ['closure_type'] },
  'descriptive.platformHeight': { canonicalPath: 'descriptive.platformHeight', columns: ['platform_height'] },
  'descriptive.heelType': { canonicalPath: 'descriptive.heelType', columns: ['heel_type'] },
  'technical.height': { canonicalPath: 'technical.height', columns: ['height'] },
  'technical.length': { canonicalPath: 'technical.length', columns: ['length'] },
  'technical.width': { canonicalPath: 'technical.width', columns: ['width'] },
  'technical.weight': { canonicalPath: 'technical.weight', columns: ['weight'] },
  'technical.standardShippingOverride': { canonicalPath: 'technical.standardShippingOverride', columns: ['standard_shipping_override'] },
  'technical.expeditedOverrideShipping': { canonicalPath: 'technical.expeditedOverrideShipping', columns: ['expedited_override_shipping'] },
  'technical.hideImageDate': { canonicalPath: 'technical.hideImageDate', columns: ['hide_image_date'] },
  'sku_core.styleId': { canonicalPath: 'sku_core.styleId', columns: ['style_id'] },
  'descriptive.shoeHeightMap': { canonicalPath: 'descriptive.shoeHeightMap', columns: ['shoe_height_map'] },
  'descriptive.heelHeight': { canonicalPath: 'descriptive.heelHeight', columns: ['heel_height'] },
  'descriptive.outsoleMaterial': { canonicalPath: 'descriptive.outsoleMaterial', columns: ['outsole_material'] },
  'pricing.scomRegularPrice': { canonicalPath: 'pricing.scomRegularPrice', columns: ['scom_regular'] },
  'pricing.scomSalePrice': { canonicalPath: 'pricing.scomSalePrice', columns: ['scom_sale'] },
  'sku_core.coreProduct': { canonicalPath: 'sku_core.coreProduct', columns: ['core_product'] },
  'descriptive.primaryColor': { canonicalPath: 'descriptive.primaryColor', columns: ['primary_color', 'primaryColor', 'primary_colour'] }, // rics_color removed
  'descriptive.descriptiveColor': { canonicalPath: 'descriptive.descriptiveColor', columns: ['descriptive_color'] },
  'descriptive.keywords': { canonicalPath: 'descriptive.keywords', columns: ['keywords'] },
  'descriptive.description': { canonicalPath: 'descriptive.description', columns: ['description'] },
  'technical.taxClass': { canonicalPath: 'technical.taxClass', columns: ['tax_class'] },
  'launch.newCollection': { canonicalPath: 'launch.newCollection', columns: ['collection'] },
  'launch.klPostDate': { canonicalPath: 'launch.klPostDate', columns: ['kl_post_date'] },
  'sku_core.productIsActive': { canonicalPath: 'sku_core.productIsActive', columns: ['product_is_active'] },
  'launch.launchDate': { canonicalPath: 'launch.launchDate', columns: ['launch_date'] },
  'technical.mediaStatus': { canonicalPath: 'technical.mediaStatus', columns: ['media_status', 'mediaStatus'] },
  'rics_source.shortDescription': { canonicalPath: 'rics_source.shortDescription', columns: ['rics_short_description'] },
  'rics_source.longDescription': { canonicalPath: 'rics_source.longDescription', columns: ['rics_long_description'] },
  'technical.lastReceived': { canonicalPath: 'technical.lastReceived', columns: ['last_received'] },
  'technical.firstReceived': { canonicalPath: 'technical.firstReceived', columns: ['first_received'] },
  'technical.store1': { canonicalPath: 'technical.store1', columns: ['store1'] },
  'technical.storeInv': { canonicalPath: 'technical.storeInv', columns: ['store_inv'] },
  'technical.warehouseInv': { canonicalPath: 'technical.warehouseInv', columns: ['warehouse_inv'] },
  'technical.whsInv': { canonicalPath: 'technical.whsInv', columns: ['whs_inv'] },
  'technical.store4': { canonicalPath: 'technical.store4', columns: ['store4'] },
  'technical.totalInv': { canonicalPath: 'technical.totalInv', columns: ['total_inv'] },
  'rics_source.brand': { canonicalPath: 'rics_source.brand', columns: ['rics_brand'] },
  'technical.status': { canonicalPath: 'technical.status', columns: ['status'] },
  'sku_core.mpn': { canonicalPath: 'sku_core.mpn', columns: ['mpn'] },
  'sku_core.sku': { canonicalPath: 'sku_core.sku', columns: ['sku'] },
  'sku_core.brand': { canonicalPath: 'sku_core.brand', columns: ['brand'] },
  'sku_core.name': { canonicalPath: 'sku_core.name', columns: ['name'] },
  'descriptive.slug': { canonicalPath: 'descriptive.slug', columns: ['slug'] },
  'rics_source.category': { canonicalPath: 'rics_source.category', columns: ['rics_category'] },
  'rics_source.color': { canonicalPath: 'rics_source.color', columns: ['rics_color'] },
  'descriptive.familySizing': { canonicalPath: 'descriptive.familySizing', columns: ['family_sizing'] },
  'descriptive.madeIn': { canonicalPath: 'descriptive.madeIn', columns: ['made_in'] },
  'descriptive.metaName': { canonicalPath: 'descriptive.metaName', columns: ['meta_name'] },
  'descriptive.metaDescription': { canonicalPath: 'descriptive.metaDescription', columns: ['meta_description'] },
};

// New attributes to add
const newAttributes: Partial<Attribute>[] = [
  {
    key: 'custom2',
    canonicalPath: 'descriptive.custom2',
    label: 'Custom2',
    category: 'Descriptive',
    dataType: 'string',
    required: false,
    export: true,
    description: 'Custom field 2',
    systemFlag: false,
    legacyPaths: [],
    importerColumns: ['custom2'],
    rules: [],
    usage: [],
    examples: { sampleValues: [] },
    bulkEditable: true,
  },
  {
    key: 'custom3',
    canonicalPath: 'descriptive.custom3',
    label: 'Custom3',
    category: 'Descriptive',
    dataType: 'string',
    required: false,
    export: true,
    description: 'Custom field 3',
    systemFlag: false,
    legacyPaths: [],
    importerColumns: ['custom3'],
    rules: [],
    usage: [],
    examples: { sampleValues: [] },
    bulkEditable: true,
  },
  {
    key: 'productIsDropship',
    canonicalPath: 'sku_core.productIsDropship',
    label: 'Product Is Dropship',
    category: 'Core',
    dataType: 'boolean',
    required: false,
    export: true,
    description: 'Indicates if product is dropshipped',
    systemFlag: false,
    legacyPaths: [],
    importerColumns: ['product_is_dropship', 'is_dropship'],
    rules: [],
    usage: [],
    examples: { sampleValues: [] },
    bulkEditable: true,
  },
  {
    key: 'dropshipName',
    canonicalPath: 'sku_core.dropshipName',
    label: 'Dropship Name',
    category: 'Core',
    dataType: 'string',
    required: false,
    export: true,
    description: 'Dropship vendor name',
    systemFlag: false,
    legacyPaths: [],
    importerColumns: ['dropship_name', 'product_is_dropship_name'],
    rules: [],
    usage: [],
    examples: { sampleValues: [] },
    bulkEditable: true,
  },
];

function main() {
  const registryPath = path.join(__dirname, 'attribute-registry-normalized.json');
  
  // Read the existing registry
  const registryContent = fs.readFileSync(registryPath, 'utf-8');
  const attributes: Attribute[] = JSON.parse(registryContent);
  
  console.log(`Loaded ${attributes.length} attributes from registry`);
  
  // Track changes
  let updated = 0;
  let added = 0;
  
  // Build a map for quick lookup
  const attributeMap = new Map<string, Attribute>();
  attributes.forEach(attr => attributeMap.set(attr.canonicalPath, attr));
  
  // Update existing attributes with new importer columns
  for (const [canonicalPath, mapping] of Object.entries(importerMapping)) {
    const attr = attributeMap.get(canonicalPath);
    if (attr) {
      // Merge columns, preserving existing ones and adding new ones
      const existingColumns = new Set(attr.importerColumns);
      let changed = false;
      
      for (const col of mapping.columns) {
        if (!existingColumns.has(col)) {
          attr.importerColumns.push(col);
          changed = true;
        }
      }
      
      // Special case: remove rics_color from descriptive.primaryColor
      if (canonicalPath === 'descriptive.primaryColor') {
        const ricsColorIndex = attr.importerColumns.indexOf('rics_color');
        if (ricsColorIndex !== -1) {
          attr.importerColumns.splice(ricsColorIndex, 1);
          changed = true;
          console.log(`Removed 'rics_color' from descriptive.primaryColor`);
        }
      }

      // Lisa v1.0 guard: never add importer columns to technical.variantCount
      if (canonicalPath === 'technical.variantCount') {
        attr.importerColumns = [];
        attr.export = false;
        console.log(`Lisa v1.0 guard: kept technical.variantCount non-importable`);
      }
      
      if (changed) {
        updated++;
        console.log(`Updated ${canonicalPath}: ${attr.importerColumns.join(', ')}`);
      }
    } else {
      console.warn(`Warning: ${canonicalPath} not found in registry`);
    }
  }
  
  // Check if custom2 and custom3 already exist in technical namespace
  const technicalCustom2 = attributeMap.get('technical.custom2');
  const technicalCustom3 = attributeMap.get('technical.custom3');
  
  if (technicalCustom2) {
    console.log('technical.custom2 already exists, skipping descriptive.custom2');
    newAttributes.splice(newAttributes.findIndex(a => a.canonicalPath === 'descriptive.custom2'), 1);
  }
  
  if (technicalCustom3) {
    console.log('technical.custom3 already exists, skipping descriptive.custom3');
    newAttributes.splice(newAttributes.findIndex(a => a.canonicalPath === 'descriptive.custom3'), 1);
  }
  
  // Add new attributes if they don't exist
  for (const newAttr of newAttributes) {
    if (!attributeMap.has(newAttr.canonicalPath!)) {
      attributes.push(newAttr as Attribute);
      attributeMap.set(newAttr.canonicalPath!, newAttr as Attribute);
      added++;
      console.log(`Added new attribute: ${newAttr.canonicalPath}`);
    } else {
      console.log(`Attribute ${newAttr.canonicalPath} already exists, skipping`);
    }
  }
  
  // Sort attributes by canonicalPath for consistency
  // Guard against undefined to avoid localeCompare errors
  attributes.sort((a, b) => {
    const aPath = String(a.canonicalPath || '');
    const bPath = String(b.canonicalPath || '');
    return aPath.localeCompare(bPath);
  });
  
  // Write back to file
  fs.writeFileSync(registryPath, JSON.stringify(attributes, null, 2) + '\n', 'utf-8');
  
  console.log(`\nSummary:`);
  console.log(`- Updated: ${updated} attributes`);
  console.log(`- Added: ${added} new attributes`);
  console.log(`- Total: ${attributes.length} attributes`);
  console.log(`\nWrote updated registry to ${registryPath}`);
}

main();
