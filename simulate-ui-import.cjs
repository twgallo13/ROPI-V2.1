#!/usr/bin/env node
/**
 * Simulate UI Import Flow for Diagnostic Purposes
 * This script mimics what the UI does when importing a CSV file
 * to help diagnose discrepancies between headless CLI and browser imports
 */

const fs = require('fs');
const path = require('path');
const { parse } = require('csv-parse/sync');

console.log('=== UI IMPORT SIMULATION ===\n');

// Read the CSV file
const csvPath = path.resolve('test-import.csv');
if (!fs.existsSync(csvPath)) {
  console.error('❌ CSV file not found:', csvPath);
  process.exit(1);
}

const csvContent = fs.readFileSync(csvPath, 'utf-8');
console.log('📄 CSV File:', csvPath);
console.log('📏 File size:', csvContent.length, 'bytes\n');

// Parse CSV (same as UI csvParser)
const records = parse(csvContent, { 
  columns: true, 
  skip_empty_lines: true,
  relax_column_count: true,
  bom: true
});

console.log('=== CSV PARSING ===');
console.log('✓ Rows parsed:', records.length);
console.log('✓ Headers found:', Object.keys(records[0]).length);
console.log('\n📋 Headers:');
Object.keys(records[0]).forEach((header, idx) => {
  console.log(`  ${idx + 1}. "${header}"`);
});

// Show first row data
console.log('\n📊 First Row Data:');
const firstRow = records[0];
Object.entries(firstRow).forEach(([key, value]) => {
  console.log(`  ${key}: "${value}"`);
});

// Simulate header normalization (UI csvParser normalizeHeader)
function normalizeHeader(s) {
  return s
    .toLowerCase()
    .trim()
    .replace(/\./g, '_')
    .replace(/[^\w]+/g, '_')
    .replace(/_+/g, '_')
    .replace(/^_|_$/g, '');
}

console.log('\n=== HEADER NORMALIZATION (UI Logic) ===');
Object.keys(firstRow).forEach(header => {
  const normalized = normalizeHeader(header);
  console.log(`  "${header}" → "${normalized}"`);
});

// Simulate validation mode (what UI would send)
const validationMode = 'minimal'; // User selected Minimal mode
console.log('\n=== VALIDATION MODE ===');
console.log(`✓ Selected mode: ${validationMode}`);

// Check critical fields for minimal mode
console.log('\n=== MINIMAL MODE VALIDATION CHECK ===');
const mpnValue = firstRow['MPN'] || firstRow['mpn'];
const skuValue = firstRow['SKU'] || firstRow['sku'];
const brandValue = firstRow['Brand'] || firstRow['brand'];
const nameValue = firstRow['Name'] || firstRow['name'];

console.log('Critical fields (case-sensitive check):');
console.log(`  MPN (raw header "MPN"): "${mpnValue || 'NOT FOUND'}"`);
console.log(`  SKU (raw header "SKU"): "${skuValue || 'NOT FOUND'}"`);
console.log(`  Brand (raw header "Brand"): "${brandValue || 'NOT FOUND'}"`);
console.log(`  Name (raw header "Name"): "${nameValue || 'NOT FOUND'}"`);

// Simulate what would be sent to importToFirestore
console.log('\n=== SIMULATED UI REQUEST PAYLOAD ===');
const simulatedPayload = {
  validationMode: validationMode,
  rows: records.length,
  firstRowSample: {
    mpn: mpnValue,
    sku: skuValue,
    brand: brandValue,
    name: nameValue,
    rawHeaders: Object.keys(firstRow),
    normalizedHeaders: Object.keys(firstRow).map(normalizeHeader)
  }
};

console.log(JSON.stringify(simulatedPayload, null, 2));

// Save simulation output
const outputPath = 'operations/review-artifacts/attribute-registry/ui-simulation-output.json';
fs.writeFileSync(outputPath, JSON.stringify({
  timestamp: new Date().toISOString(),
  csvPath: csvPath,
  parseResult: {
    rowCount: records.length,
    headerCount: Object.keys(firstRow).length,
    headers: Object.keys(firstRow),
    normalizedHeaders: Object.keys(firstRow).map(normalizeHeader),
    firstRow: firstRow
  },
  validationMode: validationMode,
  minimalModeCheck: {
    mpnPresent: !!mpnValue,
    mpnValue: mpnValue,
    skuPresent: !!skuValue,
    skuValue: skuValue,
    shouldPass: !!(mpnValue || skuValue)
  }
}, null, 2));

console.log(`\n✓ Simulation output saved to: ${outputPath}`);

// Expected behavior
console.log('\n=== EXPECTED BEHAVIOR ===');
if (mpnValue || skuValue) {
  console.log('✅ SHOULD PASS: MPN or SKU present, minimal mode should succeed');
} else {
  console.log('❌ SHOULD FAIL: Neither MPN nor SKU present, minimal mode should reject');
}

console.log('\n=== UI vs HEADLESS COMPARISON ===');
console.log('If UI fails but headless succeeds, check:');
console.log('  1. Is validationMode actually being sent as "minimal"?');
console.log('  2. Are headers being normalized before mapping?');
console.log('  3. Is the UI using title-case headers without normalization?');
console.log('  4. Does the UI need to rebuild/redeploy with v2.4.1 normalizeHeader fix?');
