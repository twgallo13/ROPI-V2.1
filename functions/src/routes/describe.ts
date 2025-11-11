import express from 'express';
import { GoogleGenerativeAI } from '@google/generative-ai';

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

  // Build weighted observations summary
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

  return `You are ROPI AI — an expert retail storyteller for ${brand}.
Create a product description for ${name}.
Use tone: ${tone}, length: ${length}.

Base it on:
- Category: ${category}
- Fit: ${fit}
- Audience: ${gender}, Age Group: ${ageGroup}
${teamContext ? `- ${teamContext}` : ''}
${colorContext ? `- ${colorContext}` : ''}
${material ? `- Material: ${material}` : ''}
${obsSummary ? `- ${obsSummary}` : ''}
${keywords.length > 0 ? `- Material/Performance Keywords: ${keywords.join(', ')}` : ''}
${featureBullets.length > 0 ? `- Features: ${featureBullets.join(', ')}` : ''}
${designNotes ? `- Design Notes: ${designNotes}` : ''}

Optimize for clarity, SEO, and emotional resonance.
Output 1 paragraph of clean, customer-first copy.

IMPORTANT: Respond with ONLY a valid JSON object in this exact format:
{
  "description": "Your generated product description paragraph here...",
  "seo_score": 9,
  "tone_score": 8,
  "facts_used": ["fit", "team", "league", "materials"]
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

  const apiKey = process.env.GEMINI_API_KEY;
  
  // If no API key, return mock response
  if (!apiKey) {
    const mockResponse: DescribeResponse = {
      description: `Premium ${payload.attributes?.name || 'product'} by ${payload.attributes?.brand || 'brand'} offers exceptional comfort and style. Perfect for ${payload.attributes?.gender || 'everyone'}, this ${payload.attributes?.category || 'item'} features quality materials and reliable performance for everyday wear.`,
      seo_score: 8,
      tone_score: 7,
      facts_used: ['brand', 'category', 'gender'],
    };
    return res.json(mockResponse);
  }

  try {
    const genAI = new GoogleGenerativeAI(apiKey);
    const model = genAI.getGenerativeModel({ 
      model: 'gemini-1.5-flash',
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
