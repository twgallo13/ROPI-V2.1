// packages/api/src/endpoints/admin/aiDescribeSettings.ts
import { Request, Response } from 'express';
import { getFirestore } from 'firebase-admin/firestore';
import { logger } from '../../lib/logger';
import { clearRegistryCache, clearTemplatesCache } from '../../lib/settingsHelpers';

const firestore = getFirestore();

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
    const attrDoc = await firestore.collection('registry').doc(attributeId).get();
    if (!attrDoc.exists) {
      return res.status(404).json({
        status: 'error',
        message: `attribute '${attributeId}' not found`
      });
    }
    
    // Update aiInput flag
    await firestore.collection('registry').doc(attributeId).update({
      aiInput,
      updatedAt: firestore.Timestamp.now(),
      updatedBy: req.user?.uid
    });
    
    // Clear registry cache to pick up changes
    clearRegistryCache();
    
    // Write admin action log
    await firestore.collection('admin_action_log').add({
      action: 'update_attribute_ai_input',
      attributeId,
      aiInput,
      userId: req.user?.uid,
      timestamp: firestore.Timestamp.now(),
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
      error: error.message,
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
    
    let query = firestore.collection('ai_templates')
      .orderBy('priority', 'desc')
      .orderBy('key', 'asc');
    
    if (offset > 0) {
      // For pagination, you'd typically use startAfter with a document snapshot
      // This is a simplified version
      query = query.offset(offset);
    }
    
    query = query.limit(limit);
    
    const snapshot = await query.get();
    
    const templates = snapshot.docs.map(doc => ({
      key: doc.id,
      ...doc.data()
    }));
    
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
      error: error.message,
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
    const {
      key,
      priority = 0,
      site,
      includeObservations = false,
      includeAttributeNotes = false,
      requiredAttributes = [],
      conditions = [],
      prompt,
      modelSettings = {}
    } = req.body;
    
    if (!key || typeof key !== 'string') {
      return res.status(400).json({
        status: 'error',
        message: 'key is required and must be a string'
      });
    }
    
    if (!prompt || typeof prompt !== 'string') {
      return res.status(400).json({
        status: 'error',
        message: 'prompt is required and must be a string'
      });
    }
    
    // Check if template key already exists
    const existingDoc = await firestore.collection('ai_templates').doc(key).get();
    if (existingDoc.exists) {
      return res.status(409).json({
        status: 'error',
        message: `template with key '${key}' already exists`
      });
    }
    
    const templateData = {
      key,
      priority: typeof priority === 'number' ? priority : 0,
      site: site || null,
      includeObservations: Boolean(includeObservations),
      includeAttributeNotes: Boolean(includeAttributeNotes),
      requiredAttributes: Array.isArray(requiredAttributes) ? requiredAttributes : [],
      conditions: Array.isArray(conditions) ? conditions : [],
      prompt,
      modelSettings: typeof modelSettings === 'object' ? modelSettings : {},
      createdAt: firestore.Timestamp.now(),
      createdBy: req.user?.uid,
      updatedAt: firestore.Timestamp.now(),
      updatedBy: req.user?.uid
    };
    
    await firestore.collection('ai_templates').doc(key).set(templateData);
    
    // Clear templates cache
    clearTemplatesCache();
    
    // Write admin action log
    await firestore.collection('admin_action_log').add({
      action: 'create_ai_template',
      templateKey: key,
      templateData,
      userId: req.user?.uid,
      timestamp: firestore.Timestamp.now(),
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
    logger.error('Error creating AI template', {
      error: error.message,
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
    
    const doc = await firestore.collection('ai_templates').doc(templateKey).get();
    
    if (!doc.exists) {
      return res.status(404).json({
        status: 'error',
        message: `template '${templateKey}' not found`
      });
    }
    
    const template = {
      key: doc.id,
      ...doc.data()
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
    const updates = req.body;
    
    // Check if template exists
    const doc = await firestore.collection('ai_templates').doc(templateKey).get();
    if (!doc.exists) {
      return res.status(404).json({
        status: 'error',
        message: `template '${templateKey}' not found`
      });
    }
    
    // Sanitize updates
    const allowedFields = [
      'priority', 'site', 'includeObservations', 'includeAttributeNotes',
      'requiredAttributes', 'conditions', 'prompt', 'modelSettings'
    ];
    
    const sanitizedUpdates: any = {
      updatedAt: firestore.Timestamp.now(),
      updatedBy: req.user?.uid
    };
    
    allowedFields.forEach(field => {
      if (updates.hasOwnProperty(field)) {
        sanitizedUpdates[field] = updates[field];
      }
    });
    
    if (Object.keys(sanitizedUpdates).length <= 2) {
      return res.status(400).json({
        status: 'error',
        message: 'no valid fields to update'
      });
    }
    
    await firestore.collection('ai_templates').doc(templateKey).update(sanitizedUpdates);
    
    // Clear templates cache
    clearTemplatesCache();
    
    // Write admin action log
    await firestore.collection('admin_action_log').add({
      action: 'update_ai_template',
      templateKey,
      updates: sanitizedUpdates,
      userId: req.user?.uid,
      timestamp: firestore.Timestamp.now(),
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
    logger.error('Error updating AI template', {
      error: error.message,
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
    const doc = await firestore.collection('ai_templates').doc(templateKey).get();
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
    
    await firestore.collection('ai_templates').doc(templateKey).delete();
    
    // Clear templates cache
    clearTemplatesCache();
    
    // Write admin action log
    await firestore.collection('admin_action_log').add({
      action: 'delete_ai_template',
      templateKey,
      userId: req.user?.uid,
      timestamp: firestore.Timestamp.now(),
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
      error: error.message,
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