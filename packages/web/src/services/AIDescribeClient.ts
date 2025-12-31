/**
 * AIDescribeClient Service
 * 
 * LP-obs-studio-cleanup-1.6.5: Client-side service for AI describe/suggestions API.
 * Orchestrates multi-target describe calls and manages aggregated candidate generation.
 * 
 * Features:
 * - Multi-target describe requests
 * - Aggregated observations per target
 * - SEO generation per target
 * - Backward compatible with aggregate=false mode
 * 
 * References:
 * - Product Completion Workflows (W2): https://www.notion.so/2ba45ee1ec5a80698690f9492961ed8b
 */

import { getAuthHeaders } from '../lib/authHeaders';

const API_BASE = import.meta.env.VITE_API_BASE_URL || '';

// ============================================
// Types
// ============================================

export interface ObservationInput {
  id: string;
  tags: string[];
  text?: string;
}

export interface ImageInput {
  thumb?: string;
  url: string;
}

export interface DescribeRequestOptions {
  /** Number of candidates to generate per target (default: 3) */
  candidates?: number;
  /** Use aggregated mode (default: true). Set false for legacy per-observation behavior */
  aggregate?: boolean;
}

export interface DescribeRequest {
  /** Target website IDs */
  targets: string[];
  /** Audience template name */
  audience: string;
  /** Tone preset */
  tone: string;
  /** Observations with tags */
  observations: ObservationInput[];
  /** Product attributes */
  attributes: Record<string, unknown>;
  /** Product images */
  images?: ImageInput[];
  /** Generation options */
  options?: DescribeRequestOptions;
}

export interface CandidateMeta {
  observationsCount: number;
  tagsCount: number;
}

export interface Candidate {
  id: string;
  text: string;
  meta: CandidateMeta;
}

export interface SEOData {
  title: string;
  bullets: string[];
}

export interface ContributingObservation {
  id: string;
  text: string;
  tags: string[];
}

export interface TargetResult {
  target: string;
  candidates: Candidate[];
  seo?: SEOData;
  meta: {
    observationsCount: number;
    tagsCount: number;
  };
  contributingObservations?: ContributingObservation[];
}

export interface DescribeResponse {
  results: TargetResult[];
}

export interface SuggestionsRequest {
  targets: string[];
  observations: ObservationInput[];
  attributes: Record<string, unknown>;
  options?: {
    aggregate?: boolean;
  };
}

export interface Suggestion {
  id: string;
  target: string;
  attributeId: string;
  currentValue: unknown;
  suggestedValue: unknown;
  confidence: number;
  rationale: string;
}

export interface SuggestionsResponse {
  results: Array<{
    target: string;
    suggestions: Suggestion[];
    meta: {
      observationsCount: number;
      tagsCount: number;
    };
  }>;
}

export interface ApplyRequest {
  target: string;
  action: 'description' | 'seo' | 'attribute';
  payload: {
    candidateId?: string;
    text?: string;
    seo?: SEOData;
    attributeId?: string;
    value?: unknown;
  };
}

export interface ApplyResponse {
  success: boolean;
  productId: string;
  target: string;
  appliedAt: string;
  appliedBy: string;
}

// ============================================
// AIDescribeClient Class
// ============================================

class AIDescribeClient {
  private baseUrl: string;

  constructor(baseUrl: string = API_BASE) {
    this.baseUrl = baseUrl;
  }

  /**
   * Generate descriptions for multiple targets using aggregated observations.
   * 
   * LP-obs-studio-cleanup-1.6.5: New aggregated endpoint.
   * Returns one result per target with candidates and SEO.
   */
  async describe(
    productId: string,
    request: DescribeRequest
  ): Promise<DescribeResponse> {
    const headers = await getAuthHeaders();
    
    const response = await fetch(
      `${this.baseUrl}/api/products/${productId}/describe`,
      {
        method: 'POST',
        headers,
        body: JSON.stringify(request),
      }
    );

    if (!response.ok) {
      const errorData = await response.json().catch(() => ({}));
      throw new Error(errorData.message || `Describe failed: ${response.status}`);
    }

    return response.json();
  }

  /**
   * Generate suggestions for multiple targets using aggregated observations.
   * 
   * LP-obs-studio-cleanup-1.6.5: Multi-target suggestions.
   */
  async suggestions(
    productId: string,
    request: SuggestionsRequest
  ): Promise<SuggestionsResponse> {
    const headers = await getAuthHeaders();
    
    const response = await fetch(
      `${this.baseUrl}/api/products/${productId}/suggestions`,
      {
        method: 'POST',
        headers,
        body: JSON.stringify(request),
      }
    );

    if (!response.ok) {
      const errorData = await response.json().catch(() => ({}));
      throw new Error(errorData.message || `Suggestions failed: ${response.status}`);
    }

    return response.json();
  }

  /**
   * Apply a candidate or SEO to the product for a specific target.
   * 
   * LP-obs-studio-cleanup-1.6.5: Target-scoped apply with audit logging.
   */
  async apply(
    productId: string,
    request: ApplyRequest
  ): Promise<ApplyResponse> {
    const headers = await getAuthHeaders();
    
    const response = await fetch(
      `${this.baseUrl}/api/products/${productId}/apply`,
      {
        method: 'POST',
        headers,
        body: JSON.stringify(request),
      }
    );

    if (!response.ok) {
      const errorData = await response.json().catch(() => ({}));
      throw new Error(errorData.message || `Apply failed: ${response.status}`);
    }

    return response.json();
  }

  /**
   * Legacy single-target describe (for backward compatibility).
   * Uses aggregate=false mode.
   */
  async describeLegacy(
    productId: string,
    target: string,
    audience: string,
    tone: string,
    attributes: Record<string, unknown>
  ): Promise<TargetResult> {
    const request: DescribeRequest = {
      targets: [target],
      audience,
      tone,
      observations: [],
      attributes,
      options: { aggregate: false },
    };

    const response = await this.describe(productId, request);
    return response.results[0];
  }
}

// ============================================
// Singleton Instance
// ============================================

export const aiDescribeClient = new AIDescribeClient();

// ============================================
// Helper Functions
// ============================================

/**
 * Aggregate observations by collecting unique tags across all observations.
 */
export function aggregateObservations(
  observations: Array<{ id: string; text?: string; tags?: string[] }>
): { uniqueTags: string[]; totalCount: number; observationInputs: ObservationInput[] } {
  const uniqueTags = new Set<string>();
  const observationInputs: ObservationInput[] = [];

  for (const obs of observations) {
    const tags = obs.tags || [];
    tags.forEach(tag => uniqueTags.add(tag));
    observationInputs.push({
      id: obs.id,
      tags,
      text: obs.text,
    });
  }

  return {
    uniqueTags: Array.from(uniqueTags),
    totalCount: observations.length,
    observationInputs,
  };
}

/**
 * Get default targets for a product (can be customized based on product data).
 */
export function getDefaultTargets(): string[] {
  return ['shiekh.com', 'karmaloop', 'mltd'];
}

/**
 * Format target name for display.
 */
export function formatTargetName(target: string): string {
  const displayNames: Record<string, string> = {
    'shiekh.com': 'Shiekh',
    'shiekh': 'Shiekh',
    'karmaloop': 'Karmaloop',
    'karmaloop.com': 'Karmaloop',
    'mltd': 'MLTD',
    'mltd.com': 'MLTD',
  };
  return displayNames[target.toLowerCase()] || target;
}

export default aiDescribeClient;
