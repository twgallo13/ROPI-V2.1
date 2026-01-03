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
export declare const productJsonSchema: {
    readonly $id: "https://ropi-aoss/schemas/product.schema.json";
    readonly $schema: "http://json-schema.org/draft-07/schema#";
    readonly title: "AOSS Product";
    readonly description: "Canonical product representation for Nike men's footwear (MVP). This schema defines the internal product structure used throughout AOSS.";
    readonly type: "object";
    readonly properties: {
        readonly id: {
            readonly type: "string";
            readonly description: "Internal UUID or Firestore document ID";
            readonly minLength: 1;
        };
        readonly sku: {
            readonly type: "string";
            readonly description: "Internal SKU identifier";
            readonly minLength: 1;
        };
        readonly styleCode: {
            readonly type: "string";
            readonly description: "Product style code (e.g., 'DZ5485-410')";
            readonly pattern: "^[A-Z0-9]+-[A-Z0-9]+$";
        };
        readonly brand: {
            readonly type: "string";
            readonly enum: readonly ["NIKE", "JORDAN"];
            readonly description: "Product brand (MVP: Nike men's footwear)";
        };
        readonly gender: {
            readonly type: "string";
            readonly enum: readonly ["MEN"];
            readonly description: "Target gender (MVP: Men only)";
        };
        readonly category: {
            readonly type: "string";
            readonly enum: readonly ["FOOTWEAR"];
            readonly description: "Product category (MVP: Footwear only)";
        };
        readonly class: {
            readonly type: "string";
            readonly description: "Product class (e.g., 'BASKETBALL', 'RUNNING', 'LIFESTYLE')";
            readonly minLength: 1;
        };
        readonly colorPrimary: {
            readonly type: "string";
            readonly description: "Primary color name";
            readonly minLength: 1;
        };
        readonly colorSecondary: {
            readonly type: "string";
            readonly description: "Secondary color name (optional)";
        };
        readonly sizeScale: {
            readonly type: "string";
            readonly enum: readonly ["MENS_US"];
            readonly description: "Size scale system (MVP: Men's US only)";
        };
        readonly msrp: {
            readonly type: "number";
            readonly description: "Manufacturer's suggested retail price";
            readonly minimum: 0;
        };
        readonly price: {
            readonly type: "number";
            readonly description: "Selling price";
            readonly minimum: 0;
        };
        readonly launchDate: {
            readonly type: "string";
            readonly format: "date-time";
            readonly description: "Product launch date (ISO 8601 format)";
        };
        readonly season: {
            readonly type: "string";
            readonly description: "Product season (e.g., 'FA24', 'SP25')";
        };
        readonly status: {
            readonly type: "string";
            readonly enum: readonly ["DRAFT", "READY_FOR_EXPORT", "DISCONTINUED"];
            readonly description: "Product lifecycle status";
        };
        readonly images: {
            readonly type: "array";
            readonly description: "Product images";
            readonly items: {
                readonly type: "object";
                readonly properties: {
                    readonly url: {
                        readonly type: "string";
                        readonly format: "uri";
                        readonly description: "Image URL";
                    };
                    readonly alt: {
                        readonly type: "string";
                        readonly description: "Alt text for accessibility";
                    };
                    readonly isPrimary: {
                        readonly type: "boolean";
                        readonly description: "Whether this is the primary/hero image";
                    };
                };
                readonly required: readonly ["url"];
                readonly additionalProperties: false;
            };
        };
        readonly flags: {
            readonly type: "object";
            readonly description: "Product flags for special handling";
            readonly properties: {
                readonly isOutlet: {
                    readonly type: "boolean";
                    readonly description: "Product is outlet/clearance";
                };
                readonly isOnlineExclusive: {
                    readonly type: "boolean";
                    readonly description: "Product is online-only";
                };
                readonly isLimited: {
                    readonly type: "boolean";
                    readonly description: "Product is limited edition";
                };
            };
            readonly additionalProperties: false;
        };
        readonly meta: {
            readonly type: "object";
            readonly description: "Free-form key/value metadata";
            readonly additionalProperties: {
                readonly type: "string";
            };
        };
    };
    readonly required: readonly ["id", "sku", "styleCode", "brand", "gender", "category", "class", "colorPrimary", "sizeScale", "msrp", "price", "launchDate", "status", "images"];
    readonly additionalProperties: false;
};
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
/**
 * Zod schema for ProductImage
 */
export declare const ProductImageSchema: z.ZodObject<{
    url: z.ZodString;
    alt: z.ZodOptional<z.ZodString>;
    isPrimary: z.ZodOptional<z.ZodBoolean>;
}, "strip", z.ZodTypeAny, {
    url?: string;
    alt?: string;
    isPrimary?: boolean;
}, {
    url?: string;
    alt?: string;
    isPrimary?: boolean;
}>;
/**
 * Zod schema for ProductFlags
 */
export declare const ProductFlagsSchema: z.ZodObject<{
    isOutlet: z.ZodOptional<z.ZodBoolean>;
    isOnlineExclusive: z.ZodOptional<z.ZodBoolean>;
    isLimited: z.ZodOptional<z.ZodBoolean>;
}, "strip", z.ZodTypeAny, {
    isOutlet?: boolean;
    isOnlineExclusive?: boolean;
    isLimited?: boolean;
}, {
    isOutlet?: boolean;
    isOnlineExclusive?: boolean;
    isLimited?: boolean;
}>;
/**
 * Zod schema for ProductMeta
 */
export declare const ProductMetaSchema: z.ZodRecord<z.ZodString, z.ZodString>;
/**
 * Zod schema for CoreProduct
 * Validates the canonical product structure for Nike men's footwear (MVP)
 */
export declare const CoreProductSchema: z.ZodObject<{
    id: z.ZodString;
    sku: z.ZodString;
    styleCode: z.ZodString;
    brand: z.ZodEnum<["NIKE", "JORDAN"]>;
    gender: z.ZodEnum<["MEN"]>;
    category: z.ZodEnum<["FOOTWEAR"]>;
    class: z.ZodString;
    colorPrimary: z.ZodString;
    colorSecondary: z.ZodOptional<z.ZodString>;
    sizeScale: z.ZodEnum<["MENS_US"]>;
    msrp: z.ZodNumber;
    price: z.ZodNumber;
    launchDate: z.ZodString;
    season: z.ZodOptional<z.ZodString>;
    status: z.ZodEnum<["DRAFT", "READY_FOR_EXPORT", "DISCONTINUED"]>;
    images: z.ZodArray<z.ZodObject<{
        url: z.ZodString;
        alt: z.ZodOptional<z.ZodString>;
        isPrimary: z.ZodOptional<z.ZodBoolean>;
    }, "strip", z.ZodTypeAny, {
        url?: string;
        alt?: string;
        isPrimary?: boolean;
    }, {
        url?: string;
        alt?: string;
        isPrimary?: boolean;
    }>, "many">;
    flags: z.ZodOptional<z.ZodObject<{
        isOutlet: z.ZodOptional<z.ZodBoolean>;
        isOnlineExclusive: z.ZodOptional<z.ZodBoolean>;
        isLimited: z.ZodOptional<z.ZodBoolean>;
    }, "strip", z.ZodTypeAny, {
        isOutlet?: boolean;
        isOnlineExclusive?: boolean;
        isLimited?: boolean;
    }, {
        isOutlet?: boolean;
        isOnlineExclusive?: boolean;
        isLimited?: boolean;
    }>>;
    meta: z.ZodOptional<z.ZodRecord<z.ZodString, z.ZodString>>;
}, "strip", z.ZodTypeAny, {
    status?: "READY_FOR_EXPORT" | "DRAFT" | "DISCONTINUED";
    category?: "FOOTWEAR";
    sku?: string;
    brand?: "NIKE" | "JORDAN";
    class?: string;
    gender?: "MEN";
    msrp?: number;
    launchDate?: string;
    images?: {
        url?: string;
        alt?: string;
        isPrimary?: boolean;
    }[];
    styleCode?: string;
    id?: string;
    price?: number;
    colorPrimary?: string;
    sizeScale?: "MENS_US";
    colorSecondary?: string;
    season?: string;
    flags?: {
        isOutlet?: boolean;
        isOnlineExclusive?: boolean;
        isLimited?: boolean;
    };
    meta?: Record<string, string>;
}, {
    status?: "READY_FOR_EXPORT" | "DRAFT" | "DISCONTINUED";
    category?: "FOOTWEAR";
    sku?: string;
    brand?: "NIKE" | "JORDAN";
    class?: string;
    gender?: "MEN";
    msrp?: number;
    launchDate?: string;
    images?: {
        url?: string;
        alt?: string;
        isPrimary?: boolean;
    }[];
    styleCode?: string;
    id?: string;
    price?: number;
    colorPrimary?: string;
    sizeScale?: "MENS_US";
    colorSecondary?: string;
    season?: string;
    flags?: {
        isOutlet?: boolean;
        isOnlineExclusive?: boolean;
        isLimited?: boolean;
    };
    meta?: Record<string, string>;
}>;
/**
 * Validation result type
 */
export type ValidationResult<T> = {
    ok: true;
    value: T;
} | {
    ok: false;
    errors: string[];
};
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
export declare function validateCoreProduct(input: unknown): ValidationResult<CoreProduct>;
/**
 * Validate a CoreProduct object (throws on failure)
 *
 * @param input - Unknown input to validate
 * @returns Validated CoreProduct
 * @throws ZodError if validation fails
 */
export declare function validateCoreProductOrThrow(input: unknown): CoreProduct;
