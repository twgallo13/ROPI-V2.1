import { describe, it, expect } from 'vitest';

/**
 * v2.4.1: Normalize header to canonical lookup key
 * Handles title-case, spaces, dots, and special characters
 * Example: "Product Is Dropship.Name" -> "product_is_dropship_name"
 */
function normalizeHeaderKey(raw: string | null | undefined): string {
  if (!raw) return '';
  // remove BOM
  const normalized = raw.replace(/^\uFEFF/, '');
  // normalize whitespace, lower case
  let s = normalized.trim().toLowerCase();
  // replace dots and non-word characters with underscore
  s = s.replace(/[\s./\\:-]+/g, '_');
  // remove any characters that aren't alnum or underscore
  s = s.replace(/[^a-z0-9_]/g, '');
  // collapse multiple underscores
  s = s.replace(/_+/g, '_');
  // trim underscores
  s = s.replace(/^_+|_+$/g, '');
  return s;
}

describe('normalizeHeaderKey', () => {
  it('should normalize title-case MPN to lowercase mpn', () => {
    expect(normalizeHeaderKey('MPN')).toBe('mpn');
  });

  it('should normalize Product Is Dropship.Name to product_is_dropship_name', () => {
    expect(normalizeHeaderKey('Product Is Dropship.Name')).toBe('product_is_dropship_name');
  });

  it('should normalize Primary Color to primary_color', () => {
    expect(normalizeHeaderKey('Primary Color')).toBe('primary_color');
  });

  it('should handle multiple spaces and special characters', () => {
    expect(normalizeHeaderKey('Store  Inv')).toBe('store_inv');
    expect(normalizeHeaderKey('RICS-Color')).toBe('rics_color');
    expect(normalizeHeaderKey('KL Post Date')).toBe('kl_post_date');
  });

  it('should remove BOM characters', () => {
    expect(normalizeHeaderKey('\uFEFFMPN')).toBe('mpn');
  });

  it('should handle empty and null values', () => {
    expect(normalizeHeaderKey('')).toBe('');
    expect(normalizeHeaderKey(null)).toBe('');
    expect(normalizeHeaderKey(undefined)).toBe('');
  });

  it('should collapse multiple underscores', () => {
    expect(normalizeHeaderKey('Product___Name')).toBe('product_name');
  });

  it('should trim leading and trailing underscores', () => {
    expect(normalizeHeaderKey('_MPN_')).toBe('mpn');
  });

  it('should handle dots and slashes', () => {
    expect(normalizeHeaderKey('sku.core.mpn')).toBe('sku_core_mpn');
    expect(normalizeHeaderKey('path/to/field')).toBe('path_to_field');
  });

  it('should handle all test CSV headers correctly', () => {
    expect(normalizeHeaderKey('Brand')).toBe('brand');
    expect(normalizeHeaderKey('Name')).toBe('name');
    expect(normalizeHeaderKey('Department')).toBe('department');
    expect(normalizeHeaderKey('Category')).toBe('category');
    expect(normalizeHeaderKey('SKU')).toBe('sku');
    expect(normalizeHeaderKey('Descriptive Color')).toBe('descriptive_color');
    expect(normalizeHeaderKey('Product Is Active')).toBe('product_is_active');
    expect(normalizeHeaderKey('Media Status')).toBe('media_status');
    expect(normalizeHeaderKey('RICS Short Description')).toBe('rics_short_description');
    expect(normalizeHeaderKey('Warehouse Inv')).toBe('warehouse_inv');
    expect(normalizeHeaderKey('SCOM Regular')).toBe('scom_regular');
    expect(normalizeHeaderKey('SCOM Sale')).toBe('scom_sale');
    expect(normalizeHeaderKey('Product Is Dropship Name')).toBe('product_is_dropship_name');
    expect(normalizeHeaderKey('Last Received')).toBe('last_received');
  });
});
