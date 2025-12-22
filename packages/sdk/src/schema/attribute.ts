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
  createdBy: z.string().optional(),
  createdAt: z.union([z.string(), z.object({}).passthrough()]).optional(),
  updatedBy: z.string().optional(),
  updatedAt: z.union([z.string(), z.object({}).passthrough()]).optional(),
});

export type AttributeType = z.infer<typeof AttributeSchema>;
export default AttributeSchema;
