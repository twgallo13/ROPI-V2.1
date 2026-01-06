/**
 * useProductCompletion Hook
 * LP-export-unlock-1.0.0
 *
 * Fetches product-level completion status for gating publish functionality.
 * Uses completion.ready as the single source of truth for publish enablement.
 */

import { useState, useEffect, useCallback } from 'react';

/**
 * Product completion evaluation result from API
 */
export interface ProductCompletionResult {
  ready: boolean;
  completionPct: number;
  threshold: number;
  hasBlockingSites: boolean;
  blockingReasons: Array<{
    type: string;
    severity: string;
    message: string;
    details?: {
      site?: string;
      missingAttributes?: string[];
      segmentId?: string;
    };
  }>;
  operatorExplanation?: {
    summary?: string;
    blockingIssues?: string[];
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
    actionRequired?: string[];
  };
}

/**
 * Hook return type
 */
export interface UseProductCompletionResult {
  loading: boolean;
  error: string | null;
  completion: ProductCompletionResult | null;
  canPublish: boolean;
  refresh: () => Promise<void>;
}

/**
 * Fetch product-level completion from API
 */
async function fetchProductCompletion(productId: string): Promise<ProductCompletionResult | null> {
  const authHeaders = await getAuthHeaders();

  const response = await fetch(`/api/products/${productId}/completion`, {
    method: 'GET',
    headers: {
      'Content-Type': 'application/json',
      ...authHeaders,
    },
  });

  if (!response.ok) {
    throw new Error(`Failed to fetch product completion: ${response.status} ${response.statusText}`);
  }

  return await response.json();
}

/**
 * Hook to manage product-level completion state for gating publish functionality.
 *
 * @param productId - The product ID to fetch completion for
 */
export function useProductCompletion(productId: string): UseProductCompletionResult {
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [completion, setCompletion] = useState<ProductCompletionResult | null>(null);

  const refresh = useCallback(async () => {
    if (!productId) {
      setLoading(false);
      return;
    }

    try {
      setLoading(true);
      setError(null);
      const result = await fetchProductCompletion(productId);
      setCompletion(result);
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Failed to load product completion';
      setError(message);
      setCompletion(null);
    } finally {
      setLoading(false);
    }
  }, [productId]);

  useEffect(() => {
    refresh();
  }, [refresh]);

  // Derive publish readiness from completion.ready
  const canPublish = completion?.ready === true;

  return {
    loading,
    error,
    completion,
    canPublish,
    refresh,
  };
}

export default useProductCompletion;
