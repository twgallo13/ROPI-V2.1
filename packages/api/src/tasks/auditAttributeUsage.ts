/**
 * LP-2.1.3: Attribute Usage Audit Task
 * 
 * Scans all products in Firestore and generates:
 * 1. attribute-usage-report.csv - All attributes with usage counts and sample IDs
 * 2. candidate-deletions.csv - Attributes with usageCount == 0 and no code/cfg refs
 * 
 * Usage:
 *   node packages/api/dist/tasks/auditAttributeUsage.js [--output-dir <path>]
 * 
 * Lisa v1.0.0 - LP-2.1.3
 */

import * as admin from 'firebase-admin';
import * as fs from 'fs';
import * as path from 'path';

// Initialize Firebase Admin if not already initialized
if (!admin.apps.length) {
  admin.initializeApp();
}

// Initialize db inside function to avoid module-level execution
function getDb() {
  return admin.firestore();
}

interface AttributeUsage {
  attribute_id: string;
  usageCount: number;
  sampleProductIds: string[];
  inRegistry: boolean;
  inCodebase: boolean;
  inImportExport: boolean;
  inSmartRules: boolean;
}

interface AuditResult {
  totalProducts: number;
  totalAttributes: number;
  registryAttributes: string[];
  usedAttributes: Map<string, AttributeUsage>;
  candidateDeletions: string[];
  timestamp: string;
}

// Known code references (from grep search - will be populated during audit)
const CODE_REFERENCED_ATTRIBUTES = new Set<string>();

// Import/Export column mappings (from importService, exportService)
const IMPORT_EXPORT_ATTRIBUTES = new Set<string>([
  // Core identifiers
  'sku', 'mpn', 'gtin', 'style_id', 'name', 'brand',
  // Standard import columns from RetailOps format
  'category', 'class', 'department', 'gender', 'age_group',
  'primary_color', 'descriptive_color', 'material',
  'height', 'length', 'width', 'weight',
  'description_shiekh', 'description_karmaloop', 'description_mltd',
  'meta_name', 'meta_description', 'keywords',
  'map', 'scom_regular_price', 'scom_sale_price',
  'status', 'product_is_active',
]);

// Smart rules attributes (from rules engine)
const SMART_RULES_ATTRIBUTES = new Set<string>([
  'category', 'class', 'department', 'brand', 'gender',
  'primary_color', 'material', 'status', 'product_is_active',
]);

/**
 * Load registry attributes from JSON
 */
async function loadRegistryAttributes(): Promise<string[]> {
  const registryPath = path.resolve(__dirname, '../../../sdk/config/attributeRegistry.json');
  
  try {
    const raw = fs.readFileSync(registryPath, 'utf-8');
    const parsed = JSON.parse(raw);
    const attributes = Array.isArray(parsed) ? parsed : (parsed.attributes || []);
    return attributes.map((a: { attribute_id: string }) => a.attribute_id);
  } catch (error) {
    console.error('Failed to load registry:', error);
    return [];
  }
}

/**
 * Scan all products and count attribute usage
 */
async function scanProductAttributes(): Promise<Map<string, AttributeUsage>> {
  const usageMap = new Map<string, AttributeUsage>();
  
  console.log('📊 Scanning products collection...');
  
  let lastDoc: admin.firestore.DocumentSnapshot | null = null;
  let totalProducts = 0;
  const batchSize = 500;
  
  while (true) {
    let query = getDb().collection('products')
      .orderBy(admin.firestore.FieldPath.documentId())
      .limit(batchSize);
    
    if (lastDoc) {
      query = query.startAfter(lastDoc);
    }
    
    const snapshot = await query.get();
    
    if (snapshot.empty) {
      break;
    }
    
    for (const doc of snapshot.docs) {
      totalProducts++;
      const product = doc.data();
      const productId = doc.id;
      
      // Scan top-level attributes
      const attrs = product.attributes || {};
      
      for (const [key, value] of Object.entries(attrs)) {
        // Skip null/undefined/empty values
        if (value === null || value === undefined || value === '') {
          continue;
        }
        
        if (!usageMap.has(key)) {
          usageMap.set(key, {
            attribute_id: key,
            usageCount: 0,
            sampleProductIds: [],
            inRegistry: false,
            inCodebase: CODE_REFERENCED_ATTRIBUTES.has(key),
            inImportExport: IMPORT_EXPORT_ATTRIBUTES.has(key),
            inSmartRules: SMART_RULES_ATTRIBUTES.has(key),
          });
        }
        
        const usage = usageMap.get(key)!;
        usage.usageCount++;
        
        // Keep up to 3 sample IDs
        if (usage.sampleProductIds.length < 3) {
          usage.sampleProductIds.push(productId);
        }
      }
      
      // Also check for attributes stored at top level (legacy format)
      const topLevelAttrs = ['sku', 'mpn', 'gtin', 'name', 'brand', 'status'];
      for (const key of topLevelAttrs) {
        if (product[key] !== undefined && product[key] !== null && product[key] !== '') {
          if (!usageMap.has(key)) {
            usageMap.set(key, {
              attribute_id: key,
              usageCount: 0,
              sampleProductIds: [],
              inRegistry: false,
              inCodebase: CODE_REFERENCED_ATTRIBUTES.has(key),
              inImportExport: IMPORT_EXPORT_ATTRIBUTES.has(key),
              inSmartRules: SMART_RULES_ATTRIBUTES.has(key),
            });
          }
          
          const usage = usageMap.get(key)!;
          // Avoid double-counting if also in attributes object
          if (!attrs[key]) {
            usage.usageCount++;
            if (usage.sampleProductIds.length < 3) {
              usage.sampleProductIds.push(product.mpn || doc.id);
            }
          }
        }
      }
    }
    
    lastDoc = snapshot.docs[snapshot.docs.length - 1];
    console.log(`  Processed ${totalProducts} products...`);
  }
  
  console.log(`✅ Scanned ${totalProducts} products, found ${usageMap.size} unique attributes`);
  
  return usageMap;
}

/**
 * Generate CSV report
 */
function generateUsageReportCSV(
  usageMap: Map<string, AttributeUsage>,
  registryAttrs: string[],
  outputPath: string
): void {
  const registrySet = new Set(registryAttrs);
  
  // Mark registry membership
  for (const [key, usage] of usageMap) {
    usage.inRegistry = registrySet.has(key);
  }
  
  // Add registry attributes with zero usage
  for (const attrId of registryAttrs) {
    if (!usageMap.has(attrId)) {
      usageMap.set(attrId, {
        attribute_id: attrId,
        usageCount: 0,
        sampleProductIds: [],
        inRegistry: true,
        inCodebase: CODE_REFERENCED_ATTRIBUTES.has(attrId),
        inImportExport: IMPORT_EXPORT_ATTRIBUTES.has(attrId),
        inSmartRules: SMART_RULES_ATTRIBUTES.has(attrId),
      });
    }
  }
  
  // Sort by attribute_id
  const sortedUsage = Array.from(usageMap.values()).sort((a, b) => 
    a.attribute_id.localeCompare(b.attribute_id)
  );
  
  // Generate CSV
  const header = 'attribute_id,usageCount,sampleProductIds,inRegistry,inCodebase,inImportExport,inSmartRules';
  const rows = sortedUsage.map(u => 
    `${u.attribute_id},${u.usageCount},"${u.sampleProductIds.join(';')}",${u.inRegistry},${u.inCodebase},${u.inImportExport},${u.inSmartRules}`
  );
  
  const csv = [header, ...rows].join('\n');
  fs.writeFileSync(outputPath, csv);
  console.log(`📄 Written: ${outputPath}`);
}

/**
 * Generate candidate deletions CSV
 */
function generateCandidateDeletionsCSV(
  usageMap: Map<string, AttributeUsage>,
  outputPath: string
): string[] {
  const candidates: AttributeUsage[] = [];
  
  for (const usage of usageMap.values()) {
    // Candidate for deletion if:
    // 1. usageCount == 0 (no products use it)
    // 2. Not referenced in code
    // 3. Not in import/export mappings
    // 4. Not in smart rules
    if (
      usage.usageCount === 0 &&
      !usage.inCodebase &&
      !usage.inImportExport &&
      !usage.inSmartRules
    ) {
      candidates.push(usage);
    }
  }
  
  // Sort alphabetically
  candidates.sort((a, b) => a.attribute_id.localeCompare(b.attribute_id));
  
  // Generate CSV
  const header = 'attribute_id,usageCount,inRegistry,reason';
  const rows = candidates.map(c => 
    `${c.attribute_id},${c.usageCount},${c.inRegistry},zero_usage_no_refs`
  );
  
  const csv = [header, ...rows].join('\n');
  fs.writeFileSync(outputPath, csv);
  console.log(`📄 Written: ${outputPath}`);
  
  return candidates.map(c => c.attribute_id);
}

/**
 * Main audit function
 */
export async function runAttributeUsageAudit(outputDir?: string): Promise<AuditResult> {
  const timestamp = new Date().toISOString();
  const outDir = outputDir || path.resolve(__dirname, '../../../../logs');
  
  // Ensure output directory exists
  if (!fs.existsSync(outDir)) {
    fs.mkdirSync(outDir, { recursive: true });
  }
  
  console.log('\n═══════════════════════════════════════════');
  console.log('  LP-2.1.3: Attribute Usage Audit');
  console.log('═══════════════════════════════════════════\n');
  
  // Load registry
  const registryAttrs = await loadRegistryAttributes();
  console.log(`📋 Registry contains ${registryAttrs.length} attributes\n`);
  
  // Scan products
  const usageMap = await scanProductAttributes();
  
  // Generate reports
  const usageReportPath = path.join(outDir, 'attribute-usage-report.csv');
  const candidatesPath = path.join(outDir, 'candidate-deletions.csv');
  
  generateUsageReportCSV(usageMap, registryAttrs, usageReportPath);
  const candidateDeletions = generateCandidateDeletionsCSV(usageMap, candidatesPath);
  
  // Summary
  const result: AuditResult = {
    totalProducts: Array.from(usageMap.values()).reduce((sum, u) => sum + (u.usageCount > 0 ? 1 : 0), 0),
    totalAttributes: usageMap.size,
    registryAttributes: registryAttrs,
    usedAttributes: usageMap,
    candidateDeletions,
    timestamp,
  };
  
  console.log('\n─────────────────────────────────────');
  console.log('📊 Audit Summary:');
  console.log(`   Total attributes in registry: ${registryAttrs.length}`);
  console.log(`   Total unique attributes found: ${usageMap.size}`);
  console.log(`   Attributes with usage > 0: ${Array.from(usageMap.values()).filter(u => u.usageCount > 0).length}`);
  console.log(`   Candidate deletions: ${candidateDeletions.length}`);
  console.log('─────────────────────────────────────\n');
  
  if (candidateDeletions.length > 0) {
    console.log('🗑️  Candidate deletions (zero usage, no code refs):');
    for (const attrId of candidateDeletions.slice(0, 10)) {
      console.log(`   - ${attrId}`);
    }
    if (candidateDeletions.length > 10) {
      console.log(`   ... and ${candidateDeletions.length - 10} more`);
    }
  } else {
    console.log('✅ No candidate deletions found');
  }
  
  return result;
}

/**
 * CLI entry point
 */
if (require.main === module) {
  const outputDir = process.argv.includes('--output-dir')
    ? process.argv[process.argv.indexOf('--output-dir') + 1]
    : undefined;
  
  runAttributeUsageAudit(outputDir)
    .then((result) => {
      console.log('\n✅ Audit completed successfully');
      console.log(`   Timestamp: ${result.timestamp}`);
      process.exit(0);
    })
    .catch((error) => {
      console.error('❌ Audit failed:', error);
      process.exit(1);
    });
}

export default runAttributeUsageAudit;
