/**
 * Product Utility Functions
 * LP-3.0.2: Defensive access helpers for product attributes
 * LP-3.0.7: Generic safe accessors for any array/object
 * 
 * These utilities ensure safe access to product.attributes fields
 * without runtime TypeErrors when attributes or sub-fields are undefined.
 */

import type { Product } from '../types/product';

/**
 * LP-3.0.7: Generic safe array accessor
 * Safely returns an array, or empty array if value is not an array
 */
export function safeArray<T>(value: T[] | undefined | null): T[] {
  return Array.isArray(value) ? value : [];
}

/**
 * LP-3.0.7: Generic safe object accessor
 * Safely returns an object, or empty object if value is not an object
 */
export function safeObject<T extends object>(value: T | undefined | null): T {
  return (value && typeof value === 'object' && !Array.isArray(value)) 
    ? value 
    : {} as T;
}

/**
 * Safely get an array attribute from a product.
 * Returns an empty array if the attribute is undefined or not an array.
 * 
 * @param product - The product object (may have undefined attributes)
 * @param key - The attribute key to access
 * @returns Array of values or empty array
 */
export function safeAttributeArray<T = unknown>(
  product: Product | null | undefined,
  key: string
): T[] {
  const value = product?.attributes?.[key];
  return Array.isArray(value) ? (value as T[]) : [];
}

/**
 * Safely get an object attribute from a product.
 * Returns an empty object if the attribute is undefined.
 * 
 * @param product - The product object (may have undefined attributes)
 * @param key - The attribute key to access
 * @returns Object value or empty object
 */
export function safeAttributeObject<T = Record<string, unknown>>(
  product: Product | null | undefined,
  key: string
): T {
  const value = product?.attributes?.[key];
  return (value && typeof value === 'object' && !Array.isArray(value))
    ? (value as T)
    : ({} as T);
}

/**
 * Safely get any attribute value from a product.
 * Returns the default value if the attribute is undefined.
 * 
 * @param product - The product object (may have undefined attributes)
 * @param key - The attribute key to access
 * @param defaultValue - Default value if attribute is undefined
 * @returns Attribute value or default
 */
export function safeAttribute<T>(
  product: Product | null | undefined,
  key: string,
  defaultValue: T
): T {
  const value = product?.attributes?.[key];
  return value !== undefined ? (value as T) : defaultValue;
}

/**
 * Safely get the overall attributes object from a product.
 * The 'overall' field contains aggregated/computed attribute values.
 * 
 * @param product - The product object
 * @returns The overall attributes object or empty object
 */
export function safeOverall(
  product: Product | null | undefined
): Record<string, unknown> {
  return safeAttributeObject(product, 'overall');
}

/**
 * Safely access a nested property within product.attributes.overall
 * 
 * @param product - The product object
 * @param key - The key within overall to access
 * @returns Array of values or empty array
 */
export function safeOverallArray<T = unknown>(
  product: Product | null | undefined,
  key: string
): T[] {
  const overall = safeOverall(product);
  const value = overall?.[key];
  return Array.isArray(value) ? value : [];
}

/**
 * Check if product has a valid attributes object
 * 
 * @param product - The product object
 * @returns true if product.attributes exists and is an object
 */
export function hasAttributes(product: Product | null | undefined): boolean {
  return Boolean(product?.attributes && typeof product.attributes === 'object');
}

/**
 * Check if product has the overall sub-object
 * 
 * @param product - The product object
 * @returns true if product.attributes.overall exists
 */
export function hasOverall(product: Product | null | undefined): boolean {
  return Boolean(product?.attributes?.overall);
}
