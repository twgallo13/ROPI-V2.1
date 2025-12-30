"use strict";
/**
 * Core Product Schema
 * Per AOSS Section 2.1 — Product Schema (JSON)
 * Version: aoss.v0.4.0
 *
 * This module provides the canonical Product type and validation for Nike men's footwear (MVP).
 * The schema is defined in /schemas/product.schema.json and exposed here with TypeScript types.
 */
Object.defineProperty(exports, "__esModule", { value: true });
exports.CoreProductSchema = exports.ProductMetaSchema = exports.ProductFlagsSchema = exports.ProductImageSchema = exports.productJsonSchema = void 0;
exports.validateCoreProduct = validateCoreProduct;
exports.validateCoreProductOrThrow = validateCoreProductOrThrow;
const zod_1 = require("zod");
/**
 * JSON Schema for the canonical Product object
 * Mirrors /schemas/product.schema.json
 */
exports.productJsonSchema = {
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
};
// ============================================================================
// Zod Schemas for Runtime Validation
// ============================================================================
/**
 * Zod schema for ProductImage
 */
exports.ProductImageSchema = zod_1.z.object({
    url: zod_1.z.string().url('Image URL must be a valid URL'),
    alt: zod_1.z.string().optional(),
    isPrimary: zod_1.z.boolean().optional(),
});
/**
 * Zod schema for ProductFlags
 */
exports.ProductFlagsSchema = zod_1.z.object({
    isOutlet: zod_1.z.boolean().optional(),
    isOnlineExclusive: zod_1.z.boolean().optional(),
    isLimited: zod_1.z.boolean().optional(),
});
/**
 * Zod schema for ProductMeta
 */
exports.ProductMetaSchema = zod_1.z.record(zod_1.z.string(), zod_1.z.string());
/**
 * Zod schema for CoreProduct
 * Validates the canonical product structure for Nike men's footwear (MVP)
 */
exports.CoreProductSchema = zod_1.z.object({
    id: zod_1.z.string().min(1, 'ID is required'),
    sku: zod_1.z.string().min(1, 'SKU is required'),
    styleCode: zod_1.z.string().regex(/^[A-Z0-9]+-[A-Z0-9]+$/, 'Style code must match pattern like DZ5485-410'),
    brand: zod_1.z.enum(['NIKE', 'JORDAN']),
    gender: zod_1.z.enum(['MEN']),
    category: zod_1.z.enum(['FOOTWEAR']),
    class: zod_1.z.string().min(1, 'Class is required'),
    colorPrimary: zod_1.z.string().min(1, 'Primary color is required'),
    colorSecondary: zod_1.z.string().optional(),
    sizeScale: zod_1.z.enum(['MENS_US']),
    msrp: zod_1.z.number().min(0, 'MSRP must be non-negative'),
    price: zod_1.z.number().min(0, 'Price must be non-negative'),
    launchDate: zod_1.z.string().datetime('Launch date must be ISO 8601 format'),
    season: zod_1.z.string().optional(),
    status: zod_1.z.enum(['DRAFT', 'READY_FOR_EXPORT', 'DISCONTINUED']),
    images: zod_1.z.array(exports.ProductImageSchema),
    flags: exports.ProductFlagsSchema.optional(),
    meta: exports.ProductMetaSchema.optional(),
});
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
function validateCoreProduct(input) {
    const result = exports.CoreProductSchema.safeParse(input);
    if (result.success) {
        return { ok: true, value: result.data };
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
function validateCoreProductOrThrow(input) {
    return exports.CoreProductSchema.parse(input);
}
//# sourceMappingURL=coreProduct.js.map