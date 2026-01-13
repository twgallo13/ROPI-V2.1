// packages/api/src/endpoints/admin/aiDescribeSettings.ts
import { Request, Response } from 'express';
import { getFirestore, Timestamp } from 'firebase-admin/firestore';
import { logger } from '../../lib/logger';
import { clearRegistryCache, clearTemplatesCache } from '../../lib/settingsHelpers';

// Lazy Firestore getter to ensure app is initialized
function getDb() {
  return getFirestore();
}

/**
 * Normalize legacy UI field names to canonical backend field names
 * This is a temporary shim to support the current UI while maintaining backend standards
 */
function normalizeTemplateFields(body: any) {
  const normalized: any = {};
  
  // Log received body for debugging
  console.log('📨 RAW REQUEST BODY:', {
    hasKey: Object.prototype.hasOwnProperty.call(body, 'key'),
    hasTitle: Object.prototype.hasOwnProperty.call(body, 'title'),
    hasPrompt: Object.prototype.hasOwnProperty.call(body, 'prompt'),
    hasPromptBody: Object.prototype.hasOwnProperty.call(body, 'prompt_body'),
    hasModelSettings: Object.prototype.hasOwnProperty.call(body, 'modelSettings'),
    hasModel_settings: Object.prototype.hasOwnProperty.call(body, 'model_settings'),
    keys: Object.keys(body)
  });
  
  // Only set fields that are actually present (avoid undefined)
    if (Object.prototype.hasOwnProperty.call(body, 'key')) normalized.key = body.key;
    if (Object.prototype.hasOwnProperty.call(body, 'title')) normalized.title = body.title;
    if (Object.prototype.hasOwnProperty.call(body, 'status')) normalized.status = body.status;
    if (Object.prototype.hasOwnProperty.call(body, 'priority')) normalized.priority = body.priority;
    if (Object.prototype.hasOwnProperty.call(body, 'site')) normalized.site = body.site;
    if (Object.prototype.hasOwnProperty.call(body, 'conditions')) normalized.conditions = body.conditions;
    if (Object.prototype.hasOwnProperty.call(body, 'requiredAttributes')) normalized.requiredAttributes = body.requiredAttributes;
  
  // Handle prompt field (accept both prompt and prompt_body)
    if (Object.prototype.hasOwnProperty.call(body, 'prompt')) {
    normalized.prompt = body.prompt;
    } else if (Object.prototype.hasOwnProperty.call(body, 'prompt_body')) {
    normalized.prompt = body.prompt_body;
  }
  
  // Handle modelSettings (accept both modelSettings and model_settings)
    if (Object.prototype.hasOwnProperty.call(body, 'modelSettings')) {
    normalized.modelSettings = body.modelSettings;
    } else if (Object.prototype.hasOwnProperty.call(body, 'model_settings')) {
    normalized.modelSettings = body.model_settings;
  }
  
  // Handle includeAttributeNotes (accept both formats, and normalize legacy include_attributes)
    if (Object.prototype.hasOwnProperty.call(body, 'includeAttributeNotes')) {
    normalized.includeAttributeNotes = body.includeAttributeNotes;
    } else if (Object.prototype.hasOwnProperty.call(body, 'include_attributes')) {
    normalized.includeAttributeNotes = body.include_attributes;
  }
  
  // Handle includeName (accept both formats)
    if (Object.prototype.hasOwnProperty.call(body, 'includeName')) {
    normalized.includeName = body.includeName;
    } else if (Object.prototype.hasOwnProperty.call(body, 'include_name')) {
    normalized.includeName = body.include_name;
  }
  
  // Handle includeObservations (accept both formats)
    if (Object.prototype.hasOwnProperty.call(body, 'includeObservations')) {
    normalized.includeObservations = body.includeObservations;
    } else if (Object.prototype.hasOwnProperty.call(body, 'include_observations')) {
    normalized.includeObservations = body.include_observations;
  }

  // NOTE: include_rules and include_custom_attributes are UI-only fields not stored in Firestore
  
  // Generate key from title if missing
  if (!normalized.key && normalized.title) {
    normalized.key = normalized.title
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, '_')
      .replace(/^_+|_+$/g, '');
  }
  
  console.log('✅ NORMALIZED BODY:', normalized);
  return normalized;
}

/**
 * Recursively remove undefined values from objects (Firestore rejects undefined)
 * This prevents 500 errors when objects contain undefined fields
 * 
 * IMPORTANT: Preserves Firestore special types:
 * - Timestamp objects (from firebase-admin/firestore)
 * - Date objects
 * - FieldValue sentinels (if used)
 */
function stripUndefinedDeep(obj: any): any {
  if (obj === null || obj === undefined) return null;
  
  // Preserve Firestore Timestamp objects - they have a toDate() method
  if (typeof obj === 'object' && typeof obj.toDate === 'function') {
    return obj;
  }
  
  // Preserve Date objects
  if (obj instanceof Date) {
    return obj;
  }
  
  if (typeof obj !== 'object') return obj;
  if (Array.isArray(obj)) {
    return obj.map(item => stripUndefinedDeep(item)).filter(item => item !== undefined);
  }
  
  const cleaned: any = {};
  for (const [key, value] of Object.entries(obj)) {
    if (value !== undefined) {
      cleaned[key] = stripUndefinedDeep(value);
    }
  }
  
  // Log what was stripped (only if there were undefined values)
  const originalKeys = Object.keys(obj);
  const cleanedKeys = Object.keys(cleaned);
  if (originalKeys.length !== cleanedKeys.length) {
    const strippedKeys = originalKeys.filter(k => !cleanedKeys.includes(k));
    console.log('🧹 STRIPPED UNDEFINED KEYS:', strippedKeys);
  }
  
  return cleaned;
}

/**
 * Admin AI Describe Settings Endpoints
 * 
 * Provides CRUD operations for:
 * - Attribute aiInput flag management
 * - AI Template management (priority, includeObservations, includeAttributeNotes)
 * 
 * Routes:
 * - PATCH /admin/attributes/:attributeId/ai-input - Update aiInput flag
 * - GET /admin/ai-templates - List all AI templates
 * - POST /admin/ai-templates - Create new AI template
 * - GET /admin/ai-templates/:templateKey - Get specific template
 * - PATCH /admin/ai-templates/:templateKey - Update template
 * - DELETE /admin/ai-templates/:templateKey - Delete template
 */

/**
 * PATCH /admin/attributes/:attributeId/ai-input
 * Update aiInput flag for specific attribute
 */
export async function updateAttributeAiInputHandler(req: Request, res: Response) {
  try {
    const attributeId = req.params.attributeId;
    const { aiInput } = req.body;
    
    if (!attributeId) {
      return res.status(400).json({
        status: 'error',
        message: 'missing attributeId parameter'
      });
    }
    
    if (typeof aiInput !== 'boolean') {
      return res.status(400).json({
        status: 'error',
        message: 'aiInput must be a boolean value'
      });
    }
    
    // Check if attribute exists
    const attrDoc = await getDb().collection('registry').doc(attributeId).get();
    if (!attrDoc.exists) {
      return res.status(404).json({
        status: 'error',
        message: `attribute '${attributeId}' not found`
      });
    }
    
    // Update aiInput flag
    await getDb().collection('registry').doc(attributeId).update({
      aiInput,
      updatedAt: Timestamp.now(),
      updatedBy: req.user?.uid
    });
    
    // Clear registry cache to pick up changes
    clearRegistryCache();
    
    // Write admin action log
    await getDb().collection('admin_action_log').add({
      action: 'update_attribute_ai_input',
      attributeId,
      aiInput,
      userId: req.user?.uid,
      timestamp: getDb().Timestamp.now(),
      type: 'attribute_management'
    });
    
    logger.info('Attribute aiInput flag updated', {
      attributeId,
      aiInput,
      userId: req.user?.uid
    });
    
    return res.json({
      status: 'ok',
      message: `aiInput flag for '${attributeId}' updated to ${aiInput}`
    });
    
  } catch (error) {
    logger.error('Error updating attribute aiInput flag', {
      error: error instanceof Error ? error.message : 'Unknown error',
      stack: error instanceof Error ? error.stack : undefined,
      attributeId: req.params.attributeId,
      userId: req.user?.uid
    });
    
    return res.status(500).json({
      status: 'error',
      code: 'INTERNAL_ERROR',
      message: 'Failed to update aiInput flag'
    });
  }
}

/**
 * GET /admin/ai-templates
 * List all AI templates with pagination
 */
export async function listAITemplatesHandler(req: Request, res: Response) {
  try {
    const limit = parseInt(req.query.limit as string) || 50;
    const offset = parseInt(req.query.offset as string) || 0;
    
    // Query only by priority to avoid composite index requirement
    let query = getDb().collection('ai_templates')
      .orderBy('priority', 'desc');
    
    if (offset > 0) {
      // For pagination, you'd typically use startAfter with a document snapshot
      // This is a simplified version
      query = query.offset(offset);
    }
    
    query = query.limit(limit);
    
    const snapshot = await query.get();
    
    // Get templates and sort in memory by priority (desc) then key (asc)
    const templates = snapshot.docs.map(doc => {
      const data = doc.data();
      return {
        key: doc.id,
        title: data.title || doc.id,
        status: data.status || 'active',
        priority: data.priority || 0,
        site: data.site || null,
        conditions: data.conditions || [],
        requiredAttributes: data.requiredAttributes || [],
        // Legacy UI field names for compatibility
        prompt_body: data.prompt || '',
        model_settings: {
          model: data.modelSettings?.model || 'gemini-1.5-flash',
          max_tokens: data.modelSettings?.max_tokens || 1024,
          temperature: data.modelSettings?.temperature || 0.7
        },
        include_attributes: data.includeAttributeNotes || false,
        include_name: data.includeName || false,
        include_observations: data.includeObservations || false,
        includeObservations: data.includeObservations || false,
        includeAttributeNotes: data.includeAttributeNotes || false
      };
    }).sort((a, b) => {
      // First sort by priority (desc)
      if (b.priority !== a.priority) {
        return (b.priority || 0) - (a.priority || 0);
      }
      // Then sort by key (asc) for consistent ordering
      return (a.key || '').localeCompare(b.key || '');
    });
    
    return res.json({
      status: 'ok',
      templates,
      pagination: {
        limit,
        offset,
        total: snapshot.size,
        hasMore: snapshot.size === limit
      }
    });
    
  } catch (error) {
    logger.error('Error listing AI templates', {
      error: error instanceof Error ? error.message : 'Unknown error',
      stack: error instanceof Error ? error.stack : undefined,
      userId: req.user?.uid
    });
    
    return res.status(500).json({
      status: 'error',
      code: 'INTERNAL_ERROR',
      message: 'Failed to list AI templates'
    });
  }
}

/**
 * POST /admin/ai-templates
 * Create new AI template
 */
export async function createAITemplateHandler(req: Request, res: Response) {
  try {
    console.log('📝 CREATE TEMPLATE REQUEST:', {
      body: req.body,
      userId: req.user?.uid
    });
    
    // Normalize legacy UI field names to canonical backend names
    const normalizedBody = normalizeTemplateFields(req.body);
    
    console.log('🔄 NORMALIZED BODY:', normalizedBody);
    
    const {
      key,
      title,
      status = 'active',
      priority = 0,
      site,
      includeObservations = false,
      includeAttributeNotes = false,
      includeName = false,
      requiredAttributes = [],
      conditions = [],
      prompt,
      modelSettings = {}
    } = normalizedBody;
    
    if (!key || typeof key !== 'string') {
      console.warn('⚠️ VALIDATION FAILED: Missing or invalid key', { key, type: typeof key });
      return res.status(400).json({
        status: 'error',
        message: 'key is required and must be a string'
      });
    }
    
    if (!prompt || typeof prompt !== 'string') {
      console.warn('⚠️ VALIDATION FAILED: Missing or invalid prompt', { prompt, type: typeof prompt });
      return res.status(400).json({
        status: 'error',
        message: 'prompt is required and must be a string'
      });
    }
    
    // Check if template key already exists
    const existingDoc = await getDb().collection('ai_templates').doc(key).get();
    if (existingDoc.exists) {
      return res.status(409).json({
        status: 'error',
        message: `template with key '${key}' already exists`
      });
    }
    
    const templateData = {
      key,
      title: title || key,
      status: status || 'active',
      priority: typeof priority === 'number' ? priority : 0,
      site: site || null,
      includeObservations: Boolean(includeObservations),
      includeAttributeNotes: Boolean(includeAttributeNotes),
      includeName: Boolean(includeName),
      requiredAttributes: Array.isArray(requiredAttributes) ? requiredAttributes : [],
      conditions: Array.isArray(conditions) ? conditions : [],
      prompt: prompt || '',  // Ensure prompt is never undefined
      modelSettings: (typeof modelSettings === 'object' && modelSettings !== null) ? modelSettings : {},
      createdAt: Timestamp.now(),
      createdBy: req.user?.uid,
      updatedAt: Timestamp.now(),
      updatedBy: req.user?.uid
    };
    
    // Strip undefined values from nested objects before Firestore write (Firestore rejects undefined)
    const cleanedTemplateData = stripUndefinedDeep(templateData);
    
    await getDb().collection('ai_templates').doc(key).set(cleanedTemplateData);
    
    // Clear templates cache
    clearTemplatesCache();
    
    // Write admin action log
    await getDb().collection('admin_action_log').add({
      action: 'create_ai_template',
      templateKey: key,
      templateData: cleanedTemplateData,
      userId: req.user?.uid,
      timestamp: Timestamp.now(),
      type: 'ai_template_management'
    });
    
    logger.info('AI template created', {
      key,
      priority,
      site,
      userId: req.user?.uid
    });
    
    return res.status(201).json({
      status: 'ok',
      template: templateData
    });
    
  } catch (error) {
    const errorMsg = error instanceof Error ? error.message : 'Unknown error';
    const errorStack = error instanceof Error ? error.stack : undefined;
    
    // Log to both structured logger and console for visibility
    console.error('❌ CREATE TEMPLATE ERROR:', {
      message: errorMsg,
      stack: errorStack,
      requestBody: req.body,
      userId: req.user?.uid
    });
    
    logger.error('Error creating AI template', {
      error: errorMsg,
      stack: errorStack,
      key: req.body.key,
      userId: req.user?.uid
    });
    
    return res.status(500).json({
      status: 'error',
      code: 'INTERNAL_ERROR',
      message: 'Failed to create AI template'
    });
  }
}

/**
 * GET /admin/ai-templates/:templateKey
 * Get specific AI template
 */
export async function getAITemplateHandler(req: Request, res: Response) {
  try {
    const templateKey = req.params.templateKey;
    
    const doc = await getDb().collection('ai_templates').doc(templateKey).get();
    
    if (!doc.exists) {
      return res.status(404).json({
        status: 'error',
        message: `template '${templateKey}' not found`
      });
    }
    
    const data = doc.data();
    
    // Convert backend format to UI format for compatibility
    const template = {
      key: doc.id,
      title: data?.title || doc.id,
      status: data?.status || 'active',
      priority: data?.priority || 0,
      site: data?.site || null,
      conditions: data?.conditions || [],
      requiredAttributes: data?.requiredAttributes || [],
      // Legacy UI field names
      prompt_body: data?.prompt || '',
      model_settings: {
        model: data?.modelSettings?.model || 'gemini-1.5-flash',
        max_tokens: data?.modelSettings?.max_tokens || 1024,
        temperature: data?.modelSettings?.temperature || 0.7
      },
      include_attributes: data?.includeAttributeNotes || false,
      include_name: data?.includeName || false,
      include_observations: data?.includeObservations || false,
      include_rules: false,
      include_custom_attributes: false
    };
    
    return res.json({
      status: 'ok',
      template
    });
    
  } catch (error) {
    logger.error('Error getting AI template', {
      error: error.message,
      templateKey: req.params.templateKey,
      userId: req.user?.uid
    });
    
    return res.status(500).json({
      status: 'error',
      code: 'INTERNAL_ERROR',
      message: 'Failed to get AI template'
    });
  }
}

/**
 * PATCH /admin/ai-templates/:templateKey
 * Update existing AI template
 */
export async function updateAITemplateHandler(req: Request, res: Response) {
  try {
    const templateKey = req.params.templateKey;
    
    // Normalize legacy UI field names to canonical backend names
    const normalizedBody = normalizeTemplateFields(req.body);
    
    // Check if template exists
    const doc = await getDb().collection('ai_templates').doc(templateKey).get();
    if (!doc.exists) {
      return res.status(404).json({
        status: 'error',
        message: `template '${templateKey}' not found`
      });
    }
    
    // Sanitize updates
    const allowedFields = [
      'title', 'status', 'priority', 'site', 'includeObservations', 'includeAttributeNotes',
      'requiredAttributes', 'conditions', 'prompt', 'modelSettings', 'includeName'
    ];
    
    const sanitizedUpdates: any = {
      updatedAt: Timestamp.now(),
      updatedBy: req.user?.uid
    };
    
    allowedFields.forEach(field => {
      if (normalizedBody.hasOwnProperty(field)) {
        sanitizedUpdates[field] = normalizedBody[field];
      }
    });
    
    if (Object.keys(sanitizedUpdates).length <= 2) {
      return res.status(400).json({
        status: 'error',
        message: 'no valid fields to update'
      });
    }
    
    // Strip undefined values from nested objects before Firestore write (Firestore rejects undefined)
    const cleanedUpdates = stripUndefinedDeep(sanitizedUpdates);
    
    await getDb().collection('ai_templates').doc(templateKey).update(cleanedUpdates);
    
    // Clear templates cache
    clearTemplatesCache();
    
    // Write admin action log
    await getDb().collection('admin_action_log').add({
      action: 'update_ai_template',
      templateKey,
      updates: cleanedUpdates,
      userId: req.user?.uid,
      timestamp: Timestamp.now(),
      type: 'ai_template_management'
    });
    
    logger.info('AI template updated', {
      templateKey,
      updatedFields: Object.keys(sanitizedUpdates),
      userId: req.user?.uid
    });
    
    return res.json({
      status: 'ok',
      message: `template '${templateKey}' updated successfully`
    });
    
  } catch (error) {
    const errorMsg = error instanceof Error ? error.message : 'Unknown error';
    const errorStack = error instanceof Error ? error.stack : undefined;
    
    console.error('❌ UPDATE TEMPLATE ERROR:', {
      message: errorMsg,
      stack: errorStack,
      templateKey: req.params.templateKey,
      requestBody: req.body,
      userId: req.user?.uid
    });
    
    logger.error('Error updating AI template', {
      error: errorMsg,
      stack: errorStack,
      templateKey: req.params.templateKey,
      userId: req.user?.uid
    });
    
    return res.status(500).json({
      status: 'error',
      code: 'INTERNAL_ERROR',
      message: 'Failed to update AI template'
    });
  }
}

/**
 * DELETE /admin/ai-templates/:templateKey
 * Delete AI template
 */
export async function deleteAITemplateHandler(req: Request, res: Response) {
  try {
    const templateKey = req.params.templateKey;
    
    // Check if template exists
    const doc = await getDb().collection('ai_templates').doc(templateKey).get();
    if (!doc.exists) {
      return res.status(404).json({
        status: 'error',
        message: `template '${templateKey}' not found`
      });
    }
    
    // Don't allow deletion of 'default' template
    if (templateKey === 'default') {
      return res.status(400).json({
        status: 'error',
        message: 'cannot delete the default template'
      });
    }
    
    await getDb().collection('ai_templates').doc(templateKey).delete();
    
    // Clear templates cache
    clearTemplatesCache();
    
    // Write admin action log
    await getDb().collection('admin_action_log').add({
      action: 'delete_ai_template',
      templateKey,
      userId: req.user?.uid,
      timestamp: Timestamp.now(),
      type: 'ai_template_management'
    });
    
    logger.info('AI template deleted', {
      templateKey,
      userId: req.user?.uid
    });
    
    return res.json({
      status: 'ok',
      message: `template '${templateKey}' deleted successfully`
    });
    
  } catch (error) {
    logger.error('Error deleting AI template', {
      error: error instanceof Error ? error.message : 'Unknown error',
      stack: error instanceof Error ? error.stack : undefined,
      templateKey: req.params.templateKey,
      userId: req.user?.uid
    });
    
    return res.status(500).json({
      status: 'error',
      code: 'INTERNAL_ERROR',
      message: 'Failed to delete AI template'
    });
  }
}

export default {
  updateAttributeAiInputHandler,
  listAITemplatesHandler,
  createAITemplateHandler,
  getAITemplateHandler,
  updateAITemplateHandler,
  deleteAITemplateHandler
};