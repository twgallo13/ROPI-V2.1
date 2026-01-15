/**
 * ObservationsSync Service
 * 
 * LP-1.1.1: IndexedDB-based offline queue for observations.
 * LP-obs-studio-cleanup-1.7.0: Auth token propagation, retry/backoff, telemetry.
 * Uses idb library for IndexedDB wrapper.
 */

import { openDB, DBSchema, IDBPDatabase } from 'idb';
import { authFetch, setTelemetryEmitter } from './authFetch';

// ============================================================================
// LP-obs-studio-cleanup-1.7.0: Telemetry
// ============================================================================

type TelemetryEvent = {
  name: string;
  data?: Record<string, unknown>;
};

let telemetryCallback: ((event: TelemetryEvent) => void) | null = null;

/**
 * Set telemetry callback for sync events
 */
export function setSyncTelemetryCallback(
  callback: ((event: TelemetryEvent) => void) | null
): void {
  telemetryCallback = callback;
  // Also set for authFetch
  setTelemetryEmitter(callback);
}

function emitTelemetry(name: string, data?: Record<string, unknown>): void {
  if (telemetryCallback) {
    telemetryCallback({ name, data });
  }
}

// Database schema
interface ObservationsDB extends DBSchema {
  pendingObservations: {
    key: string;
    value: PendingObservation;
    indexes: {
      'by-status': string;
      'by-created': number;
    };
  };
}

// Pending observation structure
// LP-obs-studio-cleanup-1.6.6: Support both legacy and simplified tags-only observations
export interface PendingObservation {
  id: string;
  product_mpn: string;
  productId?: string; // LP-1.6.6: Product document ID for direct product.observation update
  text?: string; // LP-1.6.6: Made optional for tags-only mode
  description?: string;
  severity?: 'low' | 'medium' | 'high'; // LP-1.6.6: Made optional for tags-only mode
  images: string[]; // URLs
  tags?: string[]; // LP-obs-studio-cleanup-1.0.0: user-entered tags
  fieldLink?: {
    type: string;
    fieldPath: string;
    displayName?: string;
  };
  source: 'mobile_capture' | 'product_editor' | 'import';
  status: 'pending' | 'syncing' | 'synced' | 'error';
  error?: string;
  retryCount: number;
  createdAt: number;
  updatedAt: number;
}

// Database instance
let db: IDBPDatabase<ObservationsDB> | null = null;

// Database name and version
const DB_NAME = 'ropi-observations';
const DB_VERSION = 1;

/**
 * Initialize the IndexedDB database
 */
async function initDB(): Promise<IDBPDatabase<ObservationsDB>> {
  if (db) return db;

  db = await openDB<ObservationsDB>(DB_NAME, DB_VERSION, {
    upgrade(database) {
      // Create pendingObservations store
      const store = database.createObjectStore('pendingObservations', {
        keyPath: 'id',
      });
      store.createIndex('by-status', 'status');
      store.createIndex('by-created', 'createdAt');
    },
  });

  return db;
}

/**
 * Generate unique ID
 */
function generateId(): string {
  return `obs_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
}

/**
 * Add observation to offline queue
 */
export async function addToQueue(
  observation: Omit<PendingObservation, 'id' | 'status' | 'retryCount' | 'createdAt' | 'updatedAt'>
): Promise<PendingObservation> {
  const database = await initDB();
  
  const pendingObs: PendingObservation = {
    ...observation,
    id: generateId(),
    status: 'pending',
    retryCount: 0,
    createdAt: Date.now(),
    updatedAt: Date.now(),
  };
  
  await database.put('pendingObservations', pendingObs);
  return pendingObs;
}

/**
 * Get pending observation count
 */
export async function getPendingCount(): Promise<number> {
  const database = await initDB();
  const pending = await database.getAllFromIndex('pendingObservations', 'by-status', 'pending');
  const syncing = await database.getAllFromIndex('pendingObservations', 'by-status', 'syncing');
  const errors = await database.getAllFromIndex('pendingObservations', 'by-status', 'error');
  return pending.length + syncing.length + errors.length;
}

/**
 * Get all pending observations
 */
export async function getAllPending(): Promise<PendingObservation[]> {
  const database = await initDB();
  const all = await database.getAll('pendingObservations');
  return all.filter(obs => obs.status !== 'synced').sort((a, b) => a.createdAt - b.createdAt);
}

/**
 * Update observation status
 */
export async function updateStatus(
  id: string,
  status: PendingObservation['status'],
  error?: string
): Promise<void> {
  const database = await initDB();
  const obs = await database.get('pendingObservations', id);
  
  if (obs) {
    obs.status = status;
    obs.error = error;
    obs.updatedAt = Date.now();
    if (status === 'error') {
      obs.retryCount += 1;
    }
    await database.put('pendingObservations', obs);
  }
}

/**
 * Remove observation from queue (after successful sync)
 */
export async function removeFromQueue(id: string): Promise<void> {
  const database = await initDB();
  await database.delete('pendingObservations', id);
}

/**
 * Clear all synced observations
 */
export async function clearSynced(): Promise<number> {
  const database = await initDB();
  const synced = await database.getAllFromIndex('pendingObservations', 'by-status', 'synced');
  
  for (const obs of synced) {
    await database.delete('pendingObservations', obs.id);
  }
  
  return synced.length;
}

/**
 * Sync a single observation to the server
 * LP-obs-studio-cleanup-1.6.6: Support both legacy and product-level observation endpoints
 * LP-obs-studio-cleanup-1.7.0: Use authFetch with retry/refresh logic
 */
async function syncObservation(
  obs: PendingObservation,
  apiBaseUrl: string
): Promise<boolean> {
  try {
    await updateStatus(obs.id, 'syncing');
    emitTelemetry('obs.sync.started', { 
      observationId: obs.id, 
      productId: obs.productId,
      tagsCount: obs.tags?.length || 0,
    });
    
    // LP-obs-studio-cleanup-1.6.6: Use product-level endpoint when productId is present
    // LP-obs-studio-cleanup-1.7.0: Use authFetch with automatic token refresh
    if (obs.productId && obs.tags && obs.tags.length > 0) {
      const response = await authFetch(`${apiBaseUrl}/products/${obs.productId}/observation`, {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          tags: obs.tags,
          images: obs.images || [],
          source: obs.source === 'mobile_capture' ? 'mobile' : 'desktop',
          action: 'add', // Merge tags rather than replace
        }),
      });
      
      if (!response.ok) {
        const data = await response.json().catch(() => ({}));
        const errorMsg = data.error || `Server error: ${response.status}`;
        emitTelemetry('obs.sync.fail', { 
          observationId: obs.id, 
          productId: obs.productId,
          errorKind: response.status === 401 ? 'auth' : 'server',
          status: response.status,
        });
        throw new Error(errorMsg);
      }
      
      // Mark as synced and remove from queue
      await updateStatus(obs.id, 'synced');
      await removeFromQueue(obs.id);
      emitTelemetry('obs.sync.success', { 
        observationId: obs.id, 
        productId: obs.productId,
      });
      return true;
    }
    
    // Legacy write path removed:
    // If there is no productId we must resolve the product via MPN and then
    // write to the canonical product.observation SRoT. The legacy standalone
    // observations collection is deprecated and returns 410 on the server.
    //
    // Resolve product by MPN
    if (!obs.productId) {
      if (!obs.product_mpn) {
        emitTelemetry('obs.sync.fail', {
          observationId: obs.id,
          errorKind: 'client',
          reason: 'MISSING_PRODUCT_ID_AND_MPN',
        });
        throw new Error('MISSING_PRODUCT_ID_AND_MPN');
      }
      // Look up product by MPN using the public by-mpn endpoint
      const lookupResp = await authFetch(`${apiBaseUrl}/products/by-mpn/${encodeURIComponent(obs.product_mpn)}`, {
        method: 'GET',
      });
      if (!lookupResp.ok) {
        const data = await lookupResp.json().catch(() => ({}));
        const code = lookupResp.status === 404 ? 'PRODUCT_NOT_FOUND' : (data.error || `Server error: ${lookupResp.status}`);
        emitTelemetry('obs.sync.fail', {
          observationId: obs.id,
          productMpn: obs.product_mpn,
          errorKind: lookupResp.status === 401 ? 'auth' : 'server',
          status: lookupResp.status,
        });
        throw new Error(code);
      }
      const productData = await lookupResp.json().catch(() => (null));
      const resolvedId: string | undefined = productData?.id || productData?.productId || undefined;
      if (!resolvedId) {
        emitTelemetry('obs.sync.fail', {
          observationId: obs.id,
          productMpn: obs.product_mpn,
          errorKind: 'product_response_malformed',
        });
        throw new Error('PRODUCT_LOOKUP_RESPONSE_MALFORMED');
      }
      // Use SRoT to add tags/images
      const srotResp = await authFetch(`${apiBaseUrl}/products/${resolvedId}/observation`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          action: 'add',
          tags: obs.tags || [],
          images: obs.images || [],
          source: obs.source === 'mobile_capture' ? 'mobile' : 'desktop',
        }),
      });
      if (!srotResp.ok) {
        const data = await srotResp.json().catch(() => ({}));
        const errorMsg = data.error || `Server error: ${srotResp.status}`;
        emitTelemetry('obs.sync.fail', {
          observationId: obs.id,
          productMpn: obs.product_mpn,
          productId: resolvedId,
          errorKind: srotResp.status === 401 ? 'auth' : 'server',
          status: srotResp.status,
        });
        throw new Error(errorMsg);
      }
      // Mark as synced and remove from queue
      await updateStatus(obs.id, 'synced');
      await removeFromQueue(obs.id);
      emitTelemetry('obs.sync.success', {
        observationId: obs.id,
        productMpn: obs.product_mpn,
        productId: resolvedId,
      });
      return true;
    }
    
    // Fallback: should not reach here if productId is truthy (handled above)
    // but keep this for safety - emit telemetry and mark error
    emitTelemetry('obs.sync.fail', {
      observationId: obs.id,
      errorKind: 'client',
      reason: 'UNEXPECTED_STATE_NO_PRODUCT_ID',
    });
    throw new Error('UNEXPECTED_STATE_NO_PRODUCT_ID');
  } catch (err) {
    console.error(`Failed to sync observation ${obs.id}:`, err);
    await updateStatus(
      obs.id,
      'error',
      err instanceof Error ? err.message : 'Sync failed'
    );
    return false;
  }
}

/**
 * Flush all pending observations to server
 * LP-obs-studio-cleanup-1.7.0: Added telemetry and improved error handling
 * LP-observations-consolidation-1.1.0: Added flush_attempt, flush_success, flush_failure events
 * Returns { synced, failed } counts
 */
export async function flushQueue(
  apiBaseUrl: string = '/api'
): Promise<{ synced: number; failed: number }> {
  const pending = await getAllPending();
  
  if (pending.length === 0) {
    return { synced: 0, failed: 0 };
  }
  
  // LP-1.1.0: Emit flush_attempt at start
  emitTelemetry('obs.sync.flush_attempt', { queueLength: pending.length });
  emitTelemetry('obs.sync.queue_flush_started', { queueLength: pending.length });
  
  let synced = 0;
  let failed = 0;
  
  for (const obs of pending) {
    // Skip observations with too many retries
    if (obs.retryCount >= 3) {
      emitTelemetry('obs.sync.max_retries_exceeded', { 
        observationId: obs.id,
        retryCount: obs.retryCount,
      });
      failed++;
      continue;
    }
    
    const success = await syncObservation(obs, apiBaseUrl);
    if (success) {
      synced++;
    } else {
      failed++;
    }
  }
  
  // LP-1.1.0: Emit flush_success or flush_failure based on outcome
  if (failed === 0 && synced > 0) {
    emitTelemetry('obs.sync.flush_success', { synced, failed, total: pending.length });
  } else if (failed > 0) {
    emitTelemetry('obs.sync.flush_failure', { synced, failed, total: pending.length });
  }
  
  emitTelemetry('obs.sync.queue_flush_completed', { synced, failed });
  
  return { synced, failed };
}

/**
 * LP-obs-studio-cleanup-1.3.0: Flush on demand for a specific observation
 * Attempts immediate persistence when online. Used for background persist after tag add/remove.
 */
export async function flushOnDemandForObservation(
  observationId: string,
  apiBaseUrl: string = '/api'
): Promise<boolean> {
  if (!navigator.onLine) {
    return false;
  }
  
  const database = await initDB();
  const obs = await database.get('pendingObservations', observationId);
  
  if (!obs || obs.status === 'synced') {
    return true; // Nothing to sync or already synced
  }
  
  return syncObservation(obs, apiBaseUrl);
}

/**
 * Check online status and sync if online
 */
export async function syncIfOnline(apiBaseUrl: string = '/api'): Promise<void> {
  if (navigator.onLine) {
    await flushQueue(apiBaseUrl);
  }
}

/**
 * Register online listener to auto-sync
 */
export function registerAutoSync(apiBaseUrl: string = '/api'): () => void {
  const handler = () => {
    syncIfOnline(apiBaseUrl);
    // LP-obs-studio-cleanup-1.2.1: Also flush tag removals when coming online
    flushTagRemovalQueue(apiBaseUrl);
  };
  
  window.addEventListener('online', handler);
  
  // Return cleanup function
  return () => {
    window.removeEventListener('online', handler);
  };
}

// ============================================================================
// LP-obs-studio-cleanup-1.2.1: Tag Removal Queue
// Lightweight queue using localStorage for background tag removal with retry
// ============================================================================

interface PendingTagRemoval {
  id: string;
  observationId: string;
  tag: string;
  status: 'pending' | 'syncing' | 'failed';
  retryCount: number;
  createdAt: number;
}

const TAG_REMOVAL_QUEUE_KEY = 'ropi-tag-removal-queue';

// Callbacks for UI notification
let onTagRemovalFailed: ((removal: PendingTagRemoval) => void) | null = null;

/**
 * Set callback for tag removal failure (to show undo toast)
 */
export function setTagRemovalFailedCallback(
  callback: ((removal: PendingTagRemoval) => void) | null
): void {
  onTagRemovalFailed = callback;
}

/**
 * Get all pending tag removals from localStorage
 */
function getTagRemovalQueue(): PendingTagRemoval[] {
  try {
    const data = localStorage.getItem(TAG_REMOVAL_QUEUE_KEY);
    return data ? JSON.parse(data) : [];
  } catch {
    return [];
  }
}

/**
 * Save tag removal queue to localStorage
 */
function saveTagRemovalQueue(queue: PendingTagRemoval[]): void {
  localStorage.setItem(TAG_REMOVAL_QUEUE_KEY, JSON.stringify(queue));
}

/**
 * Enqueue a tag removal for background processing
 */
export function enqueueTagRemoval(observationId: string, tag: string): string {
  const queue = getTagRemovalQueue();
  const removal: PendingTagRemoval = {
    id: `tagrem_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
    observationId,
    tag,
    status: 'pending',
    retryCount: 0,
    createdAt: Date.now(),
  };
  queue.push(removal);
  saveTagRemovalQueue(queue);
  
  // Trigger immediate flush if online
  if (navigator.onLine) {
    flushTagRemovalQueue();
  }
  
  return removal.id;
}

/**
 * Cancel a pending tag removal (for undo)
 */
export function cancelTagRemoval(removalId: string): boolean {
  const queue = getTagRemovalQueue();
  const index = queue.findIndex(r => r.id === removalId);
  if (index >= 0) {
    queue.splice(index, 1);
    saveTagRemovalQueue(queue);
    return true;
  }
  return false;
}

/**
 * Process a single tag removal
 * LP-obs-studio-cleanup-1.7.0: Use authFetch with automatic token refresh
 */
async function processTagRemoval(
  removal: PendingTagRemoval,
  apiBaseUrl: string
): Promise<boolean> {
  try {
    const response = await authFetch(
      `${apiBaseUrl}/observations/${removal.observationId}/tags/remove`,
      {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ tag: removal.tag }),
      }
    );
    
    if (!response.ok) {
      const data = await response.json().catch(() => ({}));
      throw new Error(data.error || `Server error: ${response.status}`);
    }
    
    return true;
  } catch (err) {
    console.error(`Failed to remove tag from observation ${removal.observationId}:`, err);
    return false;
  }
}

/**
 * Flush pending tag removals with retry logic
 */
export async function flushTagRemovalQueue(
  apiBaseUrl: string = '/api'
): Promise<{ processed: number; failed: number }> {
  const queue = getTagRemovalQueue();
  const pending = queue.filter(r => r.status !== 'failed' || r.retryCount < 2);
  
  let processed = 0;
  let failed = 0;
  
  for (const removal of pending) {
    // Skip if max retries reached
    if (removal.retryCount >= 2) {
      removal.status = 'failed';
      failed++;
      // Notify UI about failure
      if (onTagRemovalFailed) {
        onTagRemovalFailed(removal);
      }
      continue;
    }
    
    removal.status = 'syncing';
    saveTagRemovalQueue(queue);
    
    const success = await processTagRemoval(removal, apiBaseUrl);
    
    if (success) {
      // Remove from queue on success
      const idx = queue.findIndex(r => r.id === removal.id);
      if (idx >= 0) queue.splice(idx, 1);
      saveTagRemovalQueue(queue);
      processed++;
    } else {
      removal.status = 'pending';
      removal.retryCount++;
      saveTagRemovalQueue(queue);
      
      // If this was the last retry, notify UI
      if (removal.retryCount >= 2) {
        removal.status = 'failed';
        saveTagRemovalQueue(queue);
        failed++;
        if (onTagRemovalFailed) {
          onTagRemovalFailed(removal);
        }
      } else {
        // Schedule retry with backoff (1s, 2s)
        const delay = removal.retryCount * 1000;
        setTimeout(() => {
          if (navigator.onLine) {
            flushTagRemovalQueue(apiBaseUrl);
          }
        }, delay);
      }
    }
  }
  
  return { processed, failed };
}

/**
 * Export for testing
 */
export const __testing = {
  initDB,
  generateId,
  DB_NAME,
  DB_VERSION,
  getTagRemovalQueue,
  saveTagRemovalQueue,
};

/**
 * LP-observations-consolidation-1.1.0: Test hook to force flush queue
 * Used by E2E tests to verify offline sync behavior.
 * 
 * @param apiBaseUrl - API base URL for sync
 * @returns Promise<{ synced, failed }> counts from flush operation
 */
export async function forceFlushForTest(
  apiBaseUrl: string = '/api'
): Promise<{ synced: number; failed: number }> {
  emitTelemetry('obs.sync.force_flush_test_called');
  return flushQueue(apiBaseUrl);
}

/**
 * LP-observations-consolidation-1.1.0: Get pending count by status for E2E tests
 */
export async function getQueueStatusForTest(): Promise<{
  pending: number;
  syncing: number;
  error: number;
  synced: number;
}> {
  const database = await initDB();
  const pending = await database.getAllFromIndex('pendingObservations', 'by-status', 'pending');
  const syncing = await database.getAllFromIndex('pendingObservations', 'by-status', 'syncing');
  const error = await database.getAllFromIndex('pendingObservations', 'by-status', 'error');
  const synced = await database.getAllFromIndex('pendingObservations', 'by-status', 'synced');
  
  return {
    pending: pending.length,
    syncing: syncing.length,
    error: error.length,
    synced: synced.length,
  };
}
