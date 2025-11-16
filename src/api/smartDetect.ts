/**
 * Smart Detect API Client
 */

export interface SmartDetectSuggestion {
  fieldPath: string;
  currentValue: any;
  suggestedValue: any;
  confidence: number;
  reason: string;
}

export interface SmartDetectResult {
  suggestions: SmartDetectSuggestion[];
  summary: string;
}

/**
 * Call Smart Detect API
 */
export async function callSmartDetect(productId: string): Promise<SmartDetectResult> {
  const response = await fetch('/apiSmartDetect', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({ productId }),
  });

  if (!response.ok) {
    const error = await response.json().catch(() => ({ error: 'Network error' }));
    throw new Error(error.error || `HTTP ${response.status}`);
  }

  return response.json();
}

/**
 * Call Smart Detect API with product data directly
 */
export async function callSmartDetectWithProduct(product: any): Promise<SmartDetectResult> {
  const response = await fetch('/apiSmartDetect', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({ product }),
  });

  if (!response.ok) {
    const error = await response.json().catch(() => ({ error: 'Network error' }));
    throw new Error(error.error || `HTTP ${response.status}`);
  }

  return response.json();
}