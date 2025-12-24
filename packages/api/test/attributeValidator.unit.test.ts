/**
 * Attribute Validator Unit Tests
 * LP-ATTR-1.3.0 — Registry-driven Required Field Validation
 * 
 * Tests the attribute validator's registry-driven required field logic
 * and column-to-attribute mapping (especially title → name).
 */

import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import {
  validateRow,
  loadRegistryMap,
  clearRegistryCache,
  type AttributeDefinition,
} from '../src/services/attributeValidator';

// Mock firebase-admin with registry data
vi.mock('firebase-admin', () => {
  const mockRegistry: Record<string, AttributeDefinition> = {
    'mpn': {
      id: 'mpn',
      attribute_id: 'mpn',
      label: 'MPN',
      data_type: 'string',
      import: true,
      import_required: true, // Only MPN is required
    },
    'name': {
      id: 'name',
      attribute_id: 'name',
      label: 'Product Name',
      data_type: 'string',
      import: true,
      import_required: false, // Name is NOT required
    },
    'brand': {
      id: 'brand',
      attribute_id: 'brand',
      label: 'Brand',
      data_type: 'string',
      import: true,
      import_required: false, // Brand is NOT required
    },
    'category': {
      id: 'category',
      attribute_id: 'category',
      label: 'Category',
      data_type: 'select',
      allowed_values: ['Footwear', 'Apparel'],
      import: true,
      import_required: false,
    },
  };

  const mockFirestore = () => ({
    collection: () => ({
      doc: () => ({
        collection: () => ({
          get: async () => ({
            forEach: (cb: (doc: any) => void) => {
              Object.entries(mockRegistry).forEach(([id, data]) => {
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

describe('LP-ATTR-1.3.0: Attribute Validator Unit Tests', () => {
  let registryMap: Map<string, AttributeDefinition>;
  
  beforeEach(async () => {
    clearRegistryCache();
    registryMap = await loadRegistryMap();
  });
  
  afterEach(() => {
    clearRegistryCache();
  });

  describe('Registry-driven required field validation', () => {
    it('should require only MPN (import_required: true)', () => {
      const row = { MPN: 'TEST-001' };
      const result = validateRow(row, 1, registryMap);
      
      expect(result.status).toBe('valid');
      expect(result.errors.length).toBe(0);
    });
    
    it('should reject row missing MPN', () => {
      const row = { 'Product Name': 'Test Product', Brand: 'Test Brand' };
      const result = validateRow(row, 1, registryMap);
      
      expect(result.status).toBe('invalid');
      expect(result.errors[0].code).toBe('missing_mpn');
    });
    
    it('should NOT require Product Name (import_required: false)', () => {
      const row = { MPN: 'TEST-001' }; // No Product Name
      const result = validateRow(row, 1, registryMap);
      
      expect(result.status).toBe('valid');
      expect(result.errors.length).toBe(0);
    });
    
    it('should NOT require Brand (import_required: false)', () => {
      const row = { MPN: 'TEST-001' }; // No Brand
      const result = validateRow(row, 1, registryMap);
      
      expect(result.status).toBe('valid');
      expect(result.errors.length).toBe(0);
    });
  });

  describe('Column-to-attribute mapping (title → name)', () => {
    it('should map "Product Name" column to "name" attribute', () => {
      const row = { MPN: 'TEST-001', 'Product Name': 'My Product' };
      const result = validateRow(row, 1, registryMap);
      
      expect(result.normalizedValues['name']).toBe('My Product');
    });
    
    it('should map "title" column to "name" attribute', () => {
      const row = { MPN: 'TEST-001', 'title': 'Title Product' };
      const result = validateRow(row, 1, registryMap);
      
      expect(result.normalizedValues['name']).toBe('Title Product');
    });
    
    it('should map "Title" column to "name" attribute', () => {
      const row = { MPN: 'TEST-001', 'Title': 'Capitalized Title' };
      const result = validateRow(row, 1, registryMap);
      
      expect(result.normalizedValues['name']).toBe('Capitalized Title');
    });
    
    it('should map "name" column to "name" attribute', () => {
      const row = { MPN: 'TEST-001', 'name': 'Direct Name' };
      const result = validateRow(row, 1, registryMap);
      
      expect(result.normalizedValues['name']).toBe('Direct Name');
    });
  });

  describe('Mixed validation scenarios', () => {
    it('should validate row with MPN and optional fields', () => {
      const row = {
        MPN: 'TEST-001',
        'Product Name': 'Test Product',
        Brand: 'Test Brand',
        Category: 'Footwear',
      };
      const result = validateRow(row, 1, registryMap);
      
      expect(result.status).toBe('valid');
      expect(result.normalizedValues).toMatchObject({
        mpn: 'TEST-001',
        name: 'Test Product',
        brand: 'Test Brand',
        category: 'Footwear',
      });
    });
    
    it('should validate MPN-only row without blocking errors', () => {
      const row = { MPN: 'MPNA-001' };
      const result = validateRow(row, 1, registryMap);
      
      expect(result.status).toBe('valid');
      expect(result.errors.length).toBe(0);
      expect(result.normalizedValues).toEqual({ mpn: 'MPNA-001' });
    });
  });

  describe('Registry attribute flags', () => {
    it('should respect import: true flag', () => {
      const row = { MPN: 'TEST-001', Category: 'Footwear' };
      const result = validateRow(row, 1, registryMap);
      
      expect(result.status).toBe('valid');
      expect(result.normalizedValues['category']).toBe('Footwear');
    });
    
    it('should check allowed_values for enum types', () => {
      const row = { MPN: 'TEST-001', Category: 'InvalidCategory' };
      const result = validateRow(row, 1, registryMap);
      
      // Should have warning for invalid enum value
      expect(result.status).toBe('valid_with_warnings');
      expect(result.warnings.some(w => w.code === 'enum_unknown')).toBe(true);
    });
  });
});
