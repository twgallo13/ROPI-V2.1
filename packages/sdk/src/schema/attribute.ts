/**
 * Attribute Schema Types
 * Per AOSS Section 2.2 — Attribute Validation Schema (JSON)
 * 
 * Defines metadata and validation rules for product attributes.
 */

/**
 * Data type for attribute values
 */
export type AttributeDataType =
  | 'string'
  | 'number'
  | 'boolean'
  | 'date'
  | 'array'
  | 'object';

/**
 * Validation constraint for attribute values
 */
export interface AttributeConstraint {
  type: 'required' | 'min' | 'max' | 'pattern' | 'enum' | 'range';
  value?: any;
  message?: string;
  // TODO (AOSS): Add remaining constraint types from Section 2.2
}

/**
 * Attribute definition from registry
 * Per AOSS Section 2.2 — Attribute Validation Schema
 */
export interface AttributeDefinition {
  key: string; // Unique attribute identifier
  label: string; // Human-readable name
  dataType: AttributeDataType;
  required?: boolean;
  defaultValue?: any;
  allowedValues?: string[]; // Enum values if applicable
  constraints?: AttributeConstraint[];
  description?: string;
  category?: string; // Grouping, e.g., "classification", "physical", "pricing"
  
  // TODO (AOSS): Add remaining fields from Section 2.2 schema
}

/**
 * Attribute value with metadata
 * Represents an actual attribute value on a product
 */
export interface AttributeValue {
  key: string;
  value: any;
  source?: string; // Where this value came from
  confidence?: number; // 0-1, for AI-suggested values
  validatedAt?: string; // ISO timestamp
  // TODO (AOSS): Add remaining value metadata from Section 2.2
}

/**
 * Attribute registry - collection of all attribute definitions
 */
export interface AttributeRegistry {
  attributes: AttributeDefinition[];
  version?: string;
  updatedAt?: string;
  // TODO (AOSS): Add remaining registry metadata from Section 2.2
}
