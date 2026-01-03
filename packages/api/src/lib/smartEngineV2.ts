/**
 * ROPI Smart Rules Engine V2
 * ===========================
 * LP-smart-rules-engine-1.0.0: Deterministic import-time Smart Rules engine
 * 
 * Per Lisa's S2 requirements:
 * - Runs only during import (no product-load or post-import writes)
 * - Accepts: importRow, registrySnapshot, activeRules
 * - Returns: suggestions[] with provenance, conflicts[] for multi-rule collisions
 * - Deterministic auto-apply with set-if-empty semantics
 * - Registry-enforced guardrails (internalOnly, exportable checks)
 * - Per-field provenance model
 * - Idempotency via _smartRulesRanAt and _smartRulesSkipUntil
 * 
 * Based on: ROPI AOSS v1.0 — Section 4 (Smart Rules)
 */

import * as Handlebars from 'handlebars';
import { 
  type RegistryAttribute, 
  isExportable, 
  isInternalOnly,
  getAttributeById,
  getAllowedValues,
} from '@ropi-aoss/sdk';

// =============================================================================
// TYPE DEFINITIONS (S2.1)
// =============================================================================

/**
 * Export target channels (from S1 registry)
 */
export type ExportTarget = 'shopify' | 'google' | 'amazon' | 'magento' | 'csv';

/**
 * Smart Rule condition match types
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
 * Condition object for Smart Rules
 */
export interface Condition {
  source?: string;
  matchType: MatchType;
  value: string | number | boolean | null | unknown[] | Record<string, unknown> | Condition | Condition[];
  options?: {
    caseInsensitive?: boolean;
    tokenNormalization?: boolean;
    [key: string]: unknown;
  };
}

/**
 * Action object defining what the rule does when matched
 */
export interface Action {
  targetField: string;
  valueTemplate: string;
  confidenceModifier?: number;
  postActions?: PostAction[];
  /** Only apply if target field is empty/null/undefined (default: false) */
  onlyIfEmpty?: boolean;
}

/**
 * Post-action types
 */
export interface PostAction {
  type: 'addTag' | 'createActivityLog' | 'enqueueJob';
  payload: Record<string, unknown>;
}

/**
 * Complete Smart Rule definition (S2.1)
 */
export interface SmartRule {
  ruleId: string;
  name: string;
  description?: string;
  enabled: boolean;
  priority: number;
  tags?: string[];
  condition: Condition;
  action: Action;
  /** Whether to auto-apply during import (default: false) */
  autoApply: boolean;
  /** Minimum confidence threshold for auto-apply (default: 0.9) */
  autoApplyConfidence: number;
  createdBy?: string;
  createdAt?: string;
  updatedAt?: string;
}

/**
 * Result of condition evaluation
 */
export interface ConditionResult {
  matches: boolean;
  confidence: number;
  captures: {
    raw?: string;
    tokens?: string[];
    matchGroups?: string[];
    [key: string]: unknown;
  };
}

/**
 * Suggestion produced by the engine (S2.1)
 */
export interface Suggestion {
  id: string;
  ruleId: string;
  ruleName: string;
  targetField: string;
  value: unknown;
  confidence: number;
  autoApply: boolean;
  applied: boolean;
  explain: string;
  /** Input data that triggered this suggestion */
  input: Record<string, unknown>;
}

/**
 * Conflict when multiple rules suggest different values for same field (S2.6)
 */
export interface Conflict {
  conflictId: string;
  productId: string;
  field: string;
  candidates: ConflictCandidate[];
  createdAt: string;
  resolved: boolean;
  suggestedResolution: 'highest_priority' | 'manual';
  resolution?: {
    chosenRuleId: string;
    resolvedBy: string;
    resolvedAt: string;
  };
}

export interface ConflictCandidate {
  ruleId: string;
  ruleName: string;
  value: unknown;
  confidence: number;
  priority: number;
  notes: string;
}

/**
 * Per-field provenance structure (S2.4)
 */
export interface FieldProvenance {
  source: 'smartRule' | 'human' | 'import' | 'api';
  ruleId?: string;
  ruleName?: string;
  appliedAt: string;
  input?: Record<string, unknown>;
  reason?: string;
  /** If user edited, track who replaced the value */
  replacedByActor?: string;
  replacedAt?: string;
}

/**
 * Activity log entry for audit trail
 */
export interface ActivityLogEntry {
  actor: string;
  action: 'smartrule_auto_apply' | 'smartrule_manual_apply' | 'user_edit' | 'conflict_resolved' | 'smartrule_guardrail_blocked';
  timestamp: string;
  details: Record<string, unknown>;
}

/**
 * Import row for engine evaluation
 */
export interface ImportRow {
  /** Product identifier (MPN) */
  productId: string;
  /** Normalized import data */
  normalized: Record<string, unknown>;
  /** Source data (RICS, etc.) */
  source?: {
    rics?: {
      category?: string;
      category_tokens?: string[];
      color?: string;
      shortDescription?: string;
      [key: string]: unknown;
    };
    [key: string]: unknown;
  };
  /** Existing product data (for merge/update scenarios) */
  existingProduct?: Product;
}

/**
 * Product document shape
 */
export interface Product {
  mpn: string;
  skus?: string[];
  exportSku?: string;
  attributes: Record<string, unknown>;
  source?: {
    rics?: {
      category?: string;
      category_tokens?: string[];
      color?: string;
      shortDescription?: string;
      [key: string]: unknown;
    };
    [key: string]: unknown;
  };
  observations?: {
    ai_insights?: string;
    [key: string]: unknown;
  };
  descriptive?: Record<string, unknown>;
  sku_core?: Record<string, unknown>;
  _appliedRules?: Record<string, {
    ruleId: string;
    confidence: number;
    appliedAt: string;
  }>;
  _activityLog?: ActivityLogEntry[];
  _userEditedFields?: string[];
  /** Per-field provenance (S2.4) */
  provenance?: Record<string, FieldProvenance>;
  /** Timestamp of last Smart Rules evaluation */
  _smartRulesRanAt?: string;
  /** Skip until timestamp to prevent loops */
  _smartRulesSkipUntil?: number;
  /** Pending conflicts requiring resolution */
  _smartConflicts?: Conflict[];
}

/**
 * Engine run result (S2.1)
 */
export interface EngineResult {
  suggestions: Suggestion[];
  conflicts: Conflict[];
  autoApplied: Suggestion[];
  errors: EngineError[];
  /** Updates to apply to product (includes provenance) */
  updates: Record<string, unknown>;
  /** Activity log entries to append */
  activityLog: ActivityLogEntry[];
}

export interface EngineError {
  ruleId: string;
  error: string;
  code: 'TARGET_INTERNAL_ONLY' | 'TARGET_NOT_EXPORTABLE' | 'DOMAIN_VALIDATION_FAILED' | 'TEMPLATE_ERROR' | 'CONDITION_ERROR';
}

// =============================================================================
// RICS MATCHING STRATEGY (S2.2)
// =============================================================================

/**
 * Dictionary entry for RICS token matching
 */
export interface DictionaryEntry {
  token: string;
  canonical: string;
  synonyms?: string[];
  /** Priority for disambiguation (higher wins) */
  priority?: number;
}

/**
 * RICS Matching Dictionary (S2.2)
 * Admin-editable - stored in Settings or registry
 */
export const DEFAULT_RICS_DICTIONARY: DictionaryEntry[] = [
  // Gender tokens
  { token: "men's", canonical: "Men's", synonyms: ['mens', 'men', 'male', 'm'], priority: 100 },
  { token: "women's", canonical: "Women's", synonyms: ['womens', 'women', 'wmns', 'female', 'w'], priority: 100 },
  { token: 'unisex', canonical: 'Unisex', synonyms: ['uni'], priority: 90 },
  { token: 'kids', canonical: 'Kids', synonyms: ['kid', 'children', 'child'], priority: 80 },
  { token: 'boys', canonical: 'Boys', synonyms: ['boy'], priority: 70 },
  { token: 'girls', canonical: 'Girls', synonyms: ['girl'], priority: 70 },
  { token: 'grade school', canonical: 'Grade School', synonyms: ['gs', 'grade-school', 'gradeschool'], priority: 60 },
  { token: 'pre-school', canonical: 'Pre-School', synonyms: ['ps', 'preschool', 'pre school'], priority: 50 },
  { token: 'toddler', canonical: 'Toddler', synonyms: ['td'], priority: 40 },
  { token: 'infant', canonical: 'Infant', synonyms: ['crib'], priority: 30 },
  
  // Category tokens
  { token: 'footwear', canonical: 'Footwear', synonyms: ['shoes', 'shoe'], priority: 100 },
  { token: 'apparel', canonical: 'Apparel', synonyms: ['clothing', 'clothes'], priority: 100 },
  { token: 'accessories', canonical: 'Accessories', synonyms: ['accessory', 'acc'], priority: 100 },
  { token: 'sneakers', canonical: 'Sneakers', synonyms: ['sneaker'], priority: 80 },
  { token: 'boots', canonical: 'Boots', synonyms: ['boot'], priority: 80 },
  { token: 'sandals', canonical: 'Sandals', synonyms: ['sandal'], priority: 80 },
  
  // Color tokens
  { token: 'black', canonical: 'Black', synonyms: ['blk', 'bk'], priority: 100 },
  { token: 'white', canonical: 'White', synonyms: ['wht', 'wt'], priority: 100 },
  { token: 'red', canonical: 'Red', synonyms: ['rd'], priority: 100 },
  { token: 'blue', canonical: 'Blue', synonyms: ['blu'], priority: 100 },
  { token: 'green', canonical: 'Green', synonyms: ['grn'], priority: 100 },
  { token: 'gray', canonical: 'Gray', synonyms: ['grey', 'gry'], priority: 100 },
  { token: 'navy', canonical: 'Navy', synonyms: ['nvy'], priority: 100 },
  { token: 'pink', canonical: 'Pink', synonyms: ['pnk'], priority: 100 },
  { token: 'purple', canonical: 'Purple', synonyms: ['purp', 'prpl'], priority: 100 },
  { token: 'brown', canonical: 'Brown', synonyms: ['brn'], priority: 100 },
  { token: 'orange', canonical: 'Orange', synonyms: ['org'], priority: 100 },
  { token: 'yellow', canonical: 'Yellow', synonyms: ['ylw'], priority: 100 },
];

/**
 * RICS Normalizer (S2.2)
 * Performs deterministic text normalization for RICS parsing
 */
export class RICSNormalizer {
  private dictionary: Map<string, DictionaryEntry>;
  private synonymLookup: Map<string, DictionaryEntry>;
  
  constructor(dictionary: DictionaryEntry[] = DEFAULT_RICS_DICTIONARY) {
    this.dictionary = new Map();
    this.synonymLookup = new Map();
    
    for (const entry of dictionary) {
      this.dictionary.set(entry.token.toLowerCase(), entry);
      this.synonymLookup.set(entry.token.toLowerCase(), entry);
      
      if (entry.synonyms) {
        for (const syn of entry.synonyms) {
          this.synonymLookup.set(syn.toLowerCase(), entry);
        }
      }
    }
  }
  
  /**
   * Normalize text for matching (S2.2)
   * - Lowercase
   * - Unicode normalization (NFD → strip accents)
   * - Punctuation removal (except apostrophes for possessives)
   * - Normalize apostrophes
   */
  normalize(text: string): string {
    if (!text) return '';
    
    return text
      .toLowerCase()
      // Unicode normalization
      .normalize('NFD')
      .replace(/[\u0300-\u036f]/g, '')
      // Normalize various apostrophe types to standard
      .replace(/[''`]/g, "'")
      // Remove punctuation except apostrophes
      .replace(/[^\w\s'-]/g, ' ')
      // Collapse whitespace
      .replace(/\s+/g, ' ')
      .trim();
  }
  
  /**
   * Tokenize normalized text (S2.2)
   * Splits on pipes (RICS format) and spaces
   */
  tokenize(text: string): string[] {
    const normalized = this.normalize(text);
    if (!normalized) return [];
    
    // Split on RICS pipe delimiter first
    const segments = normalized.split('|');
    const tokens: string[] = [];
    
    for (const segment of segments) {
      // Split on spaces
      const words = segment.trim().split(/\s+/).filter(w => w.length > 0);
      tokens.push(...words);
    }
    
    return tokens;
  }
  
  /**
   * Generate n-grams from tokens (S2.2)
   * @param tokens - Array of tokens
   * @param n - N-gram size (2 for bigrams, 3 for trigrams)
   */
  generateNgrams(tokens: string[], n: number): string[] {
    if (tokens.length < n) return [];
    
    const ngrams: string[] = [];
    for (let i = 0; i <= tokens.length - n; i++) {
      ngrams.push(tokens.slice(i, i + n).join(' '));
    }
    return ngrams;
  }
  
  /**
   * Dictionary-driven token matching (S2.2)
   * Matches tokens against dictionary, handling synonyms
   */
  matchToken(token: string): DictionaryEntry | undefined {
    const normalized = this.normalize(token);
    return this.synonymLookup.get(normalized);
  }
  
  /**
   * Extract canonical values from RICS string (S2.2)
   * Returns matched dictionary entries with phrase preference
   */
  extractFromRICS(ricsString: string): { 
    tokens: string[]; 
    matches: DictionaryEntry[]; 
    bigrams: string[];
    trigrams: string[];
  } {
    const tokens = this.tokenize(ricsString);
    const bigrams = this.generateNgrams(tokens, 2);
    const trigrams = this.generateNgrams(tokens, 3);
    
    const matches: DictionaryEntry[] = [];
    const matchedIndices = new Set<number>();
    
    // Priority 1: Try to match trigrams first (longer phrases win)
    for (const trigram of trigrams) {
      const entry = this.synonymLookup.get(trigram);
      if (entry) {
        matches.push(entry);
      }
    }
    
    // Priority 2: Try bigrams
    for (const bigram of bigrams) {
      const entry = this.synonymLookup.get(bigram);
      if (entry && !matches.some(m => m.canonical === entry.canonical)) {
        matches.push(entry);
      }
    }
    
    // Priority 3: Individual tokens
    for (let i = 0; i < tokens.length; i++) {
      if (matchedIndices.has(i)) continue;
      
      const entry = this.matchToken(tokens[i]);
      if (entry && !matches.some(m => m.canonical === entry.canonical)) {
        matches.push(entry);
        matchedIndices.add(i);
      }
    }
    
    // Sort by priority (higher first)
    matches.sort((a, b) => (b.priority || 0) - (a.priority || 0));
    
    return { tokens, matches, bigrams, trigrams };
  }
  
  /**
   * Handle "men" vs "women" disambiguation (S2.2)
   * Uses token boundary and phrase preference logic
   */
  disambiguateGender(tokens: string[]): string | undefined {
    const normalized = tokens.map(t => this.normalize(t));
    
    // Check for complete "women's" or "men's" first
    for (const token of normalized) {
      if (token === "women's" || token === 'womens') return "Women's";
      if (token === "men's" || token === 'mens') return "Men's";
    }
    
    // Check for "women" before "men" (phrase boundary check)
    const hasWomen = normalized.some(t => t === 'women' || t.startsWith('women'));
    const hasMen = normalized.some(t => t === 'men' && !normalized.some(w => w === 'women'));
    
    if (hasWomen) return "Women's";
    if (hasMen) return "Men's";
    
    // Check kids variants
    if (normalized.includes('kids') || normalized.includes('kid')) return 'Kids';
    if (normalized.includes('boys') || normalized.includes('boy')) return 'Boys';
    if (normalized.includes('girls') || normalized.includes('girl')) return 'Girls';
    if (normalized.includes('unisex')) return 'Unisex';
    
    return undefined;
  }
}

// Create singleton normalizer
export const ricsNormalizer = new RICSNormalizer();

// =============================================================================
// ALLOWED TARGET FIELDS WHITELIST (S2.3)
// =============================================================================

/**
 * ALLOWED_TARGET_FIELDS is now dynamically computed from the registry.
 * This ensures the engine accepts all exportable registry attributes.
 * 
 * LP: LP-smart-rules-whitelist-remediation-1.0.0
 * Replaces hard-coded whitelist with registry-derived computation.
 * 
 * Import the allowedTargetFields module functions for runtime checks.
 */
import { isAllowedTargetField as _isAllowedTargetField, initializeAllowedFieldsCache } from './allowedTargetFields';

/**
 * @deprecated Use isAllowedTargetField() from allowedTargetFields module
 * 
 * This export maintained for backward compatibility but will return empty set.
 * Engine now uses dynamic registry-derived whitelist.
 */
export const ALLOWED_TARGET_FIELDS: Set<string> = new Set();

// =============================================================================
// UTILITY FUNCTIONS
// =============================================================================

/**
 * Deep get a value from an object using dot notation
 */
export function deepGet(obj: unknown, path: string): unknown {
  if (!obj || typeof obj !== 'object') return undefined;
  
  const parts = path.split('.');
  let current: unknown = obj;
  
  for (const part of parts) {
    if (current === null || current === undefined) return undefined;
    if (typeof current !== 'object') return undefined;
    current = (current as Record<string, unknown>)[part];
  }
  
  return current;
}

/**
 * Deep set a value in an object using dot notation
 */
export function deepSet(obj: Record<string, unknown>, path: string, value: unknown): void {
  const parts = path.split('.');
  let current: Record<string, unknown> = obj;
  
  for (let i = 0; i < parts.length - 1; i++) {
    const part = parts[i];
    if (!(part in current) || typeof current[part] !== 'object' || current[part] === null) {
      current[part] = {};
    }
    current = current[part] as Record<string, unknown>;
  }
  
  current[parts[parts.length - 1]] = value;
}

/**
 * Generate a unique ID
 */
export function generateId(prefix: string = 'id'): string {
  return `${prefix}-${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 9)}`;
}

/**
 * Check if a field was user-edited
 */
export function isUserEdited(product: Product, field: string): boolean {
  if (!product._userEditedFields) return false;
  return product._userEditedFields.includes(field);
}

/**
 * Validate target field is in whitelist (S2.3)
 * 
 * LP: LP-smart-rules-whitelist-remediation-1.0.0
 * Now uses registry-derived whitelist (synchronous with cache).
 */
export function isAllowedTargetField(field: string): boolean {
  return _isAllowedTargetField(field);
}

/**
 * Extract attribute name from target field path
 * e.g., "attributes.gender" -> "gender"
 */
export function extractAttributeName(targetField: string): string {
  const parts = targetField.split('.');
  return parts[parts.length - 1];
}

// =============================================================================
// GUARDRAILS & VALIDATION (S2.3)
// =============================================================================

/**
 * Validate that a rule target is allowed (S2.3)
 * - Target must be exportable (not internalOnly)
 * - Target must be in whitelist
 * 
 * LP: LP-smart-rules-whitelist-remediation-1.0.0
 * Now uses registry-derived whitelist.
 */
export function validateRuleTarget(targetField: string): { 
  valid: boolean; 
  error?: string;
  code?: EngineError['code'];
} {
  // Check whitelist first (now uses registry-derived cache)
  const allowed = isAllowedTargetField(targetField);
  if (!allowed) {
    return { 
      valid: false, 
      error: `Target field '${targetField}' not in allowed whitelist`,
      code: 'TARGET_NOT_EXPORTABLE'
    };
  }
  
  // Extract attribute name and check registry flags
  const attrName = extractAttributeName(targetField);
  
  // Check if internalOnly
  if (isInternalOnly(attrName)) {
    return { 
      valid: false, 
      error: `Target attribute '${attrName}' is marked internalOnly`,
      code: 'TARGET_INTERNAL_ONLY'
    };
  }
  
  // Check if exportable
  if (!isExportable(attrName)) {
    return { 
      valid: false, 
      error: `Target attribute '${attrName}' is not exportable`,
      code: 'TARGET_NOT_EXPORTABLE'
    };
  }
  
  return { valid: true };
}

/**
 * Validate generated value against registry domain (S2.3)
 */
export function validateGeneratedValue(
  targetField: string,
  value: unknown
): { valid: boolean; normalizedValue: unknown; reason?: string } {
  const attrName = extractAttributeName(targetField);
  const attr = getAttributeById(attrName);
  
  // If not in registry, allow value (unknown attributes are handled elsewhere)
  if (!attr) {
    return { valid: true, normalizedValue: value };
  }
  
  // If attribute has no allowed_values constraint, allow any value
  const allowedValues = getAllowedValues(attrName);
  if (!allowedValues || allowedValues.length === 0) {
    return { valid: true, normalizedValue: value };
  }
  
  // Only validate enum/select/multiSelect types
  const enumTypes = ['select', 'multiSelect'];
  if (!enumTypes.includes(attr.data_type)) {
    return { valid: true, normalizedValue: value };
  }
  
  // Handle null/empty values (allow through)
  if (value === null || value === undefined || value === '') {
    return { valid: true, normalizedValue: value };
  }
  
  const strValue = String(value).trim();
  
  // Check synonyms from registry
  const synonyms = attr.synonyms;
  let mappedValue = strValue;
  
  if (synonyms && typeof synonyms === 'object' && !Array.isArray(synonyms)) {
    const synonymMap = synonyms as Record<string, string>;
    mappedValue = synonymMap[strValue] || synonymMap[strValue.toLowerCase()] || strValue;
  }
  
  // Case-insensitive match against allowed values
  const match = allowedValues.find(av => av.toLowerCase() === mappedValue.toLowerCase());
  
  if (match) {
    return { valid: true, normalizedValue: match }; // Return canonical casing
  }
  
  // Invalid value
  return {
    valid: false,
    normalizedValue: null,
    reason: `Value '${strValue}' not in allowed values for '${attrName}': [${allowedValues.slice(0, 5).join(', ')}${allowedValues.length > 5 ? '...' : ''}]`,
  };
}

// =============================================================================
// HANDLEBARS TEMPLATE HELPERS
// =============================================================================

// Register safe helpers
Handlebars.registerHelper('trim', (str: unknown) => {
  return typeof str === 'string' ? str.trim() : '';
});

Handlebars.registerHelper('substr', (str: unknown, start: number, length?: number) => {
  if (typeof str !== 'string') return '';
  return length !== undefined ? str.substring(start, start + length) : str.substring(start);
});

Handlebars.registerHelper('lower', (str: unknown) => {
  return typeof str === 'string' ? str.toLowerCase() : '';
});

Handlebars.registerHelper('upper', (str: unknown) => {
  return typeof str === 'string' ? str.toUpperCase() : '';
});

Handlebars.registerHelper('capitalize', (str: unknown) => {
  if (typeof str !== 'string') return '';
  return str.charAt(0).toUpperCase() + str.slice(1).toLowerCase();
});

Handlebars.registerHelper('join', (arr: unknown, separator: string = ', ') => {
  if (!Array.isArray(arr)) return '';
  return arr.join(separator);
});

Handlebars.registerHelper('first', (arr: unknown) => {
  if (!Array.isArray(arr) || arr.length === 0) return '';
  return arr[0];
});

Handlebars.registerHelper('contains', (arr: unknown, value: unknown) => {
  if (!Array.isArray(arr)) return false;
  const normalizedValue = typeof value === 'string' ? ricsNormalizer.normalize(value) : value;
  return arr.some(item => {
    const normalizedItem = typeof item === 'string' ? ricsNormalizer.normalize(item) : item;
    return normalizedItem === normalizedValue;
  });
});

Handlebars.registerHelper('ricsGender', function(this: unknown, options: Handlebars.HelperOptions) {
  const context = this as Record<string, unknown>;
  const ricsCategory = context?.source?.rics?.category || context?.rics?.category;
  if (!ricsCategory || typeof ricsCategory !== 'string') return '';
  
  const tokens = ricsNormalizer.tokenize(ricsCategory);
  return ricsNormalizer.disambiguateGender(tokens) || '';
});

Handlebars.registerHelper('ricsMatch', function(this: unknown, tokenType: string, options: Handlebars.HelperOptions) {
  const context = this as Record<string, unknown>;
  const ricsCategory = context?.source?.rics?.category || context?.rics?.category;
  if (!ricsCategory || typeof ricsCategory !== 'string') return '';
  
  const result = ricsNormalizer.extractFromRICS(ricsCategory);
  const match = result.matches.find(m => {
    if (tokenType === 'gender') {
      return ["Men's", "Women's", 'Unisex', 'Kids', 'Boys', 'Girls', 'Grade School', 'Pre-School', 'Toddler', 'Infant'].includes(m.canonical);
    }
    if (tokenType === 'category') {
      return ['Footwear', 'Apparel', 'Accessories'].includes(m.canonical);
    }
    if (tokenType === 'subcategory') {
      return ['Sneakers', 'Boots', 'Sandals'].includes(m.canonical);
    }
    if (tokenType === 'color') {
      return ['Black', 'White', 'Red', 'Blue', 'Green', 'Gray', 'Navy', 'Pink', 'Purple', 'Brown', 'Orange', 'Yellow'].includes(m.canonical);
    }
    return false;
  });
  
  return match?.canonical || '';
});

// =============================================================================
// CONDITION EVALUATOR
// =============================================================================

/**
 * Evaluate a condition against an import row / product
 */
export function evaluateCondition(condition: Condition, data: ImportRow | Product): ConditionResult {
  const { source, matchType, value, options = {} } = condition;
  
  // Handle logical operators (and, or, not)
  if (matchType === 'and') {
    const conditions = value as Condition[];
    if (!Array.isArray(conditions)) {
      return { matches: false, confidence: 0, captures: {} };
    }
    
    let minConfidence = 1.0;
    const allCaptures: Record<string, unknown> = {};
    
    for (const subCondition of conditions) {
      const result = evaluateCondition(subCondition, data);
      if (!result.matches) {
        return { matches: false, confidence: 0, captures: {} };
      }
      minConfidence = Math.min(minConfidence, result.confidence);
      Object.assign(allCaptures, result.captures);
    }
    
    return { matches: true, confidence: minConfidence, captures: allCaptures };
  }
  
  if (matchType === 'or') {
    const conditions = value as Condition[];
    if (!Array.isArray(conditions)) {
      return { matches: false, confidence: 0, captures: {} };
    }
    
    let maxConfidence = 0;
    let bestCaptures: Record<string, unknown> = {};
    
    for (const subCondition of conditions) {
      const result = evaluateCondition(subCondition, data);
      if (result.matches && result.confidence > maxConfidence) {
        maxConfidence = result.confidence;
        bestCaptures = result.captures;
      }
    }
    
    if (maxConfidence > 0) {
      return { matches: true, confidence: maxConfidence, captures: bestCaptures };
    }
    return { matches: false, confidence: 0, captures: {} };
  }
  
  if (matchType === 'not') {
    const subCondition = value as Condition;
    const result = evaluateCondition(subCondition, data);
    return {
      matches: !result.matches,
      confidence: result.matches ? 0 : 1.0,
      captures: {},
    };
  }
  
  // Get source value from data
  if (!source) {
    return { matches: false, confidence: 0, captures: {} };
  }
  
  // Determine if we're dealing with ImportRow vs Product
  // ImportRow has 'normalized' and 'productId', Product has 'mpn'
  const isImportRow = 'normalized' in data && 'productId' in data;
  
  // Try to get the value - handle both ImportRow and Product formats
  let sourceValue = deepGet(data, source);
  
  if (sourceValue === undefined && !source.includes('.')) {
    // For ImportRow, try normalized.*
    if (isImportRow) {
      sourceValue = deepGet(data, `normalized.${source}`);
    } else {
      // For Product, try attributes.*
      sourceValue = deepGet(data, `attributes.${source}`);
    }
  }
  
  // Handle different match types
  switch (matchType) {
    case 'equals': {
      const caseInsensitive = options.caseInsensitive ?? false;
      let sourceStr = String(sourceValue ?? '');
      let valueStr = String(value ?? '');
      
      if (caseInsensitive) {
        sourceStr = sourceStr.toLowerCase();
        valueStr = valueStr.toLowerCase();
      }
      
      const matches = sourceStr === valueStr;
      return {
        matches,
        confidence: matches ? 1.0 : 0,
        captures: { raw: String(sourceValue ?? '') },
      };
    }
    
    case 'contains': {
      const caseInsensitive = options.caseInsensitive ?? true;
      
      if (Array.isArray(sourceValue)) {
        const found = sourceValue.some(item => {
          if (caseInsensitive) {
            return String(item).toLowerCase() === String(value).toLowerCase();
          }
          return item === value;
        });
        return {
          matches: found,
          confidence: found ? 0.95 : 0,
          captures: { raw: String(value) },
        };
      }
      
      let sourceStr = String(sourceValue ?? '');
      let valueStr = String(value ?? '');
      
      if (caseInsensitive) {
        sourceStr = sourceStr.toLowerCase();
        valueStr = valueStr.toLowerCase();
      }
      
      const matches = sourceStr.includes(valueStr);
      return {
        matches,
        confidence: matches ? 0.9 : 0,
        captures: { raw: String(sourceValue ?? '') },
      };
    }
    
    case 'regex': {
      const caseInsensitive = options.caseInsensitive ?? false;
      const flags = caseInsensitive ? 'i' : '';
      
      try {
        const regex = new RegExp(String(value), flags);
        const sourceStr = String(sourceValue ?? '');
        const match = sourceStr.match(regex);
        
        if (match) {
          return {
            matches: true,
            confidence: 0.95,
            captures: {
              raw: match[0],
              matchGroups: match.slice(1),
            },
          };
        }
      } catch {
        // Invalid regex
      }
      
      return { matches: false, confidence: 0, captures: {} };
    }
    
    case 'token': {
      // Use RICS normalizer for token matching (S2.2)
      let sourceTokens: string[];
      
      if (Array.isArray(sourceValue)) {
        sourceTokens = sourceValue.flatMap(v => ricsNormalizer.tokenize(String(v)));
      } else {
        sourceTokens = ricsNormalizer.tokenize(String(sourceValue ?? ''));
      }
      
      const matchValues = Array.isArray(value) ? value : [value];
      const matchTokens = matchValues.flatMap(v => ricsNormalizer.tokenize(String(v)));
      
      const matchedTokens: string[] = [];
      for (const matchToken of matchTokens) {
        // Check both direct match and dictionary lookup
        if (sourceTokens.includes(matchToken)) {
          matchedTokens.push(matchToken);
        } else {
          // Try dictionary lookup on the match token
          const dictEntry = ricsNormalizer.matchToken(matchToken);
          if (dictEntry) {
            const canonical = dictEntry.canonical.toLowerCase();
            const synonyms = dictEntry.synonyms.map(s => s.toLowerCase());
            
            // Check if source tokens include the canonical form or any synonym
            if (sourceTokens.includes(canonical) || 
                sourceTokens.some(t => synonyms.includes(t)) ||
                sourceTokens.some(t => ricsNormalizer.normalize(t) === ricsNormalizer.normalize(dictEntry.canonical))) {
              matchedTokens.push(dictEntry.canonical);
            }
          }
          
          // Also try looking up source tokens to find canonical match
          if (!matchedTokens.includes(matchToken)) {
            for (const sourceToken of sourceTokens) {
              const sourceDictEntry = ricsNormalizer.matchToken(sourceToken);
              if (sourceDictEntry && sourceDictEntry.canonical.toLowerCase() === matchToken) {
                matchedTokens.push(sourceDictEntry.canonical);
                break;
              }
            }
          }
        }
      }
      
      if (matchedTokens.length > 0) {
        const confidence = Math.min(0.95, 0.7 + (matchedTokens.length * 0.1));
        return {
          matches: true,
          confidence,
          captures: {
            raw: matchedTokens[0],
            tokens: matchedTokens,
          },
        };
      }
      
      return { matches: false, confidence: 0, captures: {} };
    }
    
    case 'in': {
      const allowedValues = value as unknown[];
      if (!Array.isArray(allowedValues)) {
        return { matches: false, confidence: 0, captures: {} };
      }
      
      const matches = allowedValues.includes(sourceValue);
      return {
        matches,
        confidence: matches ? 1.0 : 0,
        captures: { raw: String(sourceValue ?? '') },
      };
    }
    
    case 'exists': {
      const shouldExist = value as boolean;
      const exists = sourceValue !== undefined && sourceValue !== null && sourceValue !== '';
      const matches = exists === shouldExist;
      
      return {
        matches,
        confidence: matches ? 1.0 : 0,
        captures: exists ? { raw: String(sourceValue) } : {},
      };
    }
    
    case 'range': {
      const rangeValue = value as { min?: number; max?: number };
      const numericSource = Number(sourceValue);
      
      if (isNaN(numericSource)) {
        return { matches: false, confidence: 0, captures: {} };
      }
      
      let matches = true;
      if (rangeValue.min !== undefined && numericSource < rangeValue.min) {
        matches = false;
      }
      if (rangeValue.max !== undefined && numericSource > rangeValue.max) {
        matches = false;
      }
      
      return {
        matches,
        confidence: matches ? 0.95 : 0,
        captures: { raw: String(numericSource) },
      };
    }
    
    default:
      return { matches: false, confidence: 0, captures: {} };
  }
}

// =============================================================================
// TEMPLATE RENDERER
// =============================================================================

/**
 * Render a value template with context
 */
export function renderTemplate(
  template: string,
  context: { data: ImportRow | Product; captures: Record<string, unknown> }
): unknown {
  try {
    const data = context.data;
    const flatContext = {
      ...data,
      ...('normalized' in data ? data.normalized : {}),
      ...('attributes' in data ? data.attributes : {}),
      source: data.source,
      rics: data.source?.rics,
      captures: context.captures,
    };
    
    const compiled = Handlebars.compile(template);
    const result = compiled(flatContext);
    
    // Try to parse as JSON if it looks like a boolean or number
    if (result === 'true') return true;
    if (result === 'false') return false;
    const numResult = Number(result);
    if (!isNaN(numResult) && result.trim() !== '') return numResult;
    
    return result;
  } catch {
    return '';
  }
}

// =============================================================================
// SMART RULES ENGINE V2 (S2.1)
// =============================================================================

export class SmartRulesEngineV2 {
  private rules: SmartRule[] = [];
  private dictionary: DictionaryEntry[] = DEFAULT_RICS_DICTIONARY;
  private normalizer: RICSNormalizer;
  
  constructor(rules: SmartRule[] = [], dictionary?: DictionaryEntry[]) {
    this.rules = rules;
    if (dictionary) {
      this.dictionary = dictionary;
    }
    this.normalizer = new RICSNormalizer(this.dictionary);
  }
  
  /**
   * Set rules
   */
  setRules(rules: SmartRule[]): void {
    this.rules = rules;
  }
  
  /**
   * Set dictionary (S2.2)
   */
  setDictionary(dictionary: DictionaryEntry[]): void {
    this.dictionary = dictionary;
    this.normalizer = new RICSNormalizer(dictionary);
  }
  
  /**
   * Get currently loaded rules
   */
  getRules(): SmartRule[] {
    return this.rules;
  }
  
  /**
   * Evaluate rules for an import row (S2.1 - import-time only)
   * This is the primary entry point for import integration
   */
  evaluateForImport(importRow: ImportRow): EngineResult {
    const suggestions: Suggestion[] = [];
    const autoApplied: Suggestion[] = [];
    const errors: EngineError[] = [];
    const updates: Record<string, unknown> = {};
    const activityLog: ActivityLogEntry[] = [];
    const now = new Date().toISOString();
    
    // Sort rules by priority (desc) then ruleId (asc) for deterministic ordering
    const sortedRules = [...this.rules].sort((a, b) => {
      const priorityDiff = b.priority - a.priority;
      if (priorityDiff !== 0) return priorityDiff;
      return a.ruleId.localeCompare(b.ruleId);
    });
    
    // Track which fields already have suggestions (for conflict detection)
    const fieldSuggestions = new Map<string, Suggestion[]>();
    
    for (const rule of sortedRules) {
      // Skip disabled rules
      if (!rule.enabled) continue;
      
      try {
        // Defensive validation: Check rule structure
        if (!rule.action || !rule.action.targetField) {
          errors.push({
            ruleId: rule.ruleId || 'unknown',
            error: `Invalid rule structure: missing action.targetField`,
            code: 'INVALID_RULE_STRUCTURE',
          });
          continue;
        }
        
        // Validate target field (S2.3)
        const targetValidation = validateRuleTarget(rule.action.targetField);
        if (!targetValidation.valid) {
          errors.push({
            ruleId: rule.ruleId,
            error: targetValidation.error!,
            code: targetValidation.code!,
          });
          continue;
        }
        
        // Evaluate condition
        const condResult = evaluateCondition(rule.condition, importRow);
        
        if (!condResult.matches) continue;
        
        // Render value template
        let value = renderTemplate(rule.action.valueTemplate, {
          data: importRow,
          captures: condResult.captures,
        });
        
        // Validate generated value against registry domain (S2.3)
        const validation = validateGeneratedValue(rule.action.targetField, value);
        
        if (!validation.valid) {
          errors.push({
            ruleId: rule.ruleId,
            error: `Domain validation failed: ${validation.reason}`,
            code: 'DOMAIN_VALIDATION_FAILED',
          });
          continue;
        }
        
        // Use normalized value
        value = validation.normalizedValue;
        
        // Compute confidence
        const baseConfidence = condResult.confidence;
        const confidenceModifier = rule.action.confidenceModifier ?? 1.0;
        const confidence = Math.max(0, Math.min(1, baseConfidence * confidenceModifier));
        
        // Build input context for provenance
        const inputContext: Record<string, unknown> = {};
        if (importRow.source?.rics?.category) {
          inputContext.ricsCategory = importRow.source.rics.category;
        }
        if (condResult.captures.raw) {
          inputContext.matchedValue = condResult.captures.raw;
        }
        if (condResult.captures.tokens) {
          inputContext.matchedTokens = condResult.captures.tokens;
        }
        
        // Determine if auto-apply is allowed (S2.3 - honor onlyIfEmpty guardrail)
        const existingValue = importRow.existingProduct 
          ? deepGet(importRow.existingProduct, rule.action.targetField)
          : deepGet(importRow.normalized, extractAttributeName(rule.action.targetField));
        
        const userEdited = importRow.existingProduct 
          ? isUserEdited(importRow.existingProduct, rule.action.targetField)
          : false;
        
        // Check if field is empty (null, undefined, or empty string)
        const fieldIsEmpty = existingValue === undefined || existingValue === null || existingValue === '';
        
        // Honor onlyIfEmpty guardrail (Step 2.3: Engine honor guardrail)
        let canAutoApply = false;
        if (rule.autoApply && confidence >= rule.autoApplyConfidence && !userEdited) {
          if (rule.action.onlyIfEmpty === true) {
            // Guardrail active: only apply if target field is empty
            canAutoApply = fieldIsEmpty;
          } else {
            // No guardrail: apply regardless of existing value
            canAutoApply = true;
          }
        }
        
        // Use deterministic ID based on ruleId and targetField so suggestions
        // remain stable across multiple calls (needed for apply workflow)
        const deterministicId = `sug-${rule.ruleId}-${rule.action.targetField}`.toLowerCase().replace(/[^a-z0-9-]/g, '-');
        
        const suggestion: Suggestion = {
          id: deterministicId,
          ruleId: rule.ruleId,
          ruleName: rule.name,
          targetField: rule.action.targetField,
          value,
          confidence,
          autoApply: canAutoApply,
          applied: false,
          explain: `Matched rule "${rule.name}" (${rule.ruleId}) with confidence=${confidence.toFixed(2)}`,
          input: inputContext,
        };
        
        suggestions.push(suggestion);
        
        // Track for conflict detection
        const existing = fieldSuggestions.get(rule.action.targetField) || [];
        existing.push(suggestion);
        fieldSuggestions.set(rule.action.targetField, existing);
        
        // Auto-apply if allowed
        if (canAutoApply) {
          suggestion.applied = true;
          autoApplied.push(suggestion);
          
          // Set value in updates
          deepSet(updates, rule.action.targetField, value);
          
          // Set provenance (S2.4)
          const provenanceKey = `provenance.${rule.action.targetField.replace(/\./g, '_')}`;
          deepSet(updates, provenanceKey, {
            source: 'smartRule',
            ruleId: rule.ruleId,
            ruleName: rule.name,
            appliedAt: now,
            input: inputContext,
            reason: condResult.captures.tokens 
              ? `token match '${(condResult.captures.tokens as string[]).join("', '")}'`
              : `matched on '${condResult.captures.raw || 'condition'}'`,
          } satisfies FieldProvenance);
          
          // Track applied rule
          const trackingKey = `_appliedRules.${rule.action.targetField.replace(/\./g, '_')}`;
          deepSet(updates, trackingKey, {
            ruleId: rule.ruleId,
            confidence,
            appliedAt: now,
          });
          
          // Activity log entry (S2.4)
          activityLog.push({
            actor: 'system:smartRulesEngine',
            action: 'smartrule_auto_apply',
            timestamp: now,
            details: {
              ruleId: rule.ruleId,
              ruleName: rule.name,
              targetField: rule.action.targetField,
              value,
              confidence,
              input: inputContext,
            },
          });
        } else if (rule.autoApply && rule.action.onlyIfEmpty === true && !fieldIsEmpty) {
          // Log when guardrail prevents application (Step 2.3)
          activityLog.push({
            actor: 'system:smartRulesEngine',
            action: 'smartrule_guardrail_blocked',
            timestamp: now,
            details: {
              ruleId: rule.ruleId,
              ruleName: rule.name,
              targetField: rule.action.targetField,
              suggestedValue: value,
              confidence,
              existingValue,
              reason: 'GUARDRAIL_ONLY_IF_EMPTY',
              input: inputContext,
            },
          });
        }
      } catch (e) {
        errors.push({
          ruleId: rule.ruleId,
          error: e instanceof Error ? e.message : String(e),
          code: 'CONDITION_ERROR',
        });
      }
    }
    
    // Detect conflicts (S2.6)
    const conflicts = this.detectConflicts(importRow.productId, fieldSuggestions);
    
    // Store conflicts in updates if any (S2.6)
    if (conflicts.length > 0) {
      updates._smartConflicts = conflicts;
    }
    
    // Set metadata timestamps (S2.5 - idempotency)
    updates._smartRulesRanAt = now;
    updates._smartRulesSkipUntil = Date.now() + 10000; // 10 second skip window
    
    return { suggestions, conflicts, autoApplied, errors, updates, activityLog };
  }
  
  /**
   * Detect conflicts in suggestions (S2.6)
   */
  private detectConflicts(productId: string, fieldSuggestions: Map<string, Suggestion[]>): Conflict[] {
    const conflicts: Conflict[] = [];
    const now = new Date().toISOString();
    
    for (const [field, suggestions] of Array.from(fieldSuggestions.entries())) {
      if (suggestions.length <= 1) continue;
      
      // Check if values are different
      const uniqueValues = new Set(suggestions.map(s => JSON.stringify(s.value)));
      if (uniqueValues.size <= 1) continue;
      
      // Find highest priority suggestion
      const sortedByPriority = [...suggestions].sort((a, b) => {
        const ruleA = this.rules.find(r => r.ruleId === a.ruleId);
        const ruleB = this.rules.find(r => r.ruleId === b.ruleId);
        return (ruleB?.priority || 0) - (ruleA?.priority || 0);
      });
      
      // Create conflict
      conflicts.push({
        conflictId: generateId('conf'),
        productId,
        field,
        candidates: suggestions.map(s => {
          const rule = this.rules.find(r => r.ruleId === s.ruleId);
          return {
            ruleId: s.ruleId,
            ruleName: s.ruleName,
            value: s.value,
            confidence: s.confidence,
            priority: rule?.priority || 0,
            notes: s.explain,
          };
        }),
        createdAt: now,
        resolved: false,
        suggestedResolution: 'highest_priority',
      });
    }
    
    return conflicts;
  }
  
  /**
   * Get suggestions for a product without applying (S2.5 - admin test console)
   * Non-mutating - returns suggestions only
   */
  getProductSuggestions(product: Product): {
    suggestions: Suggestion[];
    conflicts: Conflict[];
    errors: EngineError[];
  } {
    // Convert product to import row format for evaluation
    const importRow: ImportRow = {
      productId: product.mpn,
      normalized: product.attributes || {},
      source: product.source,
      existingProduct: product,
    };
    
    const result = this.evaluateForImport(importRow);
    
    // Return suggestions without updates (non-mutating)
    return {
      suggestions: result.suggestions,
      conflicts: result.conflicts,
      errors: result.errors,
    };
  }
  
  /**
   * Test a single rule against a product (for admin testing)
   */
  testRule(
    rule: SmartRule,
    product: Product
  ): {
    matches: boolean;
    confidence: number;
    renderedValue: unknown;
    explain: string;
    wouldAutoApply: boolean;
    preview: { field: string; before: unknown; after: unknown };
    validationResult: { valid: boolean; reason?: string };
  } {
    // Validate target first
    const targetValidation = validateRuleTarget(rule.action.targetField);
    if (!targetValidation.valid) {
      return {
        matches: false,
        confidence: 0,
        renderedValue: null,
        explain: `Target validation failed: ${targetValidation.error}`,
        wouldAutoApply: false,
        preview: {
          field: rule.action.targetField,
          before: deepGet(product, rule.action.targetField),
          after: null,
        },
        validationResult: { valid: false, reason: targetValidation.error },
      };
    }
    
    const condResult = evaluateCondition(rule.condition, product);
    
    if (!condResult.matches) {
      return {
        matches: false,
        confidence: 0,
        renderedValue: null,
        explain: 'Condition did not match',
        wouldAutoApply: false,
        preview: {
          field: rule.action.targetField,
          before: deepGet(product, rule.action.targetField),
          after: null,
        },
        validationResult: { valid: true },
      };
    }
    
    const value = renderTemplate(rule.action.valueTemplate, {
      data: product,
      captures: condResult.captures,
    });
    
    // Validate generated value
    const valueValidation = validateGeneratedValue(rule.action.targetField, value);
    
    const confidence = Math.max(
      0,
      Math.min(1, condResult.confidence * (rule.action.confidenceModifier ?? 1.0))
    );
    
    const currentValue = deepGet(product, rule.action.targetField);
    const fieldIsEmpty = currentValue === undefined || currentValue === null || currentValue === '';
    
    const wouldAutoApply =
      rule.autoApply &&
      confidence >= rule.autoApplyConfidence &&
      !isUserEdited(product, rule.action.targetField) &&
      fieldIsEmpty;
    
    return {
      matches: true,
      confidence,
      renderedValue: valueValidation.valid ? valueValidation.normalizedValue : value,
      explain: `Matched with captures: ${JSON.stringify(condResult.captures)}`,
      wouldAutoApply,
      preview: {
        field: rule.action.targetField,
        before: currentValue,
        after: valueValidation.valid ? valueValidation.normalizedValue : value,
      },
      validationResult: valueValidation,
    };
  }
}

// =============================================================================
// EXPORTS
// =============================================================================

export default SmartRulesEngineV2;
