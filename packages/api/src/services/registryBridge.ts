/**
 * Registry Bridge Service
 * LP-smart-rules-registry-bridge-1.0.0
 * 
 * Provides registry functions that can use EITHER:
 * 1. Firestore registry (runtime - preferred)
 * 2. SDK static registry (fallback/build-time)
 * 
 * This bridges the gap between smartEngine.ts (uses Firestore via loadRegistryMap)
 * and smartEngineV2.ts (was using SDK static imports).
 * 
 * Per Lisa's analysis: We must use a single authoritative registry source at runtime
 * to prevent divergence between engine evaluation and API/UI validation.
 */

import * as admin from 'firebase-admin';
import { 
  type RegistryAttribute,
  isExportable as sdkIsExportable, 
  isInternalOnly as sdkIsInternalOnly,
  getAttributeById as sdkGetAttributeById,
  getAllowedValues as sdkGetAllowedValues,
} from '@ropi-aoss/sdk';

// ============================================================================
// Types
// ============================================================================

/**
 * Firestore attribute definition (from settings/attributes/keys)
 */
export interface FirestoreAttributeDefinition {
  id: string;
  attribute_id: string;
  label: string;
  data_type: string;
  allowed_values?: string[];
  synonyms?: Record<string, string>;
  import?: boolean;
  import_required?: boolean;
  import_strict?: boolean;
  canonical?: boolean;
  definition_version?: string;
  internalOnly?: boolean;
  exportable?: boolean;
  export?: boolean; // Some docs use 'export' instead of 'exportable'
}

/**
 * Registry snapshot for batch processing
 * Loaded once per batch/request to avoid repeated Firestore reads
 */
export interface RegistrySnapshot {
  attributes: Map<string, FirestoreAttributeDefinition>;
  loadedAt: Date;
  source: 'firestore' | 'sdk-fallback';
}

// ============================================================================
// Module-level cache
// ============================================================================

let cachedSnapshot: RegistrySnapshot | null = null;

// ============================================================================
// Loader Functions
// ============================================================================

/**
 * Load registry snapshot from Firestore
 * This is the authoritative runtime source
 */
export async function loadRegistrySnapshot(): Promise<RegistrySnapshot> {
  if (cachedSnapshot) {
    return cachedSnapshot;
  }

  const db = admin.firestore();
  const snap = await db.collection('settings').doc('attributes').collection('keys').get();
  
  const attributes = new Map<string, FirestoreAttributeDefinition>();
  
  snap.forEach(doc => {
    const data = doc.data();
    const def: FirestoreAttributeDefinition = {
      id: doc.id,
      attribute_id: data.attribute_id || doc.id,
      label: data.label || doc.id,
      data_type: data.data_type || 'string',
      allowed_values: data.allowed_values,
      synonyms: data.synonyms,
      import: data.import !== false,
      import_required: data.import_required || false,
      import_strict: data.import_strict || false,
      canonical: data.canonical,
      definition_version: data.definition_version,
      internalOnly: data.internalOnly || data.internal_only || false,
      exportable: data.exportable ?? data.export ?? true, // Default to exportable
    };
    
    // Index by multiple keys for flexible lookup
    attributes.set(doc.id, def);
    if (data.attribute_id && data.attribute_id !== doc.id) {
      attributes.set(data.attribute_id, def);
    }
    // Also index by short name (e.g., 'department' for 'attributes.department')
    const shortName = doc.id.split('.').pop();
    if (shortName && shortName !== doc.id) {
      attributes.set(shortName, def);
    }
  });
  
  cachedSnapshot = {
    attributes,
    loadedAt: new Date(),
    source: 'firestore',
  };
  
  return cachedSnapshot;
}

/**
 * Clear the registry cache (call after batch processing or on config change)
 */
export function clearRegistrySnapshotCache(): void {
  cachedSnapshot = null;
}

// ============================================================================
// Registry Query Functions (Firestore-first)
// ============================================================================

/**
 * Get attribute definition by ID
 * Uses Firestore snapshot if loaded, falls back to SDK
 */
export function getAttributeByIdFromSnapshot(
  attrId: string, 
  snapshot?: RegistrySnapshot
): FirestoreAttributeDefinition | RegistryAttribute | undefined {
  // Try Firestore snapshot first
  if (snapshot?.attributes) {
    const def = snapshot.attributes.get(attrId);
    if (def) return def;
  }
  
  // Try cached snapshot
  if (cachedSnapshot?.attributes) {
    const def = cachedSnapshot.attributes.get(attrId);
    if (def) return def;
  }
  
  // Fall back to SDK static registry
  return sdkGetAttributeById(attrId);
}

/**
 * Check if attribute is internal only
 * Uses Firestore snapshot if loaded, falls back to SDK
 */
export function isInternalOnlyFromSnapshot(
  attrId: string,
  snapshot?: RegistrySnapshot
): boolean {
  // Try Firestore snapshot first
  if (snapshot?.attributes) {
    const def = snapshot.attributes.get(attrId);
    if (def) return def.internalOnly || false;
  }
  
  // Try cached snapshot
  if (cachedSnapshot?.attributes) {
    const def = cachedSnapshot.attributes.get(attrId);
    if (def) return def.internalOnly || false;
  }
  
  // Fall back to SDK
  return sdkIsInternalOnly(attrId);
}

/**
 * Check if attribute is exportable
 * Uses Firestore snapshot if loaded, falls back to SDK
 */
export function isExportableFromSnapshot(
  attrId: string,
  snapshot?: RegistrySnapshot
): boolean {
  // Try Firestore snapshot first
  if (snapshot?.attributes) {
    const def = snapshot.attributes.get(attrId);
    if (def) return def.exportable ?? true;
  }
  
  // Try cached snapshot
  if (cachedSnapshot?.attributes) {
    const def = cachedSnapshot.attributes.get(attrId);
    if (def) return def.exportable ?? true;
  }
  
  // Fall back to SDK
  return sdkIsExportable(attrId);
}

/**
 * Get allowed values for an attribute
 * Uses Firestore snapshot if loaded, falls back to SDK
 */
export function getAllowedValuesFromSnapshot(
  attrId: string,
  snapshot?: RegistrySnapshot
): string[] | undefined {
  // Try Firestore snapshot first
  if (snapshot?.attributes) {
    const def = snapshot.attributes.get(attrId);
    if (def) return def.allowed_values;
  }
  
  // Try cached snapshot
  if (cachedSnapshot?.attributes) {
    const def = cachedSnapshot.attributes.get(attrId);
    if (def) return def.allowed_values;
  }
  
  // Fall back to SDK
  return sdkGetAllowedValues(attrId);
}

/**
 * Get synonyms map for an attribute
 */
export function getSynonymsFromSnapshot(
  attrId: string,
  snapshot?: RegistrySnapshot
): Record<string, string> | undefined {
  // Try Firestore snapshot first
  if (snapshot?.attributes) {
    const def = snapshot.attributes.get(attrId);
    if (def) return def.synonyms;
  }
  
  // Try cached snapshot
  if (cachedSnapshot?.attributes) {
    const def = cachedSnapshot.attributes.get(attrId);
    if (def) return def.synonyms;
  }
  
  // SDK doesn't expose synonyms directly, return undefined
  return undefined;
}

// ============================================================================
// Registry Sync Status
// ============================================================================

/**
 * Get registry sync status for health checks
 */
export async function getRegistrySyncStatus(): Promise<{
  firestoreCount: number;
  firestoreLastSync?: string;
  firestoreVersion?: string;
  cacheLoaded: boolean;
  cacheLoadedAt?: string;
}> {
  const db = admin.firestore();
  
  // Count Firestore attributes
  const snap = await db.collection('settings').doc('attributes').collection('keys').get();
  
  // Get registry metadata
  const metaDoc = await db.doc('settings/attributesMeta').get();
  const meta = metaDoc.exists ? metaDoc.data() : null;
  
  return {
    firestoreCount: snap.size,
    firestoreLastSync: meta?.lastSyncedAt?.toDate?.()?.toISOString() || meta?.lastSyncedAt,
    firestoreVersion: meta?.registry_version,
    cacheLoaded: cachedSnapshot !== null,
    cacheLoadedAt: cachedSnapshot?.loadedAt.toISOString(),
  };
}
