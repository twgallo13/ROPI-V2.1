#!/usr/bin/env node
/**
 * Dry-run/Apply migration for Observations linkedField -> fieldLink
 *
 * Usage:
 *  node scripts/migrate-observation-linkedfields.js --dry
 *  node scripts/migrate-observation-linkedfields.js --apply
 *
 * IMPORTANT: --dry MUST be used for review. --apply will modify Firestore.
 * 
 * Lisa LP-1.0.3
 */

const admin = require('firebase-admin');
const fs = require('fs');
const path = require('path');

// Parse command line arguments
const args = process.argv.slice(2);
const DRY = !args.includes('--apply'); // Default to dry-run unless --apply is passed

if (!admin.apps.length) {
  admin.initializeApp();
}
const db = admin.firestore();

// load canonical maps
const REG_PATH = path.resolve(__dirname, '../packages/sdk/config/attributeRegistry.json');
const CANONICAL_MAP_PATH = path.resolve(__dirname, '../packages/sdk/config/canonicalAttributeMap.approved.json');

const registry = fs.existsSync(REG_PATH) ? JSON.parse(fs.readFileSync(REG_PATH, 'utf8')) : { attributes: [] };
const canonicalMap = fs.existsSync(CANONICAL_MAP_PATH) ? JSON.parse(fs.readFileSync(CANONICAL_MAP_PATH, 'utf8')) : {};

// helper: normalize to snake_case (basic)
function toSnakeCase(s) {
  if (!s) return s;
  return s
    .replace(/\./g, '_')
    .replace(/([a-z0-9])([A-Z])/g, '$1_$2')
    .replace(/[^A-Za-z0-9_-]/g, '_')
    .replace(/__+/g, '_')
    .toLowerCase();
}

function findAttributeByAlias(alias) {
  if (!alias) return null;
  const lower = alias.toLowerCase().trim();
  // direct canonical map alias -> canonical id
  if (canonicalMap && typeof canonicalMap === 'object' && canonicalMap[alias]) {
    return canonicalMap[alias];
  }
  // try find attribute by attribute_id or label or synonyms
  for (const a of registry.attributes || []) {
    if ((a.attribute_id && a.attribute_id.toLowerCase() === lower) || (a.label && a.label.toLowerCase() === lower)) {
      return a.attribute_id;
    }
    if (a.synonyms) {
      // support synonyms object or array
      if (Array.isArray(a.synonyms)) {
        if (a.synonyms.map(x=>String(x).toLowerCase()).includes(lower)) return a.attribute_id;
      } else {
        // if object, check keys or values
        const vals = Object.values(a.synonyms || {}).flat().map(x=>String(x).toLowerCase());
        if (vals.includes(lower)) return a.attribute_id;
      }
    }
  }
  // last-ditch: try snake-casing and match
  const s = toSnakeCase(alias);
  const found = (registry.attributes || []).find(a => a.attribute_id === s);
  return found ? found.attribute_id : null;
}

function proposeFieldLink(link) {
  // link = original linkedField string
  if (!link) return { action: 'none' };
  const s = String(link).trim();
  if (!s) return { action: 'none' };

  const low = s.toLowerCase();

  // common mapping rules:
  // title/name -> product.title
  if (/^(title|name|product_name|productname)$/i.test(low)) {
    return { action: 'map', fieldLink: { type: 'product', key: 'product.title' }, reason: 'top-level title' };
  }
  // sku -> product.sku
  if (/^(sku|product_sku|productsku)$/i.test(low)) {
    return { action: 'map', fieldLink: { type: 'product', key: 'product.sku' }, reason: 'top-level sku' };
  }
  // brand -> product.brand
  if (/^(brand|product_brand)$/i.test(low)) {
    return { action: 'map', fieldLink: { type: 'product', key: 'product.brand' }, reason: 'top-level brand' };
  }
  // category -> product.category
  if (/^(category|product_category)$/i.test(low)) {
    return { action: 'map', fieldLink: { type: 'product', key: 'product.category' }, reason: 'top-level category' };
  }
  // department -> product.department
  if (/^(department|product_department)$/i.test(low)) {
    return { action: 'map', fieldLink: { type: 'product', key: 'product.department' }, reason: 'top-level department' };
  }
  // description -> product.description
  if (/^(description|product_description)$/i.test(low)) {
    return { action: 'map', fieldLink: { type: 'product', key: 'product.description' }, reason: 'top-level description' };
  }
  // mpn / manufacturer part number -> product.mpn per LP-1.0.3 constraints
  // Note: mpn exists in attribute registry but using product.mpn as specified
  if (/^(mpn|manufacturer_part_number|manufacturer.*part)$/i.test(low)) {
    return { action: 'map', fieldLink: { type: 'product', key: 'product.mpn' }, reason: 'product.mpn (per LP-1.0.3 constraint)' };
  }
  // styleId -> product.styleId
  if (/^(styleid|style_id|style)$/i.test(low)) {
    return { action: 'map', fieldLink: { type: 'product', key: 'product.styleId' }, reason: 'top-level styleId' };
  }
  // launchDate -> product.launchDate
  if (/^(launchdate|launch_date)$/i.test(low)) {
    return { action: 'map', fieldLink: { type: 'product', key: 'product.launchDate' }, reason: 'top-level launchDate' };
  }
  // launchStatus -> product.launchStatus
  if (/^(launchstatus|launch_status)$/i.test(low)) {
    return { action: 'map', fieldLink: { type: 'product', key: 'product.launchStatus' }, reason: 'top-level launchStatus' };
  }

  // if starts with attributes. or product.
  if (/^(attributes|product)\./i.test(s)) {
    const parts = s.split('.');
    if (parts[0].toLowerCase() === 'product') {
      return { action: 'map', fieldLink: { type: 'product', key: `product.${parts.slice(1).join('.')}` }, reason: 'explicit product key' };
    }
    if (parts[0].toLowerCase() === 'attributes') {
      const aid = parts.slice(1).join('.');
      // verify attribute exists
      const match = (registry.attributes || []).find(a => a.attribute_id === aid);
      if (match) return { action: 'map', fieldLink: { type: 'attribute', key: `attributes.${aid}` }, reason: 'explicit attributes.<id>' };
      // try normalize
      const found = findAttributeByAlias(aid);
      if (found) return { action: 'map', fieldLink: { type: 'attribute', key: `attributes.${found}` }, reason: 'normalized attribute' };
      return { action: 'manual_review', reason: 'explicit attributes but not found', sample: aid };
    }
  }

  // try attribute alias lookup:
  const attr = findAttributeByAlias(s);
  if (attr) {
    return { action: 'map', fieldLink: { type: 'attribute', key: `attributes.${attr}` }, reason: 'alias matched attribute' };
  }

  // fallback: nothing automatic
  return { action: 'manual_review', reason: 'no automatic mapping', sample: s };
}

async function runDryRun() {
  console.log('Starting dry-run migration for observations linkedField -> fieldLink');
  console.log('DRY RUN MODE: No writes will be made to Firestore');
  console.log('');
  
  const coll = db.collection('observations');
  const qSnap = await coll.where('linkedField', '!=', null).get();
  console.log('Found observations with linkedField:', qSnap.size);
  
  const results = [];
  let count = 0;
  for (const doc of qSnap.docs) {
    const d = doc.data();
    const id = doc.id;
    const lf = d.linkedField;
    const proposal = proposeFieldLink(lf);
    results.push({ 
      id, 
      linkedField: lf, 
      proposal,
      productId: d.productId || null,
      status: d.status || null
    });
    count++;
  }
  
  const outJson = { 
    generatedAt: new Date().toISOString(), 
    mode: 'dry-run',
    total: count, 
    summary: {
      mapped: results.filter(r => r.proposal.action === 'map').length,
      manual_review: results.filter(r => r.proposal.action === 'manual_review').length,
      none: results.filter(r => r.proposal.action === 'none').length
    },
    results 
  };
  
  const timestamp = Date.now();
  const jsonFile = path.resolve(__dirname, `../docs/lisa/migrate-observation-linkedfields-dryrun-${timestamp}.json`);
  fs.mkdirSync(path.dirname(jsonFile), { recursive: true });
  fs.writeFileSync(jsonFile, JSON.stringify(outJson, null, 2), 'utf8');

  // Also produce markdown summary
  const mdFile = jsonFile.replace('.json', '.md');
  const lines = [];
  lines.push(`# Migrate Observations linkedField → fieldLink — Dry Run`);
  lines.push('');
  lines.push(`**Generated:** ${new Date().toISOString()}`);
  lines.push('');
  lines.push(`**Mode:** DRY RUN (no writes to Firestore)`);
  lines.push('');
  lines.push('## Summary');
  lines.push('');
  lines.push(`| Metric | Count |`);
  lines.push(`|--------|-------|`);
  lines.push(`| Total observations with linkedField | ${count} |`);
  lines.push(`| Proposed mappings (auto) | ${outJson.summary.mapped} |`);
  lines.push(`| Manual review required | ${outJson.summary.manual_review} |`);
  lines.push(`| No action (empty/null) | ${outJson.summary.none} |`);
  lines.push('');
  
  // Group by proposal action
  const mapped = results.filter(r => r.proposal.action === 'map');
  const manualReview = results.filter(r => r.proposal.action === 'manual_review');
  
  // Show mapping breakdown by reason
  const reasonCounts = {};
  mapped.forEach(r => {
    const reason = r.proposal.reason || 'unknown';
    reasonCounts[reason] = (reasonCounts[reason] || 0) + 1;
  });
  
  lines.push('## Mapping Breakdown by Reason');
  lines.push('');
  lines.push(`| Reason | Count |`);
  lines.push(`|--------|-------|`);
  Object.entries(reasonCounts).sort((a, b) => b[1] - a[1]).forEach(([reason, cnt]) => {
    lines.push(`| ${reason} | ${cnt} |`);
  });
  lines.push('');
  
  lines.push('## Sample Proposed Mappings (first 30)');
  lines.push('');
  lines.push('```');
  mapped.slice(0, 30).forEach(r => {
    lines.push(`doc: ${r.id}`);
    lines.push(`  linkedField: "${r.linkedField}"`);
    lines.push(`  fieldLink: ${JSON.stringify(r.proposal.fieldLink)}`);
    lines.push(`  reason: ${r.proposal.reason}`);
    lines.push('');
  });
  lines.push('```');
  lines.push('');
  
  lines.push('## Manual Review Required (top 25)');
  lines.push('');
  if (manualReview.length === 0) {
    lines.push('_No manual review items_');
  } else {
    lines.push('| Doc ID | linkedField | Reason |');
    lines.push('|--------|-------------|--------|');
    manualReview.slice(0, 25).forEach(r => {
      lines.push(`| ${r.id} | \`${r.linkedField}\` | ${r.proposal.reason} |`);
    });
  }
  lines.push('');
  
  lines.push('## All Manual Review Doc IDs');
  lines.push('');
  lines.push('```');
  manualReview.forEach(r => {
    lines.push(r.id);
  });
  lines.push('```');
  lines.push('');
  
  lines.push('---');
  lines.push('');
  lines.push('**Next Steps:**');
  lines.push('1. Review the manual_review items above');
  lines.push('2. Update canonicalAttributeMap.approved.json if new aliases needed');
  lines.push('3. After business signoff, run: `node scripts/migrate-observation-linkedfields.js --apply`');
  lines.push('');
  lines.push('Lisa LP-1.0.3');
  
  fs.writeFileSync(mdFile, lines.join('\n'), 'utf8');

  console.log('');
  console.log('=== DRY RUN COMPLETE ===');
  console.log('');
  console.log('Summary:');
  console.log(`  Total observations scanned: ${count}`);
  console.log(`  Proposed mappings: ${outJson.summary.mapped}`);
  console.log(`  Manual review required: ${outJson.summary.manual_review}`);
  console.log('');
  console.log('Artifacts:');
  console.log(`  JSON: ${jsonFile}`);
  console.log(`  Markdown: ${mdFile}`);
  
  return { jsonFile, mdFile, summary: outJson.summary };
}

async function applyMigration(jsonPath) {
  if (!jsonPath) throw new Error('jsonPath required for apply');
  console.log('');
  console.log('=== APPLY MODE ===');
  console.log('WARNING: This will modify Firestore data!');
  console.log('');
  
  const raw = JSON.parse(fs.readFileSync(jsonPath, 'utf8'));
  const coll = db.collection('observations');

  const results = { applied: [], skipped: [], errors: [] };
  let processed = 0;
  const total = raw.results.length;
  
  for (const r of raw.results) {
    processed++;
    if (processed % 50 === 0) {
      console.log(`Processing ${processed}/${total}...`);
    }
    
    try {
      if (r.proposal.action === 'map') {
        const fieldLink = r.proposal.fieldLink;
        // Update doc: set fieldLink and preserve linkedField as legacy_linkedField
        await coll.doc(r.id).update({
          fieldLink,
          legacy_linkedField: r.linkedField,
          updatedAt: admin.firestore.FieldValue.serverTimestamp(),
          'audit.migration': { 
            migratedAt: new Date().toISOString(), 
            by: 'migrate-observation-linkedfields.js',
            originalLinkedField: r.linkedField
          }
        });
        results.applied.push(r.id);
      } else {
        results.skipped.push({ id: r.id, reason: r.proposal.reason || r.proposal.action });
      }
    } catch (err) {
      results.errors.push({ id: r.id, error: String(err) });
    }
  }
  
  const timestamp = Date.now();
  const out = path.resolve(__dirname, `../docs/lisa/migrate-observation-linkedfields-apply-result-${timestamp}.json`);
  fs.writeFileSync(out, JSON.stringify(results, null, 2), 'utf8');
  
  console.log('');
  console.log('=== APPLY COMPLETE ===');
  console.log('');
  console.log('Results:');
  console.log(`  Applied: ${results.applied.length}`);
  console.log(`  Skipped: ${results.skipped.length}`);
  console.log(`  Errors: ${results.errors.length}`);
  console.log('');
  console.log('Result file:', out);
  
  return out;
}

(async () => {
  try {
    if (DRY) {
      const { jsonFile, mdFile, summary } = await runDryRun();
      console.log('');
      console.log('Dry-run complete.');
      process.exit(0);
    } else {
      // apply flow requires verifying backups done etc
      console.log('APPLY MODE: Ensure backups exist before apply.');
      console.log('');
      
      const lisaDir = path.resolve(__dirname, '../docs/lisa');
      if (!fs.existsSync(lisaDir)) {
        throw new Error('No docs/lisa directory found; run with --dry first');
      }
      
      const jsonFiles = fs.readdirSync(lisaDir)
        .filter(f => f.includes('migrate-observation-linkedfields-dryrun') && f.endsWith('.json'));
      
      if (!jsonFiles.length) {
        throw new Error('No dry-run JSON found; run with --dry first and pick the JSON to apply');
      }
      
      // pick latest
      const latest = jsonFiles.sort().slice(-1)[0];
      const fullPath = path.resolve(lisaDir, latest);
      console.log('Applying based on dry-run file:', fullPath);
      console.log('');
      
      const res = await applyMigration(fullPath);
      console.log('Apply result file:', res);
      process.exit(0);
    }
  } catch (err) {
    console.error('Migration script failed:', err);
    process.exit(2);
  }
})();
