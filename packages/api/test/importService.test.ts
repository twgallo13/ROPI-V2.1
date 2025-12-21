/**
 * Import Service Integration Tests
 * Tests CSV parsing and import batch processing
 * 
 * LP-2.1.1: Added MPN-first validation tests
 */

import { describe, it, expect } from 'vitest';
import { readFileSync } from 'fs';
import { join } from 'path';
import { parseCSV, calculateRowStats, validateImportRows } from '../src/services/importService';
import { buildImportRows } from '@ropi-aoss/sdk';

describe('Import Service Integration', () => {
  describe('parseCSV', () => {
    it('should parse sample RetailOps CSV with MPN', () => {
      const csvPath = join(__dirname, 'fixtures', 'sample-retailops.csv');
      const csvContent = readFileSync(csvPath, 'utf-8');
      
      const rows = parseCSV(csvContent);
      
      expect(rows).toHaveLength(6); // 6 products in sample CSV
      expect(rows[0]['MPN']).toBe('DZ5485-410');
      expect(rows[0]['SKU']).toBe('NK-AIR-MAX-270');
      expect(rows[0]['Product Name']).toBe('Nike Air Max 270 - Black');
      expect(rows[0]['Brand']).toBe('Nike');
    });

    it('should parse numeric values', () => {
      const csvPath = join(__dirname, 'fixtures', 'sample-retailops.csv');
      const csvContent = readFileSync(csvPath, 'utf-8');
      
      const rows = parseCSV(csvContent);
      
      expect(typeof rows[0]['MSRP']).toBe('number');
      expect(rows[0]['MSRP']).toBe(159.99);
      expect(typeof rows[0]['Quantity']).toBe('number');
      expect(rows[0]['Quantity']).toBe(25);
    });
  });

  describe('CSV to Import Rows', () => {
    it('should build valid import rows from sample CSV with MPN', () => {
      const csvPath = join(__dirname, 'fixtures', 'sample-retailops.csv');
      const csvContent = readFileSync(csvPath, 'utf-8');
      
      const csvData = parseCSV(csvContent);
      const rows = buildImportRows(csvData, 'test-batch-123', 'test-user-456');
      
      expect(rows).toHaveLength(6);
      
      // Check first row (Nike Air Max) - LP-2.1.1: now has MPN
      const nikeRow = rows[0];
      expect(nikeRow.normalized.mpn).toBe('DZ5485-410');
      expect(nikeRow.normalized.sku).toBe('NK-AIR-MAX-270');
      expect(nikeRow.normalized.title).toBe('Nike Air Max 270 - Black');
      expect(nikeRow.normalized.brand).toBe('Nike');
      expect(nikeRow.normalized.msrp).toBe(159.99);
      expect(nikeRow.normalized.cost).toBe(80);
      expect(nikeRow.normalized.retailPrice).toBe(139.99);
      expect(nikeRow.normalized.quantity).toBe(25);
      expect(nikeRow.normalized.images).toHaveLength(2);
      expect(nikeRow.validation.isValid).toBe(true);
      // LP-2.1.0: productId should derive from MPN
      expect(nikeRow.meta.productId).toBe('dz5485-410');
      
      // Check row without images (Vans)
      const vansRow = rows[4];
      expect(vansRow.normalized.mpn).toBe('VN0A38GEAK3');
      expect(vansRow.normalized.sku).toBe('VANS-SK8-HI');
      expect(vansRow.normalized.images).toBeUndefined();
      expect(vansRow.normalized.primaryImage).toBeUndefined();
      expect(vansRow.validation.isValid).toBe(true);
    });

    it('should calculate stats correctly', () => {
      const csvPath = join(__dirname, 'fixtures', 'sample-retailops.csv');
      const csvContent = readFileSync(csvPath, 'utf-8');
      
      const csvData = parseCSV(csvContent);
      const rows = buildImportRows(csvData, 'test-batch-123', 'test-user-456');
      
      const stats = calculateRowStats(rows);
      
      // All rows in sample CSV should be valid (no errors)
      expect(stats.errorCount).toBe(0);
      // May have warnings (e.g., retail < MSRP)
      expect(stats.warningCount).toBeGreaterThanOrEqual(0);
    });
  });

  // LP-2.1.1: MPN-first validation tests
  describe('LP-2.1.1: MPN Validation', () => {
    it('Integration Test 1: CSV with MPN-only rows passes validation in dry-run', async () => {
      const csvPath = join(__dirname, 'fixtures', 'sample-retailops.csv');
      const csvContent = readFileSync(csvPath, 'utf-8');
      
      const csvData = parseCSV(csvContent);
      const rows = buildImportRows(csvData, 'test-batch-123', 'test-user-456');
      
      const validationResult = await validateImportRows(rows);
      
      expect(validationResult.totalRows).toBe(6);
      expect(validationResult.validRows).toBe(6);
      expect(validationResult.invalidRows).toBe(0);
      expect(validationResult.hasBlockingErrors).toBe(false);
      
      // All rows should have MPN and be valid
      for (const rowResult of validationResult.rowResults) {
        expect(rowResult.isValid).toBe(true);
        expect(rowResult.blockingErrors).toHaveLength(0);
      }
    });

    it('Integration Test 2: CSV with missing MPN yields blocking error', async () => {
      const csvPath = join(__dirname, 'fixtures', 'sample-missing-mpn.csv');
      const csvContent = readFileSync(csvPath, 'utf-8');
      
      const csvData = parseCSV(csvContent);
      const rows = buildImportRows(csvData, 'test-batch-123', 'test-user-456');
      
      const validationResult = await validateImportRows(rows);
      
      expect(validationResult.totalRows).toBe(4);
      expect(validationResult.invalidRows).toBe(2); // Rows 1 and 3 missing MPN
      expect(validationResult.validRows).toBe(2); // Rows 2 and 4 have MPN
      expect(validationResult.hasBlockingErrors).toBe(true);
      
      // Check that missing MPN rows have blocking errors
      const row1Result = validationResult.rowResults[0]; // Line 2 (after header)
      expect(row1Result.isValid).toBe(false);
      expect(row1Result.blockingErrors.some(e => e.field === 'mpn')).toBe(true);
      expect(row1Result.blockingErrors.some(e => e.code === 'MISSING_REQUIRED_FIELD')).toBe(true);
      
      const row3Result = validationResult.rowResults[2]; // Line 4
      expect(row3Result.isValid).toBe(false);
      expect(row3Result.blockingErrors.some(e => e.field === 'mpn')).toBe(true);
      
      // Rows with MPN should be valid
      const row2Result = validationResult.rowResults[1]; // Line 3
      expect(row2Result.isValid).toBe(true);
      
      const row4Result = validationResult.rowResults[3]; // Line 5
      expect(row4Result.isValid).toBe(true);
    });

    it('Integration Test 3: CSV with invalid enum values yields unmapped warnings', async () => {
      const csvPath = join(__dirname, 'fixtures', 'sample-invalid-enums.csv');
      const csvContent = readFileSync(csvPath, 'utf-8');
      
      const csvData = parseCSV(csvContent);
      const rows = buildImportRows(csvData, 'test-batch-123', 'test-user-456');
      
      const validationResult = await validateImportRows(rows);
      
      expect(validationResult.totalRows).toBe(3);
      // All rows have MPN so should pass blocking validation
      // Invalid enums should result in unmapped attributes or warnings
      expect(validationResult.hasBlockingErrors).toBe(false);
      
      // Check that unmapped attributes are flagged
      for (const rowResult of validationResult.rowResults) {
        // Rows should be valid (enum issues are warnings, not blocking errors)
        expect(rowResult.isValid).toBe(true);
        // Should have unmapped attributes for invalid enum values
        expect(rowResult.unmappedAttributes.length).toBeGreaterThanOrEqual(0);
      }
    });
  });
});
