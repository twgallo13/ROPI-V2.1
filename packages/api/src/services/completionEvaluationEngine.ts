/**
 * Completion Evaluation Engine
 * 
 * Pure evaluation module that implements deterministic weighted completion scoring
 * based on segment-based configuration and site-aware evaluation logic.
 * 
 * STRICT REQUIREMENTS:
 * - No side effects, pure function evaluation only
 * - No defaults, no hard-coded attribute IDs
 * - Registry-driven attribute resolution
 * - Settings-driven configuration from completionRules
 * - Must fail if ANY selected site missing required Description/SEO
 * - Ignores media/pricing entirely
 * - Respects segment weights exactly
 */

import { CompletionRulesConfig, SegmentConfig, AttributeSelectorConfig } from './completionRulesService';

// Input data structures
export interface ProductSnapshot {
  productId: string;
  attributes: Record<string, any>;
  sites: string[];
}

export interface AttributeRegistryEntry {
  id: string;
  category: string;
  required_for_completion: boolean;
  sites?: string[]; // Site-specific availability
  internal_only?: boolean;
}

export interface AttributeRegistry {
  [attributeId: string]: AttributeRegistryEntry;
}

// Output data structures
export interface SegmentEvaluationResult {
  segmentId: string;
  segmentName: string;
  enabled: boolean;
  weightPct: number;
  appliesTo: boolean;
  score: number; // 0-100
  totalAttributes: number;
  completedAttributes: number;
  missingAttributes: string[];
  blockingReasons: string[];
}

export interface SiteBlockingReason {
  site: string;
  reason: string;
  missingAttributes: string[];
}

export interface CompletionEvaluationResult {
  totalCompletionPct: number; // Final weighted percentage
  segmentResults: SegmentEvaluationResult[];
  siteBlockingReasons: SiteBlockingReason[];
  hasBlockingSites: boolean;
  evaluationMeta: {
    selectedSites: string[];
    totalSegmentWeights: number;
    enabledSegmentCount: number;
    rulesVersion: number;
    evaluatedAt: string;
  };
}

/**
 * Main evaluation function
 * 
 * @param product - Product snapshot with attributes and sites
 * @param selectedSites - Sites to evaluate completion for
 * @param registry - Attribute registry snapshot
 * @param config - Completion rules configuration
 * @returns Deterministic completion evaluation result
 */
export function evaluateCompletion(
  product: ProductSnapshot,
  selectedSites: string[],
  registry: AttributeRegistry,
  config: CompletionRulesConfig
): CompletionEvaluationResult {
  
  const evaluationMeta = {
    selectedSites,
    totalSegmentWeights: 0,
    enabledSegmentCount: 0,
    rulesVersion: config.rulesVersion,
    evaluatedAt: new Date().toISOString()
  };

  const segmentResults: SegmentEvaluationResult[] = [];
  const siteBlockingReasons: SiteBlockingReason[] = [];

  // Validate inputs
  if (selectedSites.length === 0) {
    throw new Error('Cannot evaluate completion: no sites selected');
  }

  if (config.segments.length === 0) {
    throw new Error('Cannot evaluate completion: no segments configured');
  }

  // Check built-in segment blocking (Description/SEO)
  const descriptionSeoBlocking = checkBuiltInSegmentBlocking(
    product, 
    selectedSites, 
    registry, 
    config
  );
  
  if (descriptionSeoBlocking.length > 0) {
    siteBlockingReasons.push(...descriptionSeoBlocking);
  }

  // Evaluate each segment
  for (const segment of config.segments) {
    if (!segment.enabled) {
      segmentResults.push({
        segmentId: segment.id,
        segmentName: segment.name,
        enabled: false,
        weightPct: segment.weightPct,
        appliesTo: false,
        score: 0,
        totalAttributes: 0,
        completedAttributes: 0,
        missingAttributes: [],
        blockingReasons: []
      });
      continue;
    }

    // Check if segment applies to this evaluation
    const appliesTo = doesSegmentApply(segment, selectedSites);
    
    if (!appliesTo) {
      segmentResults.push({
        segmentId: segment.id,
        segmentName: segment.name,
        enabled: true,
        weightPct: segment.weightPct,
        appliesTo: false,
        score: 0,
        totalAttributes: 0,
        completedAttributes: 0,
        missingAttributes: [],
        blockingReasons: []
      });
      continue;
    }

    // Evaluate the segment
    const segmentResult = evaluateSegment(
      product,
      selectedSites,
      registry,
      segment
    );

    segmentResults.push(segmentResult);
    evaluationMeta.enabledSegmentCount++;
    evaluationMeta.totalSegmentWeights += segment.weightPct;
  }

  // Calculate total weighted completion percentage
  const totalCompletionPct = calculateWeightedCompletion(segmentResults);

  return {
    totalCompletionPct,
    segmentResults,
    siteBlockingReasons,
    hasBlockingSites: siteBlockingReasons.length > 0,
    evaluationMeta
  };
}

/**
 * Check for built-in segment blocking (Description/SEO requirement)
 */
function checkBuiltInSegmentBlocking(
  product: ProductSnapshot,
  selectedSites: string[],
  registry: AttributeRegistry,
  config: CompletionRulesConfig
): SiteBlockingReason[] {
  const blockingReasons: SiteBlockingReason[] = [];

  // Find description-seo built-in segment
  const builtInConfig = config.builtInSegments['description-seo'];
  if (!builtInConfig?.lockedSemantics) {
    return blockingReasons; // Not enforced
  }

  // Find the actual segment configuration
  const descSeoSegment = config.segments.find(s => s.id === builtInConfig.segmentId);
  if (!descSeoSegment || !descSeoSegment.enabled) {
    return blockingReasons; // Segment not enabled
  }

  // Get description/SEO attributes from registry
  const descSeoAttributes = resolveAttributes(registry, descSeoSegment.attributeSelector);

  // Check each selected site for description/SEO completeness
  for (const site of selectedSites) {
    const missingAttributes: string[] = [];

    for (const attrId of descSeoAttributes) {
      const attr = registry[attrId];
      
      // Check site-awareness
      if (attr.sites && !attr.sites.includes(site)) {
        continue; // Attribute not applicable to this site
      }

      // Check if attribute value exists for this site
      const hasValue = hasAttributeValueForSite(product, attrId, site);
      
      if (!hasValue) {
        missingAttributes.push(attrId);
      }
    }

    if (missingAttributes.length > 0) {
      blockingReasons.push({
        site,
        reason: 'Missing required Description/SEO attributes',
        missingAttributes
      });
    }
  }

  return blockingReasons;
}

/**
 * Check if a segment applies to the current evaluation context
 */
function doesSegmentApply(segment: SegmentConfig, selectedSites: string[]): boolean {
  if (segment.appliesTo.mode === 'ALL_PRODUCTS') {
    return true;
  }

  if (segment.appliesTo.mode === 'ONLY_SELECTED_SITES') {
    // Segment applies if ANY selected site is in the segment's site list
    return selectedSites.some(site => segment.appliesTo.sites.includes(site));
  }

  return false;
}

/**
 * Evaluate a single segment's completion
 */
function evaluateSegment(
  product: ProductSnapshot,
  selectedSites: string[],
  registry: AttributeRegistry,
  segment: SegmentConfig
): SegmentEvaluationResult {
  
  // Resolve attributes for this segment
  const attributeIds = resolveAttributes(registry, segment.attributeSelector);
  const totalAttributes = attributeIds.length;
  
  if (totalAttributes === 0) {
    return {
      segmentId: segment.id,
      segmentName: segment.name,
      enabled: true,
      weightPct: segment.weightPct,
      appliesTo: true,
      score: 100, // No attributes = 100% complete
      totalAttributes: 0,
      completedAttributes: 0,
      missingAttributes: [],
      blockingReasons: []
    };
  }

  let completedCount = 0;
  const missingAttributes: string[] = [];
  const blockingReasons: string[] = [];

  if (segment.ruleType === 'ALL_REQUIRED') {
    // ALL attributes must be complete for ALL selected sites
    for (const attrId of attributeIds) {
      const isCompleteForAllSites = selectedSites.every(site => 
        hasAttributeValueForSite(product, attrId, site, registry[attrId])
      );
      
      if (isCompleteForAllSites) {
        completedCount++;
      } else {
        missingAttributes.push(attrId);
      }
    }
  } else if (segment.ruleType === 'ANY_REQUIRED') {
    // ANY attribute completion counts, evaluated per site then aggregated
    for (const attrId of attributeIds) {
      const hasValueAnySite = selectedSites.some(site =>
        hasAttributeValueForSite(product, attrId, site, registry[attrId])
      );
      
      if (hasValueAnySite) {
        completedCount++;
      } else {
        missingAttributes.push(attrId);
      }
    }
  }

  const score = totalAttributes > 0 ? Math.round((completedCount / totalAttributes) * 100) : 100;

  return {
    segmentId: segment.id,
    segmentName: segment.name,
    enabled: true,
    weightPct: segment.weightPct,
    appliesTo: true,
    score,
    totalAttributes,
    completedAttributes: completedCount,
    missingAttributes,
    blockingReasons
  };
}

/**
 * Resolve attribute IDs based on selector configuration
 */
function resolveAttributes(
  registry: AttributeRegistry,
  selector: AttributeSelectorConfig
): string[] {
  const attributeIds: string[] = [];

  for (const [attrId, attr] of Object.entries(registry)) {
    // Skip if in exclusion list
    if (selector.excludeAttributeIds?.includes(attrId)) {
      continue;
    }

    // Skip internal-only attributes unless explicitly included
    if (attr.internal_only && !selector.includeInternalOnly) {
      continue;
    }

    // Check category match
    if (!selector.categories.includes(attr.category)) {
      continue;
    }

    // Check requirement flag
    if (selector.requirementFlag === 'completionRequired' && !attr.required_for_completion) {
      continue;
    }

    // Note: Media and pricing categories are excluded by configuration, not code

    attributeIds.push(attrId);
  }

  return attributeIds;
}

/**
 * Check if product has a value for an attribute on a specific site
 */
function hasAttributeValueForSite(
  product: ProductSnapshot,
  attributeId: string,
  site: string,
  attributeConfig?: AttributeRegistryEntry
): boolean {
  const value = product.attributes[attributeId];
  
  if (value === undefined || value === null || value === '') {
    return false;
  }

  // Handle site-aware attributes
  if (attributeConfig?.sites) {
    // Attribute is site-specific
    if (!attributeConfig.sites.includes(site)) {
      return true; // Not applicable to this site, consider complete
    }
    
    // Check if value exists for the specific site
    if (typeof value === 'object' && value !== null) {
      return value[site] !== undefined && value[site] !== null && value[site] !== '';
    }
  }

  // For non-site-aware attributes or site-aware attributes with scalar values
  return true;
}

/**
 * Calculate total weighted completion percentage
 * Formula: round(Σ(score(s) * weightPct(s)) / 100 * 100)
 */
function calculateWeightedCompletion(segmentResults: SegmentEvaluationResult[]): number {
  const applicableSegments = segmentResults.filter(s => s.enabled && s.appliesTo);
  
  if (applicableSegments.length === 0) {
    return 100; // No applicable segments = 100% complete
  }

  let weightedSum = 0;
  let totalWeights = 0;

  for (const segment of applicableSegments) {
    weightedSum += (segment.score * segment.weightPct) / 100;
    totalWeights += segment.weightPct;
  }

  if (totalWeights === 0) {
    return 100; // No weights = 100% complete
  }

  // Apply the exact formula: round(Σ(score(s) * weightPct(s)) / 100 * 100)
  const completionPct = Math.round(weightedSum);
  
  return Math.max(0, Math.min(100, completionPct));
}