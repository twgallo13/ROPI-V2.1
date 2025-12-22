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

// Type definitions
interface AttributeDefinition {
  attribute_id: string;
  label: string;
  external_header?: string;
  category?: string;
  data_type: 'string' | 'number' | 'boolean' | 'enum' | 'currency' | 'json' | 'multiSelect' | 'date';
  allowed_values?: string[];
  synonyms?: string[];
  required_for_completion?: boolean;
  required_for_export?: boolean;
  import_required?: boolean;
  ai_usage_notes?: string;
  status?: 'active' | 'deprecated' | 'hidden';
  source?: 'notion' | 'derived' | 'json';
}

interface SyncResult {
  created: number;
  updated: number;
  skipped: number;
  errors: string[];
  attributes: string[];
}

// LP-1.1.0: Path resolution with fallback (packaged → dev)
const PACKAGED_REGISTRY_PATH = path.resolve(__dirname, '../config/attributeRegistry.json');
const DEV_REGISTRY_PATH = path.resolve(__dirname, '../../../sdk/config/attributeRegistry.json');
const REGISTRY_JSON_PATH = fs.existsSync(PACKAGED_REGISTRY_PATH)
  ? PACKAGED_REGISTRY_PATH
  : DEV_REGISTRY_PATH;

// Firestore collection path
const ATTRIBUTES_COLLECTION = 'settings/attributes/keys';

/**
 * Load attribute registry from the JSON file
 */
async function loadRegistryFromFile(): Promise<AttributeDefinition[] | null> {
  try {
    // LP-1.1.0: Diagnostic logging
    console.log(
      `[loadRegistryFromFile] Checking paths:\n  PACKAGED: ${PACKAGED_REGISTRY_PATH} exists=${fs.existsSync(PACKAGED_REGISTRY_PATH)}\n  DEV: ${DEV_REGISTRY_PATH} exists=${fs.existsSync(DEV_REGISTRY_PATH)}\n  SELECTED: ${REGISTRY_JSON_PATH}`
    );

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
 */
// LP-1.1.0: Add dryRun parameter (default false for CLI, apiApp.ts defaults true)
export async function runSyncAttributeRegistry(dryRun = false): Promise<SyncResult> {
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

  // Process each attribute
  for (const attr of registry) {
    // Ensure we write to settings/attributes/keys/{attribute_id}
    const docRef = db.doc(`settings/attributes/keys/${attr.attribute_id}`);
    
    try {
      const existingDoc = await docRef.get();
      const now = new Date().toISOString();
      
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
      
      if (existingDoc.exists) {
        // Update existing attribute (merge to preserve any local customizations)
        await docRef.set({
          ...attr,
          updatedBy: 'system',
          updatedAt: now,
        }, { merge: true });
        
        result.updated++;
        console.log(`  ↻ Updated: ${attr.attribute_id}`);
      } else {
        // Create new attribute
        await docRef.set({
          ...attr,
          createdBy: 'system',
          createdAt: now,
          updatedBy: 'system',
          updatedAt: now,
        });
        
        result.created++;
        console.log(`  ✓ Created: ${attr.attribute_id}`);
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
  console.log(`📊 Sync Complete:`);
  console.log(`   Created: ${result.created}`);
  console.log(`   Updated: ${result.updated}`);
  console.log(`   Errors:  ${result.errors.length}`);
  console.log('─────────────────────────────────────\n');

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
