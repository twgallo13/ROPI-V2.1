/**
 * useAudit Hook
 * PVS-0.3.3 - Audit UI
 * 
 * Provides audit log operations for attributes:
 * - List audit events (paginated)
 * - Get event details with diffs
 * - Revert to previous state
 * - Export audit log
 */

import { useState, useCallback } from 'react';
import { getAuthHeaders } from '../lib/authHeaders';

const API_BASE = import.meta.env.VITE_API_URL || '';

/**
 * Audit event action types
 */
export type AuditAction = 'create' | 'update' | 'delete' | 'revert' | 'status_change';

/**
 * Single audit event
 */
export interface AuditEvent {
  id: string;
  attributeId: string;
  action: AuditAction;
  actor: string;
  actorEmail?: string;
  timestamp: string;
  summary: string;
  before: Record<string, unknown> | null;
  after: Record<string, unknown> | null;
  changedFields?: string[];
  revertedFromEventId?: string;
  reason?: string;
  metadata?: Record<string, unknown>;
}

/**
 * Paginated audit response
 */
export interface AuditListResponse {
  events: AuditEvent[];
  total: number;
  pageToken?: string;
  hasMore: boolean;
}

/**
 * Attribute usage data
 */
export interface AttributeUsage {
  count: number;
  samples: Array<{
    id: string;
    sku: string | null;
    value: unknown;
  }>;
}

/**
 * Export options
 */
export interface ExportOptions {
  startDate?: string;
  endDate?: string;
  actor?: string;
  format?: 'csv' | 'json';
}

/**
 * Hook state
 */
interface UseAuditState {
  events: AuditEvent[];
  total: number;
  hasMore: boolean;
  pageToken?: string;
  selectedEvent: AuditEvent | null;
  usage: AttributeUsage | null;
  loading: boolean;
  loadingMore: boolean;
  reverting: boolean;
  exporting: boolean;
  error: string | null;
}

/**
 * useAudit hook for audit log operations
 */
export function useAudit(attributeId: string | null) {
  const [state, setState] = useState<UseAuditState>({
    events: [],
    total: 0,
    hasMore: false,
    pageToken: undefined,
    selectedEvent: null,
    usage: null,
    loading: false,
    loadingMore: false,
    reverting: false,
    exporting: false,
    error: null,
  });

  /**
   * Fetch audit events for attribute
   */
  const fetchEvents = useCallback(async (reset = true) => {
    if (!attributeId) return;

    setState(prev => ({
      ...prev,
      loading: reset,
      loadingMore: !reset,
      error: null,
    }));

    try {
      const headers = await getAuthHeaders();
      const params = new URLSearchParams();
      if (!reset && state.pageToken) {
        params.set('pageToken', state.pageToken);
      }
      params.set('limit', '20');

      const url = `${API_BASE}/api/admin/settings/attributes/${attributeId}/audit?${params}`;
      const response = await fetch(url, { headers });

      if (!response.ok) {
        const err = await response.json().catch(() => ({ error: 'Unknown error' }));
        throw new Error(err.error || `HTTP ${response.status}`);
      }

      const data: AuditListResponse = await response.json();

      setState(prev => ({
        ...prev,
        events: reset ? data.events : [...prev.events, ...data.events],
        total: data.total,
        hasMore: data.hasMore,
        pageToken: data.pageToken,
        loading: false,
        loadingMore: false,
      }));
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Failed to fetch audit events';
      console.error('fetchEvents error:', message);
      setState(prev => ({
        ...prev,
        loading: false,
        loadingMore: false,
        error: message,
      }));
    }
  }, [attributeId, state.pageToken]);

  /**
   * Load more events (pagination)
   */
  const loadMore = useCallback(() => {
    if (state.hasMore && !state.loadingMore) {
      fetchEvents(false);
    }
  }, [fetchEvents, state.hasMore, state.loadingMore]);

  /**
   * Get detailed event with full before/after snapshots
   */
  const fetchEventDetail = useCallback(async (eventId: string) => {
    if (!attributeId) return null;

    try {
      const headers = await getAuthHeaders();
      const url = `${API_BASE}/api/admin/settings/attributes/${attributeId}/audit/${eventId}`;
      const response = await fetch(url, { headers });

      if (!response.ok) {
        const err = await response.json().catch(() => ({ error: 'Unknown error' }));
        throw new Error(err.error || `HTTP ${response.status}`);
      }

      const event: AuditEvent = await response.json();
      setState(prev => ({ ...prev, selectedEvent: event }));
      return event;
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Failed to fetch event detail';
      console.error('fetchEventDetail error:', message);
      setState(prev => ({ ...prev, error: message }));
      return null;
    }
  }, [attributeId]);

  /**
   * Clear selected event
   */
  const clearSelectedEvent = useCallback(() => {
    setState(prev => ({ ...prev, selectedEvent: null }));
  }, []);

  /**
   * Revert attribute to state from a specific event
   * Creates a new audit event with action 'revert'
   */
  const revertToEvent = useCallback(async (eventId: string, reason: string): Promise<boolean> => {
    if (!attributeId || !reason.trim()) return false;

    setState(prev => ({ ...prev, reverting: true, error: null }));

    try {
      const headers = await getAuthHeaders();
      const url = `${API_BASE}/api/admin/settings/attributes/${attributeId}/revert`;
      const response = await fetch(url, {
        method: 'POST',
        headers: {
          ...headers,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ eventId, reason }),
      });

      if (!response.ok) {
        const err = await response.json().catch(() => ({ error: 'Unknown error' }));
        throw new Error(err.error || `HTTP ${response.status}`);
      }

      // Refresh events after revert
      await fetchEvents(true);

      setState(prev => ({ ...prev, reverting: false }));
      return true;
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Failed to revert';
      console.error('revertToEvent error:', message);
      setState(prev => ({ ...prev, reverting: false, error: message }));
      return false;
    }
  }, [attributeId, fetchEvents]);

  /**
   * Fetch attribute usage (product count and samples)
   */
  const fetchUsage = useCallback(async () => {
    if (!attributeId) return;

    try {
      const headers = await getAuthHeaders();
      const url = `${API_BASE}/api/admin/settings/attributes/${attributeId}/usage`;
      const response = await fetch(url, { headers });

      if (!response.ok) {
        const err = await response.json().catch(() => ({ error: 'Unknown error' }));
        throw new Error(err.error || `HTTP ${response.status}`);
      }

      const usage: AttributeUsage = await response.json();
      setState(prev => ({ ...prev, usage }));
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Failed to fetch usage';
      console.error('fetchUsage error:', message);
      // Don't set error state - usage is supplementary
    }
  }, [attributeId]);

  /**
   * Export audit log to CSV or JSON
   */
  const exportAudit = useCallback(async (options: ExportOptions = {}): Promise<string | null> => {
    if (!attributeId) return null;

    setState(prev => ({ ...prev, exporting: true, error: null }));

    try {
      const headers = await getAuthHeaders();
      const params = new URLSearchParams();
      if (options.startDate) params.set('startDate', options.startDate);
      if (options.endDate) params.set('endDate', options.endDate);
      if (options.actor) params.set('actor', options.actor);
      params.set('format', options.format || 'csv');

      const url = `${API_BASE}/api/admin/settings/attributes/${attributeId}/audit/export?${params}`;
      const response = await fetch(url, { headers });

      if (!response.ok) {
        const err = await response.json().catch(() => ({ error: 'Unknown error' }));
        throw new Error(err.error || `HTTP ${response.status}`);
      }

      // Get content as blob
      const blob = await response.blob();
      const downloadUrl = URL.createObjectURL(blob);

      // Trigger download
      const link = document.createElement('a');
      link.href = downloadUrl;
      const ext = options.format === 'json' ? 'json' : 'csv';
      link.download = `audit-${attributeId}-${new Date().toISOString().split('T')[0]}.${ext}`;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      URL.revokeObjectURL(downloadUrl);

      setState(prev => ({ ...prev, exporting: false }));
      return downloadUrl;
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Failed to export audit log';
      console.error('exportAudit error:', message);
      setState(prev => ({ ...prev, exporting: false, error: message }));
      return null;
    }
  }, [attributeId]);

  /**
   * Refresh all data
   */
  const refresh = useCallback(async () => {
    await Promise.all([
      fetchEvents(true),
      fetchUsage(),
    ]);
  }, [fetchEvents, fetchUsage]);

  return {
    // State
    events: state.events,
    total: state.total,
    hasMore: state.hasMore,
    selectedEvent: state.selectedEvent,
    usage: state.usage,
    loading: state.loading,
    loadingMore: state.loadingMore,
    reverting: state.reverting,
    exporting: state.exporting,
    error: state.error,

    // Actions
    fetchEvents,
    loadMore,
    fetchEventDetail,
    clearSelectedEvent,
    revertToEvent,
    fetchUsage,
    exportAudit,
    refresh,
  };
}

export default useAudit;
