/**
 * ROPI Smart Rules - Type Definitions
 * ====================================
 * Canonical TypeScript types for the Smart Rules system.
 * 
 * Based on: ROPI AOSS v1.0 — Section 4.2 (Smart Rule JSON Schema)
 */

// =============================================================================
// CONDITION TYPES
// =============================================================================

/**
 * Supported condition match types
 */
export type MatchType = 
  | 'equals' 
  | 'contains' 
  | 'regex' 
  | 'token' 
  | 'in' 
  | 'exists' 
  | 'range' 
  | 'and' 
  | 'or' 
  | 'not';

/**
 * Options for condition evaluation
 */
export interface ConditionOptions {
  /** Enable case-insensitive matching */
  caseInsensitive?: boolean;
  /** Enable token normalization (synonyms, lowercase) */
  tokenNormalization?: boolean;
  /** Additional custom options */
  [key: string]: unknown;
}

/**
 * Range value for 'range' match type
 */
export interface RangeValue {
  min?: number;
  max?: number;
}

/**
 * Condition object - can be leaf or composite (and/or/not)
 */
export interface Condition {
  /** Dot-path to source field in product (e.g., 'source.rics.category_tokens') */
  source?: string;
  /** Match type operator */
  matchType: MatchType;
  /** Value to match against - type depends on matchType */
  value: string | number | boolean | null | unknown[] | RangeValue | Condition | Condition[];
  /** Additional options for matching */
  options?: ConditionOptions;
}

// =============================================================================
// ACTION TYPES
// =============================================================================

/**
 * Post-action types for side effects after rule application
 */
export type PostActionType = 'addTag' | 'createActivityLog' | 'enqueueJob';

/**
 * Post-action definition
 */
export interface PostAction {
  type: PostActionType;
  payload: Record<string, unknown>;
}

/**
 * Action object defining what the rule does when matched
 */
export interface Action {
  /** Dot-path to target field in product (e.g., 'descriptive.gender') */
  targetField: string;
  /** Handlebars-like template for computing the value */
  valueTemplate: string;
  /** Multiplier applied to base confidence (0-2, default 1.0) */
  confidenceModifier?: number;
  /** Optional post-actions to execute after applying the rule */
  postActions?: PostAction[];
}

// =============================================================================
// SMART RULE DEFINITION
// =============================================================================

/**
 * Complete Smart Rule definition (matches smartrule.schema.json)
 */
export interface SmartRule {
  /** Unique rule identifier (e.g., 'sd_001_gender_from_rics') */
  ruleId: string;
  /** Human-readable rule name */
  name: string;
  /** Optional description (can be markdown) */
  description?: string;
  /** Whether the rule is active */
  enabled: boolean;
  /** Priority for execution order (higher = earlier) */
  priority: number;
  /** Optional tags for grouping/filtering */
  tags?: string[];
  /** Condition to match */
  condition: Condition;
  /** Action to take when matched */
  action: Action;
  /** Whether to auto-apply when confidence threshold met */
  autoApply: boolean;
  /** Minimum confidence required for auto-apply (0-1) */
  autoApplyConfidence: number;
  /** User who created the rule */
  createdBy?: string;
  /** ISO timestamp of creation */
  createdAt?: string;
  /** ISO timestamp of last update */
  updatedAt?: string;
}

// =============================================================================
// ENGINE TYPES
// =============================================================================

/**
 * Result of condition evaluation
 */
export interface ConditionResult {
  /** Whether the condition matched */
  matches: boolean;
  /** Confidence level (0-1) */
  confidence: number;
  /** Captured values for use in templates */
  captures: {
    /** Raw matched value */
    raw?: string;
    /** Matched tokens (for token matching) */
    tokens?: string[];
    /** Regex match groups */
    matchGroups?: string[];
    /** Additional captures */
    [key: string]: unknown;
  };
}

/**
 * Suggestion produced by the engine
 */
export interface Suggestion {
  /** Unique suggestion ID */
  id: string;
  /** Rule that produced this suggestion */
  ruleId: string;
  /** Target field to update */
  targetField: string;
  /** Suggested value */
  value: unknown;
  /** Confidence level (0-1) */
  confidence: number;
  /** Whether this can be auto-applied */
  autoApply: boolean;
  /** Whether this has been applied */
  applied: boolean;
  /** Human-readable explanation */
  explain: string;
}

/**
 * Conflict candidate
 */
export interface ConflictCandidate {
  ruleId: string;
  value: unknown;
  confidence: number;
  notes: string;
}

/**
 * Conflict when multiple rules suggest different values for same field
 */
export interface Conflict {
  /** Unique conflict ID */
  conflictId: string;
  /** Product this conflict applies to */
  productId: string;
  /** Field with conflicting suggestions */
  field: string;
  /** Candidate values from different rules */
  candidates: ConflictCandidate[];
  /** ISO timestamp of conflict creation */
  createdAt: string;
  /** Whether the conflict has been resolved */
  resolved: boolean;
  /** Resolution details (if resolved) */
  resolution?: {
    chosenRuleId: string;
    resolvedBy: string;
    resolvedAt: string;
  };
}

/**
 * Activity log entry for audit trail
 */
export interface ActivityLogEntry {
  /** Actor who performed the action (user ID or 'system') */
  actor: string;
  /** Action type */
  action: string;
  /** ISO timestamp */
  timestamp: string;
  /** Action-specific details */
  details: Record<string, unknown>;
}

/**
 * Complete engine run result
 */
export interface EngineResult {
  /** All suggestions produced */
  suggestions: Suggestion[];
  /** Detected conflicts */
  conflicts: Conflict[];
  /** Suggestions that were auto-applied */
  autoApplied: Suggestion[];
  /** Errors encountered during evaluation */
  errors: { ruleId: string; error: string }[];
}

// =============================================================================
// PRODUCT TYPES (simplified for Smart Rules)
// =============================================================================

/**
 * RICS source data structure
 */
export interface RicsSource {
  category?: string;
  category_tokens?: string[];
  color?: string;
  shortDescription?: string;
  longDescription?: string;
  material?: string;
  [key: string]: unknown;
}

/**
 * Observations from AI analysis
 */
export interface Observations {
  ai_insights?: string;
  image_analysis?: string;
  [key: string]: unknown;
}

/**
 * Applied rule tracking
 */
export interface AppliedRule {
  ruleId: string;
  confidence: number;
  appliedAt: string;
}

/**
 * ROPI Product document (simplified for Smart Rules engine)
 */
export interface Product {
  /** Master Product Number - primary identifier */
  mpn: string;
  /** SKU strings */
  skus?: string[];
  /** SKU used for RO export */
  exportSku?: string;
  /** Internal notes */
  customMessage?: string;
  /** Attribute values keyed by attribute ID */
  attributes: Record<string, unknown>;
  /** Source data */
  source?: {
    rics?: RicsSource;
    [key: string]: unknown;
  };
  /** AI observations */
  observations?: Observations;
  /** Descriptive attributes (legacy path) */
  descriptive?: Record<string, unknown>;
  /** SKU core info (legacy path) */
  sku_core?: Record<string, unknown>;
  /** Tracking which rules applied which fields */
  _appliedRules?: Record<string, AppliedRule>;
  /** Activity log */
  _activityLog?: ActivityLogEntry[];
  /** Fields edited by users (prevents auto-override) */
  _userEditedFields?: string[];
}

// =============================================================================
// RULE PACK TYPES
// =============================================================================

/**
 * Rule pack - collection of related rules
 */
export interface RulePack {
  /** Unique pack identifier (e.g., 'footwear.v1') */
  packId: string;
  /** Human-readable name */
  name: string;
  /** Description of the pack */
  description?: string;
  /** Rules in this pack */
  rules: SmartRule[];
  /** User who created the pack */
  createdBy?: string;
  /** ISO timestamp of creation */
  createdAt?: string;
}

// =============================================================================
// API TYPES
// =============================================================================

/**
 * Request to apply suggestions
 */
export interface ApplySuggestionsRequest {
  suggestions: { id: string }[];
  applyReason?: string;
}

/**
 * Response from applying suggestions
 */
export interface ApplySuggestionsResponse {
  applied: { id: string; success: boolean; error?: string }[];
  product: Product;
}

/**
 * Request to resolve a conflict
 */
export interface ResolveConflictRequest {
  conflictId: string;
  selectedRuleId: string;
  resolvedBy: string;
}

/**
 * Response from resolving a conflict
 */
export interface ResolveConflictResponse {
  success: boolean;
  field: string;
  newValue: unknown;
  activityLog: ActivityLogEntry;
}

/**
 * Request to test a rule
 */
export interface TestRuleRequest {
  rule: SmartRule;
  productSample: Product;
}

/**
 * Response from testing a rule
 */
export interface TestRuleResponse {
  matches: boolean;
  confidence: number;
  renderedValue: unknown;
  explain: string;
  wouldAutoApply: boolean;
  preview: {
    field: string;
    before: unknown;
    after: unknown;
  };
}

// =============================================================================
// EXPORTS
// =============================================================================

export type {
  MatchType,
  ConditionOptions,
  RangeValue,
  Condition,
  PostActionType,
  PostAction,
  Action,
  SmartRule,
  ConditionResult,
  Suggestion,
  ConflictCandidate,
  Conflict,
  ActivityLogEntry,
  EngineResult,
  RicsSource,
  Observations,
  AppliedRule,
  Product,
  RulePack,
  ApplySuggestionsRequest,
  ApplySuggestionsResponse,
  ResolveConflictRequest,
  ResolveConflictResponse,
  TestRuleRequest,
  TestRuleResponse,
};
