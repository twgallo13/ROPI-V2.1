import { z } from 'zod';
export declare const SmartRuleCondition: z.ZodObject<{
    field: z.ZodString;
    matchType: z.ZodEnum<["equals", "contains", "regex", "in", "exists", "and", "or", "not"]>;
    value: z.ZodOptional<z.ZodUnion<[z.ZodString, z.ZodNumber, z.ZodArray<z.ZodString, "many">]>>;
    options: z.ZodOptional<z.ZodAny>;
}, "strip", z.ZodTypeAny, {
    value?: string | number | string[];
    options?: any;
    field?: string;
    matchType?: "equals" | "contains" | "exists" | "regex" | "in" | "and" | "or" | "not";
}, {
    value?: string | number | string[];
    options?: any;
    field?: string;
    matchType?: "equals" | "contains" | "exists" | "regex" | "in" | "and" | "or" | "not";
}>;
export declare const SmartRuleAction: z.ZodObject<{
    targetField: z.ZodString;
    valueTemplate: z.ZodString;
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
export declare const SmartRuleSchema: z.ZodObject<{
    ruleId: z.ZodString;
    name: z.ZodString;
    description: z.ZodOptional<z.ZodString>;
    enabled: z.ZodDefault<z.ZodBoolean>;
    priority: z.ZodDefault<z.ZodNumber>;
    condition: z.ZodUnion<[z.ZodObject<{
        field: z.ZodString;
        matchType: z.ZodEnum<["equals", "contains", "regex", "in", "exists", "and", "or", "not"]>;
        value: z.ZodOptional<z.ZodUnion<[z.ZodString, z.ZodNumber, z.ZodArray<z.ZodString, "many">]>>;
        options: z.ZodOptional<z.ZodAny>;
    }, "strip", z.ZodTypeAny, {
        value?: string | number | string[];
        options?: any;
        field?: string;
        matchType?: "equals" | "contains" | "exists" | "regex" | "in" | "and" | "or" | "not";
    }, {
        value?: string | number | string[];
        options?: any;
        field?: string;
        matchType?: "equals" | "contains" | "exists" | "regex" | "in" | "and" | "or" | "not";
    }>, z.ZodArray<z.ZodObject<{
        field: z.ZodString;
        matchType: z.ZodEnum<["equals", "contains", "regex", "in", "exists", "and", "or", "not"]>;
        value: z.ZodOptional<z.ZodUnion<[z.ZodString, z.ZodNumber, z.ZodArray<z.ZodString, "many">]>>;
        options: z.ZodOptional<z.ZodAny>;
    }, "strip", z.ZodTypeAny, {
        value?: string | number | string[];
        options?: any;
        field?: string;
        matchType?: "equals" | "contains" | "exists" | "regex" | "in" | "and" | "or" | "not";
    }, {
        value?: string | number | string[];
        options?: any;
        field?: string;
        matchType?: "equals" | "contains" | "exists" | "regex" | "in" | "and" | "or" | "not";
    }>, "many">]>;
    action: z.ZodObject<{
        targetField: z.ZodString;
        valueTemplate: z.ZodString;
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
    autoApply: z.ZodDefault<z.ZodOptional<z.ZodBoolean>>;
    autoApplyConfidence: z.ZodOptional<z.ZodNumber>;
    tags: z.ZodOptional<z.ZodArray<z.ZodString, "many">>;
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
        value?: string | number | string[];
        options?: any;
        field?: string;
        matchType?: "equals" | "contains" | "exists" | "regex" | "in" | "and" | "or" | "not";
    } | {
        value?: string | number | string[];
        options?: any;
        field?: string;
        matchType?: "equals" | "contains" | "exists" | "regex" | "in" | "and" | "or" | "not";
    }[];
    action?: {
        targetField?: string;
        valueTemplate?: string;
        confidenceModifier?: number;
    };
    autoApply?: boolean;
    autoApplyConfidence?: number;
    tags?: string[];
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
        value?: string | number | string[];
        options?: any;
        field?: string;
        matchType?: "equals" | "contains" | "exists" | "regex" | "in" | "and" | "or" | "not";
    } | {
        value?: string | number | string[];
        options?: any;
        field?: string;
        matchType?: "equals" | "contains" | "exists" | "regex" | "in" | "and" | "or" | "not";
    }[];
    action?: {
        targetField?: string;
        valueTemplate?: string;
        confidenceModifier?: number;
    };
    autoApply?: boolean;
    autoApplyConfidence?: number;
    tags?: string[];
}>;
export type SmartRuleType = z.infer<typeof SmartRuleSchema>;
export default SmartRuleSchema;
