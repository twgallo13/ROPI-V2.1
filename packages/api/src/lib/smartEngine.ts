/**
 * ROPI Smart Rules Engine
 * ========================
 * Deterministic rule system for converting structured signals (RICS tokens,
 * product attributes, observation AI outputs) into reliable suggestions and safe auto-fills.
 * 
 * Based on: ROPI AOSS v1.0 — Section 4 (Smart Rules)
 * Generated: 2025-11-28
 * LP-smart-rules-3.1.0: Domain validation integration
 * 
 * Features:
 * - Condition evaluation (equals, contains, regex, token, in, exists, range, and/or/not)
 * - Template rendering with safe helpers (Handlebars subset)
 * - Auto-apply logic with safety checks (no silent overwrites)
 * - Conflict detection and resolution
 * - Activity logging for audit trail
 * - Domain validation against attribute registry (LP-smart-rules-3.1.0)
 */

import Handlebars from 'handlebars';
import type { AttributeDefinition } from '../services/attributeValidator';

// =============================================================================
// TYPE DEFINITIONS
// =============================================================================

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
}

/**
 * Post-action types (e.g., addTag, createActivityLog)
 */
export interface PostAction {
  type: 'addTag' | 'createActivityLog' | 'enqueueJob';
  payload: Record<string, unknown>;
}

/**
 * Complete Smart Rule definition
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
  autoApply: boolean;
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
 * Suggestion produced by the engine
 */
export interface Suggestion {
  id: string;
  ruleId: string;
  targetField: string;
  value: unknown;
  confidence: number;
  autoApply: boolean;
  applied: boolean;
  explain: string;
}

/**
 * Conflict when multiple rules suggest different values for same field
 */
export interface Conflict {
  conflictId: string;
  productId: string;
  field: string;
  candidates: {
    ruleId: string;
    value: unknown;
    confidence: number;
    notes: string;
  }[];
  createdAt: string;
  resolved: boolean;
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
  actor: string;
  action: string;
  timestamp: string;
  details: Record<string, unknown>;
}

/**
 * ROPI Product document shape (simplified for engine)
 */
export interface Product {
  mpn: string;
  skus?: string[];
  exportSku?: string;
  customMessage?: string;
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
}

/**
 * Engine run result
 */
export interface EngineResult {
  suggestions: Suggestion[];
  conflicts: Conflict[];
  autoApplied: Suggestion[];
  errors: { ruleId: string; error: string }[];
}

// =============================================================================
// SYNONYM MAP (for token normalization)
// =============================================================================

const SYNONYM_MAP: Record<string, string> = {
  'mens': "men's",
  'men': "men's",
  'womens': "women's",
  'women': "women's",
  'kids': 'kids',
  'boys': 'boys',
  'girls': 'girls',
  'grade-school': 'grade school',
  'gradeschool': 'grade school',
  'pre-school': 'pre-school',
  'preschool': 'pre-school',
  'blk': 'black',
  'wht': 'white',
  'gry': 'gray',
  'grey': 'gray',
  'rd': 'red',
  'blu': 'blue',
  'grn': 'green',
  'ylw': 'yellow',
  'pnk': 'pink',
  'purp': 'purple',
  'org': 'orange',
  'brn': 'brown',
  'nvy': 'navy',
  'running': 'running',
  'basketball': 'basketball',
  'skate': 'skate',
  'skateboarding': 'skate',
  'casual': 'casual',
  'dress': 'dress',
  'athletic': 'athletic',
  'footwear': 'footwear',
  'apparel': 'apparel',
  'accessories': 'accessories',
};

// =============================================================================
// DOMAIN VALIDATION (LP-smart-rules-3.1.0)
// =============================================================================

/**
 * Validate a generated value against the attribute registry domain
 * Returns the validated (possibly normalized) value, or null if invalid
 */
export function validateGeneratedValue(
  targetField: string,
  value: unknown,
  registry: Map<string, AttributeDefinition>
): { valid: boolean; normalizedValue: unknown; reason?: string } {
  // Extract attribute name from target field (e.g., "attributes.gender" -> "gender")
  const parts = targetField.split('.');
  const attrName = parts[parts.length - 1];
  
  // Look up in registry
  const attrDef = registry.get(attrName);
  
  // If not in registry, allow value (unknown attributes are handled elsewhere)
  if (!attrDef) {
    return { valid: true, normalizedValue: value };
  }
  
  // If attribute has no allowed_values constraint, allow any value
  if (!attrDef.allowed_values || attrDef.allowed_values.length === 0) {
    return { valid: true, normalizedValue: value };
  }
  
  // Only validate enum/select/multiSelect types
  if (attrDef.data_type !== 'enum' && attrDef.data_type !== 'multiSelect') {
    return { valid: true, normalizedValue: value };
  }
  
  // Handle null/empty values (allow through)
  if (value === null || value === undefined || value === '') {
    return { valid: true, normalizedValue: value };
  }
  
  const strValue = String(value).trim();
  const allowedValues = attrDef.allowed_values;
  const synonyms = attrDef.synonyms || {};
  
  // Map synonym to canonical value
  const mapped = synonyms[strValue] || synonyms[strValue.toLowerCase()] || strValue;
  
  // Check if value is allowed (case-insensitive)
  const match = allowedValues.find(av => av.toLowerCase() === mapped.toLowerCase());
  
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
// ALLOWED TARGET FIELDS (security - prevent writing to sensitive fields)
// =============================================================================

const ALLOWED_TARGET_FIELDS: Set<string> = new Set([
  // Descriptive fields
  'descriptive.gender',
  'descriptive.ageGroup',
  'descriptive.primaryColor',
  'descriptive.secondaryColor',
  'descriptive.material',
  'descriptive.closureType',
  'descriptive.heelType',
  'descriptive.heelHeight',
  'descriptive.platformHeight',
  'descriptive.toeStyle',
  'descriptive.pattern',
  'descriptive.style',
  'descriptive.silhouette',
  'descriptive.familySizing',
  'descriptive.siteDescriptions.shiekh.title',
  'descriptive.siteDescriptions.shiekh.description',
  'descriptive.siteDescriptions.karmaloop.title',
  'descriptive.siteDescriptions.karmaloop.description',
  'descriptive.siteDescriptions.mltd.title',
  'descriptive.siteDescriptions.mltd.description',
  'descriptive.siteDescriptions.sangremia.title',
  'descriptive.siteDescriptions.sangremia.description',
  // SKU core fields
  'sku_core.name',
  'sku_core.brand',
  'sku_core.department',
  'sku_core.category',
  'sku_core.subCategory',
  'sku_core.class',
  // Attributes (via attributes object)
  'attributes.gender',
  'attributes.ageGroup',
  'attributes.primaryColor',
  'attributes.secondaryColor',
  'attributes.material',
  'attributes.closureType',
  'attributes.heelType',
  'attributes.heelHeight',
  'attributes.platformHeight',
  'attributes.toeStyle',
  'attributes.pattern',
  'attributes.style',
  'attributes.silhouette',
  'attributes.familySizing',
  'attributes.sportsLeague',
  'attributes.sportsTeam',
  'attributes.taxClass',
  'attributes.promoAllowed',
]);

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
 * Normalize a token for matching
 */
export function normalizeToken(token: string): string {
  const normalized = token
    .toLowerCase()
    .replace(/[^a-z0-9\s-]/g, '')
    .replace(/\s+/g, ' ')
    .trim();
  
  return SYNONYM_MAP[normalized] || normalized;
}

/**
 * Tokenize a string (split on spaces and punctuation)
 */
export function tokenize(str: string): string[] {
  if (!str || typeof str !== 'string') return [];
  
  // Split on pipes first (RICS category format)
  const pipeTokens = str.split('|');
  
  // Then split each part on spaces and punctuation
  const tokens: string[] = [];
  for (const part of pipeTokens) {
    const subTokens = part
      .toLowerCase()
      .replace(/[^a-z0-9\s-]/g, ' ')
      .split(/\s+/)
      .filter(t => t.length > 0);
    tokens.push(...subTokens);
  }
  
  return tokens.map(normalizeToken);
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
 * Validate target field is allowed
 */
export function isAllowedTargetField(field: string): boolean {
  // Check exact match
  if (ALLOWED_TARGET_FIELDS.has(field)) return true;
  
  // Check if it starts with an allowed prefix (for nested attributes)
  for (const allowed of ALLOWED_TARGET_FIELDS) {
    if (field.startsWith(allowed + '.')) return true;
  }
  
  return false;
}

// =============================================================================
// HANDLEBARS TEMPLATE HELPERS (safe subset)
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
  const normalizedValue = typeof value === 'string' ? normalizeToken(value) : value;
  return arr.some(item => {
    const normalizedItem = typeof item === 'string' ? normalizeToken(item) : item;
    return normalizedItem === normalizedValue;
  });
});

Handlebars.registerHelper('firstMatch', (tokens: unknown, candidates: unknown) => {
  if (!Array.isArray(tokens) || !Array.isArray(candidates)) return '';
  
  for (const candidate of candidates) {
    const normalizedCandidate = normalizeToken(String(candidate));
    if (tokens.some(t => normalizeToken(String(t)) === normalizedCandidate)) {
      // Return capitalized version
      return String(candidate).charAt(0).toUpperCase() + String(candidate).slice(1);
    }
  }
  return '';
});

Handlebars.registerHelper('normalizeColor', (color: unknown) => {
  if (typeof color !== 'string') return '';
  const normalized = normalizeToken(color);
  // Capitalize first letter of each word
  return normalized
    .split(' ')
    .map(w => w.charAt(0).toUpperCase() + w.slice(1))
    .join(' ');
});

Handlebars.registerHelper('normalizeName', (name: unknown) => {
  if (typeof name !== 'string') return '';
  // Remove any UUIDs, clean up, capitalize words
  return name
    .replace(/[a-f0-9]{8}-[a-f0-9]{4}-[a-f0-9]{4}-[a-f0-9]{4}-[a-f0-9]{12}/gi, '')
    .replace(/\s+/g, ' ')
    .trim()
    .split(' ')
    .map(w => w.charAt(0).toUpperCase() + w.slice(1).toLowerCase())
    .join(' ');
});

Handlebars.registerHelper('regexGroup', (index: number, options: Handlebars.HelperOptions) => {
  const matchGroups = options.data?.root?.captures?.matchGroups;
  if (!Array.isArray(matchGroups) || index >= matchGroups.length) return '';
  return matchGroups[index];
});

Handlebars.registerHelper('tokenNormalized', (options: Handlebars.HelperOptions) => {
  const raw = options.data?.root?.captures?.raw;
  if (typeof raw !== 'string') return '';
  return normalizeToken(raw);
});

// =============================================================================
// CONDITION EVALUATOR
// =============================================================================

/**
 * Evaluate a condition against a product
 */
export function evaluateCondition(condition: Condition, product: Product): ConditionResult {
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
      const result = evaluateCondition(subCondition, product);
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
      const result = evaluateCondition(subCondition, product);
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
    const result = evaluateCondition(subCondition, product);
    return {
      matches: !result.matches,
      confidence: result.matches ? 0 : 1.0,
      captures: {},
    };
  }
  
  // Get source value from product
  if (!source) {
    return { matches: false, confidence: 0, captures: {} };
  }
  
  const sourceValue = deepGet(product, source);
  
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
        // Array contains value
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
      
      // String contains substring
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
      } catch (e) {
        console.error(`Invalid regex pattern: ${value}`, e);
      }
      
      return { matches: false, confidence: 0, captures: {} };
    }
    
    case 'token': {
      // Tokenize source value
      let sourceTokens: string[];
      
      if (Array.isArray(sourceValue)) {
        sourceTokens = sourceValue.flatMap(v => tokenize(String(v)));
      } else {
        sourceTokens = tokenize(String(sourceValue ?? ''));
      }
      
      // Tokenize match values
      const matchValues = Array.isArray(value) ? value : [value];
      const matchTokens = matchValues.flatMap(v => tokenize(String(v)));
      
      // Check for token matches
      const matchedTokens: string[] = [];
      for (const matchToken of matchTokens) {
        if (sourceTokens.includes(matchToken)) {
          matchedTokens.push(matchToken);
        }
      }
      
      if (matchedTokens.length > 0) {
        // Confidence based on how many tokens matched
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
 * Render a value template with product context
 */
export function renderTemplate(
  template: string,
  context: { product: Product; captures: Record<string, unknown> }
): unknown {
  try {
    // Flatten context for template access
    const flatContext = {
      ...context.product,
      ...context.product.source,
      ...context.product.attributes,
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
  } catch (e) {
    console.error(`Template rendering error: ${template}`, e);
    return '';
  }
}

// =============================================================================
// SMART RULES ENGINE
// =============================================================================

export class SmartRulesEngine {
  private rules: SmartRule[] = [];
  private registry: Map<string, AttributeDefinition> | null = null;
  
  constructor(rules: SmartRule[] = [], registry?: Map<string, AttributeDefinition>) {
    this.rules = rules;
    this.registry = registry || null;
  }
  
  /**
   * Load rules (would typically come from Firestore)
   */
  setRules(rules: SmartRule[]): void {
    this.rules = rules;
  }
  
  /**
   * Set the attribute registry for domain validation (LP-smart-rules-3.1.0)
   */
  setRegistry(registry: Map<string, AttributeDefinition>): void {
    this.registry = registry;
  }
  
  /**
   * Get currently loaded rules
   */
  getRules(): SmartRule[] {
    return this.rules;
  }
  
  /**
   * Evaluate all rules against a product
   */
  async evaluateRulesForProduct(product: Product): Promise<EngineResult> {
    const suggestions: Suggestion[] = [];
    const autoApplied: Suggestion[] = [];
    const errors: { ruleId: string; error: string }[] = [];
    
    // Sort rules by priority (desc) then ruleId (asc) for deterministic ordering
    const sortedRules = [...this.rules].sort((a, b) => {
      const priorityDiff = b.priority - a.priority;
      if (priorityDiff !== 0) return priorityDiff;
      return a.ruleId.localeCompare(b.ruleId);
    });
    
    for (const rule of sortedRules) {
      // Skip disabled rules
      if (!rule.enabled) continue;
      
      try {
        // Validate target field is allowed
        if (!isAllowedTargetField(rule.action.targetField)) {
          errors.push({
            ruleId: rule.ruleId,
            error: `Target field not allowed: ${rule.action.targetField}`,
          });
          continue;
        }
        
        // Evaluate condition
        const condResult = evaluateCondition(rule.condition, product);
        
        if (!condResult.matches) continue;
        
        // Render value template
        let value = renderTemplate(rule.action.valueTemplate, {
          product,
          captures: condResult.captures,
        });
        
        // LP-smart-rules-3.1.0: Validate generated value against registry domain
        if (this.registry) {
          const validation = validateGeneratedValue(
            rule.action.targetField,
            value,
            this.registry
          );
          
          if (!validation.valid) {
            // Discard suggestion - value doesn't match allowed domain
            console.warn(
              `Smart Rule '${rule.ruleId}' generated invalid value for '${rule.action.targetField}': ${validation.reason}`
            );
            errors.push({
              ruleId: rule.ruleId,
              error: `Domain validation failed: ${validation.reason}`,
            });
            continue;
          }
          
          // Use normalized value (correct casing)
          value = validation.normalizedValue;
        }
        
        // Compute confidence
        const baseConfidence = condResult.confidence;
        const confidenceModifier = rule.action.confidenceModifier ?? 1.0;
        const confidence = Math.max(0, Math.min(1, baseConfidence * confidenceModifier));
        
        // Determine if auto-apply is allowed
        const currentValue = deepGet(product, rule.action.targetField);
        const userEdited = isUserEdited(product, rule.action.targetField);
        const previouslyApplied = product._appliedRules?.[rule.action.targetField];
        
        let canAutoApply = false;
        if (
          rule.autoApply &&
          confidence >= rule.autoApplyConfidence &&
          !userEdited &&
          (currentValue === undefined || currentValue === null)
        ) {
          canAutoApply = true;
        }
        
        // Check if a higher priority rule already applied
        if (
          canAutoApply &&
          previouslyApplied &&
          previouslyApplied.ruleId !== rule.ruleId
        ) {
          // Only override if this rule has strictly higher confidence
          const prevRule = this.rules.find(r => r.ruleId === previouslyApplied.ruleId);
          if (prevRule && prevRule.priority >= rule.priority) {
            canAutoApply = false;
          }
        }
        
        const suggestion: Suggestion = {
          id: generateId('sug'),
          ruleId: rule.ruleId,
          targetField: rule.action.targetField,
          value,
          confidence,
          autoApply: canAutoApply,
          applied: false,
          explain: `Matched rule "${rule.name}" (${rule.ruleId}) with confidence=${confidence.toFixed(2)}`,
        };
        
        suggestions.push(suggestion);
        
        // Track auto-applied for later processing
        if (canAutoApply) {
          autoApplied.push(suggestion);
        }
      } catch (e) {
        errors.push({
          ruleId: rule.ruleId,
          error: e instanceof Error ? e.message : String(e),
        });
      }
    }
    
    // Detect conflicts (multiple suggestions for same field with different values)
    const conflicts = this.detectConflicts(product.mpn, suggestions);
    
    return { suggestions, conflicts, autoApplied, errors };
  }
  
  /**
   * Detect conflicts in suggestions
   */
  private detectConflicts(productId: string, suggestions: Suggestion[]): Conflict[] {
    const fieldMap = new Map<string, Suggestion[]>();
    
    // Group suggestions by target field
    for (const suggestion of suggestions) {
      const existing = fieldMap.get(suggestion.targetField) || [];
      existing.push(suggestion);
      fieldMap.set(suggestion.targetField, existing);
    }
    
    const conflicts: Conflict[] = [];
    
    // Find fields with multiple different values
    for (const [field, fieldSuggestions] of fieldMap) {
      if (fieldSuggestions.length <= 1) continue;
      
      // Check if values are different
      const uniqueValues = new Set(fieldSuggestions.map(s => JSON.stringify(s.value)));
      if (uniqueValues.size <= 1) continue;
      
      // Create conflict
      conflicts.push({
        conflictId: generateId('conf'),
        productId,
        field,
        candidates: fieldSuggestions.map(s => ({
          ruleId: s.ruleId,
          value: s.value,
          confidence: s.confidence,
          notes: s.explain,
        })),
        createdAt: new Date().toISOString(),
        resolved: false,
      });
    }
    
    return conflicts;
  }
  
  /**
   * Apply a suggestion to a product (returns the update to make)
   */
  applySuggestion(
    product: Product,
    suggestion: Suggestion,
    appliedBy: string
  ): { 
    success: boolean; 
    reason?: string; 
    updates?: Record<string, unknown>;
    activityLog?: ActivityLogEntry;
  } {
    // Check if user-edited
    if (isUserEdited(product, suggestion.targetField)) {
      return { success: false, reason: 'user_edited' };
    }
    
    // Get current value
    const currentValue = deepGet(product, suggestion.targetField);
    
    // Check for no-op
    if (currentValue === suggestion.value) {
      return { success: false, reason: 'noop' };
    }
    
    // Build updates object
    const updates: Record<string, unknown> = {};
    deepSet(updates, suggestion.targetField, suggestion.value);
    
    // Track applied rule
    updates[`_appliedRules.${suggestion.targetField.replace(/\./g, '_')}`] = {
      ruleId: suggestion.ruleId,
      confidence: suggestion.confidence,
      appliedAt: new Date().toISOString(),
    };
    
    // Build activity log entry
    const activityLog: ActivityLogEntry = {
      actor: appliedBy,
      action: 'smartrule_apply',
      timestamp: new Date().toISOString(),
      details: {
        ruleId: suggestion.ruleId,
        targetField: suggestion.targetField,
        before: currentValue,
        after: suggestion.value,
        confidence: suggestion.confidence,
      },
    };
    
    return { success: true, updates, activityLog };
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
  } {
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
      };
    }
    
    const value = renderTemplate(rule.action.valueTemplate, {
      product,
      captures: condResult.captures,
    });
    
    const confidence = Math.max(
      0,
      Math.min(1, condResult.confidence * (rule.action.confidenceModifier ?? 1.0))
    );
    
    const currentValue = deepGet(product, rule.action.targetField);
    const wouldAutoApply =
      rule.autoApply &&
      confidence >= rule.autoApplyConfidence &&
      !isUserEdited(product, rule.action.targetField) &&
      (currentValue === undefined || currentValue === null);
    
    return {
      matches: true,
      confidence,
      renderedValue: value,
      explain: `Matched with captures: ${JSON.stringify(condResult.captures)}`,
      wouldAutoApply,
      preview: {
        field: rule.action.targetField,
        before: currentValue,
        after: value,
      },
    };
  }
}

// =============================================================================
// EXPORTS
// =============================================================================

export default SmartRulesEngine;
