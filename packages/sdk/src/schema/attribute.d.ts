import { z } from 'zod';
/**
 * Attribute Schema
 *
 * Defines the structure for product attribute definitions in the registry.
 *
 * Lisa v1.0.0
 *
 * References:
 * - Attribute Registry: https://www.notion.so/2b845ee1ec5a81228b07ca97964cd033
 * - Attribute Validation Schema: https://www.notion.so/2b845ee1ec5a805fba0ef665dfb17396
 */
export declare const AttributeSchema: z.ZodObject<{
    attribute_id: z.ZodString;
    label: z.ZodString;
    external_header: z.ZodOptional<z.ZodString>;
    category: z.ZodOptional<z.ZodString>;
    data_type: z.ZodEnum<["string", "number", "boolean", "enum", "currency", "json", "multiSelect", "date"]>;
    allowed_values: z.ZodOptional<z.ZodArray<z.ZodString, "many">>;
    synonyms: z.ZodOptional<z.ZodArray<z.ZodString, "many">>;
    required_for_completion: z.ZodDefault<z.ZodOptional<z.ZodBoolean>>;
    required_for_export: z.ZodDefault<z.ZodOptional<z.ZodBoolean>>;
    import_required: z.ZodDefault<z.ZodOptional<z.ZodBoolean>>;
    ai_usage_notes: z.ZodOptional<z.ZodString>;
    status: z.ZodDefault<z.ZodOptional<z.ZodEnum<["active", "deprecated", "hidden"]>>>;
    source: z.ZodOptional<z.ZodEnum<["notion", "derived", "json"]>>;
    createdBy: z.ZodOptional<z.ZodString>;
    createdAt: z.ZodOptional<z.ZodString>;
    updatedBy: z.ZodOptional<z.ZodString>;
    updatedAt: z.ZodOptional<z.ZodString>;
}, "strip", z.ZodTypeAny, {
    attribute_id: string;
    label: string;
    data_type: "string" | "number" | "boolean" | "date" | "enum" | "currency" | "json" | "multiSelect";
    status: "active" | "deprecated" | "hidden";
    required_for_completion: boolean;
    required_for_export: boolean;
    import_required: boolean;
    category?: string | undefined;
    external_header?: string | undefined;
    allowed_values?: string[] | undefined;
    synonyms?: string[] | undefined;
    ai_usage_notes?: string | undefined;
    source?: "json" | "notion" | "derived" | undefined;
    createdBy?: string | undefined;
    createdAt?: string | undefined;
    updatedBy?: string | undefined;
    updatedAt?: string | undefined;
}, {
    attribute_id: string;
    label: string;
    data_type: "string" | "number" | "boolean" | "date" | "enum" | "currency" | "json" | "multiSelect";
    category?: string | undefined;
    external_header?: string | undefined;
    status?: "active" | "deprecated" | "hidden" | undefined;
    allowed_values?: string[] | undefined;
    synonyms?: string[] | undefined;
    required_for_completion?: boolean | undefined;
    required_for_export?: boolean | undefined;
    import_required?: boolean | undefined;
    ai_usage_notes?: string | undefined;
    source?: "json" | "notion" | "derived" | undefined;
    createdBy?: string | undefined;
    createdAt?: string | undefined;
    updatedBy?: string | undefined;
    updatedAt?: string | undefined;
}>;
export type AttributeType = z.infer<typeof AttributeSchema>;
export default AttributeSchema;
//# sourceMappingURL=attribute.d.ts.map