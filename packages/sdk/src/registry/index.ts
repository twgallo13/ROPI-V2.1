/**
 * Attribute Registry Loader
 * LP-attr-enforce-2.1.0 — Phase 2 Domain Enforcement
 * LP-smart-rules-registry-1.0.0 — Export metadata and control flags
 * 
 * Provides access to the canonical attribute registry for domain validation.
 * Loads attributeRegistry.json at runtime and provides lookup utilities.
 */

import registryData from '../../config/attributeRegistry.json';

// ============================================================================
// Types
// ============================================================================

/**
 * Export target channels
 * LP-smart-rules-registry-1.0.0
 */
export type ExportTarget = 'shopify' | 'google' | 'amazon' | 'magento' | 'csv';

/**
 * Export metadata for channel-specific configuration
 * LP-smart-rules-registry-1.0.0
 */
export interface ExportMeta {
  /** Column key/header for export (if different from attribute_id) */
  key?: string;
  /** Omit this field from export if value is empty/null/undefined */
  omitIfEmpty?: boolean;
  /** Export target channels this attribute applies to */
  targets?: ExportTarget[];
}

/**
 * Attribute definition from the registry
 */
export interface RegistryAttribute {
  attribute_id: string;
  label: string;
  external_header?: string;
  category?: string;
  data_type: 'text' | 'select' | 'multiSelect' | 'boolean' | 'number' | 'date' | 'currency' | 'json';
  allowed_values?: string[];
  allow_custom_values?: boolean;
  synonyms?: string[] | Record<string, string>;
  required_for_completion?: boolean;
  required_for_export?: boolean;
  import_required?: boolean;
  import_strict?: boolean;
  ai_usage_notes?: string;
  status?: 'active' | 'deprecated' | 'disabled';
  
  // LP-smart-rules-registry-1.0.0: Export control flags
  /** Whether this attribute can be included in exports (default: true) */
  exportable?: boolean;
  /** Whether this attribute must have a value for export (alias for required_for_export) */
  requiredForExport?: boolean;
  /** Whether this attribute is internal-only and should never be exported */
  internalOnly?: boolean;
  /** Channel-specific export configuration */
  export?: ExportMeta;
}

/**
 * Full registry structure
 */
export interface AttributeRegistryData {
  version: string;
  attributes: RegistryAttribute[];
}

// ============================================================================
// Registry Access
// ============================================================================

/**
 * Get the full attribute registry
 * @returns The complete registry data including version and all attributes
 */
export function getAttributeRegistry(): AttributeRegistryData {
  return registryData as AttributeRegistryData;
}

/**
 * Get the list of all attribute definitions
 * @returns Array of attribute definitions
 */
export function getAttributes(): RegistryAttribute[] {
  return (registryData as AttributeRegistryData).attributes;
}

/**
 * Get a specific attribute definition by ID
 * @param attributeId - The attribute_id to look up
 * @returns The attribute definition or undefined if not found
 */
export function getAttributeById(attributeId: string): RegistryAttribute | undefined {
  const normalizedId = attributeId.toLowerCase().replace(/[-\s]/g, '_');
  return getAttributes().find(attr => {
    const attrNormalized = attr.attribute_id.toLowerCase().replace(/[-\s]/g, '_');
    return attrNormalized === normalizedId;
  });
}

/**
 * Get allowed values for an attribute
 * @param attributeId - The attribute_id to look up
 * @returns Array of allowed values, or undefined if attribute has no domain constraint
 */
export function getAllowedValues(attributeId: string): string[] | undefined {
  const attr = getAttributeById(attributeId);
  if (!attr || !attr.allowed_values || attr.allowed_values.length === 0) {
    return undefined;
  }
  return attr.allowed_values;
}

/**
 * Check if an attribute allows custom values beyond the allowed_values list
 * @param attributeId - The attribute_id to check
 * @returns true if custom values are allowed, false otherwise
 */
export function allowsCustomValues(attributeId: string): boolean {
  const attr = getAttributeById(attributeId);
  return attr?.allow_custom_values === true;
}

// ============================================================================
// Domain Validation
// ============================================================================

/**
 * Result of domain validation
 */
export interface DomainValidationResult {
  valid: boolean;
  attributeId: string;
  value: unknown;
  allowedValues?: string[];
  message?: string;
}

/**
 * Validate a value against an attribute's domain (allowed_values)
 * 
 * @param attributeId - The attribute_id to validate against
 * @param value - The value to validate
 * @returns Validation result with details
 */
export function validateAttributeDomain(attributeId: string, value: unknown): DomainValidationResult {
  const attr = getAttributeById(attributeId);
  
  // If attribute not found in registry, pass through (unknown attributes are handled elsewhere)
  if (!attr) {
    return {
      valid: true,
      attributeId,
      value,
      message: `Attribute '${attributeId}' not found in registry (skipping domain check)`,
    };
  }
  
  // If no allowed_values defined, any value is valid
  const allowedValues = attr.allowed_values;
  if (!allowedValues || allowedValues.length === 0) {
    return {
      valid: true,
      attributeId,
      value,
    };
  }
  
  // If custom values are allowed, always valid
  if (attr.allow_custom_values) {
    return {
      valid: true,
      attributeId,
      value,
      allowedValues,
    };
  }
  
  // Handle null/undefined/empty
  if (value === null || value === undefined || value === '') {
    return {
      valid: true, // Empty values are allowed (required check is separate)
      attributeId,
      value,
      allowedValues,
    };
  }
  
  // Handle array values (multiSelect)
  if (Array.isArray(value)) {
    const invalidValues = value.filter(v => {
      const strVal = String(v).trim();
      return !allowedValues.some(av => av.toLowerCase() === strVal.toLowerCase());
    });
    
    if (invalidValues.length > 0) {
      return {
        valid: false,
        attributeId,
        value,
        allowedValues,
        message: `Invalid values for '${attributeId}': [${invalidValues.join(', ')}]. Allowed: [${allowedValues.join(', ')}]`,
      };
    }
    
    return {
      valid: true,
      attributeId,
      value,
      allowedValues,
    };
  }
  
  // Handle single value (select/enum)
  const strValue = String(value).trim();
  
  // Case-insensitive match
  const isValid = allowedValues.some(av => av.toLowerCase() === strValue.toLowerCase());
  
  if (!isValid) {
    return {
      valid: false,
      attributeId,
      value: strValue,
      allowedValues,
      message: `Invalid value '${strValue}' for '${attributeId}'. Allowed: [${allowedValues.join(', ')}]`,
    };
  }
  
  return {
    valid: true,
    attributeId,
    value: strValue,
    allowedValues,
  };
}

/**
 * Validate multiple attributes at once
 * 
 * @param attributes - Object with attribute_id keys and values
 * @returns Array of validation results (only invalid results included)
 */
export function validateAttributeDomains(attributes: Record<string, unknown>): DomainValidationResult[] {
  const results: DomainValidationResult[] = [];
  
  for (const [key, value] of Object.entries(attributes)) {
    const result = validateAttributeDomain(key, value);
    if (!result.valid) {
      results.push(result);
    }
  }
  
  return results;
}

/**
 * Get the registry version
 * @returns The version string from the registry
 */
export function getRegistryVersion(): string {
  return (registryData as AttributeRegistryData).version;
}

// ============================================================================
// Export Control Helpers (LP-smart-rules-registry-1.0.0)
// ============================================================================

/**
 * Check if an attribute is exportable
 * An attribute is exportable if:
 * - It has exportable: true (or not explicitly set to false)
 * - It is not marked as internalOnly: true
 * 
 * @param attributeId - The attribute_id to check
 * @returns true if the attribute can be exported
 */
export function isExportable(attributeId: string): boolean {
  const attr = getAttributeById(attributeId);
  if (!attr) return true; // Unknown attributes pass through
  
  // Internal-only attributes are never exportable
  if (attr.internalOnly === true) return false;
  
  // Check explicit exportable flag (default: true)
  return attr.exportable !== false;
}

/**
 * Check if an attribute is required for export
 * @param attributeId - The attribute_id to check
 * @returns true if the attribute must have a value for export
 */
export function isRequiredForExport(attributeId: string): boolean {
  const attr = getAttributeById(attributeId);
  if (!attr) return false;
  
  // Check both the new requiredForExport and legacy required_for_export
  return attr.requiredForExport === true || attr.required_for_export === true;
}

/**
 * Check if an attribute is internal-only
 * @param attributeId - The attribute_id to check
 * @returns true if the attribute should never be exported
 */
export function isInternalOnly(attributeId: string): boolean {
  const attr = getAttributeById(attributeId);
  return attr?.internalOnly === true;
}

/**
 * Get export metadata for an attribute
 * @param attributeId - The attribute_id to look up
 * @returns Export metadata or undefined if not defined
 */
export function getExportMeta(attributeId: string): ExportMeta | undefined {
  const attr = getAttributeById(attributeId);
  return attr?.export;
}

/**
 * Get all exportable attributes
 * @returns Array of attribute definitions that can be exported
 */
export function getExportableAttributes(): RegistryAttribute[] {
  return getAttributes().filter(attr => {
    if (attr.internalOnly === true) return false;
    return attr.exportable !== false;
  });
}

/**
 * Get all attributes required for export
 * @returns Array of attribute definitions that must have values for export
 */
export function getRequiredForExportAttributes(): RegistryAttribute[] {
  return getAttributes().filter(attr => 
    attr.requiredForExport === true || attr.required_for_export === true
  );
}

/**
 * Get all internal-only attributes
 * @returns Array of attribute definitions marked as internal-only
 */
export function getInternalOnlyAttributes(): RegistryAttribute[] {
  return getAttributes().filter(attr => attr.internalOnly === true);
}

/**
 * Get attributes for a specific export target
 * @param target - The export target channel
 * @returns Array of attribute definitions that apply to the target
 */
export function getAttributesForTarget(target: ExportTarget): RegistryAttribute[] {
  return getAttributes().filter(attr => {
    // Skip non-exportable attributes
    if (attr.internalOnly === true || attr.exportable === false) return false;
    
    // If no export metadata, include by default
    if (!attr.export?.targets) return true;
    
    // Check if target is in the targets list
    return attr.export.targets.includes(target);
  });
}
