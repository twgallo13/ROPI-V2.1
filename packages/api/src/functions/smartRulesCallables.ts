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
      return {
        ruleId: doc.id,
        name: data.name || doc.id,
        description: data.description,
        enabled: data.enabled ?? true,
        priority: data.priority ?? 0,
        tags: data.tags,
        condition: data.condition,
        action: data.action,
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
  suggestions: Suggestion[];
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
      suggestions: result.suggestions,
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
      const currentValue = deepGet(product, suggestion.targetField);
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
      deepSet(updates, suggestion.targetField, suggestion.value);
      
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

// ============================================================================
// Admin CRUD Callables (LP-smart-rules-admin-1.0.0)
// ============================================================================

/**
 * Load attribute registry for validation
 * Rejects internalOnly fields as targets
 */
async function validateTargetField(field: string): Promise<{ valid: boolean; reason?: string }> {
  // Import attribute registry
  try {
    // eslint-disable-next-line @typescript-eslint/no-var-requires
    const registry = require('@ropi/sdk/config/attributeRegistry.json');
    const attributes: Array<{ attribute_id: string; exportable?: boolean; internalOnly?: boolean }> = registry.attributes || [];
    
    // Extract attribute name from path like "attributes.gender"
    const attrName = field.startsWith('attributes.') ? field.slice(11) : field;
    
    const attrConfig = attributes.find(a => a.attribute_id === attrName);
    
    if (!attrConfig) {
      // Unknown field - allow but warn
      logger.warn(`Target field "${attrName}" not found in registry, allowing`);
      return { valid: true, reason: 'Unknown field - not in registry' };
    }
    
    if (attrConfig.internalOnly) {
      return { 
        valid: false, 
        reason: `Field "${attrName}" is marked as internalOnly and cannot be set by Smart Rules` 
      };
    }
    
    return { valid: true };
  } catch (error) {
    logger.error('Error loading attribute registry:', error);
    return { valid: true, reason: 'Could not validate - registry load failed' };
  }
}

/**
 * Write audit entry for admin actions
 */
async function writeAdminAudit(
  ruleId: string,
  action: 'create' | 'update' | 'delete' | 'enable' | 'disable',
  actorId: string,
  actorEmail?: string,
  changes?: { before?: unknown; after?: unknown }
): Promise<void> {
  const db = admin.firestore();
  const auditId = `audit_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`;
  
  try {
    await db.collection('settings/smartRules/audit').doc(auditId).set({
      auditId,
      ruleId,
      action,
      actorId,
      actorEmail: actorEmail || null,
      timestamp: new Date().toISOString(),
      changes: changes || null,
    });
  } catch (error) {
    logger.error('Failed to write audit entry:', error);
    // Don't throw - audit failures shouldn't block operations
  }
}

// ============================================================================
// createSmartRule Callable (Admin)
// ============================================================================

interface CreateSmartRuleRequest {
  name: string;
  description?: string;
  enabled?: boolean;
  priority?: number;
  condition: unknown;
  action: {
    targetField: string;
    valueTemplate: string;
    confidenceModifier?: number;
  };
  autoApply?: boolean;
  autoApplyConfidence?: number;
  tags?: string[];
  packId?: string;
}

interface CreateSmartRuleResponse {
  ruleId: string;
  success: boolean;
  error?: string;
}

export const createSmartRuleAdmin = onCall<CreateSmartRuleRequest, CreateSmartRuleResponse>(
  {
    region: 'us-central1',
    memory: '256MiB',
    timeoutSeconds: 30,
  },
  async (request: CallableRequest<CreateSmartRuleRequest>): Promise<CreateSmartRuleResponse> => {
    // Require authentication
    if (!request.auth) {
      throw new HttpsError('unauthenticated', 'Must be authenticated to create rules');
    }
    
    const { name, description, enabled, priority, condition, action, autoApply, autoApplyConfidence, tags, packId } = request.data;
    const actorId = request.auth.uid;
    const actorEmail = request.auth.token.email;
    
    // Validate required fields
    if (!name || !condition || !action?.targetField || !action?.valueTemplate) {
      throw new HttpsError('invalid-argument', 'name, condition, action.targetField, and action.valueTemplate are required');
    }
    
    // Validate target field (reject internalOnly)
    const targetValidation = await validateTargetField(action.targetField);
    if (!targetValidation.valid) {
      logger.warn(`Rejected rule creation: ${targetValidation.reason}`);
      return { ruleId: '', success: false, error: targetValidation.reason };
    }
    
    const db = admin.firestore();
    const now = new Date().toISOString();
    const ruleId = `rule_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`;
    
    const ruleData = {
      name,
      description: description || null,
      enabled: enabled ?? true,
      priority: priority ?? 1000,
      condition,
      action: {
        targetField: action.targetField,
        valueTemplate: action.valueTemplate,
        confidenceModifier: action.confidenceModifier ?? null,
      },
      autoApply: autoApply ?? false,
      autoApplyConfidence: autoApplyConfidence ?? 0.9,
      tags: tags || [],
      packId: packId || null,
      createdBy: actorId,
      createdAt: now,
      updatedBy: actorId,
      updatedAt: now,
    };
    
    try {
      await db.collection(SMART_RULES_SETTINGS).doc(ruleId).set(ruleData);
      
      // Clear cache
      rulesCache = null;
      
      // Write audit
      await writeAdminAudit(ruleId, 'create', actorId, actorEmail, { after: ruleData });
      
      logger.info(`Smart Rule ${ruleId} created by ${actorId}`);
      return { ruleId, success: true };
    } catch (error) {
      logger.error('Error creating Smart Rule:', error);
      throw new HttpsError('internal', 'Failed to create rule');
    }
  }
);

// ============================================================================
// updateSmartRule Callable (Admin)
// ============================================================================

interface UpdateSmartRuleRequest {
  ruleId: string;
  updates: Partial<Omit<CreateSmartRuleRequest, 'condition'>> & { condition?: unknown };
}

interface UpdateSmartRuleResponse {
  success: boolean;
  error?: string;
}

export const updateSmartRuleAdmin = onCall<UpdateSmartRuleRequest, UpdateSmartRuleResponse>(
  {
    region: 'us-central1',
    memory: '256MiB',
    timeoutSeconds: 30,
  },
  async (request: CallableRequest<UpdateSmartRuleRequest>): Promise<UpdateSmartRuleResponse> => {
    // Require authentication
    if (!request.auth) {
      throw new HttpsError('unauthenticated', 'Must be authenticated to update rules');
    }
    
    const { ruleId, updates } = request.data;
    const actorId = request.auth.uid;
    const actorEmail = request.auth.token.email;
    
    if (!ruleId) {
      throw new HttpsError('invalid-argument', 'ruleId is required');
    }
    
    // Validate target field if being updated
    if (updates.action?.targetField) {
      const targetValidation = await validateTargetField(updates.action.targetField);
      if (!targetValidation.valid) {
        logger.warn(`Rejected rule update: ${targetValidation.reason}`);
        return { success: false, error: targetValidation.reason };
      }
    }
    
    const db = admin.firestore();
    const now = new Date().toISOString();
    const ruleRef = db.collection(SMART_RULES_SETTINGS).doc(ruleId);
    
    // Get current rule for audit
    const currentDoc = await ruleRef.get();
    if (!currentDoc.exists) {
      throw new HttpsError('not-found', `Rule ${ruleId} not found`);
    }
    
    const currentData = currentDoc.data();
    
    // Build update object
    const updateData: Record<string, unknown> = {
      updatedBy: actorId,
      updatedAt: now,
    };
    
    if (updates.name !== undefined) updateData.name = updates.name;
    if (updates.description !== undefined) updateData.description = updates.description;
    if (updates.enabled !== undefined) updateData.enabled = updates.enabled;
    if (updates.priority !== undefined) updateData.priority = updates.priority;
    if (updates.condition !== undefined) updateData.condition = updates.condition;
    if (updates.action !== undefined) updateData.action = updates.action;
    if (updates.autoApply !== undefined) updateData.autoApply = updates.autoApply;
    if (updates.autoApplyConfidence !== undefined) updateData.autoApplyConfidence = updates.autoApplyConfidence;
    if (updates.tags !== undefined) updateData.tags = updates.tags;
    if (updates.packId !== undefined) updateData.packId = updates.packId;
    
    try {
      await ruleRef.update(updateData);
      
      // Clear cache
      rulesCache = null;
      
      // Determine action type for audit
      const auditAction = updates.enabled !== undefined && updates.enabled !== currentData?.enabled
        ? (updates.enabled ? 'enable' : 'disable')
        : 'update';
      
      // Write audit
      await writeAdminAudit(ruleId, auditAction, actorId, actorEmail, { 
        before: currentData, 
        after: updateData 
      });
      
      logger.info(`Smart Rule ${ruleId} updated by ${actorId}`);
      return { success: true };
    } catch (error) {
      logger.error('Error updating Smart Rule:', error);
      throw new HttpsError('internal', 'Failed to update rule');
    }
  }
);

// ============================================================================
// deleteSmartRule Callable (Admin)
// ============================================================================

interface DeleteSmartRuleRequest {
  ruleId: string;
}

interface DeleteSmartRuleResponse {
  success: boolean;
  error?: string;
}

export const deleteSmartRuleAdmin = onCall<DeleteSmartRuleRequest, DeleteSmartRuleResponse>(
  {
    region: 'us-central1',
    memory: '256MiB',
    timeoutSeconds: 30,
  },
  async (request: CallableRequest<DeleteSmartRuleRequest>): Promise<DeleteSmartRuleResponse> => {
    // Require authentication
    if (!request.auth) {
      throw new HttpsError('unauthenticated', 'Must be authenticated to delete rules');
    }
    
    const { ruleId } = request.data;
    const actorId = request.auth.uid;
    const actorEmail = request.auth.token.email;
    
    if (!ruleId) {
      throw new HttpsError('invalid-argument', 'ruleId is required');
    }
    
    const db = admin.firestore();
    const ruleRef = db.collection(SMART_RULES_SETTINGS).doc(ruleId);
    
    // Get current rule for audit
    const currentDoc = await ruleRef.get();
    if (!currentDoc.exists) {
      throw new HttpsError('not-found', `Rule ${ruleId} not found`);
    }
    
    const currentData = currentDoc.data();
    
    try {
      await ruleRef.delete();
      
      // Clear cache
      rulesCache = null;
      
      // Write audit
      await writeAdminAudit(ruleId, 'delete', actorId, actorEmail, { before: currentData });
      
      logger.info(`Smart Rule ${ruleId} deleted by ${actorId}`);
      return { success: true };
    } catch (error) {
      logger.error('Error deleting Smart Rule:', error);
      throw new HttpsError('internal', 'Failed to delete rule');
    }
  }
);

// ============================================================================
// listSmartRules Callable (Admin) - includes disabled rules
// ============================================================================

interface ListSmartRulesResponse {
  rules: Array<SmartRule & { ruleId: string }>;
  total: number;
}

export const listSmartRulesAdmin = onCall<void, ListSmartRulesResponse>(
  {
    region: 'us-central1',
    memory: '256MiB',
    timeoutSeconds: 30,
  },
  async (request: CallableRequest<void>): Promise<ListSmartRulesResponse> => {
    // Require authentication
    if (!request.auth) {
      throw new HttpsError('unauthenticated', 'Must be authenticated to list rules');
    }
    
    const db = admin.firestore();
    
    try {
      const snap = await db
        .collection(SMART_RULES_SETTINGS)
        .orderBy('priority', 'asc')
        .limit(MAX_RULES)
        .get();
      
      const rules = snap.docs.map(doc => ({
        ruleId: doc.id,
        ...doc.data(),
      })) as Array<SmartRule & { ruleId: string }>;
      
      return { rules, total: rules.length };
    } catch (error) {
      logger.error('Error listing Smart Rules:', error);
      throw new HttpsError('internal', 'Failed to list rules');
    }
  }
);
