/**
 * Allowed Target Fields for Smart Rules Engine
 * 
 * Dynamically derives allowed target fields from the attribute registry.
 * Replaces hard-coded whitelist to ensure engine accepts all exportable registry attributes.
 * 
 * LP: LP-smart-rules-whitelist-remediation-1.0.0
 * Author: Homer
 * Date: 2026-01-03
 */

import { loadRegistrySnapshot } from './registryBridge';
import { resolve } from 'path';
import { readFileSync } from 'fs';

// Cache for allowed target fields
let cachedAllowedFields: Set<string> | null = null;
let cacheTimestamp: number = 0;
const CACHE_TTL_MS = 5 * 60 * 1000; // 5 minutes

/**
 * Alias configuration type
 */
interface AliasConfig {
  aliases: Record<string, string>;
  description?: string;
  notes?: string[];
}

/**
 * Load attribute aliases from config file
 */
function loadAliases(): Record<string, string> {
  try {
    const aliasPath = resolve(__dirname, '../../../sdk/config/attributeAliases.json');
    const content = readFileSync(aliasPath, 'utf8');
    const config: AliasConfig = JSON.parse(content);
    return config.aliases || {};
  } catch (error) {
    console.warn('Failed to load attribute aliases, continuing without aliases:', error);
    return {};
  }
}

/**
 * Compute allowed target fields from registry snapshot (SYNCHRONOUS VERSION)
 * 
 * This is a synchronous wrapper that uses cached values or returns empty set if cache miss.
 * Call initializeAllowedFieldsCache() during engine initialization to populate cache.
 * 
 * Returns Set of allowed field paths like:
 * - attributes.dept (from registry attribute_id)
 * - attributes.department (from registry attribute_id if exists)
 * - attributes.primaryColor (from alias config)
 * 
 * Only includes exportable, non-internalOnly attributes.
 */
export function computeAllowedTargetFieldsSync(): Set<string> {
  // Check cache
  const now = Date.now();
  if (cachedAllowedFields && (now - cacheTimestamp) < CACHE_TTL_MS) {
    return cachedAllowedFields;
  }

  // Cache miss - return empty set and log warning
  console.warn('[allowedTargetFields] Cache miss - returning empty set. Call initializeAllowedFieldsCache() during engine initialization.');
  return new Set();
}

/**
 * Initialize the allowed fields cache (ASYNC)
 * 
 * Call this during engine/function initialization to populate cache.
 * After initialization, computeAllowedTargetFieldsSync() will return cached values.
 */
export async function initializeAllowedFieldsCache(): Promise<void> {
  const allowed = new Set<string>();

  try {
    // Load registry snapshot
    const { snapshot } = await loadRegistrySnapshot(true);
    
    if (!snapshot || !snapshot.attributes) {
      console.error('[allowedTargetFields] Registry snapshot missing or has no attributes');
      return;
    }

    // Add all exportable registry attribute IDs
    Object.entries(snapshot.attributes).forEach(([attrId, attrDef]: [string, any]) => {
      // Only include exportable and not internalOnly
      if (attrDef.exportable && !attrDef.internalOnly) {
        allowed.add(`attributes.${attrId}`);
      }
    });

    // Load and add aliases
    const aliases = loadAliases();
    Object.entries(aliases).forEach(([aliasName, canonicalId]) => {
      // Add alias form (e.g., attributes.primaryColor)
      allowed.add(aliasName);
      // Canonical form already added above from registry
    });

    // Also support a small set of non-attribute fields for compatibility
    // (e.g., descriptive.*, sku_core.*)
    const compatiblePrefixes = [
      'descriptive.gender',
      'descriptive.ageGroup',
      'descriptive.primaryColor',
      'descriptive.secondaryColor',
      'descriptive.category',
      'sku_core.gender',
      'sku_core.ageGroup',
      'sku_core.category',
      'sku_core.department',
    ];
    compatiblePrefixes.forEach(field => allowed.add(field));

    // Update cache
    cachedAllowedFields = allowed;
    cacheTimestamp = Date.now();

    console.log(`[allowedTargetFields] Initialized cache with ${allowed.size} allowed target fields from registry`);
    
  } catch (error) {
    console.error('[allowedTargetFields] Failed to initialize cache:', error);
    // Leave cache as null - will return empty set on cache miss
  }
}

/**
 * Check if a target field is allowed (SYNCHRONOUS VERSION)
 * 
 * Uses cached allowed fields. Call initializeAllowedFieldsCache() during initialization.
 * 
 * @param targetField - Field path like 'attributes.dept'
 * @returns true if allowed
 */
export function isAllowedTargetField(targetField: string): boolean {
  const allowed = computeAllowedTargetFieldsSync();
  
  // If cache is empty, be permissive and log warning
  if (allowed.size === 0) {
    console.warn(`[allowedTargetFields] Cache empty, allowing field by default: ${targetField}`);
    return true;
  }
  
  // Check exact match
  if (allowed.has(targetField)) return true;
  
  // Check if it starts with an allowed prefix (for nested attributes)
  for (const allowedField of Array.from(allowed)) {
    if (targetField.startsWith(allowedField + '.')) {
      return true;
    }
  }
  
  return false;
}

/**
 * Invalidate cache (useful for testing or after registry updates)
 */
export function invalidateAllowedFieldsCache(): void {
  cachedAllowedFields = null;
  cacheTimestamp = 0;
}
