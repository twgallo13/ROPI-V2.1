#!/usr/bin/env node
/**
 * SDK vs Product Attribute Usage Audit
 * LP-export-readiness-diagnostics-1.0.0 HES B - Task 3
 * 
 * PURPOSE:
 * - Compare SDK attribute registry (69 attrs) vs actual product attribute usage
 * - Find attributes used in products but not in SDK registry
 * - Find SDK attributes never used in products
 * - Generate comprehensive audit report
 * 
 * SCOPE: Read-only audit, NO data changes
 */

const admin = require('firebase-admin');
const fs = require('fs');
const path = require('path');

// Initialize Firebase
admin.initializeApp();
const db = admin.firestore();

// Load SDK attributes from config
const sdkAttributePath = path.join(__dirname, 'packages/sdk/config/attributeRegistry.json');
const sdkAttributesData = JSON.parse(fs.readFileSync(sdkAttributePath, 'utf8'));
const sdkAttributes = sdkAttributesData.attributes || sdkAttributesData;

async function auditProductAttributes() {
  console.log('\n🔍 SDK vs Product Attribute Usage Audit\n');
  console.log('LP-export-readiness-diagnostics-1.0.0 HES B - Task 3\n');
  
  // Step 1: SDK registry
  const sdkIds = new Set(sdkAttributes.map(attr => attr.attribute_id));
  console.log(`📦 SDK Registry Attributes: ${sdkIds.size}`);
  
  // Step 2: Sample products to find all used attribute keys
  console.log('🔥 Scanning products for attribute usage...');
  const productsSnapshot = await db.collection('products')
    .limit(1000)
    .get();
  
  console.log(`   Sampled ${productsSnapshot.size} products\n`);
  
  const usedAttributeKeys = new Set();
  const attributeUsageCount = {};
  const exportFieldUsage = {
    boolean: 0,
    object: 0,
    undefined: 0
  };
  
  productsSnapshot.forEach(doc => {
    const product = doc.data();
    if (product.attributes && typeof product.attributes === 'object') {
      Object.keys(product.attributes).forEach(key => {
        usedAttributeKeys.add(key);
        attributeUsageCount[key] = (attributeUsageCount[key] || 0) + 1;
      });
    }
  });
  
  console.log(`🔑 Unique attribute keys found in products: ${usedAttributeKeys.size}\n`);
  
  // Step 3: Find deltas
  const usedButNotInSdk = [...usedAttributeKeys].filter(key => !sdkIds.has(key));
  const inSdkButNeverUsed = [...sdkIds].filter(key => !usedAttributeKeys.has(key));
  const inBoth = [...sdkIds].filter(key => usedAttributeKeys.has(key));
  
  console.log(`✅ Used AND in SDK: ${inBoth.length}`);
  console.log(`⚠️  Used but NOT in SDK: ${usedButNotInSdk.length}`);
  console.log(`⚠️  In SDK but NEVER used: ${inSdkButNeverUsed.length}\n`);
  
  // Step 4: Analyze SDK attributes for export field format
  const sdkExportFormats = {
    boolean: 0,
    object: 0,
    undefined: 0
  };
  
  sdkAttributes.forEach(attr => {
    if (typeof attr.export === 'boolean') {
      sdkExportFormats.boolean++;
    } else if (typeof attr.export === 'object' && attr.export !== null) {
      sdkExportFormats.object++;
    } else {
      sdkExportFormats.undefined++;
    }
  });
  
  console.log('📊 SDK Export Field Formats:');
  console.log(`   Boolean (legacy): ${sdkExportFormats.boolean}`);
  console.log(`   Object (new): ${sdkExportFormats.object}`);
  console.log(`   Undefined: ${sdkExportFormats.undefined}\n`);
  
  // Step 5: Generate reports
  const timestamp = new Date().toISOString().split('T')[0];
  const evidenceDir = path.join(__dirname, 'evidence/lp-export-readiness-diagnostics');
  
  if (!fs.existsSync(evidenceDir)) {
    fs.mkdirSync(evidenceDir, { recursive: true });
  }
  
  // JSON report
  const jsonReport = {
    audit_timestamp: new Date().toISOString(),
    lp: 'LP-export-readiness-diagnostics-1.0.0',
    task: 'HES B - Task 3',
    scope: `Sampled ${productsSnapshot.size} products`,
    summary: {
      sdk_registry_count: sdkIds.size,
      product_attributes_found: usedAttributeKeys.size,
      used_and_in_sdk: inBoth.length,
      used_not_in_sdk: usedButNotInSdk.length,
      in_sdk_never_used: inSdkButNeverUsed.length,
      delta: usedAttributeKeys.size - sdkIds.size,
    },
    sdk_export_formats: sdkExportFormats,
    used_but_not_in_sdk: usedButNotInSdk.sort().map(key => ({
      attribute_id: key,
      usage_count: attributeUsageCount[key],
      impact: attributeUsageCount[key] > 10 ? 'HIGH' : attributeUsageCount[key] > 3 ? 'MEDIUM' : 'LOW'
    })),
    in_sdk_never_used: inSdkButNeverUsed.sort().map(key => {
      const sdkAttr = sdkAttributes.find(a => a.attribute_id === key);
      return {
        attribute_id: key,
        label: sdkAttr?.label || 'N/A',
        status: sdkAttr?.status || 'active',
        required_for_export: sdkAttr?.required_for_export || false,
      };
    }),
    used_and_in_sdk: inBoth.sort().map(key => ({
      attribute_id: key,
      usage_count: attributeUsageCount[key],
    })),
    top_10_most_used: Object.entries(attributeUsageCount)
      .sort((a, b) => b[1] - a[1])
      .slice(0, 10)
      .map(([key, count]) => ({
        attribute_id: key,
        usage_count: count,
        in_sdk: sdkIds.has(key),
      })),
  };
  
  const jsonPath = path.join(evidenceDir, `sdk-product-attribute-audit-${timestamp}.json`);
  fs.writeFileSync(jsonPath, JSON.stringify(jsonReport, null, 2));
  console.log(`📄 JSON Report: ${jsonPath}\n`);
  
  // CSV report
  const csvHeaders = 'attribute_id,location,usage_count,in_sdk,label,status,impact\n';
  const csvRows = [
    ...usedButNotInSdk.map(key => 
      `${key},product_only,${attributeUsageCount[key]},false,N/A,N/A,${attributeUsageCount[key] > 10 ? 'HIGH' : attributeUsageCount[key] > 3 ? 'MEDIUM' : 'LOW'}`
    ),
    ...inSdkButNeverUsed.map(key => {
      const sdkAttr = sdkAttributes.find(a => a.attribute_id === key);
      return `${key},sdk_only,0,true,${sdkAttr?.label || 'N/A'},${sdkAttr?.status || 'active'},LOW`;
    }),
    ...inBoth.map(key => {
      const sdkAttr = sdkAttributes.find(a => a.attribute_id === key);
      return `${key},both,${attributeUsageCount[key]},true,${sdkAttr?.label || 'N/A'},${sdkAttr?.status || 'active'},N/A`;
    })
  ];
  
  const csvPath = path.join(evidenceDir, `sdk-product-attribute-audit-${timestamp}.csv`);
  fs.writeFileSync(csvPath, csvHeaders + csvRows.join('\n'));
  console.log(`📊 CSV Report: ${csvPath}\n`);
  
  // Step 6: Print sample findings
  if (usedButNotInSdk.length > 0) {
    console.log('🔎 Top 10 Attributes Used but NOT in SDK:\n');
    const top10 = [...usedButNotInSdk]
      .sort((a, b) => attributeUsageCount[b] - attributeUsageCount[a])
      .slice(0, 10);
    
    top10.forEach(key => {
      console.log(`  • ${key} (used ${attributeUsageCount[key]} times)`);
    });
    console.log('');
  }
  
  if (inSdkButNeverUsed.length > 0) {
    console.log(`🔎 Sample SDK Attributes NEVER Used (first 10 of ${inSdkButNeverUsed.length}):\n`);
    inSdkButNeverUsed.slice(0, 10).forEach(key => {
      const sdkAttr = sdkAttributes.find(a => a.attribute_id === key);
      console.log(`  • ${key} - "${sdkAttr?.label || 'N/A'}"`);
    });
    console.log('');
  }
  
  // Step 7: Priority assessment
  console.log('\n📋 PRIORITY ASSESSMENT:\n');
  
  const highUsageNotInSdk = usedButNotInSdk.filter(key => attributeUsageCount[key] > 10);
  const mediumUsageNotInSdk = usedButNotInSdk.filter(key => 
    attributeUsageCount[key] > 3 && attributeUsageCount[key] <= 10
  );
  const lowUsageNotInSdk = usedButNotInSdk.filter(key => attributeUsageCount[key] <= 3);
  
  console.log(`  P1-HIGH: ${highUsageNotInSdk.length} widely-used attributes missing from SDK (>10 products)`);
  console.log(`  P2-MEDIUM: ${mediumUsageNotInSdk.length} moderately-used attributes missing from SDK (4-10 products)`);
  console.log(`  P3-LOW: ${lowUsageNotInSdk.length} rarely-used attributes missing from SDK (≤3 products)`);
  console.log(`  INFO: ${inSdkButNeverUsed.length} SDK attributes never used in products\n`);
  
  console.log('✅ Audit complete. No data changes made (read-only operation).\n');
}

auditProductAttributes()
  .then(() => process.exit(0))
  .catch(err => {
    console.error('❌ Audit failed:', err);
    process.exit(1);
  });
