#!/usr/bin/env node
/**
 * MPN Migration Script - Canonical Product Identifier Remediation
 * 
 * This script migrates products to use canonical MPN-based identifiers:
 * 1. Extracts MPN from various product fields
 * 2. Computes normalized mpn_normalized field
 * 3. Updates product documents with mpn and mpn_normalized fields
 * 4. Creates product_mappings/{mpn_normalized} -> {productDocId} mappings
 * 5. Reports products missing MPN for manual review
 * 
 * Usage:
 *   node packages/api/scripts/migrate_mpn.js --dry-run
 *   node packages/api/scripts/migrate_mpn.js --apply --batch-size=200
 * 
 * Features:
 * - Idempotent (can run multiple times safely)
 * - Batch processing for large collections
 * - Comprehensive reporting
 * - Dry-run validation
 */

const admin = require('firebase-admin');
const yargs = require('yargs/yargs');
const { hideBin } = require('yargs/helpers');
const fs = require('fs');

// Parse command line arguments
const argv = yargs(hideBin(process.argv))
  .option('dry-run', { 
    type: 'boolean', 
    default: true,
    description: 'Run in dry-run mode (no writes to Firestore)'
  })
  .option('apply', { 
    type: 'boolean', 
    default: false,
    description: 'Apply changes to Firestore (overrides dry-run)'
  })
  .option('batch-size', { 
    type: 'number', 
    default: 100,
    description: 'Number of documents to process in each batch'
  })
  .argv;

// Initialize Firebase Admin
if (!admin.apps.length) {
  admin.initializeApp();
}
const db = admin.firestore();

// Determine if we're actually applying changes
const isDryRun = argv['dry-run'] && !argv.apply;
const batchSize = Math.min(argv['batch-size'], 500); // Cap at 500 for safety

console.log(`🔄 MPN Migration Script`);
console.log(`Mode: ${isDryRun ? 'DRY-RUN' : 'APPLY'}`);
console.log(`Batch Size: ${batchSize}`);
console.log(`Timestamp: ${new Date().toISOString()}`);
console.log('');

/**
 * Normalize MPN using the same logic as the shared library
 */
function normalizeMPN(raw) {
  if (!raw) return null;
  // deterministic normalization:
  // 1) trim, 2) lower-case, 3) replace sequences with hyphen, 4) collapse hyphens
  let s = String(raw).trim().toLowerCase();
  s = s.replace(/[\/\s_]+/g, '-');           // spaces/slashes/underscores -> hyphen
  s = s.replace(/[^a-z0-9-]+/g, '');         // remove other punctuation
  s = s.replace(/-+/g, '-');                 // collapse hyphens
  s = s.replace(/^-+|-+$/g, '');             // trim hyphens ends
  return s || null;
}

/**
 * Extract MPN from various product fields using heuristics
 */
function extractMpnFromProduct(data) {
  // Priority order for MPN extraction
  const candidates = [
    data.mpn,                           // Direct mpn field
    data.product_mpn,                   // Legacy product_mpn field  
    data.identifiers?.mpn,              // Nested identifiers.mpn
    data.attributes?.mpn,               // Attributes.mpn
    extractMpnFromAttributes(data.attributes), // Extract from attributes object
    data.core?.mpn,                     // Core.mpn from import
    data.sku,                           // Fallback to SKU if unique
  ];
  
  for (const candidate of candidates) {
    if (candidate && typeof candidate === 'string' && candidate.trim()) {
      return candidate.trim();
    }
  }
  
  return null;
}

/**
 * Extract MPN from attributes object (implement based on your attribute schema)
 */
function extractMpnFromAttributes(attrs) {
  if (!attrs || typeof attrs !== 'object') return null;
  
  // Look for attribute with id 'mpn' or key 'MPN'
  for (const [key, value] of Object.entries(attrs)) {
    if (key.toLowerCase() === 'mpn' && value && typeof value === 'string') {
      return value.trim();
    }
  }
  
  return null;
}

/**
 * Process a batch of product documents
 */
async function processBatch(docs, report, batchNum) {
  console.log(`\n📦 Processing batch ${batchNum} (${docs.length} documents)...`);
  
  const batch = db.batch();
  const batchReport = {
    updated: 0,
    mapped: 0, 
    skipped: 0,
    errors: 0,
    samples: []
  };

  for (const doc of docs) {
    try {
      const data = doc.data();
      const docId = doc.id;
      
      // Extract MPN
      const rawMpn = extractMpnFromProduct(data);
      if (!rawMpn) {
        batchReport.skipped++;
        if (batchReport.samples.length < 5) {
          batchReport.samples.push({ 
            id: docId, 
            reason: 'no_mpn',
            checked_fields: ['mpn', 'product_mpn', 'identifiers.mpn', 'attributes.mpn', 'core.mpn', 'sku']
          });
        }
        continue;
      }
      
      // Normalize MPN
      const mpnNormalized = normalizeMPN(rawMpn);
      if (!mpnNormalized) {
        batchReport.skipped++;
        if (batchReport.samples.length < 5) {
          batchReport.samples.push({ 
            id: docId, 
            reason: 'invalid_mpn',
            raw_mpn: rawMpn
          });
        }
        continue;
      }
      
      // Check if update is needed
      const needsUpdate = data.mpn !== rawMpn || data.mpn_normalized !== mpnNormalized;
      
      if (!needsUpdate && !isDryRun) {
        // Product already has correct fields, but ensure mapping exists
        const mapRef = db.collection('product_mappings').doc(mpnNormalized);
        batch.set(mapRef, {
          productDocId: docId,
          createdAt: admin.firestore.FieldValue.serverTimestamp(),
          source: 'migration-mapping-only',
          raw_mpn: rawMpn,
          mpn_normalized: mpnNormalized
        }, { merge: true });
        batchReport.mapped++;
        continue;
      }
      
      if (!isDryRun) {
        // Update product document
        const updateData = {
          mpn: rawMpn,
          mpn_normalized: mpnNormalized,
          // Migration metadata
          migration: {
            mpn_migration: {
              timestamp: admin.firestore.FieldValue.serverTimestamp(),
              source_field: determineSourceField(data, rawMpn),
              script_version: '1.0.0'
            }
          }
        };
        
        batch.update(doc.ref, updateData);
        
        // Create mapping document
        const mapRef = db.collection('product_mappings').doc(mpnNormalized);
        batch.set(mapRef, {
          productDocId: docId,
          createdAt: admin.firestore.FieldValue.serverTimestamp(),
          source: 'migration',
          raw_mpn: rawMpn,
          mpn_normalized: mpnNormalized
        }, { merge: true });
      }
      
      batchReport.updated++;
      batchReport.mapped++;
      
      // Sample tracking for report
      if (batchReport.samples.length < 3) {
        batchReport.samples.push({
          id: docId,
          raw_mpn: rawMpn,
          mpn_normalized: mpnNormalized,
          needs_update: needsUpdate
        });
      }
      
    } catch (error) {
      batchReport.errors++;
      console.error(`❌ Error processing document ${doc.id}:`, error.message);
    }
  }
  
  // Commit batch
  if (!isDryRun && batchReport.updated > 0) {
    await batch.commit();
    console.log(`✅ Committed batch ${batchNum}: ${batchReport.updated} updates, ${batchReport.mapped} mappings`);
  }
  
  // Update totals
  report.updated += batchReport.updated;
  report.mapped += batchReport.mapped;
  report.skipped += batchReport.skipped;
  report.errors += batchReport.errors;
  report.samples.push(...batchReport.samples);
  
  console.log(`   Updated: ${batchReport.updated}, Mapped: ${batchReport.mapped}, Skipped: ${batchReport.skipped}, Errors: ${batchReport.errors}`);
}

/**
 * Determine which field was the source of the MPN
 */
function determineSourceField(data, rawMpn) {
  const fields = ['mpn', 'product_mpn', 'identifiers.mpn', 'attributes.mpn', 'core.mpn', 'sku'];
  for (const field of fields) {
    const value = field.includes('.') ? 
      field.split('.').reduce((obj, key) => obj?.[key], data) : 
      data[field];
    if (value === rawMpn) return field;
  }
  return 'unknown';
}

/**
 * Main migration execution
 */
async function runMigration() {
  const startTime = Date.now();
  const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
  
  const report = {
    mode: isDryRun ? 'DRY-RUN' : 'APPLY',
    timestamp: timestamp,
    batch_size: batchSize,
    total_documents: 0,
    updated: 0,
    mapped: 0,
    skipped: 0,
    errors: 0,
    samples: [],
    missing_mpn: [],
    execution_time_ms: 0
  };

  try {
    // Get total count first
    console.log('📊 Analyzing products collection...');
    const snapshot = await db.collection('products').get();
    report.total_documents = snapshot.size;
    console.log(`Found ${report.total_documents} products to process\n`);
    
    if (report.total_documents === 0) {
      console.log('No products found. Exiting.');
      return;
    }
    
    // Process in batches
    const batches = [];
    for (let i = 0; i < snapshot.docs.length; i += batchSize) {
      batches.push(snapshot.docs.slice(i, i + batchSize));
    }
    
    console.log(`Processing ${batches.length} batches of up to ${batchSize} documents each...`);
    
    for (let i = 0; i < batches.length; i++) {
      await processBatch(batches[i], report, i + 1);
      
      // Rate limiting - small delay between batches
      if (i < batches.length - 1) {
        await new Promise(resolve => setTimeout(resolve, 100));
      }
    }
    
    // Generate missing MPN report
    report.missing_mpn = report.samples
      .filter(s => s.reason === 'no_mpn')
      .map(s => ({ id: s.id, checked_fields: s.checked_fields }));
    
    report.execution_time_ms = Date.now() - startTime;
    
    // Write detailed report
    const reportPath = `/tmp/migration_report_${timestamp}.json`;
    fs.writeFileSync(reportPath, JSON.stringify(report, null, 2));
    
    // Write missing MPN CSV
    if (report.missing_mpn.length > 0) {
      const csvPath = `/tmp/missing_mpn_${timestamp}.csv`;
      const csvContent = [
        'document_id,checked_fields',
        ...report.missing_mpn.map(item => `${item.id},"${item.checked_fields.join(', ')}"`)
      ].join('\n');
      fs.writeFileSync(csvPath, csvContent);
      console.log(`\n📄 Missing MPN report: ${csvPath}`);
    }
    
    // Final summary
    console.log(`\n🎯 Migration Summary:`);
    console.log(`   Mode: ${report.mode}`);
    console.log(`   Total Documents: ${report.total_documents}`);
    console.log(`   Updated: ${report.updated}`);
    console.log(`   Mappings Created: ${report.mapped}`);
    console.log(`   Skipped (No MPN): ${report.skipped}`);
    console.log(`   Errors: ${report.errors}`);
    console.log(`   Execution Time: ${Math.round(report.execution_time_ms / 1000)}s`);
    console.log(`   Detailed Report: ${reportPath}`);
    
    if (isDryRun) {
      console.log(`\n⚠️  DRY-RUN MODE - No changes applied to Firestore`);
      console.log(`   To apply changes, run: node packages/api/scripts/migrate_mpn.js --apply`);
    } else {
      console.log(`\n✅ Migration completed successfully`);
    }
    
  } catch (error) {
    console.error('\n❌ Migration failed:', error);
    report.execution_time_ms = Date.now() - startTime;
    
    // Still write error report
    const reportPath = `/tmp/migration_error_report_${timestamp}.json`;
    fs.writeFileSync(reportPath, JSON.stringify({ ...report, error: error.message }, null, 2));
    console.log(`Error report: ${reportPath}`);
    
    process.exit(1);
  }
}

// Run migration
runMigration().catch(error => {
  console.error('Unhandled error:', error);
  process.exit(1);
});