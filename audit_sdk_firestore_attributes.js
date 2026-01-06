#!/usr/bin/env node
/**
 * SDK ↔ Firestore Attribute Audit Script
 * LP-export-readiness-diagnostics-1.0.0 HES B - Task 3
 * 
 * PURPOSE:
 * - Compare attribute_id lists between SDK (69) and Firestore (119)
 * - Identify missing attributes (in Firestore but not SDK)
 * - Identify orphaned attributes (in SDK but not Firestore)
 * - Generate CSV and JSON audit reports
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

// Extract attributes array from the registry structure
const sdkAttributes = sdkAttributesData.attributes || sdkAttributesData;

async function auditAttributes() {
  console.log('\n🔍 SDK ↔ Firestore Attribute Audit\n');
  console.log('LP-export-readiness-diagnostics-1.0.0 HES B - Task 3\n');
  
  // Step 1: Load SDK attributes
  const sdkIds = new Set(sdkAttributes.map(attr => attr.attribute_id));
  console.log(`📦 SDK Attributes: ${sdkIds.size}`);
  
  // Step 2: Load Firestore attributes
  const firestoreSnapshot = await db.collection('attributes').get();
  const firestoreIds = new Set();
  const firestoreAttrs = {};
  
  firestoreSnapshot.forEach(doc => {
    const id = doc.id;
    firestoreIds.add(id);
    firestoreAttrs[id] = doc.data();
  });
  
  console.log(`🔥 Firestore Attributes: ${firestoreIds.size}\n`);
  
  // Step 3: Find deltas
  const missingInSdk = [...firestoreIds].filter(id => !sdkIds.has(id));
  const missingInFirestore = [...sdkIds].filter(id => !firestoreIds.has(id));
  const inBoth = [...sdkIds].filter(id => firestoreIds.has(id));
  
  console.log(`✅ Present in both: ${inBoth.length}`);
  console.log(`⚠️  In Firestore, missing in SDK: ${missingInSdk.length}`);
  console.log(`⚠️  In SDK, missing in Firestore: ${missingInFirestore.length}\n`);
  
  // Step 4: Analyze missing attributes
  const missingDetails = missingInSdk.map(id => {
    const attr = firestoreAttrs[id];
    return {
      attribute_id: id,
      label: attr.label || 'N/A',
      status: attr.status || 'active',
      source: attr.source || 'unknown',
      export: typeof attr.export === 'boolean' ? attr.export : (attr.export ? 'object' : 'undefined'),
      requiredForExport: attr.requiredForExport || false,
      exportable: attr.exportable !== false,
      data_type: attr.data_type || 'unknown',
      createdAt: attr.createdAt || 'unknown',
    };
  });
  
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
    summary: {
      sdk_count: sdkIds.size,
      firestore_count: firestoreIds.size,
      in_both: inBoth.length,
      missing_in_sdk: missingInSdk.length,
      missing_in_firestore: missingInFirestore.length,
      delta: firestoreIds.size - sdkIds.size,
    },
    missing_in_sdk: missingDetails,
    missing_in_firestore: missingInFirestore.map(id => {
      const sdkAttr = sdkAttributes.find(a => a.attribute_id === id);
      return {
        attribute_id: id,
        label: sdkAttr?.label || 'N/A',
        status: sdkAttr?.status || 'active',
      };
    }),
    in_both: inBoth.sort(),
  };
  
  const jsonPath = path.join(evidenceDir, `attribute-audit-${timestamp}.json`);
  fs.writeFileSync(jsonPath, JSON.stringify(jsonReport, null, 2));
  console.log(`📄 JSON Report: ${jsonPath}\n`);
  
  // CSV report
  const csvHeaders = 'attribute_id,location,label,status,source,export,requiredForExport,exportable,data_type,createdAt\n';
  const csvRows = [
    ...missingDetails.map(attr => 
      `${attr.attribute_id},firestore_only,${attr.label},${attr.status},${attr.source},${attr.export},${attr.requiredForExport},${attr.exportable},${attr.data_type},${attr.createdAt}`
    ),
    ...missingInFirestore.map(id => {
      const sdkAttr = sdkAttributes.find(a => a.attribute_id === id);
      return `${id},sdk_only,${sdkAttr?.label || 'N/A'},${sdkAttr?.status || 'active'},sdk,N/A,N/A,N/A,${sdkAttr?.data_type || 'unknown'},N/A`;
    })
  ];
  
  const csvPath = path.join(evidenceDir, `attribute-audit-${timestamp}.csv`);
  fs.writeFileSync(csvPath, csvHeaders + csvRows.join('\n'));
  console.log(`📊 CSV Report: ${csvPath}\n`);
  
  // Step 6: Print sample findings
  if (missingInSdk.length > 0) {
    console.log('🔎 Sample Attributes Missing in SDK (first 10):\n');
    missingDetails.slice(0, 10).forEach(attr => {
      console.log(`  • ${attr.attribute_id}`);
      console.log(`    Label: ${attr.label}`);
      console.log(`    Status: ${attr.status}`);
      console.log(`    Source: ${attr.source}`);
      console.log(`    Export: ${attr.export}`);
      console.log('');
    });
  }
  
  // Step 7: Priority assessment
  console.log('\n📋 PRIORITY ASSESSMENT:\n');
  
  const activeExportable = missingDetails.filter(attr => 
    attr.status === 'active' && 
    attr.exportable && 
    (attr.export === true || attr.export === 'object')
  );
  
  const requiredForExport = missingDetails.filter(attr => attr.requiredForExport);
  
  console.log(`  P0-CRITICAL: ${requiredForExport.length} attributes required for export`);
  console.log(`  P1-HIGH: ${activeExportable.length} active + exportable attributes`);
  console.log(`  P2-MEDIUM: ${missingInSdk.length - activeExportable.length} other attributes\n`);
  
  console.log('✅ Audit complete. No data changes made (read-only operation).\n');
}

auditAttributes()
  .then(() => process.exit(0))
  .catch(err => {
    console.error('❌ Audit failed:', err);
    process.exit(1);
  });
