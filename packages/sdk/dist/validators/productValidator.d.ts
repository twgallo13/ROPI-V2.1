/**
 * Product Validator
 * Per AOSS Section 2.1 — Product Schema (JSON)
 *
 * Runtime validation for product objects using zod.
 */
import { z } from 'zod';
import type { Product } from '../schema/product';
/**
 * ProductCore schema - required fields for product identification
 */
export declare const ProductCoreSchema: z.ZodObject<{
    sku: z.ZodString;
    title: z.ZodString;
    brand: z.ZodString;
    description: z.ZodOptional<z.ZodString>;
    status: z.ZodEnum<["draft", "active", "archived"]>;
    createdAt: z.ZodString;
    updatedAt: z.ZodString;
}, "strip", z.ZodTypeAny, {
    status?: "draft" | "active" | "archived";
    createdAt?: string;
    updatedAt?: string;
    brand?: string;
    sku?: string;
    title?: string;
    description?: string;
}, {
    status?: "draft" | "active" | "archived";
    createdAt?: string;
    updatedAt?: string;
    brand?: string;
    sku?: string;
    title?: string;
    description?: string;
}>;
/**
 * ProductAttributes schema - attribute key-value pairs
 */
export declare const ProductAttributesSchema: z.ZodObject<{
    department: z.ZodOptional<z.ZodString>;
    class: z.ZodOptional<z.ZodString>;
    category: z.ZodOptional<z.ZodString>;
    subcategory: z.ZodOptional<z.ZodString>;
    gender: z.ZodOptional<z.ZodString>;
    ageGroup: z.ZodOptional<z.ZodString>;
    color: z.ZodOptional<z.ZodString>;
    size: z.ZodOptional<z.ZodString>;
    material: z.ZodOptional<z.ZodString>;
}, "strip", z.ZodOptional<z.ZodString>, z.objectOutputType<{
    department: z.ZodOptional<z.ZodString>;
    class: z.ZodOptional<z.ZodString>;
    category: z.ZodOptional<z.ZodString>;
    subcategory: z.ZodOptional<z.ZodString>;
    gender: z.ZodOptional<z.ZodString>;
    ageGroup: z.ZodOptional<z.ZodString>;
    color: z.ZodOptional<z.ZodString>;
    size: z.ZodOptional<z.ZodString>;
    material: z.ZodOptional<z.ZodString>;
}, z.ZodOptional<z.ZodString>, "strip">, z.objectInputType<{
    department: z.ZodOptional<z.ZodString>;
    class: z.ZodOptional<z.ZodString>;
    category: z.ZodOptional<z.ZodString>;
    subcategory: z.ZodOptional<z.ZodString>;
    gender: z.ZodOptional<z.ZodString>;
    ageGroup: z.ZodOptional<z.ZodString>;
    color: z.ZodOptional<z.ZodString>;
    size: z.ZodOptional<z.ZodString>;
    material: z.ZodOptional<z.ZodString>;
}, z.ZodOptional<z.ZodString>, "strip">>;
/**
 * ProductPricing schema
 */
export declare const ProductPricingSchema: z.ZodOptional<z.ZodObject<{
    msrp: z.ZodOptional<z.ZodNumber>;
    cost: z.ZodOptional<z.ZodNumber>;
    retailPrice: z.ZodOptional<z.ZodNumber>;
    currency: z.ZodOptional<z.ZodString>;
}, "strip", z.ZodTypeAny, {
    currency?: string;
    msrp?: number;
    cost?: number;
    retailPrice?: number;
}, {
    currency?: string;
    msrp?: number;
    cost?: number;
    retailPrice?: number;
}>>;
/**
 * ProductInventory schema
 */
export declare const ProductInventorySchema: z.ZodOptional<z.ZodObject<{
    quantity: z.ZodOptional<z.ZodNumber>;
    warehouse: z.ZodOptional<z.ZodString>;
    location: z.ZodOptional<z.ZodString>;
}, "strip", z.ZodTypeAny, {
    quantity?: number;
    warehouse?: string;
    location?: string;
}, {
    quantity?: number;
    warehouse?: string;
    location?: string;
}>>;
/**
 * ProductMedia schema
 */
export declare const ProductMediaSchema: z.ZodOptional<z.ZodObject<{
    images: z.ZodOptional<z.ZodArray<z.ZodString, "many">>;
    primaryImage: z.ZodOptional<z.ZodString>;
    videos: z.ZodOptional<z.ZodArray<z.ZodString, "many">>;
}, "strip", z.ZodTypeAny, {
    images?: string[];
    primaryImage?: string;
    videos?: string[];
}, {
    images?: string[];
    primaryImage?: string;
    videos?: string[];
}>>;
/**
 * Complete Product schema
 */
export declare const ProductSchema: z.ZodObject<{
    core: z.ZodObject<{
        sku: z.ZodString;
        title: z.ZodString;
        brand: z.ZodString;
        description: z.ZodOptional<z.ZodString>;
        status: z.ZodEnum<["draft", "active", "archived"]>;
        createdAt: z.ZodString;
        updatedAt: z.ZodString;
    }, "strip", z.ZodTypeAny, {
        status?: "draft" | "active" | "archived";
        createdAt?: string;
        updatedAt?: string;
        brand?: string;
        sku?: string;
        title?: string;
        description?: string;
    }, {
        status?: "draft" | "active" | "archived";
        createdAt?: string;
        updatedAt?: string;
        brand?: string;
        sku?: string;
        title?: string;
        description?: string;
    }>;
    attributes: z.ZodObject<{
        department: z.ZodOptional<z.ZodString>;
        class: z.ZodOptional<z.ZodString>;
        category: z.ZodOptional<z.ZodString>;
        subcategory: z.ZodOptional<z.ZodString>;
        gender: z.ZodOptional<z.ZodString>;
        ageGroup: z.ZodOptional<z.ZodString>;
        color: z.ZodOptional<z.ZodString>;
        size: z.ZodOptional<z.ZodString>;
        material: z.ZodOptional<z.ZodString>;
    }, "strip", z.ZodOptional<z.ZodString>, z.objectOutputType<{
        department: z.ZodOptional<z.ZodString>;
        class: z.ZodOptional<z.ZodString>;
        category: z.ZodOptional<z.ZodString>;
        subcategory: z.ZodOptional<z.ZodString>;
        gender: z.ZodOptional<z.ZodString>;
        ageGroup: z.ZodOptional<z.ZodString>;
        color: z.ZodOptional<z.ZodString>;
        size: z.ZodOptional<z.ZodString>;
        material: z.ZodOptional<z.ZodString>;
    }, z.ZodOptional<z.ZodString>, "strip">, z.objectInputType<{
        department: z.ZodOptional<z.ZodString>;
        class: z.ZodOptional<z.ZodString>;
        category: z.ZodOptional<z.ZodString>;
        subcategory: z.ZodOptional<z.ZodString>;
        gender: z.ZodOptional<z.ZodString>;
        ageGroup: z.ZodOptional<z.ZodString>;
        color: z.ZodOptional<z.ZodString>;
        size: z.ZodOptional<z.ZodString>;
        material: z.ZodOptional<z.ZodString>;
    }, z.ZodOptional<z.ZodString>, "strip">>;
    pricing: z.ZodOptional<z.ZodObject<{
        msrp: z.ZodOptional<z.ZodNumber>;
        cost: z.ZodOptional<z.ZodNumber>;
        retailPrice: z.ZodOptional<z.ZodNumber>;
        currency: z.ZodOptional<z.ZodString>;
    }, "strip", z.ZodTypeAny, {
        currency?: string;
        msrp?: number;
        cost?: number;
        retailPrice?: number;
    }, {
        currency?: string;
        msrp?: number;
        cost?: number;
        retailPrice?: number;
    }>>;
    inventory: z.ZodOptional<z.ZodObject<{
        quantity: z.ZodOptional<z.ZodNumber>;
        warehouse: z.ZodOptional<z.ZodString>;
        location: z.ZodOptional<z.ZodString>;
    }, "strip", z.ZodTypeAny, {
        quantity?: number;
        warehouse?: string;
        location?: string;
    }, {
        quantity?: number;
        warehouse?: string;
        location?: string;
    }>>;
    media: z.ZodOptional<z.ZodObject<{
        images: z.ZodOptional<z.ZodArray<z.ZodString, "many">>;
        primaryImage: z.ZodOptional<z.ZodString>;
        videos: z.ZodOptional<z.ZodArray<z.ZodString, "many">>;
    }, "strip", z.ZodTypeAny, {
        images?: string[];
        primaryImage?: string;
        videos?: string[];
    }, {
        images?: string[];
        primaryImage?: string;
        videos?: string[];
    }>>;
    _meta: z.ZodOptional<z.ZodObject<{
        source: z.ZodOptional<z.ZodString>;
        importedAt: z.ZodOptional<z.ZodString>;
        normalizedAt: z.ZodOptional<z.ZodString>;
        validatedAt: z.ZodOptional<z.ZodString>;
    }, "strip", z.ZodTypeAny, {
        source?: string;
        importedAt?: string;
        normalizedAt?: string;
        validatedAt?: string;
    }, {
        source?: string;
        importedAt?: string;
        normalizedAt?: string;
        validatedAt?: string;
    }>>;
}, "strip", z.ZodTypeAny, {
    core?: {
        status?: "draft" | "active" | "archived";
        createdAt?: string;
        updatedAt?: string;
        brand?: string;
        sku?: string;
        title?: string;
        description?: string;
    };
    attributes?: {
        department?: string;
        class?: string;
        category?: string;
        subcategory?: string;
        gender?: string;
        ageGroup?: string;
        color?: string;
        size?: string;
        material?: string;
    } & {
        [k: string]: string;
    };
    pricing?: {
        currency?: string;
        msrp?: number;
        cost?: number;
        retailPrice?: number;
    };
    inventory?: {
        quantity?: number;
        warehouse?: string;
        location?: string;
    };
    media?: {
        images?: string[];
        primaryImage?: string;
        videos?: string[];
    };
    _meta?: {
        source?: string;
        importedAt?: string;
        normalizedAt?: string;
        validatedAt?: string;
    };
}, {
    core?: {
        status?: "draft" | "active" | "archived";
        createdAt?: string;
        updatedAt?: string;
        brand?: string;
        sku?: string;
        title?: string;
        description?: string;
    };
    attributes?: {
        department?: string;
        class?: string;
        category?: string;
        subcategory?: string;
        gender?: string;
        ageGroup?: string;
        color?: string;
        size?: string;
        material?: string;
    } & {
        [k: string]: string;
    };
    pricing?: {
        currency?: string;
        msrp?: number;
        cost?: number;
        retailPrice?: number;
    };
    inventory?: {
        quantity?: number;
        warehouse?: string;
        location?: string;
    };
    media?: {
        images?: string[];
        primaryImage?: string;
        videos?: string[];
    };
    _meta?: {
        source?: string;
        importedAt?: string;
        normalizedAt?: string;
        validatedAt?: string;
    };
}>;
/**
 * Validate a product object
 * @param input - Unvalidated input
 * @returns Validated Product object
 * @throws ZodError if validation fails
 */
export declare function validateProduct(input: unknown): Product;
/**
 * Safe validate - returns success/error result
 * @param input - Unvalidated input
 * @returns Validation result with data or error
 */
export declare function safeValidateProduct(input: unknown): z.SafeParseReturnType<unknown, Product>;
