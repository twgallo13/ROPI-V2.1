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
        field: string;
        op: string;
        value?: string | undefined;
    }, {
        field: string;
        op: string;
        value?: string | undefined;
    }>, "many">>;
    matchMode: z.ZodDefault<z.ZodOptional<z.ZodEnum<["first", "best", "all"]>>>;
    layout: z.ZodOptional<z.ZodObject<{
        headlineEnabled: z.ZodOptional<z.ZodBoolean>;
        pattern: z.ZodOptional<z.ZodString>;
        bodyTemplate: z.ZodOptional<z.ZodString>;
    }, "strip", z.ZodTypeAny, {
        pattern?: string | undefined;
        headlineEnabled?: boolean | undefined;
        bodyTemplate?: string | undefined;
    }, {
        pattern?: string | undefined;
        headlineEnabled?: boolean | undefined;
        bodyTemplate?: string | undefined;
    }>>;
    voice: z.ZodOptional<z.ZodObject<{
        preset: z.ZodOptional<z.ZodString>;
        avoid: z.ZodOptional<z.ZodArray<z.ZodString, "many">>;
        brandRules: z.ZodOptional<z.ZodArray<z.ZodString, "many">>;
    }, "strip", z.ZodTypeAny, {
        preset?: string | undefined;
        avoid?: string[] | undefined;
        brandRules?: string[] | undefined;
    }, {
        preset?: string | undefined;
        avoid?: string[] | undefined;
        brandRules?: string[] | undefined;
    }>>;
    seo: z.ZodOptional<z.ZodObject<{
        metaTitlePattern: z.ZodOptional<z.ZodString>;
        metaDescPattern: z.ZodOptional<z.ZodString>;
    }, "strip", z.ZodTypeAny, {
        metaTitlePattern?: string | undefined;
        metaDescPattern?: string | undefined;
    }, {
        metaTitlePattern?: string | undefined;
        metaDescPattern?: string | undefined;
    }>>;
    examples: z.ZodOptional<z.ZodArray<z.ZodString, "many">>;
    banned_terms: z.ZodOptional<z.ZodArray<z.ZodString, "many">>;
    updatedBy: z.ZodOptional<z.ZodString>;
    updatedAt: z.ZodOptional<z.ZodString>;
}, "strip", z.ZodTypeAny, {
    status: "draft" | "active" | "disabled";
    title: string;
    key: string;
    scope: "brand" | "global" | "store";
    matchMode: "first" | "best" | "all";
    updatedBy?: string | undefined;
    updatedAt?: string | undefined;
    description?: string | undefined;
    version?: number | undefined;
    conditions?: {
        field: string;
        op: string;
        value?: string | undefined;
    }[] | undefined;
    layout?: {
        pattern?: string | undefined;
        headlineEnabled?: boolean | undefined;
        bodyTemplate?: string | undefined;
    } | undefined;
    voice?: {
        preset?: string | undefined;
        avoid?: string[] | undefined;
        brandRules?: string[] | undefined;
    } | undefined;
    seo?: {
        metaTitlePattern?: string | undefined;
        metaDescPattern?: string | undefined;
    } | undefined;
    examples?: string[] | undefined;
    banned_terms?: string[] | undefined;
}, {
    title: string;
    key: string;
    status?: "draft" | "active" | "disabled" | undefined;
    updatedBy?: string | undefined;
    updatedAt?: string | undefined;
    description?: string | undefined;
    version?: number | undefined;
    scope?: "brand" | "global" | "store" | undefined;
    conditions?: {
        field: string;
        op: string;
        value?: string | undefined;
    }[] | undefined;
    matchMode?: "first" | "best" | "all" | undefined;
    layout?: {
        pattern?: string | undefined;
        headlineEnabled?: boolean | undefined;
        bodyTemplate?: string | undefined;
    } | undefined;
    voice?: {
        preset?: string | undefined;
        avoid?: string[] | undefined;
        brandRules?: string[] | undefined;
    } | undefined;
    seo?: {
        metaTitlePattern?: string | undefined;
        metaDescPattern?: string | undefined;
    } | undefined;
    examples?: string[] | undefined;
    banned_terms?: string[] | undefined;
}>;
export type AITemplateType = z.infer<typeof AITemplateSchema>;
export default AITemplateSchema;
//# sourceMappingURL=aiTemplate.d.ts.map