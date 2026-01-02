/**
 * trace.ts
 * LP-smart-rules-logging-1.0.0
 * 
 * Trace ID helpers for correlating Smart Rules logs with import operations.
 * 
 * Generates and manages trace IDs for request/import correlation.
 */

import { randomUUID } from 'crypto';

// ============================================================================
// Types
// ============================================================================

export interface TraceContext {
  traceId: string;
  importId?: string;
  requestId?: string;
  workspaceId?: string;
  userId?: string;
}

// ============================================================================
// Trace ID Generation
// ============================================================================

/**
 * Generate a new trace ID
 */
export function generateTraceId(): string {
  return randomUUID();
}

/**
 * Extract trace ID from request headers (Cloud Trace format)
 * Format: "projects/[PROJECT_ID]/traces/[TRACE_ID]"
 */
export function extractTraceIdFromHeader(header?: string): string | undefined {
  if (!header) return undefined;
  
  const match = header.match(/traces\/([a-f0-9]+)/);
  return match ? match[1] : undefined;
}

/**
 * Create trace context from request
 */
export function createTraceContext(
  request: any, // Express Request or Firebase HTTPS request
  importId?: string
): TraceContext {
  // Try to get trace ID from Cloud Trace header
  const cloudTraceHeader = request.headers?.['x-cloud-trace-context'];
  const extractedTraceId = extractTraceIdFromHeader(cloudTraceHeader);
  
  // Generate or use existing trace ID
  const traceId = extractedTraceId || 
                  request.headers?.['x-trace-id'] || 
                  generateTraceId();
  
  return {
    traceId,
    importId,
    requestId: request.headers?.['x-request-id'],
    workspaceId: request.body?.workspaceId || request.query?.workspaceId,
    userId: request.user?.uid,
  };
}

// ============================================================================
// Context Storage (for async correlation)
// ============================================================================

// In-memory context store (per-request)
const contextStore = new Map<string, TraceContext>();

/**
 * Store trace context for later retrieval
 */
export function storeTraceContext(traceId: string, context: TraceContext): void {
  contextStore.set(traceId, context);
  
  // Auto-cleanup after 5 minutes
  setTimeout(() => {
    contextStore.delete(traceId);
  }, 5 * 60 * 1000);
}

/**
 * Retrieve stored trace context
 */
export function getTraceContext(traceId: string): TraceContext | undefined {
  return contextStore.get(traceId);
}

/**
 * Clear trace context
 */
export function clearTraceContext(traceId: string): void {
  contextStore.delete(traceId);
}

// ============================================================================
// Helper Functions
// ============================================================================

/**
 * Format trace ID for Cloud Logging correlation
 */
export function formatTraceIdForLogging(traceId: string, projectId: string = 'ropi-bccee'): string {
  return `projects/${projectId}/traces/${traceId}`;
}

/**
 * Create import trace ID (combines import ID with timestamp)
 */
export function createImportTraceId(importId: string): string {
  const timestamp = Date.now().toString(36);
  return `import-${importId}-${timestamp}`;
}
