/**
 * Product Service
 * S5 — Product UI: Provenance UX & Edit Behavior
 * LP-smart-rules-ui-provenance-1.0.0
 * 
 * Service helpers for product operations with provenance tracking.
 * Handles:
 * - Writing field values with human provenance
 * - Replacing Smart Rule provenance with human provenance
 * - Adding activity log entries for audit trail
 */

import { db, isFirebaseAvailable } from '../firebaseConfig';
import {
  doc,
  updateDoc,
  serverTimestamp,
  arrayUnion,
} from 'firebase/firestore';
import type { FieldProvenance, ActivityLogEntry } from '../types/product';

/**
 * Actor information for provenance tracking
 */
export interface ProvenanceActor {
  uid: string;
  name: string;
}

/**
 * Options for updating a field with provenance
 */
export interface UpdateFieldWithProvenanceOptions {
  /** Product document ID */
  productId: string;
  /** Field path (e.g., 'attributes.gender') */
  fieldPath: string;
  /** New value to set */
  newValue: unknown;
  /** Actor performing the update (string or ProvenanceActor) */
  actor: string | ProvenanceActor;
  /** Previous provenance (for logging) */
  previousProvenance?: FieldProvenance;
}

/**
 * Result of a field update with provenance
 */
export interface UpdateFieldResult {
  success: boolean;
  error?: string;
  timestamp?: string;
}

/**
 * Normalize actor to string format for provenance tracking
 * Accepts either a string (email/uid) or a ProvenanceActor object
 */
function normalizeActor(actor: string | ProvenanceActor): string {
  if (typeof actor === 'string') {
    return actor;
  }
  return actor.name || actor.uid || 'unknown';
}

/**
 * Create a human provenance entry
 * 
 * @param actor - Either a string (email/uid) or ProvenanceActor object
 */
export function createHumanProvenance(actor: string | ProvenanceActor): FieldProvenance {
  const actorStr = normalizeActor(actor);
  return {
    source: 'human',
    appliedAt: new Date().toISOString(),
    actor: actorStr,
  };
}

/**
 * Create an activity log entry for replacing Smart Rule provenance
 * 
 * @param actor - Either a string (email/uid) or ProvenanceActor object
 * @param fieldPath - The field path being updated
 * @param previousProvenance - The provenance being replaced
 * @param newValue - The new field value
 */
export function createReplacementActivityLog(
  actor: string | ProvenanceActor,
  fieldPath: string,
  previousProvenance: FieldProvenance | undefined,
  newValue: unknown
): ActivityLogEntry {
  const actorStr = normalizeActor(actor);
  return {
    actor: actorStr,
    action: 'user_replaced_smartrule',
    timestamp: new Date().toISOString(),
    details: {
      fieldPath,
      previousProvenance,
      newValue,
    },
  };
}

/**
 * Convert a dot-notation field path to Firestore dot notation
 * e.g., 'attributes.gender' stays as 'attributes.gender'
 */
function toFirestorePath(fieldPath: string): string {
  return fieldPath;
}

/**
 * Get the provenance key for a field path
 * e.g., 'attributes.gender' -> 'attributes_gender'
 * 
 * Exported for use in useProduct hook and components.
 */
export function getProvenanceKey(fieldPath: string): string {
  // Convert dots to underscores for the provenance key to avoid nested objects
  // e.g., 'attributes.gender' -> 'attributes_gender'
  return fieldPath.replace(/\./g, '_');
}

/**
 * Get the full Firestore provenance path for a field
 * e.g., 'attributes.gender' -> 'provenance.attributes_gender'
 */
function getFullProvenancePath(fieldPath: string): string {
  const safeKey = getProvenanceKey(fieldPath);
  return `provenance.${safeKey}`;
}

/**
 * Update a product field with human provenance
 * 
 * This function:
 * 1. Updates the field value
 * 2. Replaces any existing provenance with human provenance
 * 3. Adds an activity log entry if replacing Smart Rule provenance
 * 
 * @param options - Update options
 * @returns Promise resolving to update result
 */
export async function updateFieldWithProvenance(
  options: UpdateFieldWithProvenanceOptions
): Promise<UpdateFieldResult> {
  const { productId, fieldPath, newValue, actor, previousProvenance } = options;
  const timestamp = new Date().toISOString();

  if (!isFirebaseAvailable()) {
    console.warn('[productService] Firebase not available, skipping provenance update');
    return { success: false, error: 'Firebase not available' };
  }

  try {
    const productRef = doc(db!, 'products', productId);
    const provenancePath = getFullProvenancePath(fieldPath);
    const humanProvenance = createHumanProvenance(actor);

    // Build the update object
    const updateData: Record<string, unknown> = {
      [toFirestorePath(fieldPath)]: newValue,
      [provenancePath]: humanProvenance,
      updatedAt: serverTimestamp(),
    };

    // If replacing Smart Rule provenance, add activity log entry
    if (previousProvenance?.source === 'smartRule') {
      const activityEntry = createReplacementActivityLog(
        actor,
        fieldPath,
        previousProvenance,
        newValue
      );
      updateData.activityLog = arrayUnion(activityEntry);
    }

    await updateDoc(productRef, updateData);

    console.log(`[productService] Updated ${fieldPath} with human provenance`, {
      productId,
      fieldPath,
      previousSource: previousProvenance?.source,
    });

    return { success: true, timestamp };
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : 'Unknown error';
    console.error('[productService] Failed to update field with provenance:', error);
    return { success: false, error: errorMessage };
  }
}

/**
 * Batch update multiple fields with human provenance
 */
export async function updateFieldsWithProvenance(
  productId: string,
  updates: Array<{
    fieldPath: string;
    newValue: unknown;
    previousProvenance?: FieldProvenance;
  }>,
  actor: string | ProvenanceActor
): Promise<UpdateFieldResult> {
  const timestamp = new Date().toISOString();

  if (!isFirebaseAvailable()) {
    console.warn('[productService] Firebase not available, skipping provenance update');
    return { success: false, error: 'Firebase not available' };
  }

  try {
    const productRef = doc(db!, 'products', productId);
    const updateData: Record<string, unknown> = {
      updatedAt: serverTimestamp(),
    };
    const activityEntries: ActivityLogEntry[] = [];

    for (const update of updates) {
      const { fieldPath, newValue, previousProvenance } = update;
      const provenancePath = getFullProvenancePath(fieldPath);
      const humanProvenance = createHumanProvenance(actor);

      updateData[toFirestorePath(fieldPath)] = newValue;
      updateData[provenancePath] = humanProvenance;

      // Track activity log entries for Smart Rule replacements
      if (previousProvenance?.source === 'smartRule') {
        activityEntries.push(
          createReplacementActivityLog(actor, fieldPath, previousProvenance, newValue)
        );
      }
    }

    // Add all activity log entries
    if (activityEntries.length > 0) {
      updateData.activityLog = arrayUnion(...activityEntries);
    }

    await updateDoc(productRef, updateData);

    console.log(`[productService] Batch updated ${updates.length} fields with human provenance`, {
      productId,
      fieldPaths: updates.map(u => u.fieldPath),
    });

    return { success: true, timestamp };
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : 'Unknown error';
    console.error('[productService] Failed to batch update fields with provenance:', error);
    return { success: false, error: errorMessage };
  }
}

/**
 * Get provenance key from a field path (for reading from product doc)
 */
export function getProvenanceFromProduct(
  product: Record<string, unknown>,
  fieldPath: string
): FieldProvenance | undefined {
  const provenance = product.provenance as Record<string, FieldProvenance> | undefined;
  if (!provenance) return undefined;

  // Try both formats: 'attributes_gender' and 'attributes.gender'
  const safeKey = fieldPath.replace(/\./g, '_');
  return provenance[safeKey] || provenance[fieldPath];
}

/**
 * Check if a field has Smart Rule provenance
 */
export function hasSmartRuleProvenance(
  product: Record<string, unknown>,
  fieldPath: string
): boolean {
  const prov = getProvenanceFromProduct(product, fieldPath);
  return prov?.source === 'smartRule';
}
