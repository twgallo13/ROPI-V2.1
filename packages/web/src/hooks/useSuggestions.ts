/**
 * useSuggestions Hook
 * 
 * LP-obs-studio-cleanup-1.4.0: Hook for generating and applying suggestions from observations.
 * Integrates with the suggestions API to provide observation-based attribute suggestions.
 * 
 * Features:
 * - Generate suggestions from recent observations
 * - Apply suggestions to product attributes
 * - Auto-resolve mode for high-confidence suggestions
 * 
 * References:
 * - Workflow W1 — Observations: https://www.notion.so/2b845ee1ec5a81b5a4a6d3ea439ec277
 */

import { useState, useCallback } from 'react';
import { getAuthHeaders } from '../lib/authHeaders';

const API_BASE = import.meta.env.VITE_API_BASE_URL || '';

export interface Suggestion {
  id: string;
  attributeId: string;
  currentValue: unknown;
  suggestedValue: unknown;
  confidence: number;
  rationale: string;
  source: 'observation-tags';
  applied?: boolean;
}

export interface SuggestionsMeta {
  observationsCount: number;
  tagsCount: number;
  uniqueTagsCount: number;
  autoAppliedCount: number;
  generatedAt: string;
}

export interface GenerateSuggestionsResult {
  suggestions: Suggestion[];
  meta: SuggestionsMeta;
}

export interface UseSuggestionsReturn {
  /** Current suggestions */
  suggestions: Suggestion[];
  /** Metadata about the suggestions generation */
  meta: SuggestionsMeta | null;
  /** Whether suggestions are being generated */
  loading: boolean;
  /** Error message if generation failed */
  error: string | null;
  /** Generate suggestions for a product */
  generateSuggestions: (productId: string, autoResolve?: boolean) => Promise<GenerateSuggestionsResult | null>;
  /** Apply a specific suggestion */
  applySuggestion: (productId: string, suggestion: Suggestion) => Promise<boolean>;
  /** Clear current suggestions */
  clearSuggestions: () => void;
}

/**
 * Hook for managing observation-based suggestions
 */
export function useSuggestions(): UseSuggestionsReturn {
  const [suggestions, setSuggestions] = useState<Suggestion[]>([]);
  const [meta, setMeta] = useState<SuggestionsMeta | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  /**
   * Generate suggestions for a product from its observations
   */
  const generateSuggestions = useCallback(async (
    productId: string,
    autoResolve = false
  ): Promise<GenerateSuggestionsResult | null> => {
    if (!productId) {
      setError('Product ID is required');
      return null;
    }

    setLoading(true);
    setError(null);

    try {
      const headers = await getAuthHeaders();
      const response = await fetch(`${API_BASE}/api/products/${productId}/suggestions`, {
        method: 'POST',
        headers,
        body: JSON.stringify({ autoResolve }),
      });

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        throw new Error(errorData.message || `Failed to generate suggestions: ${response.status}`);
      }

      const data: GenerateSuggestionsResult = await response.json();
      setSuggestions(data.suggestions);
      setMeta(data.meta);
      return data;
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Failed to generate suggestions';
      setError(message);
      console.error('[useSuggestions] Error generating suggestions:', err);
      return null;
    } finally {
      setLoading(false);
    }
  }, []);

  /**
   * Apply a specific suggestion to the product
   */
  const applySuggestion = useCallback(async (
    productId: string,
    suggestion: Suggestion
  ): Promise<boolean> => {
    if (!productId || !suggestion) {
      setError('Product ID and suggestion are required');
      return false;
    }

    setLoading(true);
    setError(null);

    try {
      const headers = await getAuthHeaders();
      const response = await fetch(`${API_BASE}/api/products/${productId}/apply-suggestion`, {
        method: 'POST',
        headers,
        body: JSON.stringify({
          suggestionId: suggestion.id,
          attributeId: suggestion.attributeId,
          value: suggestion.suggestedValue,
          rationale: suggestion.rationale,
        }),
      });

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        throw new Error(errorData.message || `Failed to apply suggestion: ${response.status}`);
      }

      // Mark suggestion as applied in local state
      setSuggestions(prev => prev.map(s => 
        s.id === suggestion.id ? { ...s, applied: true } : s
      ));

      return true;
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Failed to apply suggestion';
      setError(message);
      console.error('[useSuggestions] Error applying suggestion:', err);
      return false;
    } finally {
      setLoading(false);
    }
  }, []);

  /**
   * Clear current suggestions
   */
  const clearSuggestions = useCallback(() => {
    setSuggestions([]);
    setMeta(null);
    setError(null);
  }, []);

  return {
    suggestions,
    meta,
    loading,
    error,
    generateSuggestions,
    applySuggestion,
    clearSuggestions,
  };
}

export default useSuggestions;
