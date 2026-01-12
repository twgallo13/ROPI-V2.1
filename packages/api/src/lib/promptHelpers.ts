// packages/api/src/lib/promptHelpers.ts
import { logger } from './logger';
import { v4 as uuidv4 } from 'uuid';

/**
 * Prompt Helpers for AI Describe Feature
 * 
 * Utilities for rendering prompts from templates and parsing
 * Gemini responses into structured candidate format.
 */

interface PromptContext {
  product: any;
  attributes: Record<string, { value: any; note?: string }>;
  observations?: any[] | null;
  site: string;
  options: any;
}

interface AITemplate {
  key: string;
  prompt?: string;
  includeObservations?: boolean;
  includeAttributeNotes?: boolean;
  [key: string]: any;
}

interface Candidate {
  id: string;
  text: string;
  confidence?: number;
  meta: {
    attributesUsed: number;
    observationsUsed?: number;
    template: string;
  };
}

/**
 * Render prompt from template and context
 * Uses simple variable substitution with fallback to default template
 */
export function renderPrompt(template: AITemplate, context: PromptContext): string {
  try {
    let prompt = template.prompt || getDefaultPromptTemplate();

    // Replace template variables
    prompt = prompt.replace(/\{\{product\.mpn\}\}/g, context.product.mpn || 'Unknown MPN');
    prompt = prompt.replace(/\{\{product\.brand\}\}/g, context.product.brand || context.product.attributes?.brand || 'Unknown Brand');
    prompt = prompt.replace(/\{\{product\.name\}\}/g, context.product.name || context.product.title || 'Product');
    prompt = prompt.replace(/\{\{site\}\}/g, context.site);

    // Build attributes section
    const attributesSection = buildAttributesSection(context.attributes, template.includeAttributeNotes);
    prompt = prompt.replace(/\{\{attributes\}\}/g, attributesSection);

    // Build observations section (if included)
    if (template.includeObservations && context.observations && context.observations.length > 0) {
      const observationsSection = buildObservationsSection(context.observations);
      prompt = prompt.replace(/\{\{observations\}\}/g, observationsSection);
    } else {
      prompt = prompt.replace(/\{\{observations\}\}/g, '');
    }

    // Clean up extra whitespace
    prompt = prompt.replace(/\n\s*\n\s*\n/g, '\n\n').trim();

    logger.info('Prompt rendered successfully', {
      templateKey: template.key,
      promptLength: prompt.length,
      attributeCount: Object.keys(context.attributes).length,
      observationsCount: context.observations?.length || 0,
      site: context.site
    });

    return prompt;
  } catch (error) {
    logger.error('Error rendering prompt', {
      error: error.message,
      templateKey: template.key,
      site: context.site
    });

    // Return fallback prompt
    return getFallbackPrompt(context);
  }
}

/**
 * Build attributes section for prompt
 */
function buildAttributesSection(
  attributes: Record<string, { value: any; note?: string }>, 
  includeNotes: boolean = false
): string {
  if (Object.keys(attributes).length === 0) {
    return 'No attributes provided.';
  }

  const lines: string[] = [];
  
  Object.entries(attributes).forEach(([attrId, attrData]) => {
    let line = `- ${attrId}: ${attrData.value}`;
    
    if (includeNotes && attrData.note) {
      line += ` (${attrData.note})`;
    }
    
    lines.push(line);
  });

  return lines.join('\n');
}

/**
 * Build observations section for prompt
 */
function buildObservationsSection(observations: any[]): string {
  if (!observations || observations.length === 0) {
    return '';
  }

  const lines: string[] = ['\nKey Observations:'];
  
  observations.forEach((obs, index) => {
    const confidence = obs.confidence ? ` (${Math.round(obs.confidence * 100)}% confidence)` : '';
    lines.push(`${index + 1}. ${obs.summary}${confidence}`);
  });

  return lines.join('\n');
}

/**
 * Default prompt template
 */
function getDefaultPromptTemplate(): string {
  return `You are a professional product description writer for e-commerce. 

Generate a compelling product description for the following product:

Product: {{product.name}} (MPN: {{product.mpn}})
Brand: {{product.brand}}
Target Site: {{site}}

Product Attributes:
{{attributes}}

{{observations}}

Instructions:
- Write a concise, engaging description suitable for {{site}}
- Highlight key features and benefits
- Use the provided attributes accurately
- Maintain a professional yet accessible tone
- Focus on what matters most to customers

Generate a product description:`;
}

/**
 * Fallback prompt for error cases
 */
function getFallbackPrompt(context: PromptContext): string {
  const attrList = Object.entries(context.attributes)
    .map(([key, data]) => `${key}: ${data.value}`)
    .join(', ') || 'No attributes';

  return `Generate a product description for ${context.product.mpn || 'this product'} with these attributes: ${attrList}. Target site: ${context.site}.`;
}

/**
 * Parse Gemini response into candidate objects
 */
export function parseGeminiCandidates(geminiResponse: any, maxCandidates: number = 1): Candidate[] {
  try {
    const responseText = geminiResponse.text || '';
    
    if (!responseText.trim()) {
      logger.warn('Empty response from Gemini');
      return [{
        id: uuidv4(),
        text: 'No description generated.',
        confidence: 0,
        meta: {
          attributesUsed: 0,
          template: 'fallback'
        }
      }];
    }

    // For now, treat the entire response as a single candidate
    // In the future, could split by delimiters for multiple candidates
    const candidates: Candidate[] = [{
      id: uuidv4(),
      text: responseText.trim(),
      confidence: calculateConfidence(geminiResponse),
      meta: {
        attributesUsed: 0, // Would need to track this from context
        template: geminiResponse.templateKey || 'unknown'
      }
    }];

    // If multiple candidates requested, could generate variations here
    // For now, return the single candidate
    const result = candidates.slice(0, maxCandidates);

    logger.info('Gemini response parsed successfully', {
      candidateCount: result.length,
      textLength: responseText.length,
      confidence: result[0]?.confidence
    });

    return result;
  } catch (error) {
    logger.error('Error parsing Gemini candidates', {
      error: error.message,
      responseLength: geminiResponse?.text?.length || 0
    });

    // Return fallback candidate
    return [{
      id: uuidv4(),
      text: 'Error generating description. Please try again.',
      confidence: 0,
      meta: {
        attributesUsed: 0,
        template: 'error'
      }
    }];
  }
}

/**
 * Calculate confidence score based on Gemini response metadata
 */
function calculateConfidence(geminiResponse: any): number {
  try {
    // Base confidence
    let confidence = 0.8;

    // Adjust based on finish reason
    if (geminiResponse.finishReason === 'STOP') {
      confidence += 0.1;
    } else if (geminiResponse.finishReason === 'MAX_TOKENS') {
      confidence -= 0.2;
    } else if (geminiResponse.finishReason === 'SAFETY') {
      confidence -= 0.3;
    }

    // Adjust based on output length (longer = potentially better)
    const textLength = geminiResponse.text?.length || 0;
    if (textLength > 200) {
      confidence += 0.1;
    } else if (textLength < 50) {
      confidence -= 0.2;
    }

    // Clamp to 0-1 range
    return Math.max(0, Math.min(1, confidence));
  } catch (error) {
    logger.warn('Error calculating confidence', { error });
    return 0.5; // Default confidence
  }
}

/**
 * Validate prompt template syntax
 */
export function validatePromptTemplate(template: string): { valid: boolean; errors: string[] } {
  const errors: string[] = [];
  
  // Check for unmatched brackets
  const openBrackets = (template.match(/\{\{/g) || []).length;
  const closeBrackets = (template.match(/\}\}/g) || []).length;
  
  if (openBrackets !== closeBrackets) {
    errors.push('Unmatched template brackets');
  }

  // Check for required variables
  const requiredVars = ['{{product.mpn}}', '{{attributes}}'];
  for (const reqVar of requiredVars) {
    if (!template.includes(reqVar)) {
      errors.push(`Missing required variable: ${reqVar}`);
    }
  }

  return {
    valid: errors.length === 0,
    errors
  };
}

export default {
  renderPrompt,
  parseGeminiCandidates,
  validatePromptTemplate
};