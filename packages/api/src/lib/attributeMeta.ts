/**
 * Attribute Meta Helper
 * LP-2.1.7 — Per-key attribute provenance tracking
 * 
 * Generates _meta entries for attribute writes that track:
 * - actor: Who made the change (system:migrator, admin:email, import:batch_id)
 * - source: Origin of the change (migration, normalizer, import, admin, smart-rules)
 * - ts: ISO8601 timestamp
 * - method: The function/task that made the change
 * - definition_version: Registry version at time of write
 * - canonical: Whether this is a canonical value from registry
 * - note: Optional human note
 * 
 * Lisa LP-2.1.7
 */

/**
 * Actor types for attribute changes
 */
export type ActorType = 
  | `system:${string}`  // system:migrator, system:normalizer
  | `admin:${string}`   // admin:theo@example.com
  | `import:${string}`  // import:batch_123
  | `api:${string}`;    // api:product-editor

/**
 * Source types for attribute changes
 */
export type SourceType = 
  | 'migration'
  | 'normalizer'
  | 'import'
  | 'admin'
  | 'smart-rules'
  | 'api';

/**
 * Attribute meta entry structure
 */
export interface AttributeMetaEntry {
  actor: ActorType;
  source: SourceType;
  ts: string;
  method: string;
  definition_version: string;
  canonical: boolean;
  note?: string;
}

/**
 * Options for creating an attribute meta entry
 */
export interface CreateMetaOptions {
  actor: ActorType;
  source: SourceType;
  method: string;
  definitionVersion: string;
  canonical?: boolean;
  note?: string;
  timestamp?: string;
}

/**
 * Create a single attribute meta entry
 */
export function createAttributeMeta(options: CreateMetaOptions): AttributeMetaEntry {
  return {
    actor: options.actor,
    source: options.source,
    ts: options.timestamp ?? new Date().toISOString(),
    method: options.method,
    definition_version: options.definitionVersion,
    canonical: options.canonical ?? false,
    ...(options.note && { note: options.note }),
  };
}

/**
 * Build a Firestore update payload for per-key attribute updates with _meta
 * 
 * This replaces the old pattern of:
 *   docRef.update({ attributes: newAttributes })
 * 
 * With per-key updates that preserve existing fields:
 *   docRef.update({
 *     'attributes.key1': value1,
 *     'attributes._meta.key1': { actor, source, ts, method, definition_version, canonical }
 *   })
 */
export interface BuildUpdatePayloadOptions {
  /** Attribute key-value pairs to update */
  attributes: Record<string, unknown>;
  /** Actor making the change */
  actor: ActorType;
  /** Source of the change */
  source: SourceType;
  /** Method/function name making the change */
  method: string;
  /** Registry definition version */
  definitionVersion: string;
  /** Optional: mark all attributes as canonical */
  canonical?: boolean;
  /** Optional: shared note for all updates */
  note?: string;
  /** Optional: per-attribute canonical overrides (key -> isCanonical) */
  canonicalOverrides?: Record<string, boolean>;
  /** Optional: custom timestamp (defaults to now) */
  timestamp?: string;
}

/**
 * Build a Firestore update payload with per-key attribute updates and _meta entries
 * 
 * @returns Record<string, unknown> ready for docRef.update()
 */
export function buildPerKeyUpdatePayload(options: BuildUpdatePayloadOptions): Record<string, unknown> {
  const {
    attributes,
    actor,
    source,
    method,
    definitionVersion,
    canonical = false,
    note,
    canonicalOverrides,
    timestamp = new Date().toISOString(),
  } = options;

  const updatePayload: Record<string, unknown> = {};

  for (const [key, value] of Object.entries(attributes)) {
    // Skip internal/meta fields from direct attribute updates
    if (key.startsWith('_')) {
      continue;
    }

    // Set the attribute value
    updatePayload[`attributes.${key}`] = value;

    // Set the meta entry for this attribute
    const isCanonical = canonicalOverrides?.[key] ?? canonical;
    updatePayload[`attributes._meta.${key}`] = createAttributeMeta({
      actor,
      source,
      method,
      definitionVersion,
      canonical: isCanonical,
      note,
      timestamp,
    });
  }

  return updatePayload;
}

/**
 * Check if an attribute has admin-canonical protection
 * Protected attributes should not be overwritten by migrations unless --force-admin
 */
export function isAdminCanonical(meta: AttributeMetaEntry | undefined): boolean {
  if (!meta) return false;
  return meta.canonical === true && meta.actor.startsWith('admin:');
}

/**
 * Check if any attributes in _meta have admin-canonical protection
 * @param meta The _meta object from attributes._meta
 * @param keys The attribute keys to check
 * @returns Array of protected attribute keys
 */
export function getProtectedAttributes(
  meta: Record<string, AttributeMetaEntry> | undefined,
  keys: string[]
): string[] {
  if (!meta) return [];
  
  return keys.filter(key => {
    const entry = meta[key];
    return entry && isAdminCanonical(entry);
  });
}

/**
 * Diff result for a single attribute
 */
export interface AttributeDiff {
  attrId: string;
  old_value: unknown;
  new_value: unknown;
  old_meta: AttributeMetaEntry | undefined;
  new_meta_predicted: AttributeMetaEntry;
  protected: boolean;
  reason: string;
}

/**
 * Generate diff for planned attribute changes
 */
export function generateAttributeDiff(
  attrId: string,
  oldValue: unknown,
  newValue: unknown,
  oldMeta: AttributeMetaEntry | undefined,
  newMetaOptions: CreateMetaOptions,
  forceAdmin: boolean = false
): AttributeDiff {
  const isProtected = isAdminCanonical(oldMeta);
  const willChange = !forceAdmin && isProtected ? false : true;
  
  return {
    attrId,
    old_value: oldValue,
    new_value: willChange ? newValue : oldValue,
    old_meta: oldMeta,
    new_meta_predicted: createAttributeMeta(newMetaOptions),
    protected: isProtected,
    reason: isProtected
      ? (forceAdmin ? 'force-admin: overwriting admin-canonical value' : 'admin-canonical: protected, will not overwrite')
      : 'normal: value will be updated',
  };
}

/**
 * Load registry version from JSON file
 */
export async function loadRegistryVersion(registryPath: string): Promise<string> {
  const fs = await import('fs');
  const registry = JSON.parse(fs.readFileSync(registryPath, 'utf8'));
  return registry.version ?? '0.0.0';
}

export default {
  createAttributeMeta,
  buildPerKeyUpdatePayload,
  isAdminCanonical,
  getProtectedAttributes,
  generateAttributeDiff,
  loadRegistryVersion,
};
