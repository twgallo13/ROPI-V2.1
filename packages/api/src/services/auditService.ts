/**
 * Audit Service
 * PVS-0.3.0 — Attribute audit trail for tracking changes and enabling revert
 * 
 * Stores audit events as subcollection under each attribute:
 * settings/attributes/keys/{attributeId}/auditEvents/{eventId}
 */

import * as admin from 'firebase-admin';
import { cleanObject } from '../lib/cleanObject';

// Firestore paths
const ATTRIBUTES_COLLECTION = 'settings/attributes/keys';
const AUDIT_SUBCOLLECTION = 'auditEvents';

/**
 * Audit event action types
 */
export type AuditAction = 
  | 'create'
  | 'update'
  | 'delete'
  | 'deprecate'
  | 'convert'   // data type conversion
  | 'revert'
  | 'mapping_update'  // alias/synonyms update
  | 'bulk_import';    // bulk operations

/**
 * Audit event shape
 */
export interface AuditEvent {
  event_id: string;
  attribute_id: string;
  actor: string;
  timestamp: string;
  action: AuditAction;
  before: Record<string, unknown> | null;  // null for create
  after: Record<string, unknown> | null;   // null for delete
  reason?: string;
  context?: {
    source?: string;      // e.g., 'api', 'migration', 'import'
    request_id?: string;
    ip_address?: string;
    user_agent?: string;
    related_event_id?: string;  // for reverts, points to original event
    [key: string]: unknown;  // Allow additional custom fields
  };
}

/**
 * Audit event creation input
 */
export interface CreateAuditEventInput {
  attribute_id: string;
  actor: string;
  action: AuditAction;
  before: Record<string, unknown> | null;
  after: Record<string, unknown> | null;
  reason?: string;
  context?: AuditEvent['context'];
}

/**
 * Pagination options for listing audit events
 */
export interface ListAuditEventsOptions {
  limit?: number;
  after?: string;  // event_id to paginate after
  before?: string; // event_id to paginate before (for reverse)
  actions?: AuditAction[];  // filter by action types
}

/**
 * Paginated audit events result
 */
export interface PaginatedAuditEvents {
  events: AuditEvent[];
  total: number;
  hasMore: boolean;
  nextToken?: string;
}

/**
 * Service error with HTTP status code
 */
export class AuditServiceError extends Error {
  constructor(
    message: string,
    public readonly statusCode: number,
    public readonly code: string
  ) {
    super(message);
    this.name = 'AuditServiceError';
  }
}

/**
 * Get Firestore instance
 */
function getDb(): admin.firestore.Firestore {
  return admin.firestore();
}

/**
 * Generate unique event ID with timestamp prefix for ordering
 */
function generateEventId(): string {
  const timestamp = Date.now().toString(36);
  const random = Math.random().toString(36).substring(2, 10);
  return `${timestamp}_${random}`;
}

/**
 * Get audit events subcollection reference
 */
function getAuditCollection(attributeId: string): admin.firestore.CollectionReference {
  return getDb()
    .collection(ATTRIBUTES_COLLECTION)
    .doc(attributeId)
    .collection(AUDIT_SUBCOLLECTION);
}

/**
 * Create an audit event
 * 
 * @param input - Audit event data
 * @returns Created audit event
 */
export async function createAuditEvent(
  input: CreateAuditEventInput
): Promise<AuditEvent> {
  const eventId = generateEventId();
  const timestamp = new Date().toISOString();
  
  const event: AuditEvent = {
    event_id: eventId,
    attribute_id: input.attribute_id,
    actor: input.actor,
    timestamp,
    action: input.action,
    before: input.before,
    after: input.after,
    reason: input.reason,
    context: input.context,
  };
  
  const auditRef = getAuditCollection(input.attribute_id).doc(eventId);
  await auditRef.set(cleanObject(event));
  
  return event;
}

/**
 * Create audit event within a batch/transaction
 * Used when audit event must be atomic with attribute update
 * 
 * @param batch - Firestore batch or transaction
 * @param input - Audit event data
 * @returns The audit event that will be created
 */
export function createAuditEventInBatch(
  batch: admin.firestore.WriteBatch,
  input: CreateAuditEventInput
): AuditEvent {
  const eventId = generateEventId();
  const timestamp = new Date().toISOString();
  
  const event: AuditEvent = {
    event_id: eventId,
    attribute_id: input.attribute_id,
    actor: input.actor,
    timestamp,
    action: input.action,
    before: input.before,
    after: input.after,
    reason: input.reason,
    context: input.context,
  };
  
  const auditRef = getAuditCollection(input.attribute_id).doc(eventId);
  batch.set(auditRef, cleanObject(event));
  
  return event;
}

/**
 * Get a single audit event by ID
 * 
 * @param attributeId - Attribute ID
 * @param eventId - Audit event ID
 * @returns Audit event or throws if not found
 */
export async function getAuditEvent(
  attributeId: string,
  eventId: string
): Promise<AuditEvent> {
  const doc = await getAuditCollection(attributeId).doc(eventId).get();
  
  if (!doc.exists) {
    throw new AuditServiceError(
      `Audit event '${eventId}' not found for attribute '${attributeId}'`,
      404,
      'AUDIT_EVENT_NOT_FOUND'
    );
  }
  
  return doc.data() as AuditEvent;
}

/**
 * List audit events for an attribute
 * Returns events in descending order (most recent first)
 * 
 * @param attributeId - Attribute ID
 * @param options - Pagination and filter options
 * @returns Paginated audit events
 */
export async function listAuditEvents(
  attributeId: string,
  options: ListAuditEventsOptions = {}
): Promise<PaginatedAuditEvents> {
  const limit = Math.min(options.limit || 50, 100);
  const auditCollection = getAuditCollection(attributeId);
  
  let query: admin.firestore.Query = auditCollection
    .orderBy('timestamp', 'desc')
    .limit(limit + 1); // Fetch one extra to detect hasMore
  
  // Apply cursor pagination
  if (options.after) {
    const afterDoc = await auditCollection.doc(options.after).get();
    if (afterDoc.exists) {
      query = query.startAfter(afterDoc);
    }
  }
  
  // Apply action filter
  if (options.actions && options.actions.length > 0) {
    query = query.where('action', 'in', options.actions);
  }
  
  const snapshot = await query.get();
  const docs = snapshot.docs;
  
  const hasMore = docs.length > limit;
  const resultDocs = hasMore ? docs.slice(0, limit) : docs;
  
  const events = resultDocs.map(doc => doc.data() as AuditEvent);
  
  // Get total count
  let total = 0;
  try {
    const countSnap = await auditCollection.count().get();
    total = countSnap.data().count;
  } catch {
    // Fallback for emulator
    const allDocs = await auditCollection.get();
    total = allDocs.size;
  }
  
  return {
    events,
    total,
    hasMore,
    nextToken: hasMore ? resultDocs[resultDocs.length - 1]?.id : undefined,
  };
}

/**
 * Get the most recent audit event for an attribute
 * 
 * @param attributeId - Attribute ID
 * @returns Most recent audit event or null if none
 */
export async function getLatestAuditEvent(
  attributeId: string
): Promise<AuditEvent | null> {
  const result = await listAuditEvents(attributeId, { limit: 1 });
  return result.events[0] || null;
}

/**
 * Compute diff summary between before and after states
 * Returns list of changed fields with their old and new values
 * 
 * @param before - State before change
 * @param after - State after change
 * @returns Array of field changes
 */
export function computeDiff(
  before: Record<string, unknown> | null,
  after: Record<string, unknown> | null
): Array<{
  field: string;
  oldValue: unknown;
  newValue: unknown;
  type: 'added' | 'removed' | 'modified';
}> {
  const changes: Array<{
    field: string;
    oldValue: unknown;
    newValue: unknown;
    type: 'added' | 'removed' | 'modified';
  }> = [];
  
  const beforeObj = before || {};
  const afterObj = after || {};
  
  // All keys from both objects
  const allKeys = new Set([
    ...Object.keys(beforeObj),
    ...Object.keys(afterObj),
  ]);
  
  // Skip metadata fields for diff display
  const skipFields = new Set(['updatedAt', 'updatedBy', 'createdAt', 'createdBy']);
  
  for (const key of allKeys) {
    if (skipFields.has(key)) continue;
    
    const oldValue = beforeObj[key];
    const newValue = afterObj[key];
    
    // Check if values are different (deep compare for objects/arrays)
    const oldJson = JSON.stringify(oldValue);
    const newJson = JSON.stringify(newValue);
    
    if (oldJson !== newJson) {
      let type: 'added' | 'removed' | 'modified';
      if (oldValue === undefined) {
        type = 'added';
      } else if (newValue === undefined) {
        type = 'removed';
      } else {
        type = 'modified';
      }
      
      changes.push({ field: key, oldValue, newValue, type });
    }
  }
  
  return changes;
}

/**
 * Format audit event for display/export
 * Returns human-readable summary
 * 
 * @param event - Audit event
 * @returns Formatted summary string
 */
export function formatAuditSummary(event: AuditEvent): string {
  const date = new Date(event.timestamp).toLocaleString();
  const actor = event.actor || 'system';
  
  switch (event.action) {
    case 'create':
      return `${date} — ${actor} created attribute`;
    case 'update':
      const diff = computeDiff(event.before, event.after);
      const fields = diff.map(d => d.field).join(', ');
      return `${date} — ${actor} updated: ${fields || 'metadata'}`;
    case 'delete':
      return `${date} — ${actor} deleted attribute`;
    case 'deprecate':
      return `${date} — ${actor} deprecated attribute`;
    case 'convert':
      const fromType = (event.before as any)?.data_type || 'unknown';
      const toType = (event.after as any)?.data_type || 'unknown';
      return `${date} — ${actor} converted ${fromType} → ${toType}`;
    case 'revert':
      return `${date} — ${actor} reverted to previous state${event.reason ? `: ${event.reason}` : ''}`;
    case 'mapping_update':
      return `${date} — ${actor} updated mappings/aliases`;
    case 'bulk_import':
      return `${date} — ${actor} bulk imported data`;
    default:
      return `${date} — ${actor} performed ${event.action}`;
  }
}

/**
 * Export audit events to CSV format
 * 
 * @param events - Array of audit events
 * @returns CSV string
 */
export function exportAuditToCsv(events: AuditEvent[]): string {
  const headers = [
    'event_id',
    'timestamp',
    'actor',
    'action',
    'reason',
    'changes_summary',
  ];
  
  const rows = events.map(event => {
    const diff = computeDiff(event.before, event.after);
    const changesSummary = diff.map(d => `${d.field}: ${d.type}`).join('; ');
    
    return [
      event.event_id,
      event.timestamp,
      event.actor,
      event.action,
      event.reason || '',
      changesSummary,
    ].map(v => `"${String(v).replace(/"/g, '""')}"`).join(',');
  });
  
  return [headers.join(','), ...rows].join('\n');
}

/**
 * Revert an attribute to the state captured in an audit event
 * 
 * This function:
 * 1. Fetches the specified audit event
 * 2. Validates it has a before state (can't revert 'create' events)
 * 3. Fetches current attribute state
 * 4. Atomically updates attribute + creates revert audit event
 * 
 * @param attributeId - Attribute ID to revert
 * @param eventId - Audit event ID whose 'before' state to restore
 * @param actor - User performing the revert
 * @param reason - Optional reason for the revert
 * @returns The reverted attribute state
 */
export async function revertAttribute(
  attributeId: string,
  eventId: string,
  actor: string,
  reason?: string
): Promise<Record<string, unknown>> {
  const db = getDb();
  
  // 1. Fetch the target audit event
  const targetEvent = await getAuditEvent(attributeId, eventId);
  
  // 2. Validate we have a before state to revert to
  if (!targetEvent.before) {
    throw new AuditServiceError(
      `Cannot revert to event '${eventId}' - it has no before state (was a create event)`,
      400,
      'INVALID_REVERT_TARGET'
    );
  }
  
  // 3. Get current attribute state
  const attributeRef = db.collection(ATTRIBUTES_COLLECTION).doc(attributeId);
  const currentDoc = await attributeRef.get();
  
  if (!currentDoc.exists) {
    throw new AuditServiceError(
      `Attribute '${attributeId}' not found`,
      404,
      'ATTRIBUTE_NOT_FOUND'
    );
  }
  
  const currentState = currentDoc.data() as Record<string, unknown>;
  
  // 4. Prepare the revert state (restore before, but keep metadata current)
  const now = new Date().toISOString();
  const revertedState = {
    ...targetEvent.before,
    attribute_id: attributeId, // Ensure ID unchanged
    updatedBy: actor,
    updatedAt: now,
    // Keep creation metadata from current state
    createdBy: currentState.createdBy,
    createdAt: currentState.createdAt,
  };
  
  // 5. Atomic update: set attribute + create audit event
  const batch = db.batch();
  batch.set(attributeRef, revertedState);
  
  const auditInput: CreateAuditEventInput = {
    attribute_id: attributeId,
    actor,
    action: 'revert',
    before: currentState,
    after: revertedState,
    reason,
    context: {
      related_event_id: eventId,
      source: 'api',
    },
  };
  createAuditEventInBatch(batch, auditInput);
  
  await batch.commit();
  
  return revertedState;
}