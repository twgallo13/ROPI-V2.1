/**
 * LP-1.4.6 follow-up: Normalize product date values in-place
 * 
 * Converts existing vendor-formatted date strings (MM/DD/YY, MM/DD/YYYY, YYYY-MM-DD, 
 * dash separators) that live as top-level fields or attributes.<key> into canonical 
 * ISO timestamps (per LP-1.4.6 parser).
 * 
 * Features:
 * - Dry-run by default. Use --apply to write changes.
 * - Honors admin-canonical protection unless --force-admin provided.
 * - Writes per-key attributes.<key> with _meta entries using buildPerKeyUpdatePayload()
 * - Deterministic two-digit-year heuristic: 00..69→2000..2069, 70..99→1970..1999
 * - Produces JSON report under reports/normalize-dates/
 *
 * Usage:
 *   # dry-run (default)
 *   node dist/tasks/normalizeProductDates.js
 *
 *   # dry-run pilot (limit 100)
 *   node dist/tasks/normalizeProductDates.js -- --limit=100
 *
 *   # apply pilot
 *   node dist/tasks/normalizeProductDates.js -- --apply --limit=100
 *
 *   # apply to all products
 *   node dist/tasks/normalizeProductDates.js -- --apply
 *
 *   # force overwrite admin-canonical values
 *   node dist/tasks/normalizeProductDates.js -- --apply --force-admin
 *
 * Lisa LP-1.4.6
 */

import * as admin from 'firebase-admin';
import * as path from 'path';
import * as fs from 'fs';
import {
  buildPerKeyUpdatePayload,
  isAdminCanonical,
  loadRegistryVersion,
  type AttributeMetaEntry,
} from '../lib/attributeMeta';

// Initialize Firebase Admin if not already done
if (!admin.apps.length) {
  const credPath = process.env.GOOGLE_APPLICATION_CREDENTIALS;
  const credBase64 = process.env.GCP_SA_KEY_BASE64;
  
  if (credPath && fs.existsSync(credPath)) {
    const serviceAccount = JSON.parse(fs.readFileSync(credPath, 'utf8'));
    admin.initializeApp({
      credential: admin.credential.cert(serviceAccount),
    });
  } else if (credBase64) {
    const serviceAccount = JSON.parse(Buffer.from(credBase64, 'base64').toString('utf8'));
    admin.initializeApp({
      credential: admin.credential.cert(serviceAccount),
    });
  } else {
    admin.initializeApp();
  }
}

// Initialize db inside function to avoid module-level execution
function getDb() {
  return admin.firestore();
}

// Parse CLI arguments
const args = process.argv.slice(2);
const DRY_RUN = !args.includes('--apply');
const FORCE_ADMIN = args.includes('--force-admin');
const limitIndex = args.findIndex(a => a.startsWith('--limit='));
const LIMIT = limitIndex >= 0 ? parseInt(args[limitIndex].split('=')[1], 10) : undefined;

// Date keys to normalize (attribute keys)
const DATE_KEYS = [
  'hide_image_date',
  'launch_date',
  'first_received',
  'last_received',
  'kl_post_date',
];

/**
 * Parse date string to ISO timestamp using LP-1.4.6 tolerant parsing heuristics.
 * 
 * Accepts:
 * - ISO YYYY-MM-DD or YYYY-MM-DDTHH:MM:SS
 * - MM/DD/YYYY or M/D/YYYY (slash separator)
 * - MM-DD-YYYY or M-D-YYYY (dash separator)
 * - MM/DD/YY or M/D/YY (two-digit year: 00..69→2000..2069, 70..99→1970..1999)
 * - MM-DD-YY or M-D-YY (two-digit year with dash)
 * 
 * @param input - Raw date value from product document
 * @returns ISO timestamp string or undefined if unparseable
 */
function parseImportDate(input: unknown): string | undefined {
  if (input === undefined || input === null) return undefined;
  const s = String(input).trim();
  if (!s) return undefined;

  // 1) Already ISO timestamp - return as-is
  if (/^\d{4}-\d{2}-\d{2}T/.test(s)) {
    const d = new Date(s);
    if (!isNaN(d.getTime())) return s; // Already ISO
  }

  // 2) ISO date-only YYYY-MM-DD
  const isoDateOnly = /^(\d{4})-(\d{2})-(\d{2})$/;
  const isoMatch = s.match(isoDateOnly);
  if (isoMatch) {
    const [, y, m, d] = isoMatch;
    const dt = new Date(Date.UTC(parseInt(y, 10), parseInt(m, 10) - 1, parseInt(d, 10), 0, 0, 0));
    if (!isNaN(dt.getTime())) return dt.toISOString();
  }

  // 3) MM/DD/YYYY or M/D/YYYY (4-digit year)
  const mmddyyyy = /^(\d{1,2})[\/\-](\d{1,2})[\/\-](\d{4})$/;
  let m = s.match(mmddyyyy);
  if (m) {
    const mm = parseInt(m[1], 10);
    const dd = parseInt(m[2], 10);
    const yyyy = parseInt(m[3], 10);
    const dt = new Date(Date.UTC(yyyy, mm - 1, dd, 0, 0, 0));
    if (!isNaN(dt.getTime()) && dt.getUTCFullYear() === yyyy && dt.getUTCMonth() === mm - 1 && dt.getUTCDate() === dd) {
      return dt.toISOString();
    }
    return undefined;
  }

  // 4) MM/DD/YY or M/D/YY (2-digit year) - apply heuristic
  const mmddyy = /^(\d{1,2})[\/\-](\d{1,2})[\/\-](\d{2})$/;
  m = s.match(mmddyy);
  if (m) {
    const mm = parseInt(m[1], 10);
    const dd = parseInt(m[2], 10);
    const yy = parseInt(m[3], 10);
    // Two-digit year heuristic: 00..69 → 2000..2069, 70..99 → 1970..1999
    const yyyy = yy <= 69 ? 2000 + yy : 1900 + yy;
    const dt = new Date(Date.UTC(yyyy, mm - 1, dd, 0, 0, 0));
    if (!isNaN(dt.getTime()) && dt.getUTCFullYear() === yyyy && dt.getUTCMonth() === mm - 1 && dt.getUTCDate() === dd) {
      return dt.toISOString();
    }
    return undefined;
  }

  // 5) Fallback to Date.parse if it yields a valid date
  const parsed = Date.parse(s);
  if (!isNaN(parsed)) {
    return new Date(parsed).toISOString();
  }

  return undefined;
}

/**
 * Check if a value is already in ISO timestamp format
 */
function isIsoTimestamp(value: unknown): boolean {
  if (typeof value !== 'string') return false;
  return /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}.\d{3}Z$/.test(value);
}

interface NormalizeStats {
  processed: number;
  productsNormalized: number;
  attributesNormalized: number;
  skippedAlreadyIso: number;
  skippedAdminProtected: number;
  skippedUnparseable: number;
  errors: number;
}

interface NormalizeReport {
  lp: string;
  mode: 'dry-run' | 'apply';
  timestamp: string;
  limitApplied: number | undefined;
  forceAdmin: boolean;
  dateKeysChecked: string[];
  stats: NormalizeStats;
  samples: Array<{
    productId: string;
    changes: Record<string, { from: unknown; to: string }>;
  }>;
}

async function normalizeDates(): Promise<void> {
  console.log('═'.repeat(70));
  console.log('LP-1.4.6: Normalize Product Date Values');
  console.log(`Mode: ${DRY_RUN ? 'DRY-RUN' : 'APPLY'}`);
  console.log(`Force Admin: ${FORCE_ADMIN}`);
  if (LIMIT) console.log(`Limit: ${LIMIT}`);
  console.log(`Date Keys: ${DATE_KEYS.join(', ')}`);
  console.log('═'.repeat(70));

  // Load registry version for _meta
  const registryPath = path.resolve(__dirname, '../../../sdk/config/attributeRegistry.json');
  let REGISTRY_VERSION = '0.0.0';
  try {
    REGISTRY_VERSION = await loadRegistryVersion(registryPath);
    console.log(`✅ Loaded registry version: ${REGISTRY_VERSION}`);
  } catch {
    console.warn('⚠️ Could not load registry version, using 0.0.0');
  }

  const stats: NormalizeStats = {
    processed: 0,
    productsNormalized: 0,
    attributesNormalized: 0,
    skippedAlreadyIso: 0,
    skippedAdminProtected: 0,
    skippedUnparseable: 0,
    errors: 0,
  };

  const samples: NormalizeReport['samples'] = [];
  const MAX_SAMPLES = 10;

  const BATCH_SIZE = 500;
  let lastDoc: admin.firestore.QueryDocumentSnapshot | null = null;
  let processedTotal = 0;
  let hasMore = true;

  while (hasMore) {
    const remaining = LIMIT ? Math.min(BATCH_SIZE, LIMIT - processedTotal) : BATCH_SIZE;
    if (remaining <= 0) break;

    let q = getDb().collection('products').limit(remaining);
    if (lastDoc) q = q.startAfter(lastDoc);
    
    const snap = await q.get();
    if (snap.empty) break;

    for (const doc of snap.docs) {
      stats.processed++;
      processedTotal++;

      try {
        const data = doc.data() as Record<string, unknown>;
        const attributes = (data.attributes && typeof data.attributes === 'object') 
          ? data.attributes as Record<string, unknown> 
          : {};
        const meta = (attributes._meta && typeof attributes._meta === 'object') 
          ? attributes._meta as Record<string, AttributeMetaEntry> 
          : {};

        const attributeUpdates: Record<string, unknown> = {};
        const changes: Record<string, { from: unknown; to: string }> = {};

        for (const key of DATE_KEYS) {
          // Check both attributes and top-level fields (prefer attributes)
          const attrVal = attributes[key];
          const topVal = data[key];
          const sourceVal = attrVal !== undefined ? attrVal : topVal;

          // Skip if no value
          if (sourceVal === undefined || sourceVal === null || sourceVal === '') {
            continue;
          }

          // Skip if already ISO timestamp
          if (isIsoTimestamp(sourceVal)) {
            stats.skippedAlreadyIso++;
            continue;
          }

          // Try to parse
          const parsedIso = parseImportDate(sourceVal);
          if (!parsedIso) {
            stats.skippedUnparseable++;
            console.log(`  ⚠️ ${doc.id}.${key}: unparseable "${sourceVal}"`);
            continue;
          }

          // Check admin-canonical protection
          const existingMeta = meta[key];
          if (isAdminCanonical(existingMeta) && !FORCE_ADMIN) {
            stats.skippedAdminProtected++;
            console.log(`  🔒 ${doc.id}.${key}: admin-canonical protected`);
            continue;
          }

          // Record the change
          attributeUpdates[key] = parsedIso;
          changes[key] = { from: sourceVal, to: parsedIso };
        }

        // If we have changes, apply them
        if (Object.keys(attributeUpdates).length > 0) {
          const canonicalOverrides: Record<string, boolean> = {};
          for (const key of Object.keys(attributeUpdates)) {
            canonicalOverrides[key] = false; // Migration values are not canonical
          }

          const payload = buildPerKeyUpdatePayload({
            attributes: attributeUpdates,
            actor: 'system:migrator',
            source: 'migration',
            method: 'normalizeProductDates',
            definitionVersion: REGISTRY_VERSION,
            canonical: false,
            canonicalOverrides,
            note: 'Normalized date formats to ISO (LP-1.4.6)',
          });

          if (DRY_RUN) {
            console.log(`[DRY] ${doc.id}: will update ${Object.keys(attributeUpdates).join(', ')}`);
          } else {
            await getDb().collection('products').doc(doc.id).update(payload);
            console.log(`[APPLY] ${doc.id}: updated ${Object.keys(attributeUpdates).join(', ')}`);
          }

          stats.productsNormalized++;
          stats.attributesNormalized += Object.keys(attributeUpdates).length;

          // Collect samples for report
          if (samples.length < MAX_SAMPLES) {
            samples.push({ productId: doc.id, changes });
          }
        }
      } catch (err: unknown) {
        const errMsg = err instanceof Error ? err.message : String(err);
        console.error(`❌ Error processing ${doc.id}: ${errMsg}`);
        stats.errors++;
      }

      if (LIMIT && processedTotal >= LIMIT) break;
    }

    lastDoc = snap.docs[snap.docs.length - 1];
    if (!lastDoc || (LIMIT && processedTotal >= LIMIT)) {
      hasMore = false;
    }
  }

  // Generate report
  const report: NormalizeReport = {
    lp: 'LP-1.4.6-normalize-dates',
    mode: DRY_RUN ? 'dry-run' : 'apply',
    timestamp: new Date().toISOString(),
    limitApplied: LIMIT,
    forceAdmin: FORCE_ADMIN,
    dateKeysChecked: DATE_KEYS,
    stats,
    samples,
  };

  // Write report
  const outDir = path.resolve(__dirname, '../../../../reports/normalize-dates');
  fs.mkdirSync(outDir, { recursive: true });
  const filename = `${new Date().toISOString().replace(/[:.]/g, '-')}-${DRY_RUN ? 'dry' : 'apply'}.json`;
  const reportPath = path.join(outDir, filename);
  fs.writeFileSync(reportPath, JSON.stringify(report, null, 2));

  // Print summary
  console.log('');
  console.log('═'.repeat(70));
  console.log('Summary');
  console.log('═'.repeat(70));
  console.log(`Products processed:        ${stats.processed}`);
  console.log(`Products normalized:       ${stats.productsNormalized}`);
  console.log(`Attributes normalized:     ${stats.attributesNormalized}`);
  console.log(`Skipped (already ISO):     ${stats.skippedAlreadyIso}`);
  console.log(`Skipped (admin protected): ${stats.skippedAdminProtected}`);
  console.log(`Skipped (unparseable):     ${stats.skippedUnparseable}`);
  console.log(`Errors:                    ${stats.errors}`);
  console.log('');
  console.log(`Report written to: ${reportPath}`);
  console.log('═'.repeat(70));

  if (DRY_RUN) {
    console.log('');
    console.log('This was a DRY RUN. No changes were made.');
    console.log('To apply changes, run with: --apply');
  }
}

// Run the migration
normalizeDates()
  .then(() => {
    console.log('normalizeProductDates: Done');
    process.exit(0);
  })
  .catch((e) => {
    console.error('normalizeProductDates: Failed', e);
    process.exit(2);
  });
