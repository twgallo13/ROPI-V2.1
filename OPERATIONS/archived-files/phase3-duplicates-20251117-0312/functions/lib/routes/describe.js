"use strict";
var __createBinding = (this && this.__createBinding) || (Object.create ? (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    var desc = Object.getOwnPropertyDescriptor(m, k);
    if (!desc || ("get" in desc ? !m.__esModule : desc.writable || desc.configurable)) {
      desc = { enumerable: true, get: function() { return m[k]; } };
    }
    Object.defineProperty(o, k2, desc);
}) : (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    o[k2] = m[k];
}));
var __setModuleDefault = (this && this.__setModuleDefault) || (Object.create ? (function(o, v) {
    Object.defineProperty(o, "default", { enumerable: true, value: v });
}) : function(o, v) {
    o["default"] = v;
});
var __importStar = (this && this.__importStar) || (function () {
    var ownKeys = function(o) {
        ownKeys = Object.getOwnPropertyNames || function (o) {
            var ar = [];
            for (var k in o) if (Object.prototype.hasOwnProperty.call(o, k)) ar[ar.length] = k;
            return ar;
        };
        return ownKeys(o);
    };
    return function (mod) {
        if (mod && mod.__esModule) return mod;
        var result = {};
        if (mod != null) for (var k = ownKeys(mod), i = 0; i < k.length; i++) if (k[i] !== "default") __createBinding(result, mod, k[i]);
        __setModuleDefault(result, mod);
        return result;
    };
})();
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = __importDefault(require("express"));
const generative_ai_1 = require("@google/generative-ai");
const functions = __importStar(require("firebase-functions"));
const admin = __importStar(require("firebase-admin"));
const template_selection_1 = require("../utils/template-selection");
const layoutEngine_1 = require("../ai/layoutEngine");
// Read Gemini key from Firebase Functions config first, then env as fallback
const GEMINI_API_KEY = (functions.config().gemini && functions.config().gemini.api_key) ||
    process.env.GEMINI_API_KEY;
// Optional: single safe log to confirm presence (not the key value)
console.log("GEMINI_KEY_PRESENT", Boolean(GEMINI_API_KEY));
const app = (0, express_1.default)();
// CORS for dev environments
app.use((req, res, next) => {
    const origin = req.headers.origin;
    const allowedOrigins = [
        'http://localhost:3000',
        'http://localhost:5173',
        'https://ropi-bccee.web.app',
        'https://ropi-bccee.firebaseapp.com',
    ];
    // Allow any *.app.github.dev origin (Codespaces)
    if (origin && (allowedOrigins.includes(origin) || /\.app\.github\.dev$/.test(origin))) {
        res.setHeader('Access-Control-Allow-Origin', origin);
        res.setHeader('Access-Control-Allow-Methods', 'GET, POST, OPTIONS');
        res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization');
        res.setHeader('Access-Control-Allow-Credentials', 'true');
    }
    // Handle preflight
    if (req.method === 'OPTIONS') {
        return res.status(200).end();
    }
    next();
});
app.use(express_1.default.json());
/**
 * Load audience template from Firestore
 * Falls back to hard-coded template if Firestore doc doesn't exist
 */
async function loadAudienceTemplate(templateKey) {
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
        }
        else {
            console.warn(`[describe] Template ${templateKey} not found in Firestore, using fallback`);
            return null;
        }
    }
    catch (error) {
        console.error(`[describe] Failed to load template ${templateKey}:`, error);
        return null;
    }
}
/**
 * Select audience-specific prompt template based on gender and age group
 * Templates: default, mens, womens, gradeSchool, toddler
 */
function selectAudienceTemplate(gender, ageGroup) {
    if (ageGroup && /Grade[\s-]?School/i.test(ageGroup))
        return "gradeSchool";
    if (ageGroup && /Toddler|Infant/i.test(ageGroup))
        return "toddler";
    if (gender && /Women/i.test(gender))
        return "womens";
    if (gender && /Men/i.test(gender))
        return "mens";
    return "default";
}
/**
 * Build dynamic prompt using product attributes and observations
 * Now uses Firestore template if available, otherwise falls back to hard-coded prompt
 * P14.1: Supports both legacy prompt_body and new structured config (format, voice, seo)
 */
async function buildPrompt(payload, template) {
    const { attributes = {}, facts = {}, aiContext = {}, tone = 'Clean', length = 'Medium', } = payload;
    const { brand = 'our brand', name = 'this product', category = 'product', fit = 'standard fit', gender = 'unisex', ageGroup = 'adult', sportsTeam, league, material, materials = [], primaryColor, descriptiveColor, styleId, launchDate, familySizing, } = attributes;
    // Check if launch date is within 14 days (allow subtle "new" cue)
    let isNewLaunch = false;
    if (launchDate) {
        try {
            const launch = new Date(launchDate);
            const now = new Date();
            const daysDiff = Math.floor((launch.getTime() - now.getTime()) / (1000 * 60 * 60 * 24));
            isNewLaunch = daysDiff >= -14 && daysDiff <= 14; // Within 14 days before or after
            console.log(`[describe] Launch date ${launchDate}: ${daysDiff} days difference, isNewLaunch=${isNewLaunch}`);
        }
        catch (e) {
            console.warn('[describe] Failed to parse launch date:', launchDate, e);
        }
    }
    // Build weighted observations summary (HIGH WEIGHT)
    const obsParts = [];
    if (facts.observations)
        obsParts.push(`Observations: ${facts.observations}`);
    if (facts.materials)
        obsParts.push(`Materials: ${facts.materials}`);
    if (facts.fit)
        obsParts.push(`Fit Notes: ${facts.fit}`);
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
    }
    else if (sportsTeam) {
        teamContext = `Team: ${sportsTeam}`;
    }
    else if (league) {
        teamContext = `League: ${league}`;
    }
    // Build color context
    let colorContext = '';
    if (descriptiveColor) {
        colorContext = `Descriptive Color (brand story context): ${descriptiveColor}`;
    }
    else if (primaryColor) {
        colorContext = `Primary Color: ${primaryColor}`;
    }
    // Build materials context (HIGH WEIGHT)
    const materialsContext = materials.length > 0 ? `Materials (use verbatim): ${materials.join(', ')}` : '';
    // Build family sizing context
    const familySizingContext = familySizing ? 'Family Sizing: Available (mention sizing options for the whole family)' : '';
    // Design notes from AI context
    const designNotes = aiContext.designNotes || '';
    const priorDraft = aiContext.priorDraft ? `Previous Draft (for rewrite, do NOT append):
${aiContext.priorDraft}
` : '';
    // P14.1/P14.2: If template has structured config, use it to build enhanced prompt
    if (template.format && template.voice) {
        console.log(`[describe] Using structured template config for ${template.key}`);
        // Build voice guidance from structured config
        const voicePresetGuidance = {
            'clean-retail': 'Use clear, professional retail language emphasizing product benefits',
            'hype-drop': 'Create excitement and urgency with energetic language for limited releases',
            'parent-friendly': 'Write for parents with emphasis on safety, durability, and value',
            'tech-performance': 'Focus on technical specifications and performance benefits',
            'luxury': 'Use sophisticated, elevated language emphasizing quality and exclusivity'
        };
        const voiceGuidance = voicePresetGuidance[template.voice.preset] || '';
        const customVoice = template.voice.description || '';
        const avoidWords = (template.voice.avoid || []).length > 0
            ? `Avoid these words: ${template.voice.avoid.join(', ')}`
            : '';
        // Build layout-aware HTML format guidance (P14.2)
        const layout = template.format.layout;
        const pMin = template.format.paragraph?.min ?? 50;
        const pMax = template.format.paragraph?.max ?? 90;
        const allowTwo = Boolean(template.format.paragraph?.allowTwoParagraphs);
        const bMin = template.format.bullets?.min ?? 2;
        const bMax = template.format.bullets?.max ?? 4;
        const topics = Array.isArray(template.format.bullets?.topics) ? template.format.bullets.topics : [];
        let formatGuidance = '';
        if (layout === 'headline+paragraph+bullets') {
            const paraPhrase = allowTwo ? `1–2 short paragraphs totaling ${pMin}-${pMax} words` : `1 short paragraph of ${pMin}-${pMax} words`;
            const bulletPhrase = `${bMin}-${bMax} concise bullets`;
            const topicsPhrase = topics.length ? `Focus bullets on: ${topics.join(', ')}` : '';
            formatGuidance = `Always produce HTML in the description field using this structure:\n\n<h3>Headline text</h3>\n<p>Paragraph 1...</p>\n${allowTwo ? '<p>Paragraph 2 (optional, only if needed)...</p>\n' : ''}<ul>\n  <li>Bullet 1...</li>\n  <li>Bullet 2...</li>\n</ul>\n\nWrite ${paraPhrase} and ${bulletPhrase}. ${topicsPhrase}`;
        }
        else if (layout === 'paragraph-only') {
            formatGuidance = `Always produce HTML in the description field as 1–2 <p> blocks totaling ${pMin}-${pMax} words. Do not include <ul> or bullets.`;
        }
        else if (layout === 'short-blurb') {
            formatGuidance = `Always produce HTML in the description field as a single <p> only. Keep it brief and within ${Math.max(30, Math.floor(pMin * 0.7))}-${Math.min(90, Math.floor(pMax * 0.8))} words.`;
        }
        else {
            formatGuidance = `Produce HTML in the description field as one <p> of ${pMin}-${pMax} words.`;
        }
        // Build structured prompt
        let structuredPrompt = `You are ROPI AI — an expert retail storyteller for ${brand}.
Your job: REWRITE the product paragraph for ${name} as a polished, complete description.

VOICE & TONE:
- ${voiceGuidance}
${customVoice ? `- ${customVoice}` : ''}
${avoidWords ? `- ${avoidWords}` : ''}
${template.voice.brandRules ? `- ${template.voice.brandRules}` : ''}

FORMAT:
- ${formatGuidance}
- Use tone: ${tone}, length: ${length}

Product Details:
- Category: ${category}
- Fit: ${fit}
- Audience: ${gender}, Age Group: ${ageGroup}
${teamContext ? `- ${teamContext}` : ''}
${colorContext ? `- ${colorContext}` : ''}
${materialsContext ? `- ${materialsContext}` : ''}
${material ? `- Legacy Material: ${material}` : ''}
${familySizingContext ? `- ${familySizingContext}` : ''}
${isNewLaunch ? '- FRESHNESS CUE: This is a new or upcoming release. You may subtly convey newness (e.g., "just in", "new arrival") without revealing exact dates.' : ''}

${obsSummary ? `OBSERVATIONS (HIGH WEIGHT - use verbatim, no hallucinations): ${obsSummary}` : ''}
${keywords.length > 0 ? `KEYWORDS: ${keywords.join(', ')}` : ''}
${featureBullets.length > 0 ? `FEATURES: ${featureBullets.join(', ')}` : ''}
${designNotes ? `IMPROVEMENTS REQUESTED: ${designNotes}` : ''}
${priorDraft}`;
        // Add hard requirements and JSON schema (HTML in description)
        const hardRequirements = `

Hard requirements:
- description must be a single string containing valid HTML tags. No markdown, no code fences.
- Rewrite the paragraph; do not append other text outside the requested HTML structure.
- Use observation facts verbatim when present; no invented claims.
- Use materials exactly as provided where relevant; no inventions.
- Descriptive color can appear once for style/branding, not as a filter.
${template.seo_rules || '- In SEO meta_keywords: prefer 1-2 materials and 1 descriptive color token if present.'}
${(template.banned_terms || []).length > 0 ? `- Banned terms: ${(template.banned_terms || []).join(', ')}` : ''}

Output ONLY a strict JSON object in this exact schema (no extra text, no markdown):
{
  "description": "<structured HTML string>",
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
        return structuredPrompt + hardRequirements;
    }
    // Legacy: If template has prompt_body, use it with variable substitution
    if (template.prompt_body) {
        console.log(`[describe] Using legacy prompt_body for ${template.key}`);
        // Use Firestore template with simple variable substitution
        let prompt = template.prompt_body;
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
${template.seo_rules ? `- ${template.seo_rules}` : '- In SEO meta_keywords: prefer 1-2 materials and 1 descriptive color token if present.'}
${template.tone_rules ? `- ${template.tone_rules}` : ''}
${template.banned_terms && Array.isArray(template.banned_terms) && template.banned_terms.length > 0 ? `- Banned terms: ${template.banned_terms.join(', ')}` : ''}

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
    // Final fallback: use hard-coded prompt (should not reach here if Firestore is populated)
    console.warn(`[describe] No structured config or prompt_body found, using hard-coded fallback for ${template.key}`);
    // Determine audience guidance based on template key
    let audienceGuidance = '';
    if (template.key.includes('mens')) {
        audienceGuidance = 'Write for adult male customers. Focus on performance, durability, and practical benefits.';
    }
    else if (template.key.includes('womens')) {
        audienceGuidance = 'Write for adult female customers. Balance style and function, emphasizing versatility and quality.';
    }
    else if (template.key.includes('kids') || template.key.includes('gradeSchool')) {
        audienceGuidance = 'Write for parents shopping for grade school kids (ages 6-12). Focus on durability, comfort, and age-appropriate style.';
    }
    else if (template.key.includes('toddler')) {
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
${familySizingContext ? `- ${familySizingContext}` : ''}
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
function parseGeminiResponse(text) {
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
    }
    catch (e) {
        console.error('[describe] JSON parse failed', e);
        return null;
    }
}
app.post('*', async (req, res) => {
    const payload = req.body;
    const { productId, attributes } = payload;
    if (!productId) {
        return res.status(400).json({ error: 'productId required' });
    }
    // If no API key, return clear error
    if (!GEMINI_API_KEY) {
        return res.status(500).json({ error: "Missing Gemini API key" });
    }
    try {
        // P14.1: Use condition-based template selection
        const productData = {
            gender: attributes?.gender,
            department: attributes?.category?.includes('Apparel') ? 'Apparel' :
                attributes?.category?.includes('Accessories') ? 'Accessories' : 'Footwear',
            ageGroup: attributes?.ageGroup,
            materials: attributes?.materials,
            launchDate: attributes?.launchDate || null
        };
        // If an explicit override key is provided and exists, use it directly
        let selectionResult = null;
        const overrideKey = (payload.templateOverride || '').trim();
        if (overrideKey) {
            const overridden = await (0, template_selection_1.loadTemplateByKey)(overrideKey);
            if (overridden) {
                selectionResult = {
                    template: overridden,
                    conditionsMatched: [`override:${overrideKey}`],
                    fallbackReason: undefined,
                };
                console.log(`[describe] Using template override: ${overrideKey} (v${overridden.version})`);
            }
            else {
                console.warn(`[describe] templateOverride provided but not found: ${overrideKey}. Falling back to auto-select.`);
            }
        }
        if (!selectionResult) {
            selectionResult = await (0, template_selection_1.selectTemplate)(productData);
        }
        const { template, conditionsMatched, fallbackReason } = selectionResult;
        console.log(`[describe] Selected template: ${template.key} (v${template.version})`);
        if (conditionsMatched && conditionsMatched.length > 0) {
            console.log(`[describe] Conditions matched: ${conditionsMatched.join(', ')}`);
        }
        if (fallbackReason) {
            console.log(`[describe] Fallback reason: ${fallbackReason}`);
        }
        const genAI = new generative_ai_1.GoogleGenerativeAI(GEMINI_API_KEY);
        const model = genAI.getGenerativeModel({
            model: 'gemini-2.0-flash',
            generationConfig: {
                temperature: payload.temperature ?? 0.6,
                maxOutputTokens: 800,
            },
        });
        const prompt = await buildPrompt(payload, template);
        const result = await model.generateContent(prompt);
        const text = result.response.text();
        const parsed = parseGeminiResponse(text);
        if (!parsed || !parsed.description) {
            return res.status(502).json({ error: 'AI returned invalid JSON' });
        }
        // Generate structured layout using layout engine
        const layoutResult = (0, layoutEngine_1.generateLayout)({ sku_core: attributes, descriptive: attributes, ...payload }, parsed.description, template.key);
        // Build response with template metadata and layout engine results
        const response = {
            description: parsed.description,
            scores: parsed.scores,
            coach: parsed.coach,
            seo: parsed.seo,
            used_template: {
                scope: template.scope || 'audience',
                key: template.key,
                version: template.version,
                conditionsMatched: conditionsMatched || [],
            },
            facts_used: parsed.facts_used || [],
            // Layout Engine Results (Phase 3)
            templateKey: layoutResult.templateKey,
            blocks: layoutResult.blocks,
            html: layoutResult.html,
            metaName: layoutResult.metaName,
            metaDescription: layoutResult.metaDescription,
            slugSuggestion: layoutResult.slugSuggestion,
        };
        // Debug log for monitoring
        console.log("[apiDescribe] used_template:", response.used_template, "scores:", response?.scores);
        res.status(200).json(response);
    }
    catch (error) {
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
exports.default = app;
