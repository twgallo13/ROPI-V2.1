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
    designNotes?: string;
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

interface DescribeResponse {
  description: string;
  seo_score: number;
  tone_score: number;
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

  return `You are ROPI AI — an expert retail storyteller for ${brand}.
Create a product description for ${name}.
Use tone: ${tone}, length: ${length}.
${audienceGuidance}

Product Details:
- Category: ${category}
- Fit: ${fit}
- Audience: ${gender}, Age Group: ${ageGroup}
${teamContext ? `- ${teamContext}` : ''}
${colorContext ? `- ${colorContext}` : ''}
${material ? `- Material: ${material}` : ''}

${obsSummary ? `**Observations (HIGH WEIGHT - Use these facts verbatim):**
${obsSummary}
` : ''}
${keywords.length > 0 ? `- Keywords: ${keywords.join(', ')}` : ''}
${featureBullets.length > 0 ? `- Features: ${featureBullets.join(', ')}` : ''}
${designNotes ? `- Design Notes: ${designNotes}` : ''}

CRITICAL RULES:
- Use observation facts verbatim when present
- Never invent performance claims
- Prioritize observations over generic descriptions
- Match the specified tone and length

IMPORTANT: Respond with ONLY a valid JSON object in this exact format:
{
  "description": "Your generated product description paragraph here...",
  "seo_score": 9,
  "tone_score": 8,
  "facts_used": ["fit", "observations", "materials"]
}

Do not include any text before or after the JSON object.`;
}

/**
 * Parse JSON response from Gemini, with fallback
 */
function parseGeminiResponse(text: string): DescribeResponse {
  try {
    // Try to extract JSON from markdown code blocks if present
    const jsonMatch = text.match(/```(?:json)?\s*(\{[\s\S]*\})\s*```/);
    const jsonText = jsonMatch ? jsonMatch[1] : text.trim();
    
    const parsed = JSON.parse(jsonText);
    
    return {
      description: parsed.description || text,
      seo_score: parsed.seo_score || 7,
      tone_score: parsed.tone_score || 7,
      facts_used: Array.isArray(parsed.facts_used) ? parsed.facts_used : [],
    };
  } catch {
    // Fallback: treat entire response as description
    return {
      description: text.trim(),
      seo_score: 7,
      tone_score: 7,
      facts_used: [],
    };
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
        maxOutputTokens: 500,
      },
    });

    const prompt = buildPrompt(payload);
    const result = await model.generateContent(prompt);
    const text = result.response.text();
    
    const parsed = parseGeminiResponse(text);
    
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
