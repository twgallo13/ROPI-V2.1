/**
 * Smart Rules Firestore Triggers
 * LP-smart-rules-3.1.1
 * 
 * Firestore triggers that execute Smart Rules when products change.
 * Integrates with the Smart Rules Engine and Attribute Registry for
 * domain-validated suggestions.
 * 
 * Per AOSS Section 4 — Smart Rules & W1/W2 Workflows
 */

import * as admin from 'firebase-admin';
import { onDocumentWritten, Change, FirestoreEvent } from 'firebase-functions/v2/firestore';
import { logger } from 'firebase-functions/v2';
import SmartRulesEngine, { 
  type SmartRule, 
  type Product, 
  type Suggestion,
  type EngineResult,
} from '../lib/smartEngine';
import { loadRegistryMap, clearRegistryCache, type AttributeDefinition } from '../services/attributeValidator';

// ============================================================================
// Configuration
// ============================================================================

/**
 * Firestore collection paths
 */
const PRODUCTS_COLLECTION = 'products';
const SMART_RULES_SETTINGS = 'settings/smartRules/rules';

/**
 * Timestamp field to prevent trigger loops (ms since epoch)
 * Skip execution if this timestamp is in the future
 */
const SKIP_UNTIL_FIELD = '_smartRulesSkipUntil';

/**
 * Skip window duration in milliseconds (10 seconds)
 */
const SKIP_WINDOW_MS = 10000;

/**
 * Maximum rules to load per evaluation
 */
const MAX_RULES = 100;

// ============================================================================
// Rules Loading
// ============================================================================

/**
 * Load active Smart Rules from Firestore
 * @returns Array of enabled Smart Rules sorted by priority
 */
async function loadActiveRules(): Promise<SmartRule[]> {
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
    return rules;
  } catch (error) {
    logger.error('Error loading Smart Rules:', error);
    console.error('[SmartRules] Failed to load active rules:', error);
    return [];
  }
}

// ============================================================================
// Suggestion Storage
// ============================================================================

/**
 * Write suggestions to product document
 * Updates the `_smartSuggestions` field on the product
 */
async function writeSuggestionsToProduct(
  productRef: admin.firestore.DocumentReference,
  result: EngineResult
): Promise<void> {
  const updates: Record<string, unknown> = {
    // Set skip-until timestamp to prevent trigger loops (10s window)
    [SKIP_UNTIL_FIELD]: Date.now() + SKIP_WINDOW_MS,
    _smartRulesRanAt: admin.firestore.FieldValue.serverTimestamp(),
  };
  
  // Store pending suggestions (non-auto-applied)
  const pendingSuggestions = result.suggestions.filter(s => !s.applied && !s.autoApply);
  if (pendingSuggestions.length > 0) {
    updates._smartSuggestions = pendingSuggestions.map(s => ({
      id: s.id,
      ruleId: s.ruleId,
      targetField: s.targetField,
      value: s.value,
      confidence: s.confidence,
      explain: s.explain,
      createdAt: new Date().toISOString(),
    }));
  } else {
    // Clear old suggestions if none pending
    updates._smartSuggestions = admin.firestore.FieldValue.delete();
  }
  
  // Store conflicts if any
  if (result.conflicts.length > 0) {
    updates._smartConflicts = result.conflicts;
  } else {
    updates._smartConflicts = admin.firestore.FieldValue.delete();
  }
  
  // Apply auto-approved suggestions directly
  for (const suggestion of result.autoApplied) {
    // Set the value at the target field path
    updates[suggestion.targetField] = suggestion.value;
    
    // Track applied rule
    const trackingKey = `_appliedRules.${suggestion.targetField.replace(/\./g, '_')}`;
    updates[trackingKey] = {
      ruleId: suggestion.ruleId,
      confidence: suggestion.confidence,
      appliedAt: new Date().toISOString(),
    };
    
    // Add to activity log
    const activityEntry = {
      actor: 'system:smartRules',
      action: 'auto_apply',
      timestamp: new Date().toISOString(),
      details: {
        ruleId: suggestion.ruleId,
        targetField: suggestion.targetField,
        value: suggestion.value,
        confidence: suggestion.confidence,
      },
    };
    updates._activityLog = admin.firestore.FieldValue.arrayUnion(activityEntry);
  }
  
  // Store errors if any
  if (result.errors.length > 0) {
    updates._smartRulesErrors = result.errors;
  } else {
    updates._smartRulesErrors = admin.firestore.FieldValue.delete();
  }
  
  await productRef.update(updates);
  // Skip-until timestamp auto-expires - no async cleanup needed
}

// ============================================================================
// Firestore Trigger
// ============================================================================

/**
 * Firestore trigger: Execute Smart Rules when a product is created or updated
 * 
 * This trigger:
 * 1. Loads the attribute registry for domain validation
 * 2. Loads active Smart Rules from Firestore
 * 3. Evaluates rules against the product
 * 4. Stores suggestions on the product document
 * 5. Auto-applies high-confidence suggestions if configured
 */
export const onProductWrite = onDocumentWritten(
  {
    document: `${PRODUCTS_COLLECTION}/{mpn}`,
    region: 'us-central1',
  },
  async (event: FirestoreEvent<Change<admin.firestore.DocumentSnapshot> | undefined, { mpn: string }>) => {
    const { mpn } = event.params;
    const change = event.data;
    
    // Safety check - change should exist
    if (!change) {
      logger.warn(`No change data for product ${mpn}`);
      return null;
    }
    
    // Skip if document was deleted
    if (!change.after.exists) {
      logger.info(`Product ${mpn} deleted, skipping Smart Rules`);
      return null;
    }
    
    const productData = change.after.data();
    if (!productData) {
      logger.warn(`No data for product ${mpn}`);
      return null;
    }
    
    // Skip if within the skip window (prevents trigger loops)
    const skipUntil = productData[SKIP_UNTIL_FIELD] as number | undefined;
    if (skipUntil && skipUntil > Date.now()) {
      const remainingMs = skipUntil - Date.now();
      logger.debug(`Skipping Smart Rules for ${mpn} (skip window active, ${remainingMs}ms remaining)`);
      return null;
    }
    
    // Convert Firestore data to Product type
    const product: Product = {
      mpn,
      skus: productData.skus,
      exportSku: productData.exportSku,
      attributes: productData.attributes || {},
      source: productData.source,
      observations: productData.observations,
      descriptive: productData.descriptive,
      sku_core: productData.sku_core,
      _appliedRules: productData._appliedRules,
      _activityLog: productData._activityLog,
      _userEditedFields: productData._userEditedFields,
    };
    
    try {
      // Load registry for domain validation
      const registry = await loadRegistryMap();
      
      // Load active rules
      const rules = await loadActiveRules();
      
      if (rules.length === 0) {
        logger.info(`No active rules to evaluate for ${mpn}`);
        return null;
      }
      
      // Create engine with rules and registry
      const engine = new SmartRulesEngine(rules, registry);
      
      // Evaluate rules
      const result = await engine.evaluateRulesForProduct(product);
      
      logger.info(
        `Smart Rules for ${mpn}: ${result.suggestions.length} suggestions, ` +
        `${result.autoApplied.length} auto-applies, ${result.conflicts.length} conflicts, ` +
        `${result.errors.length} errors`
      );
      
      // Write results to product document
      if (result.suggestions.length > 0 || result.autoApplied.length > 0 || result.errors.length > 0) {
        await writeSuggestionsToProduct(change.after.ref, result);
      }
      
      // Clear registry cache after batch
      clearRegistryCache();
      
      return {
        mpn,
        suggestionsCount: result.suggestions.length,
        autoAppliedCount: result.autoApplied.length,
        conflictsCount: result.conflicts.length,
        errorsCount: result.errors.length,
      };
    } catch (error) {
      logger.error(`Smart Rules error for ${mpn}:`, error);
      
      // Clear cache on error
      clearRegistryCache();
      
      throw error;
    }
  }
);

// ============================================================================
// Cache Invalidation Trigger
// ============================================================================

/**
 * Firestore trigger: Invalidate caches when Smart Rules settings change
 * This ensures rule changes take effect immediately
 */
export const onSmartRuleUpdate = onDocumentWritten(
  {
    document: `${SMART_RULES_SETTINGS}/{ruleId}`,
    region: 'us-central1',
  },
  async (event) => {
    const { ruleId } = event.params;
    const change = event.data;
    
    if (!change) return null;
    
    const action = change.after.exists ? 'upsert' : 'delete';
    logger.info(`Smart Rule ${ruleId} ${action}d, caches will refresh on next evaluation`);
    
    // Clear registry cache to force reload
    clearRegistryCache();
    
    return { ruleId, action };
  }
);
