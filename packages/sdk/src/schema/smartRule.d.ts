import { z } from 'zod';
export declare const SmartRuleCondition: z.ZodObject<{
    field: z.ZodString;
    matchType: z.ZodEnum<["equals", "contains", "regex", "in", "exists", "and", "or", "not"]>;
    value: z.ZodOptional<z.ZodUnion<[z.ZodString, z.ZodNumber, z.ZodArray<z.ZodString, "many">]>>;
    options: z.ZodOptional<z.ZodAny>;
}, "strip", z.ZodTypeAny, {
    field: string;
    matchType: "equals" | "contains" | "exists" | "regex" | "in" | "and" | "or" | "not";
    value?: string | number | string[] | undefined;
    options?: any;
}, {
    field: string;
    matchType: "equals" | "contains" | "exists" | "regex" | "in" | "and" | "or" | "not";
    value?: string | number | string[] | undefined;
    options?: any;
}>;
export declare const SmartRuleAction: z.ZodObject<{
    targetField: z.ZodString;
    valueTemplate: z.ZodString;
    confidenceModifier: z.ZodOptional<z.ZodNumber>;
}, "strip", z.ZodTypeAny, {
    targetField: string;
    valueTemplate: string;
    confidenceModifier?: number | undefined;
}, {
    targetField: string;
    valueTemplate: string;
    confidenceModifier?: number | undefined;
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
        field: string;
        matchType: "equals" | "contains" | "exists" | "regex" | "in" | "and" | "or" | "not";
        value?: string | number | string[] | undefined;
        options?: any;
    }, {
        field: string;
        matchType: "equals" | "contains" | "exists" | "regex" | "in" | "and" | "or" | "not";
        value?: string | number | string[] | undefined;
        options?: any;
    }>, z.ZodArray<z.ZodObject<{
        field: z.ZodString;
        matchType: z.ZodEnum<["equals", "contains", "regex", "in", "exists", "and", "or", "not"]>;
        value: z.ZodOptional<z.ZodUnion<[z.ZodString, z.ZodNumber, z.ZodArray<z.ZodString, "many">]>>;
        options: z.ZodOptional<z.ZodAny>;
    }, "strip", z.ZodTypeAny, {
        field: string;
        matchType: "equals" | "contains" | "exists" | "regex" | "in" | "and" | "or" | "not";
        value?: string | number | string[] | undefined;
        options?: any;
    }, {
        field: string;
        matchType: "equals" | "contains" | "exists" | "regex" | "in" | "and" | "or" | "not";
        value?: string | number | string[] | undefined;
        options?: any;
    }>, "many">]>;
    action: z.ZodObject<{
        targetField: z.ZodString;
        valueTemplate: z.ZodString;
        confidenceModifier: z.ZodOptional<z.ZodNumber>;
    }, "strip", z.ZodTypeAny, {
        targetField: string;
        valueTemplate: string;
        confidenceModifier?: number | undefined;
    }, {
        targetField: string;
        valueTemplate: string;
        confidenceModifier?: number | undefined;
    }>;
    autoApply: z.ZodDefault<z.ZodOptional<z.ZodBoolean>>;
    autoApplyConfidence: z.ZodOptional<z.ZodNumber>;
    tags: z.ZodOptional<z.ZodArray<z.ZodString, "many">>;
    createdBy: z.ZodOptional<z.ZodString>;
    createdAt: z.ZodOptional<z.ZodString>;
    updatedBy: z.ZodOptional<z.ZodString>;
    updatedAt: z.ZodOptional<z.ZodString>;
}, "strip", z.ZodTypeAny, {
    name: string;
    ruleId: string;
    enabled: boolean;
    priority: number;
    condition: {
        field: string;
        matchType: "equals" | "contains" | "exists" | "regex" | "in" | "and" | "or" | "not";
        value?: string | number | string[] | undefined;
        options?: any;
    } | {
        field: string;
        matchType: "equals" | "contains" | "exists" | "regex" | "in" | "and" | "or" | "not";
        value?: string | number | string[] | undefined;
        options?: any;
    }[];
    action: {
        targetField: string;
        valueTemplate: string;
        confidenceModifier?: number | undefined;
    };
    autoApply: boolean;
    createdBy?: string | undefined;
    createdAt?: string | undefined;
    updatedBy?: string | undefined;
    updatedAt?: string | undefined;
    description?: string | undefined;
    autoApplyConfidence?: number | undefined;
    tags?: string[] | undefined;
}, {
    name: string;
    ruleId: string;
    condition: {
        field: string;
        matchType: "equals" | "contains" | "exists" | "regex" | "in" | "and" | "or" | "not";
        value?: string | number | string[] | undefined;
        options?: any;
    } | {
        field: string;
        matchType: "equals" | "contains" | "exists" | "regex" | "in" | "and" | "or" | "not";
        value?: string | number | string[] | undefined;
        options?: any;
    }[];
    action: {
        targetField: string;
        valueTemplate: string;
        confidenceModifier?: number | undefined;
    };
    createdBy?: string | undefined;
    createdAt?: string | undefined;
    updatedBy?: string | undefined;
    updatedAt?: string | undefined;
    description?: string | undefined;
    enabled?: boolean | undefined;
    priority?: number | undefined;
    autoApply?: boolean | undefined;
    autoApplyConfidence?: number | undefined;
    tags?: string[] | undefined;
}>;
export type SmartRuleType = z.infer<typeof SmartRuleSchema>;
export default SmartRuleSchema;
//# sourceMappingURL=smartRule.d.ts.map