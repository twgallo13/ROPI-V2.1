/**
 * Attribute Validator
 * Per AOSS Section 2.2 — Attribute Validation Schema (JSON)
 * 
 * Runtime validation for attribute definitions and values using zod.
 */

import { z } from 'zod';
import type { AttributeDefinition, AttributeValue, AttributeRegistry } from '../schema/attribute';

/**
 * AttributeDataType schema
 */
export const AttributeDataTypeSchema = z.enum([
  'string',
  'number',
  'boolean',
  'date',
  'array',
  'object',
]);

/**
 * AttributeConstraint schema
 */
export const AttributeConstraintSchema = z.object({
  type: z.enum(['required', 'min', 'max', 'pattern', 'enum', 'range']),
  value: z.any().optional(),
  message: z.string().optional(),
  // TODO (AOSS): Add remaining constraint types from Section 2.2
});

/**
 * AttributeDefinition schema
 */
export const AttributeDefinitionSchema = z.object({
  key: z.string().min(1, 'Attribute key is required'),
  label: z.string().min(1, 'Attribute label is required'),
  dataType: AttributeDataTypeSchema,
  required: z.boolean().optional(),
  defaultValue: z.any().optional(),
  allowedValues: z.array(z.string()).optional(),
  constraints: z.array(AttributeConstraintSchema).optional(),
  description: z.string().optional(),
  category: z.string().optional(),
  // TODO (AOSS): Add remaining fields from Section 2.2 schema
});

/**
 * AttributeValue schema
 */
export const AttributeValueSchema = z.object({
  key: z.string().min(1, 'Attribute key is required'),
  value: z.any(), // Required - the actual attribute value
  source: z.string().optional(),
  confidence: z.number().min(0).max(1).optional(),
  validatedAt: z.string().datetime().optional(),
  // TODO (AOSS): Add remaining value metadata from Section 2.2
}).strict();

/**
 * AttributeRegistry schema
 */
export const AttributeRegistrySchema = z.object({
  attributes: z.array(AttributeDefinitionSchema),
  version: z.string().optional(),
  updatedAt: z.string().optional(),
  // TODO (AOSS): Add remaining registry metadata from Section 2.2
});

/**
 * Validate an attribute definition
 * @param input - Unvalidated input
 * @returns Validated AttributeDefinition
 * @throws ZodError if validation fails
 */
export function validateAttributeDefinition(input: unknown): AttributeDefinition {
  return AttributeDefinitionSchema.parse(input);
}

/**
 * Validate an attribute value
 * @param input - Unvalidated input
 * @returns Validated AttributeValue
 * @throws ZodError if validation fails
 */
export function validateAttributeValue(input: unknown): AttributeValue {
  return AttributeValueSchema.parse(input) as AttributeValue;
}

/**
 * Validate an attribute registry
 * @param input - Unvalidated input
 * @returns Validated AttributeRegistry
 * @throws ZodError if validation fails
 */
export function validateAttributeRegistry(input: unknown): AttributeRegistry {
  return AttributeRegistrySchema.parse(input);
}

/**
 * Validate multiple attribute definitions
 * @param input - Unvalidated input array
 * @returns Validated array of AttributeDefinition objects
 * @throws ZodError if validation fails
 */
export function validateAttributes(input: unknown): AttributeDefinition[] {
  return z.array(AttributeDefinitionSchema).parse(input);
}

/**
 * Safe validate - returns success/error result
 * @param input - Unvalidated input
 * @returns Validation result with data or error
 */
export function safeValidateAttributeDefinition(
  input: unknown
): z.SafeParseReturnType<unknown, AttributeDefinition> {
  return AttributeDefinitionSchema.safeParse(input);
}
