/**
 * Normalization Task: Normalize Product Attribute Values
 * 
 * Applies value normalization to product attributes using the
 * attributeNormalizers.json mapping and registry allowed_values.
 * 
 * LP-2.0.3: Per-key updates with provenance metadata in attributes._meta.<key>
 * 
 * This is an idempotent task - safe to re-run.
 * 
 * Usage:
 *   pnpm --filter @ropi-aoss/api build
 *   pnpm api:normalize:attributes
 *   pnpm api:normalize:attributes --dry-run
 *   pnpm api:normalize:attributes --limit 100
 * 
 * Lisa v1.0.0 / LP-2.0.3
 */

import * as admin from 'firebase-admin';
import * as fs from 'fs';
import * as path from 'path';

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

// Load normalizers config - use process.cwd() for consistent path resolution
const normalizersPath = process.env.NORMALIZERS_JSON_PATH || 
  path.resolve(process.cwd(), 'packages/sdk/config/attributeNormalizers.json');
let normalizers: Record<string, Record<string, string>> = {};
try {
  if (fs.existsSync(normalizersPath)) {
    normalizers = JSON.parse(fs.readFileSync(normalizersPath, 'utf8'));
    console.log(`✅ Loaded normalizers from ${normalizersPath}`);
  } else {
    console.warn('⚠️ attributeNormalizers.json not found, using empty normalizers');
  }
} catch {
  console.warn('⚠️ Could not load attributeNormalizers.json, using empty normalizers');
}

// Load attribute registry for allowed_values and version
const registryPath = process.env.REGISTRY_JSON_PATH || 
  path.resolve(process.cwd(), 'packages/sdk/config/attributeRegistry.json');
let registryAllowedValues: Map<string, string[]> = new Map();
let registryVersion = '0.0.0';
try {
  const rawRegistry = fs.readFileSync(registryPath, 'utf8');
  const registry = JSON.parse(rawRegistry) as {
    version?: string;
    attributes?: Array<{
      attribute_id: string;
      allowed_values?: string[];
    }>;
  } | Array<{ attribute_id: string; allowed_values?: string[] }>;

  // Handle both formats: { version, attributes } or just array
  const attributes = Array.isArray(registry) ? registry : registry.attributes || [];
  registryVersion = (!Array.isArray(registry) && registry.version) ? registry.version : '0.0.0';

  for (const attr of attributes) {
    if (attr.allowed_values && attr.allowed_values.length > 0) {
      registryAllowedValues.set(attr.attribute_id, attr.allowed_values);
    }
  }
  console.log(`✅ Loaded ${registryAllowedValues.size} attributes with allowed_values (v${registryVersion})`);
} catch {
  console.warn('⚠️ Could not load attributeRegistry.json');
}

interface NormalizationStats {
  processed: number;
  normalized: number;
  skipped: number;
  errors: number;
  changes: Array<{ productId: string; key: string; from: unknown; to: unknown }>;
  unmapped: Array<{ productId: string; key: string; value: unknown }>;
}

interface DryRunEntry {
  productId: string;
  changes: Array<{ key: string; from: unknown; to: unknown }>;
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
 * LP-2.0.3: Run normalization with per-key updates and provenance
 */
export async function normalizeProductAttributeValues(options?: {
  dryRun?: boolean;
  limit?: number;
}): Promise<void> {
  const isDryRun = options?.dryRun ?? false;
  const limit = options?.limit;

  console.log('🚀 Starting attribute value normalization...');
  if (isDryRun) {
    console.log('🔍 DRY RUN MODE - No changes will be written');
  }
  if (limit) {
    console.log(`📊 Limited to ${limit} products`);
  }
  console.log('');

  const stats: NormalizationStats = {
    processed: 0,
    normalized: 0,
    skipped: 0,
    errors: 0,
    changes: [],
    unmapped: [],
  };

  const dryRunOutput: DryRunEntry[] = [];

  const BATCH_SIZE = limit ? Math.min(limit, 500) : 500;
  let lastDoc: admin.firestore.QueryDocumentSnapshot | null = null;
  let hasMore = true;
  let batchNumber = 0;
  let totalProcessed = 0;

  while (hasMore) {
    batchNumber++;
    
    if (limit && totalProcessed >= limit) {
      break;
    }

    const batchLimit = limit ? Math.min(BATCH_SIZE, limit - totalProcessed) : BATCH_SIZE;

    console.log(`\n📦 Processing batch ${batchNumber}...`);

    let query = db.collection('products').limit(batchLimit);
    if (lastDoc) {
      query = query.startAfter(lastDoc);
    }

    const snapshot = await query.get();
    
    if (snapshot.empty) {
      hasMore = false;
      break;
    }

    for (const doc of snapshot.docs) {
      if (limit && totalProcessed >= limit) {
        break;
      }
      await processProduct(doc, stats, isDryRun, dryRunOutput);
      totalProcessed++;
    }

    lastDoc = snapshot.docs[snapshot.docs.length - 1];
    
    if (snapshot.size < batchLimit) {
      hasMore = false;
    }

    console.log(`   Batch ${batchNumber}: ${stats.normalized} normalized, ${stats.skipped} skipped`);
  }

  // Final summary
  console.log('\n─────────────────────────────────────');
  if (isDryRun) {
    console.log('📊 DRY RUN Summary:');
    console.log(`   Would process:   ${stats.processed}`);
    console.log(`   Would normalize: ${stats.normalized}`);
    console.log(`   Would skip:      ${stats.skipped}`);
    console.log(`   Changes:         ${stats.changes.length}`);
    console.log(`   Unmapped:        ${stats.unmapped.length}`);

    if (dryRunOutput.length > 0) {
      console.log('\n📝 Sample proposed changes (first 20):');
      let changeCount = 0;
      for (const entry of dryRunOutput) {
        if (changeCount >= 20) break;
        for (const change of entry.changes) {
          if (changeCount >= 20) break;
          console.log(`   ${entry.productId}.${change.key}: "${change.from}" → "${change.to}"`);
          changeCount++;
        }
      }
      if (stats.changes.length > 20) {
        console.log(`   ... and ${stats.changes.length - 20} more changes`);
      }
    }

    console.log('\n   ⚠️  No changes were made to Firestore');
  } else {
    console.log('📊 Normalization Complete:');
    console.log(`   Processed:  ${stats.processed}`);
    console.log(`   Normalized: ${stats.normalized}`);
    console.log(`   Skipped:    ${stats.skipped}`);
    console.log(`   Errors:     ${stats.errors}`);
    console.log(`   Changes:    ${stats.changes.length}`);
    console.log(`   Unmapped:   ${stats.unmapped.length}`);
  }
  console.log('─────────────────────────────────────\n');

  // Log sample changes (for actual run)
  if (!isDryRun && stats.changes.length > 0) {
    console.log('📝 Sample changes (first 20):');
    stats.changes.slice(0, 20).forEach(c => {
      console.log(`   ${c.productId}.${c.key}: "${c.from}" → "${c.to}"`);
    });
  }

  // Log unmapped values for manual review
  if (stats.unmapped.length > 0) {
    console.log('\n⚠️ Unmapped values (need manual mapping):');
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

/**
 * LP-2.0.3: Process a single product with per-key updates and provenance
 */
async function processProduct(
  doc: admin.firestore.QueryDocumentSnapshot,
  stats: NormalizationStats,
  isDryRun: boolean,
  dryRunOutput: DryRunEntry[]
): Promise<void> {
  stats.processed++;
  
  try {
    const data = doc.data();
    const productId = doc.id;
    const attributes = data.attributes;

    if (!attributes || typeof attributes !== 'object') {
      stats.skipped++;
      return;
    }

    // LP-2.0.3: Build per-key update payload with dot-notation
    const updatePayload: Record<string, unknown> = {};
    const changes: Array<{ key: string; from: unknown; to: unknown }> = [];
    let hasChanges = false;

    for (const [key, value] of Object.entries(attributes)) {
      // Skip metadata fields (preserve existing _ fields)
      if (key.startsWith('_')) {
        continue;
      }

      const allowedValues = registryAllowedValues.get(key);
      const normalizedValue = normalizeValue(key, value, allowedValues);

      if (normalizedValue !== value) {
        // LP-2.0.3: Per-key update with dot-notation
        updatePayload[`attributes.${key}`] = normalizedValue;
        updatePayload[`attributes._meta.${key}`] = {
          source: 'normalizer',
          actor: 'system',
          ts: new Date().toISOString(),
          definition_version: registryVersion,
          previousValue: value,
        };

        hasChanges = true;
        changes.push({ key, from: value, to: normalizedValue });
        stats.changes.push({ productId, key, from: value, to: normalizedValue });
      } else if (typeof value === 'string' && allowedValues && !allowedValues.includes(value)) {
        // Track unmapped values that don't match allowed_values
        stats.unmapped.push({ productId, key, value });
      }
    }

    if (!hasChanges) {
      stats.skipped++;
      return;
    }

    // LP-2.0.3: Add overall normalization timestamp
    updatePayload['attributes._normalizedAt'] = admin.firestore.FieldValue.serverTimestamp();

    if (isDryRun) {
      dryRunOutput.push({ productId, changes });
      stats.normalized++;
    } else {
      // LP-2.0.3: Atomic per-key update
      await doc.ref.update(updatePayload);
      stats.normalized++;
    }

  } catch (error) {
    stats.errors++;
    console.error(`Error processing ${doc.id}:`, error);
  }
}

// CLI entry point
if (require.main === module) {
  const args = process.argv.slice(2);
  const dryRun = args.includes('--dry-run');
  const limitArg = args.find(a => a.startsWith('--limit'));
  const limit = limitArg ? parseInt(limitArg.split('=')[1] || args[args.indexOf('--limit') + 1], 10) : undefined;

  normalizeProductAttributeValues({ dryRun, limit })
    .then(() => {
      console.log('✅ Normalization completed successfully');
      process.exit(0);
    })
    .catch((error) => {
      console.error('❌ Normalization failed:', error);
      process.exit(1);
    });
}

export default normalizeProductAttributeValues;
