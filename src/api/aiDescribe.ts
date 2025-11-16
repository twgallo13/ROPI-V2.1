/**
 * Enhanced AI Describe API Client with Layout Engine
 */

export interface LayoutBlocks {
  hero?: string;
  features?: string;
  fit?: string;
  techSpecs?: string;
  materials?: string;
  care?: string;
}

export interface AIDescribeResult {
  description: string;
  summary?: string;
  scores?: {
    overall?: number;
    factual?: number;
    tone?: number;
    seo?: number;
    clarity?: number;
  };
  coach?: {
    reasons?: string[];
    actions?: string[];
    next_questions?: string[];
  };
  seo?: {
    meta_title?: string;
    meta_description?: string;
    meta_keywords?: string[];
  };
  used_template?: {
    scope: string;
    key: string;
    version: string;
    conditionsMatched?: string[];
  };
  facts_used?: string[];
  // Layout Engine Results (Phase 3)
  templateKey?: string;
  blocks?: LayoutBlocks;
  html?: string;
  metaName?: string;
  metaDescription?: string;
  slugSuggestion?: string;
}

/**
 * Call Enhanced AI Describe API with layout generation
 */
export async function callAIDescribe(
  productId: string,
  options: {
    tone?: string;
    length?: string;
    temperature?: number;
    overrideTemplateKey?: string;
  } = {}
): Promise<AIDescribeResult> {
  const payload = {
    productId,
    channel: 'RetailOps',
    tone: options.tone || 'Clean',
    length: options.length || 'Medium',
    temperature: options.temperature || 0.6,
    templateOverride: options.overrideTemplateKey || null,
  };

  const response = await fetch('/apiDescribe', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify(payload),
  });

  if (!response.ok) {
    const error = await response.json().catch(() => ({ error: 'Network error' }));
    throw new Error(error.error || `HTTP ${response.status}`);
  }

  return response.json();
}