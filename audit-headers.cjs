#!/usr/bin/env node
/**
 * Audit CSV headers against registry and fieldMapping
 */
const fs = require('fs');
const { parse } = require('csv-parse/sync');

const csvFile = process.argv[2] || 'test-import-with-dropship.csv';
const csv = fs.readFileSync(csvFile, 'utf8');
const rec = parse(csv, { columns: true, skip_empty_lines: true });
const headers = Object.keys(rec[0]);

// Load registry
const reg = JSON.parse(fs.readFileSync('scripts/attribute-registry-normalized.json', 'utf8'));
const regCols = new Set();
reg.forEach(r => (r.importerColumns || []).forEach(c => regCols.add(c)));

// Hardcoded mapping from admin-import-staging.cjs
const MAP = {
  age_group: true,
  gender: true,
  department: true,
  class: true,
  category: true,
  website: true,
  sports_team: true,
  league: true,
  fit: true,
  material: true,
  map: true,
  promo: true,
  hype: true,
  fast_fashion: true,
  cut_type: true,
  closure_type: true,
  platform_height: true,
  heel_type: true,
  height: true,
  length: true,
  width: true,
  weight: true,
  standard_shipping_override: true,
  expedited_override_shipping: true,
  hide_image_date: true,
  style_id: true,
  shoe_height_map: true,
  heel_height: true,
  outsole_material: true,
  scom_regular: true,
  scom_sale: true,
  core_product: true,
  primary_color: true,
  descriptive_color: true,
  keywords: true,
  description: true,
  tax_class: true,
  collection: true,
  kl_post_date: true,
  product_is_active: true,
  launch_date: true,
  media_status: true,
  rics_short_description: true,
  rics_long_description: true,
  last_received: true,
  first_received: true,
  store1: true,
  store_inv: true,
  warehouse_inv: true,
  whs_inv: true,
  store4: true,
  total_inv: true,
  rics_brand: true,
  status: true,
  mpn: true,
  sku: true,
  brand: true,
  name: true,
  slug: true,
  rics_category: true,
  rics_color: true,
  family_sizing: true,
  made_in: true,
  meta_name: true,
  meta_description: true,
  product_is_dropship: true,
  dropship_name: true,
};

const unmapped = headers.filter(h => !MAP[h] && !regCols.has(h));
console.log('UNMAPPED_HEADERS:', unmapped);
