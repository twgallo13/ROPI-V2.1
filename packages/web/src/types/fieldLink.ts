/**
 * FieldLink Types for ROPI AOSS
 * 
 * Type definitions for the canonical field linking feature.
 * Replaces free-text linkedField with structured fieldLink objects.
 * 
 * LP-1.0.1: Implements Observations field picker, client normalization,
 * and server-side validation.
 * 
 * References:
 * - Workflow W1 — Observations: https://www.notion.so/2b845ee1ec5a81b5a4a6d3ea439ec277
 * - Observations Overview: https://www.notion.so/2b845ee1ec5a81e1aeeae43318b38039
 */

/**
 * FieldLink type discriminator
 * - 'product': Top-level product fields (e.g., product.mpn, product.title)
 * - 'attribute': Registry attributes (e.g., attributes.primary_color)
 */
export type FieldLinkType = 'product' | 'attribute';

/**
 * Structured field link object
 * Replaces the legacy free-text linkedField string
 */
export interface FieldLink {
  type: FieldLinkType;
  key: string; // e.g., 'product.mpn' or 'attributes.primary_color'
}

/**
 * Picker option for the FieldPicker component
 */
export interface FieldPickerOption {
  type: FieldLinkType;
  key: string;
  label: string;
  category?: string;
}

/**
 * Top-level product fields available for linking
 */
export const PRODUCT_FIELDS: FieldPickerOption[] = [
  { type: 'product', key: 'product.mpn', label: 'MPN' },
  { type: 'product', key: 'product.sku', label: 'SKU' },
  { type: 'product', key: 'product.title', label: 'Product Title' },
  { type: 'product', key: 'product.name', label: 'Product Name' },
  { type: 'product', key: 'product.brand', label: 'Brand' },
  { type: 'product', key: 'product.category', label: 'Category' },
  { type: 'product', key: 'product.department', label: 'Department' },
  { type: 'product', key: 'product.status', label: 'Status' },
];

/**
 * Validates if a key is a known product field
 */
export function isValidProductField(key: string): boolean {
  const normalizedKey = key.toLowerCase().replace(/^product\./, '');
  const validKeys = ['mpn', 'sku', 'title', 'name', 'brand', 'category', 'department', 'status', 'style_id', 'styleid'];
  return validKeys.includes(normalizedKey);
}
