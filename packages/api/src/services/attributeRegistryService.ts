/**
 * Attribute Registry Service
 * 
 * Provides runtime attribute registry with Firestore-first loading and safe fallback.
 * Supports hot-reload, observability, and cache management.
 * 
 * DESIGN:
 * - Primary source: Firestore settings/attributes/keys collection
 * - Fallback: Bundled JSON file (packages/sdk/config/attributeRegistry.json)
 * - Cache TTL: 30 seconds (configurable via REGISTRY_CACHE_TTL_MS env var)
 * - Observability: Status endpoint reports source and refresh timestamp
 * 
 * LP-phase2b-003: Live registry integration
 */

import * as admin from 'firebase-admin';
import * as fs from 'fs';
import * as path from 'path';
import type { AttributeType } from '../../../sdk/src/schema/attribute';

// ============================================================================
// Types
// ============================================================================

export interface AttributeRegistry {
  [attributeId: string]: AttributeType;
}

export interface RegistryMetadata {
  source: 'firestore' | 'bundled' | 'uninitialized';
  lastRefresh: Date | null;
  attributeCount: number;
  loadDurationMs: number;
  error: string | null;
}

// ============================================================================
// Configuration
// ============================================================================

const CACHE_TTL_MS = parseInt(process.env.REGISTRY_CACHE_TTL_MS || '30000', 10); // 30s default
const FIRESTORE_COLLECTION_PATH = 'settings/attributes/keys';

// ============================================================================
// In-memory cache
// ============================================================================

let cachedRegistry: AttributeRegistry | null = null;
let cacheMetadata: RegistryMetadata = {
  source: 'uninitialized',
  lastRefresh: null,
  attributeCount: 0,
  loadDurationMs: 0,
  error: null
};
let cacheExpiresAt: number = 0;

// ============================================================================
// Firestore Registry Loader
// ============================================================================

/**
 * Load attribute registry from Firestore settings/attributes/keys collection
 */
async function loadRegistryFromFirestore(): Promise<{ registry: AttributeRegistry; durationMs: number }> {
  const startTime = Date.now();
  const db = admin.firestore();
  
  try {
    console.log(`[AttributeRegistryService] Loading registry from Firestore: ${FIRESTORE_COLLECTION_PATH}`);
    
    const snapshot = await db.collection(FIRESTORE_COLLECTION_PATH).get();
    
    if (snapshot.empty) {
      throw new Error(`Firestore collection ${FIRESTORE_COLLECTION_PATH} is empty`);
    }
    
    const registry: AttributeRegistry = {};
    
    for (const doc of snapshot.docs) {
      const data = doc.data();
      const attributeId = doc.id;
      
      // Transform Firestore document to AttributeType format
      registry[attributeId] = {
        attribute_id: attributeId,
        label: data.label || attributeId,
        category: data.category || 'general',
        data_type: data.dataType || data.data_type || 'string',
        required_for_completion: data.required === true || data.required_for_completion === true,
        required_for_export: data.required_for_export === true || data.requiredForExport === true,
        exportable: data.export !== false && data.exportable !== false,
        internalOnly: data.internalOnly === true || data.systemFlag === true
      } as AttributeType;
    }
    
    const durationMs = Date.now() - startTime;
    const count = Object.keys(registry).length;
    
    console.log(`[AttributeRegistryService] ✓ Loaded ${count} attributes from Firestore in ${durationMs}ms`);
    
    return { registry, durationMs };
  } catch (error: any) {
    const durationMs = Date.now() - startTime;
    console.error(`[AttributeRegistryService] ✗ Failed to load from Firestore after ${durationMs}ms:`, error.message);
    throw error;
  }
}

// ============================================================================
// Bundled JSON Fallback Loader
// ============================================================================

/**
 * Load attribute registry from bundled JSON file (fallback)
 */
function loadRegistryFromBundledJSON(): { registry: AttributeRegistry; durationMs: number } {
  const startTime = Date.now();
  
  const possiblePaths = [
    path.resolve(__dirname, '../config/attributeRegistry.json'),
    path.resolve(__dirname, 'config/attributeRegistry.json'),
    path.join(__dirname, '../config/attributeRegistry.json'),
    path.join(__dirname, 'config/attributeRegistry.json'),
    path.resolve(process.cwd(), 'config/attributeRegistry.json'),
    path.resolve(process.cwd(), 'dist/config/attributeRegistry.json'),
    path.resolve(__dirname, '../../config/attributeRegistry.json'),
    path.resolve(__dirname, '../../../sdk/config/attributeRegistry.json'),
  ];
  
  let registryData: any = null;
  let loadedFrom: string | null = null;
  
  for (const registryPath of possiblePaths) {
    try {
      if (fs.existsSync(registryPath)) {
        const fileContent = fs.readFileSync(registryPath, 'utf8');
        registryData = JSON.parse(fileContent);
        loadedFrom = registryPath;
        break;
      }
    } catch (e) {
      // Try next path
      continue;
    }
  }
  
  if (!registryData || !registryData.attributes) {
    console.error('[AttributeRegistryService] Failed to find bundled registry. Tried paths:');
    possiblePaths.forEach(p => {
      const exists = fs.existsSync(p);
      console.error(`  ${exists ? '✓' : '✗'} ${p}`);
    });
    throw new Error('Failed to load bundled attribute registry from any known path');
  }
  
  const registry: AttributeRegistry = {};
  
  for (const attr of registryData.attributes) {
    registry[attr.attribute_id] = {
      attribute_id: attr.attribute_id,
      label: attr.label,
      category: attr.category || 'general',
      data_type: attr.data_type || 'string',
      required_for_completion: attr.required_for_completion === true,
      required_for_export: attr.required_for_export === true || attr.requiredForExport === true,
      exportable: attr.exportable !== false,
      internalOnly: attr.internalOnly === true
    } as AttributeType;
  }
  
  const durationMs = Date.now() - startTime;
  const count = Object.keys(registry).length;
  
  console.log(`[AttributeRegistryService] ⚠ Loaded ${count} attributes from bundled JSON (${loadedFrom}) in ${durationMs}ms`);
  
  return { registry, durationMs };
}

// ============================================================================
// Main Registry Loader (Firestore-first with fallback)
// ============================================================================

/**
 * Load attribute registry with Firestore-first strategy and safe fallback
 */
async function loadRegistry(): Promise<{ registry: AttributeRegistry; metadata: RegistryMetadata }> {
  const overallStart = Date.now();
  
  // Try Firestore first
  try {
    const { registry, durationMs } = await loadRegistryFromFirestore();
    
    return {
      registry,
      metadata: {
        source: 'firestore',
        lastRefresh: new Date(),
        attributeCount: Object.keys(registry).length,
        loadDurationMs: durationMs,
        error: null
      }
    };
  } catch (firestoreError: any) {
    console.warn(`[AttributeRegistryService] Firestore load failed, falling back to bundled JSON:`, firestoreError.message);
    
    // Fallback to bundled JSON
    try {
      const { registry, durationMs } = loadRegistryFromBundledJSON();
      
      return {
        registry,
        metadata: {
          source: 'bundled',
          lastRefresh: new Date(),
          attributeCount: Object.keys(registry).length,
          loadDurationMs: durationMs,
          error: `Firestore unavailable: ${firestoreError.message}`
        }
      };
    } catch (bundledError: any) {
      // Both failed - critical error
      const totalDuration = Date.now() - overallStart;
      console.error(`[AttributeRegistryService] CRITICAL: Both Firestore and bundled JSON failed!`);
      
      throw new Error(`Failed to load attribute registry from any source. Firestore: ${firestoreError.message}, Bundled: ${bundledError.message}`);
    }
  }
}

// ============================================================================
// Public API
// ============================================================================

/**
 * Get attribute registry (cached or fresh load)
 * 
 * Uses cache if:
 * - Cache exists
 * - Cache not expired (within TTL)
 * 
 * Otherwise loads fresh from Firestore (with bundled fallback).
 */
export async function getAttributeRegistry(forceRefresh = false): Promise<AttributeRegistry> {
  const now = Date.now();
  
  // Return cached if valid and not forcing refresh
  if (!forceRefresh && cachedRegistry && now < cacheExpiresAt) {
    const cacheAgeMs = now - (cacheMetadata.lastRefresh?.getTime() || 0);
    console.log(`[AttributeRegistryService] Using cached registry (age: ${cacheAgeMs}ms, source: ${cacheMetadata.source})`);
    return cachedRegistry;
  }
  
  // Load fresh
  console.log(`[AttributeRegistryService] ${forceRefresh ? 'Force refresh' : 'Cache expired'}, loading fresh registry...`);
  
  const { registry, metadata } = await loadRegistry();
  
  // Update cache
  cachedRegistry = registry;
  cacheMetadata = metadata;
  cacheExpiresAt = now + CACHE_TTL_MS;
  
  return registry;
}

/**
 * Force refresh the registry cache
 */
export async function refreshRegistry(): Promise<RegistryMetadata> {
  console.log(`[AttributeRegistryService] Manual refresh requested`);
  await getAttributeRegistry(true);
  return getRegistryMetadata();
}

/**
 * Get current registry metadata (for observability)
 */
export function getRegistryMetadata(): RegistryMetadata {
  return {
    ...cacheMetadata,
    lastRefresh: cacheMetadata.lastRefresh ? new Date(cacheMetadata.lastRefresh) : null
  };
}

/**
 * Check if cache is valid
 */
export function isCacheValid(): boolean {
  return cachedRegistry !== null && Date.now() < cacheExpiresAt;
}

/**
 * Clear cache (for testing)
 */
export function clearCache(): void {
  cachedRegistry = null;
  cacheMetadata = {
    source: 'uninitialized',
    lastRefresh: null,
    attributeCount: 0,
    loadDurationMs: 0,
    error: null
  };
  cacheExpiresAt = 0;
  console.log(`[AttributeRegistryService] Cache cleared`);
}
