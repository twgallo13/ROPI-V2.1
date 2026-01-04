/**
 * Completion Rules Client
 * 
 * API client for fetching and saving completion rules from settings/exportSettings/completionRules.
 */

import { getFirestore, doc, getDoc, setDoc, Timestamp } from 'firebase/firestore';
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
    const rulesRef = doc(db, 'settings/exportSettings/completionRules');
    const snapshot = await getDoc(rulesRef);

    if (!snapshot.exists()) {
      console.warn('[CompletionRulesClient] No completion rules found in Firestore');
      return null;
    }

    const data = snapshot.data();
    return data as CompletionRulesConfig;
  } catch (error) {
    console.error('[CompletionRulesClient] Failed to fetch completion rules:', error);
    throw error;
  }
}

/**
 * Save completion rules to Firestore
 */
export async function saveCompletionRules(rules: CompletionRulesConfig): Promise<void> {
  try {
    const db = getFirestore();
    const auth = getAuth();
    const user = auth.currentUser;

    if (!user) {
      throw new Error('User not authenticated');
    }

    // Update metadata
    const updatedRules = {
      ...rules,
      updatedAt: new Date().toISOString(),
      updatedBy: user.email || 'unknown',
      rulesVersion: (rules.rulesVersion || 0) + 1
    };

    // Validate rules before saving
    validateRules(updatedRules);

    // Save to live path
    const rulesRef = doc(db, 'settings/exportSettings/completionRules');
    await setDoc(rulesRef, updatedRules);

    // Save versioned snapshot
    const versionRef = doc(db, `settings/exportSettings/completionRulesVersions/${updatedRules.rulesVersion}`);
    await setDoc(versionRef, updatedRules);

    console.log('[CompletionRulesClient] Completion rules saved successfully', {
      version: updatedRules.rulesVersion,
      updatedBy: updatedRules.updatedBy
    });
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

  // Validate threshold
  if (typeof rules.exportUnlockThresholdPct !== 'number' || 
      rules.exportUnlockThresholdPct < 0 || 
      rules.exportUnlockThresholdPct > 100) {
    throw new Error('Threshold must be a percentage (0-100)');
  }

  // Validate segment weights
  const enabledSegments = rules.segments.filter(s => s.enabled);
  if (enabledSegments.length === 0) {
    throw new Error('At least one segment must be enabled');
  }

  const totalWeight = enabledSegments.reduce((sum, s) => sum + (s.weightPct || 0), 0);
  if (Math.abs(totalWeight - 100) > 0.1) {
    throw new Error(`Enabled segment weights must sum to 100% (got ${totalWeight.toFixed(1)}%)`);
  }

  // Validate segments
  for (const segment of rules.segments) {
    if (!segment.id || !segment.name) {
      throw new Error(`Segment missing id or name`);
    }

    if (!Array.isArray(segment.appliesTo?.sites)) {
      throw new Error(`Segment ${segment.id}: appliesTo.sites must be an array`);
    }

    if (!segment.attributeSelector) {
      throw new Error(`Segment ${segment.id}: attributeSelector is required`);
    }
  }
}
