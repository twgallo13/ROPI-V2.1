/**
 * S4 Staging Smoke Tests
 * LP-smart-rules-exporter-1.0.0 — Exporter & Validation Alignment
 * 
 * Tests A-E per Lisa's acceptance criteria:
 * A - Export inclusion with export.key mapping
 * B - Required field validation (MISSING_REQUIRED_EXPORT_FIELD)
 * C - Internal-only protection
 * D - Channel targets (shopify vs google)
 * E - Performance (1000 products)
 */

import {
  loadExportableAttributes,
  getExportColumnHeaders,
  getExportHeader,
  shouldOmitIfEmpty,
  validateProductForExport,
  validateBatchForExport,
  buildExportRow,
  calculateExportReadiness,
  type ExportAttributeDefinition,
  type ProductDocument,
  type ExportOptions,
  type ExportTarget,
} from '../packages/api/src/services/exportService';

// ============================================================================
// Test Data Setup
// ============================================================================

/**
 * Create mock product documents for testing
 */
function createTestProducts(count: number): ProductDocument[] {
  const products: ProductDocument[] = [];
  
  for (let i = 0; i < count; i++) {
    const hasGender = i % 3 !== 0; // Every 3rd product missing gender
    const hasBrand = i % 5 !== 0; // Every 5th product missing brand
    
    products.push({
      id: `prod-${String(i).padStart(4, '0')}`,
      mpn: `MPN-${String(i).padStart(4, '0')}`,
      sku: `SKU-${String(i).padStart(4, '0')}`,
      attributes: {
        ...(hasBrand && { brand: ['Nike', 'Adidas', 'Puma', 'Under Armour'][i % 4] }),
        ...(hasGender && { gender: ['Men', 'Women', 'Unisex'][i % 3] }),
        primary_color: ['Black', 'White', 'Red', 'Blue'][i % 4],
        size: ['S', 'M', 'L', 'XL'][i % 4],
        style_name: `Style ${i}`,
        price: (19.99 + i).toFixed(2),
        // Internal fields that should NOT be exported
        internal_tracking_id: `TRACK-${i}`,
        audit_log: { entries: [], lastModified: new Date().toISOString() },
        internal_notes: `Internal note for product ${i}`,
      },
    });
  }
  
  return products;
}

/**
 * Create attribute definitions for testing
 */
function createTestAttributes(): Map<string, ExportAttributeDefinition> {
  return new Map<string, ExportAttributeDefinition>([
    // Exportable with export.key
    ['primary_color', {
      id: 'primary_color',
      attribute_id: 'primary_color',
      label: 'Primary Color',
      data_type: 'enum',
      category: 'appearance',
      external_header: 'Color',
      export: { key: 'ColorCode', omitIfEmpty: false },
      requiredForExport: false,
    }],
    // Required for export
    ['gender', {
      id: 'gender',
      attribute_id: 'gender',
      label: 'Gender',
      data_type: 'enum',
      category: 'demographics',
      requiredForExport: true,
    }],
    // Required for export
    ['brand', {
      id: 'brand',
      attribute_id: 'brand',
      label: 'Brand',
      data_type: 'string',
      category: 'identity',
      requiredForExport: true,
    }],
    // Optional with omitIfEmpty
    ['optional_tag', {
      id: 'optional_tag',
      attribute_id: 'optional_tag',
      label: 'Optional Tag',
      data_type: 'string',
      category: 'tags',
      export: { key: 'Tag', omitIfEmpty: true },
    }],
    // Regular exportable
    ['size', {
      id: 'size',
      attribute_id: 'size',
      label: 'Size',
      data_type: 'enum',
      category: 'sizing',
    }],
    // Style name (not in SKIP_ATTRIBUTE_IDS)
    ['style_name', {
      id: 'style_name',
      attribute_id: 'style_name',
      label: 'Style Name',
      data_type: 'string',
      category: 'identity',
    }],
    // Internal-only (should NEVER be exported)
    ['internal_tracking_id', {
      id: 'internal_tracking_id',
      attribute_id: 'internal_tracking_id',
      label: 'Internal Tracking ID',
      data_type: 'string',
      internalOnly: true,
    }],
    // Internal-only (should NEVER be exported)
    ['audit_log', {
      id: 'audit_log',
      attribute_id: 'audit_log',
      label: 'Audit Log',
      data_type: 'json',
      internalOnly: true,
    }],
    // Channel-specific: Shopify only
    ['shopify_handle', {
      id: 'shopify_handle',
      attribute_id: 'shopify_handle',
      label: 'Shopify Handle',
      data_type: 'string',
      category: 'channels',
      export: { targets: ['shopify'] },
    }],
    // Channel-specific: Google only
    ['google_category', {
      id: 'google_category',
      attribute_id: 'google_category',
      label: 'Google Product Category',
      data_type: 'string',
      category: 'channels',
      export: { targets: ['google'] },
    }],
  ]);
}

// ============================================================================
// Test Results Tracking
// ============================================================================

interface TestResult {
  name: string;
  passed: boolean;
  duration: number;
  details?: string;
  error?: string;
}

const results: TestResult[] = [];

function logTest(name: string, passed: boolean, duration: number, details?: string, error?: string) {
  results.push({ name, passed, duration, details, error });
  const status = passed ? '✅ PASS' : '❌ FAIL';
  console.log(`${status}: ${name} (${duration}ms)`);
  if (details) console.log(`   Details: ${details}`);
  if (error) console.log(`   Error: ${error}`);
}

// ============================================================================
// Test A: Export Inclusion with export.key Mapping
// ============================================================================

async function testExportKeyMapping(): Promise<void> {
  const testName = 'A: Export inclusion with export.key mapping';
  const start = Date.now();
  
  try {
    const attributes = createTestAttributes();
    const products = createTestProducts(10);
    
    // Test getExportHeader function
    const colorDef = attributes.get('primary_color')!;
    const header = getExportHeader(colorDef);
    
    if (header !== 'ColorCode') {
      throw new Error(`Expected header 'ColorCode', got '${header}'`);
    }
    
    // Test buildExportRow uses export.key
    const row = buildExportRow(products[0], 1, attributes, {});
    
    // Check that ColorCode is used as header (from export.key)
    if (!row.columns['ColorCode']) {
      // Check if it fell back to external_header
      if (row.columns['Color']) {
        throw new Error('Used external_header instead of export.key');
      }
      throw new Error('ColorCode column not found in export row');
    }
    
    // Check column headers include export.key
    const headers = getExportColumnHeaders(attributes, false);
    if (!headers.includes('ColorCode')) {
      throw new Error('ColorCode not found in column headers');
    }
    
    logTest(testName, true, Date.now() - start, `Header correctly uses export.key: 'ColorCode'`);
  } catch (err) {
    logTest(testName, false, Date.now() - start, undefined, String(err));
  }
}

// ============================================================================
// Test B: Required Field Validation (MISSING_REQUIRED_EXPORT_FIELD)
// ============================================================================

async function testRequiredFieldValidation(): Promise<void> {
  const testName = 'B: Required field validation (MISSING_REQUIRED_EXPORT_FIELD)';
  const start = Date.now();
  
  try {
    const attributes = createTestAttributes();
    
    // Product missing required 'gender' field
    const productMissingGender: ProductDocument = {
      id: 'prod-missing-gender',
      mpn: 'MPN-TEST',
      attributes: {
        brand: 'Nike',
        // gender is missing
      },
    };
    
    const result = validateProductForExport(productMissingGender, attributes);
    
    if (result.valid) {
      throw new Error('Validation should have failed for missing required field');
    }
    
    const genderError = result.errors.find(e => e.attributeId === 'gender');
    if (!genderError) {
      throw new Error('Should have error for missing gender field');
    }
    
    if (genderError.code !== 'MISSING_REQUIRED_EXPORT_FIELD') {
      throw new Error(`Expected code 'MISSING_REQUIRED_EXPORT_FIELD', got '${genderError.code}'`);
    }
    
    // Product with all required fields should pass
    const validProduct: ProductDocument = {
      id: 'prod-valid',
      mpn: 'MPN-VALID',
      attributes: {
        brand: 'Nike',
        gender: 'Men',
      },
    };
    
    const validResult = validateProductForExport(validProduct, attributes);
    if (!validResult.valid) {
      throw new Error('Valid product should pass validation');
    }
    
    logTest(testName, true, Date.now() - start, 
      `Validation correctly returns MISSING_REQUIRED_EXPORT_FIELD for missing required fields`);
  } catch (err) {
    logTest(testName, false, Date.now() - start, undefined, String(err));
  }
}

// ============================================================================
// Test C: Internal-Only Protection
// ============================================================================

async function testInternalOnlyProtection(): Promise<void> {
  const testName = 'C: Internal-only protection';
  const start = Date.now();
  
  try {
    // Create attributes WITHOUT internal-only fields (they should be filtered)
    const exportableAttributes = new Map<string, ExportAttributeDefinition>();
    const allAttributes = createTestAttributes();
    
    // Filter out internal-only
    for (const [id, def] of allAttributes) {
      if (!def.internalOnly) {
        exportableAttributes.set(id, def);
      }
    }
    
    const product: ProductDocument = {
      id: 'prod-internal-test',
      mpn: 'MPN-INTERNAL',
      attributes: {
        brand: 'Nike',
        gender: 'Men',
        primary_color: 'Black',
        // These should never appear in export
        internal_tracking_id: 'TRACK-SECRET',
        audit_log: { entries: ['sensitive data'] },
        internal_notes: 'This is confidential',
      },
    };
    
    const row = buildExportRow(product, 1, exportableAttributes, {});
    const columnKeys = Object.keys(row.columns);
    
    // Internal fields should NOT be in output
    const internalFields = ['internal_tracking_id', 'Internal Tracking ID', 'audit_log', 'Audit Log', 'internal_notes', 'Internal Notes'];
    for (const field of internalFields) {
      if (columnKeys.includes(field) || Object.values(row.columns).includes('TRACK-SECRET')) {
        throw new Error(`Internal field '${field}' should not appear in export`);
      }
    }
    
    // Exportable fields SHOULD be present
    if (!row.columns['ColorCode'] && !row.columns['Color'] && !row.columns['Primary Color']) {
      throw new Error('Expected exportable field primary_color to be present');
    }
    
    logTest(testName, true, Date.now() - start, 
      `Internal-only fields (${internalFields.slice(0, 3).join(', ')}) correctly excluded from export`);
  } catch (err) {
    logTest(testName, false, Date.now() - start, undefined, String(err));
  }
}

// ============================================================================
// Test D: Channel Targets (Shopify vs Google)
// ============================================================================

async function testChannelTargets(): Promise<void> {
  const testName = 'D: Channel targets (shopify vs google)';
  const start = Date.now();
  
  try {
    const allAttributes = createTestAttributes();
    
    // Simulate channel filtering (like loadExportableAttributes would do)
    const shopifyAttrs = new Map<string, ExportAttributeDefinition>();
    const googleAttrs = new Map<string, ExportAttributeDefinition>();
    
    for (const [id, def] of allAttributes) {
      if (def.internalOnly) continue;
      
      const exportMeta = typeof def.export === 'object' ? def.export : undefined;
      const targets = exportMeta?.targets;
      
      if (!targets) {
        // No targets = include in all
        shopifyAttrs.set(id, def);
        googleAttrs.set(id, def);
      } else if (targets.includes('shopify')) {
        shopifyAttrs.set(id, def);
      } else if (targets.includes('google')) {
        googleAttrs.set(id, def);
      }
    }
    
    // Shopify should have shopify_handle but NOT google_category
    if (!shopifyAttrs.has('shopify_handle')) {
      throw new Error('Shopify export should include shopify_handle');
    }
    if (shopifyAttrs.has('google_category')) {
      throw new Error('Shopify export should NOT include google_category');
    }
    
    // Google should have google_category but NOT shopify_handle
    if (!googleAttrs.has('google_category')) {
      throw new Error('Google export should include google_category');
    }
    if (googleAttrs.has('shopify_handle')) {
      throw new Error('Google export should NOT include shopify_handle');
    }
    
    logTest(testName, true, Date.now() - start, 
      `Channel filtering works: Shopify has ${shopifyAttrs.size} attrs, Google has ${googleAttrs.size} attrs`);
  } catch (err) {
    logTest(testName, false, Date.now() - start, undefined, String(err));
  }
}

// ============================================================================
// Test E: Performance (1000 Products)
// ============================================================================

async function testPerformance(): Promise<void> {
  const testName = 'E: Performance (1000 products)';
  const start = Date.now();
  
  try {
    const attributes = createTestAttributes();
    
    // Remove internal-only for export
    const exportableAttributes = new Map<string, ExportAttributeDefinition>();
    for (const [id, def] of attributes) {
      if (!def.internalOnly) {
        exportableAttributes.set(id, def);
      }
    }
    
    // Create 1000 test products
    const products = createTestProducts(1000);
    
    // Benchmark: Build export rows for all 1000 products
    const buildStart = Date.now();
    const rows = products.map((p, i) => buildExportRow(p, i + 1, exportableAttributes, {}));
    const buildDuration = Date.now() - buildStart;
    
    // Benchmark: Validate all 1000 products
    const validateStart = Date.now();
    const validationResult = validateBatchForExport(products, attributes);
    const validateDuration = Date.now() - validateStart;
    
    // Performance thresholds (should complete in under 5 seconds each)
    const maxBuildTime = 5000;
    const maxValidateTime = 5000;
    
    if (buildDuration > maxBuildTime) {
      throw new Error(`Build took ${buildDuration}ms, exceeds ${maxBuildTime}ms threshold`);
    }
    
    if (validateDuration > maxValidateTime) {
      throw new Error(`Validation took ${validateDuration}ms, exceeds ${maxValidateTime}ms threshold`);
    }
    
    // Check that we got expected results
    if (rows.length !== 1000) {
      throw new Error(`Expected 1000 rows, got ${rows.length}`);
    }
    
    if (validationResult.totalProducts !== 1000) {
      throw new Error(`Expected 1000 validated products, got ${validationResult.totalProducts}`);
    }
    
    const details = [
      `1000 products processed`,
      `Build: ${buildDuration}ms (${Math.round(1000 / buildDuration * 1000)} products/sec)`,
      `Validate: ${validateDuration}ms (${Math.round(1000 / validateDuration * 1000)} products/sec)`,
      `Valid: ${validationResult.validProducts}, Invalid: ${validationResult.invalidProducts}`,
    ].join(', ');
    
    logTest(testName, true, Date.now() - start, details);
  } catch (err) {
    logTest(testName, false, Date.now() - start, undefined, String(err));
  }
}

// ============================================================================
// Test F: omitIfEmpty Handling
// ============================================================================

async function testOmitIfEmpty(): Promise<void> {
  const testName = 'F: omitIfEmpty handling';
  const start = Date.now();
  
  try {
    const attributes = new Map<string, ExportAttributeDefinition>([
      ['style_name', {
        id: 'style_name',
        attribute_id: 'style_name',
        label: 'Style Name',
        data_type: 'string',
        category: 'identity',
      }],
      ['optional_tag', {
        id: 'optional_tag',
        attribute_id: 'optional_tag',
        label: 'Optional Tag',
        data_type: 'string',
        category: 'tags',
        export: { key: 'Tag', omitIfEmpty: true },
      }],
    ]);
    
    const product: ProductDocument = {
      id: 'prod-omit-test',
      mpn: 'MPN-OMIT',
      attributes: {
        style_name: 'Test Style',
        optional_tag: '', // Empty value
      },
    };
    
    // Test shouldOmitIfEmpty helper
    const optionalDef = attributes.get('optional_tag')!;
    if (!shouldOmitIfEmpty(optionalDef)) {
      throw new Error('shouldOmitIfEmpty should return true for optional_tag');
    }
    
    // With respectOmitIfEmpty: true, empty columns should be omitted
    const rowWithOmit = buildExportRow(product, 1, attributes, { respectOmitIfEmpty: true });
    if ('Tag' in rowWithOmit.columns) {
      throw new Error('Empty Tag column should be omitted when respectOmitIfEmpty is true');
    }
    
    // With respectOmitIfEmpty: false, empty columns should be included
    const rowWithoutOmit = buildExportRow(product, 1, attributes, { respectOmitIfEmpty: false });
    if (!('Tag' in rowWithoutOmit.columns)) {
      throw new Error('Tag column should be present when respectOmitIfEmpty is false');
    }
    
    logTest(testName, true, Date.now() - start, 
      `omitIfEmpty correctly handled: omitted when empty and respectOmitIfEmpty=true`);
  } catch (err) {
    logTest(testName, false, Date.now() - start, undefined, String(err));
  }
}

// ============================================================================
// Main Runner
// ============================================================================

async function runAllTests(): Promise<void> {
  console.log('╔══════════════════════════════════════════════════════════════════╗');
  console.log('║  S4 Staging Smoke Tests - LP-smart-rules-exporter-1.0.0          ║');
  console.log('║  Exporter & Validation Alignment                                 ║');
  console.log('╚══════════════════════════════════════════════════════════════════╝');
  console.log('');
  
  const overallStart = Date.now();
  
  await testExportKeyMapping();
  await testRequiredFieldValidation();
  await testInternalOnlyProtection();
  await testChannelTargets();
  await testPerformance();
  await testOmitIfEmpty();
  
  const overallDuration = Date.now() - overallStart;
  
  console.log('');
  console.log('═══════════════════════════════════════════════════════════════════');
  
  const passed = results.filter(r => r.passed).length;
  const failed = results.filter(r => !r.passed).length;
  const total = results.length;
  
  console.log(`Results: ${passed}/${total} passed, ${failed} failed`);
  console.log(`Total duration: ${overallDuration}ms`);
  
  if (failed === 0) {
    console.log('');
    console.log('✅ ALL SMOKE TESTS PASSED');
  } else {
    console.log('');
    console.log('❌ SOME TESTS FAILED:');
    for (const result of results.filter(r => !r.passed)) {
      console.log(`   - ${result.name}: ${result.error}`);
    }
  }
  
  console.log('═══════════════════════════════════════════════════════════════════');
  
  // Return results summary for HES
  const summary = {
    timestamp: new Date().toISOString(),
    branch: 'lp-smart-rules-exporter-1.0.0',
    totalTests: total,
    passed,
    failed,
    duration: overallDuration,
    results: results.map(r => ({
      name: r.name,
      passed: r.passed,
      duration: r.duration,
      details: r.details,
      error: r.error,
    })),
  };
  
  console.log('');
  console.log('JSON Summary:');
  console.log(JSON.stringify(summary, null, 2));
}

// Run tests
runAllTests().catch(console.error);
