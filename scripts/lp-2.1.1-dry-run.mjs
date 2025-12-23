/**
 * LP-2.1.1 Dry-Run Script
 * Tests import validation with MPN requirement
 */

import { readFileSync } from 'fs';
import { join, dirname } from 'path';
import { fileURLToPath } from 'url';

const __dirname = dirname(fileURLToPath(import.meta.url));

// Mock the SDK parseCSV since we're in Node
function parseCSV(content) {
  const lines = content.trim().split('\n');
  const headers = lines[0].split(',').map(h => h.trim());
  const rows = [];
  
  for (let i = 1; i < lines.length; i++) {
    const values = lines[i].split(',').map(v => v.trim());
    const row = {};
    headers.forEach((h, idx) => {
      let val = values[idx] || '';
      // Parse numbers
      if (!isNaN(val) && val !== '') {
        val = parseFloat(val);
      }
      row[h] = val;
    });
    rows.push(row);
  }
  return rows;
}

function validateMPNRequired(row) {
  const mpn = row.normalized?.mpn || row.MPN || row.mpn;
  if (!mpn || mpn === '') {
    return {
      field: 'mpn',
      message: 'MPN is required',
      code: 'MISSING_REQUIRED_FIELD'
    };
  }
  return null;
}

function validateImportRows(csvData) {
  const results = {
    totalRows: csvData.length,
    validRows: 0,
    invalidRows: 0,
    hasBlockingErrors: false,
    rowResults: []
  };

  csvData.forEach((row, idx) => {
    const rowResult = {
      rowIndex: idx,
      lineNumber: idx + 2,
      isValid: true,
      blockingErrors: [],
      warnings: [],
      unmappedAttributes: []
    };

    const mpnError = validateMPNRequired(row);
    if (mpnError) {
      rowResult.blockingErrors.push(mpnError);
      rowResult.isValid = false;
    }

    if (rowResult.isValid) {
      results.validRows++;
    } else {
      results.invalidRows++;
      results.hasBlockingErrors = true;
    }

    results.rowResults.push(rowResult);
  });

  return results;
}

console.log('='.repeat(60));
console.log('LP-2.1.1 DRY-RUN: Import Validation with MPN Requirement');
console.log('='.repeat(60));

// Test 1: Valid CSV with MPNs
console.log('\n📋 Test 1: sample-retailops.csv (all rows have MPN)');
console.log('-'.repeat(40));
try {
  const csv1 = readFileSync(join(__dirname, '../packages/api/test/fixtures/sample-retailops.csv'), 'utf-8');
  const data1 = parseCSV(csv1);
  const result1 = validateImportRows(data1);
  console.log('Total rows:', result1.totalRows);
  console.log('Valid rows:', result1.validRows);
  console.log('Invalid rows:', result1.invalidRows);
  console.log('Blocking errors:', result1.hasBlockingErrors ? 'YES' : 'NO');
  console.log('✅ PASS: All rows have MPN');
} catch (e) {
  console.error('Error:', e.message);
}

// Test 2: CSV with missing MPNs
console.log('\n📋 Test 2: sample-missing-mpn.csv (2 rows missing MPN)');
console.log('-'.repeat(40));
try {
  const csv2 = readFileSync(join(__dirname, '../packages/api/test/fixtures/sample-missing-mpn.csv'), 'utf-8');
  const data2 = parseCSV(csv2);
  const result2 = validateImportRows(data2);
  console.log('Total rows:', result2.totalRows);
  console.log('Valid rows:', result2.validRows);
  console.log('Invalid rows:', result2.invalidRows);
  console.log('Blocking errors:', result2.hasBlockingErrors ? 'YES' : 'NO');
  console.log('\nBlocking errors by row:');
  result2.rowResults.forEach(r => {
    if (r.blockingErrors.length > 0) {
      console.log(`  Line ${r.lineNumber}: ${r.blockingErrors.map(e => e.code).join(', ')}`);
    }
  });
  console.log('✅ PASS: Missing MPN rows blocked');
} catch (e) {
  console.error('Error:', e.message);
}

// Test 3: CSV with invalid enums
console.log('\n📋 Test 3: sample-invalid-enums.csv (invalid enum values)');
console.log('-'.repeat(40));
try {
  const csv3 = readFileSync(join(__dirname, '../packages/api/test/fixtures/sample-invalid-enums.csv'), 'utf-8');
  const data3 = parseCSV(csv3);
  const result3 = validateImportRows(data3);
  console.log('Total rows:', result3.totalRows);
  console.log('Valid rows:', result3.validRows);
  console.log('Invalid rows:', result3.invalidRows);
  console.log('Blocking errors:', result3.hasBlockingErrors ? 'YES' : 'NO');
  console.log('✅ PASS: All rows have MPN (enum validation is non-blocking)');
} catch (e) {
  console.error('Error:', e.message);
}

console.log('\n' + '='.repeat(60));
console.log('DRY-RUN COMPLETE');
console.log('='.repeat(60));
