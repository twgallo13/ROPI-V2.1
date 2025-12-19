/**
 * Audit Service - Stub
 * PVS-0.3.4 - Minimal stub for mapping service dependency
 * 
 * The full audit service will be implemented in a future milestone.
 * This stub provides the interface needed by mappingService.ts.
 */

import * as admin from 'firebase-admin';

/**
 * Input for creating an audit event
 */
export interface CreateAuditEventInput {
  entityType: 'attribute' | 'mapping' | 'global_mapping' | 'source_override';
  entityId: string;
  action: 'create' | 'update' | 'delete' | 'revert';
  actor: string;
  timestamp: string;
  changes?: {
    before: unknown;
    after: unknown;
  };
  reason?: string;
  metadata?: Record<string, unknown>;
}

/**
 * Audit event shape
 */
export interface AuditEvent extends CreateAuditEventInput {
  id: string;
}

/**
 * Create an audit event
 * 
 * PVS-0.3.4: Stub implementation that logs to console.
 * Full implementation to come in PVS-0.3.0 M2.
 * 
 * @param input - Audit event input
 * @returns The created audit event with generated ID
 */
export async function createAuditEvent(input: CreateAuditEventInput): Promise<AuditEvent> {
  const id = `audit_${Date.now()}_${Math.random().toString(36).slice(2, 9)}`;
  
  // Log the audit event (full persistence to come later)
  console.log('[AUDIT]', {
    id,
    ...input,
  });
  
  return {
    id,
    ...input,
  };
}

/**
 * List audit events for an entity (stub)
 * 
 * @param entityType - Type of entity
 * @param entityId - Entity ID
 * @returns Empty array (full implementation to come)
 */
export async function listAuditEvents(
  entityType: string,
  entityId: string
): Promise<AuditEvent[]> {
  console.log(`[AUDIT] listAuditEvents for ${entityType}/${entityId} (stub)`);
  return [];
}

/**
 * Get a single audit event (stub)
 * 
 * @param eventId - Event ID
 * @returns null (full implementation to come)
 */
export async function getAuditEvent(eventId: string): Promise<AuditEvent | null> {
  console.log(`[AUDIT] getAuditEvent ${eventId} (stub)`);
  return null;
}
