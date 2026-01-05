/**
 * useExportCompletion Hook
 * LP-export-unlock-1.0.0
 *
 * Fetches catalog-level completion status to gate export functionality.
 * Uses completion.ready as the single source of truth for export enablement.
 */

import { useState, useEffect, useCallback } from 'react';

/**
 * Blocking reason returned by the completion API
 */
export interface ExportBlockingReason {
  type: string;
  severity: 'critical' | 'warning' | 'info';
  message: string;
  details?: {
    productId?: string;
    site?: string;
    missingAttributes?: string[];
    currentCompletion?: number;
    requiredCompletion?: number;
    segmentId?: string;
  };
}

/**
 * Catalog statistics for export readiness
 */
export interface CatalogStats {
  totalProducts: number;
  blockedByCompletionCount: number;
  blockedBySiteCount: number;
  readyCount: number;
}

/**
 * Operator explanation for blocking reasons
 */
export interface OperatorExplanation {
  summary: string;
  blockingIssues: string[];
  completionBreakdown?: Array<{
    segmentId: string;
    segmentName: string;
    score: number;
    weightPct: number;
    missingAttributes: string[];
  }>;
  siteStatus?: Array<{
    site: string;
    blocked: boolean;
    reason?: string;
    missingAttributes?: string[];
  }>;
  actionRequired: string[];
}

/**
 * Full completion evaluation result from API
 */
export interface CompletionEvaluationResult {
  ready: boolean;
  completionPct: number;
  threshold: number;
  hasBlockingSites: boolean;
  blockingReasons: ExportBlockingReason[];
  operatorExplanation?: OperatorExplanation;
  catalogStats?: CatalogStats;
  evaluatedAt?: string;
}

/**
 * Hook return type
 */
export interface UseExportCompletionResult {
  /** Whether completion data is currently loading */
  loading: boolean;
  /** Error message if fetch failed */
  error: string | null;
  /** The completion evaluation result (null if not loaded) */
  completion: CompletionEvaluationResult | null;
  /** Whether export is ready (completion.ready === true) */
  exportReady: boolean;
  /** Whether export is blocked (completion loaded and ready === false) */
  exportBlocked: boolean;
  /** Refresh completion data */
  refresh: () => Promise<void>;
}

/**
 * Fetch catalog-level export completion from API
 */
async function fetchExportCompletion(): Promise<CompletionEvaluationResult | null> {
  const token = localStorage.getItem('firebase_token') || '';

  const response = await fetch('/api/admin/exports/readiness', {
    method: 'GET',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${token}`,
    },
  });

  if (!response.ok) {
    // 423 means blocked - parse and return the readiness data
    if (response.status === 423) {
      const data = await response.json();
      return data.readiness || null;
    }
    throw new Error(`Failed to fetch export readiness: ${response.status} ${response.statusText}`);
  }

  const data = await response.json();
  return data.readiness || data;
}

/**
 * Hook to manage export completion state for gating /export functionality.
 *
 * Usage:
 * ```tsx
 * const { loading, exportReady, exportBlocked, completion, refresh } = useExportCompletion();
 *
 * if (loading) return <LoadingSpinner />;
 * if (exportBlocked) return <ExportBlockedModal reasons={completion?.blockingReasons} />;
 * // Export is ready - show interactive UI
 * ```
 */
export function useExportCompletion(): UseExportCompletionResult {
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [completion, setCompletion] = useState<CompletionEvaluationResult | null>(null);

  const refresh = useCallback(async () => {
    try {
      setLoading(true);
      setError(null);
      const result = await fetchExportCompletion();
      setCompletion(result);
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Failed to load export completion';
      setError(message);
      setCompletion(null);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    refresh();
  }, [refresh]);

  // Derive gating states from completion.ready
  const exportReady = completion?.ready === true;
  const exportBlocked = completion !== null && completion.ready === false;

  return {
    loading,
    error,
    completion,
    exportReady,
    exportBlocked,
    refresh,
  };
}

export default useExportCompletion;
