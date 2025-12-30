"use strict";
/**
 * Product Validator
 * Per AOSS Section 2.1 — Product Schema (JSON)
 * LP-attr-enforce-2.1.0 — Phase 2: Registry-based domain validation
 *
 * Runtime validation for product objects using zod.
 * Integrates with attributeRegistry.json for domain enforcement.
 */
Object.defineProperty(exports, "__esModule", { value: true });
exports.ProductSchema = exports.ProductMediaSchema = exports.ProductInventorySchema = exports.ProductPricingSchema = exports.ProductAttributesSchema = exports.ProductCoreSchema = void 0;
exports.validateProduct = validateProduct;
exports.safeValidateProduct = safeValidateProduct;
exports.validateProductWithDomains = validateProductWithDomains;
exports.validateAttributesOnly = validateAttributesOnly;
const zod_1 = require("zod");
const registry_1 = require("../registry");
/**
 * ProductCore schema - required fields for product identification
 */
exports.ProductCoreSchema = zod_1.z.object({
    sku: zod_1.z.string().min(1, 'SKU is required'),
    title: zod_1.z.string().min(1, 'Title is required'),
    brand: zod_1.z.string().min(1, 'Brand is required'),
    description: zod_1.z.string().optional(),
    status: zod_1.z.enum(['draft', 'active', 'archived']),
    createdAt: zod_1.z.string().datetime(),
    updatedAt: zod_1.z.string().datetime(),
    // TODO (AOSS): Add remaining core fields from Section 2.1 schema
});
/**
 * ProductAttributes schema - attribute key-value pairs
 */
exports.ProductAttributesSchema = zod_1.z.object({
    department: zod_1.z.string().optional(),
    class: zod_1.z.string().optional(),
    category: zod_1.z.string().optional(),
    subcategory: zod_1.z.string().optional(),
    gender: zod_1.z.string().optional(),
    ageGroup: zod_1.z.string().optional(),
    color: zod_1.z.string().optional(),
    size: zod_1.z.string().optional(),
    material: zod_1.z.string().optional(),
    // TODO (AOSS): Add remaining attributes from Section 2.1 and Attribute Registry
}).catchall(zod_1.z.string().optional()); // Allow additional dynamic attributes
/**
 * ProductPricing schema
 */
exports.ProductPricingSchema = zod_1.z.object({
    msrp: zod_1.z.number().positive().optional(),
    cost: zod_1.z.number().positive().optional(),
    retailPrice: zod_1.z.number().positive().optional(),
    currency: zod_1.z.string().optional(),
    // TODO (AOSS): Add remaining pricing fields from Section 2.1 schema
}).optional();
/**
 * ProductInventory schema
 */
exports.ProductInventorySchema = zod_1.z.object({
    quantity: zod_1.z.number().int().min(0).optional(),
    warehouse: zod_1.z.string().optional(),
    location: zod_1.z.string().optional(),
    // TODO (AOSS): Add remaining inventory fields from Section 2.1 schema
}).optional();
/**
 * ProductMedia schema
 */
exports.ProductMediaSchema = zod_1.z.object({
    images: zod_1.z.array(zod_1.z.string().url()).optional(),
    primaryImage: zod_1.z.string().url().optional(),
    videos: zod_1.z.array(zod_1.z.string().url()).optional(),
    // TODO (AOSS): Add remaining media fields from Section 2.1 schema
}).optional();
/**
 * Complete Product schema
 */
exports.ProductSchema = zod_1.z.object({
    core: exports.ProductCoreSchema,
    attributes: exports.ProductAttributesSchema,
    pricing: exports.ProductPricingSchema,
    inventory: exports.ProductInventorySchema,
    media: exports.ProductMediaSchema,
    // Metadata for import/normalization tracking
    _meta: zod_1.z.object({
        source: zod_1.z.string().optional(),
        importedAt: zod_1.z.string().datetime().optional(),
        normalizedAt: zod_1.z.string().datetime().optional(),
        validatedAt: zod_1.z.string().datetime().optional(),
    }).optional(),
    // TODO (AOSS): Add remaining top-level fields from Section 2.1 schema
});
/**
 * Validate a product object
 * @param input - Unvalidated input
 * @returns Validated Product object
 * @throws ZodError if validation fails
 */
function validateProduct(input) {
    return exports.ProductSchema.parse(input);
}
/**
 * Safe validate - returns success/error result
 * @param input - Unvalidated input
 * @returns Validation result with data or error
 */
function safeValidateProduct(input) {
    return exports.ProductSchema.safeParse(input);
}
/**
 * Validate product with full domain enforcement
 *
 * Performs two-phase validation:
 * 1. Zod schema validation (structure and types)
 * 2. Domain validation (allowed_values from attributeRegistry)
 *
 * @param input - Unvalidated input
 * @returns Validation result with both schema and domain errors
 */
function validateProductWithDomains(input) {
    // Phase 1: Schema validation
    const schemaResult = exports.ProductSchema.safeParse(input);
    if (!schemaResult.success) {
        return {
            success: false,
            schemaErrors: schemaResult.error,
            domainErrors: [],
        };
    }
    // Phase 2: Domain validation on attributes
    const product = schemaResult.data;
    const domainErrors = (0, registry_1.validateAttributeDomains)(product.attributes || {});
    if (domainErrors.length > 0) {
        return {
            success: false,
            data: product,
            domainErrors,
        };
    }
    return {
        success: true,
        data: product,
        domainErrors: [],
    };
}
/**
 * Validate only the attributes object against domain constraints
 *
 * Use this for quick validation of attribute values without full product validation.
 *
 * @param attributes - Object with attribute_id keys and values
 * @returns Array of domain validation errors (empty if all valid)
 */
function validateAttributesOnly(attributes) {
    return (0, registry_1.validateAttributeDomains)(attributes);
}
//# sourceMappingURL=productValidator.js.map