/**
 * normalizeFieldLink Utility
 * 
 * LP-1.0.1: Client-side normalization helper for field link inputs.
 * Converts user-typed strings into canonical fieldLink objects.
 * 
 * This utility is used when users manually type into the typeahead
 * instead of selecting from the picker options.
 * 
 * References:
 * - Workflow W1 — Observations: https://www.notion.so/2b845ee1ec5a81b5a4a6d3ea439ec277
 * - Observations Overview: https://www.notion.so/2b845ee1ec5a81e1aeeae43318b38039
 */

import { FieldLink, isValidProductField } from '../types/fieldLink';

/**
 * Common aliases/synonyms for product fields
 */
const PRODUCT_FIELD_ALIASES: Record<string, string> = {
  // MPN aliases
  'mpn': 'product.mpn',
  'manufacturer_part_number': 'product.mpn',
  'manufacturer part number': 'product.mpn',
  'part_number': 'product.mpn',
  'part number': 'product.mpn',
  
  // SKU aliases
  'sku': 'product.sku',
  'item_id': 'product.sku',
  'item id': 'product.sku',
  'item': 'product.sku',
  
  // Title/Name aliases
  'title': 'product.title',
  'product_title': 'product.title',
  'product title': 'product.title',
  'name': 'product.name',
  'product_name': 'product.name',
  'product name': 'product.name',
  
  // Brand aliases
  'brand': 'product.brand',
  'brand_name': 'product.brand',
  'brand name': 'product.brand',
  'manufacturer': 'product.brand',
  
  // Category aliases
  'category': 'product.category',
  'product_category': 'product.category',
  
  // Department aliases
  'department': 'product.department',
  'dept': 'product.department',
  
  // Status aliases
  'status': 'product.status',
  'product_status': 'product.status',
  
  // Style ID aliases
  'style_id': 'product.style_id',
  'styleid': 'product.style_id',
  'style id': 'product.style_id',
};

/**
 * Common aliases/synonyms for attribute fields
 * Maps user-friendly names to canonical attribute IDs
 */
const ATTRIBUTE_FIELD_ALIASES: Record<string, string> = {
  // Color aliases
  'color': 'primary_color',
  'main_color': 'primary_color',
  'colour': 'primary_color',
  'primary color': 'primary_color',
  'descriptive_color': 'descriptive_color',
  'descriptive color': 'descriptive_color',
  'descriptivecolor': 'descriptive_color',
  
  // Gender aliases
  'gender': 'gender',
  'sex': 'gender',
  'target_gender': 'gender',
  
  // Age group aliases
  'age_group': 'age_group',
  'agegroup': 'age_group',
  'age-group': 'age_group',
  'age group': 'age_group',
  
  // Material aliases
  'material': 'material',
  'materials': 'material',
  'upper_material': 'material',
  'fabric': 'material',
  
  // Closure aliases
  'closure': 'closure_type',
  'closure_type': 'closure_type',
  'fastening': 'closure_type',
  
  // Fit aliases
  'fit': 'fit',
  'sizing': 'fit',
  
  // Size aliases
  'size': 'size',
  
  // GTIN aliases
  'gtin': 'gtin',
  'upc': 'gtin',
  'barcode': 'gtin',
  
  // Class aliases
  'class': 'class',
  'product_class': 'class',
  
  // Heel height aliases
  'heel_height': 'heel_height',
  'heel height': 'heel_height',
  'heelheight': 'heel_height',
  
  // Description aliases
  'description': 'description_shiekh',
  'description_shiekh': 'description_shiekh',
  'shiekh_description': 'description_shiekh',
  
  // Website aliases
  'website': 'website',
  'websites': 'website',
  
  // Launch date aliases
  'launch_date': 'launch_date',
  'launchdate': 'launch_date',
  'launch date': 'launch_date',
};

/**
 * Converts a snake_case string to snake_case (normalizes variations)
 * Handles spaces, hyphens, and camelCase
 */
export function toSnakeCase(str: string): string {
  return str
    .trim()
    // Handle camelCase by inserting underscore before uppercase letters
    .replace(/([a-z])([A-Z])/g, '$1_$2')
    .toLowerCase()
    // Replace spaces and hyphens with underscores
    .replace(/[\s-]+/g, '_')
    // Remove duplicate underscores
    .replace(/_+/g, '_')
    // Remove leading/trailing underscores
    .replace(/^_|_$/g, '');
}

/**
 * Determines if a string looks like a product field reference
 */
function looksLikeProductField(input: string): boolean {
  const lower = input.toLowerCase();
  
  // Explicit product. prefix
  if (lower.startsWith('product.')) return true;
  
  // Check if it's a known product field alias
  if (PRODUCT_FIELD_ALIASES[lower]) return true;
  
  // Check common product field names
  const productFieldNames = ['mpn', 'sku', 'title', 'name', 'brand', 'category', 'department', 'status', 'style_id'];
  return productFieldNames.includes(toSnakeCase(lower));
}

/**
 * Determines if a string looks like an attribute field reference
 */
function looksLikeAttributeField(input: string): boolean {
  const lower = input.toLowerCase();
  
  // Explicit attributes. prefix
  if (lower.startsWith('attributes.') || lower.startsWith('attribute.')) return true;
  
  // Check if it's a known attribute field alias
  if (ATTRIBUTE_FIELD_ALIASES[lower]) return true;
  
  return false;
}

/**
 * Normalizes a user-typed string into a canonical FieldLink object.
 * 
 * @param input - The user-typed string (e.g., "color", "product.mpn", "attributes.gender")
 * @param attributeIds - Optional array of valid attribute IDs from the registry
 * @returns A normalized FieldLink object, or null if input cannot be normalized
 * 
 * @example
 * normalizeFieldLink('color') // { type: 'attribute', key: 'attributes.primary_color' }
 * normalizeFieldLink('product.mpn') // { type: 'product', key: 'product.mpn' }
 * normalizeFieldLink('MPN') // { type: 'product', key: 'product.mpn' }
 */
export function normalizeFieldLink(
  input: string | null | undefined,
  attributeIds?: string[]
): FieldLink | null {
  // Handle null/undefined/empty
  if (!input || typeof input !== 'string') return null;
  
  const trimmed = input.trim();
  if (!trimmed) return null;
  
  const lower = trimmed.toLowerCase();
  
  // Case 1: Already has explicit prefix
  if (lower.startsWith('product.')) {
    const key = trimmed.replace(/^product\./i, '');
    const snakeKey = toSnakeCase(key);
    
    // Validate it's a known product field
    if (isValidProductField(snakeKey)) {
      return {
        type: 'product',
        key: `product.${snakeKey}`,
      };
    }
    
    // Still return it even if not validated (server will validate)
    return {
      type: 'product',
      key: `product.${snakeKey}`,
    };
  }
  
  if (lower.startsWith('attributes.') || lower.startsWith('attribute.')) {
    const key = trimmed.replace(/^attributes?\./i, '');
    const snakeKey = toSnakeCase(key);
    
    return {
      type: 'attribute',
      key: `attributes.${snakeKey}`,
    };
  }
  
  // Case 2: Check product field aliases
  const productAlias = PRODUCT_FIELD_ALIASES[lower];
  if (productAlias) {
    return {
      type: 'product',
      key: productAlias,
    };
  }
  
  // Case 3: Check attribute field aliases
  const attributeAlias = ATTRIBUTE_FIELD_ALIASES[lower];
  if (attributeAlias) {
    return {
      type: 'attribute',
      key: `attributes.${attributeAlias}`,
    };
  }
  
  // Case 4: Check if it matches a known attribute ID directly
  const snakeInput = toSnakeCase(trimmed);
  if (attributeIds && attributeIds.includes(snakeInput)) {
    return {
      type: 'attribute',
      key: `attributes.${snakeInput}`,
    };
  }
  
  // Case 5: Heuristic - if it looks like a product field
  if (looksLikeProductField(trimmed)) {
    return {
      type: 'product',
      key: `product.${toSnakeCase(trimmed)}`,
    };
  }
  
  // Case 6: Heuristic - if it looks like an attribute field
  if (looksLikeAttributeField(trimmed)) {
    return {
      type: 'attribute',
      key: `attributes.${toSnakeCase(trimmed)}`,
    };
  }
  
  // Case 7: Default to attribute if we can't determine type
  // Most observations are about product attributes
  return {
    type: 'attribute',
    key: `attributes.${toSnakeCase(trimmed)}`,
  };
}

/**
 * Converts a FieldLink object back to a display string
 */
export function fieldLinkToDisplayString(fieldLink: FieldLink | null | undefined): string {
  if (!fieldLink) return '';
  return fieldLink.key;
}

/**
 * Converts a legacy linkedField string to a FieldLink object
 * Used for backward compatibility with existing observations
 */
export function legacyLinkedFieldToFieldLink(
  linkedField: string | null | undefined,
  attributeIds?: string[]
): FieldLink | null {
  return normalizeFieldLink(linkedField, attributeIds);
}

/**
 * Gets the field key without the type prefix
 * @example getFieldKeyWithoutPrefix('product.mpn') returns 'mpn'
 * @example getFieldKeyWithoutPrefix('attributes.color') returns 'color'
 */
export function getFieldKeyWithoutPrefix(fieldLink: FieldLink): string {
  if (fieldLink.type === 'product') {
    return fieldLink.key.replace(/^product\./, '');
  }
  return fieldLink.key.replace(/^attributes\./, '');
}
