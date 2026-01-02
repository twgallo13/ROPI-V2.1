/**
 * Smart Rule Schema
 * Canonical Zod schema for Smart Rules validation
 * Version: LP-smart-rules-schema-1.0.0
 *
 * This is the SINGLE SOURCE OF TRUTH for SmartRule validation.
 * Used by both client (UI pre-submit) and server (write validation).
 *
 * Key invariants:
 * - condition.options MUST be an object (default {}), never undefined
 * - description MUST default to ''
 * - tags MUST default to []
 * - No undefined values allowed in Firestore payloads
 */
import { z } from 'zod';
/**
 * Supported match types for rule conditions
 */
export declare const MatchTypeEnum: z.ZodEnum<["equals", "notEquals", "contains", "notContains", "startsWith", "endsWith", "regex", "greaterThan", "lessThan", "in", "notIn", "exists", "notExists", "token", "phrase", "and", "or", "not"]>;
export type MatchType = z.infer<typeof MatchTypeEnum>;
/**
 * Single rule condition
 */
export declare const SmartRuleCondition: z.ZodObject<{
    field: z.ZodString;
    matchType: z.ZodEnum<["equals", "notEquals", "contains", "notContains", "startsWith", "endsWith", "regex", "greaterThan", "lessThan", "in", "notIn", "exists", "notExists", "token", "phrase", "and", "or", "not"]>;
    value: z.ZodDefault<z.ZodUnion<[z.ZodString, z.ZodNumber, z.ZodArray<z.ZodString, "many">]>>;
    options: z.ZodDefault<z.ZodRecord<z.ZodString, z.ZodAny>>;
}, "strip", z.ZodTypeAny, {
    value?: string | number | string[];
    options?: Record<string, any>;
    field?: string;
    matchType?: "endsWith" | "startsWith" | "contains" | "regex" | "or" | "and" | "in" | "equals" | "notEquals" | "notContains" | "greaterThan" | "lessThan" | "notIn" | "exists" | "notExists" | "token" | "phrase" | "not";
}, {
    value?: string | number | string[];
    options?: Record<string, any>;
    field?: string;
    matchType?: "endsWith" | "startsWith" | "contains" | "regex" | "or" | "and" | "in" | "equals" | "notEquals" | "notContains" | "greaterThan" | "lessThan" | "notIn" | "exists" | "notExists" | "token" | "phrase" | "not";
}>;
export type RuleCondition = z.infer<typeof SmartRuleCondition>;
/**
 * Rule action (what happens when condition matches)
 */
export declare const SmartRuleAction: z.ZodObject<{
    targetField: z.ZodString;
    valueTemplate: z.ZodDefault<z.ZodString>;
    confidenceModifier: z.ZodOptional<z.ZodNumber>;
}, "strip", z.ZodTypeAny, {
    targetField?: string;
    valueTemplate?: string;
    confidenceModifier?: number;
}, {
    targetField?: string;
    valueTemplate?: string;
    confidenceModifier?: number;
}>;
export type RuleAction = z.infer<typeof SmartRuleAction>;
/**
 * Complete SmartRule schema with all fields properly defaulted
 *
 * Ensures:
 * - No undefined values in output
 * - All optional fields have sensible defaults
 * - Server-side validation will use this exact schema
 */
export declare const SmartRuleSchema: z.ZodObject<{
    ruleId: z.ZodString;
    name: z.ZodString;
    description: z.ZodDefault<z.ZodString>;
    enabled: z.ZodDefault<z.ZodBoolean>;
    priority: z.ZodDefault<z.ZodNumber>;
    condition: z.ZodUnion<[z.ZodObject<{
        field: z.ZodString;
        matchType: z.ZodEnum<["equals", "notEquals", "contains", "notContains", "startsWith", "endsWith", "regex", "greaterThan", "lessThan", "in", "notIn", "exists", "notExists", "token", "phrase", "and", "or", "not"]>;
        value: z.ZodDefault<z.ZodUnion<[z.ZodString, z.ZodNumber, z.ZodArray<z.ZodString, "many">]>>;
        options: z.ZodDefault<z.ZodRecord<z.ZodString, z.ZodAny>>;
    }, "strip", z.ZodTypeAny, {
        value?: string | number | string[];
        options?: Record<string, any>;
        field?: string;
        matchType?: "endsWith" | "startsWith" | "contains" | "regex" | "or" | "and" | "in" | "equals" | "notEquals" | "notContains" | "greaterThan" | "lessThan" | "notIn" | "exists" | "notExists" | "token" | "phrase" | "not";
    }, {
        value?: string | number | string[];
        options?: Record<string, any>;
        field?: string;
        matchType?: "endsWith" | "startsWith" | "contains" | "regex" | "or" | "and" | "in" | "equals" | "notEquals" | "notContains" | "greaterThan" | "lessThan" | "notIn" | "exists" | "notExists" | "token" | "phrase" | "not";
    }>, z.ZodArray<z.ZodObject<{
        field: z.ZodString;
        matchType: z.ZodEnum<["equals", "notEquals", "contains", "notContains", "startsWith", "endsWith", "regex", "greaterThan", "lessThan", "in", "notIn", "exists", "notExists", "token", "phrase", "and", "or", "not"]>;
        value: z.ZodDefault<z.ZodUnion<[z.ZodString, z.ZodNumber, z.ZodArray<z.ZodString, "many">]>>;
        options: z.ZodDefault<z.ZodRecord<z.ZodString, z.ZodAny>>;
    }, "strip", z.ZodTypeAny, {
        value?: string | number | string[];
        options?: Record<string, any>;
        field?: string;
        matchType?: "endsWith" | "startsWith" | "contains" | "regex" | "or" | "and" | "in" | "equals" | "notEquals" | "notContains" | "greaterThan" | "lessThan" | "notIn" | "exists" | "notExists" | "token" | "phrase" | "not";
    }, {
        value?: string | number | string[];
        options?: Record<string, any>;
        field?: string;
        matchType?: "endsWith" | "startsWith" | "contains" | "regex" | "or" | "and" | "in" | "equals" | "notEquals" | "notContains" | "greaterThan" | "lessThan" | "notIn" | "exists" | "notExists" | "token" | "phrase" | "not";
    }>, "many">]>;
    conditionLogic: z.ZodDefault<z.ZodEnum<["and", "or"]>>;
    action: z.ZodObject<{
        targetField: z.ZodString;
        valueTemplate: z.ZodDefault<z.ZodString>;
        confidenceModifier: z.ZodOptional<z.ZodNumber>;
    }, "strip", z.ZodTypeAny, {
        targetField?: string;
        valueTemplate?: string;
        confidenceModifier?: number;
    }, {
        targetField?: string;
        valueTemplate?: string;
        confidenceModifier?: number;
    }>;
    autoApply: z.ZodDefault<z.ZodBoolean>;
    autoApplyConfidence: z.ZodOptional<z.ZodNumber>;
    tags: z.ZodDefault<z.ZodArray<z.ZodString, "many">>;
    packId: z.ZodOptional<z.ZodNullable<z.ZodString>>;
    createdBy: z.ZodOptional<z.ZodString>;
    createdAt: z.ZodOptional<z.ZodAny>;
    updatedBy: z.ZodOptional<z.ZodString>;
    updatedAt: z.ZodOptional<z.ZodAny>;
}, "strip", z.ZodTypeAny, {
    name?: string;
    priority?: number;
    action?: {
        targetField?: string;
        valueTemplate?: string;
        confidenceModifier?: number;
    };
    description?: string;
    ruleId?: string;
    enabled?: boolean;
    condition?: {
        value?: string | number | string[];
        options?: Record<string, any>;
        field?: string;
        matchType?: "endsWith" | "startsWith" | "contains" | "regex" | "or" | "and" | "in" | "equals" | "notEquals" | "notContains" | "greaterThan" | "lessThan" | "notIn" | "exists" | "notExists" | "token" | "phrase" | "not";
    } | {
        value?: string | number | string[];
        options?: Record<string, any>;
        field?: string;
        matchType?: "endsWith" | "startsWith" | "contains" | "regex" | "or" | "and" | "in" | "equals" | "notEquals" | "notContains" | "greaterThan" | "lessThan" | "notIn" | "exists" | "notExists" | "token" | "phrase" | "not";
    }[];
    conditionLogic?: "or" | "and";
    autoApply?: boolean;
    autoApplyConfidence?: number;
    tags?: string[];
    packId?: string;
    createdBy?: string;
    createdAt?: any;
    updatedBy?: string;
    updatedAt?: any;
}, {
    name?: string;
    priority?: number;
    action?: {
        targetField?: string;
        valueTemplate?: string;
        confidenceModifier?: number;
    };
    description?: string;
    ruleId?: string;
    enabled?: boolean;
    condition?: {
        value?: string | number | string[];
        options?: Record<string, any>;
        field?: string;
        matchType?: "endsWith" | "startsWith" | "contains" | "regex" | "or" | "and" | "in" | "equals" | "notEquals" | "notContains" | "greaterThan" | "lessThan" | "notIn" | "exists" | "notExists" | "token" | "phrase" | "not";
    } | {
        value?: string | number | string[];
        options?: Record<string, any>;
        field?: string;
        matchType?: "endsWith" | "startsWith" | "contains" | "regex" | "or" | "and" | "in" | "equals" | "notEquals" | "notContains" | "greaterThan" | "lessThan" | "notIn" | "exists" | "notExists" | "token" | "phrase" | "not";
    }[];
    conditionLogic?: "or" | "and";
    autoApply?: boolean;
    autoApplyConfidence?: number;
    tags?: string[];
    packId?: string;
    createdBy?: string;
    createdAt?: any;
    updatedBy?: string;
    updatedAt?: any;
}>;
export type SmartRuleType = z.infer<typeof SmartRuleSchema>;
/**
 * Form condition with ID for UI tracking
 */
export declare const RuleConditionFormSchema: z.ZodObject<{
    id: z.ZodString;
    field: z.ZodDefault<z.ZodString>;
    matchType: z.ZodDefault<z.ZodEnum<["equals", "notEquals", "contains", "notContains", "startsWith", "endsWith", "regex", "greaterThan", "lessThan", "in", "notIn", "exists", "notExists", "token", "phrase", "and", "or", "not"]>>;
    value: z.ZodDefault<z.ZodUnion<[z.ZodString, z.ZodArray<z.ZodString, "many">]>>;
    options: z.ZodDefault<z.ZodRecord<z.ZodString, z.ZodAny>>;
}, "strip", z.ZodTypeAny, {
    id?: string;
    value?: string | string[];
    options?: Record<string, any>;
    field?: string;
    matchType?: "endsWith" | "startsWith" | "contains" | "regex" | "or" | "and" | "in" | "equals" | "notEquals" | "notContains" | "greaterThan" | "lessThan" | "notIn" | "exists" | "notExists" | "token" | "phrase" | "not";
}, {
    id?: string;
    value?: string | string[];
    options?: Record<string, any>;
    field?: string;
    matchType?: "endsWith" | "startsWith" | "contains" | "regex" | "or" | "and" | "in" | "equals" | "notEquals" | "notContains" | "greaterThan" | "lessThan" | "notIn" | "exists" | "notExists" | "token" | "phrase" | "not";
}>;
export type RuleConditionForm = z.infer<typeof RuleConditionFormSchema>;
/**
 * Form action schema
 */
export declare const RuleActionFormSchema: z.ZodObject<{
    targetField: z.ZodDefault<z.ZodString>;
    valueTemplate: z.ZodDefault<z.ZodString>;
    setOnlyIfEmpty: z.ZodDefault<z.ZodBoolean>;
    confidenceModifier: z.ZodOptional<z.ZodNumber>;
}, "strip", z.ZodTypeAny, {
    targetField?: string;
    valueTemplate?: string;
    confidenceModifier?: number;
    setOnlyIfEmpty?: boolean;
}, {
    targetField?: string;
    valueTemplate?: string;
    confidenceModifier?: number;
    setOnlyIfEmpty?: boolean;
}>;
export type RuleActionForm = z.infer<typeof RuleActionFormSchema>;
/**
 * Complete form schema for rule editing UI
 */
export declare const SmartRuleFormSchema: z.ZodObject<{
    ruleId: z.ZodOptional<z.ZodString>;
    name: z.ZodDefault<z.ZodString>;
    description: z.ZodDefault<z.ZodString>;
    enabled: z.ZodDefault<z.ZodBoolean>;
    priority: z.ZodDefault<z.ZodNumber>;
    conditions: z.ZodDefault<z.ZodArray<z.ZodObject<{
        id: z.ZodString;
        field: z.ZodDefault<z.ZodString>;
        matchType: z.ZodDefault<z.ZodEnum<["equals", "notEquals", "contains", "notContains", "startsWith", "endsWith", "regex", "greaterThan", "lessThan", "in", "notIn", "exists", "notExists", "token", "phrase", "and", "or", "not"]>>;
        value: z.ZodDefault<z.ZodUnion<[z.ZodString, z.ZodArray<z.ZodString, "many">]>>;
        options: z.ZodDefault<z.ZodRecord<z.ZodString, z.ZodAny>>;
    }, "strip", z.ZodTypeAny, {
        id?: string;
        value?: string | string[];
        options?: Record<string, any>;
        field?: string;
        matchType?: "endsWith" | "startsWith" | "contains" | "regex" | "or" | "and" | "in" | "equals" | "notEquals" | "notContains" | "greaterThan" | "lessThan" | "notIn" | "exists" | "notExists" | "token" | "phrase" | "not";
    }, {
        id?: string;
        value?: string | string[];
        options?: Record<string, any>;
        field?: string;
        matchType?: "endsWith" | "startsWith" | "contains" | "regex" | "or" | "and" | "in" | "equals" | "notEquals" | "notContains" | "greaterThan" | "lessThan" | "notIn" | "exists" | "notExists" | "token" | "phrase" | "not";
    }>, "many">>;
    conditionLogic: z.ZodDefault<z.ZodEnum<["and", "or"]>>;
    action: z.ZodObject<{
        targetField: z.ZodDefault<z.ZodString>;
        valueTemplate: z.ZodDefault<z.ZodString>;
        setOnlyIfEmpty: z.ZodDefault<z.ZodBoolean>;
        confidenceModifier: z.ZodOptional<z.ZodNumber>;
    }, "strip", z.ZodTypeAny, {
        targetField?: string;
        valueTemplate?: string;
        confidenceModifier?: number;
        setOnlyIfEmpty?: boolean;
    }, {
        targetField?: string;
        valueTemplate?: string;
        confidenceModifier?: number;
        setOnlyIfEmpty?: boolean;
    }>;
    autoApply: z.ZodDefault<z.ZodBoolean>;
    autoApplyConfidence: z.ZodDefault<z.ZodNumber>;
    tags: z.ZodDefault<z.ZodArray<z.ZodString, "many">>;
    packId: z.ZodOptional<z.ZodNullable<z.ZodString>>;
}, "strip", z.ZodTypeAny, {
    name?: string;
    priority?: number;
    action?: {
        targetField?: string;
        valueTemplate?: string;
        confidenceModifier?: number;
        setOnlyIfEmpty?: boolean;
    };
    description?: string;
    ruleId?: string;
    enabled?: boolean;
    conditionLogic?: "or" | "and";
    autoApply?: boolean;
    autoApplyConfidence?: number;
    tags?: string[];
    packId?: string;
    conditions?: {
        id?: string;
        value?: string | string[];
        options?: Record<string, any>;
        field?: string;
        matchType?: "endsWith" | "startsWith" | "contains" | "regex" | "or" | "and" | "in" | "equals" | "notEquals" | "notContains" | "greaterThan" | "lessThan" | "notIn" | "exists" | "notExists" | "token" | "phrase" | "not";
    }[];
}, {
    name?: string;
    priority?: number;
    action?: {
        targetField?: string;
        valueTemplate?: string;
        confidenceModifier?: number;
        setOnlyIfEmpty?: boolean;
    };
    description?: string;
    ruleId?: string;
    enabled?: boolean;
    conditionLogic?: "or" | "and";
    autoApply?: boolean;
    autoApplyConfidence?: number;
    tags?: string[];
    packId?: string;
    conditions?: {
        id?: string;
        value?: string | string[];
        options?: Record<string, any>;
        field?: string;
        matchType?: "endsWith" | "startsWith" | "contains" | "regex" | "or" | "and" | "in" | "equals" | "notEquals" | "notContains" | "greaterThan" | "lessThan" | "notIn" | "exists" | "notExists" | "token" | "phrase" | "not";
    }[];
}>;
export type SmartRuleForm = z.infer<typeof SmartRuleFormSchema>;
export interface ValidationResult {
    valid: boolean;
    issues: Array<{
        path: string;
        message: string;
        code: string;
    }>;
    normalized?: SmartRuleType;
}
/**
 * Validate a SmartRule payload
 * Returns validation result with field-level issues
 */
export declare function validateSmartRule(payload: unknown): ValidationResult;
/**
 * Validate a SmartRuleForm payload (for UI)
 */
export declare function validateSmartRuleForm(payload: unknown): ValidationResult;
/**
 * Deep clean an object by removing undefined values
 * Firestore does not accept undefined - must remove or convert to null
 */
export declare function deepCleanUndefined<T extends Record<string, unknown>>(obj: T): T;
/**
 * Normalize a form to a Firestore-safe SmartRule document
 */
export declare function normalizeFormToDocument(form: SmartRuleForm): Record<string, unknown>;
/**
 * Pre-submit validation for the rule editor
 * Returns errors keyed by field path for inline display
 */
export declare function preSubmitValidation(form: SmartRuleForm): Record<string, string>;
export default SmartRuleSchema;
