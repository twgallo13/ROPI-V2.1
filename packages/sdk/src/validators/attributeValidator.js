"use strict";
/**
 * Attribute Validator
 * Per AOSS Section 2.2 — Attribute Validation Schema (JSON)
 *
 * Runtime validation for attribute definitions and values using zod.
 */
Object.defineProperty(exports, "__esModule", { value: true });
exports.AttributeRegistrySchema = exports.AttributeValueSchema = exports.AttributeDefinitionSchema = exports.AttributeConstraintSchema = exports.AttributeDataTypeSchema = void 0;
exports.validateAttributeDefinition = validateAttributeDefinition;
exports.validateAttributeValue = validateAttributeValue;
exports.validateAttributeRegistry = validateAttributeRegistry;
exports.validateAttributes = validateAttributes;
exports.safeValidateAttributeDefinition = safeValidateAttributeDefinition;
const zod_1 = require("zod");
/**
 * AttributeDataType schema
 */
exports.AttributeDataTypeSchema = zod_1.z.enum([
    'string',
    'number',
    'boolean',
    'date',
    'array',
    'object',
]);
/**
 * AttributeConstraint schema
 */
exports.AttributeConstraintSchema = zod_1.z.object({
    type: zod_1.z.enum(['required', 'min', 'max', 'pattern', 'enum', 'range']),
    value: zod_1.z.any().optional(),
    message: zod_1.z.string().optional(),
    // TODO (AOSS): Add remaining constraint types from Section 2.2
});
/**
 * AttributeDefinition schema
 */
exports.AttributeDefinitionSchema = zod_1.z.object({
    key: zod_1.z.string().min(1, 'Attribute key is required'),
    label: zod_1.z.string().min(1, 'Attribute label is required'),
    dataType: exports.AttributeDataTypeSchema,
    required: zod_1.z.boolean().optional(),
    defaultValue: zod_1.z.any().optional(),
    allowedValues: zod_1.z.array(zod_1.z.string()).optional(),
    constraints: zod_1.z.array(exports.AttributeConstraintSchema).optional(),
    description: zod_1.z.string().optional(),
    category: zod_1.z.string().optional(),
    // TODO (AOSS): Add remaining fields from Section 2.2 schema
});
/**
 * AttributeValue schema
 */
exports.AttributeValueSchema = zod_1.z.object({
    key: zod_1.z.string().min(1, 'Attribute key is required'),
    value: zod_1.z.any(), // Required - the actual attribute value
    source: zod_1.z.string().optional(),
    confidence: zod_1.z.number().min(0).max(1).optional(),
    validatedAt: zod_1.z.string().datetime().optional(),
    // TODO (AOSS): Add remaining value metadata from Section 2.2
}).strict();
/**
 * AttributeRegistry schema
 */
exports.AttributeRegistrySchema = zod_1.z.object({
    attributes: zod_1.z.array(exports.AttributeDefinitionSchema),
    version: zod_1.z.string().optional(),
    updatedAt: zod_1.z.string().optional(),
    // TODO (AOSS): Add remaining registry metadata from Section 2.2
});
/**
 * Validate an attribute definition
 * @param input - Unvalidated input
 * @returns Validated AttributeDefinition
 * @throws ZodError if validation fails
 */
function validateAttributeDefinition(input) {
    return exports.AttributeDefinitionSchema.parse(input);
}
/**
 * Validate an attribute value
 * @param input - Unvalidated input
 * @returns Validated AttributeValue
 * @throws ZodError if validation fails
 */
function validateAttributeValue(input) {
    return exports.AttributeValueSchema.parse(input);
}
/**
 * Validate an attribute registry
 * @param input - Unvalidated input
 * @returns Validated AttributeRegistry
 * @throws ZodError if validation fails
 */
function validateAttributeRegistry(input) {
    return exports.AttributeRegistrySchema.parse(input);
}
/**
 * Validate multiple attribute definitions
 * @param input - Unvalidated input array
 * @returns Validated array of AttributeDefinition objects
 * @throws ZodError if validation fails
 */
function validateAttributes(input) {
    return zod_1.z.array(exports.AttributeDefinitionSchema).parse(input);
}
/**
 * Safe validate - returns success/error result
 * @param input - Unvalidated input
 * @returns Validation result with data or error
 */
function safeValidateAttributeDefinition(input) {
    return exports.AttributeDefinitionSchema.safeParse(input);
}
//# sourceMappingURL=attributeValidator.js.map