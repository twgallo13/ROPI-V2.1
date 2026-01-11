/**
 * Sync Attribute Registry Task
 * 
 * Idempotent migration/sync that populates settings/attributes/keys/{attributeId}
 * from the canonical attribute registry JSON (or from Notion if configured).
 * 
 * Lisa v1.0.0
 * 
 * References:
 * - Attribute Registry (Notion): https://www.notion.so/2b845ee1ec5a81228b07ca97964cd033
 * - Attribute Validation Schema: https://www.notion.so/2b845ee1ec5a805fba0ef665dfb17396
 * 
 * Usage:
 *   CLI: pnpm api:sync:attributes
 *   Cloud Function: Call syncAttributeRegistry endpoint (admin-only)
 */

import * as admin from 'firebase-admin';
import * as fs from 'fs';
import * as path from 'path';
import * as os from 'os';
import { Storage } from '@google-cloud/storage';

// Type definitions
interface AttributeDefinition {
  attribute_id: string;
  label: string;
  external_header?: string;
  category?: string;
  data_type: 'string' | 'number' | 'boolean' | 'enum' | 'currency' | 'json' | 'multiSelect' | 'date' | 'select' | 'text' | 'longText' | 'money';
  allowed_values?: string[];
  synonyms?: string[];
  required_for_completion?: boolean;
  required_for_export?: boolean;
  import_required?: boolean;
  ai_usage_notes?: string;
  status?: 'active' | 'deprecated' | 'hidden';
  source?: 'notion' | 'derived' | 'json';
}

/**
 * LP-test-fix-1.0: Normalize data_type from registry format to schema format
 * 
 * Registry format → Schema format mappings:
 * - text → string
 * - longText → string  
 * - select → enum
 * - money → currency
 */
function normalizeDataType(dataType: string): AttributeDefinition['data_type'] {
  const mapping: Record<string, AttributeDefinition['data_type']> = {
    'text': 'string',
    'longText': 'string',
    'select': 'enum',
    'money': 'currency',
  };
  return mapping[dataType] || (dataType as AttributeDefinition['data_type']);
}

interface SyncResult {
  created: number;
  updated: number;
  skipped: number;
  errors: string[];
  attributes: string[];
}

// LP-1.2.2: Path resolution with fallback (packaged → dev → GCS)
const PACKAGED_REGISTRY_PATH = path.resolve(__dirname, '../config/attributeRegistry.json');
const DEV_REGISTRY_PATH = path.resolve(__dirname, '../../../sdk/config/attributeRegistry.json');
let REGISTRY_JSON_PATH = PACKAGED_REGISTRY_PATH;

// GCS fallback env vars (optional) - to be set in deployment env if desired:
// ATTRIBUTE_REGISTRY_GCS_BUCKET=ropi-bccee-config
// ATTRIBUTE_REGISTRY_GCS_KEY=attributeRegistry.json
const GCS_BUCKET = process.env.ATTRIBUTE_REGISTRY_GCS_BUCKET || '';
const GCS_KEY = process.env.ATTRIBUTE_REGISTRY_GCS_KEY || 'attributeRegistry.json';

// Attempt to resolve registry path at startup
if (!fs.existsSync(PACKAGED_REGISTRY_PATH)) {
  // fallback to dev path if present
  if (fs.existsSync(DEV_REGISTRY_PATH)) {
    REGISTRY_JSON_PATH = DEV_REGISTRY_PATH;
  } else {
    REGISTRY_JSON_PATH = PACKAGED_REGISTRY_PATH; // keep packaged path, will attempt GCS next
  }
}

// Firestore collection path
const ATTRIBUTES_COLLECTION = 'settings/attributes/keys';

/**
 * LP-1.2.2: Fetch registry from GCS if local file is missing
 */
async function fetchRegistryFromGCSIfMissing(): Promise<boolean> {
  try {
    if (fs.existsSync(REGISTRY_JSON_PATH)) return true;
    if (!GCS_BUCKET) {
      console.warn('⚠️ ATTRIBUTE_REGISTRY_GCS_BUCKET not set — cannot fetch registry from GCS');
      return false;
    }
    const storage = new Storage();
    const tmpDir = os.tmpdir();
    const destPath = path.join(tmpDir, GCS_KEY);
    console.log(`📥 Attempting to download attribute registry from gs://${GCS_BUCKET}/${GCS_KEY} to ${destPath}`);
    const bucket = storage.bucket(GCS_BUCKET);
    const file = bucket.file(GCS_KEY);
    await file.download({ destination: destPath });
    // validate JSON
    const raw = fs.readFileSync(destPath, 'utf8');
    JSON.parse(raw);
    // Use the temp path as the resolved registry JSON path
    REGISTRY_JSON_PATH = destPath;
    console.log('✅ Attribute registry downloaded to temp path; using it for sync.');
    return true;
  } catch (err) {
    console.error('❌ Failed to fetch registry from GCS:', err);
    return false;
  }
}

/**
 * Load attribute registry from the JSON file
 */
async function loadRegistryFromFile(): Promise<AttributeDefinition[] | null> {
  try {
    // LP-1.1.0: Diagnostic logging
    console.log(
      `[loadRegistryFromFile] Checking paths:\n  PACKAGED: ${PACKAGED_REGISTRY_PATH} exists=${fs.existsSync(PACKAGED_REGISTRY_PATH)}\n  DEV: ${DEV_REGISTRY_PATH} exists=${fs.existsSync(DEV_REGISTRY_PATH)}\n  SELECTED: ${REGISTRY_JSON_PATH}`
    );

    // LP-1.2.2: Try GCS fallback if file not found
    if (!fs.existsSync(REGISTRY_JSON_PATH)) {
      console.warn(`⚠️ Registry not found at ${REGISTRY_JSON_PATH}. Attempting GCS fallback...`);
      const ok = await fetchRegistryFromGCSIfMissing();
      if (!ok) {
        console.error(`❌ Registry file not found at ${REGISTRY_JSON_PATH} and GCS fallback failed.`);
        return null;
      }
    }

    const raw = fs.readFileSync(REGISTRY_JSON_PATH, 'utf-8');
    const parsed = JSON.parse(raw) as
      | AttributeDefinition[]
      | { attributes?: AttributeDefinition[] };

    // Handle both array and {attributes: []} shapes
    const attributes = Array.isArray(parsed)
      ? parsed
      : (parsed.attributes && Array.isArray(parsed.attributes))
        ? parsed.attributes
        : null;

    if (!attributes || attributes.length === 0) {
      console.warn(`⚠️ Registry file has no attributes at ${REGISTRY_JSON_PATH}`);
      return null;
    }

    console.log(`✅ Loaded ${attributes.length} attributes from ${REGISTRY_JSON_PATH}`);
    // LP-test-fix-1.0: Normalize data_type values when loading from JSON
    return attributes.map(attr => ({ 
      ...attr, 
      data_type: normalizeDataType(attr.data_type),
      source: 'json' as const 
    }));
  } catch (error) {
    console.error('❌ Error loading registry from file:', error);
    return null;
  }
}

/**
 * Load attribute registry from Notion (requires NOTION_TOKEN)
 * 
 * Page ID: 2b845ee1ec5a81228b07ca97964cd033
 * 
 * Note: This is a placeholder. Full implementation would use @notionhq/client
 * to parse the Notion database and convert rows to AttributeDefinition[].
 */
async function loadRegistryFromNotion(): Promise<AttributeDefinition[] | null> {
  const notionToken = process.env.NOTION_TOKEN;
  
  if (!notionToken) {
    console.warn('⚠️ NOTION_TOKEN not set, cannot load from Notion');
    return null;
  }

  // Note: To implement Notion fetching, you would:
  // 1. npm install @notionhq/client
  // 2. Use the Client to query the database
  // 3. Parse the table rows into AttributeDefinition[]
  
  console.warn('⚠️ Notion parsing not fully implemented - prefer committing attributeRegistry.json');
  
  // Placeholder - return null to fall back to derived
  return null;
}

/**
 * Derive attributes from existing product documents
 * Scans products collection and extracts unique attribute keys
 * 
 * [LP-phase2b-003-REMEDIATION]: DISABLED
 * Derivation from products can cause uncontrolled attribute creation.
 * Only sync from authoritative JSON registry or Firestore-managed sources.
 */
async function deriveAttributesFromProducts(): Promise<AttributeDefinition[]> {
  // [LP-phase2b-003-REMEDIATION]: Block auto-creation from products
  console.warn('⚠️ [deriveAttributesFromProducts] DISABLED for LP-phase2b-003 remediation');
  console.warn('   Attributes must be explicitly defined in attributeRegistry.json');
  console.warn('   To re-enable auto-derivation, set ALLOW_DERIVE_FROM_PRODUCTS=true in env');
  
  const allowDerive = process.env.ALLOW_DERIVE_FROM_PRODUCTS === 'true';
  if (!allowDerive) {
    return [];
  }

  const db = admin.firestore();
  const derived: Map<string, AttributeDefinition> = new Map();

  try {
    const productsSnapshot = await db.collection('products').limit(100).get();
    
    if (productsSnapshot.empty) {
      console.log('ℹ️ No products found to derive attributes from');
      return [];
    }

    productsSnapshot.forEach((doc) => {
      const product = doc.data();
      const attrs = product.attributes || {};
      
      for (const [key, value] of Object.entries(attrs)) {
        if (!derived.has(key)) {
          // Infer data type from value
          let dataType: AttributeDefinition['data_type'] = 'string';
          if (typeof value === 'boolean') {
            dataType = 'boolean';
          } else if (typeof value === 'number') {
            dataType = 'number';
          } else if (Array.isArray(value)) {
            dataType = 'multiSelect';
          }

          derived.set(key, {
            attribute_id: key,
            label: key.replace(/_/g, ' ').replace(/\b\w/g, c => c.toUpperCase()),
            data_type: dataType,
            required_for_completion: false,
            required_for_export: false,
            status: 'active',
            source: 'derived',
          });
        }
      }
    });

    console.log(`✅ Derived ${derived.size} attributes from products`);
    return Array.from(derived.values());
  } catch (error) {
    console.error('❌ Error deriving attributes from products:', error);
    return [];
  }
}

/**
 * Main sync function - loads registry and upserts to Firestore
 */
// LP-1.1.0: Add dryRun parameter (default false for CLI, apiApp.ts defaults true)
export async function runSyncAttributeRegistry(dryRun = false, forceOverwrite = false): Promise<SyncResult> {
  const result: SyncResult = {
    created: 0,
    updated: 0,
    skipped: 0,
    errors: [],
    attributes: [],
  };

  // Initialize Firebase Admin if not already initialized
  if (!admin.apps.length) {
    admin.initializeApp();
  }

  const db = admin.firestore();

  // Load registry with fallback chain: JSON file → Notion → Derived from products
  let registry = await loadRegistryFromFile();
  
  if (!registry) {
    registry = await loadRegistryFromNotion();
  }
  
  if (!registry || registry.length === 0) {
    console.log('ℹ️ Falling back to deriving attributes from products');
    registry = await deriveAttributesFromProducts();
  }

  if (!registry || registry.length === 0) {
    const msg = 'No attribute registry found and no products to derive from';
    console.error(`❌ ${msg}`);
    result.errors.push(msg);
    return result;
  }

  console.log(`\n📋 Syncing ${registry.length} attributes to Firestore...\n`);

  // LP-service-account-ropi-deploy-1.0.0: Read registry version for meta writes
  let registryVersion = 'unknown';
  try {
    const rawReg = fs.readFileSync(REGISTRY_JSON_PATH, 'utf-8');
    const parsedReg = JSON.parse(rawReg);
    if (parsedReg && typeof parsedReg === 'object' && 'version' in parsedReg) {
      registryVersion = (parsedReg as { version?: string }).version || registryVersion;
    }
  } catch (err) {
    console.warn('⚠️ Could not parse registry version from file:', err);
  }
  // Derive resolved source from first attribute, fallback to 'json'
  const resolvedSource = (Array.isArray(registry) && registry[0] && registry[0].source) 
    ? registry[0].source 
    : 'json';

  // Process each attribute
  for (const attr of registry) {
    // Skip deprecated attributes (they should not be synced back)
    if (attr.status === 'deprecated') {
      result.skipped++;
      console.log(`  [SKIP] Deprecated attribute (will not overwrite): ${attr.attribute_id}`);
      continue;
    }

    // Ensure we write to settings/attributes/keys/{attribute_id}
    const docRef = db.doc(`settings/attributes/keys/${attr.attribute_id}`);
    
    try {
      // --- START: preserve admin-edited fields on sync (Lisa v1.0.0) ---
      const existingDoc = await docRef.get();
      const now = new Date().toISOString();

      // Fields we preserve from existing admin edits during a registry sync.
      // Add additional admin-editable fields here if required later.
      const PRESERVE_FIELDS: string[] = ['ai_use'];

      // LP-1.1.0: Skip writes when dryRun is true
      if (dryRun) {
        if (existingDoc.exists) {
          result.skipped++;
          console.log(`  [DRY-RUN] Would update: ${attr.attribute_id}`);
        } else {
          result.skipped++;
          console.log(`  [DRY-RUN] Would create: ${attr.attribute_id}`);
        }
        result.attributes.push(attr.attribute_id);
        continue;
      }

      // Canonical payload derived from registry
      const registryPayload: Record<string, unknown> = {
        attribute_id: attr.attribute_id,
        label: attr.label,
        external_header: attr.external_header,
        category: attr.category,
        data_type: attr.data_type,
        allowed_values: attr.allowed_values,
        synonyms: attr.synonyms,
        required_for_completion: attr.required_for_completion ?? false,
        required_for_export: attr.required_for_export ?? false,
        import_required: attr.import_required ?? false,
        ai_usage_notes: attr.ai_usage_notes,
        ai_use: attr.ai_use ?? false,
        status: attr.status ?? 'active',
        source: resolvedSource,
        definition_version: registryVersion,
        syncedAt: now,
        syncedBy: 'system:sync',
      };

      if (existingDoc.exists) {
        // Preserve admin-edited fields from existing doc unless forceOverwrite
        const existingData = existingDoc.data() || {};

        // Normalize legacy property shapes (aiUse -> ai_use)
        if (existingData.aiUse !== undefined && existingData.ai_use === undefined) {
          existingData.ai_use = existingData.aiUse;
        }

        if (!forceOverwrite) {
          for (const key of PRESERVE_FIELDS) {
            if (existingData[key] !== undefined) {
              registryPayload[key] = existingData[key];
            }
          }
        }

        registryPayload['updatedAt'] = now;
        registryPayload['updatedBy'] = 'system:sync';

        // Use update() to avoid wiping unrelated server-managed fields
        await docRef.update(registryPayload);
        result.updated++;
        result.attributes.push(attr.attribute_id);
        console.log(`  [UPDATE] ${attr.attribute_id}`);
      } else {
        // Create new doc
        registryPayload['createdAt'] = now;
        registryPayload['createdBy'] = 'system:sync';

        await docRef.set(registryPayload);
        result.created++;
        result.attributes.push(attr.attribute_id);
        console.log(`  [CREATE] ${attr.attribute_id}`);
      }
      // --- END: preserve admin-edited fields on sync ---
    } catch (error: unknown) {
      const errorMsg = error instanceof Error ? error.message : String(error);
      const msg = `Failed to sync ${attr.attribute_id}: ${errorMsg}`;
      console.error(`  ✗ ${msg}`);
      result.errors.push(msg);
    }
  }

  console.log('\n─────────────────────────────────────');
  console.log(`📊 Sync Complete:`);
  console.log(`   Created: ${result.created}`);
  console.log(`   Updated: ${result.updated}`);
  console.log(`   Errors:  ${result.errors.length}`);
  console.log('─────────────────────────────────────\n');

  // LP-service-account-ropi-deploy-1.0.0: Write global metadata if not a dry-run
  try {
    if (!dryRun) {
      // Use collection('settings').doc('attributes').collection('meta').doc('sync')
      // or simpler: settings/attributesMeta as a top-level doc
      const metaRef = db.collection('settings').doc('attributesMeta');
      const now = new Date().toISOString();
      await metaRef.set({
        registry_version: registryVersion,
        registry_source: resolvedSource,
        git_sha: process.env.GIT_SHA || null,
        lastSyncedAt: now,
        lastSyncedBy: process.env.SYNC_CALLER || 'system',
        totalAttributes: registry.length,
        dryRun: false,
        forceOverwrite: forceOverwrite,
      }, { merge: true });
      console.log('✅ Wrote settings/attributesMeta');
    } else {
      console.log('ℹ️ Dry-run; skipping write of settings/attributesMeta');
    }
  } catch (metaErr) {
    const metaMsg = metaErr instanceof Error ? metaErr.message : String(metaErr);
    console.error('❌ Failed to write settings/attributesMeta:', metaMsg);
    result.errors.push(`Failed to write attributes meta: ${metaMsg}`);
  }

  return result;
}

/**
 * CLI entry point
 */
if (require.main === module) {
  runSyncAttributeRegistry()
    .then((result) => {
      if (result.errors.length > 0) {
        console.error('Sync completed with errors');
        process.exit(1);
      }
      console.log('Sync completed successfully');
      process.exit(0);
    })
    .catch((error) => {
      console.error('Sync failed:', error);
      process.exit(1);
    });
}

export default runSyncAttributeRegistry;
