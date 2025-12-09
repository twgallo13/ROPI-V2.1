/**
 * Normalization Task: Normalize Product Attribute Values
 * 
 * Applies value normalization to product attributes using the
 * attributeNormalizers.json mapping and registry allowed_values.
 * 
 * This is an idempotent task - safe to re-run.
 * 
 * Usage:
 *   pnpm --filter @ropi-aoss/api build
 *   pnpm api:normalize:attributes
 * 
 * Lisa v1.0.0
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

// Load normalizers config
const normalizersPath = path.resolve(__dirname, '../../../sdk/config/attributeNormalizers.json');
let normalizers: Record<string, Record<string, string>> = {};
try {
  normalizers = JSON.parse(fs.readFileSync(normalizersPath, 'utf8'));
  console.log(`✅ Loaded normalizers from ${normalizersPath}`);
} catch {
  console.warn('⚠️ Could not load attributeNormalizers.json, using empty normalizers');
}

// Load attribute registry for allowed_values
const registryPath = path.resolve(__dirname, '../../../sdk/config/attributeRegistry.json');
let registryAllowedValues: Map<string, string[]> = new Map();
try {
  const registry = JSON.parse(fs.readFileSync(registryPath, 'utf8')) as Array<{
    attribute_id: string;
    allowed_values?: string[];
  }>;
  for (const attr of registry) {
    if (attr.allowed_values && attr.allowed_values.length > 0) {
      registryAllowedValues.set(attr.attribute_id, attr.allowed_values);
    }
  }
  console.log(`✅ Loaded ${registryAllowedValues.size} attributes with allowed_values`);
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
  console.log('🚀 Starting attribute value normalization...\n');

  const stats: NormalizationStats = {
    processed: 0,
    normalized: 0,
    skipped: 0,
    errors: 0,
    changes: [],
    unmapped: [],
  };

  const BATCH_SIZE = 500;
  let lastDoc: admin.firestore.QueryDocumentSnapshot | null = null;
  let hasMore = true;
  let batchNumber = 0;

  while (hasMore) {
    batchNumber++;
    console.log(`\n📦 Processing batch ${batchNumber}...`);

    let query = db.collection('products').limit(BATCH_SIZE);
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
    }

    lastDoc = snapshot.docs[snapshot.docs.length - 1];
    
    if (snapshot.size < BATCH_SIZE) {
      hasMore = false;
    }

    console.log(`   Batch ${batchNumber}: ${stats.normalized} normalized, ${stats.skipped} skipped`);
  }

  // Final summary
  console.log('\n─────────────────────────────────────');
  console.log('📊 Normalization Complete:');
  console.log(`   Processed:  ${stats.processed}`);
  console.log(`   Normalized: ${stats.normalized}`);
  console.log(`   Skipped:    ${stats.skipped}`);
  console.log(`   Errors:     ${stats.errors}`);
  console.log(`   Changes:    ${stats.changes.length}`);
  console.log(`   Unmapped:   ${stats.unmapped.length}`);
  console.log('─────────────────────────────────────\n');

  // Log sample changes
  if (stats.changes.length > 0) {
    console.log('📝 Sample changes (first 20):');
    stats.changes.slice(0, 20).forEach(c => {
      console.log(`   ${c.productId}.${c.key}: "${c.from}" → "${c.to}"`);
    });
    if (stats.changes.length > 20) {
      console.log(`   ... and ${stats.changes.length - 20} more changes`);
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
    const attributes = data.attributes;

    if (!attributes || typeof attributes !== 'object') {
      stats.skipped++;
      return;
    }

    const normalizedAttributes: Record<string, unknown> = {};
    let hasChanges = false;

    for (const [key, value] of Object.entries(attributes)) {
      // Skip metadata fields
      if (key.startsWith('_')) {
        normalizedAttributes[key] = value;
        continue;
      }

      const allowedValues = registryAllowedValues.get(key);
      const normalizedValue = normalizeValue(key, value, allowedValues);

      normalizedAttributes[key] = normalizedValue;

      if (normalizedValue !== value) {
        hasChanges = true;
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

    // Update with normalized attributes
    normalizedAttributes._normalizedAt = admin.firestore.FieldValue.serverTimestamp();
    await doc.ref.update({ attributes: normalizedAttributes });
    stats.normalized++;

  } catch (error) {
    stats.errors++;
    console.error(`Error processing ${doc.id}:`, error);
  }
}

// Run the normalization
normalizeProductAttributeValues()
  .then(() => {
    console.log('✅ Normalization completed successfully');
    process.exit(0);
  })
  .catch((error) => {
    console.error('❌ Normalization failed:', error);
    process.exit(1);
  });
