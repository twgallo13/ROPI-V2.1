"use strict";
/**
 * Import Normalization Rules
 * Per AOSS Section 3.2 — Import Normalization Rules
 * LP-importer-mapping-recon-1.1.0: Canonicalize mappings to registry attribute IDs
 * LP-importer-mapping-recon-1.4.0: Add value canonicalization and multiSelect array typing
 *
 * Transforms raw RetailOps CSV data into normalized product fields.
 * Uses canonical Attribute Registry IDs for all targetField values.
 */
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.DEFAULT_COLUMN_MAPPINGS = void 0;
exports.canonicalizeValue = canonicalizeValue;
exports.toMultiSelectArray = toMultiSelectArray;
exports.isMultiSelectField = isMultiSelectField;
exports.normalizeTargetFieldToRegistry = normalizeTargetFieldToRegistry;
exports.sourceColumnMatchesHeader = sourceColumnMatchesHeader;
exports.applyTransform = applyTransform;
exports.normalizeImportRow = normalizeImportRow;
exports.deriveProductId = deriveProductId;
exports.isEmptyRow = isEmptyRow;
exports.validateRequiredFields = validateRequiredFields;
const legacyToRegistryMap_1 = require("./legacyToRegistryMap");
const import_corrections_json_1 = __importDefault(require("../../config/import-corrections.json"));
/**
 * LP-1.4.0: Import corrections lookup table (loaded from import-corrections.json)
 * Maps typos/variants to canonical values on a per-attribute basis.
 * All lookups are case-insensitive.
 */
const IMPORT_CORRECTIONS = import_corrections_json_1.default;
/**
 * LP-1.4.0: Fields that should always be stored as arrays (multiSelect in registry)
 */
const MULTI_SELECT_FIELDS = ['material', 'website', 'websites', 'features', 'images'];
/**
 * LP-1.4.0: Apply canonicalization to a value using the corrections table
 * Performs case-insensitive lookup and returns the canonical value if found.
 *
 * @param value - The raw value to canonicalize
 * @param targetField - The attribute ID to look up corrections for
 * @returns Canonicalized value or original if no correction found
 */
function canonicalizeValue(value, targetField) {
    if (!value || typeof value !== 'string')
        return value;
    const corrections = IMPORT_CORRECTIONS[targetField];
    if (!corrections)
        return value;
    // Case-insensitive lookup
    const lowerValue = value.toLowerCase().trim();
    const canonical = corrections[lowerValue];
    if (canonical) {
        // Log the correction for audit trail
        console.debug(`[LP-1.4.0] Canonicalized ${targetField}: "${value}" → "${canonical}"`);
        return canonical;
    }
    return value;
}
/**
 * LP-1.4.0: Convert a value to an array for multiSelect fields
 * Splits strings by common delimiters (|, ,, ;) or wraps single values.
 *
 * @param value - The value to convert
 * @returns Array of values
 */
function toMultiSelectArray(value) {
    if (value === undefined || value === null || value === '')
        return [];
    if (Array.isArray(value)) {
        return value.map(v => String(v).trim()).filter(v => v.length > 0);
    }
    const strValue = String(value);
    // Check for delimiters
    if (strValue.includes('|') || strValue.includes(',') || strValue.includes(';')) {
        return strValue
            .split(/[|,;]/)
            .map(s => s.trim())
            .filter(s => s.length > 0);
    }
    // Single value - wrap in array
    return [strValue.trim()];
}
/**
 * LP-1.4.0: Check if a field should be stored as an array
 */
function isMultiSelectField(targetField) {
    return MULTI_SELECT_FIELDS.includes(targetField.toLowerCase());
}
/**
 * Helper to normalize a targetField to its canonical registry attribute_id.
 * Accepts either canonical registry IDs or legacy camelCase keys and ensures
 * callers of the normalizer always get registry IDs.
 *
 * @param targetField - The field to normalize (legacy or registry format)
 * @returns Canonical registry attribute_id
 */
function normalizeTargetFieldToRegistry(targetField) {
    if (!targetField)
        return targetField;
    // If it's a known legacy key, translate it
    const mapped = legacyToRegistryMap_1.LEGACY_TO_REGISTRY[targetField];
    if (mapped) {
        return mapped;
    }
    // Otherwise assume it's already canonical
    return targetField;
}
/**
 * Helper to check if a CSV header matches a sourceColumn definition.
 * Supports both string and array sourceColumn formats (LP-1.1.0).
 *
 * @param sourceColumn - String or array of aliases to match
 * @param header - CSV header to check
 * @returns True if header matches any alias (case-insensitive)
 */
function sourceColumnMatchesHeader(sourceColumn, header) {
    const normalizedHeader = header.toLowerCase().trim();
    if (Array.isArray(sourceColumn)) {
        return sourceColumn.some(alias => alias.toLowerCase().trim() === normalizedHeader);
    }
    return sourceColumn.toLowerCase().trim() === normalizedHeader;
}
/**
 * Default column mappings for RetailOps CSV
 * Maps common RO column names to AOSS normalized fields
 *
 * LP-2.1.0: MPN-first — MPN is required, SKU is optional
 * LP-importer-mapping-recon-1.1.0: Use canonical Attribute Registry IDs for targetField
 *
 * Note: sourceColumn may be a string or an array of aliases.
 * targetField must be the canonical Attribute Registry attribute_id.
 * Source of truth: evidence/importer-mapping-recon/attribute-registry.json (v1.1.4)
 */
exports.DEFAULT_COLUMN_MAPPINGS = [
    // ======================================================================
    // Core Identifiers (category: sku_core)
    // MPN is required (LP-2.1.0), SKU is optional
    // ======================================================================
    { sourceColumn: ['MPN', 'mpn', 'Manufacturer Part Number'], targetField: 'mpn', required: true, transform: 'trim' },
    { sourceColumn: ['SKU', 'sku', 'Style'], targetField: 'sku', required: false, transform: 'trim' },
    { sourceColumn: ['Product Name', 'Name', 'name', 'Title'], targetField: 'name', required: false, transform: 'trim' },
    { sourceColumn: ['Brand', 'brand'], targetField: 'brand', required: false, transform: 'trim' },
    { sourceColumn: ['Description', 'description'], targetField: 'description', transform: 'trim' },
    { sourceColumn: ['Style ID', 'styleId', 'style_id'], targetField: 'style_id', transform: 'trim' },
    { sourceColumn: ['GTIN', 'gtin', 'UPC', 'upc'], targetField: 'gtin', transform: 'trim' },
    // ======================================================================
    // Classification (category: classification)
    // ======================================================================
    { sourceColumn: ['Department', 'department'], targetField: 'department', transform: 'trim' },
    { sourceColumn: ['Class', 'class'], targetField: 'class', transform: 'trim' },
    { sourceColumn: ['Category', 'category'], targetField: 'category', transform: 'trim' },
    { sourceColumn: ['Subcategory', 'subcategory'], targetField: 'subcategory', transform: 'trim' },
    // ======================================================================
    // Site Assignment (category: sku_core - multiSelect)
    // LP-1.4.0: website is multiSelect, will be converted to array
    // ======================================================================
    { sourceColumn: ['Website', 'website', 'Websites', 'websites', 'Site'], targetField: 'website', transform: 'trim' },
    // ======================================================================
    // Identity / Demographic (category: identity_demographic)
    // ======================================================================
    { sourceColumn: ['Gender', 'gender'], targetField: 'gender', transform: 'lowercase' },
    { sourceColumn: ['Age Group', 'ageGroup', 'age_group'], targetField: 'age_group', transform: 'trim' },
    // ======================================================================
    // Colors (category: color)
    // Registry: primary_color, descriptive_color
    // ======================================================================
    { sourceColumn: ['Color', 'Primary Color', 'color', 'primary_color'], targetField: 'primary_color', transform: 'trim' },
    { sourceColumn: ['Descriptive Color', 'DescriptiveColor', 'descriptive_color'], targetField: 'descriptive_color', transform: 'trim' },
    // ======================================================================
    // Materials & Construction (category: materials_construction)
    // LP-1.4.0: material is multiSelect, will be converted to array
    // ======================================================================
    { sourceColumn: ['Material', 'material', 'Materials'], targetField: 'material', transform: 'trim' },
    { sourceColumn: ['Closure Type', 'closure', 'closure_type'], targetField: 'closure_type', transform: 'trim' },
    { sourceColumn: ['Cut Type', 'cut_type'], targetField: 'cut_type', transform: 'trim' },
    { sourceColumn: ['Fit', 'fit'], targetField: 'fit', transform: 'trim' },
    // ======================================================================
    // Additional fields added in LP-1.4.3
    // ======================================================================
    { sourceColumn: ['Drawing', 'drawing'], targetField: 'drawing', transform: 'trim' },
    { sourceColumn: ['Hide Image Until Date', 'Hide Image Date', 'hide_image_until_date', 'hide_image_date'], targetField: 'hide_image_date', transform: 'date' },
    { sourceColumn: ['Heel Height', 'heelHeight', 'heel_height'], targetField: 'heel_height', transform: 'trim' },
    { sourceColumn: ['Platform Height', 'platformHeight', 'platform_height'], targetField: 'platform_height', transform: 'trim' },
    // SCOM Pricing (RetailOps)
    { sourceColumn: ['SCOM Regular Price', 'scom_regular_price'], targetField: 'scom_regular_price', transform: 'number' },
    { sourceColumn: ['SCOM Sale Price', 'scom_sale_price'], targetField: 'scom_sale_price', transform: 'number' },
    // ======================================================================
    // Sports & Collections (category: classification)
    // LP-1.4.0: Added sports_team and collection_name mappings
    // ======================================================================
    { sourceColumn: ['Sports Team', 'sports_team', 'Team'], targetField: 'sports_team', transform: 'trim' },
    { sourceColumn: ['Collection Name', 'collection_name', 'Collection'], targetField: 'collection_name', transform: 'trim' },
    { sourceColumn: ['League', 'league'], targetField: 'league', transform: 'trim' },
    // ======================================================================
    // Sizing / Measurements (category: measurements)
    // ======================================================================
    { sourceColumn: ['Size', 'size'], targetField: 'size', transform: 'trim' },
    { sourceColumn: ['Shoe Width', 'shoe_width'], targetField: 'shoe_width', transform: 'trim' },
    { sourceColumn: ['Weight', 'weight'], targetField: 'weight', transform: 'number' },
    // ======================================================================
    // RICS Reference Fields (category: rics_reference)
    // Note: rics_category and rics_color are reference fields (not in registry)
    // ======================================================================
    { sourceColumn: ['RICS Category', 'rics_category', 'ricsCategory'], targetField: 'rics_category', transform: 'trim' },
    { sourceColumn: ['RICS Color', 'rics_color', 'ricsColor'], targetField: 'rics_color', transform: 'trim' },
    { sourceColumn: ['RICS Long Description', 'RICS Long Desc', 'rics_long_desc'], targetField: 'rics_long_desc', transform: 'trim' },
    { sourceColumn: ['RICS Short Description', 'RICS Short Desc', 'rics_short_description'], targetField: 'rics_short_description', transform: 'trim' },
    // ======================================================================
    // Pricing
    // ======================================================================
    { sourceColumn: ['MSRP', 'msrp'], targetField: 'msrp', transform: 'number' },
    { sourceColumn: ['Cost', 'cost'], targetField: 'cost', transform: 'number' },
    { sourceColumn: ['Retail Price', 'retailPrice', 'retail_price'], targetField: 'retail_price', transform: 'number' },
    { sourceColumn: ['Currency', 'currency'], targetField: 'currency', transform: 'uppercase', defaultValue: 'USD' },
    // ======================================================================
    // Inventory / Logistics
    // ======================================================================
    { sourceColumn: ['Quantity', 'Qty', 'quantity'], targetField: 'quantity', transform: 'number', defaultValue: 0 },
    { sourceColumn: ['Warehouse', 'warehouse'], targetField: 'warehouse', transform: 'trim' },
    { sourceColumn: ['Location', 'location'], targetField: 'location', transform: 'trim' },
    // ======================================================================
    // Lifecycle / Dates (category: lifecycle)
    // ======================================================================
    { sourceColumn: ['First Received', 'firstReceived', 'first_received'], targetField: 'first_received', transform: 'date' },
    { sourceColumn: ['Launch Date', 'launchDate', 'launch_date'], targetField: 'launch_date', transform: 'date' },
    // ======================================================================
    // Media
    // ======================================================================
    { sourceColumn: ['Images', 'images', 'image_urls'], targetField: 'images', transform: 'array' },
    { sourceColumn: ['Primary Image', 'primaryImage', 'primary_image'], targetField: 'primary_image', transform: 'trim' },
];
/**
 * Apply transformation to a value based on transform type
 * LP-1.4.6: Exported for unit testing; date transform tolerant of MM/DD/YY, M/D/YYYY, YYYY-MM-DD
 */
function applyTransform(value, transform) {
    if (value === null || value === undefined || value === '') {
        return undefined;
    }
    const strValue = String(value);
    switch (transform) {
        case 'trim':
            return strValue.trim();
        case 'uppercase':
            return strValue.trim().toUpperCase();
        case 'lowercase':
            return strValue.trim().toLowerCase();
        case 'boolean': {
            // LP-product-ordering-import-completeness-0.1.0: Boolean coercion
            // Deterministic rules per Lisa directive
            const normalized = strValue.trim().toLowerCase();
            const trueValues = ['true', '1', 'yes', 'y', 'on', 'allowed'];
            const falseValues = ['false', '0', 'no', 'n', 'off', 'not allowed', 'disallowed'];
            if (trueValues.includes(normalized)) {
                return true;
            }
            if (falseValues.includes(normalized)) {
                return false;
            }
            // Invalid value — caller should mark as issue
            return undefined;
        }
        case 'number': {
            // Remove currency symbols, commas, etc.
            const cleaned = strValue.replace(/[$,\s]/g, '');
            const num = parseFloat(cleaned);
            return isNaN(num) ? undefined : num;
        }
        case 'date': {
            // LP-1.4.6: Tolerant date parsing - accepts YYYY-MM-DD, MM/DD/YY, M/D/YYYY, MM-DD-YYYY
            // Normalizes all accepted values to canonical YYYY-MM-DD strings
            const s = strValue.trim();
            // 1) Accept ISO YYYY-MM-DD directly
            const isoMatch = s.match(/^(\d{4})-(\d{2})-(\d{2})$/);
            if (isoMatch) {
                const [, y, m, d] = isoMatch;
                return `${y}-${m}-${d}`;
            }
            // 2) Accept M/D/YY, MM/DD/YY, M/D/YYYY, MM-DD-YYYY etc.
            //    Normalize to YYYY-MM-DD. Two-digit year heuristic:
            //    70-99 -> 1970-1999, 00-69 -> 2000-2069
            const mdy = s.match(/^(\d{1,2})[\/\-](\d{1,2})[\/\-](\d{2,4})$/);
            if (mdy) {
                let [, mm, dd, yy] = mdy;
                mm = mm.padStart(2, '0');
                dd = dd.padStart(2, '0');
                if (yy.length === 2) {
                    const n = parseInt(yy, 10);
                    const full = n >= 70 ? 1900 + n : 2000 + n;
                    yy = String(full);
                }
                return `${yy}-${mm}-${dd}`;
            }
            // 3) Final fallback to Date parser (covers other browser/node parseable formats)
            const parsed = new Date(s);
            if (!isNaN(parsed.getTime())) {
                const y = parsed.getFullYear();
                const mm = String(parsed.getMonth() + 1).padStart(2, '0');
                const dd = String(parsed.getDate()).padStart(2, '0');
                return `${y}-${mm}-${dd}`;
            }
            // Unparseable
            return undefined;
        }
        case 'array': {
            // Split by pipe, comma, or semicolon
            return strValue
                .split(/[|,;]/)
                .map(s => s.trim())
                .filter(s => s.length > 0);
        }
        default:
            return strValue.trim();
    }
}
/**
 * Find the value from sourceColumns for a given sourceColumn definition.
 * Supports both string and array sourceColumn formats (LP-1.1.0).
 *
 * @param sourceColumns - Raw CSV columns
 * @param sourceColumn - String or array of aliases to match
 * @returns The value from the first matching header, or undefined
 */
function findSourceValue(sourceColumns, sourceColumn) {
    if (Array.isArray(sourceColumn)) {
        // Try each alias in order
        for (const alias of sourceColumn) {
            // Check both exact match and case-insensitive match
            if (sourceColumns[alias] !== undefined) {
                return sourceColumns[alias];
            }
            // Try case-insensitive match
            const key = Object.keys(sourceColumns).find(k => k.toLowerCase().trim() === alias.toLowerCase().trim());
            if (key && sourceColumns[key] !== undefined) {
                return sourceColumns[key];
            }
        }
        return undefined;
    }
    // Single string sourceColumn
    if (sourceColumns[sourceColumn] !== undefined) {
        return sourceColumns[sourceColumn];
    }
    // Try case-insensitive match
    const key = Object.keys(sourceColumns).find(k => k.toLowerCase().trim() === sourceColumn.toLowerCase().trim());
    return key ? sourceColumns[key] : undefined;
}
/**
 * Normalize a single row from RetailOps CSV
 * LP-importer-mapping-recon-1.1.0: Use canonical registry IDs for all targetField values
 * LP-importer-mapping-recon-1.4.0: Apply value canonicalization and multiSelect array typing
 *
 * @param sourceColumns - Raw CSV columns
 * @param mappings - Column mapping configuration (defaults to DEFAULT_COLUMN_MAPPINGS)
 * @returns Normalized fields with canonical registry attribute IDs
 */
function normalizeImportRow(sourceColumns, mappings = exports.DEFAULT_COLUMN_MAPPINGS) {
    const normalized = {};
    for (const mapping of mappings) {
        // LP-1.1.0: Support array sourceColumn
        const sourceValue = findSourceValue(sourceColumns, mapping.sourceColumn);
        // Apply transformation
        let normalizedValue = applyTransform(sourceValue, mapping.transform);
        // Use default value if no value found and default is specified
        if (normalizedValue === undefined && mapping.defaultValue !== undefined) {
            normalizedValue = mapping.defaultValue;
        }
        // Set normalized field using canonical registry ID
        // LP-1.1.0: Ensure targetField is canonical registry attribute_id
        if (normalizedValue !== undefined) {
            const canonicalTarget = normalizeTargetFieldToRegistry(mapping.targetField);
            // LP-1.4.0: Apply value canonicalization for string values
            if (typeof normalizedValue === 'string') {
                normalizedValue = canonicalizeValue(normalizedValue, canonicalTarget);
            }
            // LP-1.4.0: Convert multiSelect fields to arrays
            if (isMultiSelectField(canonicalTarget)) {
                const arrayValue = toMultiSelectArray(normalizedValue);
                // Canonicalize each item in the array
                normalizedValue = arrayValue.map(item => canonicalizeValue(item, canonicalTarget));
            }
            normalized[canonicalTarget] = normalizedValue;
        }
    }
    return normalized;
}
/**
 * Derive product ID from MPN (preferred) or SKU (fallback)
 * LP-2.1.0: MPN-first — prefer MPN for productId derivation
 * Per Product Schema / Attribute Registry — MPN is canonical
 *
 * @param options - Object containing mpn and/or sku
 * @returns Product ID for use in products/{productId}
 */
function deriveProductId({ mpn, sku }) {
    const source = mpn || sku;
    if (!source) {
        return undefined;
    }
    // Convert source to lowercase and replace non-alphanumeric with hyphens
    // e.g., "NK-AIR-MAX-270-BLK-10" -> "nk-air-max-270-blk-10"
    return String(source).toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '');
}
/**
 * Check if a row is empty (all values null/undefined/empty string)
 *
 * @param sourceColumns - Raw CSV columns
 * @returns True if row is empty
 */
function isEmptyRow(sourceColumns) {
    return Object.values(sourceColumns).every(value => value === null || value === undefined || value === '');
}
/**
 * Validate required fields are present after normalization
 * LP-importer-mapping-recon-1.1.0: Use canonical registry IDs
 *
 * @param normalized - Normalized fields
 * @param mappings - Column mappings (to check required fields)
 * @returns Array of missing required field names (deduplicated, canonical registry IDs)
 */
function validateRequiredFields(normalized, mappings = exports.DEFAULT_COLUMN_MAPPINGS) {
    const missingFields = new Set();
    for (const mapping of mappings) {
        if (mapping.required) {
            // Use canonical registry ID for field lookup
            const canonicalTarget = normalizeTargetFieldToRegistry(mapping.targetField);
            const value = normalized[canonicalTarget];
            if (value === undefined || value === null || value === '') {
                missingFields.add(canonicalTarget);
            }
        }
    }
    return Array.from(missingFields);
}
//# sourceMappingURL=importNormalizer.js.map