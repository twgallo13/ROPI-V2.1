#!/usr/bin/env node
/**
 * Headless Admin Import Script (Staging)
 * Usage: node admin-import-staging.cjs test-import.csv
 * Creates product doc(s) in Firestore using service account credentials.
 */
const fs = require('fs');
const path = require('path');
const { parse } = require('csv-parse/sync');
const admin = require('firebase-admin');

const saPath = process.env.GOOGLE_APPLICATION_CREDENTIALS || '/secrets/staging-service-account.json';
if (!fs.existsSync(saPath)) {
  console.error('Missing staging service account JSON at', saPath);
  process.exit(1);
}
const serviceAccount = require(saPath);

admin.initializeApp({ credential: admin.credential.cert(serviceAccount) });
const db = admin.firestore();

/**
 * v2.4.1: Normalize header to canonical lookup key
 * Handles title-case, spaces, dots, and special characters
 * Example: "Product Is Dropship.Name" -> "product_is_dropship_name"
 */
function normalizeHeaderKey(raw) {
  if (!raw) return '';
  // remove BOM
  raw = raw.replace(/^\uFEFF/, '');
  // normalize whitespace, lower case
  let s = raw.trim().toLowerCase();
  // replace dots and non-word characters with underscore
  s = s.replace(/[\s\.\/\\:-]+/g, '_');
  // remove any characters that aren't alnum or underscore
  s = s.replace(/[^a-z0-9_]/g, '');
  // collapse multiple underscores
  s = s.replace(/_+/g, '_');
  // trim underscores
  s = s.replace(/^_+|_+$/g, '');
  return s;
}

// Parse CLI args (v2.3: validation mode support)
const args = process.argv.slice(2);
let file = null;
let validationMode = 'full'; // default

for (let i = 0; i < args.length; i++) {
  const arg = args[i];
  if (arg.startsWith('--validation=')) {
    validationMode = arg.split('=')[1];
    if (validationMode !== 'minimal' && validationMode !== 'full') {
      console.error('Invalid validation mode. Use: --validation=minimal or --validation=full');
      process.exit(1);
    }
  } else if (!file) {
    file = arg;
  }
}

if (!file) {
  console.error('Usage: node admin-import-staging.cjs <file.csv> [--validation=minimal|full]');
  process.exit(1);
}

const csvPath = path.resolve(file);
if (!fs.existsSync(csvPath)) {
  console.error('CSV file not found:', csvPath);
  process.exit(1);
}

console.log(`[v2.3] Validation mode: ${validationMode}`);

// Minimal mapping for snake_case test-import.csv headers
const MAP = {
  age_group: 'descriptive.ageGroup',
  gender: 'descriptive.gender',
  department: 'sku_core.department',
  class: 'sku_core.class',
  category: 'sku_core.category',
  website: 'technical.website',
  sports_team: 'descriptive.sportsTeam',
  league: 'descriptive.league',
  fit: 'descriptive.fit',
  material: 'descriptive.material',
  map: 'pricing.map',
  promo: 'pricing.promo',
  hype: 'launch.hype',
  fast_fashion: 'launch.fastFashion',
  cut_type: 'descriptive.cutType',
  closure_type: 'descriptive.closureType',
  platform_height: 'descriptive.platformHeight',
  heel_type: 'descriptive.heelType',
  height: 'technical.height',
  length: 'technical.length',
  width: 'technical.width',
  weight: 'technical.weight',
  standard_shipping_override: 'technical.standardShippingOverride',
  expedited_override_shipping: 'technical.expeditedOverrideShipping',
  hide_image_date: 'technical.hideImageDate',
  style_id: 'sku_core.styleId',
  shoe_height_map: 'descriptive.shoeHeightMap',
  heel_height: 'descriptive.heelHeight',
  outsole_material: 'descriptive.outsoleMaterial',
  scom_regular: 'pricing.scomRegularPrice',
  scom_sale: 'pricing.scomSalePrice',
  core_product: 'sku_core.coreProduct',
  primary_color: 'descriptive.primaryColor',
  descriptive_color: 'descriptive.descriptiveColor',
  keywords: 'descriptive.keywords',
  description: 'descriptive.description',
  tax_class: 'technical.taxClass',
  collection: 'launch.newCollection',
  kl_post_date: 'launch.klPostDate',
  product_is_active: 'sku_core.productIsActive',
  launch_date: 'launch.launchDate',
  media_status: 'technical.mediaStatus',
  rics_short_description: 'source.rics.shortDescription',
  rics_long_description: 'source.rics.longDescription',
  last_received: 'technical.lastReceived',
  first_received: 'technical.firstReceived',
  store1: 'technical.store1',
  store_inv: 'technical.storeInv',
  warehouse_inv: 'technical.warehouseInv',
  whs_inv: 'technical.whsInv',
  store4: 'technical.store4',
  total_inv: 'technical.totalInv',
  rics_brand: 'source.rics.brand',
  status: 'technical.status',
  mpn: 'sku_core.mpn',
  sku: 'sku_core.sku',
  brand: 'sku_core.brand',
  name: 'sku_core.name',
  slug: 'descriptive.slug',
  rics_category: 'source.rics.category',
  rics_color: 'source.rics.color',
  family_sizing: 'descriptive.familySizing',
  made_in: 'descriptive.madeIn',
  meta_name: 'descriptive.metaName',
  meta_description: 'descriptive.metaDescription',
  product_is_dropship: 'sku_core.productIsDropship', // Lisa v1.0: dropship boolean
  'Custom 2': 'descriptive.custom2', // Lisa v1.0: custom field 2
  'Custom 3': 'descriptive.custom3', // Lisa v1.0: custom field 3
  'Product Is Dropship.Name': 'sku_core.dropshipName', // Lisa v1.0: dropship name
};

function setNested(obj, path, value) {
  const parts = path.split('.');
  let cur = obj;
  for (let i = 0; i < parts.length - 1; i++) {
    if (!cur[parts[i]]) cur[parts[i]] = {};
    cur = cur[parts[i]];
  }
  cur[parts[parts.length - 1]] = value;
}

function transform(key, value) {
  if (value === '' || value == null) return null;
  const numFields = new Set([
    'pricing.map', 'pricing.scomRegularPrice', 'pricing.scomSalePrice',
    'technical.height', 'technical.length', 'technical.width', 'technical.weight',
    'technical.standardShippingOverride', 'technical.expeditedOverrideShipping',
    'descriptive.heelHeight', 'technical.store1', 'technical.storeInv', 'technical.warehouseInv', 'technical.whsInv', 'technical.store4', 'technical.totalInv'
  ]);
  const boolFields = new Set([
    'pricing.promo', 'launch.hype', 'launch.fastFashion', 'sku_core.coreProduct', 'descriptive.familySizing', 'sku_core.productIsActive', 'technical.taxClass', 'sku_core.productIsDropship'
  ]);
  const dateFields = new Set([
    'technical.hideImageDate', 'launch.klPostDate', 'launch.launchDate', 'technical.lastReceived', 'technical.firstReceived'
  ]);
  const arrayFields = new Set([
    'descriptive.material', 'descriptive.keywords', 'descriptive.madeIn', 'technical.website'
  ]);
  
  // v2.4.1: Try normalized key first, then lowercase, then original
  const normalized = normalizeHeaderKey(key);
  let path = MAP[normalized];
  if (!path && key !== normalized) {
    path = MAP[key.toLowerCase()] || MAP[key];
  }
  
  if (!path) return { path: null, value: null };
  if (numFields.has(path)) {
    const n = parseFloat(String(value).replace(/[,$]/g, ''));
    return { path, value: isNaN(n) ? null : n };
  }
  if (boolFields.has(path)) {
    const v = String(value).trim().toLowerCase();
    return { path, value: ['1','true','yes','y'].includes(v) };
  }
  if (dateFields.has(path)) {
    const d = new Date(value);
    return { path, value: isNaN(d.getTime()) ? null : d.toISOString() };
  }
  if (arrayFields.has(path)) {
    return { path, value: String(value).split(/[,;|]/).map(s => s.trim()).filter(Boolean) };
  }
  return { path, value: String(value).trim() };
}

const raw = fs.readFileSync(csvPath, 'utf8');
const records = parse(raw, { columns: true, skip_empty_lines: true });
if (!records.length) {
  console.error('CSV has no data rows');
  process.exit(1);
}

const row = records[0];
const product = { sku_core: {}, descriptive: {}, pricing: {}, technical: {}, launch: {}, source: { rics: {} }, ai: {} };
let unmapped = [];

for (const [key, value] of Object.entries(row)) {
  const { path: mappedPath, value: transformed } = transform(key, value);
  if (!mappedPath) {
    unmapped.push(key);
    continue;
  }
  if (transformed === null) continue;
  setNested(product, mappedPath, transformed);
}

if (!product.technical.mediaStatus) {
  const hasEmbargo = product.technical.hideImageDate && new Date(product.technical.hideImageDate) > new Date();
  product.technical.mediaStatus = hasEmbargo ? 'Embargo' : 'Images Ready';
}

// v2.3: Validation based on mode
const missingFields = [];

// Allow SKU to serve as MPN if MPN is missing (flexible import)
if (!product.sku_core.mpn && product.sku_core.sku) {
  product.sku_core.mpn = product.sku_core.sku;
  console.log('[v2.3] Using SKU as MPN:', product.sku_core.sku);
}

if (validationMode === 'minimal') {
  // Minimal: Only MPN required (or SKU serving as MPN)
  if (!product.sku_core.mpn) {
    console.error('VALIDATION ERROR: MPN (or SKU) is required (minimal mode)');
    process.exit(1);
  }
  // Apply defaults for optional fields
  product.sku_core.sku = product.sku_core.sku || product.sku_core.mpn;
  product.sku_core.brand = product.sku_core.brand || 'Unknown';
  product.sku_core.name = product.sku_core.name || 'Unnamed Product';
  product.sku_core.department = product.sku_core.department || 'Misc';
  product.sku_core.class = product.sku_core.class || 'Misc';
  product.sku_core.category = product.sku_core.category || 'Misc';
} else {
  // Full: Enforce required fields
  if (!product.sku_core.mpn) missingFields.push('MPN');
  if (!product.sku_core.sku) missingFields.push('SKU');
  if (!product.sku_core.brand) missingFields.push('Brand');
  if (!product.sku_core.name) missingFields.push('Name');
  if (!product.sku_core.department) missingFields.push('Department');
  if (!product.sku_core.category) missingFields.push('Category');
  
  if (missingFields.length > 0) {
    console.error('VALIDATION ERROR (full mode): Missing required fields:', missingFields.join(', '));
    process.exit(1);
  }
  
  // Apply minimal defaults
  product.sku_core.sku = product.sku_core.sku || product.sku_core.mpn;
  product.sku_core.class = product.sku_core.class || 'Misc';
}

const docId = product.sku_core.mpn.replace(/[\\/]*/g,'_');

async function writeAll() {
  const targets = ['products_v2', 'products'];
  for (const coll of targets) {
    await db.collection(coll).doc(docId).set(product, { merge: true });
    console.log(`WROTE product doc: ${coll}/${docId}`);
  }

  if (unmapped.length) {
    unmapped.forEach(h => console.log('UNMAPPED HEADER:', h));
  } else {
    console.log('All headers mapped');
  }
  console.log('PRODUCT_JSON:', JSON.stringify(product, null, 2));
}

writeAll().catch(err => {
  console.error('Import failed:', err.message);
  process.exit(1);
});