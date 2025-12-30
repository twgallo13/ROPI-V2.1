"use strict";
/**
 * Attribute Registry Loader
 * LP-attr-enforce-2.1.0 — Phase 2 Domain Enforcement
 *
 * Provides access to the canonical attribute registry for domain validation.
 * Loads attributeRegistry.json at runtime and provides lookup utilities.
 */
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.getAttributeRegistry = getAttributeRegistry;
exports.getAttributes = getAttributes;
exports.getAttributeById = getAttributeById;
exports.getAllowedValues = getAllowedValues;
exports.allowsCustomValues = allowsCustomValues;
exports.validateAttributeDomain = validateAttributeDomain;
exports.validateAttributeDomains = validateAttributeDomains;
exports.getRegistryVersion = getRegistryVersion;
const attributeRegistry_json_1 = __importDefault(require("../../config/attributeRegistry.json"));
// ============================================================================
// Registry Access
// ============================================================================
/**
 * Get the full attribute registry
 * @returns The complete registry data including version and all attributes
 */
function getAttributeRegistry() {
    return attributeRegistry_json_1.default;
}
/**
 * Get the list of all attribute definitions
 * @returns Array of attribute definitions
 */
function getAttributes() {
    return attributeRegistry_json_1.default.attributes;
}
/**
 * Get a specific attribute definition by ID
 * @param attributeId - The attribute_id to look up
 * @returns The attribute definition or undefined if not found
 */
function getAttributeById(attributeId) {
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
function getAllowedValues(attributeId) {
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
function allowsCustomValues(attributeId) {
    const attr = getAttributeById(attributeId);
    return attr?.allow_custom_values === true;
}
/**
 * Validate a value against an attribute's domain (allowed_values)
 *
 * @param attributeId - The attribute_id to validate against
 * @param value - The value to validate
 * @returns Validation result with details
 */
function validateAttributeDomain(attributeId, value) {
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
function validateAttributeDomains(attributes) {
    const results = [];
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
function getRegistryVersion() {
    return attributeRegistry_json_1.default.version;
}
//# sourceMappingURL=index.js.map