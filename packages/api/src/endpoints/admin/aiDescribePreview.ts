// packages/api/src/endpoints/admin/aiDescribePreview.ts
import { Request, Response } from 'express';
import { getFirestore } from 'firebase-admin/firestore';
import { loadRegistry, loadTemplate, loadTemplateForSite } from '../../lib/settingsHelpers';
import { renderPrompt } from '../../lib/promptHelpers';
import { logger } from '../../lib/logger';

// Lazy Firestore getter to ensure app is initialized
function getDb() {
  return getFirestore();
}

/**
 * Admin AI Template Preview Endpoint
 * 
 * GET /admin/ai/templates/{templateKey}/preview?mpn=...&includeObservations=true/false&includeAttributeNotes=true/false
 * 
 * Provides admin-only preview functionality for AI templates.
 * Renders prompts without calling Gemini AI to allow template testing and debugging.
 * 
 * Features:
 * - Render-only (no LLM call)
 * - Admin masking of sensitive data
 * - Matched conditions debugging
 * - Audit logging to Admin Action Log
 */

interface AdminPreviewOptions {
  includeObservations: boolean;
  includeAttributeNotes: boolean;
  maskSensitiveData: boolean;
}

/**
 * Resolve product by MPN for admin preview
 */
async function resolveProductForPreview(mpn: string) {
  const q = await getDb().collection('products').where('mpn', '==', mpn).limit(1).get();
  if (q.empty) return null;
  
  const productDoc = q.docs[0];
  return {
    id: productDoc.id,
    data: productDoc.data()
  };
}

/**
 * Apply admin masking rules to sensitive data
 */
function applyAdminMasking(data: any, maskSensitiveData: boolean = true): any {
  if (!maskSensitiveData) return data;
  
  const maskedData = { ...data };
  
  // Mask sensitive fields (customize based on requirements)
  const sensitiveFields = ['cost', 'wholesale_price', 'margin', 'supplier_id', 'internal_notes'];
  
  if (maskedData.attributes) {
    sensitiveFields.forEach(field => {
      if (maskedData.attributes[field]) {
        maskedData.attributes[field] = '***MASKED***';
      }
    });
  }
  
  return maskedData;
}

/**
 * Write admin action log entry for preview renders
 */
async function writeAdminActionLog(entry: {
  action: string;
  templateKey: string;
  mpn: string;
  userId: string;
  details: any;
}): Promise<void> {
  try {
    const logEntry = {
      ...entry,
      timestamp: getDb().Timestamp.now(),
      type: 'admin_ai_template_preview'
    };
    
    await getDb().collection('admin_action_log').add(logEntry);
    
    logger.info('Admin Action Log entry written for AI template preview', {
      templateKey: entry.templateKey,
      mpn: entry.mpn,
      userId: entry.userId
    });
  } catch (error) {
    logger.error('Failed to write Admin Action Log entry', { error, entry });
  }
}

/**
 * GET /admin/ai/templates/:templateKey/preview
 */
export async function adminAITemplatePreviewHandler(req: Request, res: Response) {
  const startTime = Date.now();
  
  try {
    const templateKey = req.params.templateKey;
    const mpn = req.query.mpn as string;
    
    if (!templateKey) {
      return res.status(400).json({
        status: 'error',
        message: 'missing templateKey parameter'
      });
    }
    
    if (!mpn) {
      return res.status(400).json({
        status: 'error',
        message: 'missing mpn query parameter'
      });
    }
    
    // Parse options from query parameters
    const options: AdminPreviewOptions = {
      includeObservations: req.query.includeObservations === 'true',
      includeAttributeNotes: req.query.includeAttributeNotes === 'true',
      maskSensitiveData: req.query.maskSensitiveData !== 'false' // Default to true
    };
    
    // Load template
    const template = await loadTemplate(templateKey);
    if (!template) {
      return res.status(404).json({
        status: 'error',
        message: `template '${templateKey}' not found`
      });
    }
    
    // Load product
    const productResult = await resolveProductForPreview(mpn);
    if (!productResult) {
      return res.status(404).json({
        status: 'error',
        message: `product with mpn '${mpn}' not found`
      });
    }
    
    // Apply admin masking
    const maskedProduct = applyAdminMasking(productResult.data, options.maskSensitiveData);
    
    // Load registry
    const registry = await loadRegistry();
    
    // Filter eligible attributes (same logic as main endpoint)
    const eligibleAttrs = Object.values(registry).filter((attr: any) =>
      attr.status === 'active' && 
      (attr.aiInput === true || 
       (Array.isArray(attr.aiUsage) && attr.aiUsage.includes('productDescriptions')))
    );
    
    // Extract context attributes
    const contextAttributes: Record<string, any> = {};
    eligibleAttrs.forEach(attr => {
      const value = maskedProduct?.attributes?.[attr.attribute_id];
      if (value !== undefined && value !== null && value !== '') {
        contextAttributes[attr.attribute_id] = { value };
        
        if (options.includeAttributeNotes && attr.ai_usage_notes) {
          contextAttributes[attr.attribute_id].note = attr.ai_usage_notes;
        }
      }
    });
    
    // Build observations block (if requested)
    let observationsBlock = null;
    if (options.includeObservations && Array.isArray(maskedProduct.ai_insights)) {
      observationsBlock = maskedProduct.ai_insights
        .filter((insight: any) => insight.resolved)
        .map((insight: any) => ({
          id: insight.id,
          summary: String(insight.summary).slice(0, 500),
          confidence: insight.confidence
        }));
    }
    
    // Override template options for preview
    const previewTemplate = {
      ...template,
      includeObservations: options.includeObservations,
      includeAttributeNotes: options.includeAttributeNotes
    };
    
    // Build prompt context  
    const promptContext = {
      product: maskedProduct,
      attributes: contextAttributes,
      observations: observationsBlock,
      site: req.query.site || 'preview',
      options: {}
    };
    
    // Render prompt (no LLM call)
    const renderedPrompt = renderPrompt(previewTemplate, promptContext);
    
    // Compute matched conditions for debugging
    const matchedConditions = template.conditions 
      ? template.conditions.filter((condition: any) => 
          evaluateCondition(condition, promptContext)
        )
      : [];
    
    const elapsedMs = Date.now() - startTime;
    
    // Write admin action log (async)
    const adminLogEntry = {
      action: 'ai_template_preview',
      templateKey,
      mpn,
      userId: req.user?.uid || 'unknown',
      details: {
        options,
        attributeCount: Object.keys(contextAttributes).length,
        observationsCount: observationsBlock?.length || 0,
        elapsedMs
      }
    };
    
    writeAdminActionLog(adminLogEntry).catch(error => {
      logger.error('Failed to write admin action log', { error });
    });
    
    // Success response
    const response = {
      status: 'ok',
      preview: {
        renderedPrompt,
        matchedConditions: matchedConditions.map(c => ({
          id: c.id,
          description: c.description,
          type: c.type,
          value: c.value
        })),
        contextAttributes: Object.fromEntries(
          Object.entries(contextAttributes).map(([key, value]) => [
            key, 
            {
              ...value,
              maskedForAdmin: options.maskSensitiveData && 
                ['cost', 'wholesale_price', 'margin'].includes(key)
            }
          ])
        ),
        templateKey: template.key,
        templatePriority: template.priority || 0,
        maskingApplied: options.maskSensitiveData,
        observationsIncluded: options.includeObservations,
        attributeNotesIncluded: options.includeAttributeNotes
      },
      meta: {
        mpn,
        productId: productResult.id,
        attributeCount: Object.keys(contextAttributes).length,
        observationsCount: observationsBlock?.length || 0,
        elapsedMs
      }
    };
    
    logger.info('Admin AI template preview completed', {
      templateKey,
      mpn,
      userId: req.user?.uid,
      elapsedMs,
      promptLength: renderedPrompt.length
    });
    
    return res.json(response);
    
  } catch (error) {
    const elapsedMs = Date.now() - startTime;
    
    logger.error('Admin AI template preview error', {
      error: error.message,
      stack: error.stack,
      templateKey: req.params.templateKey,
      mpn: req.query.mpn,
      elapsedMs
    });
    
    return res.status(500).json({
      status: 'error',
      code: 'INTERNAL_ERROR',
      message: 'An error occurred while rendering template preview'
    });
  }
}

/**
 * Simple condition evaluator (matches main endpoint)
 */
function evaluateCondition(condition: any, context: any): boolean {
  try {
    if (condition.type === 'site' && condition.value) {
      return context.site === condition.value;
    }
    
    if (condition.type === 'attribute' && condition.attributeId && condition.value) {
      const attrValue = context.attributes[condition.attributeId]?.value;
      return attrValue === condition.value;
    }
    
    return true;
  } catch (error) {
    logger.warn('Error evaluating template condition in preview', { condition, error });
    return false;
  }
}

/**
 * Admin AI Template Test Preview Endpoint
 * 
 * POST /admin/ai-templates/preview
 * 
 * Provides testing of template configurations that haven't been saved yet.
 * Accepts template data in request body and renders preview without calling LLM.
 */
export async function adminAITemplateTestPreviewHandler(req: Request, res: Response) {
  const startTime = Date.now();
  
  try {
    const { templateKey, promptBody, conditions, modelSettings, testProduct } = req.body;
    
    if (!testProduct?.mpn) {
      return res.status(400).json({
        status: 'error',
        message: 'missing testProduct.mpn in request body'
      });
    }
    
    if (!promptBody) {
      return res.status(400).json({
        status: 'error',
        message: 'missing promptBody in request body'
      });
    }
    
    // Create a temporary template object from the request
    const testTemplate = {
      key: templateKey || 'test_template',
      priority: 1000,
      promptBody,
      conditions: conditions || [],
      modelSettings: modelSettings || {
        model: 'gemini-1.5-flash',
        temperature: 0.3,
        maxTokens: 1000
      },
      includeObservations: true,
      includeAttributeNotes: true,
      createdAt: new Date(),
      updatedAt: new Date()
    };
    
    // Load product by MPN
    const productResult = await resolveProductForPreview(testProduct.mpn);
    if (!productResult) {
      return res.status(404).json({
        status: 'error',
        message: `product with mpn '${testProduct.mpn}' not found`
      });
    }
    
    // Apply admin masking
    const maskedProduct = applyAdminMasking(productResult.data, true);
    
    // Evaluate conditions using the same logic as the main preview
    const conditionsMatch = testTemplate.conditions.map(condition => {
      const matches = evaluateCondition(condition, maskedProduct);
      return {
        condition,
        matches,
        reason: matches ? 'Condition satisfied' : 'Condition not met'
      };
    });
    
    // Check if template would match (all conditions must pass)
    const allConditionsMatch = conditionsMatch.every(cm => cm.matches);
    
    // Generate prompt if conditions match
    let generatedPrompt = '';
    if (allConditionsMatch) {
      try {
        // Load registry for prompt rendering
        const registry = await loadRegistry();
        generatedPrompt = await renderPrompt(testTemplate.promptBody, maskedProduct, registry);
      } catch (error) {
        logger.warn('Error rendering prompt in test preview', { error });
        generatedPrompt = 'Error rendering prompt: ' + (error instanceof Error ? error.message : 'Unknown error');
      }
    } else {
      generatedPrompt = 'Template conditions do not match this product';
    }
    
    // Write admin action log
    await getDb().collection('admin_action_log').add({
      action: 'test_ai_template_preview',
      templateKey: testTemplate.key,
      productId: productResult.id,
      mpn: testProduct.mpn,
      conditionsMatch: allConditionsMatch,
      userId: req.user?.uid,
      timestamp: getDb().Timestamp.now(),
      type: 'ai_template_management'
    });
    
    logger.info('AI template test preview generated', {
      templateKey: testTemplate.key,
      productId: productResult.id,
      mpn: testProduct.mpn,
      conditionsMatch: allConditionsMatch,
      promptLength: generatedPrompt.length,
      processingTime: Date.now() - startTime,
      userId: req.user?.uid
    });
    
    return res.json({
      status: 'ok',
      product: {
        id: productResult.id,
        mpn: testProduct.mpn,
        site: maskedProduct.site || testProduct.site,
        ...maskedProduct
      },
      generatedPrompt,
      conditionsMatch,
      meta: {
        processingTime: Date.now() - startTime,
        templateKey: testTemplate.key,
        allConditionsMatch
      }
    });
    
  } catch (error) {
    logger.error('Error generating AI template test preview', {
      error: error instanceof Error ? error.message : 'Unknown error',
      userId: req.user?.uid
    });
    
    return res.status(500).json({
      status: 'error',
      code: 'INTERNAL_ERROR',
      message: 'Failed to generate template test preview'
    });
  }
}

export default adminAITemplatePreviewHandler;