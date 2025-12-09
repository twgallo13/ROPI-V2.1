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
    status: "draft" | "active" | "archived";
    createdAt: string;
    updatedAt: string;
    brand: string;
    sku: string;
    title: string;
    description?: string | undefined;
}, {
    status: "draft" | "active" | "archived";
    createdAt: string;
    updatedAt: string;
    brand: string;
    sku: string;
    title: string;
    description?: string | undefined;
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
    currency?: string | undefined;
    msrp?: number | undefined;
    cost?: number | undefined;
    retailPrice?: number | undefined;
}, {
    currency?: string | undefined;
    msrp?: number | undefined;
    cost?: number | undefined;
    retailPrice?: number | undefined;
}>>;
/**
 * ProductInventory schema
 */
export declare const ProductInventorySchema: z.ZodOptional<z.ZodObject<{
    quantity: z.ZodOptional<z.ZodNumber>;
    warehouse: z.ZodOptional<z.ZodString>;
    location: z.ZodOptional<z.ZodString>;
}, "strip", z.ZodTypeAny, {
    quantity?: number | undefined;
    warehouse?: string | undefined;
    location?: string | undefined;
}, {
    quantity?: number | undefined;
    warehouse?: string | undefined;
    location?: string | undefined;
}>>;
/**
 * ProductMedia schema
 */
export declare const ProductMediaSchema: z.ZodOptional<z.ZodObject<{
    images: z.ZodOptional<z.ZodArray<z.ZodString, "many">>;
    primaryImage: z.ZodOptional<z.ZodString>;
    videos: z.ZodOptional<z.ZodArray<z.ZodString, "many">>;
}, "strip", z.ZodTypeAny, {
    images?: string[] | undefined;
    primaryImage?: string | undefined;
    videos?: string[] | undefined;
}, {
    images?: string[] | undefined;
    primaryImage?: string | undefined;
    videos?: string[] | undefined;
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
        status: "draft" | "active" | "archived";
        createdAt: string;
        updatedAt: string;
        brand: string;
        sku: string;
        title: string;
        description?: string | undefined;
    }, {
        status: "draft" | "active" | "archived";
        createdAt: string;
        updatedAt: string;
        brand: string;
        sku: string;
        title: string;
        description?: string | undefined;
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
        currency?: string | undefined;
        msrp?: number | undefined;
        cost?: number | undefined;
        retailPrice?: number | undefined;
    }, {
        currency?: string | undefined;
        msrp?: number | undefined;
        cost?: number | undefined;
        retailPrice?: number | undefined;
    }>>;
    inventory: z.ZodOptional<z.ZodObject<{
        quantity: z.ZodOptional<z.ZodNumber>;
        warehouse: z.ZodOptional<z.ZodString>;
        location: z.ZodOptional<z.ZodString>;
    }, "strip", z.ZodTypeAny, {
        quantity?: number | undefined;
        warehouse?: string | undefined;
        location?: string | undefined;
    }, {
        quantity?: number | undefined;
        warehouse?: string | undefined;
        location?: string | undefined;
    }>>;
    media: z.ZodOptional<z.ZodObject<{
        images: z.ZodOptional<z.ZodArray<z.ZodString, "many">>;
        primaryImage: z.ZodOptional<z.ZodString>;
        videos: z.ZodOptional<z.ZodArray<z.ZodString, "many">>;
    }, "strip", z.ZodTypeAny, {
        images?: string[] | undefined;
        primaryImage?: string | undefined;
        videos?: string[] | undefined;
    }, {
        images?: string[] | undefined;
        primaryImage?: string | undefined;
        videos?: string[] | undefined;
    }>>;
    _meta: z.ZodOptional<z.ZodObject<{
        source: z.ZodOptional<z.ZodString>;
        importedAt: z.ZodOptional<z.ZodString>;
        normalizedAt: z.ZodOptional<z.ZodString>;
        validatedAt: z.ZodOptional<z.ZodString>;
    }, "strip", z.ZodTypeAny, {
        source?: string | undefined;
        importedAt?: string | undefined;
        normalizedAt?: string | undefined;
        validatedAt?: string | undefined;
    }, {
        source?: string | undefined;
        importedAt?: string | undefined;
        normalizedAt?: string | undefined;
        validatedAt?: string | undefined;
    }>>;
}, "strip", z.ZodTypeAny, {
    core: {
        status: "draft" | "active" | "archived";
        createdAt: string;
        updatedAt: string;
        brand: string;
        sku: string;
        title: string;
        description?: string | undefined;
    };
    attributes: {
        department?: string | undefined;
        class?: string | undefined;
        category?: string | undefined;
        subcategory?: string | undefined;
        gender?: string | undefined;
        ageGroup?: string | undefined;
        color?: string | undefined;
        size?: string | undefined;
        material?: string | undefined;
    } & {
        [k: string]: string | undefined;
    };
    pricing?: {
        currency?: string | undefined;
        msrp?: number | undefined;
        cost?: number | undefined;
        retailPrice?: number | undefined;
    } | undefined;
    inventory?: {
        quantity?: number | undefined;
        warehouse?: string | undefined;
        location?: string | undefined;
    } | undefined;
    media?: {
        images?: string[] | undefined;
        primaryImage?: string | undefined;
        videos?: string[] | undefined;
    } | undefined;
    _meta?: {
        source?: string | undefined;
        importedAt?: string | undefined;
        normalizedAt?: string | undefined;
        validatedAt?: string | undefined;
    } | undefined;
}, {
    core: {
        status: "draft" | "active" | "archived";
        createdAt: string;
        updatedAt: string;
        brand: string;
        sku: string;
        title: string;
        description?: string | undefined;
    };
    attributes: {
        department?: string | undefined;
        class?: string | undefined;
        category?: string | undefined;
        subcategory?: string | undefined;
        gender?: string | undefined;
        ageGroup?: string | undefined;
        color?: string | undefined;
        size?: string | undefined;
        material?: string | undefined;
    } & {
        [k: string]: string | undefined;
    };
    pricing?: {
        currency?: string | undefined;
        msrp?: number | undefined;
        cost?: number | undefined;
        retailPrice?: number | undefined;
    } | undefined;
    inventory?: {
        quantity?: number | undefined;
        warehouse?: string | undefined;
        location?: string | undefined;
    } | undefined;
    media?: {
        images?: string[] | undefined;
        primaryImage?: string | undefined;
        videos?: string[] | undefined;
    } | undefined;
    _meta?: {
        source?: string | undefined;
        importedAt?: string | undefined;
        normalizedAt?: string | undefined;
        validatedAt?: string | undefined;
    } | undefined;
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
//# sourceMappingURL=productValidator.d.ts.map