/**
 * Smart Rule Server Schema
 * LP-smart-rules-normalize-1.0.0
 * 
 * Extended server-side validation for Smart Rules.
 * Includes registry validation for attribute constraints.
 */

import { SmartRuleSchema, RuleSchema, type SmartRule } from '@ropi-aoss/sdk';
import { z } from 'zod';
import {
  loadRegistrySnapshot,
  getAttributeByIdFromSnapshot,
  getAllowedValuesFromSnapshot,
  isInternalOnlyFromSnapshot,
  type RegistrySnapshot,
} from '../services/registryBridge';
import {
  ALLOWED_PREFIXES,
  validateCanonicalFieldPath,
  normalizeSmartRuleFields,
} from '../middleware/normalizeFieldPath';

// Re-export SDK schema for compatibility
export { SmartRuleSchema, RuleSchema };
export type SmartRuleType = z.infer<typeof SmartRuleSchema>;

// ============================================================================
// Basic Validation (SDK Schema)
// ============================================================================

/**
 * Basic schema validation using SDK schema
 * Does NOT check registry constraints
 */
export function validateSmartRule(data: unknown) {
  return SmartRuleSchema.safeParse(data);
}

// ============================================================================
// Server-Side Validation with Registry
// ============================================================================

export interface ServerValidationIssue {
  path: string;
  message: string;
  code: 'INVALID_TARGET_FIELD' | 'INVALID_CONDITION_FIELD' | 'INVALID_ENUM_VALUE' | 
        'INTERNAL_ONLY_FIELD' | 'SCHEMA_VALIDATION' | 'NORMALIZATION_FAILED';
}

export interface ServerValidationResult {
  valid: boolean;
  issues: ServerValidationIssue[];
  normalized?: SmartRule;
}

/**
 * Extract attribute ID from a canonical field path
 * e.g., 'attributes.gender' -> 'gender'
 * e.g., 'attributes.rics_category.value' -> 'rics_category'
 */
export function extractAttributeId(fieldPath: string): string | null {
  if (!fieldPath.startsWith('attributes.')) {
    return null;
  }
  const parts = fieldPath.split('.');
  return parts[1] || null;
}

/**
 * Validate an action's targetField and value against registry
 */
export async function validateActionAgainstRegistry(
  action: { targetField: string; valueTemplate?: string },
  snapshot: RegistrySnapshot
): Promise<ServerValidationIssue[]> {
  const issues: ServerValidationIssue[] = [];

  // 1. Validate targetField is canonical
  const pathValidation = validateCanonicalFieldPath(action.targetField);
  if (!pathValidation.valid) {
    issues.push({
      path: 'action.targetField',
      message: pathValidation.error || 'Invalid field path',
      code: 'INVALID_TARGET_FIELD',
    });
    return issues; // Can't continue validation without valid path
  }

  // 2. Extract attribute ID and check registry
  const attrId = extractAttributeId(action.targetField);
  if (attrId) {
    const attrDef = getAttributeByIdFromSnapshot(attrId, snapshot);
    
    if (!attrDef) {
      issues.push({
        path: 'action.targetField',
        message: `Unknown attribute '${attrId}'. Not found in registry.`,
        code: 'INVALID_TARGET_FIELD',
      });
      return issues;
    }

    // 3. Check if internal only
    if (isInternalOnlyFromSnapshot(attrId, snapshot)) {
      issues.push({
        path: 'action.targetField',
        message: `Attribute '${attrId}' is internal-only and cannot be set by rules.`,
        code: 'INTERNAL_ONLY_FIELD',
      });
    }

    // 4. Validate value against allowed_values (if enum type)
    const allowedValues = getAllowedValuesFromSnapshot(attrId, snapshot);
    if (allowedValues && allowedValues.length > 0 && action.valueTemplate) {
      // Value template might be a literal or contain placeholders
      // Only validate if it's a literal (no {{ }} placeholders)
      const isLiteral = !action.valueTemplate.includes('{{');
      
      if (isLiteral) {
        const value = action.valueTemplate.trim();
        if (!allowedValues.includes(value)) {
          issues.push({
            path: 'action.valueTemplate',
            message: `Value '${value}' is not in allowed values for '${attrId}'. Allowed: ${allowedValues.slice(0, 5).join(', ')}${allowedValues.length > 5 ? '...' : ''}`,
            code: 'INVALID_ENUM_VALUE',
          });
        }
      }
    }
  }

  return issues;
}

/**
 * Validate a condition's field against registry
 */
export async function validateConditionAgainstRegistry(
  condition: { field: string; matchType: string; value: string },
  index: number,
  snapshot: RegistrySnapshot
): Promise<ServerValidationIssue[]> {
  const issues: ServerValidationIssue[] = [];

  if (!condition.field) {
    return issues; // Empty field is caught by schema validation
  }

  // Condition fields can be:
  // - source.* (import source fields) - skip registry validation
  // - attributes.* (product attributes) - validate against registry
  
  if (condition.field.startsWith('source.')) {
    // Source fields are valid without registry check
    return issues;
  }

  if (condition.field.startsWith('attributes.')) {
    const attrId = extractAttributeId(condition.field);
    if (attrId) {
      const attrDef = getAttributeByIdFromSnapshot(attrId, snapshot);
      if (!attrDef) {
        issues.push({
          path: `condition[${index}].field`,
          message: `Unknown attribute '${attrId}' in condition. Not found in registry.`,
          code: 'INVALID_CONDITION_FIELD',
        });
      }
    }
  }

  return issues;
}

/**
 * Full server-side validation with normalization and registry checks
 * 
 * Steps:
 * 1. Basic schema validation
 * 2. Field path normalization
 * 3. Registry constraint validation
 */
export async function validateSmartRuleServer(
  data: unknown,
  options?: { registrySnapshot?: RegistrySnapshot; skipNormalization?: boolean }
): Promise<ServerValidationResult> {
  const issues: ServerValidationIssue[] = [];

  // 1. Basic schema validation
  const schemaResult = SmartRuleSchema.safeParse(data);
  
  if (!schemaResult.success) {
    return {
      valid: false,
      issues: schemaResult.error.issues.map(issue => ({
        path: issue.path.join('.'),
        message: issue.message,
        code: 'SCHEMA_VALIDATION' as const,
      })),
    };
  }

  let normalizedRule = schemaResult.data;

  // 2. Normalize field paths (unless skipped)
  if (!options?.skipNormalization) {
    const { normalized, errors } = await normalizeSmartRuleFields(
      normalizedRule as unknown as Parameters<typeof normalizeSmartRuleFields>[0]
    );
    
    if (errors.length > 0) {
      return {
        valid: false,
        issues: errors.map(err => ({
          path: 'normalization',
          message: err,
          code: 'NORMALIZATION_FAILED' as const,
        })),
      };
    }
    
    normalizedRule = normalized as unknown as SmartRule;
  }

  // 3. Load registry for constraint validation
  const snapshot = options?.registrySnapshot || await loadRegistrySnapshot();

  // 4. Validate action against registry
  if (normalizedRule.action) {
    const actionIssues = await validateActionAgainstRegistry(
      normalizedRule.action,
      snapshot
    );
    issues.push(...actionIssues);
  }

  // 5. Validate conditions against registry
  const conditions = Array.isArray(normalizedRule.condition) 
    ? normalizedRule.condition 
    : [normalizedRule.condition];
  
  for (let i = 0; i < conditions.length; i++) {
    const cond = conditions[i];
    if (cond) {
      const condIssues = await validateConditionAgainstRegistry(cond, i, snapshot);
      issues.push(...condIssues);
    }
  }

  return {
    valid: issues.length === 0,
    issues,
    normalized: normalizedRule,
  };
}
