/**
 * Smart Rules Admin Service
 * LP-smart-rules-admin-1.0.0: Admin Settings Smart Rules Manager
 * 
 * Service layer for Smart Rules CRUD operations:
 * - List, create, update, delete rules
 * - Rule test console
 * - Rule packs management
 * - Audit trail
 * 
 * Uses Firebase Functions callables and Firestore direct reads.
 */

import { getFunctions, httpsCallable } from 'firebase/functions';
import { 
  collection, 
  doc, 
  getDocs, 
  getDoc, 
  setDoc, 
  updateDoc, 
  deleteDoc,
  query,
  orderBy,
  where,
  writeBatch,
} from 'firebase/firestore';
import { db, isFirebaseAvailable } from '../firebaseConfig';
import { getAuth } from 'firebase/auth';
import type { 
  SmartRuleDocument, 
  RulePack, 
  RuleAuditEntry,
  RuleTestResult,
  SmartRuleForm,
  RuleConditionForm,
  ListRulesResponse,
  CreateRuleResponse,
  UpdateRuleResponse,
} from '../types/smartRulesAdmin';

// ============================================================================
// Constants
// ============================================================================

const SMART_RULES_COLLECTION = 'settings/smartRules/rules';
const RULE_PACKS_COLLECTION = 'settings/smartRules/packs';
const RULE_AUDIT_COLLECTION = 'settings/smartRules/audit';

// Attribute registry for validation
let attributeRegistryCache: Record<string, { exportable: boolean; internalOnly: boolean }> | null = null;

// ============================================================================
// Attribute Registry Helpers
// ============================================================================

/**
 * Load attribute registry for validating target fields
 */
export async function loadAttributeRegistry(): Promise<Record<string, { exportable: boolean; internalOnly: boolean }>> {
  if (attributeRegistryCache) {
    return attributeRegistryCache;
  }
  
  try {
    // Try to load from public directory (copied during build)
    const response = await fetch('/attributeRegistry.json');
    if (response.ok) {
      const registry = await response.json();
      const attributes = registry.attributes || [];
      
      attributeRegistryCache = {};
      for (const attr of attributes) {
        attributeRegistryCache[attr.attribute_id] = {
          exportable: attr.exportable ?? true,
          internalOnly: attr.internalOnly ?? false,
        };
      }
      
      return attributeRegistryCache;
    }
    
    // Fallback: return default known internalOnly fields
    console.warn('Could not load attribute registry, using defaults');
    attributeRegistryCache = {
      // Known internal-only fields
      'status': { exportable: false, internalOnly: true },
      'launch_date': { exportable: false, internalOnly: true },
      'kl_post_date': { exportable: false, internalOnly: true },
      'family_sizing': { exportable: false, internalOnly: true },
      'hype': { exportable: false, internalOnly: true },
    };
    return attributeRegistryCache;
  } catch (error) {
    console.warn('Failed to load attribute registry, using empty registry:', error);
    return {};
  }
}

/**
 * Check if a target field is valid for Smart Rules
 * Rejects internalOnly fields as targets
 */
export async function validateTargetField(field: string): Promise<{ valid: boolean; reason?: string }> {
  const registry = await loadAttributeRegistry();
  
  // Extract attribute name from path like "attributes.gender"
  const attrName = field.startsWith('attributes.') ? field.slice(11) : field;
  
  const attrConfig = registry[attrName];
  
  if (!attrConfig) {
    // Unknown field - allow but warn
    return { valid: true, reason: 'Unknown field - not in registry' };
  }
  
  if (attrConfig.internalOnly) {
    return { 
      valid: false, 
      reason: `Field "${attrName}" is marked as internalOnly and cannot be set by Smart Rules` 
    };
  }
  
  return { valid: true };
}

// ============================================================================
// CRUD Operations
// ============================================================================

/**
 * List all Smart Rules
 */
export async function listSmartRules(): Promise<ListRulesResponse> {
  if (!isFirebaseAvailable() || !db) {
    console.warn('Firebase not available, returning empty rules list');
    return { rules: [], total: 0 };
  }
  
  try {
    const rulesRef = collection(db, SMART_RULES_COLLECTION);
    const q = query(rulesRef, orderBy('priority', 'asc'));
    const snapshot = await getDocs(q);
    
    const rules: SmartRuleDocument[] = [];
    snapshot.forEach((doc) => {
      rules.push({ ruleId: doc.id, ...doc.data() } as SmartRuleDocument);
    });
    
    return { rules, total: rules.length };
  } catch (error) {
    console.error('Failed to list smart rules:', error);
    throw error;
  }
}

/**
 * Get a single Smart Rule by ID
 */
export async function getSmartRule(ruleId: string): Promise<SmartRuleDocument | null> {
  if (!isFirebaseAvailable() || !db) {
    return null;
  }
  
  try {
    const ruleRef = doc(db, SMART_RULES_COLLECTION, ruleId);
    const ruleDoc = await getDoc(ruleRef);
    
    if (!ruleDoc.exists()) {
      return null;
    }
    
    return { ruleId: ruleDoc.id, ...ruleDoc.data() } as SmartRuleDocument;
  } catch (error) {
    console.error('Failed to get smart rule:', error);
    throw error;
  }
}

/**
 * Convert form data to Firestore document format
 */
function formToDocument(form: SmartRuleForm): Omit<SmartRuleDocument, 'ruleId'> {
  // Build condition(s) based on form
  let condition: SmartRuleDocument['condition'];
  
  if (form.conditions.length === 1) {
    // Single condition
    const c = form.conditions[0];
    condition = {
      field: c.field,
      matchType: c.matchType,
      value: c.value,
      options: c.options,
    };
  } else {
    // Multiple conditions - wrap in AND/OR
    condition = form.conditions.map(c => ({
      field: c.field,
      matchType: c.matchType,
      value: c.value,
      options: c.options,
    }));
  }
  
  return {
    name: form.name,
    description: form.description || undefined,
    enabled: form.enabled,
    priority: form.priority,
    condition,
    action: {
      targetField: form.action.targetField,
      valueTemplate: form.action.valueTemplate,
      confidenceModifier: form.action.confidenceModifier,
    },
    autoApply: form.autoApply,
    autoApplyConfidence: form.autoApplyConfidence,
    tags: form.tags,
    packId: form.packId,
  };
}

/**
 * Create a new Smart Rule
 */
export async function createSmartRule(form: SmartRuleForm): Promise<CreateRuleResponse> {
  if (!isFirebaseAvailable() || !db) {
    return { ruleId: '', success: false, error: 'Firebase not available' };
  }
  
  // Validate target field
  const targetValidation = await validateTargetField(form.action.targetField);
  if (!targetValidation.valid) {
    return { ruleId: '', success: false, error: targetValidation.reason };
  }
  
  try {
    const auth = getAuth();
    const user = auth.currentUser;
    const now = new Date().toISOString();
    
    // Generate rule ID if not provided
    const ruleId = form.ruleId || `rule_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`;
    
    const ruleData = {
      ...formToDocument(form),
      createdBy: user?.uid || 'unknown',
      createdAt: now,
      updatedBy: user?.uid || 'unknown',
      updatedAt: now,
    };
    
    const ruleRef = doc(db, SMART_RULES_COLLECTION, ruleId);
    await setDoc(ruleRef, ruleData);
    
    // Write audit entry
    await writeAuditEntry({
      ruleId,
      action: 'create',
      actorId: user?.uid || 'unknown',
      actorEmail: user?.email || undefined,
      changes: { after: ruleData },
    });
    
    return { ruleId, success: true };
  } catch (error) {
    console.error('Failed to create smart rule:', error);
    return { 
      ruleId: '', 
      success: false, 
      error: error instanceof Error ? error.message : 'Unknown error' 
    };
  }
}

/**
 * Update an existing Smart Rule
 */
export async function updateSmartRule(ruleId: string, updates: Partial<SmartRuleForm>): Promise<UpdateRuleResponse> {
  if (!isFirebaseAvailable() || !db) {
    return { success: false, error: 'Firebase not available' };
  }
  
  // Validate target field if being updated
  if (updates.action?.targetField) {
    const targetValidation = await validateTargetField(updates.action.targetField);
    if (!targetValidation.valid) {
      return { success: false, error: targetValidation.reason };
    }
  }
  
  try {
    const auth = getAuth();
    const user = auth.currentUser;
    const now = new Date().toISOString();
    
    // Get current rule for audit
    const currentRule = await getSmartRule(ruleId);
    if (!currentRule) {
      return { success: false, error: `Rule ${ruleId} not found` };
    }
    
    // Build update object
    const updateData: Record<string, unknown> = {
      updatedBy: user?.uid || 'unknown',
      updatedAt: now,
    };
    
    if (updates.name !== undefined) updateData.name = updates.name;
    if (updates.description !== undefined) updateData.description = updates.description;
    if (updates.enabled !== undefined) updateData.enabled = updates.enabled;
    if (updates.priority !== undefined) updateData.priority = updates.priority;
    if (updates.autoApply !== undefined) updateData.autoApply = updates.autoApply;
    if (updates.autoApplyConfidence !== undefined) updateData.autoApplyConfidence = updates.autoApplyConfidence;
    if (updates.tags !== undefined) updateData.tags = updates.tags;
    if (updates.packId !== undefined) updateData.packId = updates.packId;
    
    // Handle condition updates
    if (updates.conditions) {
      if (updates.conditions.length === 1) {
        const c = updates.conditions[0];
        updateData.condition = {
          field: c.field,
          matchType: c.matchType,
          value: c.value,
          options: c.options,
        };
      } else {
        updateData.condition = updates.conditions.map(c => ({
          field: c.field,
          matchType: c.matchType,
          value: c.value,
          options: c.options,
        }));
      }
    }
    
    // Handle action updates
    if (updates.action) {
      updateData.action = {
        targetField: updates.action.targetField,
        valueTemplate: updates.action.valueTemplate,
        confidenceModifier: updates.action.confidenceModifier,
      };
    }
    
    const ruleRef = doc(db, SMART_RULES_COLLECTION, ruleId);
    await updateDoc(ruleRef, updateData);
    
    // Write audit entry
    await writeAuditEntry({
      ruleId,
      action: updates.enabled !== undefined && updates.enabled !== currentRule.enabled
        ? (updates.enabled ? 'enable' : 'disable')
        : 'update',
      actorId: user?.uid || 'unknown',
      actorEmail: user?.email || undefined,
      changes: { before: currentRule, after: updateData },
    });
    
    return { success: true };
  } catch (error) {
    console.error('Failed to update smart rule:', error);
    return { 
      success: false, 
      error: error instanceof Error ? error.message : 'Unknown error' 
    };
  }
}

/**
 * Delete a Smart Rule
 */
export async function deleteSmartRule(ruleId: string): Promise<{ success: boolean; error?: string }> {
  if (!isFirebaseAvailable() || !db) {
    return { success: false, error: 'Firebase not available' };
  }
  
  try {
    const auth = getAuth();
    const user = auth.currentUser;
    
    // Get current rule for audit
    const currentRule = await getSmartRule(ruleId);
    if (!currentRule) {
      return { success: false, error: `Rule ${ruleId} not found` };
    }
    
    const ruleRef = doc(db, SMART_RULES_COLLECTION, ruleId);
    await deleteDoc(ruleRef);
    
    // Write audit entry
    await writeAuditEntry({
      ruleId,
      action: 'delete',
      actorId: user?.uid || 'unknown',
      actorEmail: user?.email || undefined,
      changes: { before: currentRule },
    });
    
    return { success: true };
  } catch (error) {
    console.error('Failed to delete smart rule:', error);
    return { 
      success: false, 
      error: error instanceof Error ? error.message : 'Unknown error' 
    };
  }
}

// ============================================================================
// Rule Packs
// ============================================================================

/**
 * List all Rule Packs
 * If permission denied, return empty array and log warning.
 */
export async function listRulePacks(): Promise<RulePack[]> {
  if (!isFirebaseAvailable() || !db) {
    return [];
  }
  
  try {
    const packsRef = collection(db, RULE_PACKS_COLLECTION);
    const snapshot = await getDocs(packsRef);
    
    const packs: RulePack[] = [];
    snapshot.forEach((doc) => {
      packs.push({ packId: doc.id, ...doc.data() } as RulePack);
    });
    
    return packs;
  } catch (error) {
    console.warn('Failed to list rule packs (permission or other error):', error);
    return [];
  }
}

/**
 * Create or update a Rule Pack
 */
export async function saveRulePack(pack: RulePack): Promise<{ success: boolean; error?: string }> {
  if (!isFirebaseAvailable() || !db) {
    return { success: false, error: 'Firebase not available' };
  }
  
  try {
    const auth = getAuth();
    const user = auth.currentUser;
    const now = new Date().toISOString();
    
    const packData = {
      ...pack,
      updatedBy: user?.uid || 'unknown',
      updatedAt: now,
    };
    
    if (!pack.createdAt) {
      packData.createdBy = user?.uid || 'unknown';
      packData.createdAt = now;
    }
    
    const packRef = doc(db, RULE_PACKS_COLLECTION, pack.packId);
    await setDoc(packRef, packData);
    
    return { success: true };
  } catch (error) {
    console.error('Failed to save rule pack:', error);
    return { 
      success: false, 
      error: error instanceof Error ? error.message : 'Unknown error' 
    };
  }
}

/**
 * Toggle Rule Pack enabled status (and all rules in pack)
 */
export async function toggleRulePack(packId: string, enabled: boolean): Promise<{ success: boolean; error?: string }> {
  if (!isFirebaseAvailable() || !db) {
    return { success: false, error: 'Firebase not available' };
  }
  
  try {
    const auth = getAuth();
    const user = auth.currentUser;
    const now = new Date().toISOString();
    
    // Update pack
    const packRef = doc(db, RULE_PACKS_COLLECTION, packId);
    const packDoc = await getDoc(packRef);
    
    if (!packDoc.exists()) {
      return { success: false, error: `Pack ${packId} not found` };
    }
    
    const packData = packDoc.data() as RulePack;
    
    // Batch update pack and all rules in pack
    const batch = writeBatch(db);
    
    batch.update(packRef, {
      enabled,
      updatedBy: user?.uid || 'unknown',
      updatedAt: now,
    });
    
    // Update all rules in pack
    for (const ruleId of packData.ruleIds) {
      const ruleRef = doc(db, SMART_RULES_COLLECTION, ruleId);
      batch.update(ruleRef, {
        enabled,
        updatedBy: user?.uid || 'unknown',
        updatedAt: now,
      });
    }
    
    await batch.commit();
    
    return { success: true };
  } catch (error) {
    console.error('Failed to toggle rule pack:', error);
    return { 
      success: false, 
      error: error instanceof Error ? error.message : 'Unknown error' 
    };
  }
}

/**
 * Delete a Rule Pack (does not delete rules)
 */
export async function deleteRulePack(packId: string): Promise<{ success: boolean; error?: string }> {
  if (!isFirebaseAvailable() || !db) {
    return { success: false, error: 'Firebase not available' };
  }
  
  try {
    const packRef = doc(db, RULE_PACKS_COLLECTION, packId);
    await deleteDoc(packRef);
    
    // Clear packId from all rules in pack
    const { rules } = await listSmartRules();
    const batch = writeBatch(db);
    
    for (const rule of rules) {
      if (rule.packId === packId) {
        const ruleRef = doc(db, SMART_RULES_COLLECTION, rule.ruleId);
        batch.update(ruleRef, { packId: null });
      }
    }
    
    await batch.commit();
    
    return { success: true };
  } catch (error) {
    console.error('Failed to delete rule pack:', error);
    return { 
      success: false, 
      error: error instanceof Error ? error.message : 'Unknown error' 
    };
  }
}

// ============================================================================
// Audit Trail
// ============================================================================

/**
 * Write an audit entry
 */
async function writeAuditEntry(entry: Omit<RuleAuditEntry, 'auditId' | 'timestamp'>): Promise<void> {
  if (!isFirebaseAvailable() || !db) {
    return;
  }
  
  try {
    const auditId = `audit_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`;
    const auditRef = doc(db, RULE_AUDIT_COLLECTION, auditId);
    
    await setDoc(auditRef, {
      ...entry,
      auditId,
      timestamp: new Date().toISOString(),
    });
  } catch (error) {
    console.error('Failed to write audit entry:', error);
    // Don't throw - audit failures shouldn't block operations
  }
}

/**
 * Get audit history for a rule
 */
export async function getRuleAuditHistory(ruleId: string, limit = 50): Promise<RuleAuditEntry[]> {
  if (!isFirebaseAvailable() || !db) {
    return [];
  }
  
  try {
    const auditRef = collection(db, RULE_AUDIT_COLLECTION);
    const q = query(
      auditRef, 
      where('ruleId', '==', ruleId),
      orderBy('timestamp', 'desc')
    );
    const snapshot = await getDocs(q);
    
    const entries: RuleAuditEntry[] = [];
    snapshot.forEach((doc) => {
      entries.push(doc.data() as RuleAuditEntry);
    });
    
    return entries.slice(0, limit);
  } catch (error) {
    console.error('Failed to get rule audit history:', error);
    return [];
  }
}

/**
 * Get recent audit activity across all rules.
 * If permission denied, return empty array and log warning.
 */
export async function getRecentAuditActivity(limit = 20): Promise<RuleAuditEntry[]> {
  if (!isFirebaseAvailable() || !db) {
    return [];
  }
  
  try {
    const auditRef = collection(db, RULE_AUDIT_COLLECTION);
    const q = query(auditRef, orderBy('timestamp', 'desc'));
    const snapshot = await getDocs(q);
    
    const entries: RuleAuditEntry[] = [];
    snapshot.forEach((doc) => {
      entries.push(doc.data() as RuleAuditEntry);
    });
    
    return entries.slice(0, limit);
  } catch (error) {
    console.warn('Failed to load recent audit activity (permission or other error):', error);
    return [];
  }
}

// ============================================================================
// Rule Test Console (via Firebase Functions)
// ============================================================================

/**
 * Test rules against a product (non-mutating)
 */
export async function testRulesForProduct(productId: string): Promise<RuleTestResult> {
  if (!isFirebaseAvailable()) {
    throw new Error('Firebase not available');
  }
  
  try {
    const functions = getFunctions();
    const getProductSuggestions = httpsCallable<{ productId: string }, RuleTestResult>(
      functions, 
      'getProductSuggestions'
    );
    
    const result = await getProductSuggestions({ productId });
    return result.data;
  } catch (error) {
    console.error('Failed to test rules for product:', error);
    throw error;
  }
}

/**
 * Apply selected suggestions to a product
 */
export async function applySuggestions(
  productId: string, 
  suggestionIds: string[]
): Promise<{ appliedCount: number; skippedCount: number }> {
  if (!isFirebaseAvailable()) {
    throw new Error('Firebase not available');
  }
  
  try {
    const functions = getFunctions();
    const applySuggestionsCallable = httpsCallable<
      { productId: string; suggestionIds: string[] }, 
      { appliedCount: number; skippedCount: number }
    >(functions, 'applySuggestions');
    
    const result = await applySuggestionsCallable({ productId, suggestionIds });
    return result.data;
  } catch (error) {
    console.error('Failed to apply suggestions:', error);
    throw error;
  }
}

// ============================================================================
// Utility Functions
// ============================================================================

/**
 * Convert document to form format for editing
 */
export function documentToForm(doc: SmartRuleDocument): SmartRuleForm {
  // Parse condition(s)
  const conditions: RuleConditionForm[] = [];
  let conditionLogic: 'and' | 'or' = 'and';
  
  if (!doc.condition) {
    // No condition - create a default empty one
    conditions.push({
      id: 'cond_0',
      field: '',
      matchType: 'equals',
      value: '',
      options: undefined,
    });
  } else if (Array.isArray(doc.condition)) {
    // Multiple conditions
    doc.condition.forEach((c, i) => {
      conditions.push({
        id: `cond_${i}`,
        field: c.field || '',
        matchType: (c.matchType as RuleConditionForm['matchType']) || 'equals',
        value: (c.value as string | string[]) || '',
        options: c.options as RuleConditionForm['options'],
      });
    });
  } else {
    // Single condition
    conditions.push({
      id: 'cond_0',
      field: doc.condition.field || '',
      matchType: (doc.condition.matchType as RuleConditionForm['matchType']) || 'equals',
      value: (doc.condition.value as string | string[]) || '',
      options: doc.condition.options as RuleConditionForm['options'],
    });
  }
  
  return {
    ruleId: doc.ruleId,
    name: doc.name || '',
    description: doc.description || '',
    enabled: doc.enabled ?? true,
    priority: doc.priority ?? 100,
    conditions,
    conditionLogic,
    action: {
      targetField: doc.action?.targetField || '',
      valueTemplate: doc.action?.valueTemplate || '',
      setOnlyIfEmpty: false, // Default - not stored in original schema
      confidenceModifier: doc.action?.confidenceModifier,
    },
    autoApply: doc.autoApply || false,
    autoApplyConfidence: doc.autoApplyConfidence || 0.9,
    tags: doc.tags || [],
    packId: doc.packId,
  };
}

/**
 * Generate a unique rule ID
 */
export function generateRuleId(prefix = 'rule'): string {
  return `${prefix}_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`;
}

/**
 * Get exportable attributes for target field dropdown
 */
export async function getExportableAttributes(): Promise<Array<{ id: string; label: string; group: string }>> {
  const registry = await loadAttributeRegistry();
  
  const attributes: Array<{ id: string; label: string; group: string }> = [];
  
  for (const [id, config] of Object.entries(registry)) {
    if (!config.internalOnly) {
      attributes.push({
        id: `attributes.${id}`,
        label: id.replace(/_/g, ' ').replace(/\b\w/g, c => c.toUpperCase()),
        group: config.exportable ? 'Exportable' : 'Standard',
      });
    }
  }
  
  return attributes.sort((a, b) => a.label.localeCompare(b.label));
}
