/**
 * Smart Rule Schema
 * Canonical Zod schema for Smart Rules validation
 * Version: LP-smart-rules-schema-1.0.0
 * 
 * This is the SINGLE SOURCE OF TRUTH for SmartRule validation.
 * Used by both client (UI pre-submit) and server (write validation).
 * 
 * Key invariants:
 * - condition.options MUST be an object (default {}), never undefined
 * - description MUST default to ''
 * - tags MUST default to []
 * - No undefined values allowed in Firestore payloads
 */

import { z } from 'zod';

// ============================================================================
// Match Type Enum
// ============================================================================

/**
 * Supported match types for rule conditions
 */
export const MatchTypeEnum = z.enum([
  'equals',
  'notEquals',
  'contains',
  'notContains',
  'startsWith',
  'endsWith',
  'regex',
  'greaterThan',
  'lessThan',
  'in',
  'notIn',
  'exists',
  'notExists',
  'token',
  'phrase',
  'and',
  'or',
  'not',
]);

export type MatchType = z.infer<typeof MatchTypeEnum>;

// ============================================================================
// Condition Schema
// ============================================================================

/**
 * Single rule condition
 */
export const SmartRuleCondition = z.object({
  field: z.string().min(1, 'Condition field is required'),
  matchType: MatchTypeEnum,
  value: z.union([
    z.string(),
    z.number(),
    z.array(z.string()),
  ]).default(''),
  options: z.record(z.any()).default({}),
});

export type RuleCondition = z.infer<typeof SmartRuleCondition>;

// ============================================================================
// Action Schema
// ============================================================================

/**
 * Rule action (what happens when condition matches)
 */
export const SmartRuleAction = z.object({
  targetField: z.string().min(1, 'Target field is required'),
  valueTemplate: z.string().default(''),
  confidenceModifier: z.number().min(-1).max(1).optional(),
});

export type RuleAction = z.infer<typeof SmartRuleAction>;

// ============================================================================
// Full Smart Rule Schema
// ============================================================================

/**
 * Complete SmartRule schema with all fields properly defaulted
 * 
 * Ensures:
 * - No undefined values in output
 * - All optional fields have sensible defaults
 * - Server-side validation will use this exact schema
 */
export const SmartRuleSchema = z.object({
  // Identity
  ruleId: z.string().min(1),
  
  // Core metadata
  name: z.string().min(1, 'Rule name is required'),
  description: z.string().default(''),
  
  // Status
  enabled: z.boolean().default(true),
  priority: z.number().int().min(0).max(10000).default(1000),
  
  // Condition(s)
  condition: z.union([
    SmartRuleCondition,
    z.array(SmartRuleCondition),
  ]),
  conditionLogic: z.enum(['and', 'or']).default('and'),
  
  // Action
  action: SmartRuleAction,
  
  // Auto-apply settings
  autoApply: z.boolean().default(false),
  autoApplyConfidence: z.number().min(0).max(1).optional(),
  
  // Organization
  tags: z.array(z.string()).default([]),
  packId: z.string().nullable().optional(),
  
  // Audit fields (set by server)
  createdBy: z.string().optional(),
  createdAt: z.any().optional(), // Firestore Timestamp or string
  updatedBy: z.string().optional(),
  updatedAt: z.any().optional(), // Firestore Timestamp or string
});

export type SmartRuleType = z.infer<typeof SmartRuleSchema>;

// ============================================================================
// Form Schema (for UI editing)
// ============================================================================

/**
 * Form condition with ID for UI tracking
 */
export const RuleConditionFormSchema = z.object({
  id: z.string(),
  field: z.string().default(''),
  matchType: MatchTypeEnum.default('contains'),
  value: z.union([z.string(), z.array(z.string())]).default(''),
  options: z.record(z.any()).default({}),
});

export type RuleConditionForm = z.infer<typeof RuleConditionFormSchema>;

/**
 * Form action schema
 */
export const RuleActionFormSchema = z.object({
  targetField: z.string().default(''),
  valueTemplate: z.string().default(''),
  setOnlyIfEmpty: z.boolean().default(false),
  confidenceModifier: z.number().optional(),
});

export type RuleActionForm = z.infer<typeof RuleActionFormSchema>;

/**
 * Complete form schema for rule editing UI
 */
export const SmartRuleFormSchema = z.object({
  ruleId: z.string().optional(),
  name: z.string().default(''),
  description: z.string().default(''),
  enabled: z.boolean().default(true),
  priority: z.number().default(1000),
  conditions: z.array(RuleConditionFormSchema).default([]),
  conditionLogic: z.enum(['and', 'or']).default('and'),
  action: RuleActionFormSchema,
  autoApply: z.boolean().default(false),
  autoApplyConfidence: z.number().default(0.9),
  tags: z.array(z.string()).default([]),
  packId: z.string().nullable().optional(),
});

export type SmartRuleForm = z.infer<typeof SmartRuleFormSchema>;

// ============================================================================
// Validation Functions
// ============================================================================

export interface ValidationResult {
  valid: boolean;
  issues: Array<{
    path: string;
    message: string;
    code: string;
  }>;
  normalized?: SmartRuleType;
}

/**
 * Validate a SmartRule payload
 * Returns validation result with field-level issues
 */
export function validateSmartRule(payload: unknown): ValidationResult {
  const result = SmartRuleSchema.safeParse(payload);
  
  if (result.success) {
    return {
      valid: true,
      issues: [],
      normalized: result.data,
    };
  }
  
  return {
    valid: false,
    issues: result.error.issues.map(issue => ({
      path: issue.path.join('.'),
      message: issue.message,
      code: issue.code,
    })),
  };
}

/**
 * Validate a SmartRuleForm payload (for UI)
 */
export function validateSmartRuleForm(payload: unknown): ValidationResult {
  const result = SmartRuleFormSchema.safeParse(payload);
  
  if (result.success) {
    return {
      valid: true,
      issues: [],
      normalized: undefined,
    };
  }
  
  return {
    valid: false,
    issues: result.error.issues.map(issue => ({
      path: issue.path.join('.'),
      message: issue.message,
      code: issue.code,
    })),
  };
}

// ============================================================================
// Utility Functions
// ============================================================================

/**
 * Deep clean an object by removing undefined values
 * Firestore does not accept undefined - must remove or convert to null
 */
export function deepCleanUndefined<T extends Record<string, unknown>>(obj: T): T {
  const cleaned: Record<string, unknown> = {};
  
  for (const [key, value] of Object.entries(obj)) {
    if (value === undefined) {
      continue;
    }
    
    if (value === null) {
      cleaned[key] = null;
    } else if (Array.isArray(value)) {
      cleaned[key] = value.map(item => 
        typeof item === 'object' && item !== null 
          ? deepCleanUndefined(item as Record<string, unknown>)
          : item
      );
    } else if (typeof value === 'object' && value !== null) {
      cleaned[key] = deepCleanUndefined(value as Record<string, unknown>);
    } else {
      cleaned[key] = value;
    }
  }
  
  return cleaned as T;
}

/**
 * Normalize a form to a Firestore-safe SmartRule document
 */
export function normalizeFormToDocument(form: SmartRuleForm): Record<string, unknown> {
  const conditions = form.conditions.map(c => ({
    field: c.field || '',
    matchType: c.matchType || 'contains',
    value: c.value || '',
    options: c.options || {},
  }));
  
  const doc: Record<string, unknown> = {
    ruleId: form.ruleId,
    name: form.name || '',
    description: form.description || '',
    enabled: form.enabled ?? true,
    priority: form.priority ?? 1000,
    condition: conditions.length === 1 ? conditions[0] : conditions,
    conditionLogic: form.conditionLogic || 'and',
    action: {
      targetField: form.action?.targetField || '',
      valueTemplate: form.action?.valueTemplate || '',
      ...(form.action?.confidenceModifier !== undefined && { 
        confidenceModifier: form.action.confidenceModifier 
      }),
    },
    autoApply: form.autoApply ?? false,
    autoApplyConfidence: form.autoApplyConfidence ?? 0.9,
    tags: form.tags || [],
  };
  
  if (form.packId) {
    doc.packId = form.packId;
  }
  
  return deepCleanUndefined(doc);
}

/**
 * Pre-submit validation for the rule editor
 * Returns errors keyed by field path for inline display
 */
export function preSubmitValidation(form: SmartRuleForm): Record<string, string> {
  const errors: Record<string, string> = {};
  
  if (!form.name || form.name.trim() === '') {
    errors['name'] = 'Rule name is required';
  }
  
  if (!form.conditions || form.conditions.length === 0) {
    errors['conditions'] = 'At least one condition is required';
  } else {
    form.conditions.forEach((cond, i) => {
      if (!cond.field || cond.field.trim() === '') {
        errors[`conditions.${i}.field`] = 'Condition field is required';
      }
    });
  }
  
  if (!form.action?.targetField || form.action.targetField.trim() === '') {
    errors['action.targetField'] = 'Target field is required';
  }
  
  if (!form.action?.valueTemplate || form.action.valueTemplate.trim() === '') {
    errors['action.valueTemplate'] = 'Value template is required';
  }
  
  return errors;
}

export default SmartRuleSchema;
