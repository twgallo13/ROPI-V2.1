/**
 * LP-1.0.1 Task 7 — Per-SKU Attribute Verification
 * 
 * Validates that product documents contain required canonical attributes
 * from the attribute registry and CoreProduct schema.
 * 
 * Usage:
 *   GOOGLE_APPLICATION_CREDENTIALS=/path/to/sa.json node scripts/verifyProductAttributes.js
 */

const admin = require('firebase-admin');
const fs = require('fs');
const path = require('path');

// Initialize Firebase Admin
admin.initializeApp();
const db = admin.firestore();

// Load attribute registry to determine required fields
const registryPath = path.join(__dirname, '../packages/sdk/config/attributeRegistry.json');
let requiredAttributes = [];

try {
  const registry = JSON.parse(fs.readFileSync(registryPath, 'utf-8'));
  requiredAttributes = (registry.attributes || [])
    .filter(attr => attr.required_for_completion || attr.import_required)
    .map(attr => attr.attribute_id);
  
  console.log(`\n📋 Loaded ${requiredAttributes.length} required attributes from registry\n`);
} catch (err) {
  console.error('⚠️  Could not load attribute registry:', err.message);
  console.log('Will use minimal required set: mpn, sku, name, brand, category, class, primary_color\n');
  requiredAttributes = ['mpn', 'sku', 'name', 'brand', 'category', 'class', 'primary_color'];
}

// CoreProduct schema required fields (from coreProduct.ts)
const coreProductRequiredFields = [
  'mpn',
  'styleCode',
  'brand',
  'gender',
  'category',
  'class',
  'colorPrimary',
  'sizeScale',
  'launchDate',
  'status',
];

async function verifyProducts() {
  const report = {
    timestamp: new Date().toISOString(),
    totalProducts: 0,
    sampledProducts: 0,
    productsWithMissingAttributes: [],
    missingAttributesSummary: {},
    productsWithInvalidStatus: [],
    productsWithRawStatusData: [],
  };

  try {
    // Sample up to 200 products
    const productsSnapshot = await db.collection('products').limit(200).get();
    report.totalProducts = productsSnapshot.size;
    report.sampledProducts = productsSnapshot.size;

    console.log(`🔍 Analyzing ${productsSnapshot.size} products...\n`);

    productsSnapshot.forEach((doc) => {
      const product = doc.data();
      const productId = doc.id;
      const missingAttributes = [];

      // Check CoreProduct required fields
      coreProductRequiredFields.forEach((field) => {
        if (product[field] === undefined || product[field] === null || product[field] === '') {
          missingAttributes.push(field);
          report.missingAttributesSummary[field] = (report.missingAttributesSummary[field] || 0) + 1;
        }
      });

      // Check required attributes from registry
      const attrs = product.attributes || {};
      requiredAttributes.forEach((attrId) => {
        if (attrs[attrId] === undefined || attrs[attrId] === null || attrs[attrId] === '') {
          const fieldName = `attributes.${attrId}`;
          missingAttributes.push(fieldName);
          report.missingAttributesSummary[fieldName] = (report.missingAttributesSummary[fieldName] || 0) + 1;
        }
      });

      if (missingAttributes.length > 0) {
        report.productsWithMissingAttributes.push({
          id: productId,
          mpn: product.mpn || '(no mpn)',
          sku: product.sku || attrs.sku || '(no sku)',
          missingAttributes,
        });
      }

      // Check for invalid status (should be DRAFT | READY_FOR_EXPORT | DISCONTINUED)
      const validStatuses = ['DRAFT', 'READY_FOR_EXPORT', 'DISCONTINUED'];
      if (product.status && !validStatuses.includes(product.status)) {
        report.productsWithInvalidStatus.push({
          id: productId,
          mpn: product.mpn,
          status: product.status,
        });
      }

      // Check if raw data contains Status or Product Is Active fields (pass-through concern)
      const raw = product.raw || product.meta?.raw || {};
      if (raw['Status'] || raw['Product Is Active'] || raw['status'] || raw['product_is_active']) {
        report.productsWithRawStatusData.push({
          id: productId,
          mpn: product.mpn,
          rawStatus: raw['Status'] || raw['status'],
          rawProductIsActive: raw['Product Is Active'] || raw['product_is_active'],
        });
      }
    });

    // Print summary
    console.log('═══════════════════════════════════════════════════════════');
    console.log('  PER-SKU ATTRIBUTE VERIFICATION REPORT');
    console.log('═══════════════════════════════════════════════════════════\n');

    console.log(`📊 Total products sampled: ${report.sampledProducts}`);
    console.log(`⚠️  Products with missing attributes: ${report.productsWithMissingAttributes.length}`);
    console.log(`❌ Products with invalid status: ${report.productsWithInvalidStatus.length}`);
    console.log(`🔍 Products with raw Status/Product Is Active: ${report.productsWithRawStatusData.length}\n`);

    if (Object.keys(report.missingAttributesSummary).length > 0) {
      console.log('Missing Attributes Summary (field → count):');
      Object.entries(report.missingAttributesSummary)
        .sort((a, b) => b[1] - a[1])
        .forEach(([field, count]) => {
          console.log(`  - ${field}: ${count} products`);
        });
      console.log('');
    }

    if (report.productsWithMissingAttributes.length > 0 && report.productsWithMissingAttributes.length <= 10) {
      console.log('Products with Missing Attributes (sample):');
      report.productsWithMissingAttributes.slice(0, 10).forEach((p) => {
        console.log(`  - ${p.id} (mpn: ${p.mpn}, sku: ${p.sku})`);
        console.log(`    Missing: ${p.missingAttributes.join(', ')}`);
      });
      console.log('');
    }

    if (report.productsWithInvalidStatus.length > 0) {
      console.log('⚠️  Products with Invalid Status:');
      report.productsWithInvalidStatus.forEach((p) => {
        console.log(`  - ${p.id} (mpn: ${p.mpn}) → status: "${p.status}"`);
      });
      console.log('');
    }

    if (report.productsWithRawStatusData.length > 0) {
      console.log('🔍 Products with Raw Status/Product Is Active Data:');
      report.productsWithRawStatusData.slice(0, 10).forEach((p) => {
        console.log(`  - ${p.id} (mpn: ${p.mpn})`);
        if (p.rawStatus) console.log(`    raw.Status: "${p.rawStatus}"`);
        if (p.rawProductIsActive) console.log(`    raw['Product Is Active']: "${p.rawProductIsActive}"`);
      });
      if (report.productsWithRawStatusData.length > 10) {
        console.log(`  ... and ${report.productsWithRawStatusData.length - 10} more`);
      }
      console.log('');
    }

    // Save full report to JSON
    const reportPath = path.join(__dirname, '../reports/product-attribute-verification.json');
    fs.mkdirSync(path.dirname(reportPath), { recursive: true });
    fs.writeFileSync(reportPath, JSON.stringify(report, null, 2));
    console.log(`✅ Full report saved to: ${reportPath}\n`);

    // Exit code based on results
    if (report.productsWithInvalidStatus.length > 0) {
      console.error('❌ FAIL: Found products with invalid status values');
      process.exit(1);
    }

    if (report.productsWithMissingAttributes.length > report.sampledProducts * 0.5) {
      console.error('⚠️  WARN: More than 50% of products have missing attributes');
      process.exit(0); // Don't fail, but warn
    }

    console.log('✅ Verification complete');
    process.exit(0);

  } catch (error) {
    console.error('❌ Verification failed:', error);
    process.exit(1);
  }
}

// Run verification
verifyProducts();
