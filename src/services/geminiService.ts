import { collection, doc, getDoc } from 'firebase/firestore';
import { db } from '../firebase';
import type { Product } from '../types';

export interface GeminiGenerationResult {
  title: string;
  bullets: string[];
  seo: string;
  paragraphDraft: string;
  score: { overall: number; tone: number; seo: number };
}

interface GenerateOptions {
  product: Product;
  variantIndex?: number; // optional variant context
}

// Fetch AI config from Firestore: settings/ai
async function loadAIConfig(): Promise<{ model: string; temperature: number; tone?: string }> {
  try {
    const snap = await getDoc(doc(db, 'settings', 'ai'));
    if (snap.exists()) {
      const data = snap.data() as any;
      return {
        model: data.model || 'gemini-1.5-flash',
        temperature: typeof data.temperature === 'number' ? data.temperature : 0.4,
        tone: data.tone || 'neutral',
      };
    }
  } catch (e) {
    console.warn('[gemini] failed to load AI settings; using defaults', e);
  }
  return { model: 'gemini-1.5-flash', temperature: 0.4, tone: 'neutral' };
}

function selectAudienceId(gender?: string, ageGroup?: string): 'default' | 'mens' | 'womens' | 'gradeSchool' | 'toddler' {
  if (ageGroup && /Grade-?School/i.test(ageGroup)) return 'gradeSchool';
  if (ageGroup && /Toddler|Infant/i.test(ageGroup)) return 'toddler';
  if (gender && /Women/i.test(gender)) return 'womens';
  if (gender && /Men/i.test(gender)) return 'mens';
  return 'default';
}

// Fetch prompt template from Firestore subcollection: /settings/ai/prompts/{audienceId}
async function loadPromptTemplate(audienceId: string): Promise<string> {
  try {
    const col = collection(db, 'settings', 'ai', 'prompts');
    const snap = await getDoc(doc(col, audienceId));
    if (snap.exists()) {
      const data = snap.data() as any;
      if (data.template) return data.template as string;
    }
  } catch (e) {
    console.warn('[gemini] failed to load prompt template; using fallback', e);
  }
  return `You are an expert retail copywriter. Write compelling product copy.\nTitle: {{title}}\nBrand: {{brand}}\nKeywords: {{keywords}}\nFeatures: {{features}}\nVariant: {{variant}}\nTone: {{tone}}`; // fallback
}

// Lightweight Gemini client wrapper. If API key not present, returns a mock result.
export async function generateProductMarketing(opts: GenerateOptions): Promise<GeminiGenerationResult> {
  const { product, variantIndex } = opts;
  const config = await loadAIConfig();
  const audience = selectAudienceId(product.gender, (product as any).ageGroup);
  const template = await loadPromptTemplate(audience);
  const apiKey = (import.meta as any).env?.VITE_GEMINI_API_KEY;

  // Build context values
  const keywords = product.aiContext?.keywords || [];
  const features = product.aiContext?.featureBullets || [];
  const variant = variantIndex != null && product.variants[variantIndex]
    ? `${product.variants[variantIndex].color} / ${product.variants[variantIndex].size}`
    : 'N/A';

  const filledPrompt = template
    .replace(/{{title}}/g, product.name || '')
    .replace(/{{brand}}/g, product.brand || '')
    .replace(/{{keywords}}/g, keywords.join(', '))
    .replace(/{{features}}/g, features.join('; '))
    .replace(/{{variant}}/g, variant)
    .replace(/{{tone}}/g, config.tone || 'neutral');

  // If no API key, return mock result preserving structure
  if (!apiKey) {
    return mockFallbackResult(product, filledPrompt);
  }

  // Dynamic import to avoid bundling if unused
  try {
    const { GoogleGenerativeAI } = await import('@google/generative-ai');
    const client = new GoogleGenerativeAI(apiKey);
    const model = client.getGenerativeModel({ model: config.model, generationConfig: { temperature: config.temperature } });
    const result = await model.generateContent(filledPrompt);
    // Basic parsing: use text response split into sentences
    const text = result.response.text() || '';
    const sentences = text.split(/(?:\.|\n)/).map(s => s.trim()).filter(Boolean);

    return {
      title: sentences[0] || product.name || 'Generated Title',
      bullets: sentences.slice(1, 4),
      seo: sentences.slice(4, 6).join(' ').slice(0, 160),
      paragraphDraft: text,
      score: heuristicScore(text),
    };
  } catch (e) {
    console.error('[gemini] generation failed, falling back to mock', e);
    return mockFallbackResult(product, filledPrompt);
  }
}

function mockFallbackResult(product: Product, prompt: string): GeminiGenerationResult {
  return {
    title: `${product.brand} ${product.name}`.trim() || 'Generated Title',
    bullets: [
      'Comfortable, daily-wear design',
      'Durable construction for long-lasting performance',
      'Versatile style suitable for multiple occasions'
    ],
    seo: `Buy ${product.brand} ${product.name} with premium features and reliable comfort.`.slice(0,160),
    paragraphDraft: `Prompt Used:\n${prompt}\n\n${product.name} by ${product.brand} offers dependable comfort and style for everyday wear. Key features include ${product.aiContext?.featureBullets?.slice(0,3).join(', ') || 'quality materials'}.`,
    score: { overall: 8, tone: 7, seo: 8 },
  };
}

function heuristicScore(text: string): { overall: number; tone: number; seo: number } {
  const len = text.length;
  const overall = Math.min(10, Math.max(6, Math.round(len / 400 * 10)));
  const tone = overall - 1;
  const seo = Math.min(10, Math.round((text.match(/\b(comfort|durable|premium|sale|performance)\b/gi)?.length || 3) + 6));
  return { overall, tone, seo };
}
