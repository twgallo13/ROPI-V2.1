/**
 * Smart Rule Schema
 * Canonical Zod schema for Smart Rules validation
 * Version: LP-smart-rules-schema-1.1.0 (Lisa canonical)
 *
 * This is the SINGLE SOURCE OF TRUTH for SmartRule validation.
 * Used by both client (UI pre-submit) and server (write validation).
 *
 * Key invariants:
 * - condition.options MUST be an array (default []), never undefined
 * - description MUST default to ''
 * - tags MUST default to []
 * - No undefined values allowed in Firestore payloads
 */
import { z } from 'zod';
/**
 * Action schema: single action for now (set a target field to a templated value)
 */
export declare const ActionSchema: z.ZodObject<{
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
export type RuleAction = z.infer<typeof ActionSchema>;
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
/**
 * Condition schema: match type enum includes token, phrase, regex, contains
 */
export declare const ConditionSchema: z.ZodObject<{
    field: z.ZodString;
    matchType: z.ZodEnum<["token", "phrase", "regex", "contains"]>;
    value: z.ZodDefault<z.ZodString>;
    options: z.ZodDefault<z.ZodArray<z.ZodAny, "many">>;
}, "strip", z.ZodTypeAny, {
    value?: string;
    options?: any[];
    field?: string;
    matchType?: "regex" | "token" | "phrase" | "contains";
}, {
    value?: string;
    options?: any[];
    field?: string;
    matchType?: "regex" | "token" | "phrase" | "contains";
}>;
export type RuleCondition = z.infer<typeof ConditionSchema>;
export declare const SmartRuleCondition: z.ZodObject<{
    field: z.ZodString;
    matchType: z.ZodEnum<["token", "phrase", "regex", "contains"]>;
    value: z.ZodDefault<z.ZodString>;
    options: z.ZodDefault<z.ZodArray<z.ZodAny, "many">>;
}, "strip", z.ZodTypeAny, {
    value?: string;
    options?: any[];
    field?: string;
    matchType?: "regex" | "token" | "phrase" | "contains";
}, {
    value?: string;
    options?: any[];
    field?: string;
    matchType?: "regex" | "token" | "phrase" | "contains";
}>;
export declare const MatchTypeEnum: z.ZodEnum<["token", "phrase", "regex", "contains"]>;
export type MatchType = z.infer<typeof MatchTypeEnum>;
/**
 * Complete SmartRule schema with all fields properly defaulted
 *
 * Ensures:
 * - No undefined values in output
 * - All optional fields have sensible defaults
 * - Server-side validation will use this exact schema
 * - condition normalized to array via transform
 */
export declare const RuleSchema: z.ZodObject<{
    ruleId: z.ZodOptional<z.ZodString>;
    name: z.ZodString;
    description: z.ZodDefault<z.ZodString>;
    enabled: z.ZodDefault<z.ZodBoolean>;
    priority: z.ZodDefault<z.ZodNumber>;
    condition: z.ZodEffects<z.ZodUnion<[z.ZodObject<{
        field: z.ZodString;
        matchType: z.ZodEnum<["token", "phrase", "regex", "contains"]>;
        value: z.ZodDefault<z.ZodString>;
        options: z.ZodDefault<z.ZodArray<z.ZodAny, "many">>;
    }, "strip", z.ZodTypeAny, {
        value?: string;
        options?: any[];
        field?: string;
        matchType?: "regex" | "token" | "phrase" | "contains";
    }, {
        value?: string;
        options?: any[];
        field?: string;
        matchType?: "regex" | "token" | "phrase" | "contains";
    }>, z.ZodArray<z.ZodObject<{
        field: z.ZodString;
        matchType: z.ZodEnum<["token", "phrase", "regex", "contains"]>;
        value: z.ZodDefault<z.ZodString>;
        options: z.ZodDefault<z.ZodArray<z.ZodAny, "many">>;
    }, "strip", z.ZodTypeAny, {
        value?: string;
        options?: any[];
        field?: string;
        matchType?: "regex" | "token" | "phrase" | "contains";
    }, {
        value?: string;
        options?: any[];
        field?: string;
        matchType?: "regex" | "token" | "phrase" | "contains";
    }>, "many">]>, {
        value?: string;
        options?: any[];
        field?: string;
        matchType?: "regex" | "token" | "phrase" | "contains";
    }[], {
        value?: string;
        options?: any[];
        field?: string;
        matchType?: "regex" | "token" | "phrase" | "contains";
    } | {
        value?: string;
        options?: any[];
        field?: string;
        matchType?: "regex" | "token" | "phrase" | "contains";
    }[]>;
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
    createdAt: z.ZodOptional<z.ZodString>;
    updatedBy: z.ZodOptional<z.ZodString>;
    updatedAt: z.ZodOptional<z.ZodString>;
}, "strip", z.ZodTypeAny, {
    createdBy?: string;
    createdAt?: string;
    updatedBy?: string;
    updatedAt?: string;
    description?: string;
    name?: string;
    ruleId?: string;
    enabled?: boolean;
    priority?: number;
    condition?: {
        value?: string;
        options?: any[];
        field?: string;
        matchType?: "regex" | "token" | "phrase" | "contains";
    }[];
    action?: {
        targetField?: string;
        valueTemplate?: string;
        confidenceModifier?: number;
    };
    autoApply?: boolean;
    autoApplyConfidence?: number;
    tags?: string[];
    packId?: string;
}, {
    createdBy?: string;
    createdAt?: string;
    updatedBy?: string;
    updatedAt?: string;
    description?: string;
    name?: string;
    ruleId?: string;
    enabled?: boolean;
    priority?: number;
    condition?: {
        value?: string;
        options?: any[];
        field?: string;
        matchType?: "regex" | "token" | "phrase" | "contains";
    } | {
        value?: string;
        options?: any[];
        field?: string;
        matchType?: "regex" | "token" | "phrase" | "contains";
    }[];
    action?: {
        targetField?: string;
        valueTemplate?: string;
        confidenceModifier?: number;
    };
    autoApply?: boolean;
    autoApplyConfidence?: number;
    tags?: string[];
    packId?: string;
}>;
export declare const SmartRuleSchema: z.ZodObject<{
    ruleId: z.ZodOptional<z.ZodString>;
    name: z.ZodString;
    description: z.ZodDefault<z.ZodString>;
    enabled: z.ZodDefault<z.ZodBoolean>;
    priority: z.ZodDefault<z.ZodNumber>;
    condition: z.ZodEffects<z.ZodUnion<[z.ZodObject<{
        field: z.ZodString;
        matchType: z.ZodEnum<["token", "phrase", "regex", "contains"]>;
        value: z.ZodDefault<z.ZodString>;
        options: z.ZodDefault<z.ZodArray<z.ZodAny, "many">>;
    }, "strip", z.ZodTypeAny, {
        value?: string;
        options?: any[];
        field?: string;
        matchType?: "regex" | "token" | "phrase" | "contains";
    }, {
        value?: string;
        options?: any[];
        field?: string;
        matchType?: "regex" | "token" | "phrase" | "contains";
    }>, z.ZodArray<z.ZodObject<{
        field: z.ZodString;
        matchType: z.ZodEnum<["token", "phrase", "regex", "contains"]>;
        value: z.ZodDefault<z.ZodString>;
        options: z.ZodDefault<z.ZodArray<z.ZodAny, "many">>;
    }, "strip", z.ZodTypeAny, {
        value?: string;
        options?: any[];
        field?: string;
        matchType?: "regex" | "token" | "phrase" | "contains";
    }, {
        value?: string;
        options?: any[];
        field?: string;
        matchType?: "regex" | "token" | "phrase" | "contains";
    }>, "many">]>, {
        value?: string;
        options?: any[];
        field?: string;
        matchType?: "regex" | "token" | "phrase" | "contains";
    }[], {
        value?: string;
        options?: any[];
        field?: string;
        matchType?: "regex" | "token" | "phrase" | "contains";
    } | {
        value?: string;
        options?: any[];
        field?: string;
        matchType?: "regex" | "token" | "phrase" | "contains";
    }[]>;
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
    createdAt: z.ZodOptional<z.ZodString>;
    updatedBy: z.ZodOptional<z.ZodString>;
    updatedAt: z.ZodOptional<z.ZodString>;
}, "strip", z.ZodTypeAny, {
    createdBy?: string;
    createdAt?: string;
    updatedBy?: string;
    updatedAt?: string;
    description?: string;
    name?: string;
    ruleId?: string;
    enabled?: boolean;
    priority?: number;
    condition?: {
        value?: string;
        options?: any[];
        field?: string;
        matchType?: "regex" | "token" | "phrase" | "contains";
    }[];
    action?: {
        targetField?: string;
        valueTemplate?: string;
        confidenceModifier?: number;
    };
    autoApply?: boolean;
    autoApplyConfidence?: number;
    tags?: string[];
    packId?: string;
}, {
    createdBy?: string;
    createdAt?: string;
    updatedBy?: string;
    updatedAt?: string;
    description?: string;
    name?: string;
    ruleId?: string;
    enabled?: boolean;
    priority?: number;
    condition?: {
        value?: string;
        options?: any[];
        field?: string;
        matchType?: "regex" | "token" | "phrase" | "contains";
    } | {
        value?: string;
        options?: any[];
        field?: string;
        matchType?: "regex" | "token" | "phrase" | "contains";
    }[];
    action?: {
        targetField?: string;
        valueTemplate?: string;
        confidenceModifier?: number;
    };
    autoApply?: boolean;
    autoApplyConfidence?: number;
    tags?: string[];
    packId?: string;
}>;
export type SmartRuleType = z.infer<typeof RuleSchema>;
export type SmartRule = SmartRuleType;
/**
 * Form condition with ID for UI tracking
 */
export declare const RuleConditionFormSchema: z.ZodObject<{
    id: z.ZodString;
    field: z.ZodDefault<z.ZodString>;
    matchType: z.ZodDefault<z.ZodEnum<["token", "phrase", "regex", "contains"]>>;
    value: z.ZodDefault<z.ZodUnion<[z.ZodString, z.ZodArray<z.ZodString, "many">]>>;
    options: z.ZodDefault<z.ZodArray<z.ZodAny, "many">>;
}, "strip", z.ZodTypeAny, {
    value?: string | string[];
    options?: any[];
    field?: string;
    matchType?: "regex" | "token" | "phrase" | "contains";
    id?: string;
}, {
    value?: string | string[];
    options?: any[];
    field?: string;
    matchType?: "regex" | "token" | "phrase" | "contains";
    id?: string;
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
        matchType: z.ZodDefault<z.ZodEnum<["token", "phrase", "regex", "contains"]>>;
        value: z.ZodDefault<z.ZodUnion<[z.ZodString, z.ZodArray<z.ZodString, "many">]>>;
        options: z.ZodDefault<z.ZodArray<z.ZodAny, "many">>;
    }, "strip", z.ZodTypeAny, {
        value?: string | string[];
        options?: any[];
        field?: string;
        matchType?: "regex" | "token" | "phrase" | "contains";
        id?: string;
    }, {
        value?: string | string[];
        options?: any[];
        field?: string;
        matchType?: "regex" | "token" | "phrase" | "contains";
        id?: string;
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
    description?: string;
    name?: string;
    ruleId?: string;
    enabled?: boolean;
    priority?: number;
    action?: {
        targetField?: string;
        valueTemplate?: string;
        confidenceModifier?: number;
        setOnlyIfEmpty?: boolean;
    };
    autoApply?: boolean;
    autoApplyConfidence?: number;
    tags?: string[];
    packId?: string;
    conditions?: {
        value?: string | string[];
        options?: any[];
        field?: string;
        matchType?: "regex" | "token" | "phrase" | "contains";
        id?: string;
    }[];
    conditionLogic?: "and" | "or";
}, {
    description?: string;
    name?: string;
    ruleId?: string;
    enabled?: boolean;
    priority?: number;
    action?: {
        targetField?: string;
        valueTemplate?: string;
        confidenceModifier?: number;
        setOnlyIfEmpty?: boolean;
    };
    autoApply?: boolean;
    autoApplyConfidence?: number;
    tags?: string[];
    packId?: string;
    conditions?: {
        value?: string | string[];
        options?: any[];
        field?: string;
        matchType?: "regex" | "token" | "phrase" | "contains";
        id?: string;
    }[];
    conditionLogic?: "and" | "or";
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
 * Validate a SmartRule payload (throws on invalid)
 * Lisa's canonical: parse will throw ZodError with issues
 */
export declare function validateSmartRule(payload: unknown): SmartRule;
/**
 * Safe validation that returns result object instead of throwing
 */
export declare function safeValidateSmartRule(payload: unknown): ValidationResult;
/**
 * Validate a SmartRuleForm payload (for UI)
 */
export declare function validateSmartRuleForm(payload: unknown): ValidationResult;
/**
 * Deep clean an object by removing undefined values
 * Firestore does not accept undefined - must remove or convert to null
 * Lisa's canonical: keeps null/empty string/empty array
 */
export declare function deepCleanUndefined<T>(obj: T): T;
export declare const deepClean: typeof deepCleanUndefined;
/**
 * Normalize a form to a Firestore-safe SmartRule document
 * Lisa's canonical: condition as array, options as array
 */
export declare function normalizeFormToDocument(form: SmartRuleForm): Record<string, unknown>;
/**
 * Pre-submit validation for the rule editor
 * Returns errors keyed by field path for inline display
 */
export declare function preSubmitValidation(form: SmartRuleForm): Record<string, string>;
export default RuleSchema;
