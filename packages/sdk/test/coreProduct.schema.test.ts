/**
 * Core Product Schema Tests
 * Version: aoss.v0.4.0
 *
 * Tests for the canonical Product schema and validation.
 */

import { describe, it, expect } from 'vitest';
import {
  validateCoreProduct,
  validateCoreProductOrThrow,
  CoreProductSchema,
  productJsonSchema,
} from '../src/schemas/coreProduct';
import type { CoreProduct } from '../src/schemas/coreProduct';

/**
 * Minimal valid CoreProduct for Nike men's footwear (MVP)
 */
const validProduct: CoreProduct = {
  id: 'prod_abc123',
  sku: 'NK-DZ5485-410-10',
  styleCode: 'DZ5485-410',
  brand: 'NIKE',
  gender: 'MEN',
  category: 'FOOTWEAR',
  class: 'BASKETBALL',
  colorPrimary: 'University Blue',
  sizeScale: 'MENS_US',
  msrp: 180,
  price: 180,
  launchDate: '2024-03-15T00:00:00.000Z',
  status: 'DRAFT',
  images: [
    {
      url: 'https://example.com/images/dz5485-410-hero.jpg',
      alt: 'Nike Air Jordan 1 University Blue',
      isPrimary: true,
    },
  ],
};

/**
 * Full CoreProduct with all optional fields
 */
const fullProduct: CoreProduct = {
  ...validProduct,
  colorSecondary: 'White',
  season: 'SP24',
  flags: {
    isOutlet: false,
    isOnlineExclusive: true,
    isLimited: true,
  },
  meta: {
    source: 'supplier_feed',
    importBatchId: 'batch_123',
  },
};

describe('Core Product Schema', () => {
  describe('JSON Schema export', () => {
    it('should export the JSON schema with correct $id', () => {
      expect(productJsonSchema.$id).toBe('https://ropi-aoss/schemas/product.schema.json');
    });

    it('should export the JSON schema with draft-07', () => {
      expect(productJsonSchema.$schema).toBe('http://json-schema.org/draft-07/schema#');
    });

    it('should have required fields defined', () => {
      expect(productJsonSchema.required).toContain('id');
      expect(productJsonSchema.required).toContain('sku');
      expect(productJsonSchema.required).toContain('styleCode');
      expect(productJsonSchema.required).toContain('brand');
      expect(productJsonSchema.required).toContain('gender');
      expect(productJsonSchema.required).toContain('category');
      expect(productJsonSchema.required).toContain('status');
      expect(productJsonSchema.required).toContain('images');
    });
  });

  describe('validateCoreProduct', () => {
    it('should validate a minimal valid product', () => {
      const result = validateCoreProduct(validProduct);

      expect(result.ok).toBe(true);
      if (result.ok) {
        expect(result.value.id).toBe('prod_abc123');
        expect(result.value.brand).toBe('NIKE');
        expect(result.value.status).toBe('DRAFT');
      }
    });

    it('should validate a product with all optional fields', () => {
      const result = validateCoreProduct(fullProduct);

      expect(result.ok).toBe(true);
      if (result.ok) {
        expect(result.value.colorSecondary).toBe('White');
        expect(result.value.season).toBe('SP24');
        expect(result.value.flags?.isLimited).toBe(true);
        expect(result.value.meta?.source).toBe('supplier_feed');
      }
    });

    it('should validate Jordan brand', () => {
      const jordanProduct = { ...validProduct, brand: 'JORDAN' as const };
      const result = validateCoreProduct(jordanProduct);

      expect(result.ok).toBe(true);
      if (result.ok) {
        expect(result.value.brand).toBe('JORDAN');
      }
    });

    it('should validate empty images array', () => {
      const productWithNoImages = { ...validProduct, images: [] };
      const result = validateCoreProduct(productWithNoImages);

      expect(result.ok).toBe(true);
      if (result.ok) {
        expect(result.value.images).toHaveLength(0);
      }
    });

    it('should validate all status values', () => {
      const statuses = ['DRAFT', 'READY_FOR_EXPORT', 'DISCONTINUED'] as const;

      for (const status of statuses) {
        const result = validateCoreProduct({ ...validProduct, status });
        expect(result.ok).toBe(true);
        if (result.ok) {
          expect(result.value.status).toBe(status);
        }
      }
    });
  });

  describe('validateCoreProduct - missing required fields', () => {
    it('should fail when id is missing', () => {
      const { id, ...productWithoutId } = validProduct;
      const result = validateCoreProduct(productWithoutId);

      expect(result.ok).toBe(false);
      if (!result.ok) {
        expect(result.errors.some((e) => e.includes('id'))).toBe(true);
      }
    });

    it('should fail when sku is missing', () => {
      const { sku, ...productWithoutSku } = validProduct;
      const result = validateCoreProduct(productWithoutSku);

      expect(result.ok).toBe(false);
      if (!result.ok) {
        expect(result.errors.some((e) => e.includes('sku'))).toBe(true);
      }
    });

    it('should fail when styleCode is missing', () => {
      const { styleCode, ...productWithoutStyleCode } = validProduct;
      const result = validateCoreProduct(productWithoutStyleCode);

      expect(result.ok).toBe(false);
      if (!result.ok) {
        expect(result.errors.some((e) => e.includes('styleCode'))).toBe(true);
      }
    });

    it('should fail when brand is missing', () => {
      const { brand, ...productWithoutBrand } = validProduct;
      const result = validateCoreProduct(productWithoutBrand);

      expect(result.ok).toBe(false);
      if (!result.ok) {
        expect(result.errors.some((e) => e.includes('brand'))).toBe(true);
      }
    });

    it('should fail when images is missing', () => {
      const { images, ...productWithoutImages } = validProduct;
      const result = validateCoreProduct(productWithoutImages);

      expect(result.ok).toBe(false);
      if (!result.ok) {
        expect(result.errors.some((e) => e.includes('images'))).toBe(true);
      }
    });
  });

  describe('validateCoreProduct - invalid enum values', () => {
    it('should fail when brand is invalid', () => {
      const invalidProduct = { ...validProduct, brand: 'ADIDAS' };
      const result = validateCoreProduct(invalidProduct);

      expect(result.ok).toBe(false);
      if (!result.ok) {
        expect(result.errors.some((e) => e.includes('brand'))).toBe(true);
      }
    });

    it('should fail when gender is not MEN (MVP constraint)', () => {
      const invalidProduct = { ...validProduct, gender: 'WOMEN' };
      const result = validateCoreProduct(invalidProduct);

      expect(result.ok).toBe(false);
      if (!result.ok) {
        expect(result.errors.some((e) => e.includes('gender'))).toBe(true);
      }
    });

    it('should fail when category is not FOOTWEAR (MVP constraint)', () => {
      const invalidProduct = { ...validProduct, category: 'APPAREL' };
      const result = validateCoreProduct(invalidProduct);

      expect(result.ok).toBe(false);
      if (!result.ok) {
        expect(result.errors.some((e) => e.includes('category'))).toBe(true);
      }
    });

    it('should fail when sizeScale is invalid', () => {
      const invalidProduct = { ...validProduct, sizeScale: 'WOMENS_US' };
      const result = validateCoreProduct(invalidProduct);

      expect(result.ok).toBe(false);
      if (!result.ok) {
        expect(result.errors.some((e) => e.includes('sizeScale'))).toBe(true);
      }
    });

    it('should fail when status is invalid', () => {
      const invalidProduct = { ...validProduct, status: 'ACTIVE' };
      const result = validateCoreProduct(invalidProduct);

      expect(result.ok).toBe(false);
      if (!result.ok) {
        expect(result.errors.some((e) => e.includes('status'))).toBe(true);
      }
    });
  });

  describe('validateCoreProduct - invalid field formats', () => {
    it('should fail when styleCode format is invalid', () => {
      const invalidProduct = { ...validProduct, styleCode: 'invalid-style' };
      const result = validateCoreProduct(invalidProduct);

      expect(result.ok).toBe(false);
      if (!result.ok) {
        expect(result.errors.some((e) => e.includes('styleCode'))).toBe(true);
      }
    });

    it('should fail when launchDate is not ISO format', () => {
      const invalidProduct = { ...validProduct, launchDate: '2024-03-15' };
      const result = validateCoreProduct(invalidProduct);

      expect(result.ok).toBe(false);
      if (!result.ok) {
        expect(result.errors.some((e) => e.includes('launchDate'))).toBe(true);
      }
    });

    it('should fail when msrp is negative', () => {
      const invalidProduct = { ...validProduct, msrp: -100 };
      const result = validateCoreProduct(invalidProduct);

      expect(result.ok).toBe(false);
      if (!result.ok) {
        expect(result.errors.some((e) => e.includes('msrp'))).toBe(true);
      }
    });

    it('should fail when image URL is invalid', () => {
      const invalidProduct = {
        ...validProduct,
        images: [{ url: 'not-a-url' }],
      };
      const result = validateCoreProduct(invalidProduct);

      expect(result.ok).toBe(false);
      if (!result.ok) {
        expect(result.errors.some((e) => e.includes('url'))).toBe(true);
      }
    });
  });

  describe('validateCoreProductOrThrow', () => {
    it('should return validated product for valid input', () => {
      const result = validateCoreProductOrThrow(validProduct);
      expect(result.id).toBe('prod_abc123');
    });

    it('should throw for invalid input', () => {
      const { id, ...invalidProduct } = validProduct;
      expect(() => validateCoreProductOrThrow(invalidProduct)).toThrow();
    });
  });

  describe('CoreProductSchema', () => {
    it('should parse valid product', () => {
      const result = CoreProductSchema.safeParse(validProduct);
      expect(result.success).toBe(true);
    });

    it('should fail for invalid product', () => {
      const result = CoreProductSchema.safeParse({ invalid: true });
      expect(result.success).toBe(false);
    });
  });
});
