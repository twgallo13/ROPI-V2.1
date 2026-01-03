/**
 * Completion Rules Service
 * 
 * Handles CRUD operations for Completion Rules configuration.
 * Implements exact persistence paths as specified in the execution directive:
 * - Live rules: settings/exportSettings/completionRules
 * - Immutable versions: settings/exportSettings/completionRulesVersions/{rulesVersion}
 */

import { getFirestore } from 'firebase-admin/firestore';
import { z } from 'zod';

// Schema for CompletionRulesConfig
const AttributeSelectorConfigSchema = z.object({
  source: z.literal('REGISTRY'),
  categories: z.array(z.string()).min(1),
  requirementFlag: z.enum(['completionRequired', 'requiredForExport']),
  siteAware: z.boolean(),
  includeInternalOnly: z.boolean(),
  excludeAttributeIds: z.array(z.string()).optional().default([]),
});

const SegmentConfigSchema = z.object({
  id: z.string(),
  name: z.string(),
  enabled: z.boolean(),
  weightPct: z.number().int().min(0).max(100),
  ruleType: z.enum(['ALL_REQUIRED', 'ANY_REQUIRED']),
  appliesTo: z.object({
    mode: z.enum(['ALL_PRODUCTS', 'ONLY_SELECTED_SITES']),
    sites: z.array(z.string()),
  }),
  attributeSelector: AttributeSelectorConfigSchema,
});

const CompletionRulesConfigSchema = z.object({
  schemaVersion: z.string(),
  rulesVersion: z.number().int().positive(),
  updatedAt: z.string(),
  updatedBy: z.string(),
  exportUnlockThresholdPct: z.number().int().min(0).max(100),
  segments: z.array(SegmentConfigSchema),
  builtInSegments: z.record(z.string(), z.object({
    segmentId: z.string(),
    lockedSemantics: z.boolean(),
  })),
  exclusions: z.object({
    media: z.object({
      affectsCompletion: z.literal(false),
      reason: z.string(),
    }),
    pricing: z.object({
      affectsCompletion: z.literal(false),
      reason: z.string(),
    }),
  }),
});

export type CompletionRulesConfig = z.infer<typeof CompletionRulesConfigSchema>;
export type SegmentConfig = z.infer<typeof SegmentConfigSchema>;
export type AttributeSelectorConfig = z.infer<typeof AttributeSelectorConfigSchema>;

export class CompletionRulesServiceError extends Error {
  constructor(
    public code: string,
    public statusCode: number,
    message: string
  ) {
    super(message);
    this.name = 'CompletionRulesServiceError';
  }
}

const db = getFirestore();

/**
 * Get the current live Completion Rules
 */
export async function getCompletionRules(): Promise<CompletionRulesConfig | null> {
  try {
    const doc = await db.doc('settings/exportSettings/completionRules').get();
    
    if (!doc.exists) {
      return null;
    }
    
    const data = doc.data();
    const parsed = CompletionRulesConfigSchema.parse(data);
    return parsed;
    
  } catch (error) {
    if (error instanceof z.ZodError) {
      throw new CompletionRulesServiceError(
        'INVALID_SCHEMA',
        400,
        `Invalid completion rules schema: ${error.message}`
      );
    }
    throw new CompletionRulesServiceError(
      'GET_FAILED',
      500,
      `Failed to get completion rules: ${error instanceof Error ? error.message : String(error)}`
    );
  }
}

/**
 * Create or update Completion Rules
 * This creates both the live document and an immutable version snapshot
 */
export async function setCompletionRules(
  rules: CompletionRulesConfig,
  updatedBy: string
): Promise<CompletionRulesConfig> {
  try {
    // Validate input
    const validatedRules = CompletionRulesConfigSchema.parse(rules);
    
    // Get current version to generate next version number
    const currentRules = await getCompletionRules();
    const nextVersion = currentRules ? currentRules.rulesVersion + 1 : 1;
    
    // Prepare the config with updated metadata
    const configWithMetadata: CompletionRulesConfig = {
      ...validatedRules,
      rulesVersion: nextVersion,
      updatedAt: new Date().toISOString(),
      updatedBy,
    };
    
    // Validate segments weight totals for enabled segments
    const enabledSegments = configWithMetadata.segments.filter(s => s.enabled);
    const totalWeight = enabledSegments.reduce((sum, segment) => sum + segment.weightPct, 0);
    
    if (totalWeight !== 100) {
      throw new CompletionRulesServiceError(
        'INVALID_WEIGHTS',
        400,
        `Enabled segments must sum to 100%, got ${totalWeight}%`
      );
    }
    
    const batch = db.batch();
    
    // Update live document
    const liveRef = db.doc('settings/exportSettings/completionRules');
    batch.set(liveRef, configWithMetadata);
    
    // Create immutable version snapshot
    const versionRef = db.doc(`settings/exportSettings/completionRulesVersions/${nextVersion}`);
    batch.set(versionRef, configWithMetadata);
    
    await batch.commit();
    
    return configWithMetadata;
    
  } catch (error) {
    if (error instanceof z.ZodError) {
      throw new CompletionRulesServiceError(
        'INVALID_SCHEMA',
        400,
        `Invalid completion rules schema: ${error.message}`
      );
    }
    
    if (error instanceof CompletionRulesServiceError) {
      throw error;
    }
    
    throw new CompletionRulesServiceError(
      'SET_FAILED',
      500,
      `Failed to set completion rules: ${error instanceof Error ? error.message : String(error)}`
    );
  }
}

/**
 * Get a specific version of Completion Rules
 */
export async function getCompletionRulesVersion(version: number): Promise<CompletionRulesConfig | null> {
  try {
    const doc = await db.doc(`settings/exportSettings/completionRulesVersions/${version}`).get();
    
    if (!doc.exists) {
      return null;
    }
    
    const data = doc.data();
    const parsed = CompletionRulesConfigSchema.parse(data);
    return parsed;
    
  } catch (error) {
    if (error instanceof z.ZodError) {
      throw new CompletionRulesServiceError(
        'INVALID_SCHEMA',
        400,
        `Invalid completion rules schema: ${error.message}`
      );
    }
    throw new CompletionRulesServiceError(
      'GET_VERSION_FAILED',
      500,
      `Failed to get completion rules version ${version}: ${error instanceof Error ? error.message : String(error)}`
    );
  }
}

/**
 * List available Completion Rules versions
 */
export async function listCompletionRulesVersions(limit = 10): Promise<{ versions: number[] }> {
  try {
    const snapshot = await db.collection('settings/exportSettings/completionRulesVersions')
      .orderBy('rulesVersion', 'desc')
      .limit(limit)
      .get();
    
    const versions = snapshot.docs.map(doc => {
      const data = doc.data();
      return data.rulesVersion;
    }).sort((a, b) => b - a);
    
    return { versions };
    
  } catch (error) {
    throw new CompletionRulesServiceError(
      'LIST_VERSIONS_FAILED',
      500,
      `Failed to list completion rules versions: ${error instanceof Error ? error.message : String(error)}`
    );
  }
}