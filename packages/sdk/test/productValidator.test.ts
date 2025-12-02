/**
 * Product Validator Tests
 * Basic validation tests for product schema
 */

import { describe, it, expect } from 'vitest';
import { validateProduct, safeValidateProduct } from '../src/validators/productValidator';

describe('Product Validator', () => {
  describe('validateProduct', () => {
    it('should validate a complete valid product', () => {
      const validProduct = {
        core: {
          sku: 'TEST-001',
          title: 'Test Product',
          brand: 'Test Brand',
          description: 'A test product',
          status: 'active' as const,
          createdAt: new Date().toISOString(),
          updatedAt: new Date().toISOString(),
        },
        attributes: {
          department: 'Footwear',
          class: 'Running',
          category: 'Shoes',
          color: 'Black',
          size: '10',
        },
        pricing: {
          msrp: 129.99,
          retailPrice: 99.99,
          currency: 'USD',
        },
        inventory: {
          quantity: 50,
          warehouse: 'WH-001',
        },
        media: {
          images: ['https://example.com/image1.jpg'],
          primaryImage: 'https://example.com/primary.jpg',
        },
      };

      const result = validateProduct(validProduct);
      expect(result).toBeDefined();
      expect(result.core.sku).toBe('TEST-001');
      expect(result.core.title).toBe('Test Product');
      expect(result.core.status).toBe('active');
    });

    it('should validate a minimal valid product', () => {
      const minimalProduct = {
        core: {
          sku: 'MIN-001',
          title: 'Minimal Product',
          brand: 'Brand',
          status: 'draft' as const,
          createdAt: new Date().toISOString(),
          updatedAt: new Date().toISOString(),
        },
        attributes: {},
      };

      const result = validateProduct(minimalProduct);
      expect(result).toBeDefined();
      expect(result.core.sku).toBe('MIN-001');
    });

    it('should fail when SKU is missing', () => {
      const invalidProduct = {
        core: {
          title: 'Test Product',
          brand: 'Test Brand',
          status: 'active',
          createdAt: new Date().toISOString(),
          updatedAt: new Date().toISOString(),
        },
        attributes: {},
      };

      expect(() => validateProduct(invalidProduct)).toThrow();
    });

    it('should fail when title is empty', () => {
      const invalidProduct = {
        core: {
          sku: 'TEST-001',
          title: '',
          brand: 'Test Brand',
          status: 'active',
          createdAt: new Date().toISOString(),
          updatedAt: new Date().toISOString(),
        },
        attributes: {},
      };

      expect(() => validateProduct(invalidProduct)).toThrow();
    });

    it('should fail when status is invalid', () => {
      const invalidProduct = {
        core: {
          sku: 'TEST-001',
          title: 'Test Product',
          brand: 'Test Brand',
          status: 'invalid-status',
          createdAt: new Date().toISOString(),
          updatedAt: new Date().toISOString(),
        },
        attributes: {},
      };

      expect(() => validateProduct(invalidProduct)).toThrow();
    });

    it('should fail when pricing has negative values', () => {
      const invalidProduct = {
        core: {
          sku: 'TEST-001',
          title: 'Test Product',
          brand: 'Test Brand',
          status: 'active' as const,
          createdAt: new Date().toISOString(),
          updatedAt: new Date().toISOString(),
        },
        attributes: {},
        pricing: {
          msrp: -10,
        },
      };

      expect(() => validateProduct(invalidProduct)).toThrow();
    });
  });

  describe('safeValidateProduct', () => {
    it('should return success for valid product', () => {
      const validProduct = {
        core: {
          sku: 'TEST-001',
          title: 'Test Product',
          brand: 'Test Brand',
          status: 'active' as const,
          createdAt: new Date().toISOString(),
          updatedAt: new Date().toISOString(),
        },
        attributes: {},
      };

      const result = safeValidateProduct(validProduct);
      expect(result.success).toBe(true);
      if (result.success) {
        expect(result.data.core.sku).toBe('TEST-001');
      }
    });

    it('should return error for invalid product', () => {
      const invalidProduct = {
        core: {
          title: 'Missing SKU',
        },
        attributes: {},
      };

      const result = safeValidateProduct(invalidProduct);
      expect(result.success).toBe(false);
      if (!result.success) {
        expect(result.error).toBeDefined();
      }
    });
  });
});
