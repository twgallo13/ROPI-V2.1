import { z } from 'zod';

/**
 * Attribute Schema
 * 
 * Defines the structure for product attribute definitions in the registry.
 * 
 * Lisa v1.0.0
 * LP-smart-rules-registry-1.0.0: Added exportable, requiredForExport, internalOnly, export metadata
 * 
 * References:
 * - Attribute Registry: https://www.notion.so/2b845ee1ec5a81228b07ca97964cd033
 * - Attribute Validation Schema: https://www.notion.so/2b845ee1ec5a805fba0ef665dfb17396
 */

/**
 * Synonyms schema - accepts multiple formats for flexibility:
 * - Array of strings: ["blk", "blu"]
 * - Object map (alias -> canonical): { "blk": "Black", "blu": "Blue" }
 * - Array of objects: [{ alias: "blk", canonical: "Black" }]
 * 
 * LP-3.0.4: Updated to accept object map format used in Firestore
 */
const SynonymsSchema = z.union([
  z.array(z.string()),
  z.record(z.string(), z.string()),
  z.array(z.object({ alias: z.string(), canonical: z.string() }))
]).optional();

/**
 * Export metadata schema for channel-specific export configuration
 * LP-smart-rules-registry-1.0.0: Added for Smart Rules export targeting
 */
export const ExportMetadataSchema = z.object({
  /** Column key/header for export (if different from attribute_id) */
  key: z.string().optional(),
  /** Omit this field from export if value is empty/null/undefined */
  omitIfEmpty: z.boolean().optional().default(false),
  /** Export target channels this attribute applies to */
  targets: z.array(z.enum(['shopify', 'google', 'amazon', 'magento', 'csv'])).optional(),
}).optional();

export type ExportMetadata = z.infer<typeof ExportMetadataSchema>;

export const AttributeSchema = z.object({
  attribute_id: z.string().min(1).regex(/^[a-z0-9-_.]+$/),
  label: z.string().min(1),
  external_header: z.string().optional(),
  category: z.string().optional(),
  data_type: z.enum(['string', 'number', 'boolean', 'enum', 'currency', 'json', 'multiSelect', 'date']),
  allowed_values: z.array(z.string()).optional(),
  synonyms: SynonymsSchema,
  required_for_completion: z.boolean().optional().default(false),
  required_for_export: z.boolean().optional().default(false),
  import_required: z.boolean().optional().default(false),
  ai_usage_notes: z.string().optional(),
  status: z.enum(['active', 'deprecated', 'hidden']).optional().default('active'),
  // LP-3.0.4: Added 'repo' to source enum for repository-sourced attributes
  source: z.enum(['notion', 'derived', 'json', 'repo']).optional(),
  
  // LP-smart-rules-registry-1.0.0: Export control flags
  /** Whether this attribute can be included in exports (default: true for most, false for internal fields) */
  exportable: z.boolean().optional().default(true),
  /** Whether this attribute must have a value for the product to be export-ready */
  requiredForExport: z.boolean().optional().default(false),
  /** Whether this attribute is for internal use only and should never be exposed to external channels */
  internalOnly: z.boolean().optional().default(false),
  /** Channel-specific export configuration */
  export: ExportMetadataSchema,
  
  createdBy: z.string().optional(),
  createdAt: z.union([z.string(), z.object({}).passthrough()]).optional(),
  updatedBy: z.string().optional(),
  updatedAt: z.union([z.string(), z.object({}).passthrough()]).optional(),
});

export type AttributeType = z.infer<typeof AttributeSchema>;
export default AttributeSchema;
