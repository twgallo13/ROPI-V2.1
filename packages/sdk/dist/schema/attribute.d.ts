import { z } from 'zod';
/**
 * Export metadata schema for channel-specific export configuration
 * LP-smart-rules-registry-1.0.0: Added for Smart Rules export targeting
 */
export declare const ExportMetadataSchema: z.ZodOptional<z.ZodObject<{
    /** Column key/header for export (if different from attribute_id) */
    key: z.ZodOptional<z.ZodString>;
    /** Omit this field from export if value is empty/null/undefined */
    omitIfEmpty: z.ZodDefault<z.ZodOptional<z.ZodBoolean>>;
    /** Export target channels this attribute applies to */
    targets: z.ZodOptional<z.ZodArray<z.ZodEnum<["shopify", "google", "amazon", "magento", "csv"]>, "many">>;
}, "strip", z.ZodTypeAny, {
    key?: string;
    omitIfEmpty?: boolean;
    targets?: ("shopify" | "google" | "amazon" | "magento" | "csv")[];
}, {
    key?: string;
    omitIfEmpty?: boolean;
    targets?: ("shopify" | "google" | "amazon" | "magento" | "csv")[];
}>>;
export type ExportMetadata = z.infer<typeof ExportMetadataSchema>;
export declare const AttributeSchema: z.ZodObject<{
    attribute_id: z.ZodString;
    label: z.ZodString;
    external_header: z.ZodOptional<z.ZodString>;
    category: z.ZodOptional<z.ZodString>;
    data_type: z.ZodEnum<["string", "number", "boolean", "enum", "currency", "json", "multiSelect", "date"]>;
    allowed_values: z.ZodOptional<z.ZodArray<z.ZodString, "many">>;
    synonyms: z.ZodOptional<z.ZodUnion<[z.ZodArray<z.ZodString, "many">, z.ZodRecord<z.ZodString, z.ZodString>, z.ZodArray<z.ZodObject<{
        alias: z.ZodString;
        canonical: z.ZodString;
    }, "strip", z.ZodTypeAny, {
        alias?: string;
        canonical?: string;
    }, {
        alias?: string;
        canonical?: string;
    }>, "many">]>>;
    required_for_completion: z.ZodDefault<z.ZodOptional<z.ZodBoolean>>;
    required_for_export: z.ZodDefault<z.ZodOptional<z.ZodBoolean>>;
    import_required: z.ZodDefault<z.ZodOptional<z.ZodBoolean>>;
    ai_usage_notes: z.ZodOptional<z.ZodString>;
    status: z.ZodDefault<z.ZodOptional<z.ZodEnum<["active", "deprecated", "hidden"]>>>;
    source: z.ZodOptional<z.ZodEnum<["notion", "derived", "json", "repo"]>>;
    /** Whether this attribute can be included in exports (default: true for most, false for internal fields) */
    exportable: z.ZodDefault<z.ZodOptional<z.ZodBoolean>>;
    /** Whether this attribute must have a value for the product to be export-ready */
    requiredForExport: z.ZodDefault<z.ZodOptional<z.ZodBoolean>>;
    /** Whether this attribute is for internal use only and should never be exposed to external channels */
    internalOnly: z.ZodDefault<z.ZodOptional<z.ZodBoolean>>;
    /** Channel-specific export configuration */
    export: z.ZodOptional<z.ZodObject<{
        /** Column key/header for export (if different from attribute_id) */
        key: z.ZodOptional<z.ZodString>;
        /** Omit this field from export if value is empty/null/undefined */
        omitIfEmpty: z.ZodDefault<z.ZodOptional<z.ZodBoolean>>;
        /** Export target channels this attribute applies to */
        targets: z.ZodOptional<z.ZodArray<z.ZodEnum<["shopify", "google", "amazon", "magento", "csv"]>, "many">>;
    }, "strip", z.ZodTypeAny, {
        key?: string;
        omitIfEmpty?: boolean;
        targets?: ("shopify" | "google" | "amazon" | "magento" | "csv")[];
    }, {
        key?: string;
        omitIfEmpty?: boolean;
        targets?: ("shopify" | "google" | "amazon" | "magento" | "csv")[];
    }>>;
    createdBy: z.ZodOptional<z.ZodString>;
    createdAt: z.ZodOptional<z.ZodUnion<[z.ZodString, z.ZodObject<{}, "passthrough", z.ZodTypeAny, z.objectOutputType<{}, z.ZodTypeAny, "passthrough">, z.objectInputType<{}, z.ZodTypeAny, "passthrough">>]>>;
    updatedBy: z.ZodOptional<z.ZodString>;
    updatedAt: z.ZodOptional<z.ZodUnion<[z.ZodString, z.ZodObject<{}, "passthrough", z.ZodTypeAny, z.objectOutputType<{}, z.ZodTypeAny, "passthrough">, z.objectInputType<{}, z.ZodTypeAny, "passthrough">>]>>;
}, "strip", z.ZodTypeAny, {
    status?: "active" | "deprecated" | "hidden";
    attribute_id?: string;
    label?: string;
    external_header?: string;
    category?: string;
    data_type?: "string" | "number" | "boolean" | "date" | "enum" | "currency" | "json" | "multiSelect";
    allowed_values?: string[];
    synonyms?: string[] | Record<string, string> | {
        alias?: string;
        canonical?: string;
    }[];
    required_for_completion?: boolean;
    required_for_export?: boolean;
    import_required?: boolean;
    ai_usage_notes?: string;
    source?: "json" | "notion" | "derived" | "repo";
    exportable?: boolean;
    requiredForExport?: boolean;
    internalOnly?: boolean;
    export?: {
        key?: string;
        omitIfEmpty?: boolean;
        targets?: ("shopify" | "google" | "amazon" | "magento" | "csv")[];
    };
    createdBy?: string;
    createdAt?: string | z.objectOutputType<{}, z.ZodTypeAny, "passthrough">;
    updatedBy?: string;
    updatedAt?: string | z.objectOutputType<{}, z.ZodTypeAny, "passthrough">;
}, {
    status?: "active" | "deprecated" | "hidden";
    attribute_id?: string;
    label?: string;
    external_header?: string;
    category?: string;
    data_type?: "string" | "number" | "boolean" | "date" | "enum" | "currency" | "json" | "multiSelect";
    allowed_values?: string[];
    synonyms?: string[] | Record<string, string> | {
        alias?: string;
        canonical?: string;
    }[];
    required_for_completion?: boolean;
    required_for_export?: boolean;
    import_required?: boolean;
    ai_usage_notes?: string;
    source?: "json" | "notion" | "derived" | "repo";
    exportable?: boolean;
    requiredForExport?: boolean;
    internalOnly?: boolean;
    export?: {
        key?: string;
        omitIfEmpty?: boolean;
        targets?: ("shopify" | "google" | "amazon" | "magento" | "csv")[];
    };
    createdBy?: string;
    createdAt?: string | z.objectInputType<{}, z.ZodTypeAny, "passthrough">;
    updatedBy?: string;
    updatedAt?: string | z.objectInputType<{}, z.ZodTypeAny, "passthrough">;
}>;
export type AttributeType = z.infer<typeof AttributeSchema>;
export default AttributeSchema;
