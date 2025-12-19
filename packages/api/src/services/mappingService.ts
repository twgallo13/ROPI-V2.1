/**
 * Mapping Service
 * PVS-0.3.1 — Header aliases, value synonyms, and per-source overrides
 * 
 * Two-layer mapping approach:
 * 1. Global mapping: settings/attribute_mappings/global
 * 2. Attribute-level mapping: settings/attributes/keys/{attribute_id}/mapping
 * 
 * Precedence: source-specific → attribute-level → global
 */

import * as admin from 'firebase-admin';
import { createAuditEvent, type CreateAuditEventInput } from './auditService';

// Firestore paths - FIXED PVS-0.3.4: Use even number of path components
// Global mapping: collection 'attributeMappings', document 'global'
const GLOBAL_MAPPING_COLLECTION = 'attributeMappings';
const GLOBAL_MAPPING_DOC_ID = 'global';
// Attribute collection where we'll add mapping subcollection
const ATTRIBUTES_COLLECTION = 'settings/attributes/keys';

/**
 * Global mapping document shape
 */
export interface GlobalMapping {
  aliases: Record<string, string>;  // VendorColumnName → canonical.attribute_id
  value_synonyms: Record<string, Record<string, string[]>>;  // attribute_id → { canonicalValue → [synonyms] }
  updatedAt?: string;
  updatedBy?: string;
}

/**
 * Source-specific override
 */
export interface SourceOverride {
  aliases?: Record<string, string>;
  value_synonyms?: Record<string, string[]>;
}

/**
 * Attribute-level mapping document shape
 */
export interface AttributeMapping {
  aliases?: Record<string, string>;  // VendorColumnName → attribute_id
  value_synonyms?: Record<string, string[]>;  // canonicalValue → [synonyms]
  sources?: Record<string, SourceOverride>;  // sourceId → overrides
  updatedAt?: string;
  updatedBy?: string;
}

/**
 * Merged mapping view (result of precedence resolution)
 */
export interface MergedMapping {
  aliases: Record<string, string>;
  value_synonyms: Record<string, string[]>;
  source?: string;  // If source-specific, which source
  precedence: 'global' | 'attribute' | 'source';
}

/**
 * Service error with HTTP status code
 */
export class MappingServiceError extends Error {
  constructor(
    message: string,
    public readonly statusCode: number,
    public readonly code: string
  ) {
    super(message);
    this.name = 'MappingServiceError';
  }
}

/**
 * Get Firestore instance
 */
function getDb(): admin.firestore.Firestore {
  return admin.firestore();
}

// =============================================
// Validation Helpers
// =============================================

/**
 * Validate that alias values map to valid attribute IDs
 * Uses Firestore to check if attribute exists
 */
export async function validateAliases(
  aliases: Record<string, string>
): Promise<{ valid: boolean; errors: string[] }> {
  const errors: string[] = [];
  const db = getDb();
  
  // Get unique canonical IDs to validate
  const canonicalIds = [...new Set(Object.values(aliases))];
  
  // Batch check existence (limit to avoid large reads)
  const MAX_BATCH = 30;
  for (let i = 0; i < canonicalIds.length; i += MAX_BATCH) {
    const batch = canonicalIds.slice(i, i + MAX_BATCH);
    const checks = await Promise.all(
      batch.map(async (id) => {
        const doc = await db.collection(ATTRIBUTES_COLLECTION).doc(id).get();
        return { id, exists: doc.exists };
      })
    );
    
    for (const check of checks) {
      if (!check.exists) {
        const aliasKeys = Object.entries(aliases)
          .filter(([_, v]) => v === check.id)
          .map(([k]) => k);
        errors.push(`Canonical attribute '${check.id}' not found (aliases: ${aliasKeys.join(', ')})`);
      }
    }
  }
  
  return { valid: errors.length === 0, errors };
}

/**
 * Validate value synonyms structure
 * Checks for duplicate synonyms within an attribute
 */
export function validateValueSynonyms(
  valueSynonyms: Record<string, string[]>
): { valid: boolean; errors: string[] } {
  const errors: string[] = [];
  const allSynonyms = new Set<string>();
  
  for (const [canonicalValue, synonyms] of Object.entries(valueSynonyms)) {
    if (!Array.isArray(synonyms)) {
      errors.push(`Synonyms for '${canonicalValue}' must be an array`);
      continue;
    }
    
    for (const syn of synonyms) {
      if (typeof syn !== 'string') {
        errors.push(`Synonym for '${canonicalValue}' must be a string, got ${typeof syn}`);
        continue;
      }
      
      const normalized = syn.toLowerCase().trim();
      if (allSynonyms.has(normalized)) {
        errors.push(`Duplicate synonym '${syn}' found (case-insensitive)`);
      }
      allSynonyms.add(normalized);
    }
  }
  
  return { valid: errors.length === 0, errors };
}

/**
 * Validate attribute-level value synonyms against allowed_values
 */
export async function validateAttributeValueSynonyms(
  attributeId: string,
  valueSynonyms: Record<string, string[]>
): Promise<{ valid: boolean; errors: string[]; warnings: string[] }> {
  const errors: string[] = [];
  const warnings: string[] = [];
  
  // Basic structure validation
  const structureValidation = validateValueSynonyms(valueSynonyms);
  errors.push(...structureValidation.errors);
  
  // Check canonical values against attribute's allowed_values
  const db = getDb();
  const attrDoc = await db.collection(ATTRIBUTES_COLLECTION).doc(attributeId).get();
  
  if (!attrDoc.exists) {
    errors.push(`Attribute '${attributeId}' not found`);
    return { valid: false, errors, warnings };
  }
  
  const attrData = attrDoc.data();
  const allowedValues = attrData?.allowed_values as string[] | undefined;
  
  if (allowedValues && allowedValues.length > 0) {
    const allowedSet = new Set(allowedValues);
    for (const canonicalValue of Object.keys(valueSynonyms)) {
      if (!allowedSet.has(canonicalValue)) {
        warnings.push(`Canonical value '${canonicalValue}' not in allowed_values for attribute '${attributeId}'`);
      }
    }
  }
  
  return { valid: errors.length === 0, errors, warnings };
}

// =============================================
// Global Mapping Operations
// =============================================

/**
 * Get the global mapping document
 */
export async function getGlobalMapping(): Promise<GlobalMapping> {
  const db = getDb();
  // PVS-0.3.4: Fixed path to use even number of components
  const doc = await db.collection(GLOBAL_MAPPING_COLLECTION).doc(GLOBAL_MAPPING_DOC_ID).get();
  
  if (!doc.exists) {
    // Return empty mapping if not exists
    return {
      aliases: {},
      value_synonyms: {},
    };
  }
  
  return doc.data() as GlobalMapping;
}

/**
 * Update global mapping with merge or replace semantics
 * 
 * @param mapping - New mapping data
 * @param actor - User performing the update
 * @param options - Update options
 */
export async function updateGlobalMapping(
  mapping: Partial<GlobalMapping>,
  actor: string,
  options: { merge?: boolean; reason?: string } = {}
): Promise<GlobalMapping> {
  const db = getDb();
  // PVS-0.3.4: Fixed path to use even number of components
  const docRef = db.collection(GLOBAL_MAPPING_COLLECTION).doc(GLOBAL_MAPPING_DOC_ID);
  const { merge = true, reason } = options;
  
  // Validate aliases if provided
  if (mapping.aliases && Object.keys(mapping.aliases).length > 0) {
    const validation = await validateAliases(mapping.aliases);
    if (!validation.valid) {
      throw new MappingServiceError(
        `Invalid aliases: ${validation.errors.join('; ')}`,
        400,
        'INVALID_ALIASES'
      );
    }
  }
  
  // Validate value_synonyms if provided
  if (mapping.value_synonyms) {
    for (const [attrId, synonyms] of Object.entries(mapping.value_synonyms)) {
      const validation = validateValueSynonyms(synonyms);
      if (!validation.valid) {
        throw new MappingServiceError(
          `Invalid value_synonyms for '${attrId}': ${validation.errors.join('; ')}`,
          400,
          'INVALID_SYNONYMS'
        );
      }
    }
  }
  
  // Get current state for audit
  const currentDoc = await docRef.get();
  const beforeState = currentDoc.exists ? currentDoc.data() as GlobalMapping : null;
  
  const now = new Date().toISOString();
  let afterState: GlobalMapping;
  
  if (merge && beforeState) {
    // Merge semantics: deep merge aliases and value_synonyms
    afterState = {
      aliases: { ...beforeState.aliases, ...mapping.aliases },
      value_synonyms: deepMergeValueSynonyms(
        beforeState.value_synonyms || {},
        mapping.value_synonyms || {}
      ),
      updatedAt: now,
      updatedBy: actor,
    };
  } else {
    // Replace semantics
    afterState = {
      aliases: mapping.aliases || {},
      value_synonyms: mapping.value_synonyms || {},
      updatedAt: now,
      updatedBy: actor,
    };
  }
  
  await docRef.set(afterState);
  
  // Create audit event (use 'global' as attribute_id for global mappings)
  await createAuditEvent({
    attribute_id: '_global_mapping',
    actor,
    action: 'mapping_update',
    before: beforeState as Record<string, unknown> | null,
    after: afterState as Record<string, unknown>,
    reason,
    context: { source: 'api', scope: 'global' },
  });
  
  return afterState;
}

/**
 * Deep merge value synonyms (merge arrays, not replace)
 */
function deepMergeValueSynonyms(
  base: Record<string, Record<string, string[]>>,
  overlay: Record<string, Record<string, string[]>>
): Record<string, Record<string, string[]>> {
  const result = { ...base };
  
  for (const [attrId, values] of Object.entries(overlay)) {
    if (!result[attrId]) {
      result[attrId] = values;
    } else {
      result[attrId] = { ...result[attrId] };
      for (const [canonical, synonyms] of Object.entries(values)) {
        if (!result[attrId][canonical]) {
          result[attrId][canonical] = synonyms;
        } else {
          // Merge arrays, dedupe
          const merged = [...new Set([...result[attrId][canonical], ...synonyms])];
          result[attrId][canonical] = merged;
        }
      }
    }
  }
  
  return result;
}

// =============================================
// Attribute-Level Mapping Operations
// =============================================

/**
 * Get the mapping document ref for an attribute
 * PVS-0.3.4: Fixed to use even number of path components
 * Uses subcollection 'mapping' with doc 'config' under the attribute doc
 */
function getAttributeMappingRef(db: admin.firestore.Firestore, attributeId: string): admin.firestore.DocumentReference {
  return db.collection(ATTRIBUTES_COLLECTION).doc(attributeId).collection('mapping').doc('config');
}

/**
 * Get attribute-level mapping document
 */
export async function getAttributeMapping(
  attributeId: string
): Promise<AttributeMapping | null> {
  const db = getDb();
  // PVS-0.3.4: Use ref function instead of path
  const doc = await getAttributeMappingRef(db, attributeId).get();
  
  if (!doc.exists) {
    return null;
  }
  
  return doc.data() as AttributeMapping;
}

/**
 * Get merged mapping view for an attribute
 * Resolves precedence: source-specific → attribute-level → global
 * 
 * @param attributeId - Attribute ID
 * @param sourceId - Optional source ID for source-specific resolution
 */
export async function getMergedMapping(
  attributeId: string,
  sourceId?: string
): Promise<MergedMapping> {
  const [globalMapping, attrMapping] = await Promise.all([
    getGlobalMapping(),
    getAttributeMapping(attributeId),
  ]);
  
  // Start with global
  let aliases: Record<string, string> = {};
  let valueSynonyms: Record<string, string[]> = {};
  let precedence: 'global' | 'attribute' | 'source' = 'global';
  
  // Extract global aliases that map to this attribute
  for (const [alias, canonical] of Object.entries(globalMapping.aliases)) {
    if (canonical === attributeId) {
      aliases[alias] = canonical;
    }
  }
  
  // Extract global value synonyms for this attribute
  if (globalMapping.value_synonyms[attributeId]) {
    valueSynonyms = { ...globalMapping.value_synonyms[attributeId] };
  }
  
  // Overlay attribute-level mappings
  if (attrMapping) {
    if (attrMapping.aliases) {
      aliases = { ...aliases, ...attrMapping.aliases };
      precedence = 'attribute';
    }
    if (attrMapping.value_synonyms) {
      valueSynonyms = mergeValueSynonymsFlat(valueSynonyms, attrMapping.value_synonyms);
      precedence = 'attribute';
    }
    
    // Overlay source-specific if provided
    if (sourceId && attrMapping.sources?.[sourceId]) {
      const sourceOverride = attrMapping.sources[sourceId];
      if (sourceOverride.aliases) {
        aliases = { ...aliases, ...sourceOverride.aliases };
        precedence = 'source';
      }
      if (sourceOverride.value_synonyms) {
        valueSynonyms = mergeValueSynonymsFlat(valueSynonyms, sourceOverride.value_synonyms);
        precedence = 'source';
      }
    }
  }
  
  return {
    aliases,
    value_synonyms: valueSynonyms,
    source: sourceId,
    precedence,
  };
}

/**
 * Merge flat value synonyms (single attribute level)
 */
function mergeValueSynonymsFlat(
  base: Record<string, string[]>,
  overlay: Record<string, string[]>
): Record<string, string[]> {
  const result = { ...base };
  
  for (const [canonical, synonyms] of Object.entries(overlay)) {
    if (!result[canonical]) {
      result[canonical] = synonyms;
    } else {
      result[canonical] = [...new Set([...result[canonical], ...synonyms])];
    }
  }
  
  return result;
}

/**
 * Update attribute-level mapping
 * 
 * @param attributeId - Attribute ID
 * @param mapping - New mapping data
 * @param actor - User performing the update
 * @param options - Update options
 */
export async function updateAttributeMapping(
  attributeId: string,
  mapping: Partial<AttributeMapping>,
  actor: string,
  options: { merge?: boolean; reason?: string } = {}
): Promise<AttributeMapping> {
  const db = getDb();
  const { merge = true, reason } = options;
  
  // Verify attribute exists
  const attrDoc = await db.collection(ATTRIBUTES_COLLECTION).doc(attributeId).get();
  if (!attrDoc.exists) {
    throw new MappingServiceError(
      `Attribute '${attributeId}' not found`,
      404,
      'ATTRIBUTE_NOT_FOUND'
    );
  }
  
  // Validate aliases if provided
  if (mapping.aliases && Object.keys(mapping.aliases).length > 0) {
    // For attribute-level, aliases should map to this attribute
    for (const [alias, target] of Object.entries(mapping.aliases)) {
      if (target !== attributeId) {
        throw new MappingServiceError(
          `Alias '${alias}' must map to '${attributeId}', not '${target}'`,
          400,
          'INVALID_ALIAS_TARGET'
        );
      }
    }
  }
  
  // Validate value_synonyms if provided
  if (mapping.value_synonyms) {
    const validation = await validateAttributeValueSynonyms(attributeId, mapping.value_synonyms);
    if (!validation.valid) {
      throw new MappingServiceError(
        `Invalid value_synonyms: ${validation.errors.join('; ')}`,
        400,
        'INVALID_SYNONYMS'
      );
    }
    // Log warnings but don't fail
    if (validation.warnings.length > 0) {
      console.warn(`Mapping warnings for ${attributeId}:`, validation.warnings);
    }
  }
  
  // PVS-0.3.4: Use ref function instead of path
  const docRef = getAttributeMappingRef(db, attributeId);
  const currentDoc = await docRef.get();
  const beforeState = currentDoc.exists ? currentDoc.data() as AttributeMapping : null;
  
  const now = new Date().toISOString();
  let afterState: AttributeMapping;
  
  if (merge && beforeState) {
    afterState = {
      aliases: { ...beforeState.aliases, ...mapping.aliases },
      value_synonyms: mergeValueSynonymsFlat(
        beforeState.value_synonyms || {},
        mapping.value_synonyms || {}
      ),
      sources: beforeState.sources || {}, // Sources not merged here, use separate endpoint
      updatedAt: now,
      updatedBy: actor,
    };
  } else {
    // FIX: Ensure no undefined values are written to Firestore
    afterState = {
      aliases: mapping.aliases ?? beforeState?.aliases ?? {},
      value_synonyms: mapping.value_synonyms ?? beforeState?.value_synonyms ?? {},
      sources: beforeState?.sources ?? {}, // Preserve sources unless explicitly updated
      updatedAt: now,
      updatedBy: actor,
    };
  }
  
  await docRef.set(afterState);
  
  // Create audit event
  await createAuditEvent({
    attribute_id: attributeId,
    actor,
    action: 'mapping_update',
    before: beforeState as Record<string, unknown> | null,
    after: afterState as Record<string, unknown>,
    reason,
    context: { source: 'api', scope: 'attribute' },
  });
  
  return afterState;
}

/**
 * Delete attribute-level mapping
 */
export async function deleteAttributeMapping(
  attributeId: string,
  actor: string,
  reason?: string
): Promise<void> {
  const db = getDb();
  // PVS-0.3.4: Use ref function instead of path
  const docRef = getAttributeMappingRef(db, attributeId);
  
  const currentDoc = await docRef.get();
  if (!currentDoc.exists) {
    throw new MappingServiceError(
      `No mapping found for attribute '${attributeId}'`,
      404,
      'MAPPING_NOT_FOUND'
    );
  }
  
  const beforeState = currentDoc.data() as AttributeMapping;
  
  await docRef.delete();
  
  // Create audit event
  await createAuditEvent({
    attribute_id: attributeId,
    actor,
    action: 'mapping_update',
    before: beforeState as Record<string, unknown>,
    after: null,
    reason: reason || 'Mapping deleted',
    context: { source: 'api', scope: 'attribute', operation: 'delete' },
  });
}

// =============================================
// Source Override Operations
// =============================================

/**
 * List all sources with overrides for an attribute
 */
export async function listSourceOverrides(
  attributeId: string
): Promise<{ sources: string[]; overrides: Record<string, SourceOverride> }> {
  const attrMapping = await getAttributeMapping(attributeId);
  
  if (!attrMapping?.sources) {
    return { sources: [], overrides: {} };
  }
  
  return {
    sources: Object.keys(attrMapping.sources),
    overrides: attrMapping.sources,
  };
}

/**
 * Get a specific source override
 */
export async function getSourceOverride(
  attributeId: string,
  sourceId: string
): Promise<SourceOverride | null> {
  const attrMapping = await getAttributeMapping(attributeId);
  return attrMapping?.sources?.[sourceId] || null;
}

/**
 * Upsert a source-specific override
 */
export async function upsertSourceOverride(
  attributeId: string,
  sourceId: string,
  override: SourceOverride,
  actor: string,
  reason?: string
): Promise<SourceOverride> {
  const db = getDb();
  
  // Verify attribute exists
  const attrDoc = await db.collection(ATTRIBUTES_COLLECTION).doc(attributeId).get();
  if (!attrDoc.exists) {
    throw new MappingServiceError(
      `Attribute '${attributeId}' not found`,
      404,
      'ATTRIBUTE_NOT_FOUND'
    );
  }
  
  // Validate aliases if provided
  if (override.aliases) {
    for (const [alias, target] of Object.entries(override.aliases)) {
      if (target !== attributeId) {
        throw new MappingServiceError(
          `Source alias '${alias}' must map to '${attributeId}', not '${target}'`,
          400,
          'INVALID_ALIAS_TARGET'
        );
      }
    }
  }
  
  // Validate value_synonyms if provided
  if (override.value_synonyms) {
    const validation = validateValueSynonyms(override.value_synonyms);
    if (!validation.valid) {
      throw new MappingServiceError(
        `Invalid value_synonyms: ${validation.errors.join('; ')}`,
        400,
        'INVALID_SYNONYMS'
      );
    }
  }
  
  // PVS-0.3.4: Use ref function instead of path
  const docRef = getAttributeMappingRef(db, attributeId);
  const currentDoc = await docRef.get();
  const currentMapping = currentDoc.exists ? currentDoc.data() as AttributeMapping : {};
  
  const beforeSources = currentMapping.sources || {};
  const beforeOverride = beforeSources[sourceId] || null;
  
  const now = new Date().toISOString();
  const updatedSources = {
    ...beforeSources,
    [sourceId]: override,
  };
  
  const afterState: AttributeMapping = {
    ...currentMapping,
    sources: updatedSources,
    updatedAt: now,
    updatedBy: actor,
  };
  
  await docRef.set(afterState, { merge: true });
  
  // Create audit event
  await createAuditEvent({
    attribute_id: attributeId,
    actor,
    action: 'mapping_update',
    before: beforeOverride as Record<string, unknown> | null,
    after: override as Record<string, unknown>,
    reason,
    context: { source: 'api', scope: 'source', sourceId },
  });
  
  return override;
}

/**
 * Delete a source-specific override
 */
export async function deleteSourceOverride(
  attributeId: string,
  sourceId: string,
  actor: string,
  reason?: string
): Promise<void> {
  const db = getDb();
  // PVS-0.3.4: Use ref function instead of path
  const docRef = getAttributeMappingRef(db, attributeId);
  
  const currentDoc = await docRef.get();
  if (!currentDoc.exists) {
    throw new MappingServiceError(
      `No mapping found for attribute '${attributeId}'`,
      404,
      'MAPPING_NOT_FOUND'
    );
  }
  
  const currentMapping = currentDoc.data() as AttributeMapping;
  if (!currentMapping.sources?.[sourceId]) {
    throw new MappingServiceError(
      `No source override found for source '${sourceId}'`,
      404,
      'SOURCE_OVERRIDE_NOT_FOUND'
    );
  }
  
  const beforeOverride = currentMapping.sources[sourceId];
  const now = new Date().toISOString();
  
  // Remove the source override
  const updatedSources = { ...currentMapping.sources };
  delete updatedSources[sourceId];
  
  const afterState: AttributeMapping = {
    ...currentMapping,
    sources: Object.keys(updatedSources).length > 0 ? updatedSources : undefined,
    updatedAt: now,
    updatedBy: actor,
  };
  
  await docRef.set(afterState);
  
  // Create audit event
  await createAuditEvent({
    attribute_id: attributeId,
    actor,
    action: 'mapping_update',
    before: beforeOverride as Record<string, unknown>,
    after: null,
    reason: reason || `Source override '${sourceId}' deleted`,
    context: { source: 'api', scope: 'source', sourceId, operation: 'delete' },
  });
}

// =============================================
// Import Preview / Transformation
// =============================================

/**
 * Result of transforming a row using mappings
 */
export interface TransformResult {
  attributes: Record<string, unknown>;
  unmappedHeaders: string[];
  synonymsApplied: Array<{ attribute: string; original: string; canonical: string }>;
}

/**
 * Transform a row using mappings
 * 
 * @param row - Input row (header → value)
 * @param sourceId - Optional source ID for source-specific mappings
 * @param mappingOverrides - Optional per-request mapping overrides
 */
export async function transformRow(
  row: Record<string, unknown>,
  sourceId?: string,
  mappingOverrides?: { aliases?: Record<string, string>; value_synonyms?: Record<string, Record<string, string[]>> }
): Promise<TransformResult> {
  const globalMapping = await getGlobalMapping();
  
  const attributes: Record<string, unknown> = {};
  const unmappedHeaders: string[] = [];
  const synonymsApplied: Array<{ attribute: string; original: string; canonical: string }> = [];
  
  // Build reverse synonym lookup: synonym → { attributeId, canonicalValue }
  const synonymLookup = buildSynonymLookup(globalMapping.value_synonyms, mappingOverrides?.value_synonyms);
  
  // Build alias lookup with overrides
  const aliasLookup: Record<string, string> = {
    ...globalMapping.aliases,
    ...mappingOverrides?.aliases,
  };
  
  for (const [header, value] of Object.entries(row)) {
    // Check if header is an alias
    const canonicalAttrId = aliasLookup[header] || aliasLookup[header.toLowerCase()];
    
    if (canonicalAttrId) {
      // Apply value synonym if applicable
      const transformedValue = applyValueSynonym(
        canonicalAttrId,
        value,
        synonymLookup,
        synonymsApplied
      );
      attributes[canonicalAttrId] = transformedValue;
    } else if (header.match(/^[a-z][a-z0-9_]*$/)) {
      // Header looks like a canonical attribute ID
      const transformedValue = applyValueSynonym(
        header,
        value,
        synonymLookup,
        synonymsApplied
      );
      attributes[header] = transformedValue;
    } else {
      // Unknown header
      unmappedHeaders.push(header);
    }
  }
  
  return {
    attributes,
    unmappedHeaders,
    synonymsApplied,
  };
}

/**
 * Build a reverse lookup for synonyms
 */
function buildSynonymLookup(
  globalSynonyms: Record<string, Record<string, string[]>>,
  overrides?: Record<string, Record<string, string[]>>
): Map<string, { attributeId: string; canonicalValue: string }> {
  const lookup = new Map<string, { attributeId: string; canonicalValue: string }>();
  
  const addToLookup = (synonyms: Record<string, Record<string, string[]>>) => {
    for (const [attrId, values] of Object.entries(synonyms)) {
      for (const [canonical, syns] of Object.entries(values)) {
        for (const syn of syns) {
          const key = `${attrId}:${syn.toLowerCase()}`;
          lookup.set(key, { attributeId: attrId, canonicalValue: canonical });
        }
      }
    }
  };
  
  addToLookup(globalSynonyms);
  if (overrides) {
    addToLookup(overrides);
  }
  
  return lookup;
}

/**
 * Apply value synonym transformation
 */
function applyValueSynonym(
  attributeId: string,
  value: unknown,
  synonymLookup: Map<string, { attributeId: string; canonicalValue: string }>,
  appliedList: Array<{ attribute: string; original: string; canonical: string }>
): unknown {
  if (typeof value !== 'string') {
    return value;
  }
  
  const key = `${attributeId}:${value.toLowerCase()}`;
  const match = synonymLookup.get(key);
  
  if (match && match.attributeId === attributeId) {
    appliedList.push({
      attribute: attributeId,
      original: value,
      canonical: match.canonicalValue,
    });
    return match.canonicalValue;
  }
  
  return value;
}

/**
 * Preview import transformation on sample rows
 * 
 * @param sampleRows - Array of sample rows to transform
 * @param sourceId - Optional source ID
 * @param mappingOverrides - Optional per-request mapping overrides
 */
export async function previewImportTransform(
  sampleRows: Record<string, unknown>[],
  sourceId?: string,
  mappingOverrides?: { aliases?: Record<string, string>; value_synonyms?: Record<string, Record<string, string[]>> }
): Promise<{
  transformedRows: TransformResult[];
  summary: {
    totalRows: number;
    totalUnmappedHeaders: number;
    uniqueUnmappedHeaders: string[];
    totalSynonymsApplied: number;
  };
}> {
  const transformedRows: TransformResult[] = [];
  const allUnmappedHeaders = new Set<string>();
  let totalSynonymsApplied = 0;
  
  for (const row of sampleRows) {
    const result = await transformRow(row, sourceId, mappingOverrides);
    transformedRows.push(result);
    
    for (const header of result.unmappedHeaders) {
      allUnmappedHeaders.add(header);
    }
    totalSynonymsApplied += result.synonymsApplied.length;
  }
  
  return {
    transformedRows,
    summary: {
      totalRows: sampleRows.length,
      totalUnmappedHeaders: [...allUnmappedHeaders].length,
      uniqueUnmappedHeaders: [...allUnmappedHeaders],
      totalSynonymsApplied,
    },
  };
}
