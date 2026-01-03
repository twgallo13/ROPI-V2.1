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
    value?: any;
    message?: string;
    type?: "enum" | "min" | "max" | "required" | "pattern" | "range";
}, {
    value?: any;
    message?: string;
    type?: "enum" | "min" | "max" | "required" | "pattern" | "range";
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
        value?: any;
        message?: string;
        type?: "enum" | "min" | "max" | "required" | "pattern" | "range";
    }, {
        value?: any;
        message?: string;
        type?: "enum" | "min" | "max" | "required" | "pattern" | "range";
    }>, "many">>;
    description: z.ZodOptional<z.ZodString>;
    category: z.ZodOptional<z.ZodString>;
}, "strip", z.ZodTypeAny, {
    key?: string;
    label?: string;
    category?: string;
    required?: boolean;
    dataType?: "string" | "number" | "boolean" | "object" | "date" | "array";
    defaultValue?: any;
    allowedValues?: string[];
    constraints?: {
        value?: any;
        message?: string;
        type?: "enum" | "min" | "max" | "required" | "pattern" | "range";
    }[];
    description?: string;
}, {
    key?: string;
    label?: string;
    category?: string;
    required?: boolean;
    dataType?: "string" | "number" | "boolean" | "object" | "date" | "array";
    defaultValue?: any;
    allowedValues?: string[];
    constraints?: {
        value?: any;
        message?: string;
        type?: "enum" | "min" | "max" | "required" | "pattern" | "range";
    }[];
    description?: string;
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
    key?: string;
    value?: any;
    source?: string;
    confidence?: number;
    validatedAt?: string;
}, {
    key?: string;
    value?: any;
    source?: string;
    confidence?: number;
    validatedAt?: string;
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
            value?: any;
            message?: string;
            type?: "enum" | "min" | "max" | "required" | "pattern" | "range";
        }, {
            value?: any;
            message?: string;
            type?: "enum" | "min" | "max" | "required" | "pattern" | "range";
        }>, "many">>;
        description: z.ZodOptional<z.ZodString>;
        category: z.ZodOptional<z.ZodString>;
    }, "strip", z.ZodTypeAny, {
        key?: string;
        label?: string;
        category?: string;
        required?: boolean;
        dataType?: "string" | "number" | "boolean" | "object" | "date" | "array";
        defaultValue?: any;
        allowedValues?: string[];
        constraints?: {
            value?: any;
            message?: string;
            type?: "enum" | "min" | "max" | "required" | "pattern" | "range";
        }[];
        description?: string;
    }, {
        key?: string;
        label?: string;
        category?: string;
        required?: boolean;
        dataType?: "string" | "number" | "boolean" | "object" | "date" | "array";
        defaultValue?: any;
        allowedValues?: string[];
        constraints?: {
            value?: any;
            message?: string;
            type?: "enum" | "min" | "max" | "required" | "pattern" | "range";
        }[];
        description?: string;
    }>, "many">;
    version: z.ZodOptional<z.ZodString>;
    updatedAt: z.ZodOptional<z.ZodString>;
}, "strip", z.ZodTypeAny, {
    updatedAt?: string;
    attributes?: {
        key?: string;
        label?: string;
        category?: string;
        required?: boolean;
        dataType?: "string" | "number" | "boolean" | "object" | "date" | "array";
        defaultValue?: any;
        allowedValues?: string[];
        constraints?: {
            value?: any;
            message?: string;
            type?: "enum" | "min" | "max" | "required" | "pattern" | "range";
        }[];
        description?: string;
    }[];
    version?: string;
}, {
    updatedAt?: string;
    attributes?: {
        key?: string;
        label?: string;
        category?: string;
        required?: boolean;
        dataType?: "string" | "number" | "boolean" | "object" | "date" | "array";
        defaultValue?: any;
        allowedValues?: string[];
        constraints?: {
            value?: any;
            message?: string;
            type?: "enum" | "min" | "max" | "required" | "pattern" | "range";
        }[];
        description?: string;
    }[];
    version?: string;
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
