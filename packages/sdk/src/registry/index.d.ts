/**
 * Attribute Registry Loader
 * LP-attr-enforce-2.1.0 — Phase 2 Domain Enforcement
 *
 * Provides access to the canonical attribute registry for domain validation.
 * Loads attributeRegistry.json at runtime and provides lookup utilities.
 */
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
}
/**
 * Full registry structure
 */
export interface AttributeRegistryData {
    version: string;
    attributes: RegistryAttribute[];
}
/**
 * Get the full attribute registry
 * @returns The complete registry data including version and all attributes
 */
export declare function getAttributeRegistry(): AttributeRegistryData;
/**
 * Get the list of all attribute definitions
 * @returns Array of attribute definitions
 */
export declare function getAttributes(): RegistryAttribute[];
/**
 * Get a specific attribute definition by ID
 * @param attributeId - The attribute_id to look up
 * @returns The attribute definition or undefined if not found
 */
export declare function getAttributeById(attributeId: string): RegistryAttribute | undefined;
/**
 * Get allowed values for an attribute
 * @param attributeId - The attribute_id to look up
 * @returns Array of allowed values, or undefined if attribute has no domain constraint
 */
export declare function getAllowedValues(attributeId: string): string[] | undefined;
/**
 * Check if an attribute allows custom values beyond the allowed_values list
 * @param attributeId - The attribute_id to check
 * @returns true if custom values are allowed, false otherwise
 */
export declare function allowsCustomValues(attributeId: string): boolean;
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
export declare function validateAttributeDomain(attributeId: string, value: unknown): DomainValidationResult;
/**
 * Validate multiple attributes at once
 *
 * @param attributes - Object with attribute_id keys and values
 * @returns Array of validation results (only invalid results included)
 */
export declare function validateAttributeDomains(attributes: Record<string, unknown>): DomainValidationResult[];
/**
 * Get the registry version
 * @returns The version string from the registry
 */
export declare function getRegistryVersion(): string;
//# sourceMappingURL=index.d.ts.map