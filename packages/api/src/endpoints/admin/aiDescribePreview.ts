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

export default adminAITemplatePreviewHandler;