#!/usr/bin/env node
/**
 * LP-importer-mapping-recon-1.3.0: CI Dry-Run Script
 * 
 * Deterministic wrapper around import-dry-run.js for CI artifact generation.
 * Produces JSON output suitable for validation scripts.
 * 
 * Usage: node ci-dryrun.js --csv path/to.csv --out path/to.json
 */

import { createReadStream, writeFileSync, mkdirSync } from 'fs';
import { parse } from 'csv-parse';
import { dirname, resolve } from 'path';
import { fileURLToPath } from 'url';
import minimist from 'minimist';

const __dirname = dirname(fileURLToPath(import.meta.url));

// SDK functions
let normalizeImportRow, deriveProductId, validateRequiredFields, DEFAULT_COLUMN_MAPPINGS;

async function loadSDK() {
  try {
    const sdk = await import('../dist/index.js');
    normalizeImportRow = sdk.normalizeImportRow;
    deriveProductId = sdk.deriveProductId;
    validateRequiredFields = sdk.validateRequiredFields;
    DEFAULT_COLUMN_MAPPINGS = sdk.DEFAULT_COLUMN_MAPPINGS;
  } catch (err) {
    console.error('Error loading SDK. Ensure the SDK is built (pnpm build):', err.message);
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

  // Check for attribute-related issues
  const issues = [];
  
  // Check for missing required fields
  if (missingFields.length > 0) {
    issues.push({
      code: 'MISSING_REQUIRED_FIELD',
      message: `Missing required fields: ${missingFields.join(', ')}`,
      fields: missingFields,
    });
  }

  // Check for unmapped fields in source that don't have a target
  const mappedTargets = DEFAULT_COLUMN_MAPPINGS.map(m => m.targetField);
  const normalizedKeys = Object.keys(normalized);
  
  // Verify all normalized keys exist in mapping targets
  for (const key of normalizedKeys) {
    if (!mappedTargets.includes(key) && normalized[key] !== undefined && normalized[key] !== '') {
      issues.push({
        code: 'UNMAPPED_FIELD',
        message: `Field '${key}' is not in attribute registry`,
        field: key,
      });
    }
  }

  return {
    lineNumber,
    source: row,
    normalized,
    productId,
    issues,
    validation: {
      isValid: issues.length === 0,
      missingRequired: missingFields,
      hasMpn: !!normalized.mpn,
      hasSku: !!normalized.sku,
      productIdSource: normalized.mpn ? 'mpn' : (normalized.sku ? 'sku' : 'none'),
    },
  };
}

/**
 * Main entry point
 */
async function main() {
  const argv = minimist(process.argv.slice(2));
  
  const csv = argv.csv;
  const out = argv.out;
  
  if (!csv || !out) {
    console.error('Usage: node ci-dryrun.js --csv <path> --out <path>');
    console.error('');
    console.error('Options:');
    console.error('  --csv <path>   Input CSV file path');
    console.error('  --out <path>   Output JSON file path');
    process.exit(2);
  }

  // Load SDK
  await loadSDK();

  console.error(`📂 CI Dry-Run: ${csv}`);

  // Parse CSV
  let rows;
  try {
    rows = await parseCSV(csv);
  } catch (err) {
    console.error(`Error reading CSV: ${err.message}`);
    process.exit(1);
  }

  console.error(`📝 Found ${rows.length} rows`);

  // Process each row
  const results = [];
  let validCount = 0;
  let invalidCount = 0;
  let issueCount = 0;

  for (let i = 0; i < rows.length; i++) {
    const lineNumber = i + 2; // +2: line 1 is header, array is 0-indexed
    const result = processRow(rows[i], lineNumber);
    results.push(result);

    if (result.validation.isValid) {
      validCount++;
    } else {
      invalidCount++;
    }
    
    issueCount += result.issues.length;
  }

  // Build report
  const report = {
    timestamp: new Date().toISOString(),
    source: csv,
    summary: {
      totalRows: rows.length,
      validRows: validCount,
      invalidRows: invalidCount,
      totalIssues: issueCount,
    },
    rows: results,
    // Aggregate errors for quick validation check
    errors: results
      .filter(r => r.issues.length > 0)
      .flatMap(r => r.issues.map(i => ({
        lineNumber: r.lineNumber,
        ...i,
      }))),
  };

  // Write output
  try {
    mkdirSync(dirname(out), { recursive: true });
    writeFileSync(out, JSON.stringify(report, null, 2));
    console.error(`✅ Dryrun written to: ${out}`);
  } catch (err) {
    console.error(`Error writing output: ${err.message}`);
    process.exit(1);
  }

  // Print summary
  console.error(`\n📊 SUMMARY`);
  console.error(`   Total rows: ${report.summary.totalRows}`);
  console.error(`   Valid: ${report.summary.validRows}`);
  console.error(`   Invalid: ${report.summary.invalidRows}`);
  console.error(`   Issues: ${report.summary.totalIssues}`);

  // Exit with error if there are issues (but don't fail CI for missing required fields
  // which is a data quality issue, not an attribute mapping issue)
  const attributeErrors = report.errors.filter(e => 
    e.code === 'ATTRIBUTE_NOT_FOUND' || 
    e.code === 'UNMAPPED_FIELD' ||
    e.code === 'ATTRIBUTE_MISSING'
  );
  
  if (attributeErrors.length > 0) {
    console.error(`\n⚠️  ${attributeErrors.length} attribute mapping errors found`);
    process.exit(1);
  }

  console.error(`\n✅ No attribute mapping errors`);
}

main().catch(err => {
  console.error('Fatal error:', err);
  process.exit(1);
});
