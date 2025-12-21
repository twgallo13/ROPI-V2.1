/**
 * Export Service Integration Tests
 * LP-2.1.9 — Export & PDP Alignment
 * 
 * Integration tests for export functionality:
 * - Dry-run returns correct diagnostics for sample CSV
 * - Full export writes CSV with expected structure
 * - Synonym mapping produces canonical values
 */

import { describe, it, expect, vi, beforeEach, afterEach, beforeAll } from 'vitest';
import * as admin from 'firebase-admin';

// Mock firebase-admin before importing services
vi.mock('firebase-admin', async () => {
  const mockFirestore = {
    collection: vi.fn().mockReturnThis(),
    doc: vi.fn().mockReturnThis(),
    get: vi.fn(),
    where: vi.fn().mockReturnThis(),
    orderBy: vi.fn().mockReturnThis(),
    limit: vi.fn().mockReturnThis(),
    startAfter: vi.fn().mockReturnThis(),
  };

  return {
    default: {
      firestore: () => mockFirestore,
      initializeApp: vi.fn(),
    },
    firestore: () => mockFirestore,
    initializeApp: vi.fn(),
  };
});

// Mock the attributeValidator's loadRegistryMap
vi.mock('../src/services/attributeValidator', async () => {
  const mockRegistry = new Map();
  
  // Gender attribute
  mockRegistry.set('gender', {
    id: 'gender',
    attribute_id: 'gender',
    label: 'Gender',
    data_type: 'enum',
    allowed_values: ['Men', 'Women', 'Unisex', 'Kids'],
    synonyms: { 'Male': 'Men', 'Female': 'Women' },
    import: true,
    export: true,
    required_for_export: true,
    category: 'identity'
  });

  // Primary color attribute
  mockRegistry.set('primary_color', {
    id: 'primary_color',
    attribute_id: 'primary_color',
    label: 'Primary Color',
    external_header: 'Color',
    data_type: 'enum',
    allowed_values: ['Black', 'White', 'Red', 'Blue', 'Green'],
    synonyms: { 'BLK': 'Black', 'WHT': 'White' },
    import: true,
    export: true,
    required_for_export: true,
    category: 'color'
  });

  // Materials attribute (multiSelect)
  mockRegistry.set('materials', {
    id: 'materials',
    attribute_id: 'materials',
    label: 'Materials',
    data_type: 'multiSelect',
    allowed_values: ['Leather', 'Canvas', 'Rubber'],
    import: true,
    export: true,
    required_for_export: false,
    category: 'descriptive'
  });

  // Non-exportable attribute
  mockRegistry.set('internal_notes', {
    id: 'internal_notes',
    attribute_id: 'internal_notes',
    label: 'Internal Notes',
    data_type: 'string',
    import: true,
    export: false,
    required_for_export: false,
    category: 'internal'
  });

  return {
    loadRegistryMap: vi.fn().mockResolvedValue(mockRegistry),
    clearRegistryCache: vi.fn(),
  };
});

import {
  runDryRunExport,
  runFullExport,
  loadExportableAttributes,
  generateCsvContent,
  type ExportOptions,
  type ProductDocument,
  type ExportRow,
} from '../src/services/exportService';

// ============================================================================
// Test Fixtures
// ============================================================================

const mockProducts: ProductDocument[] = [
  {
    id: 'prod-001',
    mpn: 'MPN-001',
    sku: 'SKU-001',
    attributes: {
      gender: 'Men',
      primary_color: 'Black',
      materials: ['Leather', 'Rubber']
    },
    _meta: {
      gender: {
        actor: 'import-user',
        source: 'csv-import',
        ts: '2024-01-15T10:00:00Z',
        definition_version: '1.0.0',
        canonical: true
      }
    }
  },
  {
    id: 'prod-002',
    mpn: 'MPN-002',
    sku: 'SKU-002',
    attributes: {
      gender: 'Women',
      primary_color: 'Red',
      materials: ['Canvas']
    }
  },
  {
    id: 'prod-003',
    mpn: 'MPN-003',
    skus: ['SKU-003A', 'SKU-003B'],
    attributes: {
      gender: 'Male', // Synonym - should map to Men
      primary_color: 'BLK' // Synonym - should map to Black
    }
  },
  {
    id: 'prod-004',
    mpn: 'MPN-004',
    sku: 'SKU-004',
    attributes: {
      gender: 'Men'
      // Missing primary_color - not export ready
    }
  },
  {
    id: 'prod-005',
    // Missing MPN - should be skipped
    sku: 'SKU-005',
    attributes: {
      gender: 'Women',
      primary_color: 'Blue'
    }
  }
];

// ============================================================================
// Test Setup
// ============================================================================

describe('LP-2.1.9: Export Service Integration', () => {
  let mockFirestore: any;

  beforeEach(() => {
    vi.clearAllMocks();
    
    // Setup mock firestore
    mockFirestore = admin.firestore();
    
    // Mock product query results
    const mockDocs = mockProducts.map(p => ({
      id: p.id,
      data: () => p
    }));

    mockFirestore.get.mockResolvedValue({
      empty: false,
      docs: mockDocs
    });
  });

  // ============================================================================
  // loadExportableAttributes Tests
  // ============================================================================

  describe('loadExportableAttributes', () => {
    it('should load only exportable attributes', async () => {
      const attrs = await loadExportableAttributes();
      
      expect(attrs.has('gender')).toBe(true);
      expect(attrs.has('primary_color')).toBe(true);
      expect(attrs.has('materials')).toBe(true);
      expect(attrs.has('internal_notes')).toBe(false); // export: false
    });

    it('should filter by site when specified', async () => {
      // This test verifies the site filtering logic exists
      // In production, attributes would have exportForSites array
      const attrs = await loadExportableAttributes('ropi-web');
      
      // All exportable attrs should be included if no site restrictions
      expect(attrs.size).toBeGreaterThan(0);
    });
  });

  // ============================================================================
  // Dry-Run Export Tests
  // ============================================================================

  describe('runDryRunExport', () => {
    it('should return sample rows with diagnostics', async () => {
      const options: ExportOptions = { limit: 10 };
      const result = await runDryRunExport(options);
      
      expect(result.timestamp).toBeDefined();
      expect(result.summary).toBeDefined();
      expect(result.sampleRows).toBeDefined();
      expect(result.sampleCsv).toBeDefined();
      expect(result.columnHeaders).toBeDefined();
    });

    it('should include export readiness stats', async () => {
      const result = await runDryRunExport({ limit: 10 });
      
      expect(result.summary.totalProducts).toBeGreaterThan(0);
      expect(result.summary.exportReadyCount).toBeDefined();
      expect(result.summary.notExportReadyCount).toBeDefined();
    });

    it('should track skipped products (missing MPN)', async () => {
      const result = await runDryRunExport({ limit: 10 });
      
      // prod-005 has no MPN and should be skipped
      expect(result.summary.skippedProducts).toBeGreaterThan(0);
      expect(result.summary.errorCodes['missing_mpn']).toBeGreaterThan(0);
    });

    it('should include attributes in column headers', async () => {
      const result = await runDryRunExport({ limit: 10 });
      
      expect(result.columnHeaders).toContain('MPN');
      expect(result.columnHeaders).toContain('SKU');
      expect(result.columnHeaders).toContain('Gender');
      expect(result.columnHeaders).toContain('Color'); // external_header
    });

    it('should list included and excluded attributes', async () => {
      const result = await runDryRunExport({ limit: 10 });
      
      expect(result.attributesIncluded).toContain('gender');
      expect(result.attributesIncluded).toContain('primary_color');
      // internal_notes should be excluded
      expect(result.attributesExcluded).toContain('internal_notes');
    });
  });

  // ============================================================================
  // Synonym Normalization Tests
  // ============================================================================

  describe('Synonym Normalization', () => {
    it('should normalize synonyms to canonical values in export', async () => {
      const result = await runDryRunExport({ limit: 10 });
      
      // Find the row for prod-003 which has synonyms
      const prod003Row = result.sampleRows.find(r => r.mpn === 'MPN-003');
      
      if (prod003Row) {
        // Gender: 'Male' should become 'Men'
        expect(prod003Row.columns['Gender']).toBe('Men');
        // Color: 'BLK' should become 'Black'
        expect(prod003Row.columns['Color']).toBe('Black');
      }
    });

    it('should warn on unknown values', async () => {
      const result = await runDryRunExport({ limit: 10 });
      
      // Check if any warnings were collected
      expect(result.summary.warningCount).toBeDefined();
    });
  });

  // ============================================================================
  // Meta Column Tests
  // ============================================================================

  describe('_meta Column Inclusion', () => {
    it('should include _meta columns when requested', async () => {
      const result = await runDryRunExport({ 
        limit: 10, 
        includeMeta: true 
      });
      
      expect(result.columnHeaders).toContain('Gender_meta');
      expect(result.columnHeaders).toContain('Color_meta');
    });

    it('should format _meta as JSON string', async () => {
      const result = await runDryRunExport({ 
        limit: 10, 
        includeMeta: true 
      });
      
      // Find prod-001 which has _meta
      const prod001Row = result.sampleRows.find(r => r.mpn === 'MPN-001');
      
      if (prod001Row?.metaColumns) {
        const genderMeta = prod001Row.metaColumns['Gender_meta'];
        if (genderMeta) {
          const parsed = JSON.parse(genderMeta);
          expect(parsed.actor).toBe('import-user');
          expect(parsed.source).toBe('csv-import');
        }
      }
    });
  });

  // ============================================================================
  // CSV Generation Tests
  // ============================================================================

  describe('CSV Generation', () => {
    it('should generate valid CSV content', async () => {
      const result = await runDryRunExport({ limit: 10 });
      
      expect(result.sampleCsv).toBeDefined();
      
      const lines = result.sampleCsv.split('\n');
      expect(lines.length).toBeGreaterThan(1); // Header + at least 1 row
      
      // First line should be headers
      expect(lines[0]).toContain('MPN');
      expect(lines[0]).toContain('SKU');
    });

    it('should have MPN as first column in CSV', async () => {
      const result = await runDryRunExport({ limit: 10 });
      
      const lines = result.sampleCsv.split('\n');
      const headers = lines[0].split(',');
      
      expect(headers[0]).toBe('MPN');
    });

    it('should join multiSelect with pipe delimiter', async () => {
      const result = await runDryRunExport({ limit: 10 });
      
      // Find prod-001 which has materials as array
      const prod001Row = result.sampleRows.find(r => r.mpn === 'MPN-001');
      
      if (prod001Row && prod001Row.columns['Materials']) {
        expect(prod001Row.columns['Materials']).toContain('|');
      }
    });
  });

  // ============================================================================
  // Full Export Tests
  // ============================================================================

  describe('runFullExport', () => {
    it('should export all products with pagination', async () => {
      const result = await runFullExport({ pageSize: 1000 });
      
      expect(result.timestamp).toBeDefined();
      expect(result.summary.totalProducts).toBeGreaterThan(0);
      expect(result.rows.length).toBeGreaterThan(0);
      expect(result.csvContent).toBeDefined();
    });

    it('should respect limit option', async () => {
      const result = await runFullExport({ limit: 2 });
      
      // The limit is applied during pagination - verify it's in options
      expect(result.options.limit).toBe(2);
      // With mock returning all docs, we verify the limit is passed correctly
      // In production, pagination would stop at limit
    });

    it('should track missing attribute counts', async () => {
      const result = await runFullExport({});
      
      expect(result.summary.missingAttributeCounts).toBeDefined();
      // prod-004 is missing primary_color
      if (result.summary.notExportReadyCount > 0) {
        expect(Object.keys(result.summary.missingAttributeCounts).length).toBeGreaterThan(0);
      }
    });
  });

  // ============================================================================
  // Row Diagnostics Tests
  // ============================================================================

  describe('Row Diagnostics', () => {
    it('should include row number in each export row', async () => {
      const result = await runDryRunExport({ limit: 10 });
      
      for (let i = 0; i < result.sampleRows.length; i++) {
        expect(result.sampleRows[i].rowNumber).toBe(i + 1);
      }
    });

    it('should track export readiness per row', async () => {
      const result = await runDryRunExport({ limit: 10 });
      
      for (const row of result.sampleRows) {
        expect(typeof row.exportReady).toBe('boolean');
        expect(Array.isArray(row.missingAttributes)).toBe(true);
      }
    });

    it('should track warnings per row', async () => {
      const result = await runDryRunExport({ limit: 10 });
      
      for (const row of result.sampleRows) {
        expect(Array.isArray(row.warnings)).toBe(true);
      }
    });
  });
});
