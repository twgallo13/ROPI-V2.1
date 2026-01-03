/**
 * Completion-Driven Export Readiness Service
 * 
 * Integrates completion evaluation engine with export readiness to enforce
 * completion-based export gates with site-aware blocking semantics.
 * 
 * GOVERNANCE COMPLIANCE:
 * - Settings-driven completion rules (from settings/exportSettings/completionRules)
 * - Site-aware completion blocking (Description/SEO blocks completion)
 * - Single canonical completion gate (no multiple thresholds)
 * - Operator-visible blocking explanation payload
 * - No media/pricing blocking (excluded by design)
 * - No Smart Rules involvement in export readiness
 */

import { 
  evaluateCompletion,
  type ProductSnapshot,
  type AttributeRegistry,
  type CompletionEvaluationResult,
  type SiteBlockingReason
} from './completionEvaluationEngineEntry';
import { 
  loadCompletionRules,
  type CompletionRulesConfig
} from './completionRulesService';
import { loadExportableAttributes, type ProductDocument } from './exportService';
import type { AttributeType } from '../../../sdk/src/schema/attribute';

// ============================================================================
// Enhanced Export Readiness Types
// ============================================================================

export interface CompletionDrivenExportReadiness {
  ready: boolean;
  completionPct: number;
  threshold: number;
  hasBlockingSites: boolean;
  blockingReasons: ExportBlockingReason[];
  operatorExplanation: OperatorExplanation;
  evaluationTimestamp: string;
  rulesVersion: number;
}

export interface ExportBlockingReason {
  type: 'COMPLETION_BELOW_THRESHOLD' | 'SITE_DESCRIPTION_SEO_MISSING' | 'REQUIRED_ATTRIBUTE_MISSING';
  severity: 'BLOCKING' | 'WARNING';
  message: string;
  details: {
    site?: string;
    missingAttributes?: string[];
    currentCompletion?: number;
    requiredCompletion?: number;
    segmentId?: string;
  };
}

export interface OperatorExplanation {
  summary: string;
  blockingIssues: string[];
  completionBreakdown: {
    segmentId: string;
    segmentName: string;
    score: number;
    weightPct: number;
    missingAttributes: string[];
  }[];
  siteStatus: {
    site: string;
    blocked: boolean;
    reason?: string;
    missingAttributes?: string[];
  }[];
  actionRequired: string[];
}

// ============================================================================
// Main Export Readiness Function
// ============================================================================

/**
 * Calculate completion-driven export readiness
 * 
 * Replaces the legacy calculateExportReadiness function with completion-based evaluation
 * that enforces site-aware blocking and threshold-based gating.
 * 
 * @param product - Product document with attributes and sites
 * @param forceRulesRefresh - Force reload of completion rules from Firestore
 * @returns Promise<CompletionDrivenExportReadiness> - Enhanced readiness result with operator explanations
 */
export async function calculateCompletionDrivenExportReadiness(
  product: ProductDocument,
  forceRulesRefresh = false
): Promise<CompletionDrivenExportReadiness> {
  
  const evaluationTimestamp = new Date().toISOString();
  
  try {
    // Load completion rules configuration
    const completionRules = await loadCompletionRules(forceRulesRefresh);
    
    // Load attribute registry
    const attributeRegistry = await loadAttributeRegistryForCompletion();
    
    // Convert product to completion engine format
    const productSnapshot = convertToProductSnapshot(product);
    const selectedSites = extractSelectedSites(product);
    
    // If no sites selected, export is blocked
    if (selectedSites.length === 0) {
      return createBlockedReadiness(
        'No sites selected for product',
        [],
        completionRules,
        evaluationTimestamp,
        productSnapshot
      );
    }
    
    // Run completion evaluation
    const completionResult = evaluateCompletion(
      productSnapshot,
      selectedSites,
      attributeRegistry,
      completionRules,
      evaluationTimestamp
    );
    
    // Determine export readiness based on completion
    const isReady = determineExportReadiness(completionResult, completionRules);
    
    // Generate blocking reasons and operator explanations
    const blockingReasons = generateBlockingReasons(completionResult, completionRules);
    const operatorExplanation = generateOperatorExplanation(completionResult, completionRules, selectedSites);
    
    return {
      ready: isReady,
      completionPct: completionResult.totalCompletionPct,
      threshold: completionRules.exportUnlockThresholdPct,
      hasBlockingSites: completionResult.hasBlockingSites,
      blockingReasons,
      operatorExplanation,
      evaluationTimestamp,
      rulesVersion: completionRules.rulesVersion
    };
    
  } catch (error) {
    console.error('[CompletionDrivenExportReadiness] Evaluation failed:', error);
    
    // Return blocked state with error explanation
    return createErrorReadiness(
      error instanceof Error ? error.message : 'Unknown error during completion evaluation',
      evaluationTimestamp
    );
  }
}

// ============================================================================
// Helper Functions
// ============================================================================

/**
 * Load attribute registry formatted for completion evaluation
 */
async function loadAttributeRegistryForCompletion(): Promise<AttributeRegistry> {
  const exportableAttributes = await loadExportableAttributes();
  const registry: AttributeRegistry = {};
  
  for (const [id, def] of exportableAttributes) {
    // Convert export attribute definition to completion format
    registry[id] = {
      attribute_id: id,
      label: def.label,
      category: def.category || 'general',
      data_type: def.data_type || 'string',
      required_for_completion: def.required_for_export || def.requiredForExport || false,
      exportable: true,
      internalOnly: def.internalOnly || false
    } as AttributeType;
  }
  
  return registry;
}

/**
 * Convert ProductDocument to ProductSnapshot for completion engine
 */
function convertToProductSnapshot(product: ProductDocument): ProductSnapshot {
  return {
    productId: product.id || 'unknown',
    attributes: product.attributes || {},
    sites: extractSelectedSites(product)
  };
}

/**
 * Extract selected sites from product document
 */
function extractSelectedSites(product: ProductDocument): string[] {
  if (Array.isArray(product.websites)) {
    return product.websites;
  }
  if (Array.isArray(product.sites)) {
    return product.sites;
  }
  // Legacy format support
  if (product.website && typeof product.website === 'string') {
    return [product.website];
  }
  return [];
}

/**
 * Determine if product is export ready based on completion evaluation
 */
function determineExportReadiness(
  completionResult: CompletionEvaluationResult,
  rules: CompletionRulesConfig
): boolean {
  // Site blocking always prevents export (Description/SEO rule)
  if (completionResult.hasBlockingSites) {
    return false;
  }
  
  // Completion threshold gate
  if (completionResult.totalCompletionPct < rules.exportUnlockThresholdPct) {
    return false;
  }
  
  return true;
}

/**
 * Generate blocking reasons for operator visibility
 */
function generateBlockingReasons(
  completionResult: CompletionEvaluationResult,
  rules: CompletionRulesConfig
): ExportBlockingReason[] {
  const reasons: ExportBlockingReason[] = [];
  
  // Site blocking reasons (Description/SEO) - highest priority
  for (const siteBlocking of completionResult.siteBlockingReasons) {
    reasons.push({
      type: 'SITE_DESCRIPTION_SEO_MISSING',
      severity: 'BLOCKING',
      message: `Export blocked for ${siteBlocking.site}: ${siteBlocking.reason}`,
      details: {
        site: siteBlocking.site,
        missingAttributes: siteBlocking.missingAttributes
      }
    });
  }
  
  // Only check threshold if no site blocking (since site blocking sets completion to 0)
  if (completionResult.siteBlockingReasons.length === 0 && 
      completionResult.totalCompletionPct < rules.exportUnlockThresholdPct) {
    reasons.push({
      type: 'COMPLETION_BELOW_THRESHOLD',
      severity: 'BLOCKING',
      message: `Completion ${completionResult.totalCompletionPct}% is below export threshold ${rules.exportUnlockThresholdPct}%`,
      details: {
        currentCompletion: completionResult.totalCompletionPct,
        requiredCompletion: rules.exportUnlockThresholdPct
      }
    });
  }
  
  return reasons;
}

/**
 * Generate operator explanation with actionable guidance
 */
function generateOperatorExplanation(
  completionResult: CompletionEvaluationResult,
  rules: CompletionRulesConfig,
  selectedSites: string[]
): OperatorExplanation {
  
  const blockingIssues: string[] = [];
  const actionRequired: string[] = [];
  
  // Site blocking issues (highest priority)
  if (completionResult.hasBlockingSites) {
    for (const siteBlocking of completionResult.siteBlockingReasons) {
      blockingIssues.push(`${siteBlocking.site}: Missing ${siteBlocking.missingAttributes.join(', ')}`);
      actionRequired.push(`Add missing Description/SEO attributes for ${siteBlocking.site} site`);
    }
  }
  
  // Completion threshold issues (only if no site blocking)
  if (!completionResult.hasBlockingSites && 
      completionResult.totalCompletionPct < rules.exportUnlockThresholdPct) {
    const gap = rules.exportUnlockThresholdPct - completionResult.totalCompletionPct;
    blockingIssues.push(`Completion ${completionResult.totalCompletionPct}% is ${gap}% below export threshold`);
    actionRequired.push(`Increase completion to at least ${rules.exportUnlockThresholdPct}% by addressing missing attributes`);
  }
  
  // Generate summary
  let summary: string;
  if (blockingIssues.length === 0) {
    summary = `Product is ready for export (${completionResult.totalCompletionPct}% completion)`;
  } else {
    summary = `Export blocked: ${blockingIssues.length} issue(s) prevent export readiness`;
  }
  
  return {
    summary,
    blockingIssues,
    completionBreakdown: completionResult.segmentResults.map(segment => ({
      segmentId: segment.segmentId,
      segmentName: segment.segmentName,
      score: segment.score,
      weightPct: segment.weightPct,
      missingAttributes: segment.missingAttributes
    })),
    siteStatus: selectedSites.map(site => {
      const siteBlocking = completionResult.siteBlockingReasons.find(b => b.site === site);
      return {
        site,
        blocked: !!siteBlocking,
        reason: siteBlocking?.reason,
        missingAttributes: siteBlocking?.missingAttributes
      };
    }),
    actionRequired
  };
}

/**
 * Create blocked readiness result for error conditions
 */
function createBlockedReadiness(
  reason: string,
  selectedSites: string[],
  rules: CompletionRulesConfig | null,
  timestamp: string,
  productSnapshot?: ProductSnapshot
): CompletionDrivenExportReadiness {
  
  return {
    ready: false,
    completionPct: 0,
    threshold: rules?.exportUnlockThresholdPct || 80,
    hasBlockingSites: true,
    blockingReasons: [{
      type: 'REQUIRED_ATTRIBUTE_MISSING',
      severity: 'BLOCKING',
      message: reason,
      details: {}
    }],
    operatorExplanation: {
      summary: `Export blocked: ${reason}`,
      blockingIssues: [reason],
      completionBreakdown: [],
      siteStatus: selectedSites.map(site => ({
        site,
        blocked: true,
        reason: 'Configuration error'
      })),
      actionRequired: ['Fix completion rules configuration or product data']
    },
    evaluationTimestamp: timestamp,
    rulesVersion: rules?.rulesVersion || 0
  };
}

/**
 * Create error readiness result for system failures
 */
function createErrorReadiness(
  errorMessage: string,
  timestamp: string
): CompletionDrivenExportReadiness {
  
  return {
    ready: false,
    completionPct: 0,
    threshold: 80, // Fallback threshold
    hasBlockingSites: true,
    blockingReasons: [{
      type: 'REQUIRED_ATTRIBUTE_MISSING',
      severity: 'BLOCKING',
      message: `System error: ${errorMessage}`,
      details: {}
    }],
    operatorExplanation: {
      summary: `Export blocked due to system error`,
      blockingIssues: [errorMessage],
      completionBreakdown: [],
      siteStatus: [],
      actionRequired: ['Contact system administrator to resolve completion evaluation error']
    },
    evaluationTimestamp: timestamp,
    rulesVersion: 0
  };
}