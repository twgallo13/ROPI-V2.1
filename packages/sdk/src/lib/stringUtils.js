"use strict";
/**
 * String utility functions for attribute normalization
 * @module stringUtils
 *
 * LP-2.1.6: Canonical attribute ID normalization
 */
Object.defineProperty(exports, "__esModule", { value: true });
exports.toSnakeCase = toSnakeCase;
exports.normalizeDataType = normalizeDataType;
exports.wouldCollide = wouldCollide;
exports.detectCollisions = detectCollisions;
/**
 * Converts a string to snake_case format.
 *
 * Transformation rules:
 * 1. Replace dots with underscores (e.g., "legacy.sku" → "legacy_sku")
 * 2. Insert underscore before uppercase letters following lowercase/digit
 * 3. Replace spaces and hyphens with underscores
 * 4. Remove non-alphanumeric characters (except underscore)
 * 5. Collapse multiple underscores to single
 * 6. Trim leading/trailing underscores
 * 7. Convert to lowercase
 *
 * @param input - The string to convert
 * @returns snake_case formatted string
 *
 * @example
 * toSnakeCase('myAttributeName') // 'my_attribute_name'
 * toSnakeCase('legacy.productId') // 'legacy_product_id'
 * toSnakeCase('SKU-Number') // 'sku_number'
 * toSnakeCase('   test  ') // 'test'
 */
function toSnakeCase(input) {
    if (!input)
        return '';
    // Step 1: Replace dots with underscores
    let s = input.replace(/\./g, '_');
    // Step 2: Insert underscore before uppercase letters following lowercase/digit
    s = s.replace(/([a-z0-9])([A-Z])/g, '$1_$2');
    // Step 3: Replace spaces and hyphens with underscores
    s = s.replace(/[\s\-]+/g, '_');
    // Step 4: Remove non-alphanumeric characters (except underscore)
    s = s.replace(/[^A-Za-z0-9_]/g, '');
    // Step 5: Collapse multiple underscores and trim
    s = s.replace(/__+/g, '_').replace(/^_+|_+$/g, '');
    // Step 6: Convert to lowercase
    return s.toLowerCase();
}
/**
 * Data type lexicon for normalizing attribute data types.
 * Maps various input formats to canonical types.
 */
const DATA_TYPE_MAP = {
    // String variants
    'text': 'string',
    'longtext': 'string',
    'string': 'string',
    'varchar': 'string',
    'char': 'string',
    // Enum/select variants
    'select': 'enum',
    'dropdown': 'enum',
    'enum': 'enum',
    'choice': 'enum',
    // Boolean variants
    'boolean': 'boolean',
    'bool': 'boolean',
    'yesno': 'boolean',
    'checkbox': 'boolean',
    // Number variants
    'number': 'number',
    'int': 'number',
    'integer': 'number',
    'float': 'number',
    'decimal': 'number',
    'numeric': 'number',
    'price': 'number',
    'currency': 'number',
    'money': 'number',
    // Array variants
    'array': 'array',
    'list': 'array',
    'multiselect': 'array',
    'multi-select': 'array',
    // Date variants
    'date': 'date',
    'datetime': 'date',
    'timestamp': 'date',
    // Object/JSON variants
    'object': 'object',
    'json': 'object',
    'map': 'object'
};
/**
 * Normalizes a data type string to a canonical form.
 *
 * @param dataType - The data type string to normalize
 * @returns Canonical data type (defaults to 'string' if unknown)
 *
 * @example
 * normalizeDataType('text') // 'string'
 * normalizeDataType('select') // 'enum'
 * normalizeDataType('multiselect') // 'array'
 * normalizeDataType('unknown') // 'string'
 */
function normalizeDataType(dataType) {
    if (!dataType)
        return 'string';
    const normalized = DATA_TYPE_MAP[dataType.toLowerCase().trim()];
    return normalized || 'string';
}
/**
 * Checks if two original IDs would collide after snake_case conversion.
 *
 * @param id1 - First original ID
 * @param id2 - Second original ID
 * @returns true if they collide (same canonical form)
 *
 * @example
 * wouldCollide('myAttr', 'my_attr') // true
 * wouldCollide('myAttr', 'yourAttr') // false
 */
function wouldCollide(id1, id2) {
    return toSnakeCase(id1) === toSnakeCase(id2);
}
/**
 * Detects collisions in a list of attribute IDs after snake_case conversion.
 *
 * @param ids - Array of original attribute IDs
 * @returns Array of collision groups, each containing IDs that map to the same canonical form
 *
 * @example
 * detectCollisions(['myAttr', 'my_attr', 'otherAttr'])
 * // Returns: [{ canonical: 'my_attr', originals: ['myAttr', 'my_attr'] }]
 */
function detectCollisions(ids) {
    const canonicalMap = new Map();
    for (const id of ids) {
        const canonical = toSnakeCase(id);
        const existing = canonicalMap.get(canonical) || [];
        existing.push(id);
        canonicalMap.set(canonical, existing);
    }
    const collisions = [];
    for (const [canonical, originals] of canonicalMap) {
        if (originals.length > 1) {
            collisions.push({ canonical, originals });
        }
    }
    return collisions;
}
//# sourceMappingURL=stringUtils.js.map