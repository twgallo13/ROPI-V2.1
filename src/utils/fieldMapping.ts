/**
 * Field Mapping Configuration
 * Maps CSV headers and external sources to Firestore schema paths
 * Created: 2025-11-15
 */

/**
 * CSV to Firestore field mapping
 * Format: "CSV Header" -> "firestore.path.to.field"
 */
export const CSV_TO_FIRESTORE_MAP: Record<string, string> = {
  // SKU Core
  'Department': 'sku_core.department',
  'Class': 'sku_core.class',
  'Category': 'sku_core.category',
  'Mpn': 'sku_core.mpn',
  'MPN': 'sku_core.mpn',
  'SKU': 'sku_core.sku',
  'Sku': 'sku_core.sku',
  'Brand': 'sku_core.brand',
  'Name': 'sku_core.name',
  'Product Name': 'sku_core.name',
  'Style ID': 'sku_core.styleId',
  'StyleId': 'sku_core.styleId',
  'Style Id': 'sku_core.styleId',
  'Core Product': 'sku_core.coreProduct',
  'Product Active': 'sku_core.productIsActive',
  'Product Is Active': 'sku_core.productIsActive',
  'Is Active': 'sku_core.productIsActive',

  // Descriptive
  'Age Group': 'descriptive.ageGroup',
  'AgeGroup': 'descriptive.ageGroup',
  'Gender': 'descriptive.gender',
  'Sports Team': 'descriptive.sportsTeam',
  'Team': 'descriptive.sportsTeam',
  'League': 'descriptive.league',
  'Fit': 'descriptive.fit',
  'Material': 'descriptive.material',
  'Materials': 'descriptive.material',
  'Cut Type': 'descriptive.cutType',
  'CutType': 'descriptive.cutType',
  'Closure Type': 'descriptive.closureType',
  'ClosureType': 'descriptive.closureType',
  'Platform Height': 'descriptive.platformHeight',
  'Heel Type': 'descriptive.heelType',
  'Shoe Height Map': 'descriptive.shoeHeightMap',
  'Heel Height': 'descriptive.heelHeight',
  'Outsole Material': 'descriptive.outsoleMaterial',
  'Primary Color': 'descriptive.primaryColor',
  'Descriptive Color': 'descriptive.descriptiveColor',
  'Color': 'descriptive.descriptiveColor',
  'Keywords': 'descriptive.keywords',
  'Tags': 'descriptive.keywords',
  'Description': 'descriptive.description',
  'Family Sizing': 'descriptive.familySizing',
  'familySizing': 'descriptive.familySizing',
  'Made In': 'descriptive.madeIn',
  'Country of Origin': 'descriptive.madeIn',
  'Meta Name': 'descriptive.metaName',
  'SEO Name': 'descriptive.metaName',
  'Meta Description': 'descriptive.metaDescription',
  'SEO Description': 'descriptive.metaDescription',
  'Slug': 'descriptive.slug',
  'URL Slug': 'descriptive.slug',

  // Pricing
  'MAP': 'pricing.map',
  'Map': 'pricing.map',
  'Minimum Advertised Price': 'pricing.map',
  'Promo': 'pricing.promo',
  'Promotional': 'pricing.promo',
  'SCOM Regular Price': 'pricing.scomRegularPrice',
  'SCOM Sale Price': 'pricing.scomSalePrice',

  // Technical
  'Website': 'technical.website',
  'Websites': 'technical.website',
  'Height': 'technical.height',
  'Length': 'technical.length',
  'Width': 'technical.width',
  'Weight': 'technical.weight',
  'Ship Height': 'technical.height',
  'Ship Length': 'technical.length',
  'Ship Width': 'technical.width',
  'Ship Weight': 'technical.weight',
  'Standard Shipping Override': 'technical.standardShippingOverride',
  'Expedited Shipping Override': 'technical.expeditedOverrideShipping',
  'Hide Image Date': 'technical.hideImageDate',
  'Media Status': 'technical.mediaStatus',
  'Tax Class': 'technical.taxClass',
  'Status': 'technical.status',
  'Last Received': 'technical.lastReceived',
  'First Received': 'technical.firstReceived',
  'Store 1': 'technical.store1',
  'Store Inv': 'technical.storeInv',
  'Warehouse Inv': 'technical.warehouseInv',
  'Whs Inv': 'technical.whsInv',
  'Store 4': 'technical.store4',
  'Total Inv': 'technical.totalInv',

  // Missing human-friendly headers we must support (Technical additions)
  'Media': 'technical.mediaStatus', // Some sheets use simplified header
  'Hide Image Until Date': 'technical.hideImageDate', // Alternate embargo phrasing  'WHS inv': 'technical.whsInv', // Uppercase variant
  'WHS Inv': 'technical.whsInv', // Uppercase variant
  'Custom 2': 'descriptive.custom2', // Custom descriptive field
  'Custom 3': 'descriptive.custom3', // Custom descriptive field
  'Group': 'descriptive.gender', // John: "Group" = Gender (moved from department)
  'Product Is Dropship.Name': 'sku_core.dropshipName', // Dropship name mapping
  'Product Is Dropship': 'sku_core.productIsDropship', // Dropship boolean flag

  // Launch
  'Hype': 'launch.hype',
  'Fast Fashion': 'launch.fastFashion',
  'FastFashion': 'launch.fastFashion',
  'New Collection': 'launch.newCollection',
  'KL Post Date': 'launch.klPostDate',
  'Launch Date': 'launch.launchDate',

  // RICS Source (read-only, import only)
  'RICS Short Description': 'rics_source.shortDescription',
  'RICS Long Description': 'rics_source.longDescription',
  'RICS Brand': 'rics_source.brand',
  'RICS Category': 'rics_source.category',
  'RICS Color': 'rics_source.color',
};

/**
 * Firestore to Export field mapping
 * Only includes fields marked for export
 */
export const FIRESTORE_TO_EXPORT_MAP: Record<string, string> = {
  // SKU Core
  'sku_core.mpn': 'MPN',
  'sku_core.sku': 'SKU',
  'sku_core.brand': 'Brand',
  'sku_core.name': 'Name',
  'sku_core.department': 'Department',
  'sku_core.class': 'Class',
  'sku_core.category': 'Category',
  'sku_core.styleId': 'Style ID',
  'sku_core.coreProduct': 'Core Product',
  'sku_core.productIsActive': 'Product Active',

  // Descriptive (export subset)
  'descriptive.ageGroup': 'Age Group',
  'descriptive.gender': 'Gender',
  'descriptive.sportsTeam': 'Sports Team',
  'descriptive.league': 'League',
  'descriptive.fit': 'Fit',
  'descriptive.material': 'Materials',
  'descriptive.cutType': 'Cut Type',
  'descriptive.closureType': 'Closure Type',
  'descriptive.platformHeight': 'Platform Height',
  'descriptive.heelType': 'Heel Type',
  'descriptive.shoeHeightMap': 'Shoe Height Map',
  'descriptive.heelHeight': 'Heel Height',
  'descriptive.outsoleMaterial': 'Outsole Material',
  'descriptive.primaryColor': 'Primary Color',
  'descriptive.descriptiveColor': 'Descriptive Color',
  'descriptive.keywords': 'Keywords',
  'descriptive.description': 'Description', // AI HTML output
  'descriptive.familySizing': 'Family Sizing',
  'descriptive.madeIn': 'Made In',
  'descriptive.metaName': 'Meta Name',
  'descriptive.metaDescription': 'Meta Description',
  'descriptive.slug': 'Slug',

  // Pricing
  'pricing.map': 'MAP',
  'pricing.promo': 'Promo',
  'pricing.scomRegularPrice': 'SCOM Regular Price',
  'pricing.scomSalePrice': 'SCOM Sale Price',

  // Technical (export subset - no inventory counts)
  'technical.website': 'Website',
  'technical.height': 'Height',
  'technical.length': 'Length',
  'technical.width': 'Width',
  'technical.weight': 'Weight',
  'technical.standardShippingOverride': 'Standard Shipping Override',
  'technical.expeditedOverrideShipping': 'Expedited Shipping Override',
  'technical.taxClass': 'Tax Class',
  'technical.mediaStatus': 'Media Status',

  // Launch
  'launch.hype': 'Hype',
  'launch.fastFashion': 'Fast Fashion',
  'launch.newCollection': 'New Collection',
  'launch.launchDate': 'Launch Date',

  // AI Generated (export subset)
  'ai.seoName': 'SEO Name',
  'ai.ropiScore': 'ROPI Score',
};

/**
 * Field data types for validation and transformation
 */
export const FIELD_TYPES: Record<string, 'string' | 'number' | 'boolean' | 'date' | 'array' | 'object'> = {
  // SKU Core
  'sku_core.mpn': 'string',
  'sku_core.sku': 'string',
  'sku_core.brand': 'string',
  'sku_core.name': 'string',
  'sku_core.department': 'string',
  'sku_core.class': 'string',
  'sku_core.category': 'string',
  'sku_core.styleId': 'string',
  'sku_core.coreProduct': 'boolean',
  'sku_core.productIsActive': 'boolean',
  'sku_core.dropshipName': 'string',
  'sku_core.productIsDropship': 'boolean',

  // Descriptive
  'descriptive.ageGroup': 'string',
  'descriptive.gender': 'string',
  'descriptive.sportsTeam': 'string',
  'descriptive.league': 'string',
  'descriptive.fit': 'string',
  'descriptive.material': 'array',
  'descriptive.cutType': 'string',
  'descriptive.closureType': 'string',
  'descriptive.platformHeight': 'string',
  'descriptive.heelType': 'string',
  'descriptive.shoeHeightMap': 'string',
  'descriptive.heelHeight': 'number',
  'descriptive.outsoleMaterial': 'string',
  'descriptive.primaryColor': 'string',
  'descriptive.descriptiveColor': 'string',
  'descriptive.keywords': 'array',
  'descriptive.description': 'string',
  'descriptive.familySizing': 'boolean',
  'descriptive.madeIn': 'array',
  'descriptive.metaName': 'string',
  'descriptive.metaDescription': 'string',
  'descriptive.slug': 'string',
  'descriptive.custom2': 'string',
  'descriptive.custom3': 'string',

  // Pricing
  'pricing.map': 'number',
  'pricing.promo': 'boolean',
  'pricing.scomRegularPrice': 'number',
  'pricing.scomSalePrice': 'number',

  // Technical
  'technical.website': 'array',
  'technical.height': 'number',
  'technical.length': 'number',
  'technical.width': 'number',
  'technical.weight': 'number',
  'technical.standardShippingOverride': 'number',
  'technical.expeditedOverrideShipping': 'number',
  'technical.hideImageDate': 'date',
  'technical.mediaStatus': 'string',
  'technical.taxClass': 'boolean',
  'technical.status': 'string',
  'technical.lastReceived': 'date',
  'technical.firstReceived': 'date',
  'technical.store1': 'number',
  'technical.storeInv': 'number',
  'technical.warehouseInv': 'number',
  'technical.whsInv': 'number',
  'technical.store4': 'number',
  'technical.totalInv': 'number',
  // Launch
  'launch.hype': 'boolean',
  'launch.fastFashion': 'boolean',
  'launch.newCollection': 'string',
  'launch.klPostDate': 'date',
  'launch.launchDate': 'date',

  // Source (RICS)
  'source.rics.shortDescription': 'string',
  'source.rics.longDescription': 'string',
  'source.rics.brand': 'string',
  'source.rics.category': 'string',
  'source.rics.color': 'string',
};

/**
 * Required fields for product validation
 */
export const REQUIRED_FIELDS: string[] = [
  'sku_core.mpn',
  'sku_core.sku',
  'sku_core.brand',
  'sku_core.name',
  'sku_core.department',
  'sku_core.class',
  'sku_core.category',
  'sku_core.productIsActive',
  'descriptive.ageGroup',
  'descriptive.gender',
];

/**
 * Fields that should trigger Media Status = "Images Ready"
 */
export const MEDIA_STATUS_TRIGGERS: string[] = [
  'technical.hideImageDate',
  'technical.mediaStatus',
];

/**
 * Get nested value from object using dot notation path
 */
export function getNestedValue(obj: any, path: string): any {
  return path.split('.').reduce((acc, part) => acc?.[part], obj);
}

/**
 * Set nested value in object using dot notation path
 */
export function setNestedValue(obj: any, path: string, value: any): void {
  const parts = path.split('.');
  const lastPart = parts.pop()!;
  const target = parts.reduce((acc, part) => {
    if (!acc[part]) acc[part] = {};
    return acc[part];
  }, obj);
  target[lastPart] = value;
}
