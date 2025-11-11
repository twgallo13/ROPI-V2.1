import express from 'express';
import { GoogleGenerativeAI } from '@google/generative-ai';
import * as functions from "firebase-functions";

// Read Gemini key from Firebase Functions config first, then env as fallback
const GEMINI_API_KEY =
  (functions.config().gemini && functions.config().gemini.api_key) ||
  process.env.GEMINI_API_KEY;

// Optional: single safe log to confirm presence (not the key value)
console.log("GEMINI_KEY_PRESENT", Boolean(GEMINI_API_KEY));

const app = express();
app.use(express.json());

interface DescribePayload {
  productId: string;
  channel: string;
  tone: string;
  length: string;
  facts?: {
    observations?: string;
    materials?: string;
    fit?: string;
    keywords?: string[];
  };
  aiContext?: {
    keywords?: string[];
    featureBullets?: string[];
    designNotes?: string; // used for "Improve this" input
    priorDraft?: string;  // previous draft paragraph provided by client for rewrite
  };
  attributes?: {
    name?: string;
    brand?: string;
    category?: string;
    fit?: string;
    gender?: string;
    ageGroup?: string;
    sportsTeam?: string;
    league?: string;
    material?: string;
    primaryColor?: string;
    descriptiveColor?: string;
  };
  imageUrl?: string;
  temperature?: number;
}
// Extended strict response schema
interface DescribeResponse {
  description: string;
  scores: {
    overall?: number;
    factual?: number;
    tone?: number;
    seo?: number;
    clarity?: number;
  };
  coach: {
    reasons?: string[];
    actions?: string[];
    next_questions?: string[];
  };
  seo: {
    meta_title?: string;
    meta_description?: string;
    meta_keywords?: string[];
  };
  facts_used: string[];
}

/**
 * Select audience-specific prompt template based on gender and age group
 * Templates: default, mens, womens, gradeSchool, toddler
 */
function selectAudienceTemplate(gender?: string, ageGroup?: string): string {
  if (ageGroup && /Grade[\s-]?School/i.test(ageGroup)) return "gradeSchool";
  if (ageGroup && /Toddler|Infant/i.test(ageGroup)) return "toddler";
  if (gender && /Women/i.test(gender)) return "womens";
  if (gender && /Men/i.test(gender)) return "mens";
  return "default";
}

/**
 * Build dynamic prompt using product attributes and observations
 */
function buildPrompt(payload: DescribePayload): string {
  const {
    attributes = {},
    facts = {},
    aiContext = {},
    tone = 'Clean',
    length = 'Medium',
  } = payload;

  const {
    brand = 'our brand',
    name = 'this product',
    category = 'product',
    fit = 'standard fit',
    gender = 'unisex',
    ageGroup = 'adult',
    sportsTeam,
    league,
    material,
    primaryColor,
    descriptiveColor,
  } = attributes;

  // Select audience-specific template
  const audienceTemplate = selectAudienceTemplate(gender, ageGroup);
  console.log(`[describe] Using audience template: ${audienceTemplate} (gender=${gender}, ageGroup=${ageGroup})`);

  // Build weighted observations summary (HIGH WEIGHT)
  const obsParts: string[] = [];
  if (facts.observations) obsParts.push(`Observations: ${facts.observations}`);
  if (facts.materials) obsParts.push(`Materials: ${facts.materials}`);
  if (facts.fit) obsParts.push(`Fit Notes: ${facts.fit}`);
  const obsSummary = obsParts.join('; ');

  // Collect keywords
  const keywords = [
    ...(facts.keywords || []),
    ...(aiContext.keywords || []),
  ].filter(Boolean);

  // Build feature bullets
  const featureBullets = aiContext.featureBullets || [];

  // Build team/league context
  let teamContext = '';
  if (sportsTeam && league) {
    teamContext = `Team: ${sportsTeam}, League: ${league}`;
  } else if (sportsTeam) {
    teamContext = `Team: ${sportsTeam}`;
  } else if (league) {
    teamContext = `League: ${league}`;
  }

  // Build color context
  let colorContext = '';
  if (descriptiveColor) {
    colorContext = `Color: ${descriptiveColor}`;
  } else if (primaryColor) {
    colorContext = `Color: ${primaryColor}`;
  }

  // Design notes from AI context
  const designNotes = aiContext.designNotes || '';

  // Audience-specific prompt intro
  let audienceGuidance = '';
  if (audienceTemplate === 'mens') {
    audienceGuidance = 'Write for adult male customers. Focus on performance, durability, and practical benefits.';
  } else if (audienceTemplate === 'womens') {
    audienceGuidance = 'Write for adult female customers. Balance style and function, emphasizing versatility and quality.';
  } else if (audienceTemplate === 'gradeSchool') {
    audienceGuidance = 'Write for parents shopping for grade school kids (ages 6-12). Focus on durability, comfort, and age-appropriate style.';
  } else if (audienceTemplate === 'toddler') {
    audienceGuidance = 'Write for parents shopping for toddlers/infants. Emphasize safety, comfort, and ease of care.';
  }

  const priorDraft = aiContext.priorDraft ? `Previous Draft (for rewrite, do NOT append):
${aiContext.priorDraft}
` : '';

  return `You are ROPI AI — an expert retail storyteller for ${brand}.
Your job: REWRITE the product paragraph for ${name} as a single polished paragraph. DO NOT APPEND; produce one refined paragraph only.
Use tone: ${tone}, length: ${length}. ${audienceGuidance}

Product Details:
- Category: ${category}
- Fit: ${fit}
- Audience: ${gender}, Age Group: ${ageGroup}
${teamContext ? `- ${teamContext}` : ''}
${colorContext ? `- ${colorContext}` : ''}
${material ? `- Material: ${material}` : ''}

${obsSummary ? `OBSERVATIONS (HIGH WEIGHT - use verbatim, no hallucinations): ${obsSummary}` : ''}
${keywords.length > 0 ? `KEYWORDS: ${keywords.join(', ')}` : ''}
${featureBullets.length > 0 ? `FEATURES: ${featureBullets.join(', ')}` : ''}
${designNotes ? `IMPROVEMENTS REQUESTED: ${designNotes}` : ''}
${priorDraft}

Hard requirements:
- Rewrite the paragraph; do not append. Output exactly one paragraph.
- Use observation facts verbatim when present; no invented claims.
- Respect tone & length; keep brand/product naming intact (Name is managed in UI).

Output ONLY a strict JSON object in this exact schema (no extra text, no markdown):
{
  "description": "<single rewritten paragraph>",
  "scores": {
    "overall": 0,
    "factual": 0,
    "tone": 0,
    "seo": 0,
    "clarity": 0
  },
  "coach": {
    "reasons": ["..."],
    "actions": ["..."],
    "next_questions": ["..."]
  },
  "seo": {
    "meta_title": "<= 60 chars",
    "meta_description": "<= 155 chars",
    "meta_keywords": ["lowercase", "5-8", "from attributes & observations"]
  },
  "facts_used": ["fit", "observations:heel_height", "materials"]
}`;
}

/**
 * Parse JSON response from Gemini, with fallback
 */
function parseGeminiResponse(text: string): DescribeResponse | null {
  try {
    // Strict JSON only; optionally strip markdown fences if present
    const jsonMatch = text.match(/```(?:json)?\s*(\{[\s\S]*\})\s*```/);
    const jsonText = (jsonMatch ? jsonMatch[1] : text).trim();

    const parsed = JSON.parse(jsonText);
    const scores = parsed.scores || {};
    const coach = parsed.coach || {};
    const seo = parsed.seo || {};
    const facts_used = Array.isArray(parsed.facts_used) ? parsed.facts_used : [];

    // Safe fallbacks
    return {
      description: typeof parsed.description === 'string' ? parsed.description : '',
      scores: {
        overall: typeof scores.overall === 'number' ? scores.overall : undefined,
        factual: typeof scores.factual === 'number' ? scores.factual : undefined,
        tone: typeof scores.tone === 'number' ? scores.tone : undefined,
        seo: typeof scores.seo === 'number' ? scores.seo : undefined,
        clarity: typeof scores.clarity === 'number' ? scores.clarity : undefined,
      },
      coach: {
        reasons: Array.isArray(coach.reasons) ? coach.reasons : [],
        actions: Array.isArray(coach.actions) ? coach.actions : [],
        next_questions: Array.isArray(coach.next_questions) ? coach.next_questions : [],
      },
      seo: {
        meta_title: typeof seo.meta_title === 'string' ? seo.meta_title : undefined,
        meta_description: typeof seo.meta_description === 'string' ? seo.meta_description : undefined,
        meta_keywords: Array.isArray(seo.meta_keywords) ? seo.meta_keywords : undefined,
      },
      facts_used,
    };
  } catch (e) {
    console.error('[describe] JSON parse failed', e);
    return null;
  }
}

app.post('*', async (req, res) => {
  const payload = req.body as DescribePayload;
  const { productId } = payload;
  
  if (!productId) {
    return res.status(400).json({ error: 'productId required' });
  }

  // If no API key, return clear error
  if (!GEMINI_API_KEY) {
    return res.status(500).json({ error: "Missing Gemini API key" });
  }

  try {
    const genAI = new GoogleGenerativeAI(GEMINI_API_KEY);
    const model = genAI.getGenerativeModel({ 
      model: 'gemini-2.0-flash',
      generationConfig: {
        temperature: payload.temperature ?? 0.6,
        maxOutputTokens: 800,
      },
    });

    const prompt = buildPrompt(payload);
    const result = await model.generateContent(prompt);
    const text = result.response.text();

    const parsed = parseGeminiResponse(text);
    if (!parsed || !parsed.description) {
      return res.status(502).json({ error: 'AI returned invalid JSON' });
    }

    // If server overall not provided, compute client can still compute; return as-is
    res.json(parsed);
  } catch (error: any) {
    console.error('[describe] Gemini error:', error);
    res.status(500).json({ 
      error: 'Generation failed',
      message: error.message,
    });
  }
});

// keep a simple GET for health checks
app.get('*', (_req, res) => {
  res.json({ ok: true, route: 'describe', message: 'Describe (Gemini) endpoint ready' });
});

export default app;
