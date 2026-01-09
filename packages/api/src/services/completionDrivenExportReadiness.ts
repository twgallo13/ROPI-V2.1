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

export interface SegmentScore {
  segmentId: string;
  segmentName: string;
  score: number;
  weightPct: number;
  missingAttributes: string[];
}

export interface ProductLevelReadiness {
  aggregatedCompletionPct: number;
  segmentScores: SegmentScore[];
  missingGlobalAttributes: string[];
  websiteOptional: boolean;
  sitesEvaluated: string[];
  blockingSegments: string[];
}

export interface CompletionDrivenExportReadiness {
  // LP-phase2b-001: Product identification (MPN-first, product_id internal only)
  // Optional for catalog-level calls, required for product-level calls
  productIdentifiers?: {
    mpn: string;           // Canonical user-facing identifier (REQUIRED in product context)
    productId: string;     // Internal lookup key (for admin debug only)
  };
  ready: boolean;
  completionPct: number;
  threshold: number;
  hasBlockingSites: boolean;
  blockingReasons: ExportBlockingReason[];
  operatorExplanation: OperatorExplanation;
  // Phase 1 extension (feature-flagged, non-breaking)
  // mode indicates exposure context only; does not change evaluation semantics
  mode?: 'GLOBAL' | 'SITE_SCOPED';
  productLevelReadiness?: {
    ready: boolean;
    completionPct: number;
    threshold: number;
    hasBlockingSites: boolean;
  } | ProductLevelReadiness; // Phase 2: Extended for full aggregation
  catalogStats?: {
    totalProducts: number;
    blockedByCompletionCount: number;
    blockedBySiteCount: number;
    readyCount: number;
  };
  evaluationTimestamp: string;
  rulesVersion: number;
}

export interface ExportBlockingReason {
  type: 'COMPLETION_BELOW_THRESHOLD' | 'SITE_DESCRIPTION_SEO_MISSING' | 'REQUIRED_ATTRIBUTE_MISSING';
  severity: 'BLOCKING' | 'WARNING';
  message: string;
  details: {
    productId?: string;
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
// Catalog-Level Evaluation
// ============================================================================

/**
 * GOVERNANCE CONTRACT: Conservative catalog-level blocking
 * 
 * Policy: ANY product blocked → entire export blocked
 * - If ANY product has site Description/SEO blocking → export blocked
 * - Otherwise, if ANY product below threshold → export blocked
 * - Otherwise → export ready
 * 
 * No averaging, no hidden defaults, deterministic sample selection.
 * 
 * @param rules - Completion rules configuration
 * @param attributeRegistry - Attribute registry
 * @param timestamp - Evaluation timestamp
 * @returns CompletionDrivenExportReadiness - Conservative catalog readiness
 */
async function evaluateCatalogCompletion(
  rules: CompletionRulesConfig,
  attributeRegistry: AttributeRegistry,
  timestamp: string
): Promise<CompletionDrivenExportReadiness> {
  const admin = require('firebase-admin');
  const db = admin.firestore();
  
  // Query all products - explicit limit with deterministic ordering
  const productsSnapshot = await db
    .collection('products')
    .orderBy('id')
    .limit(1000)
    .get();
  
  if (productsSnapshot.empty) {
    return {
      ready: false,
      completionPct: 0,
      threshold: rules.exportUnlockThresholdPct,
      hasBlockingSites: false,
      blockingReasons: [{
        type: 'COMPLETION_BELOW_THRESHOLD',
        severity: 'BLOCKING',
        message: 'No products in catalog',
        details: {}
      }],
      operatorExplanation: {
        summary: 'Export blocked: no products in catalog',
        blockingIssues: ['Catalog contains no products'],
        completionBreakdown: [],
        siteStatus: [],
        actionRequired: ['Add products to catalog']
      },
      catalogStats: {
        totalProducts: 0,
        blockedByCompletionCount: 0,
        blockedBySiteCount: 0,
        readyCount: 0
      },
      evaluationTimestamp: timestamp,
      rulesVersion: rules.rulesVersion
    };
  }
  
  // Evaluate each product conservatively
  interface ProductEvaluation {
    productId: string;
    completionPct: number;
    hasBlockingSites: boolean;
    siteBlockingReasons: SiteBlockingReason[];
    isBelowThreshold: boolean;
  }
  
  const evaluations: ProductEvaluation[] = [];
  const SAMPLE_LIMIT = 5; // Explicit, deterministic sample size for operator visibility
  
  for (const doc of productsSnapshot.docs) {
    const product = { id: doc.id, ...doc.data() } as ProductDocument;
    const productSnapshot = convertToProductSnapshot(product);
    const selectedSites = extractSelectedSites(product);
    
    if (selectedSites.length === 0) continue;
    
    const result = evaluateCompletion(
      productSnapshot,
      selectedSites,
      attributeRegistry,
      rules,
      timestamp
    );
    
    evaluations.push({
      productId: product.id,
      completionPct: result.totalCompletionPct,
      hasBlockingSites: result.hasBlockingSites,
      siteBlockingReasons: result.siteBlockingReasons,
      isBelowThreshold: result.totalCompletionPct < rules.exportUnlockThresholdPct
    });
  }
  
  // Conservative policy: ANY product blocked → export blocked
  const blockedBySite = evaluations.filter(e => e.hasBlockingSites);
  const blockedByThreshold = evaluations.filter(e => !e.hasBlockingSites && e.isBelowThreshold);
  const ready = evaluations.filter(e => !e.hasBlockingSites && !e.isBelowThreshold);
  
  const hasAnyBlocking = blockedBySite.length > 0 || blockedByThreshold.length > 0;
  const minCompletionPct = evaluations.length > 0 
    ? Math.min(...evaluations.map(e => e.completionPct))
    : 0;
  
  // Build blocking reasons (prioritize site blocking)
  const blockingReasons: ExportBlockingReason[] = [];
  
  if (blockedBySite.length > 0) {
    // Take first N samples for operator visibility
    const sampleProducts = blockedBySite.slice(0, SAMPLE_LIMIT);
    
    for (const sample of sampleProducts) {
      for (const siteBlock of sample.siteBlockingReasons) {
        blockingReasons.push({
          type: 'SITE_DESCRIPTION_SEO_MISSING',
          severity: 'BLOCKING',
          message: `Product ${sample.productId}: missing Description/SEO attributes for ${siteBlock.site}`,
          details: {
            site: siteBlock.site,
            missingAttributes: siteBlock.missingAttributes,
            productId: sample.productId
          }
        });
      }
    }
    
    // Indicate if more products are blocked beyond sample
    if (blockedBySite.length > SAMPLE_LIMIT) {
      blockingReasons.push({
        type: 'SITE_DESCRIPTION_SEO_MISSING',
        severity: 'BLOCKING',
        message: `${blockedBySite.length - SAMPLE_LIMIT} additional products also blocked by site requirements`,
        details: {}
      });
    }
  } else if (blockedByThreshold.length > 0) {
    // Only show threshold blocking if NO site blocking
    const sampleProducts = blockedByThreshold.slice(0, SAMPLE_LIMIT);
    
    for (const sample of sampleProducts) {
      blockingReasons.push({
        type: 'COMPLETION_BELOW_THRESHOLD',
        severity: 'BLOCKING',
        message: `Product ${sample.productId}: ${sample.completionPct}% below threshold ${rules.exportUnlockThresholdPct}%`,
        details: {
          productId: sample.productId,
          currentCompletion: sample.completionPct,
          requiredCompletion: rules.exportUnlockThresholdPct
        }
      });
    }
    
    if (blockedByThreshold.length > SAMPLE_LIMIT) {
      blockingReasons.push({
        type: 'COMPLETION_BELOW_THRESHOLD',
        severity: 'BLOCKING',
        message: `${blockedByThreshold.length - SAMPLE_LIMIT} additional products below threshold`,
        details: {}
      });
    }
  }
  
  // Generate operator explanation
  const operatorExplanation: OperatorExplanation = {
    summary: hasAnyBlocking
      ? blockedBySite.length > 0
        ? `Export blocked: ${blockedBySite.length} products missing Description/SEO attributes`
        : `Export blocked: ${blockedByThreshold.length} products below ${rules.exportUnlockThresholdPct}% threshold`
      : `Export ready: all ${ready.length} products meet requirements (min completion: ${minCompletionPct}%)`,
    blockingIssues: blockingReasons.map(r => r.message),
    completionBreakdown: [],
    siteStatus: [],
    actionRequired: hasAnyBlocking
      ? blockedBySite.length > 0
        ? [`Fix Description/SEO attributes for ${blockedBySite.length} products`]
        : [`Increase completion for ${blockedByThreshold.length} products to ${rules.exportUnlockThresholdPct}% or higher`]
      : []
  };
  
  return {
    ready: !hasAnyBlocking,
    completionPct: blockedBySite.length > 0 ? 0 : minCompletionPct, // Force 0 when site-blocked
    threshold: rules.exportUnlockThresholdPct,
    hasBlockingSites: blockedBySite.length > 0,
    blockingReasons,
    operatorExplanation,
    catalogStats: {
      totalProducts: evaluations.length,
      blockedByCompletionCount: blockedByThreshold.length,
      blockedBySiteCount: blockedBySite.length,
      readyCount: ready.length
    },
    evaluationTimestamp: timestamp,
    rulesVersion: rules.rulesVersion
  };
}

// ============================================================================
// Phase 2: Product-Level Aggregation (GLOBAL Mode)
// ============================================================================

/**
 * Aggregate product-level readiness across all sites (GLOBAL mode)
 * 
 * Per HES B design: evaluates all sites product is associated with,
 * computes BEST score per segment, then weighted average aggregation.
 * Excludes site-specific Description/SEO blocking (global attributes only).
 * 
 * @param product - Product document with sites
 * @param completionRules - Threshold and segment configuration
 * @param attributeRegistry - Global attribute registry
 * @param evaluationTimestamp - Evaluation timestamp for logs
 * @returns ProductLevelReadiness with aggregated completion and segment scores
 */
async function aggregateProductLevelReadiness(
  product: ProductDocument,
  completionRules: CompletionRulesConfig,
  attributeRegistry: AttributeRegistry,
  evaluationTimestamp: string
): Promise<ProductLevelReadiness> {
  
  // Extract ALL sites product is associated with
  const allSites = extractSelectedSites(product);
  const sitesEvaluated = allSites.length > 0 ? allSites : ['__GLOBAL__'];
  
  // Evaluate completion for each site, collect global segment scores only
  const segmentScoresPerSite: SegmentScore[][] = [];
  
  for (const site of sitesEvaluated) {
    const productSnapshot = convertToProductSnapshot(product);
    
    try {
      const completionResult = evaluateCompletion(
        productSnapshot,
        [site],
        attributeRegistry,
        completionRules,
        evaluationTimestamp
      );
      
      // Filter to global attributes only (exclude site-specific Description/SEO)
      const globalSegments = completionResult.segmentResults
        .filter(seg => seg.segmentId !== 'description-seo') // Exclude site-blocking
        .map(seg => ({
          segmentId: seg.segmentId,
          segmentName: seg.segmentName,
          score: seg.score,
          weightPct: seg.weightPct,
          missingAttributes: seg.missingAttributes
        }));
      
      segmentScoresPerSite.push(globalSegments);
    } catch (error) {
      console.warn(`[ProductLevelAgg] Site ${site} evaluation failed:`, error);
      // Continue with empty scores for this site
      segmentScoresPerSite.push([]);
    }
  }
  
  // Aggregate: Take BEST score per segment across all sites (HES B algorithm)
  const segmentScoresAggregated = aggregateSegmentScoresBest(segmentScoresPerSite);
  
  // Calculate weighted average completion
  const totalWeight = segmentScoresAggregated.reduce((sum, seg) => sum + seg.weightPct, 0);
  const weightedSum = segmentScoresAggregated.reduce(
    (sum, seg) => sum + (seg.score * seg.weightPct / 100),
    0
  );
  const aggregatedCompletionPct = totalWeight > 0 
    ? Math.round((weightedSum / totalWeight) * 100) 
    : 0;
  
  // Collect all missing attributes across segments (union)
  const missingGlobalAttributes = Array.from(
    new Set(
      segmentScoresAggregated.flatMap(seg => seg.missingAttributes)
    )
  ).sort();
  
  // Identify blocking segments (score < 100)
  const blockingSegments = segmentScoresAggregated
    .filter(seg => seg.score < 100)
    .map(seg => seg.segmentId);
  
  // Phase 2 staging log
  if (process.env.EXPORT_GLOBAL_LOGS === 'true') {
    console.info('[ProductLevelAgg:Phase2] Aggregation result:', {
      aggregatedCompletionPct,
      segmentCount: segmentScoresAggregated.length,
      sitesEvaluated,
      blockingSegmentCount: blockingSegments.length
    });
  }
  
  return {
    aggregatedCompletionPct,
    segmentScores: segmentScoresAggregated,
    missingGlobalAttributes,
    websiteOptional: allSites.length === 0,
    sitesEvaluated,
    blockingSegments
  };
}

/**
 * Aggregate segment scores: take BEST score per segment across all sites
 * Per HES B design algorithm
 */
function aggregateSegmentScoresBest(scoresPerSite: SegmentScore[][]): SegmentScore[] {
  const segmentMap = new Map<string, SegmentScore>();
  
  for (const siteScores of scoresPerSite) {
    for (const score of siteScores) {
      const existing = segmentMap.get(score.segmentId);
      // Keep the BEST (highest) score per segment
      if (!existing || score.score > existing.score) {
        segmentMap.set(score.segmentId, { ...score });
      }
    }
  }
  
  return Array.from(segmentMap.values());
}

// ============================================================================
// Main Export Readiness Function
// ============================================================================

/**
 * Extract product identifiers for API response
 * LP-phase2b-001: MPN is canonical, product_id is internal only
 */
function extractProductIdentifiers(product: ProductDocument): {
  mpn: string;
  productId: string;
} {
  const mpn = product.mpn || 'UNKNOWN-MPN';
  const productId = product.id;
  return { mpn, productId };
}

/**
 * Calculate completion-driven export readiness
 * 
 * Replaces the legacy calculateExportReadiness function with completion-based evaluation
 * that enforces site-aware blocking and threshold-based gating.
 * 
 * When product is provided: evaluates that specific product's completion
 * When product is omitted: evaluates catalog-level completion (queries all products)
 * 
 * Phase 2: Supports GLOBAL mode with product-level aggregation via feature flag
 * 
 * @param product - Optional product document. If omitted, evaluates full catalog
 * @param forceRulesRefresh - Force reload of completion rules from Firestore
 * @param evaluatedAt - Optional explicit timestamp for deterministic output
 * @returns Promise<CompletionDrivenExportReadiness> - Enhanced readiness result with operator explanations
 */
export async function calculateCompletionDrivenExportReadiness(
  product?: ProductDocument,
  forceRulesRefresh = false,
  evaluatedAt?: string
): Promise<CompletionDrivenExportReadiness> {
  
  const evaluationTimestamp = evaluatedAt || new Date().toISOString();
  
  try {
    // Load completion rules configuration
    const completionRules = await loadCompletionRules(forceRulesRefresh);
    
    // Load attribute registry
    const attributeRegistry = await loadAttributeRegistryForCompletion();

    // Phase 1 feature flag: expose mode + productLevelReadiness without changing semantics
    const featureMode = await detectExportModeFeatureFlag().catch(() => 'SITE_SCOPED' as const);
    
    // If no product provided, evaluate catalog-level completion
    if (!product) {
      const result = await evaluateCatalogCompletion(completionRules, attributeRegistry, evaluationTimestamp);
      if (featureMode === 'GLOBAL') {
        // Add Phase 1 fields (non-breaking)
        const extended: CompletionDrivenExportReadiness = {
          ...result,
          mode: 'GLOBAL',
          productLevelReadiness: {
            ready: result.ready,
            completionPct: result.completionPct,
            threshold: result.threshold,
            hasBlockingSites: result.hasBlockingSites
          }
        };
        // Temporary logging for staging verification (set EXPORT_GLOBAL_LOGS=true to enable)
        if (process.env.EXPORT_GLOBAL_LOGS === 'true') {
          console.info('[ExportReadiness:Phase1] mode=GLOBAL (catalog), productLevelReadiness=', extended.productLevelReadiness);
        }
        return extended;
      }
      return result;
    }
    
    // Convert product to completion engine format
    const productSnapshot = convertToProductSnapshot(product);
    const selectedSites = extractSelectedSites(product);
    
    // Phase 2: GLOBAL mode path (product-level aggregation)
    if (featureMode === 'GLOBAL') {
      const productLevelReadiness = await aggregateProductLevelReadiness(
        product,
        completionRules,
        attributeRegistry,
        evaluationTimestamp
      );
      
      const isReady = productLevelReadiness.aggregatedCompletionPct >= completionRules.exportUnlockThresholdPct;
      
      return {
        productIdentifiers: extractProductIdentifiers(product),
        mode: 'GLOBAL',
        ready: isReady,
        completionPct: productLevelReadiness.aggregatedCompletionPct,
        threshold: completionRules.exportUnlockThresholdPct,
        hasBlockingSites: false, // No site-specific blocking in GLOBAL mode
        blockingReasons: isReady ? [] : [{
          type: 'COMPLETION_BELOW_THRESHOLD',
          severity: 'BLOCKING',
          message: `Product ${productLevelReadiness.aggregatedCompletionPct}% complete (threshold: ${completionRules.exportUnlockThresholdPct}%)`,
          details: {
            currentCompletion: productLevelReadiness.aggregatedCompletionPct,
            requiredCompletion: completionRules.exportUnlockThresholdPct,
            missingAttributes: productLevelReadiness.missingGlobalAttributes
          }
        }],
        operatorExplanation: generateGlobalOperatorExplanation(productLevelReadiness, completionRules),
        productLevelReadiness,
        evaluationTimestamp,
        rulesVersion: completionRules.rulesVersion
      };
    }
    
    // SITE_SCOPED mode path (existing logic)
    
    // If no sites selected, export is blocked
    if (selectedSites.length === 0) {
      return createBlockedReadiness(
        'No sites selected for product',
        [],
        completionRules,
        evaluationTimestamp,
        productSnapshot,
        product  // LP-phase2b-001: Pass product for MPN extraction
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
    
    // PROMPT B: Single canonical gate - prioritize site blocking, force completion to 0
    const hasSiteBlocking = completionResult.hasBlockingSites;
    const reportedCompletion = hasSiteBlocking ? 0 : completionResult.totalCompletionPct;
    
    // Generate blocking reasons (site blocking takes priority - no threshold duplicate)
    const blockingReasons = generateBlockingReasons(completionResult, completionRules);
    const operatorExplanation = generateOperatorExplanation(completionResult, completionRules, selectedSites);
    
    const base: CompletionDrivenExportReadiness = {
      productIdentifiers: extractProductIdentifiers(product),
      ready: isReady,
      completionPct: reportedCompletion, // PROMPT B: Force 0 when site-blocked
      threshold: completionRules.exportUnlockThresholdPct,
      hasBlockingSites: completionResult.hasBlockingSites,
      blockingReasons,
      operatorExplanation,
      evaluationTimestamp,
      rulesVersion: completionRules.rulesVersion
    };

    // Attach Phase 1 fields when feature flag is enabled
    if (featureMode === 'GLOBAL') {
      const extended: CompletionDrivenExportReadiness = {
        ...base,
        mode: 'GLOBAL',
        productLevelReadiness: {
          ready: base.ready,
          completionPct: base.completionPct,
          threshold: base.threshold,
          hasBlockingSites: base.hasBlockingSites
        }
      };
      // Temporary logging for staging verification (set EXPORT_GLOBAL_LOGS=true to enable)
      if (process.env.EXPORT_GLOBAL_LOGS === 'true') {
        console.info('[ExportReadiness:Phase1] mode=GLOBAL (product), productLevelReadiness=', extended.productLevelReadiness);
      }
      return extended;
    }
    return base;
    
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
 * Precedence: websites → sites → website (string) → attributes.website
 * LP-export-completion-fix-1.0.0: Added attributes.website support for CSV imports
 * @exported for testing
 */
export function extractSelectedSites(product: ProductDocument): string[] {
  // LP-export-site-extract-1.0.0: Precedence order:
  // 1. product.websites (array)
  // 2. product.sites (array)
  // 3. product.website (string)
  // 4. product.attributes.website (array or string)
  
  if (Array.isArray(product.websites) && product.websites.length > 0) {
    return product.websites;
  }
  if (Array.isArray(product.sites) && product.sites.length > 0) {
    return product.sites;
  }
  if (product.website && typeof product.website === 'string' && product.website.trim()) {
    return [product.website.trim()];
  }
  
  // LP-export-completion-fix-1.0.0 + LP-export-site-extract-1.0.0:
  // Support attributes.website as array or string (CSV imports)
  const attrSite = product.attributes?.website;
  if (Array.isArray(attrSite) && attrSite.length > 0) {
    return attrSite;
  }
  if (typeof attrSite === 'string' && attrSite.trim()) {
    return [attrSite.trim()];
  }
  
  return [];
}

/**
 * Phase 1 feature flag detection — detects GLOBAL export mode exposure
 * 
 * Canonical Firestore form:
 *   settings/exportSettings.exportGlobalMode = { enabled: boolean, mode: "GLOBAL" | "SITE_SCOPED" }
 * 
 * Legacy/compatibility keys (normalized):
 *   - globalExportModeEnabled, enableGlobalFields, mode at root level
 * 
 * Fallback: env var EXPORT_GLOBAL_MODE_FEATURE=true (local/CI convenience only)
 * 
 * Logs: temporary console.info behind this flag; set EXPORT_GLOBAL_LOGS=true to enable,
 * or set EXPORT_GLOBAL_MODE_FEATURE=true (logs enabled by default when feature active).
 * 
 * Returns 'GLOBAL' when enabled, otherwise 'SITE_SCOPED'
 */
async function detectExportModeFeatureFlag(): Promise<'GLOBAL' | 'SITE_SCOPED'> {
  try {
    const admin = require('firebase-admin');
    if (admin?.apps?.length === 0 && admin?.initializeApp) {
      // Best-effort init in non-functions context
      admin.initializeApp();
    }
    const db = admin.firestore();
    const doc = await db.collection('settings').doc('exportSettings').get();
    const data = doc.exists ? doc.data() || {} : {};
    
    // Canonical form: exportGlobalMode.enabled
    const canonical = data.exportGlobalMode;
    if (canonical && typeof canonical === 'object') {
      const enabled = !!(canonical.enabled === true);
      return enabled ? 'GLOBAL' : 'SITE_SCOPED';
    }
    
    // Legacy/compatibility keys (normalize to canonical)
    const legacyEnabled = !!(
      data.globalExportModeEnabled === true ||
      data.enableGlobalFields === true ||
      data.mode === 'GLOBAL'
    );
    return legacyEnabled ? 'GLOBAL' : 'SITE_SCOPED';
  } catch {
    // Fallback to env var (local/CI convenience)
    const fromEnv = (process.env.EXPORT_GLOBAL_MODE_FEATURE || '').toLowerCase();
    const enabled = fromEnv === '1' || fromEnv === 'true' || fromEnv === 'yes';
    return enabled ? 'GLOBAL' : 'SITE_SCOPED';
  }
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
 * Generate operator explanation for GLOBAL mode
 */
function generateGlobalOperatorExplanation(
  productReadiness: ProductLevelReadiness,
  rules: CompletionRulesConfig
): OperatorExplanation {
  const isReady = productReadiness.aggregatedCompletionPct >= rules.exportUnlockThresholdPct;
  
  return {
    summary: isReady 
      ? `Export ready: product ${productReadiness.aggregatedCompletionPct}% complete (GLOBAL mode)`
      : `Export blocked: product ${productReadiness.aggregatedCompletionPct}% complete (threshold: ${rules.exportUnlockThresholdPct}%)`,
    blockingIssues: isReady ? [] : [
      `Product completion ${productReadiness.aggregatedCompletionPct}% below threshold ${rules.exportUnlockThresholdPct}%`,
      ...productReadiness.blockingSegments.map(seg => `Segment ${seg} incomplete`)
    ],
    completionBreakdown: productReadiness.segmentScores,
    siteStatus: productReadiness.sitesEvaluated.map(site => ({
      site,
      blocked: false // No site-level blocking in GLOBAL mode
    })),
    actionRequired: isReady ? [] : [
      `Complete missing attributes: ${productReadiness.missingGlobalAttributes.join(', ')}`
    ]
  };
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
      message: `Product completion ${completionResult.totalCompletionPct}% is below export threshold ${rules.exportUnlockThresholdPct}%`,
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
      actionRequired.push(`Add missing attributes for ${siteBlocking.site}: ${siteBlocking.missingAttributes.join(', ')}`);
    }
  }
  
  // Completion threshold issues (only if no site blocking)
  if (!completionResult.hasBlockingSites && 
      completionResult.totalCompletionPct < rules.exportUnlockThresholdPct) {
    blockingIssues.push(`Product completion ${completionResult.totalCompletionPct}% is below export threshold ${rules.exportUnlockThresholdPct}%`);
    actionRequired.push(`Increase product completion to ${rules.exportUnlockThresholdPct}% or higher`);
  }
  
  // Generate summary
  let summary: string;
  if (completionResult.hasBlockingSites) {
    const sitesAffected = completionResult.siteBlockingReasons.map(s => s.site).join(', ');
    summary = `Export blocked: missing Description/SEO attributes for ${sitesAffected}`;
  } else if (completionResult.totalCompletionPct < rules.exportUnlockThresholdPct) {
    summary = `Export blocked: product ${completionResult.totalCompletionPct}% complete (threshold: ${rules.exportUnlockThresholdPct}%)`;
  } else {
    summary = `Export ready: product ${completionResult.totalCompletionPct}% complete (threshold: ${rules.exportUnlockThresholdPct}%)`;
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
      if (siteBlocking) {
        return {
          site,
          blocked: true,
          reason: siteBlocking.reason,
          missingAttributes: siteBlocking.missingAttributes
        };
      }
      return {
        site,
        blocked: false
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
  productSnapshot?: ProductSnapshot,
  product?: ProductDocument
): CompletionDrivenExportReadiness {
  
  return {
    // LP-phase2b-001: ALWAYS include productIdentifiers (binding MPN-first rule)
    ...(product ? { productIdentifiers: extractProductIdentifiers(product) } : {}),
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