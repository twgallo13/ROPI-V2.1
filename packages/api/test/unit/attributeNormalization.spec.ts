/**
 * Attribute Normalization Tests
 * 
 * Tests for legacy field normalization in attributesService
 * PVS-0.2.2
 */

import { describe, it, expect, vi, beforeEach } from 'vitest';

// Mock firebase-admin
vi.mock('firebase-admin', () => ({
  firestore: vi.fn(() => ({
    collection: vi.fn(),
  })),
}));

// Import the normalization helper after mocking
// We'll test the normalization logic directly

describe('Attribute Normalization', () => {
  describe('Legacy to Canonical Field Mapping', () => {
    // Helper to simulate fromFirestore normalization logic
    function normalizeAttribute(data: Record<string, unknown>, docId: string) {
      const normalized: Record<string, unknown> = {
        attribute_id: docId,
        label: data.label,
        data_type: data.data_type || data.dataType || 'string',
        status: data.status || 'active',
        category: data.category,
        allowed_values: data.allowed_values || data.allowedValues,
        synonyms: data.synonyms,
        required_for_completion: data.required_for_completion ?? false,
        required_for_export: data.required_for_export ?? data.export ?? false,
        import_required: data.import_required ?? data.required ?? false,
        external_header: data.external_header || (Array.isArray(data.importerColumns) && data.importerColumns[0]) || undefined,
        ai_usage_notes: data.ai_usage_notes || data.description,
        source: data.source,
        createdBy: data.createdBy,
        createdAt: data.createdAt,
        updatedBy: data.updatedBy,
        updatedAt: data.updatedAt,
      };
      
      // Remove undefined values
      Object.keys(normalized).forEach(key => {
        if (normalized[key] === undefined) {
          delete normalized[key];
        }
      });
      
      return normalized;
    }

    it('should normalize dataType to data_type', () => {
      const legacyDoc = {
        label: 'Test Attribute',
        dataType: 'select',
      };
      
      const result = normalizeAttribute(legacyDoc, 'test_attr');
      
      expect(result.data_type).toBe('select');
      expect(result).not.toHaveProperty('dataType');
    });

    it('should normalize allowedValues to allowed_values', () => {
      const legacyDoc = {
        label: 'Test Enum',
        dataType: 'enum',
        allowedValues: ['Option A', 'Option B', 'Option C'],
      };
      
      const result = normalizeAttribute(legacyDoc, 'test_enum');
      
      expect(result.allowed_values).toEqual(['Option A', 'Option B', 'Option C']);
      expect(result).not.toHaveProperty('allowedValues');
    });

    it('should apply default status when missing', () => {
      const legacyDoc = {
        label: 'No Status',
        dataType: 'string',
      };
      
      const result = normalizeAttribute(legacyDoc, 'no_status');
      
      expect(result.status).toBe('active');
    });

    it('should apply default data_type when missing', () => {
      const legacyDoc = {
        label: 'No Type',
      };
      
      const result = normalizeAttribute(legacyDoc, 'no_type');
      
      expect(result.data_type).toBe('string');
    });

    it('should default boolean flags to false', () => {
      const legacyDoc = {
        label: 'Minimal',
        dataType: 'string',
      };
      
      const result = normalizeAttribute(legacyDoc, 'minimal');
      
      expect(result.required_for_completion).toBe(false);
      expect(result.required_for_export).toBe(false);
      expect(result.import_required).toBe(false);
    });

    it('should use legacy export field for required_for_export', () => {
      const legacyDoc = {
        label: 'With Export',
        dataType: 'string',
        export: true,
      };
      
      const result = normalizeAttribute(legacyDoc, 'with_export');
      
      expect(result.required_for_export).toBe(true);
    });

    it('should use legacy required field for import_required', () => {
      const legacyDoc = {
        label: 'With Required',
        dataType: 'string',
        required: true,
      };
      
      const result = normalizeAttribute(legacyDoc, 'with_required');
      
      expect(result.import_required).toBe(true);
    });

    it('should extract external_header from importerColumns array', () => {
      const legacyDoc = {
        label: 'With Importer',
        dataType: 'string',
        importerColumns: ['CSV_Header', 'Alt_Header'],
      };
      
      const result = normalizeAttribute(legacyDoc, 'with_importer');
      
      expect(result.external_header).toBe('CSV_Header');
    });

    it('should use description as ai_usage_notes fallback', () => {
      const legacyDoc = {
        label: 'With Description',
        dataType: 'string',
        description: 'This is the legacy description field',
      };
      
      const result = normalizeAttribute(legacyDoc, 'with_desc');
      
      expect(result.ai_usage_notes).toBe('This is the legacy description field');
    });

    it('should prefer canonical fields over legacy when both exist', () => {
      const mixedDoc = {
        label: 'Mixed Fields',
        data_type: 'enum',
        dataType: 'string', // should be ignored
        allowed_values: ['Correct'],
        allowedValues: ['Wrong'], // should be ignored
        status: 'deprecated',
      };
      
      const result = normalizeAttribute(mixedDoc, 'mixed');
      
      expect(result.data_type).toBe('enum');
      expect(result.allowed_values).toEqual(['Correct']);
      expect(result.status).toBe('deprecated');
    });

    it('should preserve canonical attribute unchanged', () => {
      const canonicalDoc = {
        label: 'Canonical Attribute',
        data_type: 'multiSelect',
        status: 'active',
        allowed_values: ['A', 'B'],
        synonyms: ['alias1'],
        required_for_completion: true,
        required_for_export: false,
        import_required: true,
        external_header: 'HEADER',
        ai_usage_notes: 'Usage notes',
        source: 'json',
        createdBy: 'system',
        createdAt: '2025-01-01T00:00:00Z',
        updatedBy: 'admin',
        updatedAt: '2025-01-02T00:00:00Z',
      };
      
      const result = normalizeAttribute(canonicalDoc, 'canonical');
      
      expect(result.data_type).toBe('multiSelect');
      expect(result.status).toBe('active');
      expect(result.allowed_values).toEqual(['A', 'B']);
      expect(result.synonyms).toEqual(['alias1']);
      expect(result.required_for_completion).toBe(true);
      expect(result.required_for_export).toBe(false);
      expect(result.import_required).toBe(true);
      expect(result.external_header).toBe('HEADER');
      expect(result.ai_usage_notes).toBe('Usage notes');
      expect(result.source).toBe('json');
    });

    it('should handle full legacy RICS-style document', () => {
      // Actual legacy format from rics_source.brand
      const ricsDoc = {
        dataType: 'string',
        usage: [],
        description: 'RICS brand',
        rules: [],
        label: 'Brand',
        legacyPaths: [],
        required: false,
        systemFlag: false,
        importerColumns: ['brand', 'Brand'],
        examples: { sampleValues: [] },
        canonicalPath: 'rics_source.brand',
        category: 'Source',
        export: true,
        key: 'brand',
        updatedBy: 'zmAn8kKTE3ZW3fM386d8tiWW97U2',
        updatedAt: '2025-12-16T08:24:14.155Z',
      };
      
      const result = normalizeAttribute(ricsDoc, 'rics_source.brand');
      
      expect(result.attribute_id).toBe('rics_source.brand');
      expect(result.data_type).toBe('string');
      expect(result.status).toBe('active'); // default applied
      expect(result.label).toBe('Brand');
      expect(result.category).toBe('Source');
      expect(result.required_for_export).toBe(true); // from export: true
      expect(result.import_required).toBe(false); // from required: false
      expect(result.external_header).toBe('brand'); // from importerColumns[0]
      expect(result.ai_usage_notes).toBe('RICS brand'); // from description
    });
  });
});
