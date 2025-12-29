#!/usr/bin/env node
/**
 * LP-1.4.6.2 — single-product normalize wrapper
 * Dry-run by default; --apply to write. Honors --force-admin.
 *
 * Usage:
 *  node scripts/normalizeSingleProduct.js --product=211737-90h1-8
 *  node scripts/normalizeSingleProduct.js --product=211737-90h1-8 --apply
 *  node scripts/normalizeSingleProduct.js --product=211737-90h1-8 --apply --force-admin
 *
 * Note: Designed as wrapper to avoid touching canonical migration.
 */

const admin = require('firebase-admin');
const fs = require('fs');
const path = require('path');

function argvFlag(name) {
  return process.argv.some(a => a === `--${name}`);
}
function argvKV(name) {
  const p = process.argv.find(a => a.startsWith(`--${name}=`));
  return p ? p.split('=')[1] : undefined;
}

const PRODUCT_ID = argvKV('product');
if (!PRODUCT_ID) {
  console.error('ERROR: --product=<productId> required');
  process.exit(2);
}
const APPLY = argvFlag('apply');
const FORCE_ADMIN = argvFlag('force-admin');

if (!admin.apps.length) {
  const credPath = process.env.GOOGLE_APPLICATION_CREDENTIALS;
  const credBase64 = process.env.GCP_SA_KEY_BASE64;
  if (credPath && fs.existsSync(credPath)) {
    const sa = JSON.parse(fs.readFileSync(credPath, 'utf8'));
    admin.initializeApp({ credential: admin.credential.cert(sa) });
  } else if (credBase64) {
    const sa = JSON.parse(Buffer.from(credBase64, 'base64').toString('utf8'));
    admin.initializeApp({ credential: admin.credential.cert(sa) });
  } else {
    admin.initializeApp();
  }
}
const db = admin.firestore();

function parseImportDate(input) {
  if (input === undefined || input === null) return undefined;
  const s = String(input).trim();
  if (!s) return undefined;

  // ISO
  const isoDateOnly = /^(\d{4})-(\d{2})-(\d{2})(?:[T\s].*)?$/;
  if (isoDateOnly.test(s)) {
    const d = new Date(s);
    if (!isNaN(d.getTime())) return d.toISOString();
  }

  // MM/DD/YYYY or MM-DD-YYYY
  const mmddyyyy = /^(\d{1,2})[\/\-](\d{1,2})[\/\-](\d{4})$/;
  let m = s.match(mmddyyyy);
  if (m) {
    const mm = String(parseInt(m[1], 10)).padStart(2, '0');
    const dd = String(parseInt(m[2], 10)).padStart(2, '0');
    const yyyy = parseInt(m[3], 10);
    const dt = new Date(Date.UTC(yyyy, parseInt(mm, 10) - 1, parseInt(dd, 10), 0, 0, 0));
    if (!isNaN(dt.getTime()) && dt.getUTCFullYear() === yyyy) return dt.toISOString();
    return undefined;
  }

  // MM/DD/YY or MM-DD-YY
  const mmddyy = /^(\d{1,2})[\/\-](\d{1,2})[\/\-](\d{2})$/;
  m = s.match(mmddyy);
  if (m) {
    const mm = String(parseInt(m[1], 10)).padStart(2, '0');
    const dd = String(parseInt(m[2], 10)).padStart(2, '0');
    const yy = parseInt(m[3], 10);
    const yyyy = yy <= 69 ? 2000 + yy : 1900 + yy;
    const dt = new Date(Date.UTC(yyyy, parseInt(mm, 10) - 1, parseInt(dd, 10), 0, 0, 0));
    if (!isNaN(dt.getTime()) && dt.getUTCFullYear() === yyyy) return dt.toISOString();
    return undefined;
  }

  const parsed = Date.parse(s);
  if (!isNaN(parsed)) return new Date(parsed).toISOString();

  return undefined;
}

function isAdminCanonical(meta) {
  if (!meta) return false;
  return meta.canonical === true && typeof meta.actor === 'string' && meta.actor.startsWith('admin:');
}

(async function main(){
  try {
    const registryPath = path.resolve(__dirname, '../packages/sdk/config/attributeRegistry.json');
    let registryVersion = '0.0.0';
    try { registryVersion = JSON.parse(fs.readFileSync(registryPath,'utf8')).version || registryVersion } catch(e){}

    const DATE_KEYS = ['hide_image_date','launch_date','first_received','last_received','kl_post_date'];
    const CORE_MAP = {
      first_received: 'firstReceived',
      last_received: 'lastReceived',
      launch_date: 'launchDate',
      kl_post_date: 'kl_post_date',
      hide_image_date: 'hide_image_date'
    };

    const docRef = db.collection('products').doc(PRODUCT_ID);
    const doc = await docRef.get();
    if (!doc.exists) {
      console.error(`Product ${PRODUCT_ID} not found`);
      process.exit(3);
    }
    const data = doc.data() || {};
    const attributes = (data.attributes && typeof data.attributes === 'object') ? data.attributes : {};
    const meta = (attributes._meta && typeof attributes._meta === 'object') ? attributes._meta : {};

    const planned = {};
    const updates = {};

    for (const key of DATE_KEYS) {
      const attrVal = attributes[key];
      const coreKey = CORE_MAP[key];
      const coreVal = coreKey ? data[coreKey] : undefined;
      const sourceVal = (attrVal !== undefined && attrVal !== null && attrVal !== '') ? attrVal : (coreVal !== undefined ? coreVal : undefined);
      if (sourceVal === undefined || sourceVal === null || sourceVal === '') continue;

      const parsedIso = parseImportDate(sourceVal);
      if (!parsedIso) {
        console.log(`WARN: ${PRODUCT_ID} ${key} unparseable from "${sourceVal}"`);
        continue;
      }

      const existingAttrVal = attributes[key];
      const existingIso = (typeof existingAttrVal === 'string' && existingAttrVal.includes('T')) ? existingAttrVal : undefined;
      const existingMeta = meta[key];
      if (isAdminCanonical(existingMeta) && !FORCE_ADMIN) {
        console.log(`SKIP admin-canonical protected ${key} for ${PRODUCT_ID}`);
        continue;
      }
      if (existingIso === parsedIso) continue;

      planned[key] = { from: sourceVal, to: parsedIso };
      updates[`attributes.${key}`] = parsedIso;
      updates[`attributes._meta.${key}`] = {
        actor: 'system:migrator',
        source: 'migration',
        ts: new Date().toISOString(),
        method: 'normalizeProductDates',
        definition_version: registryVersion,
        canonical: false,
        note: 'LP-1.4.6.2 single-product normalization'
      };
    }

    if (Object.keys(planned).length === 0) {
      console.log(`No updates planned for ${PRODUCT_ID}`);
      process.exit(0);
    }

    console.log('Planned updates for', PRODUCT_ID, JSON.stringify(planned, null, 2));

    if (!APPLY) {
      console.log('Dry-run complete. Add --apply to make writes.');
      process.exit(0);
    }

    await docRef.update(updates);
    console.log(`Applied updates to ${PRODUCT_ID}:`, Object.keys(planned));
    process.exit(0);

  } catch (err) {
    console.error('ERROR', err && err.stack ? err.stack : err);
    process.exit(1);
  }
})();
