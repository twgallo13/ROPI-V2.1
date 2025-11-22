/**
 * Application Configuration
 * Feature flags and runtime settings
 * Lisa v2.0
 */

/**
 * Feature Flags
 */
export const FEATURE_FLAGS = {
  /**
   * Enable dynamic importer that reads attribute registry from Firestore
   * When false, falls back to static synonym mappings
   * Lisa v2.0 - Phase 2 Dynamic Importer
   */
  ENABLE_DYNAMIC_IMPORTER: true,

  /**
   * Enable registry cache (5-minute TTL)
   * When false, fetches fresh registry on every import
   */
  ENABLE_REGISTRY_CACHE: true,
} as const;

/**
 * Registry Configuration
 */
export const REGISTRY_CONFIG = {
  /**
   * Cache TTL in milliseconds
   */
  CACHE_TTL_MS: 5 * 60 * 1000, // 5 minutes

  /**
   * Firestore collection path for attribute keys
   */
  ATTRIBUTES_PATH: 'settings/attributes/keys',
} as const;

/**
 * Import Configuration
 */
export const IMPORT_CONFIG = {
  /**
   * Maximum batch size for Firestore writes
   */
  MAX_BATCH_SIZE: 500,

  /**
   * Enable validation before import
   */
  ENABLE_VALIDATION: true,
} as const;

/**
 * Get effective feature flag value (can be overridden by env vars)
 */
export function getFeatureFlag(flag: keyof typeof FEATURE_FLAGS): boolean {
  // Check environment override
  const envKey = `VITE_FEATURE_${flag}`;
  const envValue = import.meta.env[envKey];
  
  if (envValue !== undefined) {
    return envValue === 'true' || envValue === '1';
  }
  
  return FEATURE_FLAGS[flag];
}
