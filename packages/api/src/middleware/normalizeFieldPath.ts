/**
 * normalizeFieldPath Middleware
 * LP-smart-rules-normalize-1.0.0
 * 
 * Canonicalizes Smart Rule action.targetField paths on write operations.
 * Ensures all rule targets use the proper `attributes.` prefix.
 * 
 * Allowed prefixes:
 * - attributes.  (product attributes)
 * - observation. (observation data)
 * - meta.        (metadata fields)
 * 
 * Usage:
 *   import { normalizeSmartRuleFields } from './middleware/normalizeFieldPath';
 *   // Apply before validation
 *   const normalizedRule = await normalizeSmartRuleFields(rule);
 */

import type { Request, Response, NextFunction } from 'express';
import { 
  loadRegistrySnapshot, 
  getAttributeByIdFromSnapshot,
  type RegistrySnapshot 
} from '../services/registryBridge';

// ============================================================================
// Constants
// ============================================================================

/**
 * Allowed field path prefixes
 * Fields starting with these are accepted as-is
 */
export const ALLOWED_PREFIXES = ['attributes.', 'observation.', 'meta.'] as const;

/**
 * System fields that are allowed without prefix
 */
export const SYSTEM_FIELDS = ['tags', 'source', 'sku', 'name', 'description'] as const;

// ============================================================================
// Types
// ============================================================================

export interface NormalizationResult {
  success: boolean;
  normalizedValue: string;
  wasChanged: boolean;
  error?: string;
}

export interface SmartRuleAction {
  targetField: string;
  valueTemplate?: string;
  confidenceModifier?: number;
}

export interface SmartRuleCondition {
  field: string;
  matchType: string;
  value: string;
  options?: unknown[];
}

export interface SmartRulePayload {
  ruleId?: string;
  name: string;
  description?: string;
  enabled?: boolean;
  priority?: number;
  condition?: SmartRuleCondition | SmartRuleCondition[];
  action?: SmartRuleAction;
  autoApply?: boolean;
  autoApplyConfidence?: number;
  tags?: string[];
  packId?: string | null;
  [key: string]: unknown;
}

// ============================================================================
// Core Normalization Logic
// ============================================================================

/**
 * Check if a field path starts with an allowed prefix
 */
export function hasAllowedPrefix(field: string): boolean {
  const normalized = field.trim().toLowerCase();
  return ALLOWED_PREFIXES.some(prefix => normalized.startsWith(prefix));
}

/**
 * Check if a field is a known system field
 */
export function isSystemField(field: string): boolean {
  const firstSegment = field.split('.')[0].trim().toLowerCase();
  return (SYSTEM_FIELDS as readonly string[]).includes(firstSegment);
}

/**
 * Normalize a single field path
 * 
 * Rules:
 * 1. If already has allowed prefix -> return as-is
 * 2. If matches a known attribute ID -> prefix with 'attributes.'
 * 3. If is a system field -> reject (should use explicit prefix)
 * 4. If not resolvable -> return error
 */
export async function normalizeFieldPath(
  field: string,
  registrySnapshot?: RegistrySnapshot
): Promise<NormalizationResult> {
  const trimmed = field.trim();
  
  if (!trimmed) {
    return {
      success: false,
      normalizedValue: trimmed,
      wasChanged: false,
      error: 'Field path cannot be empty',
    };
  }

  // 1. Already has allowed prefix - accept as-is
  if (hasAllowedPrefix(trimmed)) {
    return {
      success: true,
      normalizedValue: trimmed,
      wasChanged: false,
    };
  }

  // 2. Check if first segment is a known attribute
  const segments = trimmed.split('.');
  const firstSegment = segments[0];
  
  // Load registry if not provided
  const snapshot = registrySnapshot || await loadRegistrySnapshot();
  const attribute = getAttributeByIdFromSnapshot(firstSegment, snapshot);
  
  if (attribute) {
    // Found in registry - prefix with 'attributes.'
    const normalizedValue = `attributes.${trimmed}`;
    return {
      success: true,
      normalizedValue,
      wasChanged: true,
    };
  }

  // 3. Check if it's a system field (reject - should be explicit)
  if (isSystemField(trimmed)) {
    return {
      success: false,
      normalizedValue: trimmed,
      wasChanged: false,
      error: `System field '${firstSegment}' requires explicit prefix. Use 'meta.${trimmed}' or appropriate prefix.`,
    };
  }

  // 4. Not resolvable - unknown field
  return {
    success: false,
    normalizedValue: trimmed,
    wasChanged: false,
    error: `Unknown field '${firstSegment}'. Must be a valid attribute ID or use an allowed prefix (${ALLOWED_PREFIXES.join(', ')}).`,
  };
}

/**
 * Normalize condition field path (if present)
 */
export async function normalizeConditionField(
  condition: SmartRuleCondition,
  registrySnapshot?: RegistrySnapshot
): Promise<{ normalized: SmartRuleCondition; result: NormalizationResult }> {
  if (!condition.field) {
    return {
      normalized: condition,
      result: {
        success: true,
        normalizedValue: condition.field || '',
        wasChanged: false,
      },
    };
  }

  const result = await normalizeFieldPath(condition.field, registrySnapshot);
  
  return {
    normalized: {
      ...condition,
      field: result.success ? result.normalizedValue : condition.field,
    },
    result,
  };
}

// ============================================================================
// Rule Normalization
// ============================================================================

/**
 * Normalize all field paths in a Smart Rule payload
 * 
 * Normalizes:
 * - action.targetField
 * - condition.field (if array, normalizes each)
 */
export async function normalizeSmartRuleFields(
  rule: SmartRulePayload,
  registrySnapshot?: RegistrySnapshot
): Promise<{
  normalized: SmartRulePayload;
  errors: string[];
  changes: Array<{ field: string; from: string; to: string }>;
}> {
  const errors: string[] = [];
  const changes: Array<{ field: string; from: string; to: string }> = [];
  const snapshot = registrySnapshot || await loadRegistrySnapshot();
  
  // Clone the rule to avoid mutation
  const normalized: SmartRulePayload = JSON.parse(JSON.stringify(rule));

  // 1. Normalize action.targetField
  if (normalized.action?.targetField) {
    const result = await normalizeFieldPath(normalized.action.targetField, snapshot);
    
    if (!result.success) {
      errors.push(`action.targetField: ${result.error}`);
    } else if (result.wasChanged) {
      changes.push({
        field: 'action.targetField',
        from: normalized.action.targetField,
        to: result.normalizedValue,
      });
      normalized.action.targetField = result.normalizedValue;
    }
  }

  // 2. Normalize condition.field (single or array)
  if (normalized.condition) {
    const conditions = Array.isArray(normalized.condition) 
      ? normalized.condition 
      : [normalized.condition];
    
    const normalizedConditions: SmartRuleCondition[] = [];
    
    for (let i = 0; i < conditions.length; i++) {
      const cond = conditions[i];
      const { normalized: normCond, result } = await normalizeConditionField(cond, snapshot);
      
      if (!result.success) {
        errors.push(`condition[${i}].field: ${result.error}`);
      } else if (result.wasChanged) {
        changes.push({
          field: `condition[${i}].field`,
          from: cond.field,
          to: result.normalizedValue,
        });
      }
      
      normalizedConditions.push(normCond);
    }
    
    // Preserve array/single format
    normalized.condition = Array.isArray(rule.condition) 
      ? normalizedConditions 
      : normalizedConditions[0];
  }

  return { normalized, errors, changes };
}

// ============================================================================
// Express Middleware
// ============================================================================

/**
 * Express middleware that normalizes Smart Rule field paths in request body
 * 
 * - If normalization succeeds, modifies req.body with normalized rule
 * - If normalization fails, returns 400 INVALID_TARGET_FIELD
 * - Attaches normalization changes to req.locals for audit logging
 */
export async function normalizeFieldPathMiddleware(
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> {
  // Only process if body contains Smart Rule fields
  if (!req.body || typeof req.body !== 'object') {
    next();
    return;
  }

  // Check if this looks like a Smart Rule payload
  const hasRuleFields = 'action' in req.body || 'condition' in req.body;
  if (!hasRuleFields) {
    next();
    return;
  }

  try {
    const { normalized, errors, changes } = await normalizeSmartRuleFields(req.body);

    if (errors.length > 0) {
      res.status(400).json({
        error: 'INVALID_TARGET_FIELD',
        message: 'Rule field path normalization failed',
        details: errors,
      });
      return;
    }

    // Update request body with normalized rule
    req.body = normalized;

    // Attach changes for audit logging
    (req as Request & { locals?: { normalizationChanges?: typeof changes } }).locals = {
      ...(req as Request & { locals?: object }).locals,
      normalizationChanges: changes,
    };

    if (changes.length > 0) {
      console.log(`[normalizeFieldPath] Normalized ${changes.length} field(s):`, changes);
    }

    next();
  } catch (err) {
    console.error('[normalizeFieldPath] Error during normalization:', err);
    res.status(500).json({
      error: 'NORMALIZATION_ERROR',
      message: err instanceof Error ? err.message : 'Unknown error during field normalization',
    });
  }
}

// ============================================================================
// Validation Helpers (for schema validation)
// ============================================================================

/**
 * Validate that a field path is in canonical form
 * Use AFTER normalization to ensure the rule is correct
 */
export function validateCanonicalFieldPath(field: string): { valid: boolean; error?: string } {
  const trimmed = field.trim();
  
  if (!trimmed) {
    return { valid: false, error: 'Field path cannot be empty' };
  }

  if (!hasAllowedPrefix(trimmed)) {
    return {
      valid: false,
      error: `Field path '${trimmed}' must start with allowed prefix: ${ALLOWED_PREFIXES.join(', ')}`,
    };
  }

  // Validate the attribute ID part exists
  const parts = trimmed.split('.');
  if (parts.length < 2 || !parts[1]) {
    return {
      valid: false,
      error: `Field path '${trimmed}' must have an attribute ID after the prefix`,
    };
  }

  return { valid: true };
}
