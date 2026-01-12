// packages/api/src/endpoints/aiDescribe.ts
import { Request, Response } from 'express';
import { getFirestore } from 'firebase-admin/firestore';

const firestore = getFirestore();
import { callGemini } from '../lib/geminiClient';
import { loadRegistry, loadTemplate, loadTemplateForSite } from '../lib/settingsHelpers';
import { writeAIActionLog } from '../lib/aiActionLog';
import { renderPrompt, parseGeminiCandidates } from '../lib/promptHelpers';
import { logger } from '../lib/logger';

/**
 * AI Describe Endpoint - Registry-based AI Product Description Generation
 * 
 * POST /api/products/:mpn/ai-describe
 * 
 * Generates AI-powered product descriptions using registry-only attributes
 * and template-based prompts with Gemini AI.
 * 
 * Key Features:
 * - Registry-only filtering: Only attributes with aiInput=true or aiUsage includes 'productDescriptions'
 * - Template-based generation with priority matching
 * - Blocked responses when required attributes are missing
 * - Comprehensive audit logging for AI actions
 * - Site-specific template selection with fallbacks
 * 
 * This is distinct from the existing /describe endpoint which handles multi-target
 * observation-based descriptions. This endpoint focuses on registry-driven generation.
 */

/**
 * Resolve product document ID by MPN
 * Uses Firestore query on products.mpn field
 */
async function resolveProductDocIdByMPN(mpn: string): Promise<string | null> {
  try {
    const q = await firestore.collection('products').where('mpn', '==', mpn).limit(1).get();
    if (q.empty) {
      return null;
    }
    return q.docs[0].id;
  } catch (error) {
    logger.error('Error resolving product by MPN', { mpn, error });
    throw error;
  }
}

/**
 * POST /api/products/:mpn/ai-describe
 * 
 * @param req.params.mpn - Product MPN to describe
 * @param req.body.site - Target site for template matching
 * @param req.body.templateKey - Optional specific template override
 * @param req.body.options - Generation options (candidates count, etc.)
 */
export async function aiDescribeHandler(req: Request, res: Response) {
  const startTime = Date.now();
  
  try {
    const mpn = req.params.mpn;
    if (!mpn) {
      return res.status(400).json({ 
        status: 'error', 
        message: 'missing mpn parameter' 
      });
    }

    const { site, templateKey, options = {} } = req.body;
    if (!site) {
      return res.status(400).json({ 
        status: 'error', 
        message: 'missing site in request body' 
      });
    }

    // Resolve MPN to Firestore document ID
    const docId = await resolveProductDocIdByMPN(mpn);
    if (!docId) {
      return res.status(404).json({ 
        status: 'error', 
        message: `mpn '${mpn}' not found` 
      });
    }

    // Load product data
    const productSnap = await firestore.collection('products').doc(docId).get();
    if (!productSnap.exists) {
      return res.status(404).json({ 
        status: 'error', 
        message: `product document '${docId}' not found` 
      });
    }
    const product = productSnap.data() || {};

    // Load registry and template
    const registry = await loadRegistry(); // map attrId => metadata
    const template = templateKey 
      ? await loadTemplate(templateKey) 
      : await loadTemplateForSite(site);

    if (!template) {
      return res.status(400).json({
        status: 'error',
        message: `no template found for site '${site}' or templateKey '${templateKey}'`
      });
    }

    // Build eligible attributes from registry
    // Only include attributes with aiInput=true OR aiUsage includes 'productDescriptions'
    const eligibleAttrs = Object.values(registry).filter((attr: any) =>
      attr.status === 'active' && 
      (attr.aiInput === true || 
       (Array.isArray(attr.aiUsage) && attr.aiUsage.includes('productDescriptions')))
    );

    logger.info('Registry filtering for AI describe', {
      mpn,
      totalRegistryAttrs: Object.keys(registry).length,
      eligibleAttrs: eligibleAttrs.length,
      templateKey: template.key
    });

    // Extract context attributes and check for missing required ones
    const contextAttributes: Record<string, any> = {};
    const missingRequired: string[] = [];

    for (const attr of eligibleAttrs) {
      const value = product?.attributes?.[attr.attribute_id];
      const isEmpty = value === undefined || value === null || value === '';
      
      if (isEmpty) {
        // Check if this attribute is required
        const isTemplateRequired = template.requiredAttributes && 
          template.requiredAttributes.includes(attr.attribute_id);
        const isGloballyRequired = attr.required_for_completion === true;
        
        if (isTemplateRequired || isGloballyRequired) {
          missingRequired.push(attr.attribute_id);
        }
        continue;
      }

      // Add to context
      contextAttributes[attr.attribute_id] = { value };
      
      // Include AI usage notes if template opts in
      if (template.includeAttributeNotes && attr.ai_usage_notes) {
        contextAttributes[attr.attribute_id].note = attr.ai_usage_notes;
      }
    }

    // Check for blocking conditions
    if (missingRequired.length > 0) {
      logger.warn('AI Describe blocked due to missing required attributes', {
        mpn,
        site,
        templateKey: template.key,
        missingRequired
      });

      return res.status(409).json({
        status: 'blocked',
        code: 'BLOCKED_MISSING_REQUIRED_ATTRIBUTES',
        missingAttributes: missingRequired,
        message: 'AI Describe is blocked due to missing required registry attributes.',
        details: {
          templateKey: template.key,
          site,
          mpn
        }
      });
    }

    // Observations block (only if template opts in)
    let observationsBlock = null;
    if (template.includeObservations && Array.isArray(product.ai_insights)) {
      observationsBlock = product.ai_insights
        .filter((insight: any) => insight.resolved)
        .map((insight: any) => ({
          id: insight.id,
          summary: String(insight.summary).slice(0, 500), // Truncate for context
          confidence: insight.confidence
        }));
    }

    // Build prompt context
    const promptContext = {
      product,
      attributes: contextAttributes,
      observations: observationsBlock,
      site,
      options
    };

    // Render prompt using template
    const prompt = renderPrompt(template, promptContext);

    // Configure model settings
    const modelSettings = template?.modelSettings || { 
      model: process.env.DEFAULT_AI_MODEL || 'gemini-1.5-flash',
      maxOutputTokens: 1024,
      temperature: 0.7
    };

    logger.info('Calling Gemini for AI describe', {
      mpn,
      site,
      templateKey: template.key,
      model: modelSettings.model,
      promptLength: prompt.length,
      contextAttrCount: Object.keys(contextAttributes).length
    });

    // Call Gemini
    const gResponse = await callGemini({ 
      prompt, 
      modelSettings,
      metadata: {
        mpn,
        site,
        templateKey: template.key,
        userId: req.user?.uid
      }
    });

    // Parse candidates from Gemini response
    const candidates = parseGeminiCandidates(gResponse, options.candidates || 1);

    // Compute matched conditions for debugging
    const matchedConditions = template.conditions 
      ? template.conditions.filter((condition: any) => 
          evaluateCondition(condition, { product, site, attributes: contextAttributes })
        )
      : [];

    // Write AI Action Log entry (async; don't block response)
    const logEntry = {
      mpn,
      site,
      userId: req.user?.uid,
      templateKey: template.key,
      templatePriority: template.priority || 0,
      candidateIds: candidates.map(c => c.id),
      contextAttributeCount: Object.keys(contextAttributes).length,
      elapsedMs: Date.now() - startTime,
      model: modelSettings.model
    };
    
    writeAIActionLog(logEntry).catch(error => {
      logger.error('Failed to write AI Action Log', { error, logEntry });
    });

    // Success response
    const response = {
      status: 'ok',
      result: {
        site,
        mpn,
        candidates,
        matchedTemplate: template.key,
        matchedTemplatePriority: template.priority || 0,
        matchedConditions: matchedConditions.map(c => ({ 
          id: c.id, 
          description: c.description 
        })),
        contextAttributeCount: Object.keys(contextAttributes).length,
        trace: {
          model: modelSettings.model,
          elapsedMs: Date.now() - startTime,
          promptTokens: gResponse.promptTokens,
          outputTokens: gResponse.outputTokens
        }
      }
    };

    logger.info('AI Describe completed successfully', {
      mpn,
      site,
      templateKey: template.key,
      candidateCount: candidates.length,
      elapsedMs: Date.now() - startTime
    });

    return res.json(response);

  } catch (error) {
    const elapsedMs = Date.now() - startTime;
    
    logger.error('AI Describe error', { 
      error: error.message,
      stack: error.stack,
      mpn: req.params.mpn,
      site: req.body.site,
      elapsedMs
    });

    // Handle specific error types
    if (error.code === 'AI_DESCRIBE_KEY_MISSING') {
      return res.status(503).json({
        status: 'error',
        code: 'AI_DESCRIBE_KEY_MISSING',
        message: 'AI service temporarily unavailable - missing API key'
      });
    }

    if (error.code === 'RATE_LIMIT_EXCEEDED') {
      return res.status(429).json({
        status: 'error',
        code: 'RATE_LIMIT_EXCEEDED',
        message: 'Rate limit exceeded. Please try again later.',
        retryAfter: error.retryAfter || 60
      });
    }

    return res.status(500).json({
      status: 'error',
      code: 'INTERNAL_ERROR',
      message: 'An internal error occurred while generating description'
    });
  }
}

/**
 * Simple condition evaluator for template matching
 * @param condition Template condition object
 * @param context Evaluation context (product, site, attributes)
 * @returns boolean indicating if condition matches
 */
function evaluateCondition(condition: any, context: any): boolean {
  try {
    // Simple condition evaluation logic
    // This would be expanded based on actual template condition format
    if (condition.type === 'site' && condition.value) {
      return context.site === condition.value;
    }
    
    if (condition.type === 'attribute' && condition.attributeId && condition.value) {
      const attrValue = context.attributes[condition.attributeId]?.value;
      return attrValue === condition.value;
    }
    
    // Default: condition matches if no evaluation logic found
    return true;
  } catch (error) {
    logger.warn('Error evaluating template condition', { condition, error });
    return false;
  }
}

export default aiDescribeHandler;