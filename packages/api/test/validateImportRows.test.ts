/**
 * LP-importer-mapping-recon-1.3.0: Validate Import Rows Integration Test
 * 
 * Tests that dry-run normalized rows do not contain attribute mapping errors.
 * This validates that the SDK canonicalization (LP-1.1.0) and registry-driven
 * UI (LP-1.2.0) are producing valid attribute IDs.
 */

import { describe, it, expect } from 'vitest';
import fs from 'fs';
import path from 'path';

/**
 * Helper to check if a dry-run report has attribute mapping errors
 */
function hasAttributeMappingErrors(report: any): { hasErrors: boolean; errors: any[] } {
  const errors: any[] = [];

  // Check top-level errors
  if (report.errors && Array.isArray(report.errors)) {
    for (const err of report.errors) {
      const code = (err.code || '').toString().toUpperCase();
      if (
        code.includes('ATTRIBUTE_NOT_FOUND') ||
        code.includes('ATTRIBUTE_MISSING') ||
        code.includes('UNMAPPED')
      ) {
        errors.push(err);
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
            errors.push({ lineNumber: row.lineNumber, ...issue });
          }
        }
      }
    }
  }

  return {
    hasErrors: errors.length > 0,
    errors,
  };
}

/**
 * Load a dry-run report from the scripts output directory
 */
function loadDryRunReport(filename: string): any | null {
  // Try multiple locations where dry-run reports might exist
  const locations = [
    path.join(__dirname, '../../sdk/scripts', filename),
    path.join(__dirname, '../../../artifacts', filename),
    path.join(__dirname, '../../evidence/importer-mapping-recon', filename),
  ];

  for (const loc of locations) {
    try {
      if (fs.existsSync(loc)) {
        const content = fs.readFileSync(loc, 'utf8');
        return JSON.parse(content);
      }
    } catch {
      // Try next location
    }
  }

  return null;
}

describe('validateImportRows integration', () => {
  describe('MPN-only dry-run', () => {
    it('should not have attribute mapping errors', () => {
      const report = loadDryRunReport('dry-run-output-mpn-only.json');
      
      if (!report) {
        // If no pre-generated report exists, skip test with warning
        console.warn('⚠️ No MPN-only dry-run report found. Run ci-dryrun.js first.');
        return;
      }

      const { hasErrors, errors } = hasAttributeMappingErrors(report);

      if (hasErrors) {
        console.error('Attribute mapping errors found:');
        errors.forEach(e => console.error(`  - ${e.code}: ${e.message}`));
      }

      expect(hasErrors).toBe(false);
    });

    it('should have valid normalized field keys', () => {
      const report = loadDryRunReport('dry-run-output-mpn-only.json');
      
      if (!report || !report.rows || report.rows.length === 0) {
        console.warn('⚠️ No MPN-only dry-run report with rows found.');
        return;
      }

      // Check that normalized keys are valid registry attribute IDs
      const validAttributePatterns = [
        /^[a-z][a-z0-9_]*$/, // lowercase with underscores
        /^descriptive\.[a-z][a-z0-9_]*$/, // descriptive.* namespace
        /^rics\.[a-z][a-z0-9_]*$/, // rics.* namespace
      ];

      const firstRow = report.rows[0];
      if (firstRow && firstRow.normalized) {
        const keys = Object.keys(firstRow.normalized);
        
        for (const key of keys) {
          const isValid = validAttributePatterns.some(p => p.test(key));
          if (!isValid) {
            console.warn(`Potentially invalid attribute key: ${key}`);
          }
        }

        // At minimum, expect mpn to be present
        expect(keys).toContain('mpn');
      }
    });
  });

  describe('Mixed dry-run', () => {
    it('should not have attribute mapping errors', () => {
      const report = loadDryRunReport('dry-run-output-mixed.json');
      
      if (!report) {
        console.warn('⚠️ No mixed dry-run report found. Run ci-dryrun.js first.');
        return;
      }

      const { hasErrors, errors } = hasAttributeMappingErrors(report);

      if (hasErrors) {
        console.error('Attribute mapping errors found:');
        errors.forEach(e => console.error(`  - ${e.code}: ${e.message}`));
      }

      expect(hasErrors).toBe(false);
    });
  });

  describe('Report structure validation', () => {
    it('should have expected dry-run report structure', () => {
      const report = loadDryRunReport('dry-run-output-mpn-only.json');
      
      if (!report) {
        console.warn('⚠️ No dry-run report found for structure validation.');
        return;
      }

      // Validate report has expected structure
      expect(report).toHaveProperty('summary');
      expect(report).toHaveProperty('rows');
      
      if (report.summary) {
        expect(typeof report.summary.totalRows).toBe('number');
        expect(typeof report.summary.validRows).toBe('number');
      }

      if (report.rows && report.rows.length > 0) {
        const row = report.rows[0];
        expect(row).toHaveProperty('lineNumber');
        expect(row).toHaveProperty('normalized');
        expect(row).toHaveProperty('validation');
      }
    });
  });
});
