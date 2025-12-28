#!/usr/bin/env node
/**
 * LP-importer-mapping-recon-1.3.0: Validate Dry-Run Report
 * 
 * Inspects dry-run JSON output and fails if any attribute-not-found
 * or unmapped field warnings exist.
 * 
 * Usage: node validate-dryrun-report.js <file.json>
 * 
 * Exit codes:
 *   0 - Report is valid (no attribute mapping errors)
 *   1 - Report contains attribute mapping errors
 *   2 - Usage error or file not found
 */

const fs = require('fs');
const path = require('path');

// Get file path from args
const args = process.argv.slice(2);
const file = args[0];

if (!file) {
  console.error('Usage: node validate-dryrun-report.js <file.json>');
  console.error('');
  console.error('Validates a dry-run report JSON file for attribute mapping errors.');
  console.error('Returns exit code 0 if no errors, 1 if errors found.');
  process.exit(2);
}

// Read and parse file
let data;
try {
  const content = fs.readFileSync(file, 'utf8');
  data = JSON.parse(content);
} catch (err) {
  console.error(`Error reading file '${file}': ${err.message}`);
  process.exit(2);
}

console.log(`\n🔍 Validating: ${file}`);
console.log(`   Source: ${data.source || 'unknown'}`);
console.log(`   Timestamp: ${data.timestamp || 'unknown'}`);

/**
 * Check if the report contains attribute-related errors
 * 
 * Error codes we check for:
 * - ATTRIBUTE_NOT_FOUND: Attribute ID doesn't exist in registry
 * - ATTRIBUTE_MISSING: Similar to not found
 * - UNMAPPED_FIELD: Field couldn't be mapped to any attribute
 */
function findAttributeErrors(report) {
  const attributeErrors = [];

  // Check top-level errors array
  if (report.errors && Array.isArray(report.errors)) {
    for (const err of report.errors) {
      const code = (err.code || '').toString().toUpperCase();
      if (
        code.includes('ATTRIBUTE_NOT_FOUND') ||
        code.includes('ATTRIBUTE_MISSING') ||
        code.includes('UNMAPPED')
      ) {
        attributeErrors.push({
          lineNumber: err.lineNumber || 'N/A',
          code: err.code,
          message: err.message || 'No message',
          field: err.field || err.fields || 'N/A',
        });
      }
    }
  }

  // Check row-level issues
  if (report.rows && Array.isArray(report.rows)) {
    for (const row of report.rows) {
      if (row.issues && Array.isArray(row.issues)) {
        for (const issue of row.issues) {
          const code = (issue.code || '').toString().toUpperCase();
          if (
            code.includes('ATTRIBUTE_NOT_FOUND') ||
            code.includes('ATTRIBUTE_MISSING') ||
            code.includes('UNMAPPED')
          ) {
            attributeErrors.push({
              lineNumber: row.lineNumber || 'N/A',
              code: issue.code,
              message: issue.message || 'No message',
              field: issue.field || issue.fields || 'N/A',
            });
          }
        }
      }
    }
  }

  // Check validation results if present
  if (report.validation && report.validation.rows) {
    for (const row of report.validation.rows) {
      if (row.issues && Array.isArray(row.issues)) {
        for (const issue of row.issues) {
          const code = (issue.code || '').toString().toUpperCase();
          if (
            code.includes('ATTRIBUTE_NOT_FOUND') ||
            code.includes('ATTRIBUTE_MISSING') ||
            code.includes('UNMAPPED')
          ) {
            attributeErrors.push({
              lineNumber: row.lineNumber || 'N/A',
              code: issue.code,
              message: issue.message || 'No message',
              field: issue.field || issue.fields || 'N/A',
            });
          }
        }
      }
    }
  }

  return attributeErrors;
}

// Find errors
const attributeErrors = findAttributeErrors(data);

// Print summary
if (data.summary) {
  console.log(`\n📊 Summary:`);
  console.log(`   Total rows: ${data.summary.totalRows || 'N/A'}`);
  console.log(`   Valid rows: ${data.summary.validRows || 'N/A'}`);
  console.log(`   Invalid rows: ${data.summary.invalidRows || 'N/A'}`);
  console.log(`   Total issues: ${data.summary.totalIssues || 'N/A'}`);
}

// Report attribute errors
if (attributeErrors.length > 0) {
  console.error(`\n❌ Found ${attributeErrors.length} attribute mapping error(s):\n`);
  
  for (const err of attributeErrors.slice(0, 10)) {
    console.error(`   Line ${err.lineNumber}: [${err.code}] ${err.message}`);
    if (err.field !== 'N/A') {
      console.error(`      Field: ${Array.isArray(err.field) ? err.field.join(', ') : err.field}`);
    }
  }
  
  if (attributeErrors.length > 10) {
    console.error(`   ... and ${attributeErrors.length - 10} more errors`);
  }
  
  console.error(`\n❌ VALIDATION FAILED: Dry-run report contains attribute mapping errors`);
  process.exit(1);
}

// Success
console.log(`\n✅ VALIDATION PASSED: No attribute mapping errors found`);
process.exit(0);
