#!/usr/bin/env node
/**
 * LP-2.1.0: Import Dry-Run CLI
 * 
 * Validates CSV import files using MPN-first normalization rules
 * without persisting to Firestore.
 * 
 * Usage:
 *   node import-dry-run.js <csv-path> [--format json|csv] [--output <path>]
 * 
 * Examples:
 *   node import-dry-run.js sample.csv --format json
 *   node import-dry-run.js sample.csv --format csv --output normalized.csv
 */

import { createReadStream, writeFileSync } from 'fs';
import { parse } from 'csv-parse';
import { dirname, resolve } from 'path';
import { fileURLToPath } from 'url';

// Import SDK functions (transpiled)
const __dirname = dirname(fileURLToPath(import.meta.url));

// We need to dynamically import the transpiled SDK
let normalizeImportRow, deriveProductId, validateRequiredFields, DEFAULT_COLUMN_MAPPINGS;

async function loadSDK() {
  try {
    const sdk = await import('../dist/index.js');
    normalizeImportRow = sdk.normalizeImportRow;
    deriveProductId = sdk.deriveProductId;
    validateRequiredFields = sdk.validateRequiredFields;
    DEFAULT_COLUMN_MAPPINGS = sdk.DEFAULT_COLUMN_MAPPINGS;
  } catch (err) {
    console.error('Error loading SDK. Ensure the SDK is built (npm run build):', err.message);
    process.exit(1);
  }
}

/**
 * Parse CSV file into rows
 */
async function parseCSV(csvPath) {
  return new Promise((resolve, reject) => {
    const rows = [];
    const parser = createReadStream(csvPath).pipe(
      parse({
        columns: true,
        skip_empty_lines: true,
        trim: true,
      })
    );

    parser.on('data', (row) => rows.push(row));
    parser.on('error', reject);
    parser.on('end', () => resolve(rows));
  });
}

/**
 * Process a single row and return normalized result with validation
 */
function processRow(row, lineNumber) {
  const normalized = normalizeImportRow(row, DEFAULT_COLUMN_MAPPINGS);
  const missingFields = validateRequiredFields(normalized, DEFAULT_COLUMN_MAPPINGS);
  const productId = deriveProductId({ mpn: normalized.mpn, sku: normalized.sku });

  return {
    lineNumber,
    source: row,
    normalized,
    productId,
    validation: {
      isValid: missingFields.length === 0,
      missingRequired: missingFields,
      hasMpn: !!normalized.mpn,
      hasSku: !!normalized.sku,
      productIdSource: normalized.mpn ? 'mpn' : (normalized.sku ? 'sku' : 'none'),
    },
  };
}

/**
 * Format results as JSON
 */
function formatJSON(results, summary) {
  return JSON.stringify({
    summary,
    rows: results,
  }, null, 2);
}

/**
 * Format results as CSV
 */
function formatCSV(results) {
  if (results.length === 0) return '';

  // Get all normalized field keys from first result
  const normalizedKeys = Object.keys(results[0].normalized);
  const headers = [
    'lineNumber',
    'isValid',
    'missingRequired',
    'productId',
    'productIdSource',
    ...normalizedKeys,
  ];

  const csvRows = [headers.join(',')];

  for (const result of results) {
    const row = [
      result.lineNumber,
      result.validation.isValid,
      result.validation.missingRequired.join(';'),
      result.productId || '',
      result.validation.productIdSource,
      ...normalizedKeys.map(key => {
        const val = result.normalized[key];
        if (val === undefined || val === null) return '';
        if (Array.isArray(val)) return `"${val.join(';')}"`;
        if (typeof val === 'string' && (val.includes(',') || val.includes('"'))) {
          return `"${val.replace(/"/g, '""')}"`;
        }
        return val;
      }),
    ];
    csvRows.push(row.join(','));
  }

  return csvRows.join('\n');
}

/**
 * Main entry point
 */
async function main() {
  const args = process.argv.slice(2);
  
  if (args.length === 0 || args.includes('--help') || args.includes('-h')) {
    console.log(`
LP-2.1.0: Import Dry-Run CLI

Usage:
  node import-dry-run.js <csv-path> [options]

Options:
  --format <json|csv>  Output format (default: json)
  --output <path>      Write output to file instead of stdout
  --help, -h           Show this help message

Examples:
  node import-dry-run.js sample.csv
  node import-dry-run.js sample.csv --format csv --output normalized.csv
`);
    process.exit(0);
  }

  const csvPath = args[0];
  const formatIdx = args.indexOf('--format');
  const outputIdx = args.indexOf('--output');
  
  const format = formatIdx >= 0 ? args[formatIdx + 1] : 'json';
  const outputPath = outputIdx >= 0 ? args[outputIdx + 1] : null;

  if (!['json', 'csv'].includes(format)) {
    console.error(`Invalid format: ${format}. Use 'json' or 'csv'.`);
    process.exit(1);
  }

  // Load SDK
  await loadSDK();

  console.error(`\n📂 Processing: ${csvPath}`);
  console.error(`📋 Format: ${format}`);
  console.error(`📊 Using MPN-first normalization (LP-2.1.0)\n`);

  // Parse CSV
  let rows;
  try {
    rows = await parseCSV(csvPath);
  } catch (err) {
    console.error(`Error reading CSV: ${err.message}`);
    process.exit(1);
  }

  console.error(`📝 Found ${rows.length} rows\n`);

  // Process each row
  const results = [];
  let validCount = 0;
  let invalidCount = 0;
  let mpnOnlyCount = 0;
  let skuOnlyCount = 0;
  let bothCount = 0;
  let neitherCount = 0;

  for (let i = 0; i < rows.length; i++) {
    const lineNumber = i + 2; // +2: line 1 is header, array is 0-indexed
    const result = processRow(rows[i], lineNumber);
    results.push(result);

    if (result.validation.isValid) {
      validCount++;
    } else {
      invalidCount++;
    }

    const hasMpn = result.validation.hasMpn;
    const hasSku = result.validation.hasSku;
    if (hasMpn && hasSku) bothCount++;
    else if (hasMpn) mpnOnlyCount++;
    else if (hasSku) skuOnlyCount++;
    else neitherCount++;
  }

  // Build summary
  const summary = {
    totalRows: rows.length,
    validRows: validCount,
    invalidRows: invalidCount,
    mpnOnly: mpnOnlyCount,
    skuOnly: skuOnlyCount,
    bothMpnAndSku: bothCount,
    neitherMpnNorSku: neitherCount,
    missingMpnCount: invalidCount, // Since mpn is required
  };

  // Format output
  let output;
  if (format === 'json') {
    output = formatJSON(results, summary);
  } else {
    output = formatCSV(results);
  }

  // Write output
  if (outputPath) {
    writeFileSync(outputPath, output);
    console.error(`✅ Output written to: ${outputPath}`);
  } else {
    console.log(output);
  }

  // Print summary to stderr
  console.error(`\n${'='.repeat(50)}`);
  console.error(`📊 SUMMARY`);
  console.error(`${'='.repeat(50)}`);
  console.error(`Total rows:         ${summary.totalRows}`);
  console.error(`Valid rows:         ${summary.validRows}`);
  console.error(`Invalid rows:       ${summary.invalidRows}`);
  console.error(`${'─'.repeat(50)}`);
  console.error(`MPN only:           ${summary.mpnOnly}`);
  console.error(`SKU only:           ${summary.skuOnly}`);
  console.error(`Both MPN & SKU:     ${summary.bothMpnAndSku}`);
  console.error(`Neither:            ${summary.neitherMpnNorSku}`);
  console.error(`${'='.repeat(50)}`);

  // Exit with error if there are invalid rows
  if (invalidCount > 0) {
    console.error(`\n⚠️  ${invalidCount} row(s) have validation errors (missing required fields)`);
  } else {
    console.error(`\n✅ All rows passed validation`);
  }
}

main().catch(err => {
  console.error('Fatal error:', err);
  process.exit(1);
});
