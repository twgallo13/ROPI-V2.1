/**
 * Legacy to Registry Attribute ID Mapping
 * LP-importer-mapping-recon-1.1.0
 * 
 * Temporary translation map: legacy normalized keys => canonical Attribute Registry IDs.
 * Update if registry attribute IDs change. This file is consulted by importNormalizer
 * to preserve backwards compatibility while we migrate consumers to registry IDs.
 * 
 * Source of truth: evidence/importer-mapping-recon/attribute-registry.json (v1.1.4)
 */

export const LEGACY_TO_REGISTRY: Record<string, string> = {
  // ======================================================================
  // SKU / Identifiers (category: sku_core, identifiers)
  // ======================================================================
  'mpn': 'mpn',
  'MPN': 'mpn',
  'manufacturerPartNumber': 'mpn',
  'sku': 'sku',
  'SKU': 'sku',
  'name': 'name',
  'productName': 'name',
  'title': 'name', // legacy alias
  'brand': 'brand',
  'styleId': 'style_id',
  'style_id': 'style_id',
  'gtin': 'gtin',
  'upc': 'gtin',
  'slug': 'slug',

  // ======================================================================
  // Colors (category: color)
  // Registry: primary_color, descriptive_color
  // ======================================================================
  'color': 'primary_color',
  'primaryColor': 'primary_color',
  'primary_color': 'primary_color',
  'mainColor': 'primary_color',
  'main_color': 'primary_color',

  'descriptiveColor': 'descriptive_color',
  'descriptive_color': 'descriptive_color',

  // ======================================================================
  // RICS Reference Fields (category: rics_reference)
  // Note: Registry only has rics_long_desc, rics_short_description
  // ricsCategory and ricsColor are not in registry - kept for legacy CSV import
  // ======================================================================
  'ricsLongDesc': 'rics_long_desc',
  'ricsLongDescription': 'rics_long_desc',
  'rics_long_desc': 'rics_long_desc',
  'ricsShortDesc': 'rics_short_description',
  'ricsShortDescription': 'rics_short_description',
  'rics_short_description': 'rics_short_description',
  // Legacy RICS fields not in registry - map to themselves (unmapped reference)
  'ricsCategory': 'rics_category',
  'rics_category': 'rics_category',
  'ricsColor': 'rics_color',
  'rics_color': 'rics_color',

  // ======================================================================
  // Classification (category: classification)
  // ======================================================================
  'category': 'category',
  'class': 'class',
  'department': 'department',
  'subcategory': 'subcategory',

  // ======================================================================
  // Identity / Demographic (category: identity_demographic)
  // ======================================================================
  'gender': 'gender',
  'ageGroup': 'age_group',
  'age_group': 'age_group',

  // ======================================================================
  // Materials & Construction (category: materials_construction)
  // ======================================================================
  'material': 'material',
  'closureType': 'closure_type',
  'closure_type': 'closure_type',
  'cutType': 'cut_type',
  'cut_type': 'cut_type',
  // LP-1.4.3 aliases
  'heelHeight': 'heel_height',
  'heel_height': 'heel_height',
  'platformHeight': 'platform_height',
  'platform_height': 'platform_height',
  'hideImageUntilDate': 'hide_image_date',
  'hide_image_date': 'hide_image_date',
  'drawing': 'drawing',

  // ======================================================================
  // Sizing / Measurements (category: measurements)
  // ======================================================================
  'size': 'size',
  'shoeWidth': 'shoe_width',
  'shoe_width': 'shoe_width',
  'weight': 'weight',
  'height': 'height',
  'width': 'width',
  'length': 'length',

  // ======================================================================
  // Lifecycle / Dates (category: lifecycle)
  // ======================================================================
  'launchDate': 'launch_date',
  'launch_date': 'launch_date',
  'firstReceived': 'first_received',
  'first_received': 'first_received',
  'lastReceived': 'last_received',
  'last_received': 'last_received',

  // ======================================================================
  // Pricing
  // Note: msrp, cost, retailPrice kept as-is (not in registry as separate attributes)
  // ======================================================================
  'msrp': 'msrp',
  'cost': 'cost',
  'retailPrice': 'retail_price',
  'retail_price': 'retail_price',

  // ======================================================================
  // Inventory / Logistics
  // ======================================================================
  'quantity': 'quantity',
  'warehouse': 'warehouse',
  'location': 'location',

  // ======================================================================
  // Media
  // ======================================================================
  'images': 'images',
  'primaryImage': 'primary_image',
  'primary_image': 'primary_image',

  // ======================================================================
  // Website / Assignment (category: sku_core)
  // ======================================================================
  'website': 'website',
  'websites': 'website',

  // ======================================================================
  // Descriptions (category: copy)
  // ======================================================================
  'description': 'description',
  'shortDescription': 'short_description',
  'short_description': 'short_description',
  'longDescription': 'long_description',
  'long_description': 'long_description',
};

/**
 * Reverse mapping: Registry ID => primary legacy key
 * Used for consumers expecting legacy keys
 */
export const REGISTRY_TO_LEGACY: Record<string, string> = Object.entries(LEGACY_TO_REGISTRY)
  .reduce((acc, [legacy, registry]) => {
    // Only store first occurrence (primary legacy key)
    if (!acc[registry]) {
      acc[registry] = legacy;
    }
    return acc;
  }, {} as Record<string, string>);
