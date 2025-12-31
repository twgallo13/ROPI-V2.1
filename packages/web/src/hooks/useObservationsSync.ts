/**
 * useObservationsSync Hook
 * 
 * LP-1.1.1: React hook for observation sync state management.
 * LP-obs-studio-cleanup-1.7.0: Added sync error state and failed count tracking.
 */

import { useState, useEffect, useCallback } from 'react';
import {
  addToQueue,
  getPendingCount,
  getAllPending,
  flushQueue,
  registerAutoSync,
  PendingObservation,
} from '../services/ObservationsSync';

interface UseObservationsSyncOptions {
  apiBaseUrl?: string;
  autoSync?: boolean;
}

interface UseObservationsSyncResult {
  pendingCount: number;
  failedCount: number; // LP-1.7.0: Count of failed syncs
  isOnline: boolean;
  isSyncing: boolean;
  lastSyncError: string | null; // LP-1.7.0: Last sync error message
  pendingObservations: PendingObservation[];
  addObservation: (obs: Omit<PendingObservation, 'id' | 'status' | 'retryCount' | 'createdAt' | 'updatedAt'>) => Promise<PendingObservation>;
  syncNow: () => Promise<{ synced: number; failed: number }>;
  refreshPending: () => Promise<void>;
  clearSyncError: () => void; // LP-1.7.0: Clear error state
}

export function useObservationsSync(
  options: UseObservationsSyncOptions = {}
): UseObservationsSyncResult {
  const { apiBaseUrl = '/api', autoSync = true } = options;
  
  const [pendingCount, setPendingCount] = useState(0);
  const [failedCount, setFailedCount] = useState(0);
  const [pendingObservations, setPendingObservations] = useState<PendingObservation[]>([]);
  const [isOnline, setIsOnline] = useState(navigator.onLine);
  const [isSyncing, setIsSyncing] = useState(false);
  const [lastSyncError, setLastSyncError] = useState<string | null>(null);

  // Refresh pending count and list
  const refreshPending = useCallback(async () => {
    const count = await getPendingCount();
    const observations = await getAllPending();
    setPendingCount(count);
    setPendingObservations(observations);
    // LP-1.7.0: Track failed observations
    const failed = observations.filter(o => o.status === 'error').length;
    setFailedCount(failed);
  }, []);

  // Clear sync error
  const clearSyncError = useCallback(() => {
    setLastSyncError(null);
  }, []);

  // Add observation to queue
  const addObservation = useCallback(
    async (obs: Omit<PendingObservation, 'id' | 'status' | 'retryCount' | 'createdAt' | 'updatedAt'>) => {
      const pending = await addToQueue(obs);
      await refreshPending();
      return pending;
    },
    [refreshPending]
  );

  // Manual sync trigger
  const syncNow = useCallback(async () => {
    if (isSyncing || !isOnline) {
      return { synced: 0, failed: 0 };
    }
    
    setIsSyncing(true);
    setLastSyncError(null);
    try {
      const result = await flushQueue(apiBaseUrl);
      await refreshPending();
      // LP-1.7.0: Set error message if there were failures
      if (result.failed > 0) {
        setLastSyncError(`${result.failed} observation(s) failed to sync`);
      }
      return result;
    } catch (err) {
      const errorMsg = err instanceof Error ? err.message : 'Sync failed';
      setLastSyncError(errorMsg);
      return { synced: 0, failed: 0 };
    } finally {
      setIsSyncing(false);
    }
  }, [apiBaseUrl, isOnline, isSyncing, refreshPending]);

  // Track online status
  useEffect(() => {
    const handleOnline = () => {
      setIsOnline(true);
      refreshPending();
    };
    const handleOffline = () => setIsOnline(false);
    
    window.addEventListener('online', handleOnline);
    window.addEventListener('offline', handleOffline);
    
    return () => {
      window.removeEventListener('online', handleOnline);
      window.removeEventListener('offline', handleOffline);
    };
  }, [refreshPending]);

  // Auto-sync when coming online
  useEffect(() => {
    if (!autoSync) return;
    
    const cleanup = registerAutoSync(apiBaseUrl);
    return cleanup;
  }, [apiBaseUrl, autoSync]);

  // Initial load
  useEffect(() => {
    refreshPending();
  }, [refreshPending]);

  return {
    pendingCount,
    failedCount,
    isOnline,
    isSyncing,
    lastSyncError,
    pendingObservations,
    addObservation,
    syncNow,
    refreshPending,
    clearSyncError,
  };
}

export default useObservationsSync;
