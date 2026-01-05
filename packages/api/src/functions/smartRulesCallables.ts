/**
 * Smart Rules Callable Functions
 * LP-smart-rules-engine-1.0.0: Admin API for Smart Rules testing and application
 * 
 * Provides:
 * - getProductSuggestions: Non-mutating preview of suggestions for a product
 * - applySuggestions: Apply selected suggestions with actor logging
 * - loadActiveRules: Get all active rules with caching
 * 
 * Per Lisa's S2 requirements (S2.5)
 */

import * as admin from 'firebase-admin';
import { onCall, HttpsError, CallableRequest } from 'firebase-functions/v2/https';
import { logger } from 'firebase-functions/v2';
import SmartRulesEngineV2, {
  type SmartRule,
  type Product,
  type Suggestion,
  type FieldProvenance,
  type ActivityLogEntry,
  type DictionaryEntry,
  DEFAULT_RICS_DICTIONARY,
  deepSet,
  deepGet,
  isUserEdited,
} from '../lib/smartEngineV2';

// ============================================================================
// Configuration
// ============================================================================

const SMART_RULES_SETTINGS = 'settings/smartRules/rules';
const DICTIONARY_SETTINGS = 'settings/smartRules/dictionary';
const PRODUCTS_COLLECTION = 'products';
const MAX_RULES = 100;

// Cache for rules (5 minute TTL)
let rulesCache: { rules: SmartRule[]; loadedAt: number } | null = null;
const RULES_CACHE_TTL_MS = 5 * 60 * 1000;

// Cache for dictionary
let dictionaryCache: { entries: DictionaryEntry[]; loadedAt: number } | null = null;
const DICTIONARY_CACHE_TTL_MS = 10 * 60 * 1000;

// ============================================================================
// Rules Loading with Caching
// ============================================================================

/**
 * Load active Smart Rules from Firestore with caching
 */
export async function loadActiveRules(forceRefresh = false): Promise<SmartRule[]> {
  // Check cache
  if (!forceRefresh && rulesCache && Date.now() - rulesCache.loadedAt < RULES_CACHE_TTL_MS) {
    return rulesCache.rules;
  }
  
  const db = admin.firestore();
  
  try {
    const snap = await db
      .collection(SMART_RULES_SETTINGS)
      .where('enabled', '==', true)
      .orderBy('priority', 'desc')
      .limit(MAX_RULES)
      .get();
    
    if (snap.empty) {
      logger.info('No active Smart Rules found in Firestore');
      rulesCache = { rules: [], loadedAt: Date.now() };
      return [];
    }
    
    const rules = snap.docs.map(doc => {
      const data = doc.data();
      
      // Convert actions array to single action object (backwards compatibility)
      let action = data.action;
      if (!action && data.actions && data.actions.length > 0) {
        // Use the first action from actions array
        action = data.actions[0];
      }
      
      // Convert conditions array to single condition object (backwards compatibility)
      let condition = data.condition;
      if (!condition && data.conditions && data.conditions.length > 0) {
        // Use the first condition from conditions array
        condition = data.conditions[0];
      }
      
      // Map 'field' to 'source' if needed (UI uses 'field', engine uses 'source')
      if (condition && condition.field && !condition.source) {
        logger.info(`[DEBUG] Mapping field→source for rule ${data.name}: ${condition.field}`);
        condition = {
          ...condition,
          source: condition.field,
        };
        delete condition.field;
      }
      
      // Debug log the final condition
      logger.info(`[DEBUG] Rule ${data.name} condition.source = ${condition?.source}, condition.field = ${condition?.field}`);
      
      return {
        ruleId: doc.id,
        name: data.name || doc.id,
        description: data.description,
        enabled: data.enabled ?? true,
        priority: data.priority ?? 0,
        tags: data.tags,
        condition: condition, // Single condition object expected by engine
        action: action, // Single action object expected by engine
        autoApply: data.autoApply ?? false,
        autoApplyConfidence: data.autoApplyConfidence ?? 0.9,
        createdBy: data.createdBy,
        createdAt: data.createdAt,
        updatedAt: data.updatedAt,
      } as SmartRule;
    });
    
    logger.info(`Loaded ${rules.length} active Smart Rules`);
    rulesCache = { rules, loadedAt: Date.now() };
    return rules;
  } catch (error) {
    logger.error('Error loading Smart Rules:', error);
    return rulesCache?.rules || [];
  }
}

/**
 * Load dictionary from Firestore with caching
 */
export async function loadDictionary(forceRefresh = false): Promise<DictionaryEntry[]> {
  // Check cache
  if (!forceRefresh && dictionaryCache && Date.now() - dictionaryCache.loadedAt < DICTIONARY_CACHE_TTL_MS) {
    return dictionaryCache.entries;
  }
  
  const db = admin.firestore();
  
  try {
    const snap = await db.collection(DICTIONARY_SETTINGS).get();
    
    if (snap.empty) {
      // Return default dictionary if none configured
      dictionaryCache = { entries: DEFAULT_RICS_DICTIONARY, loadedAt: Date.now() };
      return DEFAULT_RICS_DICTIONARY;
    }
    
    const entries = snap.docs.map(doc => {
      const data = doc.data();
      return {
        token: data.token,
        canonical: data.canonical,
        synonyms: data.synonyms,
        priority: data.priority,
      } as DictionaryEntry;
    });
    
    // Merge with defaults (custom entries take precedence)
    const customTokens = new Set(entries.map(e => e.token.toLowerCase()));
    const merged = [
      ...entries,
      ...DEFAULT_RICS_DICTIONARY.filter(d => !customTokens.has(d.token.toLowerCase())),
    ];
    
    dictionaryCache = { entries: merged, loadedAt: Date.now() };
    return merged;
  } catch (error) {
    logger.error('Error loading dictionary:', error);
    return dictionaryCache?.entries || DEFAULT_RICS_DICTIONARY;
  }
}

/**
 * Clear caches (called on rule/dictionary updates)
 */
export function clearSmartRulesCache(): void {
  rulesCache = null;
  dictionaryCache = null;
}

// ============================================================================
// getProductSuggestions Callable (S2.5)
// ============================================================================

interface GetSuggestionsRequest {
  productId: string;
}

interface GetSuggestionsResponse {
  productId: string;
  // Map to frontend-compatible RuleSuggestion format (Step 3 fix)
  suggestions: Array<{
    suggestionId: string;
    ruleId: string;
    ruleName: string;
    targetField: string;
    suggestedValue: unknown;
    confidence: number;
    reason: string;
    currentValue?: unknown;
    isOverwrite: boolean;
  }>;
  conflicts: Array<{
    conflictId: string;
    field: string;
    candidates: Array<{
      ruleId: string;
      ruleName: string;
      value: unknown;
      confidence: number;
      priority: number;
    }>;
    suggestedResolution: string;
  }>;
  errors: Array<{
    ruleId: string;
    error: string;
    code: string;
  }>;
  rulesEvaluated: number;
  evaluatedAt: string;
}

/**
 * Get suggestions for a product without applying them (non-mutating)
 * For Admin Rule Test Console
 */
export const getProductSuggestions = onCall<GetSuggestionsRequest, GetSuggestionsResponse>(
  {
    region: 'us-central1',
    memory: '256MiB',
    timeoutSeconds: 30,
  },
  async (request: CallableRequest<GetSuggestionsRequest>): Promise<GetSuggestionsResponse> => {
    // Require authentication
    if (!request.auth) {
      throw new HttpsError('unauthenticated', 'Must be authenticated to get suggestions');
    }
    
    const { productId } = request.data;
    
    if (!productId) {
      throw new HttpsError('invalid-argument', 'productId is required');
    }
    
    const db = admin.firestore();
    
    // Load product
    const productDoc = await db.collection(PRODUCTS_COLLECTION).doc(productId).get();
    
    if (!productDoc.exists) {
      throw new HttpsError('not-found', `Product ${productId} not found`);
    }
    
    const productData = productDoc.data()!;
    const product: Product = {
      mpn: productId,
      attributes: productData.attributes || {},
      source: productData.source,
      observations: productData.observations,
      descriptive: productData.descriptive,
      sku_core: productData.sku_core,
      _appliedRules: productData._appliedRules,
      _activityLog: productData._activityLog,
      _userEditedFields: productData._userEditedFields,
      provenance: productData.provenance,
    };
    
    // Load rules and dictionary
    const [rules, dictionary] = await Promise.all([
      loadActiveRules(),
      loadDictionary(),
    ]);
    
    // Create engine and evaluate
    const engine = new SmartRulesEngineV2(rules, dictionary);
    const result = engine.getProductSuggestions(product);
    
    logger.info(`getProductSuggestions for ${productId}: ${result.suggestions.length} suggestions, ${result.conflicts.length} conflicts`);
    
    return {
      productId,
      // Map backend Suggestion interface to frontend RuleSuggestion interface (Step 3 fix)
      suggestions: result.suggestions.map(suggestion => ({
        suggestionId: suggestion.id,
        ruleId: suggestion.ruleId,
        ruleName: suggestion.ruleName,
        targetField: suggestion.targetField,
        suggestedValue: suggestion.value,
        confidence: suggestion.confidence,
        reason: suggestion.explain,
        currentValue: product.attributes ? deepGet(product, suggestion.targetField) : undefined,
        isOverwrite: product.attributes ? (deepGet(product, suggestion.targetField) !== undefined) : false,
      })),
      conflicts: result.conflicts.map(c => ({
        conflictId: c.conflictId,
        field: c.field,
        candidates: c.candidates.map(cand => ({
          ruleId: cand.ruleId,
          ruleName: cand.ruleName,
          value: cand.value,
          confidence: cand.confidence,
          priority: cand.priority,
        })),
        suggestedResolution: c.suggestedResolution,
      })),
      errors: result.errors.map(e => ({
        ruleId: e.ruleId,
        error: e.error,
        code: e.code,
      })),
      rulesEvaluated: rules.length,
      evaluatedAt: new Date().toISOString(),
    };
  }
);

// ============================================================================
// applySuggestions Callable (S2.5)
// ============================================================================

interface ApplySuggestionsRequest {
  productId: string;
  suggestionIds: string[];
}

interface ApplySuggestionsResponse {
  productId: string;
  applied: Array<{
    suggestionId: string;
    targetField: string;
    value: unknown;
    success: boolean;
    reason?: string;
  }>;
  appliedCount: number;
  skippedCount: number;
  appliedAt: string;
  appliedBy: string;
}

/**
 * Apply selected suggestions to a product with actor logging
 */
export const applySuggestions = onCall<ApplySuggestionsRequest, ApplySuggestionsResponse>(
  {
    region: 'us-central1',
    memory: '256MiB',
    timeoutSeconds: 30,
  },
  async (request: CallableRequest<ApplySuggestionsRequest>): Promise<ApplySuggestionsResponse> => {
    // Require authentication
    if (!request.auth) {
      throw new HttpsError('unauthenticated', 'Must be authenticated to apply suggestions');
    }
    
    const { productId, suggestionIds } = request.data;
    const actorId = request.auth.uid;
    
    if (!productId) {
      throw new HttpsError('invalid-argument', 'productId is required');
    }
    
    if (!suggestionIds || suggestionIds.length === 0) {
      throw new HttpsError('invalid-argument', 'suggestionIds array is required');
    }
    
    const db = admin.firestore();
    const now = new Date().toISOString();
    
    // Load product
    const productRef = db.collection(PRODUCTS_COLLECTION).doc(productId);
    const productDoc = await productRef.get();
    
    if (!productDoc.exists) {
      throw new HttpsError('not-found', `Product ${productId} not found`);
    }
    
    const productData = productDoc.data()!;
    const product: Product = {
      mpn: productId,
      attributes: productData.attributes || {},
      source: productData.source,
      observations: productData.observations,
      descriptive: productData.descriptive,
      sku_core: productData.sku_core,
      _appliedRules: productData._appliedRules,
      _activityLog: productData._activityLog,
      _userEditedFields: productData._userEditedFields,
      provenance: productData.provenance,
    };
    
    // Load rules and dictionary, then get fresh suggestions
    const [rules, dictionary] = await Promise.all([
      loadActiveRules(),
      loadDictionary(),
    ]);
    
    const engine = new SmartRulesEngineV2(rules, dictionary);
    const result = engine.getProductSuggestions(product);
    
    // Build map of suggestion IDs to suggestions
    const suggestionMap = new Map(result.suggestions.map(s => [s.id, s]));
    
    // Apply requested suggestions
    const applied: ApplySuggestionsResponse['applied'] = [];
    const updates: Record<string, unknown> = {};
    const activityLog: ActivityLogEntry[] = [];
    let appliedCount = 0;
    let skippedCount = 0;
    
    for (const suggestionId of suggestionIds) {
      const suggestion = suggestionMap.get(suggestionId);
      
      if (!suggestion) {
        applied.push({
          suggestionId,
          targetField: 'unknown',
          value: null,
          success: false,
          reason: 'Suggestion not found or no longer valid',
        });
        skippedCount++;
        continue;
      }
      
      // Check if user-edited
      if (isUserEdited(product, suggestion.targetField)) {
        applied.push({
          suggestionId,
          targetField: suggestion.targetField,
          value: suggestion.value,
          success: false,
          reason: 'Field was user-edited',
        });
        skippedCount++;
        continue;
      }
      
      // Check if field already has value (set only if empty)
      // For registry attributes, check in attributes namespace
      const checkPath = suggestion.targetField.includes('.') ? suggestion.targetField : `attributes.${suggestion.targetField}`;
      const currentValue = deepGet(product, checkPath);
      if (currentValue !== undefined && currentValue !== null && currentValue !== '') {
        applied.push({
          suggestionId,
          targetField: suggestion.targetField,
          value: suggestion.value,
          success: false,
          reason: 'Field already has a value',
        });
        skippedCount++;
        continue;
      }
      
      // Apply the suggestion
      // For registry attributes, write to attributes namespace
      const targetPath = suggestion.targetField.includes('.') ? suggestion.targetField : `attributes.${suggestion.targetField}`;
      deepSet(updates, targetPath, suggestion.value);
      
      // Set provenance
      const provenanceKey = `provenance.${suggestion.targetField.replace(/\./g, '_')}`;
      deepSet(updates, provenanceKey, {
        source: 'smartRule',
        ruleId: suggestion.ruleId,
        ruleName: suggestion.ruleName,
        appliedAt: now,
        input: suggestion.input,
        reason: `Manually applied by ${actorId}`,
      } satisfies FieldProvenance);
      
      // Track applied rule
      const trackingKey = `_appliedRules.${suggestion.targetField.replace(/\./g, '_')}`;
      deepSet(updates, trackingKey, {
        ruleId: suggestion.ruleId,
        confidence: suggestion.confidence,
        appliedAt: now,
      });
      
      // Activity log
      activityLog.push({
        actor: actorId,
        action: 'smartrule_manual_apply',
        timestamp: now,
        details: {
          suggestionId,
          ruleId: suggestion.ruleId,
          ruleName: suggestion.ruleName,
          targetField: suggestion.targetField,
          value: suggestion.value,
          confidence: suggestion.confidence,
        },
      });
      
      applied.push({
        suggestionId,
        targetField: suggestion.targetField,
        value: suggestion.value,
        success: true,
      });
      appliedCount++;
    }
    
    // Write updates to Firestore
    if (appliedCount > 0) {
      updates._activityLog = admin.firestore.FieldValue.arrayUnion(...activityLog);
      updates._smartRulesRanAt = now;
      
      await productRef.update(updates);
      
      logger.info(`applySuggestions for ${productId}: ${appliedCount} applied, ${skippedCount} skipped by ${actorId}`);
    }
    
    return {
      productId,
      applied,
      appliedCount,
      skippedCount,
      appliedAt: now,
      appliedBy: actorId,
    };
  }
);

// ============================================================================
// resolveConflict Callable (S2.6)
// ============================================================================

interface ResolveConflictRequest {
  productId: string;
  conflictId: string;
  chosenRuleId: string;
}

interface ResolveConflictResponse {
  productId: string;
  conflictId: string;
  resolved: boolean;
  appliedValue: unknown;
  resolvedAt: string;
  resolvedBy: string;
}

/**
 * Resolve a conflict by choosing which rule's value to apply
 */
export const resolveConflict = onCall<ResolveConflictRequest, ResolveConflictResponse>(
  {
    region: 'us-central1',
    memory: '256MiB',
    timeoutSeconds: 30,
  },
  async (request: CallableRequest<ResolveConflictRequest>): Promise<ResolveConflictResponse> => {
    // Require authentication
    if (!request.auth) {
      throw new HttpsError('unauthenticated', 'Must be authenticated to resolve conflicts');
    }
    
    const { productId, conflictId, chosenRuleId } = request.data;
    const actorId = request.auth.uid;
    
    if (!productId || !conflictId || !chosenRuleId) {
      throw new HttpsError('invalid-argument', 'productId, conflictId, and chosenRuleId are required');
    }
    
    const db = admin.firestore();
    const now = new Date().toISOString();
    
    // Load product
    const productRef = db.collection(PRODUCTS_COLLECTION).doc(productId);
    const productDoc = await productRef.get();
    
    if (!productDoc.exists) {
      throw new HttpsError('not-found', `Product ${productId} not found`);
    }
    
    const productData = productDoc.data()!;
    const conflicts = productData._smartConflicts || [];
    
    // Find the conflict
    const conflictIndex = conflicts.findIndex((c: any) => c.conflictId === conflictId);
    if (conflictIndex === -1) {
      throw new HttpsError('not-found', `Conflict ${conflictId} not found`);
    }
    
    const conflict = conflicts[conflictIndex];
    
    // Find the chosen candidate
    const candidate = conflict.candidates.find((c: any) => c.ruleId === chosenRuleId);
    if (!candidate) {
      throw new HttpsError('invalid-argument', `Rule ${chosenRuleId} not in conflict candidates`);
    }
    
    // Apply the chosen value
    const updates: Record<string, unknown> = {};
    deepSet(updates, conflict.field, candidate.value);
    
    // Set provenance
    const provenanceKey = `provenance.${conflict.field.replace(/\./g, '_')}`;
    deepSet(updates, provenanceKey, {
      source: 'smartRule',
      ruleId: candidate.ruleId,
      ruleName: candidate.ruleName,
      appliedAt: now,
      reason: `Conflict resolved by ${actorId}, chose rule ${candidate.ruleName}`,
    } satisfies FieldProvenance);
    
    // Mark conflict as resolved
    conflict.resolved = true;
    conflict.resolution = {
      chosenRuleId,
      resolvedBy: actorId,
      resolvedAt: now,
    };
    conflicts[conflictIndex] = conflict;
    updates._smartConflicts = conflicts;
    
    // Activity log
    const activityEntry: ActivityLogEntry = {
      actor: actorId,
      action: 'conflict_resolved',
      timestamp: now,
      details: {
        conflictId,
        field: conflict.field,
        chosenRuleId,
        chosenValue: candidate.value,
        otherCandidates: conflict.candidates.filter((c: any) => c.ruleId !== chosenRuleId).length,
      },
    };
    updates._activityLog = admin.firestore.FieldValue.arrayUnion(activityEntry);
    
    await productRef.update(updates);
    
    logger.info(`Conflict ${conflictId} resolved for ${productId} by ${actorId}, chose rule ${chosenRuleId}`);
    
    return {
      productId,
      conflictId,
      resolved: true,
      appliedValue: candidate.value,
      resolvedAt: now,
      resolvedBy: actorId,
    };
  }
);
