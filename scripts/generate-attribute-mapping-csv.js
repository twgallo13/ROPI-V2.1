#!/usr/bin/env node
/**
 * scripts/generate-attribute-mapping-csv.js
 *
 * Produces:
 *  - docs/lisa/unified-attribute-mapping.csv
 *  - docs/lisa/unified-attribute-mapping.json
 *
 * Usage:
 *  node scripts/generate-attribute-mapping-csv.js
 */

const fs = require('fs');
const path = require('path');

function toSnakeCase(s) {
  if (!s) return '';
  // replace dots with _, camelCase -> snake_case, remove invalid chars
  return s
    .replace(/\./g, '_')
    .replace(/([a-z0-9])([A-Z])/g, '$1_$2')
    .replace(/[^A-Za-z0-9_-]/g, '_')
    .replace(/__+/g, '_')
    .toLowerCase();
}

// Files
const REGISTRY_PATH = path.resolve(__dirname, '../packages/sdk/config/attributeRegistry.json');
const CANONICAL_MAP_PATH = path.resolve(__dirname, '../packages/sdk/config/canonicalAttributeMap.json');
const OUT_CSV = path.resolve(__dirname, '../docs/lisa/unified-attribute-mapping.csv');
const OUT_JSON = path.resolve(__dirname, '../docs/lisa/unified-attribute-mapping.json');

if (!fs.existsSync(REGISTRY_PATH)) {
  console.error('ERROR: attributeRegistry.json not found at', REGISTRY_PATH);
  process.exit(1);
}

const registry = JSON.parse(fs.readFileSync(REGISTRY_PATH, 'utf8'));
let canonicalMap = {};
if (fs.existsSync(CANONICAL_MAP_PATH)) {
  canonicalMap = JSON.parse(fs.readFileSync(CANONICAL_MAP_PATH, 'utf8'));
}

// Category -> PDP section mapping (edit if needed)
const PDP_SECTION_MAP = {
  'sku_core': 'Overview',
  'classification': 'Details',
  'lifecycle': 'Lifecycle',
  'measurements': 'Measurements',
  'dimensions': 'Measurements',
  'identity_demographic': 'Details',
  'color': 'Visuals',
  'materials_construction': 'Materials',
  'materials': 'Materials',
  'price': 'Pricing',
  'shipping': 'Shipping',
  'images': 'Media'
};

function computeSources(attr) {
  const s = new Set();
  if (attr.import_required) s.add('import');
  if (attr.status === 'active' || attr.status === undefined) s.add('edit');
  if (attr.ai_usage_notes && /internal/i.test(attr.ai_usage_notes)) s.add('internal');
  if (attr.derived_from || attr.computed) s.add('derived');
  return Array.from(s).join('|') || 'edit';
}

function computeWhere(attr, canonicalId) {
  const importHeader = attr.external_header || '';
  const editorField = `attributes.${canonicalId}`;
  const pdp = PDP_SECTION_MAP[attr.category] || attr.category || '';
  return `${importHeader}|${editorField}|${pdp}`;
}

function allowedValuesString(attr) {
  const parts = [];
  if (attr.allowed_values) parts.push(attr.allowed_values.join(';'));
  if (attr.synonyms) parts.push('synonyms:' + (Array.isArray(attr.synonyms) ? attr.synonyms.join(';') : attr.synonyms));
  return parts.join(' | ');
}

function dataTypeSummary(attr) {
  let s = attr.data_type || '';
  if (attr.data_type === 'select' || attr.data_type === 'multiSelect') {
    s += (attr.allowed_values ? ` (allowed: ${attr.allowed_values.slice(0,50).join(',')})` : '');
  }
  if (attr.required_for_completion) s += ' | required_for_completion';
  return s;
}

const csvHeader = [
  'attribute_id',
  'sources',
  'display_name',
  'where_appears',
  'required?',
  'data_type_and_validation',
  'allowed_values_synonyms',
  'notes_dependencies_migration_steps'
].join(',');

const outRows = [];
const outJson = { attributes: [] };

const seen = new Set();
for (const a of registry.attributes || []) {
  // Determine canonical id:
  // If canonicalMap maps an alias to a canonical ID, prefer canonical ID.
  // Otherwise normalize attribute_id with toSnakeCase().
  const origId = a.attribute_id || a.id || a.key;
  let canonicalId = origId;
  // If canonicalMap defines mapping alias -> canonical, resolve:
  // canonicalMap could be { alias: canonicalId } or { canonicalId: [aliases] }
  if (canonicalMap && typeof canonicalMap === 'object') {
    // direct mapping alias -> canonical
    if (canonicalMap[origId]) canonicalId = canonicalMap[origId];
    // or inverse mapping (map canonical -> [aliases]) - skip for now
    // fall back to snake case normalization
  }
  canonicalId = toSnakeCase(canonicalId);

  if (!/^[a-z0-9_\-]+$/.test(canonicalId)) {
    console.warn(`WARN: attribute id not canonical snake_case: ${origId} -> ${canonicalId}`);
  }
  if (seen.has(canonicalId)) {
    console.error(`ERROR: Duplicate canonical attribute id '${canonicalId}' from original '${origId}'`);
    process.exitCode = 2;
  }
  seen.add(canonicalId);

  const sources = computeSources(a);
  const displayName = (a.label || a.display_name || a.name || origId).replace(/,/g, ' ');
  const where_appears = computeWhere(a, canonicalId);
  const required = !!a.required_for_completion ? 'Y' : 'N';
  const data_type_and_validation = dataTypeSummary(a).replace(/,/g, ';');
  const allowed = allowedValuesString(a).replace(/,/g, ';');
  const notes = [a.ai_usage_notes || '', `status:${a.status || ''}`].filter(Boolean).join(' | ').replace(/,/g, ';');

  const csvRow = [
    canonicalId,
    sources,
    `"${displayName}"`,
    `"${where_appears}"`,
    required,
    `"${data_type_and_validation}"`,
    `"${allowed}"`,
    `"${notes}"`
  ].join(',');

  outRows.push(csvRow);

  outJson.attributes.push({
    attribute_id: canonicalId,
    original_attribute_id: origId,
    sources,
    display_name: displayName,
    import_header: a.external_header || null,
    product_editor_field: `attributes.${canonicalId}`,
    pdp_section: PDP_SECTION_MAP[a.category] || a.category,
    required_for_completion: !!a.required_for_completion,
    data_type: a.data_type,
    allowed_values: a.allowed_values || [],
    synonyms: a.synonyms || [],
    ai_usage_notes: a.ai_usage_notes || '',
    status: a.status || ''
  });
}

// Write outputs
fs.mkdirSync(path.dirname(OUT_CSV), { recursive: true });
fs.writeFileSync(OUT_CSV, csvHeader + '\n' + outRows.join('\n') + '\n', 'utf8');
fs.writeFileSync(OUT_JSON, JSON.stringify(outJson, null, 2), 'utf8');

console.log('Wrote', OUT_CSV, 'rows:', outRows.length);
console.log('Wrote', OUT_JSON, 'attributes:', outJson.attributes.length);

// Final validations
if (process.exitCode && process.exitCode !== 0) {
  console.error('Validation failed (exitCode set).');
  process.exit(process.exitCode);
}
