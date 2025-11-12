export interface DescribeProductPayload {
  productId: string;
  channel: string;        // RetailOps | Shopify | PDP
  tone: string;           // Clean | Hype | Technical
  length: string;         // Short | Medium | Long
  facts?: {
    observations?: string;
    materials?: string;
    fit?: string;
    keywords?: string[];
  };
  aiContext?: {
    keywords?: string[];
    featureBullets?: string[];
    designNotes?: string;
    priorDraft?: string; // previous draft to guide rewrite (not append)
  };
  attributes?: {
    name?: string;
    brand?: string;
    mpn?: string;
    department?: string;
    class?: string;
    category?: string;
    fit?: string;
    gender?: string;
    ageGroup?: string;
    sportsTeam?: string;
    league?: string;
    material?: string;
    materials?: string[]; // multi-select from vocab
    primaryColor?: string;
    descriptiveColor?: string; // free-text manufacturer color
    cutType?: string;
    closureType?: string;
    heelHeight?: string;
    platformHeight?: string;
    status?: string;
    websites?: string[];
    price?: number;
    styleId?: string | null; // Link related colorways
    launchDate?: string | Date | null; // Scheduled release date
  };
  imageUrl?: string;
  temperature?: number;   // 0.0-1.0, default 0.6 for balanced creativity
}

// Extended AI scoring & coaching types
export type AIScores = {
  overall?: number; factual?: number; tone?: number; seo?: number; clarity?: number
};
export type AICoach = {
  reasons?: string[]; actions?: string[]; next_questions?: string[]
};
export type AISEO = {
  meta_title?: string; meta_description?: string; meta_keywords?: string[]
};

export interface DescribeProductResponse {
  description: string;
  scores?: AIScores;
  coach?: AICoach;
  seo?: AISEO;
  facts_used?: string[];
  used_template?: string;
  // Legacy fields for backward compatibility
  seo_score?: number;
  tone_score?: number;
  text?: string;
  title?: string;
  bullets?: string[];
  seoTitle?: string;
  metaDescription?: string;
  keywords?: string[];
}

// Backward-compatible alias to match spec naming
export type DescribeProductResult = DescribeProductResponse;

/**
 * Normalize vocabulary terms before sending to AI
 * Replaces common variations with standardized terms
 */
function normalizeVocabTerms(payload: DescribeProductPayload, vocabMap?: Record<string, string>): DescribeProductPayload {
  if (!vocabMap) {
    // Default normalizations if no vocab map provided
    vocabMap = {
      'Mens': "Men's",
      'Womens': "Women's",
      'Kids': "Kid's",
      'True to Size': 'fits true to size',
      'TTS': 'fits true to size',
      'Athletic Fit': 'athletic fit',
      'Relaxed Fit': 'relaxed fit',
      'Slim Fit': 'slim fit',
    };
  }

  const normalized = { ...payload };

  // Normalize gender
  if (normalized.attributes?.gender && vocabMap[normalized.attributes.gender]) {
    normalized.attributes.gender = vocabMap[normalized.attributes.gender];
  }

  // Normalize fit
  if (normalized.attributes?.fit && vocabMap[normalized.attributes.fit]) {
    normalized.attributes.fit = vocabMap[normalized.attributes.fit];
  }

  // Normalize keywords
  if (normalized.aiContext?.keywords) {
    normalized.aiContext.keywords = normalized.aiContext.keywords.map(
      keyword => vocabMap?.[keyword] || keyword
    );
  }

  if (normalized.facts?.keywords) {
    normalized.facts.keywords = normalized.facts.keywords.map(
      keyword => vocabMap?.[keyword] || keyword
    );
  }

  return normalized;
}

export async function describeProduct(
  payload: DescribeProductPayload,
  vocabMap?: Record<string, string>
): Promise<DescribeProductResponse> {
  const controller = new AbortController();
  const id = setTimeout(() => controller.abort(), 15000); // Increased timeout for AI generation

  // Normalize vocabulary terms
  const normalizedPayload = normalizeVocabTerms(payload, vocabMap);

  const tryFetch = async (url: string) => {
    const res = await fetch(url, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(normalizedPayload),
      signal: controller.signal
    });
    clearTimeout(id);
    const ct = res.headers.get('content-type') || '';
    if (!res.ok || !ct.includes('application/json')) {
      throw new Error(`Describe failed: ${res.status}`);
    }
    const data = await res.json();

    // If new schema present
    if (data.description && (data.scores || data.coach || data.seo)) {
      // Compute fallback overall if missing
      if (!data.scores?.overall && data.scores) {
        const { factual = 0, tone = 0, seo = 0, clarity = 0 } = data.scores;
        const weighted = Math.round(0.4 * factual + 0.3 * tone + 0.2 * seo + 0.1 * clarity);
        data.scores.overall = weighted;
      }
      return { ...data, text: data.description } as DescribeProductResponse;
    }

    // Legacy pathway
    if (data.description && (data.seo_score || data.tone_score)) {
      return {
        description: data.description,
        facts_used: Array.isArray(data.facts_used) ? data.facts_used : [],
        scores: {
          tone: data.tone_score,
          seo: data.seo_score,
          overall: Math.round(((data.seo_score ?? 7) + (data.tone_score ?? 7)) / 2),
        },
        text: data.description,
      };
    }

    if (data.text) {
      return {
        description: data.text,
        facts_used: [],
        scores: { overall: 7, tone: 7, seo: 7 },
        text: data.text,
      };
    }

    // Unknown format fallback
    return {
      description: '',
      facts_used: [],
      scores: { overall: 7 },
      text: '',
    };
  };

  // Primary via Hosting rewrite, fallback to CF URL
  try {
    return await tryFetch('/api/describe');
  } catch {
    return await tryFetch('https://us-central1-ropi-bccee.cloudfunctions.net/apiDescribe');
  }
}
