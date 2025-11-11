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
    primaryColor?: string;
    descriptiveColor?: string;
    cutType?: string;
    closureType?: string;
    heelHeight?: string;
    platformHeight?: string;
    status?: string;
    websites?: string[];
    price?: number;
  };
  imageUrl?: string;
  temperature?: number;   // 0.0-1.0, default 0.6 for balanced creativity
}

export interface DescribeProductResponse {
  description: string;
  seo_score: number;
  tone_score: number;
  facts_used: string[];
  // Legacy fields for backward compatibility
  text?: string;
  title?: string;
  bullets?: string[];
  seoTitle?: string;
  metaDescription?: string;
  keywords?: string[];
}

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
    
    // Handle both new structured format and legacy format
    if (data.description) {
      return {
        ...data,
        // Add legacy field for backward compatibility
        text: data.description,
      };
    } else if (data.text) {
      // Legacy format - convert to new format
      return {
        description: data.text,
        seo_score: 7,
        tone_score: 7,
        facts_used: [],
        ...data,
      };
    }
    
    return data;
  };

  // Primary via Hosting rewrite, fallback to CF URL
  try {
    return await tryFetch('/api/describe');
  } catch {
    return await tryFetch('https://us-central1-ropi-bccee.cloudfunctions.net/apiDescribe');
  }
}
