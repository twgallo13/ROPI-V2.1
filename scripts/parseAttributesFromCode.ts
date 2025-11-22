/**
 * Parse Attributes From Codebase
 * 
 * Extracts canonical attribute keys, legacy paths, importer columns,
 * SmartDetect rules, and usage references from source code.
 * 
 * Usage: npx tsx scripts/parseAttributesFromCode.ts
 */

import * as fs from 'fs';
import * as path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

interface AttributeMetadata {
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
  exportPath?: string;
  rules: string[];
  usage: { file: string; line: number }[];
  examples: {
    sampleValues: string[];
  };
  normalizedValues?: string[];
  normalizationNote?: string;
}

/**
 * Parse Product schema to extract canonical field paths
 */
function parseProductSchema(filePath: string): Map<string, AttributeMetadata> {
  const content = fs.readFileSync(filePath, 'utf-8');
  const attributes = new Map<string, AttributeMetadata>();

  // Extract interface definitions
  const interfaceRegex = /export interface (\w+) \{([\s\S]*?)\n\}/g;
  let match;

  const categoryMap: Record<string, string> = {
    SkuCore: 'Core',
    Descriptive: 'Descriptive',
    Pricing: 'Pricing',
    Technical: 'Technical',
    Launch: 'Launch',
    Source: 'Source',
    AIGenerated: 'AI',
    RicsSource: 'Source',
  };

  while ((match = interfaceRegex.exec(content)) !== null) {
    const interfaceName = match[1];
    const interfaceBody = match[2];
    const category = categoryMap[interfaceName] || 'Other';

    // Skip non-attribute interfaces
    if (!categoryMap[interfaceName]) continue;

    // Extract fields from interface
    const fieldRegex = /(\w+)\??: ([\w[\]<>]+);?\s*\/\/ (.+)/g;
    let fieldMatch;

    while ((fieldMatch = fieldRegex.exec(interfaceBody)) !== null) {
      const fieldName = fieldMatch[1];
      const fieldType = fieldMatch[2];
      const comment = fieldMatch[3];

      const canonicalPath = interfaceName === 'Product' 
        ? fieldName 
        : `${interfaceName.replace(/([A-Z])/g, '_$1').toLowerCase().replace(/^_/, '')}.${fieldName}`;

      const dataType = mapTypeScriptType(fieldType);
      const required = !fieldMatch[0].includes('?:');

      attributes.set(canonicalPath, {
        key: fieldName,
        canonicalPath,
        label: toTitleCase(fieldName),
        category,
        dataType,
        required,
        export: true,
        description: comment.trim(),
        systemFlag: false,
        legacyPaths: [],
        importerColumns: [],
        rules: [],
        usage: [],
        examples: { sampleValues: [] },
      });
    }
  }

  return attributes;
}

/**
 * Parse schema adapter to extract legacy path mappings
 */
function parseSchemaAdapter(_filePath: string, attributes: Map<string, AttributeMetadata>): void {
  // Look for mappings in newToLegacy function - currently using hardcoded mappings
  // TODO: Could parse schemaAdapter.ts to dynamically extract these
  const specialMappings = [
    { canonical: 'source.rics.shortDescription', legacy: 'ricsShortDesc' },
    { canonical: 'source.rics.longDescription', legacy: 'ricsLongDesc' },
    { canonical: 'source.rics.category', legacy: 'ricsCategory' },
    { canonical: 'source.rics.color', legacy: 'ricsColor' },
    { canonical: 'technical.lastReceived', legacy: 'lastReceived' },
    { canonical: 'technical.firstReceived', legacy: 'firstReceived' },
    { canonical: 'technical.storeInv', legacy: 'storeInv' },
    { canonical: 'technical.store1', legacy: 'store1' },
    { canonical: 'technical.store4', legacy: 'store4' },
    { canonical: 'technical.warehouseInv', legacy: 'warehouseInv' },
    { canonical: 'technical.whsInv', legacy: 'whsInv' },
    { canonical: 'technical.totalInv', legacy: 'totalInv' },
    { canonical: 'technical.variantCount', legacy: 'variantCount' },
    { canonical: 'technical.custom2', legacy: 'custom2' },
    { canonical: 'technical.custom3', legacy: 'custom3' },
    { canonical: 'descriptive.material', legacy: 'materials' },
    { canonical: 'descriptive.primaryColor', legacy: 'primaryColor' },
  ];

  for (const mapping of specialMappings) {
    const attr = attributes.get(mapping.canonical);
    if (attr && !attr.legacyPaths.includes(mapping.legacy)) {
      attr.legacyPaths.push(mapping.legacy);
    }
  }
}

/**
 * Parse importer to extract CSV column mappings
 */
function parseImporter(_filePath: string, attributes: Map<string, AttributeMetadata>): void {
  // Extract column mappings from transformToProduct - currently using hardcoded mappings
  // TODO: Could parse firestoreImport.ts to dynamically extract these

  // Extract column mappings from transformToProduct
  const columnMappings = [
    { canonical: 'sku_core.mpn', columns: ['mpn'] },
    { canonical: 'sku_core.brand', columns: ['brand'] },
    { canonical: 'sku_core.name', columns: ['rics_short_desc', 'name'] },
    { canonical: 'sku_core.department', columns: ['department'] },
    { canonical: 'sku_core.class', columns: ['class'] },
    { canonical: 'sku_core.category', columns: ['category'] },
    { canonical: 'descriptive.ageGroup', columns: ['age_group'] },
    { canonical: 'descriptive.gender', columns: ['gender'] },
    { canonical: 'descriptive.sportsTeam', columns: ['sports_team'] },
    { canonical: 'descriptive.league', columns: ['league'] },
    { canonical: 'descriptive.fit', columns: ['fit'] },
    { canonical: 'descriptive.material', columns: ['material', 'materials'] },
    { canonical: 'descriptive.cutType', columns: ['cut_type'] },
    { canonical: 'descriptive.closureType', columns: ['closure_type'] },
    { canonical: 'descriptive.primaryColor', columns: ['rics_color', 'primary_color'] },
    { canonical: 'descriptive.descriptiveColor', columns: ['descriptive_color'] },
    { canonical: 'descriptive.keywords', columns: ['keywords'] },
    { canonical: 'pricing.map', columns: ['map'] },
    { canonical: 'pricing.promo', columns: ['promo'] },
    { canonical: 'pricing.scomRegularPrice', columns: ['scom_regular'] },
    { canonical: 'pricing.scomSalePrice', columns: ['scom_sale'] },
    { canonical: 'technical.website', columns: ['website'] },
    { canonical: 'technical.height', columns: ['height'] },
    { canonical: 'technical.length', columns: ['length'] },
    { canonical: 'technical.width', columns: ['width'] },
    { canonical: 'technical.weight', columns: ['weight'] },
    { canonical: 'technical.lastReceived', columns: ['last_received'] },
    { canonical: 'technical.firstReceived', columns: ['first_received'] },
    { canonical: 'technical.storeInv', columns: ['store_inv'] },
    { canonical: 'technical.store1', columns: ['store1'] },
    { canonical: 'technical.store4', columns: ['store4'] },
    { canonical: 'technical.warehouseInv', columns: ['warehouse_inv'] },
    { canonical: 'technical.whsInv', columns: ['whs_inv'] },
    { canonical: 'technical.totalInv', columns: ['total_inv'] },
    { canonical: 'technical.variantCount', columns: ['variant_count'] },
    { canonical: 'technical.custom2', columns: ['custom2'] },
    { canonical: 'technical.custom3', columns: ['custom3'] },
    { canonical: 'launch.hype', columns: ['hype'] },
    { canonical: 'launch.fastFashion', columns: ['fastfashion', 'fast_fashion'] },
    { canonical: 'launch.newCollection', columns: ['collection', 'new_collection'] },
    { canonical: 'launch.klPostDate', columns: ['kl_post_date'] },
    { canonical: 'launch.launchDate', columns: ['launch_date'] },
    { canonical: 'source.rics.shortDescription', columns: ['rics_short_desc'] },
    { canonical: 'source.rics.longDescription', columns: ['rics_long_desc'] },
    { canonical: 'source.rics.brand', columns: ['rics_brand'] },
    { canonical: 'source.rics.category', columns: ['rics_category'] },
    { canonical: 'source.rics.color', columns: ['rics_color'] },
  ];

  for (const mapping of columnMappings) {
    const attr = attributes.get(mapping.canonical);
    if (attr) {
      attr.importerColumns.push(...mapping.columns);
    }
  }

  // Lisa v1.0 guard: ensure technical.variantCount remains non-importable
  const variantCount = attributes.get('technical.variantCount');
  if (variantCount) {
    variantCount.importerColumns = [];
    variantCount.export = false;
  }
}

/**
 * Parse SmartDetect to extract rule references
 */
function parseSmartDetect(_filePath: string, attributes: Map<string, AttributeMetadata>): void {
  // Extract rule definitions and field references - currently using hardcoded mappings
  // TODO: Could parse smartDetect.ts to dynamically extract these
  const ruleReferences = [
    { rule: 'SD-001', fields: ['sku_core.department', 'source.rics.category'] },
    { rule: 'SD-002', fields: ['sku_core.class', 'source.rics.category'] },
    { rule: 'SD-003', fields: ['sku_core.category', 'source.rics.category'] },
    { rule: 'SD-004', fields: ['descriptive.ageGroup', 'sku_core.category'] },
    { rule: 'SD-005', fields: ['descriptive.gender', 'sku_core.name'] },
    { rule: 'SD-006', fields: ['descriptive.primaryColor', 'source.rics.color'] },
    { rule: 'SD-007', fields: ['descriptive.material', 'source.rics.longDescription'] },
    { rule: 'SD-008', fields: ['descriptive.cutType', 'sku_core.name'] },
    { rule: 'SD-009', fields: ['descriptive.closureType', 'sku_core.name'] },
    { rule: 'SD-010', fields: ['descriptive.heelType', 'sku_core.name'] },
  ];

  for (const ref of ruleReferences) {
    for (const field of ref.fields) {
      const attr = attributes.get(field);
      if (attr && !attr.rules.includes(ref.rule)) {
        attr.rules.push(ref.rule);
      }
    }
  }
}

/**
 * Map TypeScript type to Firestore data type
 */
function mapTypeScriptType(tsType: string): string {
  if (tsType.includes('[]')) return 'array';
  if (tsType === 'string') return 'string';
  if (tsType === 'number') return 'number';
  if (tsType === 'boolean') return 'boolean';
  if (tsType === 'Date') return 'timestamp';
  if (tsType.includes('any')) return 'object';
  return 'string';
}

/**
 * Convert camelCase to Title Case
 */
function toTitleCase(str: string): string {
  return str
    .replace(/([A-Z])/g, ' $1')
    .replace(/^./, (s) => s.toUpperCase())
    .trim();
}

/**
 * Main execution
 */
async function main() {
  const rootDir = path.join(__dirname, '..');
  
  console.log('Parsing codebase to extract attributes...\n');

  // Parse Product schema
  const schemaPath = path.join(rootDir, 'src/types/product-schema.ts');
  const attributes = parseProductSchema(schemaPath);
  console.log(`✓ Parsed ${attributes.size} attributes from Product schema`);

  // Parse schema adapter for legacy paths
  const adapterPath = path.join(rootDir, 'src/utils/schemaAdapter.ts');
  parseSchemaAdapter(adapterPath, attributes);
  console.log(`✓ Extracted legacy path mappings from schema adapter`);

  // Parse importer for column mappings
  const importerPath = path.join(rootDir, 'src/utils/firestoreImport.ts');
  parseImporter(importerPath, attributes);
  console.log(`✓ Extracted CSV column mappings from importer`);

  // Parse SmartDetect for rule references
  const smartDetectPath = path.join(rootDir, 'functions/src/smartDetect.ts');
  parseSmartDetect(smartDetectPath, attributes);
  console.log(`✓ Extracted SmartDetect rule references`);

  // Output attribute registry
  const outputPath = path.join(rootDir, 'scripts/attribute-registry.json');
  const registry = Array.from(attributes.values()).sort((a, b) => 
    a.canonicalPath.localeCompare(b.canonicalPath)
  );

  fs.writeFileSync(outputPath, JSON.stringify(registry, null, 2));
  console.log(`\n✓ Wrote attribute registry to ${outputPath}`);
  console.log(`\nTotal attributes: ${registry.length}`);

  // Summary by category
  const byCategory = registry.reduce((acc, attr) => {
    acc[attr.category] = (acc[attr.category] || 0) + 1;
    return acc;
  }, {} as Record<string, number>);

  console.log('\nAttributes by category:');
  Object.entries(byCategory)
    .sort(([, a], [, b]) => b - a)
    .forEach(([cat, count]) => console.log(`  ${cat}: ${count}`));
}

main().catch(console.error);
