/**
 * Import Service Integration Tests
 * Tests CSV parsing and import batch processing
 */

import { describe, it, expect } from 'vitest';
import { readFileSync } from 'fs';
import { join } from 'path';
import { parseCSV, calculateRowStats } from '../src/services/importService';
import { buildImportRows } from '@ropi-aoss/sdk';

describe('Import Service Integration', () => {
  describe('parseCSV', () => {
    it('should parse sample RetailOps CSV', () => {
      const csvPath = join(__dirname, 'fixtures', 'sample-retailops.csv');
      const csvContent = readFileSync(csvPath, 'utf-8');
      
      const rows = parseCSV(csvContent);
      
      expect(rows).toHaveLength(6); // 6 products in sample CSV
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
    it('should build valid import rows from sample CSV', () => {
      const csvPath = join(__dirname, 'fixtures', 'sample-retailops.csv');
      const csvContent = readFileSync(csvPath, 'utf-8');
      
      const csvData = parseCSV(csvContent);
      const rows = buildImportRows(csvData, 'test-batch-123', 'test-user-456');
      
      expect(rows).toHaveLength(6);
      
      // Check first row (Nike Air Max)
      const nikeRow = rows[0];
      expect(nikeRow.normalized.sku).toBe('NK-AIR-MAX-270');
      expect(nikeRow.normalized.title).toBe('Nike Air Max 270 - Black');
      expect(nikeRow.normalized.brand).toBe('Nike');
      expect(nikeRow.normalized.msrp).toBe(159.99);
      expect(nikeRow.normalized.cost).toBe(80);
      expect(nikeRow.normalized.retailPrice).toBe(139.99);
      expect(nikeRow.normalized.quantity).toBe(25);
      expect(nikeRow.normalized.images).toHaveLength(2);
      expect(nikeRow.validation.isValid).toBe(true);
      expect(nikeRow.meta.productId).toBe('nk-air-max-270');
      
      // Check row without images (Vans)
      const vansRow = rows[4];
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
});
