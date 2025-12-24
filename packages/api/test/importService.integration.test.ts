/**
 * Import Service Integration Tests
 * LP-2.1.8 — Server-side Import Validation
 * 
 * Tests the full validation pipeline with sample CSV data.
 */

import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import * as fs from 'fs';
import * as path from 'path';
import { parseCSV, validateCSVImport } from '../src/services/importService';
import {
  validateBatch,
  loadRegistryMap,
  clearRegistryCache,
} from '../src/services/attributeValidator';

// Mock firebase-admin
vi.mock('firebase-admin', () => {
  const mockData: Record<string, Record<string, unknown>> = {
    'gender': {
      id: 'gender',
      attribute_id: 'gender',
      label: 'Gender',
      data_type: 'enum',
      allowed_values: ['Men', 'Women', 'Unisex', 'Kids'],
      synonyms: { "Men's": 'Men', "Women's": 'Women' },
      import: true,
    },
    'department': {
      id: 'department',
      attribute_id: 'department',
      label: 'Department',
      data_type: 'enum',
      allowed_values: ['Footwear', 'Apparel', 'Accessories'],
      import: true,
    },
    'category': {
      id: 'category',
      attribute_id: 'category',
      label: 'Category',
      data_type: 'string',
      import: true,
    },
    'internal_notes': {
      id: 'internal_notes',
      attribute_id: 'internal_notes',
      label: 'Internal Notes',
      data_type: 'string',
      import: false, // Not importable
    },
    'primary_color': {
      id: 'primary_color',
      attribute_id: 'primary_color',
      label: 'Primary Color',
      data_type: 'string',
      import: true,
    },
    // LP-ATTR-1.3.0: Add name and brand attributes for registry-driven validation tests
    'name': {
      id: 'name',
      attribute_id: 'name',
      label: 'Product Name',
      data_type: 'text',
      import: true,
      import_required: false, // Not required for import
    },
    'brand': {
      id: 'brand',
      attribute_id: 'brand',
      label: 'Brand',
      data_type: 'text',
      import: true,
      import_required: false, // Not required for import
    },
    'mpn': {
      id: 'mpn',
      attribute_id: 'mpn',
      label: 'MPN',
      data_type: 'text',
      import: true,
      import_required: true, // Only MPN is required
    },
  };

  const mockFirestore = () => ({
    collection: () => ({
      doc: () => ({
        collection: () => ({
          get: async () => ({
            forEach: (cb: (doc: any) => void) => {
              Object.entries(mockData).forEach(([id, data]) => {
                cb({
                  id,
                  data: () => data,
                });
              });
            },
          }),
        }),
      }),
    }),
  });

  return {
    default: {
      firestore: mockFirestore,
    },
    firestore: mockFirestore,
  };
});

describe('LP-2.1.8: Import Service Integration', () => {
  const fixturesDir = path.join(__dirname, 'fixtures');
  
  beforeEach(() => {
    // Clear registry cache before each test
    clearRegistryCache();
  });
  
  afterEach(() => {
    clearRegistryCache();
  });

  describe('CSV Parsing', () => {
    it('should parse valid CSV', () => {
      const csv = `MPN,SKU,Product Name,Gender
DZ5485-410,SKU-001,Nike Air Max,Men
GX7918,SKU-002,Adidas Ultraboost,Women`;
      
      const rows = parseCSV(csv);
      
      expect(rows).toHaveLength(2);
      expect(rows[0]['MPN']).toBe('DZ5485-410');
      expect(rows[1]['Gender']).toBe('Women');
    });
  });

  describe('Batch Validation', () => {
    it('should validate batch with mixed results', async () => {
      const rows = [
        { MPN: 'DZ5485-410', Gender: 'Men', Department: 'Footwear' }, // valid
        { MPN: '', Gender: 'Women' }, // invalid - missing MPN
        { MPN: 'GX7918', Gender: 'InvalidGender' }, // valid_with_warnings
        { MPN: 'TEST-001', internal_notes: 'secret' }, // invalid - import:false attr
      ];
      
      const result = await validateBatch(rows);
      
      expect(result.totalRows).toBe(4);
      expect(result.validRows).toBe(2); // Row 1 and Row 3 (with warning)
      expect(result.invalidRows).toBe(2); // Row 2 and Row 4
      expect(result.warningRows).toBe(1); // Row 3
      
      // Row 1: valid
      expect(result.rows[0].status).toBe('valid');
      expect(result.rows[0].mpn).toBe('DZ5485-410');
      expect(result.rows[0].normalizedValues['gender']).toBe('Men');
      
      // Row 2: invalid - missing MPN
      expect(result.rows[1].status).toBe('invalid');
      expect(result.rows[1].errors[0].code).toBe('missing_mpn');
      
      // Row 3: valid with warning
      expect(result.rows[2].status).toBe('valid_with_warnings');
      expect(result.rows[2].warnings.some(w => w.code === 'enum_unknown')).toBe(true);
      
      // Row 4: invalid - attribute not importable
      expect(result.rows[3].status).toBe('invalid');
      expect(result.rows[3].errors.some(e => e.code === 'attribute_not_importable')).toBe(true);
    });
    
    it('should normalize enum values through synonyms', async () => {
      const rows = [
        { MPN: 'TEST-001', Gender: "Men's" },
        { MPN: 'TEST-002', Gender: "Women's" },
      ];
      
      const result = await validateBatch(rows);
      
      expect(result.rows[0].normalizedValues['gender']).toBe('Men');
      expect(result.rows[1].normalizedValues['gender']).toBe('Women');
    });
  });

  describe('Sample CSV File Processing', () => {
    it('should process sample-missing-mpn.csv correctly', async () => {
      const csvPath = path.join(fixturesDir, 'sample-missing-mpn.csv');
      
      if (!fs.existsSync(csvPath)) {
        console.warn('Skipping test: sample-missing-mpn.csv not found');
        return;
      }
      
      const csvContent = fs.readFileSync(csvPath, 'utf-8');
      const rows = parseCSV(csvContent);
      const result = await validateBatch(rows as Record<string, unknown>[]);
      
      // Should have some invalid rows (missing MPN)
      expect(result.invalidRows).toBeGreaterThan(0);
      
      // First row has missing MPN
      const missingMpnRows = result.rows.filter(r => 
        r.errors.some(e => e.code === 'missing_mpn')
      );
      expect(missingMpnRows.length).toBeGreaterThan(0);
    });
    
    it('should process sample-invalid-enums.csv correctly', async () => {
      const csvPath = path.join(fixturesDir, 'sample-invalid-enums.csv');
      
      if (!fs.existsSync(csvPath)) {
        console.warn('Skipping test: sample-invalid-enums.csv not found');
        return;
      }
      
      const csvContent = fs.readFileSync(csvPath, 'utf-8');
      const rows = parseCSV(csvContent);
      const result = await validateBatch(rows as Record<string, unknown>[]);
      
      // Should have warnings for invalid enum values
      const warningRows = result.rows.filter(r => r.warnings.length > 0);
      expect(warningRows.length).toBeGreaterThan(0);
    });
  });

  describe('Row Diagnostics', () => {
    it('should include row number in diagnostics', async () => {
      const rows = [
        { MPN: 'TEST-001' },
        { MPN: 'TEST-002' },
        { MPN: '' },
      ];
      
      const result = await validateBatch(rows);
      
      expect(result.rows[0].rowNumber).toBe(1);
      expect(result.rows[1].rowNumber).toBe(2);
      expect(result.rows[2].rowNumber).toBe(3);
    });
    
    it('should include normalized values in valid rows', async () => {
      const rows = [
        { MPN: 'TEST-001', Gender: 'Men', Department: 'Footwear', Category: 'Running' },
      ];
      
      const result = await validateBatch(rows);
      
      expect(result.rows[0].normalizedValues).toMatchObject({
        mpn: 'TEST-001',
        gender: 'Men',
        department: 'Footwear',
        category: 'Running',
      });
    });
  });
  
  // LP-ATTR-1.3.0: Registry-driven required validation tests
  describe('LP-ATTR-1.3.0: Registry-driven Required Validation', () => {
    it('should allow import with MPN only (no Product Name or Brand)', async () => {
      const rows = [
        { MPN: 'MPNA-001' },
        { MPN: 'MPNB-002', SKU: 'SKU-B2' },
      ];
      
      const result = await validateBatch(rows);
      
      // Both rows should be valid (no blocking errors for missing name/brand)
      expect(result.validRows).toBe(2);
      expect(result.invalidRows).toBe(0);
      
      // Verify no MISSING_REQUIRED_FIELD errors for name or brand
      result.rows.forEach(row => {
        expect(row.errors.some(e => 
          e.code === 'missing_required' && 
          (e.attribute === 'name' || e.attribute === 'brand')
        )).toBe(false);
      });
    });
    
    it('should map Product Name column to name attribute', async () => {
      const rows = [
        { MPN: 'TEST-001', 'Product Name': 'Test Product' },
      ];
      
      const result = await validateBatch(rows);
      
      expect(result.rows[0].status).toBe('valid');
      expect(result.rows[0].normalizedValues['name']).toBe('Test Product');
    });
    
    it('should map title column to name attribute', async () => {
      const rows = [
        { MPN: 'TEST-002', 'title': 'Another Product' },
      ];
      
      const result = await validateBatch(rows);
      
      expect(result.rows[0].status).toBe('valid');
      expect(result.rows[0].normalizedValues['name']).toBe('Another Product');
    });
    
    it('should only require MPN as import_required attribute', async () => {
      // Row with MPN but missing Product Name and Brand
      const rows = [
        { MPN: 'MPNA-001', Category: 'Test' },
      ];
      
      const result = await validateBatch(rows);
      
      // Should be valid with no blocking errors
      expect(result.rows[0].status).toBe('valid');
      expect(result.rows[0].errors.length).toBe(0);
    });
    
    it('should reject rows missing MPN (import_required: true)', async () => {
      const rows = [
        { 'Product Name': 'Product Without MPN', Brand: 'Test Brand' },
      ];
      
      const result = await validateBatch(rows);
      
      expect(result.rows[0].status).toBe('invalid');
      expect(result.rows[0].errors[0].code).toBe('missing_mpn');
    });
  });
});

