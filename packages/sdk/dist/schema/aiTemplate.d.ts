import { z } from 'zod';
export declare const AITemplateSchema: z.ZodObject<{
    key: z.ZodString;
    title: z.ZodString;
    description: z.ZodOptional<z.ZodString>;
    status: z.ZodDefault<z.ZodEnum<["active", "draft", "disabled"]>>;
    scope: z.ZodDefault<z.ZodOptional<z.ZodEnum<["global", "store", "brand"]>>>;
    version: z.ZodOptional<z.ZodNumber>;
    conditions: z.ZodOptional<z.ZodArray<z.ZodObject<{
        field: z.ZodString;
        op: z.ZodString;
        value: z.ZodOptional<z.ZodString>;
    }, "strip", z.ZodTypeAny, {
        value?: string;
        field?: string;
        op?: string;
    }, {
        value?: string;
        field?: string;
        op?: string;
    }>, "many">>;
    matchMode: z.ZodDefault<z.ZodOptional<z.ZodEnum<["first", "best", "all"]>>>;
    layout: z.ZodOptional<z.ZodObject<{
        headlineEnabled: z.ZodOptional<z.ZodBoolean>;
        pattern: z.ZodOptional<z.ZodString>;
        bodyTemplate: z.ZodOptional<z.ZodString>;
    }, "strip", z.ZodTypeAny, {
        pattern?: string;
        headlineEnabled?: boolean;
        bodyTemplate?: string;
    }, {
        pattern?: string;
        headlineEnabled?: boolean;
        bodyTemplate?: string;
    }>>;
    voice: z.ZodOptional<z.ZodObject<{
        preset: z.ZodOptional<z.ZodString>;
        avoid: z.ZodOptional<z.ZodArray<z.ZodString, "many">>;
        brandRules: z.ZodOptional<z.ZodArray<z.ZodString, "many">>;
    }, "strip", z.ZodTypeAny, {
        preset?: string;
        avoid?: string[];
        brandRules?: string[];
    }, {
        preset?: string;
        avoid?: string[];
        brandRules?: string[];
    }>>;
    seo: z.ZodOptional<z.ZodObject<{
        metaTitlePattern: z.ZodOptional<z.ZodString>;
        metaDescPattern: z.ZodOptional<z.ZodString>;
    }, "strip", z.ZodTypeAny, {
        metaTitlePattern?: string;
        metaDescPattern?: string;
    }, {
        metaTitlePattern?: string;
        metaDescPattern?: string;
    }>>;
    examples: z.ZodOptional<z.ZodArray<z.ZodString, "many">>;
    banned_terms: z.ZodOptional<z.ZodArray<z.ZodString, "many">>;
    updatedBy: z.ZodOptional<z.ZodString>;
    updatedAt: z.ZodOptional<z.ZodString>;
}, "strip", z.ZodTypeAny, {
    status?: "draft" | "active" | "disabled";
    updatedBy?: string;
    updatedAt?: string;
    title?: string;
    description?: string;
    key?: string;
    version?: number;
    scope?: "brand" | "global" | "store";
    conditions?: {
        value?: string;
        field?: string;
        op?: string;
    }[];
    matchMode?: "first" | "best" | "all";
    layout?: {
        pattern?: string;
        headlineEnabled?: boolean;
        bodyTemplate?: string;
    };
    voice?: {
        preset?: string;
        avoid?: string[];
        brandRules?: string[];
    };
    seo?: {
        metaTitlePattern?: string;
        metaDescPattern?: string;
    };
    examples?: string[];
    banned_terms?: string[];
}, {
    status?: "draft" | "active" | "disabled";
    updatedBy?: string;
    updatedAt?: string;
    title?: string;
    description?: string;
    key?: string;
    version?: number;
    scope?: "brand" | "global" | "store";
    conditions?: {
        value?: string;
        field?: string;
        op?: string;
    }[];
    matchMode?: "first" | "best" | "all";
    layout?: {
        pattern?: string;
        headlineEnabled?: boolean;
        bodyTemplate?: string;
    };
    voice?: {
        preset?: string;
        avoid?: string[];
        brandRules?: string[];
    };
    seo?: {
        metaTitlePattern?: string;
        metaDescPattern?: string;
    };
    examples?: string[];
    banned_terms?: string[];
}>;
export type AITemplateType = z.infer<typeof AITemplateSchema>;
export default AITemplateSchema;
