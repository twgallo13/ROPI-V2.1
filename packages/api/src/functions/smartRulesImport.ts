/**
 * Smart Rules Import Integration
 * LP-smart-rules-engine-1.0.0: Wire Smart Rules engine into import pipeline
 * 
 * Per Lisa's S2.5 requirements:
 * - Engine runs during import normalization step
 * - Returns suggestions + auto-applies
 * - Writes updates with provenance and logs
 * - Idempotency via _smartRulesRanAt and _smartRulesSkipUntil
 * 
 * This module provides the integration point between the import pipeline
 * and the Smart Rules Engine V2.
 */

import * as admin from 'firebase-admin';
import { logger } from 'firebase-functions/v2';
import SmartRulesEngineV2, {
  type SmartRule,
  type ImportRow,
  type Product,
  type EngineResult,
  type DictionaryEntry,
  DEFAULT_RICS_DICTIONARY,
} from '../lib/smartEngineV2';
import { loadActiveRules, loadDictionary, clearSmartRulesCache } from './smartRulesCallables';

// ============================================================================
// Configuration
// ============================================================================

const PRODUCTS_COLLECTION = 'products';

/** Skip window duration in milliseconds (10 seconds) */
const SKIP_WINDOW_MS = 10000;

// ============================================================================
// Types
// ============================================================================

/**
 * Result of processing Smart Rules for an import row
 */
export interface SmartRulesImportResult {
  productId: string;
  suggestionsCount: number;
  autoAppliedCount: number;
  conflictsCount: number;
  errorsCount: number;
  skipped: boolean;
  skipReason?: string;
  updates?: Record<string, unknown>;
}

/**
 * Batch result for multiple import rows
 */
export interface SmartRulesBatchResult {
  processedCount: number;
  skippedCount: number;
  totalSuggestions: number;
  totalAutoApplied: number;
  totalConflicts: number;
  totalErrors: number;
  results: SmartRulesImportResult[];
  processedAt: string;
}

// ============================================================================
// Import Integration Functions
// ============================================================================

/**
 * Process Smart Rules for a single import row
 * Called during import normalization step (S2.5)
 * 
 * @param importRow - The import row to process
 * @param rules - Active Smart Rules (pre-loaded)
 * @param dictionary - RICS dictionary (pre-loaded)
 * @returns Processing result with updates to apply
 */
export function processSmartRulesForRow(
  importRow: ImportRow,
  rules: SmartRule[],
  dictionary: DictionaryEntry[]
): SmartRulesImportResult {
  // Check if we should skip (idempotency check)
  if (importRow.existingProduct) {
    const skipUntil = importRow.existingProduct._smartRulesSkipUntil;
    if (skipUntil && skipUntil > Date.now()) {
      return {
        productId: importRow.productId,
        suggestionsCount: 0,
        autoAppliedCount: 0,
        conflictsCount: 0,
        errorsCount: 0,
        skipped: true,
        skipReason: 'Within skip window (idempotency)',
      };
    }
  }
  
  // Create engine and evaluate
  const engine = new SmartRulesEngineV2(rules, dictionary);
  const result = engine.evaluateForImport(importRow);
  
  return {
    productId: importRow.productId,
    suggestionsCount: result.suggestions.length,
    autoAppliedCount: result.autoApplied.length,
    conflictsCount: result.conflicts.length,
    errorsCount: result.errors.length,
    skipped: false,
    updates: result.updates,
  };
}

/**
 * Process Smart Rules for a batch of import rows
 * Optimized for batch processing with shared rules/dictionary
 * 
 * @param importRows - Array of import rows to process
 * @returns Batch processing result
 */
export async function processSmartRulesForBatch(
  importRows: ImportRow[]
): Promise<SmartRulesBatchResult> {
  const now = new Date().toISOString();
  
  // Load rules and dictionary once for the batch
  // Force refresh to ensure we don't use stale cached rules
  const [rules, dictionary] = await Promise.all([
    loadActiveRules(true),
    loadDictionary(),
  ]);
  
  if (rules.length === 0) {
    logger.info('No active Smart Rules - skipping batch processing');
    return {
      processedCount: 0,
      skippedCount: importRows.length,
      totalSuggestions: 0,
      totalAutoApplied: 0,
      totalConflicts: 0,
      totalErrors: 0,
      results: importRows.map(row => ({
        productId: row.productId,
        suggestionsCount: 0,
        autoAppliedCount: 0,
        conflictsCount: 0,
        errorsCount: 0,
        skipped: true,
        skipReason: 'No active rules',
      })),
      processedAt: now,
    };
  }
  
  // Process each row
  const results: SmartRulesImportResult[] = [];
  let processedCount = 0;
  let skippedCount = 0;
  let totalSuggestions = 0;
  let totalAutoApplied = 0;
  let totalConflicts = 0;
  let totalErrors = 0;
  
  for (const importRow of importRows) {
    const result = processSmartRulesForRow(importRow, rules, dictionary);
    results.push(result);
    
    if (result.skipped) {
      skippedCount++;
    } else {
      processedCount++;
      totalSuggestions += result.suggestionsCount;
      totalAutoApplied += result.autoAppliedCount;
      totalConflicts += result.conflictsCount;
      totalErrors += result.errorsCount;
    }
  }
  
  logger.info(
    `Smart Rules batch: ${processedCount} processed, ${skippedCount} skipped, ` +
    `${totalSuggestions} suggestions, ${totalAutoApplied} auto-applied, ` +
    `${totalConflicts} conflicts, ${totalErrors} errors`
  );
  
  return {
    processedCount,
    skippedCount,
    totalSuggestions,
    totalAutoApplied,
    totalConflicts,
    totalErrors,
    results,
    processedAt: now,
  };
}

/**
 * Apply Smart Rules updates to a product document
 * Called after processSmartRulesForRow to persist changes
 * 
 * @param productId - Product document ID
 * @param updates - Updates from engine result
 * @param activityLog - Activity log entries to append
 */
export async function applySmartRulesUpdates(
  productId: string,
  updates: Record<string, unknown>,
  activityLog: Array<{ actor: string; action: string; timestamp: string; details: Record<string, unknown> }>
): Promise<void> {
  const db = admin.firestore();
  const productRef = db.collection(PRODUCTS_COLLECTION).doc(productId);
  
  // Add activity log entries
  if (activityLog.length > 0) {
    updates._activityLog = admin.firestore.FieldValue.arrayUnion(...activityLog);
  }
  
  await productRef.update(updates);
  
  logger.debug(`Applied Smart Rules updates to product ${productId}`);
}

/**
 * Integrated import processing with Smart Rules
 * This is the main entry point for import pipeline integration
 * 
 * @param productId - Product ID (MPN)
 * @param normalizedData - Normalized import data
 * @param sourceData - Source data (RICS, etc.)
 * @param existingProduct - Existing product data (if updating)
 * @returns Engine result with all updates
 */
export async function processImportWithSmartRules(
  productId: string,
  normalizedData: Record<string, unknown>,
  sourceData?: ImportRow['source'],
  existingProduct?: Product
): Promise<EngineResult & { skipped: boolean; skipReason?: string }> {
  // Check idempotency (skip window)
  if (existingProduct?._smartRulesSkipUntil && existingProduct._smartRulesSkipUntil > Date.now()) {
    const remaining = existingProduct._smartRulesSkipUntil - Date.now();
    logger.debug(`Skipping Smart Rules for ${productId} (${remaining}ms remaining in skip window)`);
    
    return {
      suggestions: [],
      conflicts: [],
      autoApplied: [],
      errors: [],
      updates: {},
      activityLog: [],
      skipped: true,
      skipReason: `Within skip window (${remaining}ms remaining)`,
    };
  }
  
  // Load rules and dictionary
  // Force refresh to ensure we have latest rules (avoid stale cache)
  const [rules, dictionary] = await Promise.all([
    loadActiveRules(true),
    loadDictionary(),
  ]);
  
  if (rules.length === 0) {
    return {
      suggestions: [],
      conflicts: [],
      autoApplied: [],
      errors: [],
      updates: {},
      activityLog: [],
      skipped: true,
      skipReason: 'No active rules',
    };
  }
  
  // Build import row
  const importRow: ImportRow = {
    productId,
    normalized: normalizedData,
    source: sourceData,
    existingProduct,
  };
  
  // Create engine and evaluate
  const engine = new SmartRulesEngineV2(rules, dictionary);
  const result = engine.evaluateForImport(importRow);
  
  logger.info(
    `Smart Rules for ${productId}: ${result.suggestions.length} suggestions, ` +
    `${result.autoApplied.length} auto-applied, ${result.conflicts.length} conflicts, ` +
    `${result.errors.length} errors`
  );
  
  return {
    ...result,
    skipped: false,
  };
}

/**
 * Clear Smart Rules caches
 * Called when rules or dictionary are updated
 */
export function clearCaches(): void {
  clearSmartRulesCache();
}

// ============================================================================
// Performance Utilities
// ============================================================================

/**
 * Measure Smart Rules evaluation performance
 * For performance testing and monitoring
 */
export async function measurePerformance(
  importRows: ImportRow[],
  iterations: number = 1
): Promise<{
  totalRows: number;
  iterations: number;
  totalTimeMs: number;
  avgTimePerRowMs: number;
  avgTimePerIterationMs: number;
  rulesCount: number;
}> {
  const [rules, dictionary] = await Promise.all([
    loadActiveRules(),
    loadDictionary(),
  ]);
  
  const engine = new SmartRulesEngineV2(rules, dictionary);
  
  const startTime = performance.now();
  
  for (let i = 0; i < iterations; i++) {
    for (const row of importRows) {
      engine.evaluateForImport(row);
    }
  }
  
  const endTime = performance.now();
  const totalTimeMs = endTime - startTime;
  const totalEvaluations = importRows.length * iterations;
  
  return {
    totalRows: importRows.length,
    iterations,
    totalTimeMs,
    avgTimePerRowMs: totalTimeMs / totalEvaluations,
    avgTimePerIterationMs: totalTimeMs / iterations,
    rulesCount: rules.length,
  };
}
