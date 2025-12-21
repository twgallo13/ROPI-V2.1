/**
 * ROPI Smart Rules - Firebase Cloud Functions
 * =============================================
 * Ready-to-deploy Cloud Functions for the Smart Rules engine.
 * 
 * Copy this file to: functions/src/smartRules.ts
 * 
 * Based on: ROPI AOSS v1.0 — Section 4 & Section 9
 */

import * as functions from 'firebase-functions';
import * as admin from 'firebase-admin';
import SmartRulesEngine, { 
  CANONICAL_RULES,
  type SmartRule,
  type Product,
  type Suggestion,
  type EngineResult,
} from './smart-rules'; // Adjust path based on your setup

// Initialize admin if not already done
if (!admin.apps.length) {
  admin.initializeApp();
}

const db = admin.firestore();

// =============================================================================
// ENGINE SINGLETON
// =============================================================================

let engineInstance: SmartRulesEngine | null = null;
let rulesLastLoaded = 0;
const RULES_CACHE_TTL = 5 * 60 * 1000; // 5 minutes

/**
 * Get or create the Smart Rules engine instance
 * Loads rules from Firestore with caching
 */
async function getEngine(): Promise<SmartRulesEngine> {
  const now = Date.now();
  
  // Use cached engine if still valid
  if (engineInstance && (now - rulesLastLoaded) < RULES_CACHE_TTL) {
    return engineInstance;
  }
  
  try {
    // Load rules from Firestore
    const rulesSnapshot = await db
      .collection('settings')
      .doc('smartRules')
      .collection('rules')
      .where('enabled', '==', true)
      .get();
    
    if (!rulesSnapshot.empty) {
      const rules = rulesSnapshot.docs.map(doc => doc.data() as SmartRule);
      engineInstance = new SmartRulesEngine(rules);
      functions.logger.info(`Loaded ${rules.length} rules from Firestore`);
    } else {
      // Fall back to canonical rules if no rules in Firestore
      engineInstance = new SmartRulesEngine(CANONICAL_RULES);
      functions.logger.info('Using canonical rules (no rules in Firestore)');
    }
    
    rulesLastLoaded = now;
  } catch (error) {
    functions.logger.error('Error loading rules, using canonical:', error);
    engineInstance = new SmartRulesEngine(CANONICAL_RULES);
  }
  
  return engineInstance;
}

/**
 * Force reload rules (call after rule updates)
 */
function invalidateRulesCache(): void {
  rulesLastLoaded = 0;
}

// =============================================================================
// FIRESTORE TRIGGERS
// =============================================================================

/**
 * Trigger: Run Smart Rules when a product is created or updated
 */
export const onProductWrite = functions.firestore
  .document('products/{mpn}')
  .onWrite(async (change, context) => {
    const { mpn } = context.params;
    
    // Skip if deleted
    if (!change.after.exists) {
      functions.logger.info(`Product ${mpn} deleted, skipping Smart Rules`);
      return null;
    }
    
    const product = change.after.data() as Product;
    
    // Skip if _skipSmartRules flag is set (prevents loops)
    if ((product as any)._skipSmartRules) {
      functions.logger.debug(`Skipping Smart Rules for ${mpn} (flag set)`);
      return null;
    }
    
    try {
      const engine = await getEngine();
      const result = await engine.evaluateRulesForProduct(product);
      
      functions.logger.info(`Smart Rules for ${mpn}: ${result.suggestions.length} suggestions, ${result.autoApplied.length} auto-applies`);
      
      // Build updates
      const updates: Record<string, any> = {
        _skipSmartRules: true, // Prevent trigger loop
        _smartRulesRanAt: admin.firestore.FieldValue.serverTimestamp(),
      };
      
      // Apply auto-approved suggestions
      for (const suggestion of result.autoApplied) {
        const applyResult = engine.applySuggestion(product, suggestion, 'system:smartRules');
        
        if (applyResult.success && applyResult.updates) {
          Object.assign(updates, applyResult.updates);
          
          // Add to activity log
          if (applyResult.activityLog) {
            updates._activityLog = admin.firestore.FieldValue.arrayUnion(applyResult.activityLog);
          }
        }
      }
      
      // Store pending suggestions for UI
      const pendingSuggestions = result.suggestions.filter(s => !s.autoApply);
      if (pendingSuggestions.length > 0) {
        updates._smartSuggestions = pendingSuggestions;
      }
      
      // Store conflicts for UI
      if (result.conflicts.length > 0) {
        updates._smartConflicts = result.conflicts;
      }
      
      // Write updates
      await change.after.ref.update(updates);
      
      // Clear the skip flag after a short delay
      setTimeout(async () => {
        try {
          await change.after.ref.update({ _skipSmartRules: admin.firestore.FieldValue.delete() });
        } catch (e) {
          // Ignore - document might have been deleted
        }
      }, 1000);
      
      return { 
        mpn, 
        suggestionsCount: result.suggestions.length,
        autoAppliedCount: result.autoApplied.length,
        conflictsCount: result.conflicts.length,
      };
    } catch (error) {
      functions.logger.error(`Smart Rules error for ${mpn}:`, error);
      throw error;
    }
  });

/**
 * Trigger: Invalidate rules cache when rules are updated
 */
export const onRuleUpdate = functions.firestore
  .document('settings/smartRules/rules/{ruleId}')
  .onWrite(async (change, context) => {
    const { ruleId } = context.params;
    
    functions.logger.info(`Rule ${ruleId} updated, invalidating cache`);
    invalidateRulesCache();
    
    return { ruleId, action: change.after.exists ? 'upsert' : 'delete' };
  });

// =============================================================================
// CALLABLE FUNCTIONS
// =============================================================================

/**
 * Get suggestions for a product (without applying)
 */
export const getProductSuggestions = functions.https.onCall(
  async (data: { mpn: string }, context) => {
    // Require authentication
    if (!context.auth) {
      throw new functions.https.HttpsError('unauthenticated', 'Must be logged in');
    }
    
    const { mpn } = data;
    if (!mpn) {
      throw new functions.https.HttpsError('invalid-argument', 'mpn is required');
    }
    
    // Get product
    const productDoc = await db.doc(`products/${mpn}`).get();
    if (!productDoc.exists) {
      throw new functions.https.HttpsError('not-found', `Product ${mpn} not found`);
    }
    
    const product = productDoc.data() as Product;
    const engine = await getEngine();
    const result = await engine.evaluateRulesForProduct(product);
    
    return result;
  }
);

/**
 * Apply selected suggestions to a product
 */
export const applySuggestions = functions.https.onCall(
  async (data: { mpn: string; suggestionIds: string[]; reason?: string }, context) => {
    // Require authentication
    if (!context.auth) {
      throw new functions.https.HttpsError('unauthenticated', 'Must be logged in');
    }
    
    const { mpn, suggestionIds, reason } = data;
    if (!mpn || !suggestionIds?.length) {
      throw new functions.https.HttpsError('invalid-argument', 'mpn and suggestionIds are required');
    }
    
    // Get product
    const productRef = db.doc(`products/${mpn}`);
    const productDoc = await productRef.get();
    if (!productDoc.exists) {
      throw new functions.https.HttpsError('not-found', `Product ${mpn} not found`);
    }
    
    const product = productDoc.data() as Product;
    const storedSuggestions = (product as any)._smartSuggestions as Suggestion[] || [];
    
    // Find matching suggestions
    const toApply = storedSuggestions.filter(s => suggestionIds.includes(s.id));
    if (toApply.length === 0) {
      throw new functions.https.HttpsError('not-found', 'No matching suggestions found');
    }
    
    const engine = await getEngine();
    const appliedBy = `user:${context.auth.uid}${reason ? `:${reason}` : ''}`;
    
    // Apply each suggestion
    const updates: Record<string, any> = {
      _skipSmartRules: true,
    };
    const results: { id: string; success: boolean; error?: string }[] = [];
    
    for (const suggestion of toApply) {
      const applyResult = engine.applySuggestion(product, suggestion, appliedBy);
      
      if (applyResult.success && applyResult.updates) {
        Object.assign(updates, applyResult.updates);
        
        if (applyResult.activityLog) {
          updates._activityLog = admin.firestore.FieldValue.arrayUnion(applyResult.activityLog);
        }
        
        results.push({ id: suggestion.id, success: true });
      } else {
        results.push({ id: suggestion.id, success: false, error: applyResult.reason });
      }
    }
    
    // Remove applied suggestions from pending list
    const remainingSuggestions = storedSuggestions.filter(
      s => !suggestionIds.includes(s.id) || !results.find(r => r.id === s.id && r.success)
    );
    updates._smartSuggestions = remainingSuggestions.length > 0 ? remainingSuggestions : admin.firestore.FieldValue.delete();
    
    // Write updates
    await productRef.update(updates);
    
    // Clear skip flag
    setTimeout(async () => {
      try {
        await productRef.update({ _skipSmartRules: admin.firestore.FieldValue.delete() });
      } catch (e) { /* ignore */ }
    }, 1000);
    
    return { results };
  }
);

/**
 * Resolve a conflict by selecting a candidate
 */
export const resolveConflict = functions.https.onCall(
  async (data: { mpn: string; conflictId: string; selectedRuleId: string }, context) => {
    // Require authentication
    if (!context.auth) {
      throw new functions.https.HttpsError('unauthenticated', 'Must be logged in');
    }
    
    const { mpn, conflictId, selectedRuleId } = data;
    if (!mpn || !conflictId || !selectedRuleId) {
      throw new functions.https.HttpsError('invalid-argument', 'mpn, conflictId, and selectedRuleId are required');
    }
    
    // Get product
    const productRef = db.doc(`products/${mpn}`);
    const productDoc = await productRef.get();
    if (!productDoc.exists) {
      throw new functions.https.HttpsError('not-found', `Product ${mpn} not found`);
    }
    
    const product = productDoc.data() as Product;
    const conflicts = (product as any)._smartConflicts || [];
    
    // Find the conflict
    const conflict = conflicts.find((c: any) => c.conflictId === conflictId);
    if (!conflict) {
      throw new functions.https.HttpsError('not-found', `Conflict ${conflictId} not found`);
    }
    
    // Find the selected candidate
    const candidate = conflict.candidates.find((c: any) => c.ruleId === selectedRuleId);
    if (!candidate) {
      throw new functions.https.HttpsError('not-found', `Candidate ${selectedRuleId} not found in conflict`);
    }
    
    // Build updates
    const updates: Record<string, any> = {
      _skipSmartRules: true,
      [conflict.field]: candidate.value,
      _activityLog: admin.firestore.FieldValue.arrayUnion({
        actor: `user:${context.auth.uid}`,
        action: 'conflict_resolved',
        timestamp: new Date().toISOString(),
        details: {
          conflictId,
          field: conflict.field,
          selectedRuleId,
          selectedValue: candidate.value,
          candidates: conflict.candidates,
        },
      }),
    };
    
    // Update conflict as resolved
    const updatedConflicts = conflicts.map((c: any) => {
      if (c.conflictId === conflictId) {
        return {
          ...c,
          resolved: true,
          resolution: {
            chosenRuleId: selectedRuleId,
            resolvedBy: context.auth!.uid,
            resolvedAt: new Date().toISOString(),
          },
        };
      }
      return c;
    });
    
    // Remove resolved conflicts after some time or keep for audit
    updates._smartConflicts = updatedConflicts.filter((c: any) => !c.resolved);
    if (updates._smartConflicts.length === 0) {
      updates._smartConflicts = admin.firestore.FieldValue.delete();
    }
    
    // Write updates
    await productRef.update(updates);
    
    // Clear skip flag
    setTimeout(async () => {
      try {
        await productRef.update({ _skipSmartRules: admin.firestore.FieldValue.delete() });
      } catch (e) { /* ignore */ }
    }, 1000);
    
    return {
      success: true,
      field: conflict.field,
      newValue: candidate.value,
    };
  }
);

/**
 * Test a rule against a sample product (admin only)
 */
export const testSmartRule = functions.https.onCall(
  async (data: { rule: SmartRule; productSample: Product }, context) => {
    // Require authentication
    if (!context.auth) {
      throw new functions.https.HttpsError('unauthenticated', 'Must be logged in');
    }
    
    // Check admin role
    const user = await admin.auth().getUser(context.auth.uid);
    if (user.customClaims?.role !== 'admin') {
      throw new functions.https.HttpsError('permission-denied', 'Admin access required');
    }
    
    const { rule, productSample } = data;
    if (!rule || !productSample) {
      throw new functions.https.HttpsError('invalid-argument', 'rule and productSample are required');
    }
    
    const engine = await getEngine();
    const result = engine.testRule(rule, productSample);
    
    return result;
  }
);

/**
 * List all rules (admin only)
 */
export const listSmartRules = functions.https.onCall(
  async (data: { includeDisabled?: boolean }, context) => {
    // Require authentication
    if (!context.auth) {
      throw new functions.https.HttpsError('unauthenticated', 'Must be logged in');
    }
    
    // Check admin role
    const user = await admin.auth().getUser(context.auth.uid);
    if (user.customClaims?.role !== 'admin') {
      throw new functions.https.HttpsError('permission-denied', 'Admin access required');
    }
    
    let query = db.collection('settings').doc('smartRules').collection('rules');
    
    if (!data?.includeDisabled) {
      query = query.where('enabled', '==', true) as any;
    }
    
    const snapshot = await query.orderBy('priority', 'desc').get();
    const rules = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
    
    return { rules, count: rules.length };
  }
);

/**
 * Create or update a rule (admin only)
 */
export const upsertSmartRule = functions.https.onCall(
  async (data: { rule: SmartRule }, context) => {
    // Require authentication
    if (!context.auth) {
      throw new functions.https.HttpsError('unauthenticated', 'Must be logged in');
    }
    
    // Check admin role
    const user = await admin.auth().getUser(context.auth.uid);
    if (user.customClaims?.role !== 'admin') {
      throw new functions.https.HttpsError('permission-denied', 'Admin access required');
    }
    
    const { rule } = data;
    if (!rule?.ruleId) {
      throw new functions.https.HttpsError('invalid-argument', 'rule with ruleId is required');
    }
    
    const ruleRef = db.doc(`settings/smartRules/rules/${rule.ruleId}`);
    const existing = await ruleRef.get();
    
    const ruleData = {
      ...rule,
      updatedAt: admin.firestore.FieldValue.serverTimestamp(),
      updatedBy: context.auth.uid,
    };
    
    if (!existing.exists) {
      ruleData.createdAt = admin.firestore.FieldValue.serverTimestamp() as any;
      ruleData.createdBy = context.auth.uid;
    }
    
    await ruleRef.set(ruleData, { merge: true });
    
    return { success: true, ruleId: rule.ruleId, action: existing.exists ? 'updated' : 'created' };
  }
);

/**
 * Seed canonical rules to Firestore (admin only, one-time setup)
 */
export const seedCanonicalRules = functions.https.onCall(
  async (data: { overwrite?: boolean }, context) => {
    // Require authentication
    if (!context.auth) {
      throw new functions.https.HttpsError('unauthenticated', 'Must be logged in');
    }
    
    // Check admin role
    const user = await admin.auth().getUser(context.auth.uid);
    if (user.customClaims?.role !== 'admin') {
      throw new functions.https.HttpsError('permission-denied', 'Admin access required');
    }
    
    const batch = db.batch();
    const timestamp = admin.firestore.FieldValue.serverTimestamp();
    let count = 0;
    
    for (const rule of CANONICAL_RULES) {
      const ref = db.doc(`settings/smartRules/rules/${rule.ruleId}`);
      
      // Check if exists
      if (!data?.overwrite) {
        const existing = await ref.get();
        if (existing.exists) {
          functions.logger.info(`Skipping existing rule: ${rule.ruleId}`);
          continue;
        }
      }
      
      batch.set(ref, {
        ...rule,
        createdAt: timestamp,
        createdBy: 'system:seed',
        updatedAt: timestamp,
      }, { merge: !data?.overwrite });
      
      count++;
    }
    
    if (count > 0) {
      await batch.commit();
      invalidateRulesCache();
    }
    
    return { success: true, seededCount: count, totalRules: CANONICAL_RULES.length };
  }
);

// =============================================================================
// HTTP ENDPOINTS (REST API)
// =============================================================================

/**
 * REST API: GET /api/v1/products/:mpn/suggestions
 */
export const apiGetSuggestions = functions.https.onRequest(async (req, res) => {
  // CORS
  res.set('Access-Control-Allow-Origin', '*');
  if (req.method === 'OPTIONS') {
    res.set('Access-Control-Allow-Methods', 'GET');
    res.set('Access-Control-Allow-Headers', 'Authorization');
    res.status(204).send('');
    return;
  }
  
  if (req.method !== 'GET') {
    res.status(405).json({ error: 'Method not allowed' });
    return;
  }
  
  // Verify auth
  const authHeader = req.headers.authorization;
  if (!authHeader?.startsWith('Bearer ')) {
    res.status(401).json({ error: 'Unauthorized' });
    return;
  }
  
  try {
    const token = authHeader.split('Bearer ')[1];
    await admin.auth().verifyIdToken(token);
  } catch (e) {
    res.status(401).json({ error: 'Invalid token' });
    return;
  }
  
  // Extract MPN from path
  const pathMatch = req.path.match(/\/products\/([^/]+)\/suggestions/);
  const mpn = pathMatch?.[1];
  
  if (!mpn) {
    res.status(400).json({ error: 'Missing mpn in path' });
    return;
  }
  
  try {
    const productDoc = await db.doc(`products/${mpn}`).get();
    if (!productDoc.exists) {
      res.status(404).json({ error: `Product ${mpn} not found` });
      return;
    }
    
    const engine = await getEngine();
    const result = await engine.evaluateRulesForProduct(productDoc.data() as Product);
    
    res.json(result);
  } catch (error) {
    functions.logger.error('Error getting suggestions:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// =============================================================================
// EXPORTS
// =============================================================================

export {
  getEngine,
  invalidateRulesCache,
};
