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
import { authFetch } from './authFetch';
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

// LP-smart-rules-schema-1.0.0: Import canonical schema utilities
import {
  deepCleanUndefined,
  preSubmitValidation as sdkPreSubmitValidation,
  validateSmartRule as validateRuleClient,
  type ValidationResult,
} from '@ropi-aoss/sdk';

// Re-export for UI consumption
export { sdkPreSubmitValidation as preSubmitValidation };
export type { ValidationResult };

// ============================================================================
// Client-side Validation Utilities (Lisa's canonical)
// ============================================================================

/**
 * deepClean removes undefined values recursively; keeps null/empty string/empty array
 */
export function deepClean<T>(obj: T): T {
  return deepCleanUndefined(obj);
}

/**
 * Client-side pre-validate using SDK schema; returns { valid, issues }
 */
export async function validateSmartRuleClient(payload: unknown): Promise<{ valid: boolean; issues?: Array<{ message: string }> }> {
  try {
    // parse will throw on invalid
    validateRuleClient(payload);
    return { valid: true };
  } catch (err: unknown) {
    const errObj = err as { errors?: Array<{ message: string }>; issues?: Array<{ message: string }>; message?: string };
    return { 
      valid: false, 
      issues: errObj.errors || errObj.issues || [{ message: errObj.message || 'Unknown validation error' }] 
    };
  }
}

/**
 * Use httpsCallable to call server getProductSuggestions (callable)
 */
export async function getProductSuggestionsCallable(productId: string) {
  const functions = getFunctions();
  const callable = httpsCallable(functions, 'getProductSuggestions');
  const res = await callable({ productId });
  return res.data;
}

/**
 * Test rule by MPN: resolve productId first then call callable
 * Lisa's canonical: MPN is the primary lookup method
 */
export async function testRuleByMpn(mpn: string): Promise<RuleTestResult> {
  // Get API base URL from environment or use default
  const apiBaseUrl = import.meta.env?.VITE_API_BASE_URL || '';
  
  // Resolve product by MPN using authenticated fetch
  const resp = await authFetch(`${apiBaseUrl}/api/products/by-mpn/${encodeURIComponent(mpn)}`);
  
  if (!resp.ok) {
    if (resp.status === 401) {
      throw new Error('AUTH_REQUIRED');
    }
    if (resp.status === 404) {
      throw new Error('PRODUCT_NOT_FOUND');
    }
    const text = await resp.text();
    throw new Error(text || `Lookup failed: ${resp.status}`);
  }
  
  const pd = await resp.json();
  const productId = pd.productId || pd.id;
  
  if (!productId) {
    throw new Error('PRODUCT_LOOKUP_RESPONSE_MALFORMED');
  }
  
  // Call getProductSuggestions with resolved productId
  return getProductSuggestionsCallable(productId) as Promise<RuleTestResult>;
}

// ============================================================================
// Constants
// ============================================================================

const SMART_RULES_COLLECTION = 'settings/smartRules/rules';
const RULE_PACKS_COLLECTION = 'settings/smartRules/packs';
const RULE_AUDIT_COLLECTION = 'settings/smartRules/audit';

// Attribute registry for validation
let attributeRegistryCache: Record<string, { exportable: boolean; internalOnly: boolean }> | null = null;
let registryLoadError: string | null = null;

// ============================================================================
// Attribute Registry Helpers
// ============================================================================

/**
 * Get the last registry load error (if any)
 */
export function getRegistryLoadError(): string | null {
  return registryLoadError;
}

/**
 * Check if registry is loaded and valid
 */
export function isRegistryLoaded(): boolean {
  return attributeRegistryCache !== null && Object.keys(attributeRegistryCache).length > 0;
}

/**
 * Clear registry cache to force reload
 */
export function clearRegistryCache(): void {
  attributeRegistryCache = null;
  registryLoadError = null;
}

/**
 * Load attribute registry for validating target fields
 * Robust loader with Content-Type validation per Lisa's spec
 */
export async function loadAttributeRegistry(): Promise<Record<string, { exportable: boolean; internalOnly: boolean }>> {
  if (attributeRegistryCache) {
    return attributeRegistryCache;
  }
  
  registryLoadError = null;
  
  try {
    // Fetch from public directory (copied during build from SDK)
    const response = await fetch('/attributeRegistry.json');
    
    // Check HTTP status first
    if (!response.ok) {
      registryLoadError = `HTTP ${response.status}: ${response.statusText}`;
      console.error(`Registry fetch failed: ${registryLoadError}`);
      return {};
    }
    
    // CRITICAL: Validate Content-Type to prevent HTML parsing
    const contentType = response.headers.get('Content-Type') || '';
    if (!contentType.includes('application/json')) {
      registryLoadError = `Invalid Content-Type: ${contentType} (expected application/json). Server may be returning HTML.`;
      console.error(`Registry Content-Type mismatch: ${registryLoadError}`);
      
      // Log first 100 chars of response for diagnosis
      const text = await response.text();
      console.error(`Response preview: ${text.slice(0, 100)}...`);
      return {};
    }
    
    // Parse JSON
    const registry = await response.json();
    const attributes = registry.attributes || [];
    
    if (!Array.isArray(attributes) || attributes.length === 0) {
      registryLoadError = 'Registry loaded but contains no attributes';
      console.warn(registryLoadError);
      return {};
    }
    
    attributeRegistryCache = {};
    for (const attr of attributes) {
      if (attr.attribute_id) {
        attributeRegistryCache[attr.attribute_id] = {
          exportable: attr.exportable ?? true,
          internalOnly: attr.internalOnly ?? false,
        };
      }
    }
    
    console.log(`✅ Attribute registry loaded: ${Object.keys(attributeRegistryCache).length} attributes`);
    return attributeRegistryCache;
    
  } catch (error) {
    registryLoadError = error instanceof Error ? error.message : 'Unknown error loading registry';
    console.error('Failed to load attribute registry:', registryLoadError);
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
 * LP-smart-rules-schema-1.1.0: Uses deepCleanUndefined, options as array
 */
function formToDocument(form: SmartRuleForm): Omit<SmartRuleDocument, 'ruleId'> {
  // Build condition(s) based on form - Lisa's canonical uses array for options
  let condition: SmartRuleDocument['condition'];
  
  if (form.conditions.length === 1) {
    // Single condition
    const c = form.conditions[0];
    condition = {
      field: c.field || '',
      matchType: c.matchType || 'contains',
      value: c.value || '',
      options: Array.isArray(c.options) ? c.options : [],
    };
  } else {
    // Multiple conditions - wrap in AND/OR (Lisa's canonical uses array for options)
    condition = form.conditions.map(c => ({
      field: c.field || '',
      matchType: c.matchType || 'contains',
      value: c.value || '',
      options: Array.isArray(c.options) ? c.options : [],
    }));
  }
  
  // Build the document with explicit defaults (never undefined)
  // Lisa's canonical: priority defaults to 100
  const doc: Record<string, unknown> = {
    name: form.name || '',
    description: form.description || '',  // Default to empty string, not undefined
    enabled: form.enabled ?? true,
    priority: form.priority ?? 100,
    condition,
    // Note: conditionLogic removed from Lisa's canonical RuleSchema
    action: {
      targetField: form.action?.targetField || '',
      valueTemplate: form.action?.valueTemplate || '',
      // Only include confidenceModifier if it has a value
      ...(form.action?.confidenceModifier !== undefined && {
        confidenceModifier: form.action.confidenceModifier,
      }),
    },
    autoApply: form.autoApply ?? false,
    autoApplyConfidence: form.autoApplyConfidence ?? 0.9,
    tags: form.tags || [],
  };
  
  // Only include packId if it has a value
  if (form.packId) {
    doc.packId = form.packId;
  }
  
  // LP-smart-rules-schema-1.0.0: Clean any remaining undefined values
  return deepCleanUndefined(doc) as Omit<SmartRuleDocument, 'ruleId'>;
}

/**
 * Create a new Smart Rule
 * LP-smart-rules-schema-1.1.0: Client-side validation before write
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
    
    // Convert form to document (includes normalization)
    const docData = formToDocument(form);
    
    // Add metadata
    const ruleData = {
      ...docData,
      ruleId,
      createdBy: user?.uid || 'unknown',
      createdAt: now,
      updatedBy: user?.uid || 'unknown',
      updatedAt: now,
    };
    
    // LP-smart-rules-schema-1.1.0: Client-side validation using SDK schema
    const validationResult = await validateSmartRuleClient(ruleData);
    if (!validationResult.valid) {
      console.error('Validation failed:', validationResult.issues);
      return { 
        ruleId: '', 
        success: false, 
        error: 'VALIDATION_FAILED: ' + JSON.stringify(validationResult.issues) 
      };
    }
    
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
 * Lisa's canonical: matchType is token/phrase/regex/contains, options is array
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
      matchType: 'contains', // Lisa's canonical default
      value: '',
      options: [], // Lisa's canonical: array
    });
  } else if (Array.isArray(doc.condition)) {
    // Multiple conditions
    doc.condition.forEach((c, i) => {
      conditions.push({
        id: `cond_${i}`,
        field: c.field || '',
        matchType: (c.matchType as RuleConditionForm['matchType']) || 'contains',
        value: (c.value as string | string[]) || '',
        options: Array.isArray(c.options) ? c.options : [],
      });
    });
  } else {
    // Single condition
    conditions.push({
      id: 'cond_0',
      field: doc.condition.field || '',
      matchType: (doc.condition.matchType as RuleConditionForm['matchType']) || 'contains',
      value: (doc.condition.value as string | string[]) || '',
      options: Array.isArray(doc.condition.options) ? doc.condition.options : [],
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
