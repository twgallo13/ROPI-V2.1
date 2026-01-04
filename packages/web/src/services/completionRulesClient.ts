/**
 * Completion Rules Client
 * 
 * API client for fetching and saving completion rules from settings/exportSettings/completionRules.
 */

import { getFirestore, doc, getDoc, setDoc } from 'firebase/firestore';
import { getAuth } from 'firebase/auth';

export interface SegmentConfig {
  id: string;
  name: string;
  enabled: boolean;
  weightPct: number;
  ruleType: 'ALL_REQUIRED' | 'ANY_REQUIRED';
  appliesTo: {
    mode: 'ALL_PRODUCTS' | 'CONDITIONAL';
    sites: string[];
  };
  attributeSelector: {
    source: 'REGISTRY' | 'STATIC';
    categories?: string[];
    requirementFlag: string;
    siteAware: boolean;
    includeInternalOnly: boolean;
    excludeAttributeIds: string[];
    staticAttributeIds?: string[];
  };
}

export interface ExclusionConfig {
  affectsCompletion: boolean;
  reason: string;
}

export interface CompletionRulesConfig {
  schemaVersion: string;
  rulesVersion: number;
  updatedAt: string;
  updatedBy: string;
  exportUnlockThresholdPct: number;
  segments: SegmentConfig[];
  builtInSegments: Record<string, { segmentId: string; lockedSemantics: boolean }>;
  exclusions: {
    media: ExclusionConfig;
    pricing: ExclusionConfig;
  };
}

/**
 * Fetch current completion rules from Firestore
 */
export async function fetchCompletionRules(): Promise<CompletionRulesConfig | null> {
  try {
    const db = getFirestore();
    const settingsRef = doc(db, 'settings', 'exportSettings');
    const snapshot = await getDoc(settingsRef);

    if (!snapshot.exists()) {
      console.warn('[CompletionRulesClient] settings/exportSettings document not found');
      return null;
    }

    const data = snapshot.data();
    const rules = data?.completionRules;

    if (!rules) {
      console.warn('[CompletionRulesClient] completionRules field missing on settings/exportSettings');
      return null;
    }

    return rules as CompletionRulesConfig;
  } catch (error) {
    console.error('[CompletionRulesClient] Failed to fetch completion rules:', error);
    throw error;
  }
}

/**
 * Save completion rules to Firestore
 *
 * Note: Versioning and metadata are owned by the backend. The client must not
 * mutate rulesVersion/updatedAt/updatedBy; it should only write the user-edited
 * configuration fields as provided.
 */
export async function saveCompletionRules(rules: CompletionRulesConfig): Promise<void> {
  try {
    const db = getFirestore();
    const auth = getAuth();

    if (!auth.currentUser) {
      throw new Error('User not authenticated');
    }

    // Validate rules before saving (client-side parity with backend constraints)
    validateRules(rules);

    // Persist without client-side metadata/version mutation
    const settingsRef = doc(db, 'settings', 'exportSettings');
    await setDoc(settingsRef, { completionRules: rules }, { merge: true });

    console.log('[CompletionRulesClient] Completion rules saved successfully');
  } catch (error) {
    console.error('[CompletionRulesClient] Failed to save completion rules:', error);
    throw error;
  }
}

/**
 * Validate completion rules configuration
 */
function validateRules(rules: CompletionRulesConfig): void {
  if (!rules.segments || rules.segments.length === 0) {
    throw new Error('At least one segment is required');
  }

  if (
    typeof rules.exportUnlockThresholdPct !== 'number' ||
    rules.exportUnlockThresholdPct < 0 ||
    rules.exportUnlockThresholdPct > 100
  ) {
    throw new Error('Threshold must be a percentage (0-100)');
  }

  const enabledSegments = rules.segments.filter((s) => s.enabled);
  if (enabledSegments.length === 0) {
    throw new Error('At least one segment must be enabled');
  }

  const totalWeight = enabledSegments.reduce((sum, s) => sum + (s.weightPct || 0), 0);
  if (Math.abs(totalWeight - 100) > 0.1) {
    throw new Error(
      `Enabled segment weights must sum to 100% (got ${totalWeight.toFixed(1)}%)`
    );
  }

  for (const segment of rules.segments) {
    const segmentLabel = segment.name || segment.id || 'segment';

    if (!segment.id || !segment.name) {
      throw new Error(`Segment ${segment.id || '<missing-id>'}: id and name are required`);
    }

    if (
      typeof segment.weightPct !== 'number' ||
      segment.weightPct < 0 ||
      segment.weightPct > 100
    ) {
      throw new Error(`Segment "${segmentLabel}" weightPct must be between 0 and 100`);
    }

    if (!['ALL_REQUIRED', 'ANY_REQUIRED'].includes(segment.ruleType)) {
      throw new Error(`Segment "${segmentLabel}" ruleType must be ALL_REQUIRED or ANY_REQUIRED`);
    }

    const appliesToMode = segment.appliesTo?.mode || 'ALL_PRODUCTS';
    const appliesToSites = segment.appliesTo?.sites ?? [];

    if (!['ALL_PRODUCTS', 'CONDITIONAL'].includes(appliesToMode)) {
      throw new Error(`Segment "${segmentLabel}" has invalid appliesTo.mode`);
    }

    if (!Array.isArray(appliesToSites)) {
      throw new Error(`Segment ${segment.id}: appliesTo.sites must be an array`);
    }

    if (segment.enabled && appliesToMode === 'CONDITIONAL' && appliesToSites.length === 0) {
      throw new Error(`Segment "${segmentLabel}" is enabled but no sites selected`);
    }

    const selector = segment.attributeSelector;
    if (!selector) {
      throw new Error(`Segment ${segment.id}: attributeSelector is required`);
    }

    if (!['REGISTRY', 'STATIC'].includes(selector.source)) {
      throw new Error(`Segment "${segmentLabel}" attributeSelector.source is invalid`);
    }

    if (selector.source === 'REGISTRY') {
      const categories = (selector.categories || []).filter((c) => c && c.trim().length > 0);
      if (!selector.requirementFlag || selector.requirementFlag.trim().length === 0) {
        throw new Error(`Segment "${segmentLabel}" requires requirementFlag when using REGISTRY source`);
      }
      if (categories.length === 0) {
        throw new Error(`Segment "${segmentLabel}" requires categories when using REGISTRY source`);
      }
    }

    if (selector.source === 'STATIC') {
      const staticIds = selector.staticAttributeIds || [];
      if (staticIds.length === 0) {
        throw new Error(`Segment "${segmentLabel}" requires staticAttributeIds when using STATIC source`);
      }
    }
  }
}
