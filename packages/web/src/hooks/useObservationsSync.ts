/**
 * useObservationsSync Hook
 * 
 * LP-1.1.1: React hook for observation sync state management.
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
  isOnline: boolean;
  isSyncing: boolean;
  pendingObservations: PendingObservation[];
  addObservation: (obs: Omit<PendingObservation, 'id' | 'status' | 'retryCount' | 'createdAt' | 'updatedAt'>) => Promise<PendingObservation>;
  syncNow: () => Promise<{ synced: number; failed: number }>;
  refreshPending: () => Promise<void>;
}

export function useObservationsSync(
  options: UseObservationsSyncOptions = {}
): UseObservationsSyncResult {
  const { apiBaseUrl = '/api', autoSync = true } = options;
  
  const [pendingCount, setPendingCount] = useState(0);
  const [pendingObservations, setPendingObservations] = useState<PendingObservation[]>([]);
  const [isOnline, setIsOnline] = useState(navigator.onLine);
  const [isSyncing, setIsSyncing] = useState(false);

  // Refresh pending count and list
  const refreshPending = useCallback(async () => {
    const count = await getPendingCount();
    const observations = await getAllPending();
    setPendingCount(count);
    setPendingObservations(observations);
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
    try {
      const result = await flushQueue(apiBaseUrl);
      await refreshPending();
      return result;
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
    isOnline,
    isSyncing,
    pendingObservations,
    addObservation,
    syncNow,
    refreshPending,
  };
}

export default useObservationsSync;
