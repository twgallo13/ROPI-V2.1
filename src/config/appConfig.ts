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

  /**
   * Enable AI Suggest button for attribute aliases
   * When true, editors and admins can use AI to suggest aliases
   * v3.0.2
   */
  AI_SUGGEST: true,
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
 * Import Validation Modes
 * v2.3 - Flexible validation for different import scenarios
 */
export type ImportValidationMode = 'minimal' | 'full';

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

  /**
   * Validation mode:
   * - 'minimal': Require only MPN (and optionally SKU)
   * - 'full': Enforce registry required rules (requiredForExport, importRequired)
   * 
   * Can be overridden via REACT_APP_IMPORT_VALIDATION_MODE env var
   * v2.3
   */
  DEFAULT_VALIDATION_MODE: 'full' as ImportValidationMode,
} as const;

/**
 * Get effective validation mode (can be overridden by env vars)
 * v2.3
 */
export function getValidationMode(): ImportValidationMode {
  // Check environment override
  const envValue = import.meta.env.REACT_APP_IMPORT_VALIDATION_MODE;
  
  if (envValue === 'minimal' || envValue === 'full') {
    return envValue;
  }
  
  return IMPORT_CONFIG.DEFAULT_VALIDATION_MODE;
}

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
