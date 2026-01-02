/**
 * Registry Validator
 * LP-smart-rules-registry-1.0.0
 * 
 * Validates the canonical attributeRegistry.json format with export control fields.
 */

import { z } from 'zod';

/**
 * Export target enum - valid export channels
 */
export const ExportTargetSchema = z.enum(['shopify', 'google', 'amazon', 'magento', 'csv']);

/**
 * Export metadata schema for channel-specific configuration
 */
export const RegistryExportMetaSchema = z.object({
  /** Column key/header for export */
  key: z.string().optional(),
  /** Omit from export if value is empty */
  omitIfEmpty: z.boolean().optional(),
  /** Target channels */
  targets: z.array(ExportTargetSchema).optional(),
}).strict();

/**
 * Synonyms schema - accepts multiple formats
 */
const SynonymsSchema = z.union([
  z.array(z.string()),
  z.record(z.string(), z.string()),
  z.array(z.object({ alias: z.string(), canonical: z.string() }))
]).optional();

/**
 * Full registry attribute schema matching attributeRegistry.json format
 */
export const RegistryAttributeSchema = z.object({
  // Required fields
  attribute_id: z.string().min(1).regex(/^[a-z0-9-_.]+$/, 'attribute_id must be lowercase with only a-z, 0-9, -, _, .'),
  label: z.string().min(1),
  
  // Optional core fields
  external_header: z.string().optional(),
  category: z.string().optional(),
  data_type: z.enum(['text', 'select', 'multiSelect', 'boolean', 'number', 'date', 'currency', 'json', 'longText', 'string', 'money']).optional(),
  allowed_values: z.array(z.string()).optional(),
  allow_custom_values: z.boolean().optional(),
  aliases: z.array(z.string()).optional(),
  synonyms: SynonymsSchema,
  
  // Completion/import flags
  required_for_completion: z.boolean().optional(),
  required_for_export: z.boolean().optional(),
  import_required: z.boolean().optional(),
  import_strict: z.boolean().optional(),
  
  // Metadata
  ai_usage_notes: z.string().optional(),
  status: z.enum(['active', 'deprecated', 'disabled']).optional(),
  
  // LP-smart-rules-registry-1.0.0: Export control fields
  /** Whether this attribute can be included in exports */
  exportable: z.boolean().optional(),
  /** Whether this attribute must have a value for export */
  requiredForExport: z.boolean().optional(),
  /** Whether this attribute is internal-only */
  internalOnly: z.boolean().optional(),
  /** Channel-specific export configuration */
  export: RegistryExportMetaSchema.optional(),
});

/**
 * Full registry schema
 */
export const CanonicalRegistrySchema = z.object({
  version: z.string().regex(/^\d+\.\d+\.\d+$/, 'version must be semver format (e.g., 1.0.0)'),
  attributes: z.array(RegistryAttributeSchema).min(1, 'Registry must have at least one attribute'),
});

// Types
export type RegistryExportMeta = z.infer<typeof RegistryExportMetaSchema>;
export type RegistryAttributeDef = z.infer<typeof RegistryAttributeSchema>;
export type CanonicalRegistry = z.infer<typeof CanonicalRegistrySchema>;

/**
 * Validate a single registry attribute
 * @param input - The attribute object to validate
 * @returns Validated attribute
 * @throws ZodError if validation fails
 */
export function validateRegistryAttribute(input: unknown): RegistryAttributeDef {
  return RegistryAttributeSchema.parse(input);
}

/**
 * Safely validate a registry attribute (returns result instead of throwing)
 * @param input - The attribute object to validate
 * @returns Validation result with success flag
 */
export function safeValidateRegistryAttribute(input: unknown): z.SafeParseReturnType<unknown, RegistryAttributeDef> {
  return RegistryAttributeSchema.safeParse(input);
}

/**
 * Validate the full canonical registry
 * @param input - The registry JSON object
 * @returns Validated registry
 * @throws ZodError if validation fails
 */
export function validateCanonicalRegistry(input: unknown): CanonicalRegistry {
  return CanonicalRegistrySchema.parse(input);
}

/**
 * Safely validate the canonical registry (returns result instead of throwing)
 * @param input - The registry JSON object
 * @returns Validation result with success flag
 */
export function safeValidateCanonicalRegistry(input: unknown): z.SafeParseReturnType<unknown, CanonicalRegistry> {
  return CanonicalRegistrySchema.safeParse(input);
}

/**
 * Check if export control fields are valid on an attribute
 * - exportable must be boolean if present
 * - internalOnly=true implies exportable=false
 * - requiredForExport=true implies exportable=true (or not set)
 * 
 * @param attr - The attribute to validate
 * @returns Object with valid flag and optional error message
 */
export function validateExportControlConsistency(attr: RegistryAttributeDef): { valid: boolean; message?: string } {
  // internalOnly=true should have exportable=false
  if (attr.internalOnly === true && attr.exportable === true) {
    return {
      valid: false,
      message: `Attribute '${attr.attribute_id}': internalOnly=true is inconsistent with exportable=true`,
    };
  }
  
  // requiredForExport=true should not have exportable=false
  if (attr.requiredForExport === true && attr.exportable === false) {
    return {
      valid: false,
      message: `Attribute '${attr.attribute_id}': requiredForExport=true is inconsistent with exportable=false`,
    };
  }
  
  return { valid: true };
}

/**
 * Validate export control consistency for all attributes in a registry
 * @param registry - The registry to validate
 * @returns Array of error messages (empty if valid)
 */
export function validateRegistryExportConsistency(registry: CanonicalRegistry): string[] {
  const errors: string[] = [];
  
  for (const attr of registry.attributes) {
    const result = validateExportControlConsistency(attr);
    if (!result.valid && result.message) {
      errors.push(result.message);
    }
  }
  
  return errors;
}
