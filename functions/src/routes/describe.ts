import express from 'express';
import { GoogleGenerativeAI } from '@google/generative-ai';
import * as functions from "firebase-functions";
import * as admin from 'firebase-admin';

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
    materials?: string[]; // multi-select from vocab
    primaryColor?: string;
    descriptiveColor?: string; // free-text manufacturer color
    styleId?: string | null; // Link related colorways
    launchDate?: string | null; // Scheduled release date
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
  used_template?: { scope: string; key: string; version: string };
}

/**
 * Load audience template from Firestore
 * Falls back to hard-coded template if Firestore doc doesn't exist
 */
async function loadAudienceTemplate(templateKey: string): Promise<any> {
  try {
    const db = admin.firestore();
    const templateDoc = await db
      .collection('settings')
      .doc('ai')
      .collection('prompts')
      .doc(templateKey)
      .get();

    if (templateDoc.exists) {
      const data = templateDoc.data();
      console.log(`[describe] Loaded template from Firestore: ${templateKey} v${data?.version}`);
      return data;
    } else {
      console.warn(`[describe] Template ${templateKey} not found in Firestore, using fallback`);
      return null;
    }
  } catch (error) {
    console.error(`[describe] Failed to load template ${templateKey}:`, error);
    return null;
  }
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
 * Now uses Firestore template if available, otherwise falls back to hard-coded prompt
 */
async function buildPrompt(payload: DescribePayload, templateData?: any): Promise<string> {
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
    materials = [],
    primaryColor,
    descriptiveColor,
    styleId,
    launchDate,
  } = attributes;

  // Select audience-specific template
  const audienceTemplate = selectAudienceTemplate(gender, ageGroup);
  console.log(`[describe] Using audience template: ${audienceTemplate} (gender=${gender}, ageGroup=${ageGroup})`);

  // Check if launch date is within 14 days (allow subtle "new" cue)
  let isNewLaunch = false;
  if (launchDate) {
    try {
      const launch = new Date(launchDate);
      const now = new Date();
      const daysDiff = Math.floor((launch.getTime() - now.getTime()) / (1000 * 60 * 60 * 24));
      isNewLaunch = daysDiff >= -14 && daysDiff <= 14; // Within 14 days before or after
      console.log(`[describe] Launch date ${launchDate}: ${daysDiff} days difference, isNewLaunch=${isNewLaunch}`);
    } catch (e) {
      console.warn('[describe] Failed to parse launch date:', launchDate, e);
    }
  }

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
    colorContext = `Descriptive Color (brand story context): ${descriptiveColor}`;
  } else if (primaryColor) {
    colorContext = `Primary Color: ${primaryColor}`;
  }

  // Build materials context (HIGH WEIGHT)
  const materialsContext = materials.length > 0 ? `Materials (use verbatim): ${materials.join(', ')}` : '';

  // Design notes from AI context
  const designNotes = aiContext.designNotes || '';

  const priorDraft = aiContext.priorDraft ? `Previous Draft (for rewrite, do NOT append):
${aiContext.priorDraft}
` : '';

  // If template data exists, use it; otherwise use fallback
  if (templateData && templateData.prompt_body) {
    // Use Firestore template with simple variable substitution
    let prompt = templateData.prompt_body;
    
    // Replace variables (simplified Handlebars-style)
    prompt = prompt
      .replace(/\{\{brand\}\}/g, brand)
      .replace(/\{\{name\}\}/g, name)
      .replace(/\{\{category\}\}/g, category)
      .replace(/\{\{fit\}\}/g, fit)
      .replace(/\{\{gender\}\}/g, gender)
      .replace(/\{\{ageGroup\}\}/g, ageGroup)
      .replace(/\{\{tone\}\}/g, tone)
      .replace(/\{\{length\}\}/g, length)
      .replace(/\{\{material\}\}/g, material || '');

    // Handle conditionals
    prompt = prompt.replace(/\{\{#if teamContext\}\}(.*?)\{\{\/if\}\}/gs, teamContext ? '$1' : '');
    prompt = prompt.replace(/\{\{#if colorContext\}\}(.*?)\{\{\/if\}\}/gs, colorContext ? '$1' : '');
    prompt = prompt.replace(/\{\{#if materialsContext\}\}(.*?)\{\{\/if\}\}/gs, materialsContext ? '$1' : '');
    prompt = prompt.replace(/\{\{#if isNewLaunch\}\}(.*?)\{\{\/if\}\}/gs, isNewLaunch ? '$1' : '');
    prompt = prompt.replace(/\{\{#if obsSummary\}\}(.*?)\{\{\/if\}\}/gs, obsSummary ? '$1' : '');
    prompt = prompt.replace(/\{\{#if keywords\}\}(.*?)\{\{\/if\}\}/gs, keywords.length > 0 ? '$1' : '');
    prompt = prompt.replace(/\{\{#if featureBullets\}\}(.*?)\{\{\/if\}\}/gs, featureBullets.length > 0 ? '$1' : '');
    prompt = prompt.replace(/\{\{#if designNotes\}\}(.*?)\{\{\/if\}\}/gs, designNotes ? '$1' : '');
    prompt = prompt.replace(/\{\{#if priorDraft\}\}(.*?)\{\{\/if\}\}/gs, priorDraft ? '$1' : '');

    // Replace variable contents
    prompt = prompt.replace(/\{\{teamContext\}\}/g, teamContext);
    prompt = prompt.replace(/\{\{colorContext\}\}/g, colorContext);
    prompt = prompt.replace(/\{\{materialsContext\}\}/g, materialsContext);
    prompt = prompt.replace(/\{\{obsSummary\}\}/g, obsSummary);
    prompt = prompt.replace(/\{\{keywords\}\}/g, keywords.join(', '));
    prompt = prompt.replace(/\{\{featureBullets\}\}/g, featureBullets.join(', '));
    prompt = prompt.replace(/\{\{designNotes\}\}/g, designNotes);
    prompt = prompt.replace(/\{\{priorDraft\}\}/g, priorDraft);

    // Add hard requirements and JSON schema (always append these)
    const hardRequirements = `

Hard requirements:
- Rewrite the paragraph; do not append. Output exactly one paragraph.
- Use observation facts verbatim when present; no invented claims.
- Use materials exactly as provided where relevant; no inventions.
- Descriptive color can appear once for style/branding, not as a filter.
- Respect tone & length; keep brand/product naming intact (Name is managed in UI).
${templateData.seo_rules ? `- ${templateData.seo_rules}` : '- In SEO meta_keywords: prefer 1-2 materials and 1 descriptive color token if present.'}
${templateData.tone_rules ? `- ${templateData.tone_rules}` : ''}
${templateData.banned_terms && Array.isArray(templateData.banned_terms) && templateData.banned_terms.length > 0 ? `- Banned terms: ${templateData.banned_terms.join(', ')}` : ''}

Output ONLY a strict JSON object in this exact schema (no extra text, no markdown):
{
  "description": "<single rewritten paragraph>",
  "scores": {
    "overall": <number 0-10, rate the overall quality>,
    "factual": <number 0-10, accuracy and use of provided facts>,
    "tone": <number 0-10, matches requested tone and audience>,
    "seo": <number 0-10, keyword optimization and meta readiness>,
    "clarity": <number 0-10, readability and customer clarity>
  },
  "coach": {
    "reasons": ["<why this score>", "..."],
    "actions": ["<specific improvement to reach 10>", "..."],
    "next_questions": ["<clarifying question>", "..."]
  },
  "seo": {
    "meta_title": "<= 60 chars>",
    "meta_description": "<= 155 chars>",
    "meta_keywords": ["lowercase", "5-8", "from attributes & observations"]
  },
  "facts_used": ["fit", "observations:heel_height", "materials"]
}`;

    return prompt + hardRequirements;
  }

  // Fallback to hard-coded prompt if no template data
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

  return `You are ROPI AI — an expert retail storyteller for ${brand}.
Your job: REWRITE the product paragraph for ${name} as a single polished paragraph. DO NOT APPEND; produce one refined paragraph only.
Use tone: ${tone}, length: ${length}. ${audienceGuidance}

Product Details:
- Category: ${category}
- Fit: ${fit}
- Audience: ${gender}, Age Group: ${ageGroup}
${teamContext ? `- ${teamContext}` : ''}
${colorContext ? `- ${colorContext}` : ''}
${materialsContext ? `- ${materialsContext}` : ''}
${material ? `- Legacy Material: ${material}` : ''}
${isNewLaunch ? '- FRESHNESS CUE: This is a new or upcoming release. You may subtly convey newness (e.g., "just in", "new arrival") without revealing exact dates.' : ''}

${obsSummary ? `OBSERVATIONS (HIGH WEIGHT - use verbatim, no hallucinations): ${obsSummary}` : ''}
${keywords.length > 0 ? `KEYWORDS: ${keywords.join(', ')}` : ''}
${featureBullets.length > 0 ? `FEATURES: ${featureBullets.join(', ')}` : ''}
${designNotes ? `IMPROVEMENTS REQUESTED: ${designNotes}` : ''}
${priorDraft}

Hard requirements:
- Rewrite the paragraph; do not append. Output exactly one paragraph.
- Use observation facts verbatim when present; no invented claims.
- Use materials exactly as provided where relevant; no inventions.
- Descriptive color can appear once for style/branding, not as a filter.
- Respect tone & length; keep brand/product naming intact (Name is managed in UI).
- In SEO meta_keywords: prefer 1-2 materials and 1 descriptive color token if present.
- Never duplicate brand more than once in meta_title or meta_description.

Output ONLY a strict JSON object in this exact schema (no extra text, no markdown):
{
  "description": "<single rewritten paragraph>",
  "scores": {
    "overall": <number 0-10, rate the overall quality>,
    "factual": <number 0-10, accuracy and use of provided facts>,
    "tone": <number 0-10, matches requested tone and audience>,
    "seo": <number 0-10, keyword optimization and meta readiness>,
    "clarity": <number 0-10, readability and customer clarity>
  },
  "coach": {
    "reasons": ["<why this score>", "..."],
    "actions": ["<specific improvement to reach 10>", "..."],
    "next_questions": ["<clarifying question>", "..."]
  },
  "seo": {
    "meta_title": "<= 60 chars>",
    "meta_description": "<= 155 chars>",
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
    // Determine which template to use
    const templateKey = selectAudienceTemplate(payload.attributes?.gender, payload.attributes?.ageGroup);
    
    // Load template from Firestore
    const templateData = await loadAudienceTemplate(templateKey);
    
    const genAI = new GoogleGenerativeAI(GEMINI_API_KEY);
    const model = genAI.getGenerativeModel({ 
      model: 'gemini-2.0-flash',
      generationConfig: {
        temperature: payload.temperature ?? 0.6,
        maxOutputTokens: 800,
      },
    });

    const prompt = await buildPrompt(payload, templateData);
    const result = await model.generateContent(prompt);
    const text = result.response.text();

    const parsed = parseGeminiResponse(text);
    if (!parsed || !parsed.description) {
      return res.status(502).json({ error: 'AI returned invalid JSON' });
    }
    
    // Build response with template metadata
    const response = {
      description: parsed.description,
      scores: parsed.scores,
      coach: parsed.coach,
      seo: parsed.seo,
      used_template: {
        scope: 'audience',
        key: templateKey,
        version: templateData?.version || 'fallback',
      },
      facts_used: parsed.facts_used || [],
    };
    
    // Debug log for monitoring
    console.log("[apiDescribe] used_template:", response.used_template, "scores:", response?.scores);
    
    res.status(200).json(response);
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
