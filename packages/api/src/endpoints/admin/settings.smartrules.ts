/**
 * Admin Settings Endpoints — SmartRules & AITemplate
 * Per AOSS Section 2.3 & 4.x
 * 
 * Express handlers for SmartRules and AITemplate CRUD operations.
 * All routes require admin authentication via requireAdmin middleware.
 * 
 * Lisa v0.2.0-rc2
 */

import { Request, Response } from 'express';
import * as smartRulesService from '../../services/smartRulesService';
import * as aiTemplateService from '../../services/aiTemplateService';

// ============================================================================
// SmartRules Handlers
// ============================================================================

/**
 * GET /admin/settings/smartrules
 * List all smart rules with pagination
 */
export async function listSmartRulesHandler(req: Request, res: Response): Promise<void> {
  try {
    const { limit, pageToken, q, enabled } = req.query;
    const result = await smartRulesService.listSmartRules({
      limit: limit ? parseInt(limit as string, 10) : undefined,
      pageToken: pageToken as string,
      q: q as string,
      enabled: enabled === 'true' ? true : enabled === 'false' ? false : undefined,
    });
    res.json(result);
  } catch (error: any) {
    res.status(error.statusCode || 500).json({ error: error.message });
  }
}

/**
 * GET /admin/settings/smartrules/:ruleId
 * Get a single smart rule by ID
 */
export async function getSmartRuleHandler(req: Request, res: Response): Promise<void> {
  try {
    const { ruleId } = req.params;
    const rule = await smartRulesService.getSmartRule(ruleId);
    res.json(rule);
  } catch (error: any) {
    res.status(error.statusCode || 500).json({ error: error.message });
  }
}

/**
 * POST /admin/settings/smartrules
 * Create a new smart rule
 */
export async function createSmartRuleHandler(req: Request, res: Response): Promise<void> {
  try {
    const userId = (req as any).user?.uid || 'anonymous';
    const rule = await smartRulesService.createSmartRule(req.body, userId);
    res.status(201).json(rule);
  } catch (error: any) {
    res.status(error.statusCode || 500).json({ error: error.message });
  }
}

/**
 * PUT /admin/settings/smartrules/:ruleId
 * Update an existing smart rule
 */
export async function updateSmartRuleHandler(req: Request, res: Response): Promise<void> {
  try {
    const { ruleId } = req.params;
    const userId = (req as any).user?.uid || 'anonymous';
    const rule = await smartRulesService.updateSmartRule(ruleId, req.body, userId);
    res.json(rule);
  } catch (error: any) {
    res.status(error.statusCode || 500).json({ error: error.message });
  }
}

/**
 * DELETE /admin/settings/smartrules/:ruleId
 * Delete a smart rule
 */
export async function deleteSmartRuleHandler(req: Request, res: Response): Promise<void> {
  try {
    const { ruleId } = req.params;
    await smartRulesService.deleteSmartRule(ruleId);
    res.status(204).send();
  } catch (error: any) {
    res.status(error.statusCode || 500).json({ error: error.message });
  }
}

// ============================================================================
// AITemplate Handlers
// ============================================================================

/**
 * GET /admin/settings/aitemplates
 * List all AI templates with pagination
 */
export async function listAITemplatesHandler(req: Request, res: Response): Promise<void> {
  try {
    const { limit, pageToken, q, status, scope } = req.query;
    const result = await aiTemplateService.listAITemplates({
      limit: limit ? parseInt(limit as string, 10) : undefined,
      pageToken: pageToken as string,
      q: q as string,
      status: status as 'active' | 'draft' | 'disabled',
      scope: scope as 'global' | 'store' | 'brand',
    });
    res.json(result);
  } catch (error: any) {
    res.status(error.statusCode || 500).json({ error: error.message });
  }
}

/**
 * GET /admin/settings/aitemplates/:templateKey
 * Get a single AI template by key
 */
export async function getAITemplateHandler(req: Request, res: Response): Promise<void> {
  try {
    const { templateKey } = req.params;
    const template = await aiTemplateService.getAITemplate(templateKey);
    res.json(template);
  } catch (error: any) {
    res.status(error.statusCode || 500).json({ error: error.message });
  }
}

/**
 * POST /admin/settings/aitemplates
 * Create a new AI template
 */
export async function createAITemplateHandler(req: Request, res: Response): Promise<void> {
  try {
    const userId = (req as any).user?.uid || 'anonymous';
    const template = await aiTemplateService.createAITemplate(req.body, userId);
    res.status(201).json(template);
  } catch (error: any) {
    res.status(error.statusCode || 500).json({ error: error.message });
  }
}

/**
 * PUT /admin/settings/aitemplates/:templateKey
 * Update an existing AI template
 */
export async function updateAITemplateHandler(req: Request, res: Response): Promise<void> {
  try {
    const { templateKey } = req.params;
    const userId = (req as any).user?.uid || 'anonymous';
    const template = await aiTemplateService.updateAITemplate(templateKey, req.body, userId);
    res.json(template);
  } catch (error: any) {
    res.status(error.statusCode || 500).json({ error: error.message });
  }
}

/**
 * DELETE /admin/settings/aitemplates/:templateKey
 * Delete an AI template
 */
export async function deleteAITemplateHandler(req: Request, res: Response): Promise<void> {
  try {
    const { templateKey } = req.params;
    await aiTemplateService.deleteAITemplate(templateKey);
    res.status(204).send();
  } catch (error: any) {
    res.status(error.statusCode || 500).json({ error: error.message });
  }
}
