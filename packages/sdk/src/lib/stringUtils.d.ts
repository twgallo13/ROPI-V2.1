/**
 * String utility functions for attribute normalization
 * @module stringUtils
 *
 * LP-2.1.6: Canonical attribute ID normalization
 */
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
export declare function toSnakeCase(input: string): string;
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
export declare function normalizeDataType(dataType: string): string;
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
export declare function wouldCollide(id1: string, id2: string): boolean;
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
export declare function detectCollisions(ids: string[]): Array<{
    canonical: string;
    originals: string[];
}>;
//# sourceMappingURL=stringUtils.d.ts.map