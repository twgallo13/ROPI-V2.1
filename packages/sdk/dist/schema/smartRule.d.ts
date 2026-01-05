/**
 * Smart Rule Schema
 * Canonical Zod schema for Smart Rules validation
 * Version: LP-smart-rules-schema-1.1.0 (Lisa canonical)
 * 
 * This is the SINGLE SOURCE OF TRUTH for SmartRule validation.
 * Used by both client (UI pre-submit) and server (write validation).
 * 
 * Key invariants:
 * - condition.options MUST be an array (default []), never undefined
 * - description MUST default to ''
 * - tags MUST default to []
 * - No undefined values allowed in Firestore payloads
 */

import { z } from 'zod';

// ============================================================================
// Action Schema
// ============================================================================

/**
 * Action schema: single action for now (set a target field to a templated value)
 */
export const ActionSchema = z.object({
  targetField: z.string().min(1),
  valueTemplate: z.string().default(''),
  setOnlyIfEmpty: z.boolean().default(false),
  confidenceModifier: z.number().optional(),
});

export type RuleAction = z.infer<typeof ActionSchema>;

// Alias for compatibility
export const SmartRuleAction = ActionSchema;

// ============================================================================
// Condition Schema
// ============================================================================

/**
 * Condition schema: match type enum includes token, phrase, regex, contains
 */
export const ConditionSchema = z.object({
  field: z.string().min(1),
  matchType: z.enum(['token', 'phrase', 'regex', 'contains']),
  value: z.string().default(''),
  // ensure options is always an array
  options: z.array(z.any()).default([]),
});

export type RuleCondition = z.infer<typeof ConditionSchema>;

// Alias for compatibility
export const SmartRuleCondition = ConditionSchema;

// Match type enum for external reference
export const MatchTypeEnum = z.enum(['token', 'phrase', 'regex', 'contains']);
export type MatchType = z.infer<typeof MatchTypeEnum>;

// ============================================================================
// Full Smart Rule Schema (RuleSchema)
// ============================================================================

/**
 * Complete SmartRule schema with all fields properly defaulted
 * 
 * Ensures:
 * - No undefined values in output
 * - All optional fields have sensible defaults
 * - Server-side validation will use this exact schema
 * - condition normalized to array via transform
 */
export const RuleSchema = z.object({
  ruleId: z.string().optional(),
  name: z.string().min(1),
  description: z.string().default(''),
  enabled: z.boolean().default(true),
  priority: z.number().int().default(100),
  // normalize single condition to array
  condition: z.union([ConditionSchema, z.array(ConditionSchema)])
    .transform((v) => (Array.isArray(v) ? v : [v])),
  action: ActionSchema,
  autoApply: z.boolean().default(false),
  autoApplyConfidence: z.number().min(0).max(1).optional(),
  tags: z.array(z.string()).default([]),
  packId: z.string().nullable().optional(),
  createdBy: z.string().optional(),
  createdAt: z.string().optional(),
  updatedBy: z.string().optional(),
  updatedAt: z.string().optional(),
});

// Alias for compatibility with existing code
export const SmartRuleSchema = RuleSchema;

export type SmartRuleType = z.infer<typeof RuleSchema>;
export type SmartRule = SmartRuleType;

// ============================================================================
// Form Schemas (for UI editing)
// ============================================================================

/**
 * Form condition with ID for UI tracking
 */
export const RuleConditionFormSchema = z.object({
  id: z.string(),
  field: z.string().default(''),
  matchType: MatchTypeEnum.default('contains'),
  value: z.union([z.string(), z.array(z.string())]).default(''),
  // Form uses array for options (consistent with document schema)
  options: z.array(z.any()).default([]),
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
  priority: z.number().default(100),
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
 * Validate a SmartRule payload (throws on invalid)
 * Lisa's canonical: parse will throw ZodError with issues
 */
export function validateSmartRule(payload: unknown): SmartRule {
  return RuleSchema.parse(payload);
}

/**
 * Safe validation that returns result object instead of throwing
 */
export function safeValidateSmartRule(payload: unknown): ValidationResult {
  const result = RuleSchema.safeParse(payload);
  
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
 * Lisa's canonical: keeps null/empty string/empty array
 */
export function deepCleanUndefined<T>(obj: T): T {
  if (obj === undefined) return undefined as T;
  if (obj === null) return null as T;
  if (Array.isArray(obj)) return obj.map(deepCleanUndefined) as T;
  if (typeof obj === 'object') {
    const out: Record<string, unknown> = {};
    for (const [k, v] of Object.entries(obj as Record<string, unknown>)) {
      if (v === undefined) continue;
      const cleaned = deepCleanUndefined(v);
      if (cleaned !== undefined) out[k] = cleaned;
    }
    return out as T;
  }
  return obj;
}

// Alias for backward compatibility
export const deepClean = deepCleanUndefined;

/**
 * Normalize a form to a Firestore-safe SmartRule document
 * Lisa's canonical: condition as array, options as array
 */
export function normalizeFormToDocument(form: SmartRuleForm): Record<string, unknown> {
  const conditions = form.conditions.map(c => ({
    field: c.field || '',
    matchType: c.matchType || 'contains',
    value: c.value || '',
    options: Array.isArray(c.options) ? c.options : [],
  }));
  
  const doc: Record<string, unknown> = {
    ruleId: form.ruleId,
    name: form.name || '',
    description: form.description || '',
    enabled: form.enabled ?? true,
    priority: form.priority ?? 100,
    // Normalize: single condition to array via schema transform
    condition: conditions.length === 1 ? conditions[0] : conditions,
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

export default RuleSchema;
