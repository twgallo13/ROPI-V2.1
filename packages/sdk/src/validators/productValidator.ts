/**
 * Product Validator
 * Per AOSS Section 2.1 — Product Schema (JSON)
 * 
 * Runtime validation for product objects using zod.
 */

import { z } from 'zod';
import type { Product, ProductCore, ProductAttributes, ProductPricing, ProductInventory, ProductMedia } from '../schema/product';

/**
 * ProductCore schema - required fields for product identification
 */
export const ProductCoreSchema = z.object({
  sku: z.string().min(1, 'SKU is required'),
  title: z.string().min(1, 'Title is required'),
  brand: z.string().min(1, 'Brand is required'),
  description: z.string().optional(),
  status: z.enum(['draft', 'active', 'archived']),
  createdAt: z.string().datetime(),
  updatedAt: z.string().datetime(),
  // TODO (AOSS): Add remaining core fields from Section 2.1 schema
});

/**
 * ProductAttributes schema - attribute key-value pairs
 */
export const ProductAttributesSchema = z.object({
  department: z.string().optional(),
  class: z.string().optional(),
  category: z.string().optional(),
  subcategory: z.string().optional(),
  gender: z.string().optional(),
  ageGroup: z.string().optional(),
  color: z.string().optional(),
  size: z.string().optional(),
  material: z.string().optional(),
  // TODO (AOSS): Add remaining attributes from Section 2.1 and Attribute Registry
}).catchall(z.string().optional()); // Allow additional dynamic attributes

/**
 * ProductPricing schema
 */
export const ProductPricingSchema = z.object({
  msrp: z.number().positive().optional(),
  cost: z.number().positive().optional(),
  retailPrice: z.number().positive().optional(),
  currency: z.string().optional(),
  // TODO (AOSS): Add remaining pricing fields from Section 2.1 schema
}).optional();

/**
 * ProductInventory schema
 */
export const ProductInventorySchema = z.object({
  quantity: z.number().int().min(0).optional(),
  warehouse: z.string().optional(),
  location: z.string().optional(),
  // TODO (AOSS): Add remaining inventory fields from Section 2.1 schema
}).optional();

/**
 * ProductMedia schema
 */
export const ProductMediaSchema = z.object({
  images: z.array(z.string().url()).optional(),
  primaryImage: z.string().url().optional(),
  videos: z.array(z.string().url()).optional(),
  // TODO (AOSS): Add remaining media fields from Section 2.1 schema
}).optional();

/**
 * Complete Product schema
 */
export const ProductSchema = z.object({
  core: ProductCoreSchema,
  attributes: ProductAttributesSchema,
  pricing: ProductPricingSchema,
  inventory: ProductInventorySchema,
  media: ProductMediaSchema,
  
  // Metadata for import/normalization tracking
  _meta: z.object({
    source: z.string().optional(),
    importedAt: z.string().datetime().optional(),
    normalizedAt: z.string().datetime().optional(),
    validatedAt: z.string().datetime().optional(),
  }).optional(),
  
  // TODO (AOSS): Add remaining top-level fields from Section 2.1 schema
});

/**
 * Validate a product object
 * @param input - Unvalidated input
 * @returns Validated Product object
 * @throws ZodError if validation fails
 */
export function validateProduct(input: unknown): Product {
  return ProductSchema.parse(input);
}

/**
 * Safe validate - returns success/error result
 * @param input - Unvalidated input
 * @returns Validation result with data or error
 */
export function safeValidateProduct(input: unknown): z.SafeParseReturnType<unknown, Product> {
  return ProductSchema.safeParse(input);
}
