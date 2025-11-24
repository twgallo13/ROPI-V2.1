/**
 * Hook for fetching attribute value preview from products
 * Shows sample SKUs and their raw values for a canonical path
 * Lisa v3.3.0 - Product Value Preview Feature
 */
import { useState } from 'react';

export interface ValuePreviewSample {
  sku: string;
  value: string;
  rawPath: string;
  docId: string;
}

export interface ValuePreviewResponse {
  success: boolean;
  canonicalPath: string;
  samples: ValuePreviewSample[];
  totalFound: number;
}

export function useAttributeValuePreview(canonicalPath?: string) {
  const [loading, setLoading] = useState(false);
  const [samples, setSamples] = useState<ValuePreviewSample[]>([]);
  const [error, setError] = useState<string | null>(null);

  const load = async (limit = 10) => {
    if (!canonicalPath) {
      setError('No canonical path provided');
      return;
    }

    setLoading(true);
    setError(null);

    try {
      const res = await fetch(
        `/api/attributes/value-preview?path=${encodeURIComponent(canonicalPath)}&limit=${limit}`,
        { 
          credentials: 'include',
          headers: {
            'Content-Type': 'application/json'
          }
        }
      );

      if (!res.ok) {
        throw new Error(`Preview failed: ${res.statusText}`);
      }

      const json: ValuePreviewResponse = await res.json();
      setSamples(json.samples || []);
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Failed to load preview';
      setError(errorMessage);
      console.error('Value preview error:', err);
    } finally {
      setLoading(false);
    }
  };

  return { samples, loading, error, load };
}
