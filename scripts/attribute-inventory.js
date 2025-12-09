#!/usr/bin/env node

/**
 * Attribute Inventory & Duplication Scanner
 * 
 * Comprehensive audit script that inventories all attribute definitions, lists,
 * and product attribute usage to identify duplicates and drive canonical mapping.
 * 
 * Usage:
 *   node scripts/attribute-inventory.js [--sample-size=500] [--env=staging]
 * 
 * Output CSV files:
 *   - reports/attribute_registry_export.csv
 *   - reports/lists_export.csv
 *   - reports/product_attribute_usage.csv
 *   - reports/duplicate_candidates.csv
 *   - reports/inventory_summary.md
 * 
 * Lisa v1.0.0
 */

const admin = require('firebase-admin');
const fs = require('fs');
const path = require('path');
const { createObjectCsvStringifier } = require('csv-writer');

// Parse CLI arguments
const sampleSize = parseInt(process.argv.find(arg => arg.startsWith('--sample-size='))?.split('=')[1] || '500', 10);
const environment = process.argv.find(arg => arg.startsWith('--env='))?.split('=')[1] || 'staging';

console.log(`\n📊 Attribute Inventory & Deduplication Scanner`);
console.log(`   Sample Size: ${sampleSize}`);
console.log(`   Environment: ${environment}`);
console.log(`   Started: ${new Date().toISOString()}\n`);

// Initialize Firebase Admin
if (!admin.apps.length) {
  admin.initializeApp({
    credential: admin.credential.applicationDefault(),
  });
}
const db = admin.firestore();

// Ensure reports directory exists
const reportsDir = path.resolve(__dirname, '../reports');
if (!fs.existsSync(reportsDir)) {
  fs.mkdirSync(reportsDir, { recursive: true });
}

/**
 * Attribute Registry - read all attribute definitions
 */
async function scanAttributes() {
  console.log('🔍 Scanning attributes...');
  
  const attributes = [];
  const snap = await db.collection('settings').doc('attributes').collection('keys').get();
  
  snap.forEach(doc => {
    const data = doc.data();
    attributes.push({
      attribute_id: doc.id,
      label: data.label || '',
      data_type: data.data_type || 'string',
      allowed_values: JSON.stringify(data.allowed_values || []),
      allowed_values_ref: data.allowed_values_ref || data.allowedValuesRef || '',
      validation_allowed_values_ref: data.validation?.allowedValuesRef ? data.validation.allowedValuesRef : '',
      source: data.source || 'unknown',
      created_by: data.createdBy || '',
      created_at: data.createdAt || '',
      updated_at: data.updatedAt || '',
      updated_by: data.updatedBy || '',
      status: data.status || 'active',
      doc_path: `settings/attributes/keys/${doc.id}`,
      is_deprecated: data.deprecated === true ? 'yes' : 'no',
    });
  });
  
  console.log(`   ✓ Found ${attributes.length} attributes`);
  return attributes;
}

/**
 * Lists - read all list definitions
 */
async function scanLists() {
  console.log('🔍 Scanning lists...');
  
  const lists = [];
  const listsRef = db.collection('settings').doc('lists');
  
  try {
    // Check if /settings/lists exists
    const listsDoc = await listsRef.get();
    if (listsDoc.exists) {
      // Lists stored as collection
      const listsSnap = await listsRef.listCollections();
      for (const coll of listsSnap) {
        const docsSnap = await listsRef.collection(coll.id).get();
        docsSnap.forEach(doc => {
          const data = doc.data();
          lists.push({
            list_id: doc.id,
            list_parent: coll.id,
            label: data.label || '',
            values: JSON.stringify(data.values || []),
            value_count: Array.isArray(data.values) ? data.values.length : 0,
            source: data.source || 'unknown',
            created_by: data.createdBy || '',
            created_at: data.createdAt || '',
            updated_at: data.updatedAt || '',
            doc_path: `settings/lists/${coll.id}/${doc.id}`,
          });
        });
      }
    }
  } catch (err) {
    console.warn('   ⚠️  Lists collection not yet created:', err.message);
  }
  
  console.log(`   ✓ Found ${lists.length} lists`);
  return lists;
}

/**
 * Products - scan sample products and track attribute usage
 */
async function scanProductUsage() {
  console.log(`🔍 Scanning products (sample: ${sampleSize})...`);
  
  const attributeUsage = {};
  const topLevelKeys = {};
  const productSamples = {};
  
  const snap = await db.collection('products')
    .limit(sampleSize)
    .get();
  
  let scannedCount = 0;
  snap.forEach(doc => {
    scannedCount++;
    const data = doc.data();
    
    // Track product.attributes usage
    if (data.attributes && typeof data.attributes === 'object') {
      Object.keys(data.attributes).forEach(attrKey => {
        if (!attributeUsage[attrKey]) {
          attributeUsage[attrKey] = { count: 0, samples: [] };
        }
        attributeUsage[attrKey].count++;
        if (attributeUsage[attrKey].samples.length < 10) {
          attributeUsage[attrKey].samples.push(doc.id);
        }
      });
    }
    
    // Track top-level keys (for compatibility detection)
    Object.keys(data).forEach(key => {
      // Skip known system/structural keys
      if (!['id', 'sku', 'name', 'description', 'attributes', 'status', 
           'createdAt', 'updatedAt', 'createdBy', 'updatedBy', 'observations',
           'images', 'metadata', 'importSource', 'importBatch'].includes(key)) {
        if (!topLevelKeys[key]) {
          topLevelKeys[key] = { count: 0, samples: [] };
        }
        topLevelKeys[key].count++;
        if (topLevelKeys[key].samples.length < 5) {
          topLevelKeys[key].samples.push(doc.id);
        }
      }
    });
  });
  
  console.log(`   ✓ Scanned ${scannedCount} products`);
  console.log(`   ✓ Found ${Object.keys(attributeUsage).length} unique attribute keys in use`);
  console.log(`   ✓ Found ${Object.keys(topLevelKeys).length} top-level keys (compatibility check)`);
  
  return { attributeUsage, topLevelKeys };
}

/**
 * Find duplicate candidates - attributes with same label but different IDs
 */
function findDuplicateCandidates(attributes) {
  console.log('🔍 Finding duplicate candidates...');
  
  const byLabel = {};
  const duplicates = [];
  
  attributes.forEach(attr => {
    const label = (attr.label || '').toLowerCase().trim();
    if (!byLabel[label]) {
      byLabel[label] = [];
    }
    byLabel[label].push(attr);
  });
  
  Object.entries(byLabel).forEach(([label, attrs]) => {
    if (attrs.length > 1) {
      // This is a potential duplicate
      const sorted = attrs.sort((a, b) => a.attribute_id.localeCompare(b.attribute_id));
      duplicates.push({
        label,
        count: attrs.length,
        attribute_ids: sorted.map(a => a.attribute_id).join(' | '),
        suggested_canonical: sorted[0].attribute_id,
        from_ids: sorted.slice(1).map(a => a.attribute_id).join(' | '),
        data_types: [...new Set(sorted.map(a => a.data_type))].join(', '),
        allowed_values_diff: sorted.some(a => a.allowed_values !== sorted[0].allowed_values) ? 'yes' : 'no',
      });
    }
  });
  
  console.log(`   ✓ Found ${duplicates.length} duplicate label groups`);
  return duplicates;
}

/**
 * Write CSV file
 */
async function writeCSV(filename, records, headers) {
  const filepath = path.join(reportsDir, filename);
  const csvContent = createObjectCsvStringifier({
    header: headers,
    alwaysQuote: true,
  }).stringifyRecords(records);
  
  fs.writeFileSync(filepath, csvContent);
  console.log(`   ✓ Wrote ${records.length} rows to ${filename}`);
  return filepath;
}

/**
 * Generate summary markdown
 */
function generateSummary(attributes, lists, attributeUsage, topLevelKeys, duplicates) {
  const timestamp = new Date().toISOString();
  
  // Top 10 used attributes
  const topUsedAttrs = Object.entries(attributeUsage)
    .sort((a, b) => b[1].count - a[1].count)
    .slice(0, 10)
    .map(([k, v]) => `  - **${k}**: ${v.count} products`)
    .join('\n');
  
  // Top 10 top-level keys
  const topLevelKeysStr = Object.entries(topLevelKeys)
    .sort((a, b) => b[1].count - a[1].count)
    .slice(0, 10)
    .map(([k, v]) => `  - **${k}**: ${v.count} products`)
    .join('\n');
  
  return `# Attribute Inventory Report

Generated: ${timestamp}
Environment: ${environment}

## Summary

| Metric | Count |
|--------|-------|
| Total Attributes | ${attributes.length} |
| Total Lists | ${lists.length} |
| Unique Attribute Keys in Use | ${Object.keys(attributeUsage).length} |
| Duplicate Label Groups | ${duplicates.length} |
| Top-Level Keys (Compatibility) | ${Object.keys(topLevelKeys).length} |
| Sample Size | ${sampleSize} |

## Top 10 Used Attributes

${topUsedAttrs || '  (no attribute usage found)'}

## Top 10 Top-Level Keys (Compatibility Detection)

${topLevelKeysStr || '  (no top-level keys found)'}

## Duplicate Analysis

${duplicates.length > 0 
  ? `Found ${duplicates.length} groups with duplicate labels. See \`duplicate_candidates.csv\` for details.`
  : 'No duplicate label groups found!'}

## Key Findings

- **Attributes Status**: ${attributes.filter(a => a.is_deprecated === 'yes').length} deprecated, ${attributes.filter(a => a.status === 'active').length} active
- **List Coverage**: ${lists.length} lists available for product attributes
- **Migration Scope**: ${Object.keys(attributeUsage).length} unique keys to canonicalize across ${sampleSize} products

## Next Steps

1. Review \`duplicate_candidates.csv\` and approve canonical mappings
2. Check \`product_attribute_usage.csv\` for unexpected keys
3. Verify \`lists_export.csv\` matches expected allowed values
4. Proceed with migration once canonical mapping is approved

## CSV Outputs

- **attribute_registry_export.csv** — All attribute definitions with metadata
- **lists_export.csv** — All list definitions and their values
- **product_attribute_usage.csv** — Attribute keys and usage counts
- **duplicate_candidates.csv** — Duplicate label groups with suggested canonical IDs

---
*Report generated by attribute-inventory.js*
`;
}

/**
 * Main execution
 */
async function main() {
  try {
    // 1. Scan all attributes
    const attributes = await scanAttributes();
    
    // 2. Scan all lists
    const lists = await scanLists();
    
    // 3. Scan product usage
    const { attributeUsage, topLevelKeys } = await scanProductUsage();
    
    // 4. Find duplicates
    const duplicates = findDuplicateCandidates(attributes);
    
    // 5. Generate CSV for attributes
    console.log('\n📝 Writing CSV files...');
    await writeCSV('attribute_registry_export.csv', attributes, [
      { id: 'attribute_id', title: 'attribute_id' },
      { id: 'label', title: 'label' },
      { id: 'data_type', title: 'data_type' },
      { id: 'allowed_values', title: 'allowed_values' },
      { id: 'allowed_values_ref', title: 'allowed_values_ref' },
      { id: 'validation_allowed_values_ref', title: 'validation.allowedValuesRef' },
      { id: 'source', title: 'source' },
      { id: 'created_by', title: 'createdBy' },
      { id: 'created_at', title: 'createdAt' },
      { id: 'updated_at', title: 'updatedAt' },
      { id: 'updated_by', title: 'updatedBy' },
      { id: 'status', title: 'status' },
      { id: 'is_deprecated', title: 'deprecated' },
      { id: 'doc_path', title: 'doc_path' },
    ]);
    
    // 6. Generate CSV for lists
    await writeCSV('lists_export.csv', lists, [
      { id: 'list_id', title: 'list_id' },
      { id: 'list_parent', title: 'list_parent' },
      { id: 'label', title: 'label' },
      { id: 'values', title: 'values' },
      { id: 'value_count', title: 'value_count' },
      { id: 'source', title: 'source' },
      { id: 'created_by', title: 'createdBy' },
      { id: 'created_at', title: 'createdAt' },
      { id: 'updated_at', title: 'updatedAt' },
      { id: 'doc_path', title: 'doc_path' },
    ]);
    
    // 7. Generate CSV for product attribute usage
    const usageRecords = Object.entries(attributeUsage).map(([attrKey, usage]) => ({
      attribute_id: attrKey,
      occurrence_count: usage.count,
      sample_products: usage.samples.slice(0, 10).join(' | '),
    }));
    await writeCSV('product_attribute_usage.csv', usageRecords, [
      { id: 'attribute_id', title: 'attribute_id' },
      { id: 'occurrence_count', title: 'occurrence_count' },
      { id: 'sample_products', title: 'sample_products' },
    ]);
    
    // 8. Generate CSV for duplicates
    await writeCSV('duplicate_candidates.csv', duplicates, [
      { id: 'label', title: 'label' },
      { id: 'count', title: 'count' },
      { id: 'attribute_ids', title: 'attribute_ids' },
      { id: 'suggested_canonical', title: 'suggested_canonical' },
      { id: 'from_ids', title: 'from_ids (to migrate)' },
      { id: 'data_types', title: 'data_types' },
      { id: 'allowed_values_diff', title: 'allowed_values_differ' },
    ]);
    
    // 9. Generate duplicate_map.csv for migration (template)
    const duplicateMap = duplicates.flatMap(dup => {
      const fromIds = dup.from_ids.split(' | ').filter(id => id);
      return fromIds.map(fromId => ({
        from_attribute_id: fromId,
        to_attribute_id: dup.suggested_canonical,
        reason: 'duplicate_label',
      }));
    });
    
    if (duplicateMap.length > 0) {
      await writeCSV('duplicate_map.csv', duplicateMap, [
        { id: 'from_attribute_id', title: 'from_attribute_id' },
        { id: 'to_attribute_id', title: 'to_attribute_id' },
        { id: 'reason', title: 'reason' },
      ]);
    } else {
      console.log('   ℹ️  No duplicates to map');
    }
    
    // 10. Generate summary markdown
    const summary = generateSummary(attributes, lists, attributeUsage, topLevelKeys, duplicates);
    const summaryPath = path.join(reportsDir, 'inventory_summary.md');
    fs.writeFileSync(summaryPath, summary);
    console.log(`   ✓ Wrote summary to inventory_summary.md`);
    
    // 11. Print final summary
    console.log('\n' + '='.repeat(60));
    console.log('✅ INVENTORY COMPLETE');
    console.log('='.repeat(60));
    console.log(`\n📊 Summary Statistics:\n`);
    console.log(`   Attributes:        ${attributes.length}`);
    console.log(`   Lists:             ${lists.length}`);
    console.log(`   Attr Keys in Use:  ${Object.keys(attributeUsage).length}`);
    console.log(`   Duplicate Groups:  ${duplicates.length}`);
    console.log(`   Top-Level Keys:    ${Object.keys(topLevelKeys).length}`);
    console.log(`\n📁 Output Files:\n`);
    console.log(`   ${path.relative(process.cwd(), path.join(reportsDir, 'attribute_registry_export.csv'))}`);
    console.log(`   ${path.relative(process.cwd(), path.join(reportsDir, 'lists_export.csv'))}`);
    console.log(`   ${path.relative(process.cwd(), path.join(reportsDir, 'product_attribute_usage.csv'))}`);
    if (duplicates.length > 0) {
      console.log(`   ${path.relative(process.cwd(), path.join(reportsDir, 'duplicate_candidates.csv'))}`);
      console.log(`   ${path.relative(process.cwd(), path.join(reportsDir, 'duplicate_map.csv'))}`);
    }
    console.log(`   ${path.relative(process.cwd(), path.join(reportsDir, 'inventory_summary.md'))}`);
    console.log(`\n🚀 Next: Review duplicate_map.csv and approve canonical mappings before migration.\n`);
    
    process.exit(0);
  } catch (error) {
    console.error('\n❌ Error:', error.message);
    console.error(error);
    process.exit(1);
  }
}

// Run
main();
