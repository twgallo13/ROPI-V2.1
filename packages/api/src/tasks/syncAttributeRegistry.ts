/**
 * Sync Attribute Registry Task
 * 
 * Idempotent migration/sync that populates settings/attributes/keys/{attributeId}
 * from the canonical attribute registry JSON (or from Notion if configured).
 * 
 * LP-2.0.2: Added normalizeDataType() and definition_version/canonical fields
 * 
 * Lisa v1.0.0
 * 
 * References:
 * - Attribute Registry (Notion): https://www.notion.so/2b845ee1ec5a81228b07ca97964cd033
 * - Attribute Validation Schema: https://www.notion.so/2b845ee1ec5a805fba0ef665dfb17396
 * 
 * Usage:
 *   CLI: pnpm api:sync:attributes
 *   CLI (dry-run): pnpm api:sync:attributes --dry-run
 *   Cloud Function: Call syncAttributeRegistry endpoint (admin-only)
 */

import * as admin from 'firebase-admin';
import * as fs from 'fs';
import * as path from 'path';

// Type definitions
interface AttributeDefinition {
  attribute_id: string;
  label: string;
  external_header?: string;
  category?: string;
  data_type: string; // Original type from JSON (text, longText, select, etc.)
  allowed_values?: string[];
  synonyms?: string[];
  required_for_completion?: boolean;
  required_for_export?: boolean;
  import_required?: boolean;
  ai_usage_notes?: string;
  status?: 'active' | 'deprecated' | 'hidden';
  source?: 'notion' | 'derived' | 'json';
}

// LP-2.0.2: Canonical data_type tokens
type CanonicalDataType = 'string' | 'number' | 'boolean' | 'enum' | 'multiSelect' | 'date' | 'currency' | 'json';

interface SyncResult {
  created: number;
  updated: number;
  skipped: number;
  errors: string[];
  attributes: string[];
  dryRunOutput?: DryRunEntry[];
}

// LP-2.0.2: Dry-run output entry
interface DryRunEntry {
  attributeId: string;
  currentDataType: string | null;
  normalizedDataType: CanonicalDataType;
  newFields: {
    definition_version: string;
    canonical: boolean;
  };
  action: 'CREATE' | 'UPDATE';
}

// Path to the attribute registry JSON file
// Use process.cwd() to handle both source and dist execution
const REGISTRY_JSON_PATH = process.env.REGISTRY_JSON_PATH || 
  path.resolve(process.cwd(), 'packages/sdk/config/attributeRegistry.json');

// Firestore collection path
const ATTRIBUTES_COLLECTION = 'settings/attributes/keys';

/**
 * LP-2.0.2: Normalize data_type tokens to canonical form
 * 
 * Mapping:
 * - 'text' => 'string'
 * - 'longText' => 'string'
 * - 'number' => 'number'
 * - 'boolean' => 'boolean'
 * - 'select' => 'enum'
 * - 'multiSelect' => 'multiSelect'
 * - 'date' => 'date'
 * - 'money' => 'currency'
 * - 'currency' => 'currency'
 * - 'json' => 'json'
 * 
 * Default: 'string' for unknown types
 */
function normalizeDataType(dt: string | undefined): CanonicalDataType {
  if (!dt) return 'string';
  
  const normalized = dt.toLowerCase().trim();
  
  switch (normalized) {
    case 'text':
    case 'longtext':
    case 'string':
      return 'string';
    case 'number':
    case 'integer':
    case 'float':
    case 'decimal':
      return 'number';
    case 'boolean':
    case 'bool':
      return 'boolean';
    case 'select':
    case 'enum':
    case 'dropdown':
      return 'enum';
    case 'multiselect':
    case 'multi_select':
    case 'multi-select':
    case 'tags':
      return 'multiSelect';
    case 'date':
    case 'datetime':
    case 'timestamp':
      return 'date';
    case 'money':
    case 'currency':
    case 'price':
      return 'currency';
    case 'json':
    case 'object':
    case 'array':
      return 'json';
    default:
      console.warn(`⚠️ Unknown data_type "${dt}", defaulting to "string"`);
      return 'string';
  }
}

/**
 * Get the registry version from the JSON file
 */
function getRegistryVersion(): string {
  try {
    if (!fs.existsSync(REGISTRY_JSON_PATH)) {
      return '0.0.0';
    }
    const raw = fs.readFileSync(REGISTRY_JSON_PATH, 'utf-8');
    const parsed = JSON.parse(raw);
    return parsed.version || '0.0.0';
  } catch {
    return '0.0.0';
  }
}

/**
 * Load attribute registry from the JSON file
 */
async function loadRegistryFromFile(): Promise<AttributeDefinition[] | null> {
  try {
    if (!fs.existsSync(REGISTRY_JSON_PATH)) {
      console.warn(`⚠️ Registry file not found at ${REGISTRY_JSON_PATH}`);
      return null;
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
    return attributes.map(attr => ({ ...attr, source: 'json' as const }));
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
 */
async function deriveAttributesFromProducts(): Promise<AttributeDefinition[]> {
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
 * 
 * LP-2.0.2: Added data_type normalization, definition_version, and canonical fields
 * 
 * @param options.dryRun - If true, print intended changes without writing to Firestore
 */
export async function runSyncAttributeRegistry(options?: { dryRun?: boolean }): Promise<SyncResult> {
  const isDryRun = options?.dryRun ?? false;
  const registryVersion = getRegistryVersion();
  
  const result: SyncResult = {
    created: 0,
    updated: 0,
    skipped: 0,
    errors: [],
    attributes: [],
    dryRunOutput: isDryRun ? [] : undefined,
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

  if (isDryRun) {
    console.log(`\n🔍 DRY RUN: Would sync ${registry.length} attributes to Firestore`);
    console.log(`   Registry version: ${registryVersion}\n`);
    console.log('─'.repeat(100));
    console.log(`${'Attribute ID'.padEnd(30)} | ${'Current Type'.padEnd(15)} | ${'Normalized'.padEnd(15)} | ${'Action'.padEnd(10)} | New Fields`);
    console.log('─'.repeat(100));
  } else {
    console.log(`\n📋 Syncing ${registry.length} attributes to Firestore...`);
    console.log(`   Registry version: ${registryVersion}\n`);
  }

  // Process each attribute
  for (const attr of registry) {
    // Ensure we write to settings/attributes/keys/{attribute_id}
    const docRef = db.doc(`settings/attributes/keys/${attr.attribute_id}`);
    
    try {
      const existingDoc = await docRef.get();
      const existingData = existingDoc.exists ? existingDoc.data() : null;
      const now = new Date().toISOString();
      
      // LP-2.0.2: Normalize data_type
      const originalDataType = attr.data_type || (attr as any).dataType || (attr as any).dataTypeInJson;
      const normalizedDataType = normalizeDataType(originalDataType);
      const isJsonSource = attr.source === 'json';
      
      // Build the document to write (preserving allowed_values exactly)
      const docToWrite = {
        ...attr,
        data_type: normalizedDataType, // LP-2.0.2: Normalized type
        definition_version: registryVersion, // LP-2.0.2: Version tracking
        canonical: isJsonSource, // LP-2.0.2: Mark JSON-sourced as canonical
        updatedBy: 'system',
        updatedAt: now,
      };

      // If creating new doc, add createdBy/createdAt
      if (!existingDoc.exists) {
        (docToWrite as any).createdBy = 'system';
        (docToWrite as any).createdAt = now;
      }
      
      const action: 'CREATE' | 'UPDATE' = existingDoc.exists ? 'UPDATE' : 'CREATE';
      const currentDataType = existingData?.data_type || null;
      
      if (isDryRun) {
        // Dry run: log the proposed change
        const dryRunEntry: DryRunEntry = {
          attributeId: attr.attribute_id,
          currentDataType,
          normalizedDataType,
          newFields: {
            definition_version: registryVersion,
            canonical: isJsonSource,
          },
          action,
        };
        result.dryRunOutput!.push(dryRunEntry);
        
        const typeChange = currentDataType !== normalizedDataType 
          ? `${currentDataType || 'N/A'} → ${normalizedDataType}` 
          : normalizedDataType;
        console.log(
          `${attr.attribute_id.padEnd(30)} | ${(currentDataType || 'N/A').padEnd(15)} | ${normalizedDataType.padEnd(15)} | ${action.padEnd(10)} | v=${registryVersion}, canonical=${isJsonSource}`
        );
        
        if (action === 'CREATE') result.created++;
        else result.updated++;
      } else {
        // Actual sync: write to Firestore with merge to preserve local customizations
        // IMPORTANT: merge: true preserves allowed_values and other local changes
        await docRef.set(docToWrite, { merge: true });
        
        if (action === 'CREATE') {
          result.created++;
          console.log(`  ✓ Created: ${attr.attribute_id} (${normalizedDataType})`);
        } else {
          result.updated++;
          console.log(`  ↻ Updated: ${attr.attribute_id} (${originalDataType} → ${normalizedDataType})`);
        }
      }
      
      result.attributes.push(attr.attribute_id);
    } catch (error: unknown) {
      const errorMsg = error instanceof Error ? error.message : String(error);
      const msg = `Failed to sync ${attr.attribute_id}: ${errorMsg}`;
      console.error(`  ✗ ${msg}`);
      result.errors.push(msg);
    }
  }

  console.log('\n─────────────────────────────────────');
  if (isDryRun) {
    console.log(`📊 DRY RUN Summary:`);
    console.log(`   Would create: ${result.created}`);
    console.log(`   Would update: ${result.updated}`);
    console.log(`   Errors:       ${result.errors.length}`);
    console.log(`\n   ⚠️  No changes were made to Firestore`);
  } else {
    console.log(`📊 Sync Complete:`);
    console.log(`   Created: ${result.created}`);
    console.log(`   Updated: ${result.updated}`);
    console.log(`   Errors:  ${result.errors.length}`);
  }
  console.log('─────────────────────────────────────\n');

  return result;
}

/**
 * CLI entry point
 * 
 * Usage:
 *   pnpm api:sync:attributes              # Actual sync
 *   pnpm api:sync:attributes --dry-run    # Preview changes without writing
 */
if (require.main === module) {
  const args = process.argv.slice(2);
  const dryRun = args.includes('--dry-run');
  
  if (dryRun) {
    console.log('🔍 Running in DRY RUN mode - no changes will be made\n');
  }
  
  runSyncAttributeRegistry({ dryRun })
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
