/**
 * ObservationsSync Service
 * 
 * LP-1.1.1: IndexedDB-based offline queue for observations.
 * Uses idb library for IndexedDB wrapper.
 */

import { openDB, DBSchema, IDBPDatabase } from 'idb';

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
// LP-1.1.12: Made text optional - description is the primary content
export interface PendingObservation {
  id: string;
  product_mpn: string;
  /** LP-1.1.12: Title/text is now optional */
  text?: string;
  description?: string;
  severity: 'low' | 'medium' | 'high';
  images: string[]; // URLs
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
 */
async function syncObservation(
  obs: PendingObservation,
  apiBaseUrl: string
): Promise<boolean> {
  try {
    await updateStatus(obs.id, 'syncing');
    
    const response = await fetch(`${apiBaseUrl}/observations`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      credentials: 'include',
      body: JSON.stringify({
        product_mpn: obs.product_mpn,
        text: obs.text,
        description: obs.description,
        severity: obs.severity,
        images: obs.images,
        fieldLink: obs.fieldLink,
        source: obs.source,
      }),
    });
    
    if (!response.ok) {
      const data = await response.json().catch(() => ({}));
      throw new Error(data.error || `Server error: ${response.status}`);
    }
    
    // Mark as synced and remove from queue
    await updateStatus(obs.id, 'synced');
    await removeFromQueue(obs.id);
    return true;
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
 * Returns { synced, failed } counts
 */
export async function flushQueue(
  apiBaseUrl: string = '/api'
): Promise<{ synced: number; failed: number }> {
  const pending = await getAllPending();
  let synced = 0;
  let failed = 0;
  
  for (const obs of pending) {
    // Skip observations with too many retries
    if (obs.retryCount >= 3) {
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
  
  return { synced, failed };
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
  };
  
  window.addEventListener('online', handler);
  
  // Return cleanup function
  return () => {
    window.removeEventListener('online', handler);
  };
}

/**
 * Export for testing
 */
export const __testing = {
  initDB,
  generateId,
  DB_NAME,
  DB_VERSION,
};
