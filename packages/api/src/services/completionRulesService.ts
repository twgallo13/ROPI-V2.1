/**
 * Completion Rules Service
 * 
 * Service layer for reading completion rules configuration from Firestore.
 * Provides the configuration needed by the completion evaluation engine.
 * 
 * GOVERNANCE COMPLIANCE:
 * - Settings-driven configuration (reads from settings/exportSettings/completionRules)
 * - No defaults, no hard-coded rules
 * - Immutable configuration snapshots with versioning
 */

import { getFirestore } from 'firebase-admin/firestore';

// ============================================================================
// Configuration Types (used by completion evaluation engine)
// ============================================================================

export interface CompletionRulesConfig {
  schemaVersion: string;
  rulesVersion: number;
  updatedAt: string;
  updatedBy: string;
  exportUnlockThresholdPct: number;
  segments: SegmentConfig[];
  builtInSegments: Record<string, BuiltInSegmentConfig>;
  exclusions: {
    media: ExclusionConfig;
    pricing: ExclusionConfig;
  };
}

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
  attributeSelector: AttributeSelectorConfig;
}

export interface AttributeSelectorConfig {
  source: 'REGISTRY' | 'STATIC';
  categories?: string[];
  requirementFlag: string; // e.g. 'completionRequired', 'required_for_completion'
  siteAware: boolean;
  includeInternalOnly: boolean;
  excludeAttributeIds: string[];
  staticAttributeIds?: string[]; // Only used when source = 'STATIC'
}

export interface BuiltInSegmentConfig {
  segmentId: string;
  lockedSemantics: boolean;
}

export interface ExclusionConfig {
  affectsCompletion: boolean;
  reason: string;
}

// ============================================================================
// Firestore Service
// ============================================================================

/**
 * Load completion rules configuration from Firestore
 * 
 * @param forceLatest - If true, loads from live path. If false, tries cache first
 * @returns Promise<CompletionRulesConfig> - The active completion rules configuration
 * @throws Error if no completion rules are configured
 */
export async function loadCompletionRules(forceLatest = false): Promise<CompletionRulesConfig> {
  const db = getFirestore();
  
  try {
    // Load live configuration from settings
    const rulesRef = db.doc('settings/exportSettings/completionRules');
    const snapshot = await rulesRef.get();
    
    if (!snapshot.exists) {
      throw new Error('No completion rules configured in settings/exportSettings/completionRules');
    }
    
    const data = snapshot.data();
    if (!data) {
      throw new Error('Completion rules document is empty');
    }
    
    // Validate required fields
    const config = data as CompletionRulesConfig;
    validateCompletionRulesConfig(config);
    
    return config;
  } catch (error) {
    console.error('[CompletionRulesService] Failed to load completion rules:', error);
    throw error;
  }
}

/**
 * Load specific version of completion rules from versioned storage
 * 
 * @param rulesVersion - Version number to load
 * @returns Promise<CompletionRulesConfig> - The specified version of completion rules
 * @throws Error if version not found
 */
export async function loadCompletionRulesVersion(rulesVersion: number): Promise<CompletionRulesConfig> {
  const db = getFirestore();
  
  try {
    const versionRef = db.doc(`settings/exportSettings/completionRulesVersions/${rulesVersion}`);
    const snapshot = await versionRef.get();
    
    if (!snapshot.exists) {
      throw new Error(`Completion rules version ${rulesVersion} not found`);
    }
    
    const data = snapshot.data();
    if (!data) {
      throw new Error(`Completion rules version ${rulesVersion} document is empty`);
    }
    
    const config = data as CompletionRulesConfig;
    validateCompletionRulesConfig(config);
    
    return config;
  } catch (error) {
    console.error(`[CompletionRulesService] Failed to load rules version ${rulesVersion}:`, error);
    throw error;
  }
}

/**
 * Validate completion rules configuration structure
 * 
 * @param config - Configuration to validate
 * @throws Error if configuration is invalid
 */
function validateCompletionRulesConfig(config: CompletionRulesConfig): void {
  if (!config.schemaVersion) {
    throw new Error('Completion rules missing schemaVersion');
  }
  
  if (typeof config.rulesVersion !== 'number') {
    throw new Error('Completion rules missing or invalid rulesVersion');
  }
  
  if (typeof config.exportUnlockThresholdPct !== 'number' || 
      config.exportUnlockThresholdPct < 0 || 
      config.exportUnlockThresholdPct > 100) {
    throw new Error('Completion rules exportUnlockThresholdPct must be 0-100');
  }
  
  if (!Array.isArray(config.segments)) {
    throw new Error('Completion rules segments must be an array');
  }
  
  if (config.segments.length === 0) {
    throw new Error('Completion rules must have at least one segment');
  }
  
  // Validate segments
  for (const segment of config.segments) {
    if (!segment.id || !segment.name) {
      throw new Error(`Invalid segment: missing id or name`);
    }
    
    if (typeof segment.weightPct !== 'number' || segment.weightPct < 0 || segment.weightPct > 100) {
      throw new Error(`Segment ${segment.id} weightPct must be 0-100`);
    }
    
    if (!['ALL_REQUIRED', 'ANY_REQUIRED'].includes(segment.ruleType)) {
      throw new Error(`Segment ${segment.id} ruleType must be ALL_REQUIRED or ANY_REQUIRED`);
    }
  }
  
  // Validate total weights
  const totalWeight = config.segments
    .filter(s => s.enabled)
    .reduce((sum, s) => sum + s.weightPct, 0);
  
  if (Math.abs(totalWeight - 100) > 0.1) {
    throw new Error(`Total segment weights must equal 100%, got ${totalWeight}%`);
  }
}

/**
 * Get default completion rules configuration for testing/fallback
 * 
 * WARNING: This should only be used for testing. Production must use Firestore configuration.
 * 
 * @returns CompletionRulesConfig - Default rules configuration
 */
export function getDefaultCompletionRules(): CompletionRulesConfig {
  return {
    schemaVersion: '1.0',
    rulesVersion: 1,
    updatedAt: new Date().toISOString(),
    updatedBy: 'system-default',
    exportUnlockThresholdPct: 80,
    segments: [
      {
        id: 'description-seo',
        name: 'Description & SEO',
        enabled: true,
        weightPct: 60,
        ruleType: 'ALL_REQUIRED',
        appliesTo: {
          mode: 'ALL_PRODUCTS',
          sites: []
        },
        attributeSelector: {
          source: 'REGISTRY',
          categories: ['description', 'seo'],
          requirementFlag: 'required_for_completion',
          siteAware: true,
          includeInternalOnly: false,
          excludeAttributeIds: []
        }
      },
      {
        id: 'technical',
        name: 'Technical Specifications',
        enabled: true,
        weightPct: 40,
        ruleType: 'ALL_REQUIRED',
        appliesTo: {
          mode: 'ALL_PRODUCTS',
          sites: []
        },
        attributeSelector: {
          source: 'REGISTRY',
          categories: ['technical'],
          requirementFlag: 'required_for_completion',
          siteAware: false,
          includeInternalOnly: false,
          excludeAttributeIds: []
        }
      }
    ],
    builtInSegments: {
      'description-seo': {
        segmentId: 'description-seo',
        lockedSemantics: true
      }
    },
    exclusions: {
      media: {
        affectsCompletion: false,
        reason: 'Media attributes excluded by governance directive'
      },
      pricing: {
        affectsCompletion: false,
        reason: 'Pricing attributes excluded by governance directive'
      }
    }
  };
}