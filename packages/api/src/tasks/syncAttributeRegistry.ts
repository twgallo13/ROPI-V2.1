/**
 * Sync Attribute Registry Task
 * 
 * Idempotent migration/sync that populates settings/attributes/keys/{attributeId}
 * from the canonical attribute registry JSON.
 * 
 * LP-2.1.6: Canonical IDs (snake_case), normalized data_type, versioning, canonical flag
 * 
 * Lisa v1.0.0 → v1.0.3
 * 
 * References:
 * - Attribute Registry (Notion): https://www.notion.so/2b845ee1ec5a81228b07ca97964cd033
 * - Attribute Validation Schema: https://www.notion.so/2b845ee1ec5a805fba0ef665dfb17396
 * 
 * Usage:
 *   CLI: pnpm api:sync:attributes [--dry | --apply]
 *   Cloud Function: Call syncAttributeRegistry endpoint (admin-only)
 * 
 * Modes:
 *   --dry    (default) Dry-run mode - logs planned changes without writing to Firestore
 *   --apply  Apply mode - writes changes to Firestore
 */

import * as admin from 'firebase-admin';
import * as fs from 'fs';
import * as path from 'path';

// ──────────────────────────────────────────────────────────────────
// String Utilities (LP-2.1.6)
// ──────────────────────────────────────────────────────────────────

/**
 * Converts a string to snake_case format.
 * 
 * Transformation rules:
 * 1. Replace dots with underscores (e.g., "legacy.sku" → "legacy_sku")
 * 2. Insert underscore before uppercase letters following lowercase/digit
 * 3. Replace spaces and hyphens with underscores
 * 4. Remove non-alphanumeric characters (except underscore)
 * 5. Collapse multiple underscores to single
 * 6. Trim leading/trailing underscores
 * 7. Convert to lowercase
 */
function toSnakeCase(input: string): string {
  if (!input) return '';
  
  let s = input.replace(/\./g, '_');
  s = s.replace(/([a-z0-9])([A-Z])/g, '$1_$2');
  s = s.replace(/[\s\-]+/g, '_');
  s = s.replace(/[^A-Za-z0-9_]/g, '');
  s = s.replace(/__+/g, '_').replace(/^_+|_+$/g, '');
  
  return s.toLowerCase();
}

/**
 * Data type lexicon for normalizing attribute data types.
 */
const DATA_TYPE_MAP: Record<string, string> = {
  // String variants
  'text': 'string',
  'longtext': 'string',
  'string': 'string',
  'varchar': 'string',
  'char': 'string',
  
  // Enum/select variants
  'select': 'enum',
  'dropdown': 'enum',
  'enum': 'enum',
  'choice': 'enum',
  
  // Boolean variants
  'boolean': 'boolean',
  'bool': 'boolean',
  'yesno': 'boolean',
  'checkbox': 'boolean',
  
  // Number variants
  'number': 'number',
  'int': 'number',
  'integer': 'number',
  'float': 'number',
  'decimal': 'number',
  'numeric': 'number',
  'price': 'number',
  'currency': 'number',
  'money': 'number',
  
  // Array variants
  'array': 'array',
  'list': 'array',
  'multiselect': 'array',
  'multi-select': 'array',
  'multiSelect': 'array',
  
  // Date variants
  'date': 'date',
  'datetime': 'date',
  'timestamp': 'date',
  
  // Object/JSON variants
  'object': 'object',
  'json': 'object',
  'map': 'object'
};

/**
 * Normalizes a data type string to a canonical form.
 */
function normalizeDataType(dataType: string): string {
  if (!dataType) return 'string';
  const normalized = DATA_TYPE_MAP[dataType.toLowerCase().trim()];
  return normalized || 'string';
}

// ──────────────────────────────────────────────────────────────────
// Type Definitions
// ──────────────────────────────────────────────────────────────────

interface AttributeDefinition {
  attribute_id: string;
  label: string;
  external_header?: string;
  category?: string;
  data_type: string;
  allowed_values?: string[];
  synonyms?: string[];
  required_for_completion?: boolean;
  required_for_export?: boolean;
  import_required?: boolean;
  ai_usage_notes?: string;
  status?: 'active' | 'deprecated' | 'hidden';
  source?: 'notion' | 'derived' | 'json' | 'repo';
}

interface CanonicalAttribute extends AttributeDefinition {
  canonical: boolean;
  definition_version: string;
  aliases: string[];
  original_id: string;
}

interface CollisionInfo {
  canonical: string;
  originals: string[];
}

interface SyncResult {
  mode: 'dry-run' | 'apply';
  created: number;
  updated: number;
  skipped: number;
  errors: string[];
  collisions: CollisionInfo[];
  attributes: string[];
  version: string;
}

interface RegistryFile {
  version: string;
  attributes: AttributeDefinition[];
}

// Path to the attribute registry JSON file
const REGISTRY_JSON_PATH = path.resolve(__dirname, '../../../sdk/config/attributeRegistry.json');

// Firestore collection path
const ATTRIBUTES_COLLECTION = 'settings/attributes/keys';

// ──────────────────────────────────────────────────────────────────
// Registry Loading
// ──────────────────────────────────────────────────────────────────

/**
 * Load attribute registry from the JSON file
 */
async function loadRegistryFromFile(): Promise<{ attributes: AttributeDefinition[]; version: string } | null> {
  try {
    if (!fs.existsSync(REGISTRY_JSON_PATH)) {
      console.error(`❌ Registry file not found at ${REGISTRY_JSON_PATH}`);
      return null;
    }

    const raw = fs.readFileSync(REGISTRY_JSON_PATH, 'utf-8');
    const parsed = JSON.parse(raw) as RegistryFile | AttributeDefinition[];

    // Handle both array and {version, attributes} shapes
    let attributes: AttributeDefinition[];
    let version: string;

    if (Array.isArray(parsed)) {
      attributes = parsed;
      version = '0.0.0'; // Legacy format without version
    } else if (parsed.attributes && Array.isArray(parsed.attributes)) {
      attributes = parsed.attributes;
      version = parsed.version || '0.0.0';
    } else {
      console.error(`❌ Invalid registry file format at ${REGISTRY_JSON_PATH}`);
      return null;
    }

    if (attributes.length === 0) {
      console.error(`❌ Registry file has no attributes at ${REGISTRY_JSON_PATH}`);
      return null;
    }

    console.log(`✅ Loaded ${attributes.length} attributes from registry (v${version})`);
    return { attributes, version };
  } catch (error) {
    console.error('❌ Error loading registry from file:', error);
    return null;
  }
}

// ──────────────────────────────────────────────────────────────────
// Collision Detection
// ──────────────────────────────────────────────────────────────────

/**
 * Detects collisions in attribute IDs after snake_case conversion.
 */
function detectCollisions(attributes: AttributeDefinition[]): CollisionInfo[] {
  const canonicalMap = new Map<string, string[]>();
  
  for (const attr of attributes) {
    const canonical = toSnakeCase(attr.attribute_id);
    const existing = canonicalMap.get(canonical) || [];
    existing.push(attr.attribute_id);
    canonicalMap.set(canonical, existing);
  }
  
  const collisions: CollisionInfo[] = [];
  
  for (const [canonical, originals] of canonicalMap) {
    if (originals.length > 1) {
      collisions.push({ canonical, originals });
    }
  }
  
  return collisions;
}

// ──────────────────────────────────────────────────────────────────
// Main Sync Function
// ──────────────────────────────────────────────────────────────────

/**
 * Main sync function - loads registry and upserts to Firestore
 * 
 * LP-2.1.6 Changes:
 * - Canonical IDs (snake_case)
 * - Normalized data_type
 * - definition_version field
 * - canonical: true flag
 * - source: 'repo'
 * - aliases array with original ID if different
 * - Collision detection (abort if collisions found)
 * - No product-derived fallback (abort if registry not found)
 * - Dry-run mode by default
 */
export async function runSyncAttributeRegistry(options: { dryRun?: boolean } = {}): Promise<SyncResult> {
  const dryRun = options.dryRun !== false; // Default to dry-run
  
  const result: SyncResult = {
    mode: dryRun ? 'dry-run' : 'apply',
    created: 0,
    updated: 0,
    skipped: 0,
    errors: [],
    collisions: [],
    attributes: [],
    version: '0.0.0',
  };

  console.log(`\n${'═'.repeat(60)}`);
  console.log(`  SYNC ATTRIBUTE REGISTRY (LP-2.1.6)`);
  console.log(`  Mode: ${dryRun ? '🔍 DRY-RUN (no changes will be made)' : '⚡ APPLY (writing to Firestore)'}`);
  console.log(`${'═'.repeat(60)}\n`);

  // Initialize Firebase Admin if not already initialized
  if (!admin.apps.length) {
    admin.initializeApp();
  }

  const db = admin.firestore();

  // ──────────────────────────────────────────────────────────────────
  // Step 1: Load registry from JSON file (REQUIRED - no fallback)
  // ──────────────────────────────────────────────────────────────────
  
  const registryData = await loadRegistryFromFile();
  
  if (!registryData) {
    const msg = 'ABORT: Registry file not found or invalid. No product-derived fallback allowed (LP-2.1.6).';
    console.error(`\n❌ ${msg}\n`);
    result.errors.push(msg);
    return result;
  }

  const { attributes: registry, version } = registryData;
  result.version = version;

  // ──────────────────────────────────────────────────────────────────
  // Step 2: Check for collisions after snake_case conversion
  // ──────────────────────────────────────────────────────────────────
  
  console.log(`\n🔍 Checking for ID collisions after snake_case conversion...`);
  
  const collisions = detectCollisions(registry);
  
  if (collisions.length > 0) {
    console.error(`\n❌ COLLISION DETECTED! ${collisions.length} collision(s) found:\n`);
    
    for (const collision of collisions) {
      console.error(`   Canonical: "${collision.canonical}"`);
      console.error(`   Originals: ${collision.originals.map(o => `"${o}"`).join(', ')}`);
      console.error('');
    }
    
    result.collisions = collisions;
    result.errors.push(`ABORT: ${collisions.length} collision(s) detected. Resolve conflicts before syncing.`);
    
    // Write collision report
    const reportPath = path.resolve(__dirname, '../../../../reports/collision-report.json');
    try {
      const reportDir = path.dirname(reportPath);
      if (!fs.existsSync(reportDir)) {
        fs.mkdirSync(reportDir, { recursive: true });
      }
      fs.writeFileSync(reportPath, JSON.stringify({
        timestamp: new Date().toISOString(),
        version,
        collisions,
      }, null, 2));
      console.log(`📄 Collision report written to: ${reportPath}`);
    } catch (e) {
      console.warn(`⚠️ Could not write collision report: ${e}`);
    }
    
    return result;
  }
  
  console.log(`✅ No collisions detected\n`);

  // ──────────────────────────────────────────────────────────────────
  // Step 3: Canonicalize and sync attributes
  // ──────────────────────────────────────────────────────────────────
  
  console.log(`📋 Processing ${registry.length} attributes...\n`);

  for (const attr of registry) {
    const originalId = attr.attribute_id;
    const canonicalId = toSnakeCase(originalId);
    const canonicalDataType = normalizeDataType(attr.data_type);
    
    // Build aliases array
    const aliases: string[] = [];
    if (originalId !== canonicalId) {
      aliases.push(originalId);
    }
    if (attr.synonyms) {
      aliases.push(...attr.synonyms.filter(s => s !== canonicalId && s !== originalId));
    }
    
    // Build canonical attribute document
    const canonicalAttr: CanonicalAttribute = {
      ...attr,
      attribute_id: canonicalId,
      data_type: canonicalDataType,
      canonical: true,
      definition_version: version,
      source: 'repo',
      aliases: aliases.length > 0 ? aliases : [],
      original_id: originalId,
    };

    const docRef = db.doc(`${ATTRIBUTES_COLLECTION}/${canonicalId}`);
    
    try {
      const existingDoc = await docRef.get();
      const now = new Date().toISOString();
      
      const changeType = existingDoc.exists ? 'UPDATE' : 'CREATE';
      const symbol = existingDoc.exists ? '↻' : '✓';
      
      // Log what would happen
      if (originalId !== canonicalId || attr.data_type !== canonicalDataType) {
        console.log(`  ${symbol} ${changeType}: ${canonicalId}`);
        if (originalId !== canonicalId) {
          console.log(`      original_id: "${originalId}" → canonical: "${canonicalId}"`);
        }
        if (attr.data_type !== canonicalDataType) {
          console.log(`      data_type: "${attr.data_type}" → normalized: "${canonicalDataType}"`);
        }
      } else {
        console.log(`  ${symbol} ${changeType}: ${canonicalId}`);
      }
      
      if (!dryRun) {
        if (existingDoc.exists) {
          await docRef.set({
            ...canonicalAttr,
            updatedBy: 'system',
            updatedAt: now,
          }, { merge: true });
          result.updated++;
        } else {
          await docRef.set({
            ...canonicalAttr,
            createdBy: 'system',
            createdAt: now,
            updatedBy: 'system',
            updatedAt: now,
          });
          result.created++;
        }
      } else {
        // In dry-run, count as if we would create/update
        if (existingDoc.exists) {
          result.updated++;
        } else {
          result.created++;
        }
      }
      
      result.attributes.push(canonicalId);
    } catch (error: unknown) {
      const errorMsg = error instanceof Error ? error.message : String(error);
      const msg = `Failed to sync ${canonicalId}: ${errorMsg}`;
      console.error(`  ✗ ${msg}`);
      result.errors.push(msg);
    }
  }

  // ──────────────────────────────────────────────────────────────────
  // Summary
  // ──────────────────────────────────────────────────────────────────
  
  console.log(`\n${'─'.repeat(60)}`);
  console.log(`📊 Sync ${dryRun ? '(DRY-RUN)' : ''} Complete:`);
  console.log(`   Registry Version: ${version}`);
  console.log(`   Would Create:     ${result.created}`);
  console.log(`   Would Update:     ${result.updated}`);
  console.log(`   Skipped:          ${result.skipped}`);
  console.log(`   Errors:           ${result.errors.length}`);
  console.log(`${'─'.repeat(60)}`);
  
  if (dryRun) {
    console.log(`\n💡 This was a DRY-RUN. To apply changes, run with --apply flag.\n`);
  } else {
    console.log(`\n✅ Changes have been applied to Firestore.\n`);
  }

  return result;
}

/**
 * CLI entry point
 */
if (require.main === module) {
  // Parse CLI arguments
  const args = process.argv.slice(2);
  const isApply = args.includes('--apply');
  const isDry = args.includes('--dry') || !isApply;
  
  if (args.includes('--help') || args.includes('-h')) {
    console.log(`
Usage: pnpm api:sync:attributes [options]

Options:
  --dry     Dry-run mode (default) - logs planned changes without writing
  --apply   Apply mode - writes changes to Firestore
  --help    Show this help message

Examples:
  pnpm api:sync:attributes          # Dry-run (default)
  pnpm api:sync:attributes --dry    # Explicit dry-run
  pnpm api:sync:attributes --apply  # Apply changes to Firestore
`);
    process.exit(0);
  }
  
  runSyncAttributeRegistry({ dryRun: isDry })
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
