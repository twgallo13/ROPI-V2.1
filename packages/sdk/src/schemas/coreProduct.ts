/**
 * Core Product Schema
 * Per AOSS Section 2.1 — Product Schema (JSON)
 * Version: aoss.v0.4.0
 *
 * This module provides the canonical Product type and validation for Nike men's footwear (MVP).
 * The schema is defined in /schemas/product.schema.json and exposed here with TypeScript types.
 */

import { z } from 'zod';

/**
 * JSON Schema for the canonical Product object
 * Mirrors /schemas/product.schema.json
 */
export const productJsonSchema = {
  "$id": "https://ropi-aoss/schemas/product.schema.json",
  "$schema": "http://json-schema.org/draft-07/schema#",
  "title": "AOSS Product",
  "description": "Canonical product representation for Nike men's footwear (MVP). This schema defines the internal product structure used throughout AOSS.",
  "type": "object",
  "properties": {
    "id": { "type": "string", "description": "Internal UUID or Firestore document ID", "minLength": 1 },
    "sku": { "type": "string", "description": "Internal SKU identifier", "minLength": 1 },
    "styleCode": { "type": "string", "description": "Product style code (e.g., 'DZ5485-410')", "pattern": "^[A-Z0-9]+-[A-Z0-9]+$" },
    "brand": { "type": "string", "enum": ["NIKE", "JORDAN"], "description": "Product brand (MVP: Nike men's footwear)" },
    "gender": { "type": "string", "enum": ["MEN"], "description": "Target gender (MVP: Men only)" },
    "category": { "type": "string", "enum": ["FOOTWEAR"], "description": "Product category (MVP: Footwear only)" },
    "class": { "type": "string", "description": "Product class (e.g., 'BASKETBALL', 'RUNNING', 'LIFESTYLE')", "minLength": 1 },
    "colorPrimary": { "type": "string", "description": "Primary color name", "minLength": 1 },
    "colorSecondary": { "type": "string", "description": "Secondary color name (optional)" },
    "sizeScale": { "type": "string", "enum": ["MENS_US"], "description": "Size scale system (MVP: Men's US only)" },
    "msrp": { "type": "number", "description": "Manufacturer's suggested retail price", "minimum": 0 },
    "price": { "type": "number", "description": "Selling price", "minimum": 0 },
    "launchDate": { "type": "string", "format": "date-time", "description": "Product launch date (ISO 8601 format)" },
    "season": { "type": "string", "description": "Product season (e.g., 'FA24', 'SP25')" },
    "status": { "type": "string", "enum": ["DRAFT", "READY_FOR_EXPORT", "DISCONTINUED"], "description": "Product lifecycle status" },
    "images": {
      "type": "array",
      "description": "Product images",
      "items": {
        "type": "object",
        "properties": {
          "url": { "type": "string", "format": "uri", "description": "Image URL" },
          "alt": { "type": "string", "description": "Alt text for accessibility" },
          "isPrimary": { "type": "boolean", "description": "Whether this is the primary/hero image" }
        },
        "required": ["url"],
        "additionalProperties": false
      }
    },
    "flags": {
      "type": "object",
      "description": "Product flags for special handling",
      "properties": {
        "isOutlet": { "type": "boolean", "description": "Product is outlet/clearance" },
        "isOnlineExclusive": { "type": "boolean", "description": "Product is online-only" },
        "isLimited": { "type": "boolean", "description": "Product is limited edition" }
      },
      "additionalProperties": false
    },
    "meta": {
      "type": "object",
      "description": "Free-form key/value metadata",
      "additionalProperties": { "type": "string" }
    }
  },
  "required": ["id", "sku", "styleCode", "brand", "gender", "category", "class", "colorPrimary", "sizeScale", "msrp", "price", "launchDate", "status", "images"],
  "additionalProperties": false
} as const;


/**
 * Product Image
 */
export interface ProductImage {
  /** Image URL */
  url: string;
  /** Alt text for accessibility */
  alt?: string;
  /** Whether this is the primary/hero image */
  isPrimary?: boolean;
}

/**
 * Product Flags
 * Special handling flags for the product
 */
export interface ProductFlags {
  /** Product is outlet/clearance */
  isOutlet?: boolean;
  /** Product is online-only */
  isOnlineExclusive?: boolean;
  /** Product is limited edition */
  isLimited?: boolean;
}

/**
 * Product Meta
 * Free-form key/value metadata
 */
export interface ProductMeta {
  [key: string]: string;
}

/**
 * Brand enum for MVP (Nike men's footwear)
 */
export type ProductBrand = 'NIKE' | 'JORDAN';

/**
 * Gender enum for MVP (Men only)
 */
export type ProductGender = 'MEN';

/**
 * Category enum for MVP (Footwear only)
 */
export type ProductCategory = 'FOOTWEAR';

/**
 * Size scale enum for MVP (Men's US only)
 */
export type ProductSizeScale = 'MENS_US';

/**
 * Product status enum
 */
export type ProductStatus = 'DRAFT' | 'READY_FOR_EXPORT' | 'DISCONTINUED';

/**
 * Core Product Interface
 * Canonical product representation for Nike men's footwear (MVP)
 *
 * This interface mirrors /schemas/product.schema.json exactly.
 */
export interface CoreProduct {
  /** Internal UUID or Firestore document ID */
  id: string;
  /** Internal SKU identifier */
  sku: string;
  /** Product style code (e.g., 'DZ5485-410') */
  styleCode: string;
  /** Product brand */
  brand: ProductBrand;
  /** Target gender */
  gender: ProductGender;
  /** Product category */
  category: ProductCategory;
  /** Product class (e.g., 'BASKETBALL', 'RUNNING', 'LIFESTYLE') */
  class: string;
  /** Primary color name */
  colorPrimary: string;
  /** Secondary color name (optional) */
  colorSecondary?: string;
  /** Size scale system */
  sizeScale: ProductSizeScale;
  /** Manufacturer's suggested retail price */
  msrp: number;
  /** Selling price */
  price: number;
  /** Product launch date (ISO 8601 format) */
  launchDate: string;
  /** Product season (e.g., 'FA24', 'SP25') */
  season?: string;
  /** Product lifecycle status */
  status: ProductStatus;
  /** Product images */
  images: ProductImage[];
  /** Product flags for special handling */
  flags?: ProductFlags;
  /** Free-form key/value metadata */
  meta?: ProductMeta;
}

// ============================================================================
// Zod Schemas for Runtime Validation
// ============================================================================

/**
 * Zod schema for ProductImage
 */
export const ProductImageSchema = z.object({
  url: z.string().url('Image URL must be a valid URL'),
  alt: z.string().optional(),
  isPrimary: z.boolean().optional(),
});

/**
 * Zod schema for ProductFlags
 */
export const ProductFlagsSchema = z.object({
  isOutlet: z.boolean().optional(),
  isOnlineExclusive: z.boolean().optional(),
  isLimited: z.boolean().optional(),
});

/**
 * Zod schema for ProductMeta
 */
export const ProductMetaSchema = z.record(z.string(), z.string());

/**
 * Zod schema for CoreProduct
 * Validates the canonical product structure for Nike men's footwear (MVP)
 */
export const CoreProductSchema = z.object({
  id: z.string().min(1, 'ID is required'),
  sku: z.string().min(1, 'SKU is required'),
  styleCode: z.string().regex(/^[A-Z0-9]+-[A-Z0-9]+$/, 'Style code must match pattern like DZ5485-410'),
  brand: z.enum(['NIKE', 'JORDAN']),
  gender: z.enum(['MEN']),
  category: z.enum(['FOOTWEAR']),
  class: z.string().min(1, 'Class is required'),
  colorPrimary: z.string().min(1, 'Primary color is required'),
  colorSecondary: z.string().optional(),
  sizeScale: z.enum(['MENS_US']),
  msrp: z.number().min(0, 'MSRP must be non-negative'),
  price: z.number().min(0, 'Price must be non-negative'),
  launchDate: z.string().datetime('Launch date must be ISO 8601 format'),
  season: z.string().optional(),
  status: z.enum(['DRAFT', 'READY_FOR_EXPORT', 'DISCONTINUED']),
  images: z.array(ProductImageSchema),
  flags: ProductFlagsSchema.optional(),
  meta: ProductMetaSchema.optional(),
});

// ============================================================================
// Validation Functions
// ============================================================================

/**
 * Validation result type
 */
export type ValidationResult<T> =
  | { ok: true; value: T }
  | { ok: false; errors: string[] };

/**
 * Validate a CoreProduct object
 *
 * @param input - Unknown input to validate
 * @returns ValidationResult with either the validated product or error messages
 *
 * @example
 * ```typescript
 * const result = validateCoreProduct(inputData);
 * if (result.ok) {
 *   console.log('Valid product:', result.value);
 * } else {
 *   console.log('Validation errors:', result.errors);
 * }
 * ```
 */
export function validateCoreProduct(input: unknown): ValidationResult<CoreProduct> {
  const result = CoreProductSchema.safeParse(input);

  if (result.success) {
    return { ok: true, value: result.data as CoreProduct };
  }

  const errors = result.error.issues.map((issue) => {
    const path = issue.path.join('.');
    return path ? `${path}: ${issue.message}` : issue.message;
  });

  return { ok: false, errors };
}

/**
 * Validate a CoreProduct object (throws on failure)
 *
 * @param input - Unknown input to validate
 * @returns Validated CoreProduct
 * @throws ZodError if validation fails
 */
export function validateCoreProductOrThrow(input: unknown): CoreProduct {
  return CoreProductSchema.parse(input) as CoreProduct;
}
