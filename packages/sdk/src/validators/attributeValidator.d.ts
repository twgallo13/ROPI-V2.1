/**
 * Attribute Validator
 * Per AOSS Section 2.2 — Attribute Validation Schema (JSON)
 *
 * Runtime validation for attribute definitions and values using zod.
 */
import { z } from 'zod';
import type { AttributeDefinition, AttributeValue, AttributeRegistry } from '../schema/attribute';
/**
 * AttributeDataType schema
 */
export declare const AttributeDataTypeSchema: z.ZodEnum<["string", "number", "boolean", "date", "array", "object"]>;
/**
 * AttributeConstraint schema
 */
export declare const AttributeConstraintSchema: z.ZodObject<{
    type: z.ZodEnum<["required", "min", "max", "pattern", "enum", "range"]>;
    value: z.ZodOptional<z.ZodAny>;
    message: z.ZodOptional<z.ZodString>;
}, "strip", z.ZodTypeAny, {
    type: "enum" | "range" | "required" | "min" | "max" | "pattern";
    value?: any;
    message?: string | undefined;
}, {
    type: "enum" | "range" | "required" | "min" | "max" | "pattern";
    value?: any;
    message?: string | undefined;
}>;
/**
 * AttributeDefinition schema
 */
export declare const AttributeDefinitionSchema: z.ZodObject<{
    key: z.ZodString;
    label: z.ZodString;
    dataType: z.ZodEnum<["string", "number", "boolean", "date", "array", "object"]>;
    required: z.ZodOptional<z.ZodBoolean>;
    defaultValue: z.ZodOptional<z.ZodAny>;
    allowedValues: z.ZodOptional<z.ZodArray<z.ZodString, "many">>;
    constraints: z.ZodOptional<z.ZodArray<z.ZodObject<{
        type: z.ZodEnum<["required", "min", "max", "pattern", "enum", "range"]>;
        value: z.ZodOptional<z.ZodAny>;
        message: z.ZodOptional<z.ZodString>;
    }, "strip", z.ZodTypeAny, {
        type: "enum" | "range" | "required" | "min" | "max" | "pattern";
        value?: any;
        message?: string | undefined;
    }, {
        type: "enum" | "range" | "required" | "min" | "max" | "pattern";
        value?: any;
        message?: string | undefined;
    }>, "many">>;
    description: z.ZodOptional<z.ZodString>;
    category: z.ZodOptional<z.ZodString>;
}, "strip", z.ZodTypeAny, {
    label: string;
    key: string;
    dataType: "string" | "number" | "boolean" | "object" | "date" | "array";
    category?: string | undefined;
    description?: string | undefined;
    required?: boolean | undefined;
    defaultValue?: any;
    allowedValues?: string[] | undefined;
    constraints?: {
        type: "enum" | "range" | "required" | "min" | "max" | "pattern";
        value?: any;
        message?: string | undefined;
    }[] | undefined;
}, {
    label: string;
    key: string;
    dataType: "string" | "number" | "boolean" | "object" | "date" | "array";
    category?: string | undefined;
    description?: string | undefined;
    required?: boolean | undefined;
    defaultValue?: any;
    allowedValues?: string[] | undefined;
    constraints?: {
        type: "enum" | "range" | "required" | "min" | "max" | "pattern";
        value?: any;
        message?: string | undefined;
    }[] | undefined;
}>;
/**
 * AttributeValue schema
 */
export declare const AttributeValueSchema: z.ZodObject<{
    key: z.ZodString;
    value: z.ZodAny;
    source: z.ZodOptional<z.ZodString>;
    confidence: z.ZodOptional<z.ZodNumber>;
    validatedAt: z.ZodOptional<z.ZodString>;
}, "strict", z.ZodTypeAny, {
    key: string;
    value?: any;
    source?: string | undefined;
    validatedAt?: string | undefined;
    confidence?: number | undefined;
}, {
    key: string;
    value?: any;
    source?: string | undefined;
    validatedAt?: string | undefined;
    confidence?: number | undefined;
}>;
/**
 * AttributeRegistry schema
 */
export declare const AttributeRegistrySchema: z.ZodObject<{
    attributes: z.ZodArray<z.ZodObject<{
        key: z.ZodString;
        label: z.ZodString;
        dataType: z.ZodEnum<["string", "number", "boolean", "date", "array", "object"]>;
        required: z.ZodOptional<z.ZodBoolean>;
        defaultValue: z.ZodOptional<z.ZodAny>;
        allowedValues: z.ZodOptional<z.ZodArray<z.ZodString, "many">>;
        constraints: z.ZodOptional<z.ZodArray<z.ZodObject<{
            type: z.ZodEnum<["required", "min", "max", "pattern", "enum", "range"]>;
            value: z.ZodOptional<z.ZodAny>;
            message: z.ZodOptional<z.ZodString>;
        }, "strip", z.ZodTypeAny, {
            type: "enum" | "range" | "required" | "min" | "max" | "pattern";
            value?: any;
            message?: string | undefined;
        }, {
            type: "enum" | "range" | "required" | "min" | "max" | "pattern";
            value?: any;
            message?: string | undefined;
        }>, "many">>;
        description: z.ZodOptional<z.ZodString>;
        category: z.ZodOptional<z.ZodString>;
    }, "strip", z.ZodTypeAny, {
        label: string;
        key: string;
        dataType: "string" | "number" | "boolean" | "object" | "date" | "array";
        category?: string | undefined;
        description?: string | undefined;
        required?: boolean | undefined;
        defaultValue?: any;
        allowedValues?: string[] | undefined;
        constraints?: {
            type: "enum" | "range" | "required" | "min" | "max" | "pattern";
            value?: any;
            message?: string | undefined;
        }[] | undefined;
    }, {
        label: string;
        key: string;
        dataType: "string" | "number" | "boolean" | "object" | "date" | "array";
        category?: string | undefined;
        description?: string | undefined;
        required?: boolean | undefined;
        defaultValue?: any;
        allowedValues?: string[] | undefined;
        constraints?: {
            type: "enum" | "range" | "required" | "min" | "max" | "pattern";
            value?: any;
            message?: string | undefined;
        }[] | undefined;
    }>, "many">;
    version: z.ZodOptional<z.ZodString>;
    updatedAt: z.ZodOptional<z.ZodString>;
}, "strip", z.ZodTypeAny, {
    attributes: {
        label: string;
        key: string;
        dataType: "string" | "number" | "boolean" | "object" | "date" | "array";
        category?: string | undefined;
        description?: string | undefined;
        required?: boolean | undefined;
        defaultValue?: any;
        allowedValues?: string[] | undefined;
        constraints?: {
            type: "enum" | "range" | "required" | "min" | "max" | "pattern";
            value?: any;
            message?: string | undefined;
        }[] | undefined;
    }[];
    updatedAt?: string | undefined;
    version?: string | undefined;
}, {
    attributes: {
        label: string;
        key: string;
        dataType: "string" | "number" | "boolean" | "object" | "date" | "array";
        category?: string | undefined;
        description?: string | undefined;
        required?: boolean | undefined;
        defaultValue?: any;
        allowedValues?: string[] | undefined;
        constraints?: {
            type: "enum" | "range" | "required" | "min" | "max" | "pattern";
            value?: any;
            message?: string | undefined;
        }[] | undefined;
    }[];
    updatedAt?: string | undefined;
    version?: string | undefined;
}>;
/**
 * Validate an attribute definition
 * @param input - Unvalidated input
 * @returns Validated AttributeDefinition
 * @throws ZodError if validation fails
 */
export declare function validateAttributeDefinition(input: unknown): AttributeDefinition;
/**
 * Validate an attribute value
 * @param input - Unvalidated input
 * @returns Validated AttributeValue
 * @throws ZodError if validation fails
 */
export declare function validateAttributeValue(input: unknown): AttributeValue;
/**
 * Validate an attribute registry
 * @param input - Unvalidated input
 * @returns Validated AttributeRegistry
 * @throws ZodError if validation fails
 */
export declare function validateAttributeRegistry(input: unknown): AttributeRegistry;
/**
 * Validate multiple attribute definitions
 * @param input - Unvalidated input array
 * @returns Validated array of AttributeDefinition objects
 * @throws ZodError if validation fails
 */
export declare function validateAttributes(input: unknown): AttributeDefinition[];
/**
 * Safe validate - returns success/error result
 * @param input - Unvalidated input
 * @returns Validation result with data or error
 */
export declare function safeValidateAttributeDefinition(input: unknown): z.SafeParseReturnType<unknown, AttributeDefinition>;
//# sourceMappingURL=attributeValidator.d.ts.map