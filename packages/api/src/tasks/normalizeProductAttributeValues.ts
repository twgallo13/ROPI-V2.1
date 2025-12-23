/**
 * Normalization Task: Normalize Product Attribute Values
 * LP-2.1.7 — Per-key updates with _meta provenance
 * 
 * Applies value normalization to product attributes using the
 * attributeNormalizers.json mapping and registry allowed_values.
 * Uses per-key updates with _meta provenance tracking.
 * 
 * Features:
 * - Dry-run mode (default): produces audit JSON, does not write
 * - Pilot mode: --apply --limit=N for limited apply
 * - Per-key updates: writes attributes.<key> individually (not wholesale replacement)
 * - _meta provenance: tracks actor, source, timestamp, definition_version
 * - Admin-canonical protection: respects admin-authored canonical values
 * - --force-admin: override admin-canonical protection (requires --admin-note)
 * 
 * Usage:
 *   # Dry-run (default)
 *   pnpm api:normalize:attributes
 * 
 *   # Pilot apply (100 products)
 *   pnpm api:normalize:attributes -- --apply --limit=100
 * 
 *   # Full apply
 *   pnpm api:normalize:attributes -- --apply
 * 
 * Lisa LP-2.1.7
 */

import * as admin from 'firebase-admin';
import * as fs from 'fs';
import * as path from 'path';
import {
  buildPerKeyUpdatePayload,
  isAdminCanonical,
  generateAttributeDiff,
  type AttributeMetaEntry,
  type AttributeDiff,
  type ActorType,
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

const db = admin.firestore();

// Parse CLI arguments
const args = process.argv.slice(2);
const DRY_RUN = !args.includes('--apply');
const FORCE_ADMIN = args.includes('--force-admin');
const limitIndex = args.findIndex(a => a.startsWith('--limit='));
const LIMIT = limitIndex >= 0 ? parseInt(args[limitIndex].split('=')[1], 10) : undefined;
const noteIndex = args.findIndex(a => a.startsWith('--admin-note='));
const ADMIN_NOTE = noteIndex >= 0 ? args[noteIndex].split('=').slice(1).join('=') : undefined;

// Load normalizers config
const normalizersPath = path.resolve(__dirname, '../../../sdk/config/attributeNormalizers.json');
let normalizers: Record<string, Record<string, string>> = {};
try {
  normalizers = JSON.parse(fs.readFileSync(normalizersPath, 'utf8'));
  console.log(`✅ Loaded normalizers from ${normalizersPath}`);
} catch {
  console.warn('⚠️ Could not load attributeNormalizers.json, using empty normalizers');
}

// Load attribute registry for allowed_values and version
const registryPath = path.resolve(__dirname, '../../../sdk/config/attributeRegistry.json');
let registryAllowedValues: Map<string, string[]> = new Map();
let REGISTRY_VERSION = '0.0.0';
try {
  const registry = JSON.parse(fs.readFileSync(registryPath, 'utf8'));
  REGISTRY_VERSION = registry.version ?? '0.0.0';
  for (const attr of registry.attributes ?? []) {
    if (attr.allowed_values && attr.allowed_values.length > 0) {
      registryAllowedValues.set(attr.attribute_id, attr.allowed_values);
    }
  }
  console.log(`✅ Loaded ${registryAllowedValues.size} attributes with allowed_values (v${REGISTRY_VERSION})`);
} catch {
  console.warn('⚠️ Could not load attributeRegistry.json');
}

interface ProductDiff {
  productId: string;
  mpn: string | undefined;
  attributeDiffs: AttributeDiff[];
  protectedCount: number;
  changeCount: number;
}

interface NormalizationStats {
  processed: number;
  normalized: number;
  skipped: number;
  errors: number;
  protectedAttributes: number;
  totalAttributeChanges: number;
  productDiffs: ProductDiff[];
  unmapped: Array<{ productId: string; key: string; value: unknown }>;
  errorDetails: Array<{ productId: string; error: string }>;
}

interface NormalizationReport {
  lp: string;
  mode: string;
  timestamp: string;
  registryVersion: string;
  forceAdmin: boolean;
  adminNote?: string;
  limit?: number;
  stats: {
    processed: number;
    normalized: number;
    skipped: number;
    errors: number;
    protectedAttributes: number;
    totalAttributeChanges: number;
    unmappedCount: number;
  };
  productDiffs: ProductDiff[];
  unmapped: Array<{ productId: string; key: string; value: unknown }>;
  errors: Array<{ productId: string; error: string }>;
}

/**
 * Normalize an attribute value
 */
function normalizeValue(
  attributeId: string,
  rawValue: unknown,
  allowedValues?: string[]
): unknown {
  if (typeof rawValue !== 'string') {
    return rawValue;
  }

  const raw = rawValue.trim();
  if (!raw) return rawValue;

  // Check explicit mapping
  const attrNormalizers = normalizers[attributeId];
  if (attrNormalizers && attrNormalizers[raw]) {
    return attrNormalizers[raw];
  }

  // Clean color duplicates like "BLACK/BLACK" -> "Black"
  const cleaned = cleanDuplicateValue(raw);

  // Try to match allowed values case-insensitively
  if (allowedValues && allowedValues.length > 0) {
    const lowerCleaned = cleaned.toLowerCase();
    for (const allowed of allowedValues) {
      if (allowed.toLowerCase() === lowerCleaned) {
        return allowed;
      }
    }
    const lowerRaw = raw.toLowerCase();
    for (const allowed of allowedValues) {
      if (allowed.toLowerCase() === lowerRaw) {
        return allowed;
      }
    }
  }

  return cleaned !== raw ? cleaned : rawValue;
}

function cleanDuplicateValue(value: string): string {
  // "BLACK/BLACK" -> "Black"
  const slashParts = value.split('/').map(p => p.trim());
  if (slashParts.length === 2 && slashParts[0].toLowerCase() === slashParts[1].toLowerCase()) {
    return capitalizeFirst(slashParts[0]);
  }

  // "BLUE - BLUE" -> "Blue"
  const dashParts = value.split(' - ').map(p => p.trim());
  if (dashParts.length === 2 && dashParts[0].toLowerCase() === dashParts[1].toLowerCase()) {
    return capitalizeFirst(dashParts[0]);
  }

  return value;
}

function capitalizeFirst(str: string): string {
  if (!str) return str;
  return str.charAt(0).toUpperCase() + str.slice(1).toLowerCase();
}

/**
 * Run normalization in batches
 */
async function normalizeProductAttributeValues(): Promise<void> {
  console.log('🚀 Starting LP-2.1.7 attribute value normalization...\n');
  console.log(`📋 Mode: ${DRY_RUN ? 'DRY-RUN' : 'APPLY'}`);
  console.log(`📋 Registry version: ${REGISTRY_VERSION}`);
  console.log(`📋 Force admin: ${FORCE_ADMIN}`);
  if (LIMIT) console.log(`📋 Limit: ${LIMIT} products`);
  if (ADMIN_NOTE) console.log(`📋 Admin note: ${ADMIN_NOTE}`);
  console.log();

  // Validate force-admin requires admin-note
  if (FORCE_ADMIN && !ADMIN_NOTE) {
    console.error('❌ --force-admin requires --admin-note="reason"');
    process.exit(1);
  }

  const stats: NormalizationStats = {
    processed: 0,
    normalized: 0,
    skipped: 0,
    errors: 0,
    protectedAttributes: 0,
    totalAttributeChanges: 0,
    productDiffs: [],
    unmapped: [],
    errorDetails: [],
  };

  const BATCH_SIZE = 500;
  let lastDoc: admin.firestore.QueryDocumentSnapshot | null = null;
  let hasMore = true;
  let batchNumber = 0;
  let totalProcessed = 0;

  while (hasMore) {
    // Check limit
    if (LIMIT && totalProcessed >= LIMIT) {
      console.log(`\n🛑 Reached limit of ${LIMIT} products`);
      break;
    }

    batchNumber++;
    const remaining = LIMIT ? Math.min(BATCH_SIZE, LIMIT - totalProcessed) : BATCH_SIZE;
    console.log(`\n📦 Processing batch ${batchNumber}...`);

    let query = db.collection('products').limit(remaining);
    if (lastDoc) {
      query = query.startAfter(lastDoc);
    }

    const snapshot = await query.get();
    
    if (snapshot.empty) {
      hasMore = false;
      break;
    }

    for (const doc of snapshot.docs) {
      await processProduct(doc, stats);
      totalProcessed++;
      
      if (LIMIT && totalProcessed >= LIMIT) {
        break;
      }
    }

    lastDoc = snapshot.docs[snapshot.docs.length - 1];
    
    if (snapshot.size < remaining) {
      hasMore = false;
    }

    console.log(`   Batch ${batchNumber}: ${stats.normalized} normalized, ${stats.skipped} skipped`);
  }

  // Generate report
  const report: NormalizationReport = {
    lp: 'LP-2.1.7',
    mode: DRY_RUN ? 'dry-run' : 'apply',
    timestamp: new Date().toISOString(),
    registryVersion: REGISTRY_VERSION,
    forceAdmin: FORCE_ADMIN,
    adminNote: ADMIN_NOTE,
    limit: LIMIT,
    stats: {
      processed: stats.processed,
      normalized: stats.normalized,
      skipped: stats.skipped,
      errors: stats.errors,
      protectedAttributes: stats.protectedAttributes,
      totalAttributeChanges: stats.totalAttributeChanges,
      unmappedCount: stats.unmapped.length,
    },
    productDiffs: stats.productDiffs,
    unmapped: stats.unmapped.slice(0, 1000), // Limit unmapped entries in report
    errors: stats.errorDetails,
  };

  // Write report to file
  const dateStr = new Date().toISOString().split('T')[0];
  const reportsDir = path.resolve(__dirname, `../../../../reports/attribute-inspections/${dateStr}`);
  fs.mkdirSync(reportsDir, { recursive: true });
  
  const reportPath = path.join(reportsDir, 'normalization-audit.json');
  fs.writeFileSync(reportPath, JSON.stringify(report, null, 2));
  console.log(`\n📄 Report written to: ${reportPath}`);

  // Final summary
  console.log('\n─────────────────────────────────────');
  console.log(`📊 Normalization ${DRY_RUN ? 'Dry-Run' : 'Apply'} Complete:`);
  console.log(`   Processed:  ${stats.processed}`);
  console.log(`   Normalized: ${stats.normalized}`);
  console.log(`   Skipped:    ${stats.skipped}`);
  console.log(`   Errors:     ${stats.errors}`);
  console.log(`   Protected:  ${stats.protectedAttributes} admin-canonical attributes preserved`);
  console.log(`   Changes:    ${stats.totalAttributeChanges}`);
  console.log(`   Unmapped:   ${stats.unmapped.length}`);
  console.log('─────────────────────────────────────\n');

  // Log sample changes
  if (stats.productDiffs.length > 0 && stats.productDiffs[0].attributeDiffs.length > 0) {
    console.log('📝 Sample changes (first 20):');
    let count = 0;
    for (const pd of stats.productDiffs) {
      for (const ad of pd.attributeDiffs) {
        if (count >= 20) break;
        console.log(`   ${pd.productId}.${ad.attrId}: "${ad.old_value}" → "${ad.new_value}"`);
        count++;
      }
      if (count >= 20) break;
    }
    if (stats.totalAttributeChanges > 20) {
      console.log(`   ... and ${stats.totalAttributeChanges - 20} more changes`);
    }
  }

  // Log unmapped values for manual review
  if (stats.unmapped.length > 0) {
    console.log('\n⚠️ Unmapped values (need manual mapping):');
    // Group by key
    const byKey = new Map<string, Set<string>>();
    for (const u of stats.unmapped) {
      const values = byKey.get(u.key) || new Set();
      values.add(String(u.value));
      byKey.set(u.key, values);
    }
    for (const [key, values] of byKey) {
      console.log(`   ${key}: ${Array.from(values).slice(0, 5).join(', ')}${values.size > 5 ? '...' : ''}`);
    }
  }
}

async function processProduct(
  doc: admin.firestore.QueryDocumentSnapshot,
  stats: NormalizationStats
): Promise<void> {
  stats.processed++;
  
  try {
    const data = doc.data();
    const productId = doc.id;
    const mpn = data.mpn as string | undefined;
    const attributes = data.attributes;

    if (!attributes || typeof attributes !== 'object') {
      stats.skipped++;
      return;
    }

    // Get existing _meta
    const existingMeta = (attributes._meta && typeof attributes._meta === 'object')
      ? attributes._meta as Record<string, AttributeMetaEntry>
      : {};

    const attributeDiffs: AttributeDiff[] = [];
    const attributesToUpdate: Record<string, unknown> = {};
    let protectedCount = 0;

    for (const [key, value] of Object.entries(attributes)) {
      // Skip metadata fields
      if (key.startsWith('_')) {
        continue;
      }

      const existingAttrMeta = existingMeta[key];

      // Check if admin-canonical protection applies
      if (isAdminCanonical(existingAttrMeta)) {
        protectedCount++;
        stats.protectedAttributes++;
        
        if (!FORCE_ADMIN) {
          // Generate diff showing protection
          attributeDiffs.push(generateAttributeDiff(
            key,
            value,
            value, // no change
            existingAttrMeta,
            {
              actor: 'system:normalizer' as ActorType,
              source: 'normalizer',
              method: 'normalizeProductAttributeValues',
              definitionVersion: REGISTRY_VERSION,
              canonical: false,
            },
            false
          ));
          continue;
        }
      }

      const allowedValues = registryAllowedValues.get(key);
      const normalizedValue = normalizeValue(key, value, allowedValues);

      if (normalizedValue !== value) {
        attributesToUpdate[key] = normalizedValue;
        stats.totalAttributeChanges++;

        // Generate diff
        attributeDiffs.push(generateAttributeDiff(
          key,
          value,
          normalizedValue,
          existingAttrMeta,
          {
            actor: 'system:normalizer' as ActorType,
            source: 'normalizer',
            method: 'normalizeProductAttributeValues',
            definitionVersion: REGISTRY_VERSION,
            canonical: false,
            note: ADMIN_NOTE,
          },
          FORCE_ADMIN
        ));
      } else if (typeof value === 'string' && allowedValues && !allowedValues.includes(value)) {
        // Track unmapped values that don't match allowed_values
        stats.unmapped.push({ productId, key, value });
      }
    }

    if (Object.keys(attributesToUpdate).length === 0) {
      stats.skipped++;
      return;
    }

    // Record product diff
    stats.productDiffs.push({
      productId,
      mpn,
      attributeDiffs,
      protectedCount,
      changeCount: Object.keys(attributesToUpdate).length,
    });

    // If dry-run, don't write
    if (DRY_RUN) {
      stats.normalized++;
      return;
    }

    // Build per-key update payload
    const updatePayload = buildPerKeyUpdatePayload({
      attributes: attributesToUpdate,
      actor: 'system:normalizer',
      source: 'normalizer',
      method: 'normalizeProductAttributeValues',
      definitionVersion: REGISTRY_VERSION,
      canonical: false,
      note: ADMIN_NOTE,
    });

    // Add normalization marker
    updatePayload['attributes._meta._normalization'] = {
      actor: 'system:normalizer',
      source: 'normalizer',
      ts: new Date().toISOString(),
      method: 'normalizeProductAttributeValues',
      definition_version: REGISTRY_VERSION,
      canonical: false,
      note: ADMIN_NOTE ?? 'LP-2.1.7 normalization',
    };

    await doc.ref.update(updatePayload);
    stats.normalized++;

  } catch (error) {
    stats.errors++;
    stats.errorDetails.push({
      productId: doc.id,
      error: error instanceof Error ? error.message : String(error),
    });
  }
}

// Run the normalization
normalizeProductAttributeValues()
  .then(() => {
    console.log(`✅ Normalization ${DRY_RUN ? 'dry-run' : 'apply'} completed successfully`);
    process.exit(0);
  })
  .catch((error) => {
    console.error('❌ Normalization failed:', error);
    process.exit(1);
  });
