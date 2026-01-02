/**
 * Smart Rules Admin Types
 * LP-smart-rules-admin-1.0.0: Admin Settings Smart Rules Manager
 * 
 * Types for the Smart Rules CRUD admin console including:
 * - Rule CRUD operations
 * - Rule Builder forms
 * - Rule Test Console
 * - Rule Packs
 * - Audit trail
 */

// Note: Zod validation is done in the SDK package, not here
// We use pure TypeScript types for the web package

// ============================================================================
// Condition Match Types
// ============================================================================

export const CONDITION_MATCH_TYPES = [
  { value: 'equals', label: 'Equals', description: 'Exact match' },
  { value: 'contains', label: 'Contains', description: 'Substring match' },
  { value: 'regex', label: 'Regex', description: 'Regular expression' },
  { value: 'in', label: 'In List', description: 'Value in array' },
  { value: 'exists', label: 'Exists', description: 'Field has value' },
  { value: 'and', label: 'AND', description: 'All conditions must match' },
  { value: 'or', label: 'OR', description: 'Any condition must match' },
  { value: 'not', label: 'NOT', description: 'Negation' },
] as const;

export type ConditionMatchType = typeof CONDITION_MATCH_TYPES[number]['value'];

// ============================================================================
// Common Source Fields for Conditions
// ============================================================================

export const CONDITION_SOURCE_FIELDS = [
  { value: 'rics_category_path', label: 'RICS Category Path', group: 'RICS' },
  { value: 'rics_gender', label: 'RICS Gender', group: 'RICS' },
  { value: 'rics_age_group', label: 'RICS Age Group', group: 'RICS' },
  { value: 'rics_product_type', label: 'RICS Product Type', group: 'RICS' },
  { value: 'source.brand', label: 'Brand', group: 'Source' },
  { value: 'source.category', label: 'Category', group: 'Source' },
  { value: 'source.description', label: 'Description', group: 'Source' },
  { value: 'source.name', label: 'Product Name', group: 'Source' },
  { value: 'attributes.gender', label: 'Gender Attribute', group: 'Attributes' },
  { value: 'attributes.age_group', label: 'Age Group Attribute', group: 'Attributes' },
  { value: 'attributes.material', label: 'Material Attribute', group: 'Attributes' },
] as const;

// ============================================================================
// Rule Condition Schema (Form)
// ============================================================================

export interface RuleConditionForm {
  id: string;
  field: string;
  matchType: ConditionMatchType;
  value: string | string[];
  options?: {
    caseSensitive?: boolean;
    ignoreWhitespace?: boolean;
  };
}

// ============================================================================
// Rule Action Schema (Form)
// ============================================================================

export interface RuleActionForm {
  targetField: string;
  valueTemplate: string;
  setOnlyIfEmpty: boolean; // Guardrail: only set if field is empty
  confidenceModifier?: number;
}

// ============================================================================
// Smart Rule (Admin Form)
// ============================================================================

export interface SmartRuleForm {
  ruleId: string;
  name: string;
  description: string;
  enabled: boolean;
  priority: number;
  conditions: RuleConditionForm[];
  conditionLogic: 'and' | 'or'; // How to combine multiple conditions
  action: RuleActionForm;
  autoApply: boolean;
  autoApplyConfidence: number;
  tags: string[];
  packId?: string; // Rule pack membership
}

// ============================================================================
// Smart Rule (Firestore Document)
// ============================================================================

export interface SmartRuleDocument {
  ruleId: string;
  name: string;
  description?: string;
  enabled: boolean;
  priority: number;
  condition: {
    field: string;
    matchType: string;
    value?: string | number | string[];
    options?: Record<string, unknown>;
  } | Array<{
    field: string;
    matchType: string;
    value?: string | number | string[];
    options?: Record<string, unknown>;
  }>;
  action: {
    targetField: string;
    valueTemplate: string;
    confidenceModifier?: number;
  };
  autoApply?: boolean;
  autoApplyConfidence?: number;
  tags?: string[];
  packId?: string;
  createdBy?: string;
  createdAt?: string;
  updatedBy?: string;
  updatedAt?: string;
  // Activity tracking
  _stats?: {
    lastRunAt?: string;
    appliedCount?: number;
    matchCount?: number;
  };
}

// ============================================================================
// Rule Pack
// ============================================================================

export interface RulePack {
  packId: string;
  name: string;
  description?: string;
  enabled: boolean;
  ruleIds: string[];
  createdBy?: string;
  createdAt?: string;
  updatedBy?: string;
  updatedAt?: string;
}

// ============================================================================
// Rule Audit Entry
// ============================================================================

export interface RuleAuditEntry {
  auditId: string;
  ruleId: string;
  action: 'create' | 'update' | 'delete' | 'enable' | 'disable';
  actorId: string;
  actorEmail?: string;
  timestamp: string;
  changes?: {
    before?: Partial<SmartRuleDocument>;
    after?: Partial<SmartRuleDocument>;
  };
}

// ============================================================================
// Rule Test Console Types
// ============================================================================

export interface RuleSuggestion {
  suggestionId: string;
  ruleId: string;
  ruleName: string;
  targetField: string;
  suggestedValue: unknown;
  confidence: number;
  reason: string;
  currentValue?: unknown;
  isOverwrite: boolean;
}

export interface RuleConflict {
  conflictId: string;
  field: string;
  candidates: Array<{
    ruleId: string;
    ruleName: string;
    value: unknown;
    confidence: number;
    priority: number;
  }>;
  suggestedResolution?: {
    ruleId: string;
    reason: string;
  };
}

export interface RuleTestResult {
  productId: string;
  suggestions: RuleSuggestion[];
  conflicts: RuleConflict[];
  errors: Array<{
    ruleId: string;
    error: string;
    code?: string;
  }>;
  rulesEvaluated: number;
  evaluatedAt: string;
}

// ============================================================================
// API Request/Response Types
// ============================================================================

export interface CreateRuleRequest {
  rule: Omit<SmartRuleForm, 'ruleId'>;
}

export interface CreateRuleResponse {
  ruleId: string;
  success: boolean;
  error?: string;
}

export interface UpdateRuleRequest {
  ruleId: string;
  updates: Partial<SmartRuleForm>;
}

export interface UpdateRuleResponse {
  success: boolean;
  error?: string;
}

export interface DeleteRuleRequest {
  ruleId: string;
}

export interface DeleteRuleResponse {
  success: boolean;
  error?: string;
}

export interface ListRulesResponse {
  rules: SmartRuleDocument[];
  total: number;
}

export interface TestRuleRequest {
  productId: string;
  ruleId?: string; // Optional: test specific rule only
}

export interface ApplyRuleSuggestionsRequest {
  productId: string;
  suggestionIds: string[];
}

export interface ApplyRuleSuggestionsResponse {
  applied: Array<{
    suggestionId: string;
    success: boolean;
    error?: string;
  }>;
  appliedCount: number;
  skippedCount: number;
}

// Note: Form validation is handled at runtime in the RuleBuilder component
// Zod schemas are available in the SDK package if needed for server-side validation
