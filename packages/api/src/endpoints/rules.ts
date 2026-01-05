/**
 * Smart Rules CRUD API Endpoints
 * Server-side validation for rule operations
 */

import type { Request, Response } from 'express';
import * as admin from 'firebase-admin';
import { requireAdmin, type AuthenticatedRequest } from '../middleware/auth';
import { validateSmartRule } from '@ropi-aoss/sdk';

const SMART_RULES_COLLECTION = 'settings/smartRules/rules';

// Validate action has required fields
function validateRuleAction(action: any): { valid: boolean; error?: string } {
  if (!action || typeof action !== 'object') {
    return { valid: false, error: 'RULE_INVALID_ACTION: Action is required' };
  }
  
  if (!action.targetField || typeof action.targetField !== 'string' || action.targetField.trim() === '') {
    return { valid: false, error: 'RULE_INVALID_ACTION: Action missing targetField' };
  }
  
  if (!action.valueTemplate || typeof action.valueTemplate !== 'string' || action.valueTemplate.trim() === '') {
    return { valid: false, error: 'RULE_INVALID_ACTION: Action missing valueTemplate' };
  }
  
  // Validate onlyIfEmpty if present
  if (action.onlyIfEmpty !== undefined && typeof action.onlyIfEmpty !== 'boolean') {
    return { valid: false, error: 'RULE_INVALID_ACTION: onlyIfEmpty must be boolean if provided' };
  }
  
  return { valid: true };
}

/**
 * POST /admin/rules
 * Create a new Smart Rule
 */
export async function createRuleHandler(req: Request, res: Response) {
  await requireAdmin(req, res, async () => {
    try {
      const payload = req.body;
      
      if (!payload || typeof payload !== 'object') {
        res.status(400).json({ 
          error: 'INVALID_PAYLOAD', 
          message: 'Request body must be a JSON object' 
        });
        return;
      }

      // Validate action fields
      const actionValidation = validateRuleAction(payload.action);
      if (!actionValidation.valid) {
        res.status(400).json({ 
          error: 'RULE_INVALID_ACTION',
          message: actionValidation.error 
        });
        return;
      }

      // Use SDK validation
      try {
        validateSmartRule(payload);
      } catch (err: any) {
        res.status(400).json({ 
          error: 'RULE_INVALID_ACTION', 
          message: 'Rule validation failed',
          issues: err.issues || err.errors || [{ message: err.message }]
        });
        return;
      }
      
      // Generate rule ID
      const ruleId = payload.ruleId || `rule_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`;
      const now = admin.firestore.Timestamp.now();
      
      // Prepare rule document
      const ruleData = {
        ...payload,
        ruleId,
        createdAt: now,
        updatedAt: now,
        createdBy: (req as AuthenticatedRequest).auth?.uid || 'system',
        updatedBy: (req as AuthenticatedRequest).auth?.uid || 'system',
      };
      
      // Ensure onlyIfEmpty is properly set
      if (ruleData.action) {
        ruleData.action.onlyIfEmpty = !!ruleData.action.onlyIfEmpty;
      }
      
      // Write to Firestore
      await admin.firestore().collection(SMART_RULES_COLLECTION).doc(ruleId).set(ruleData);
      
      res.status(201).json({ 
        success: true, 
        ruleId,
        message: 'Rule created successfully' 
      });
      
    } catch (err) {
      console.error('[createRule] Error:', err);
      res.status(500).json({ 
        error: 'INTERNAL_ERROR', 
        message: err instanceof Error ? err.message : String(err) 
      });
    }
  });
}

/**
 * PUT /admin/rules/:ruleId
 * Update an existing Smart Rule
 */
export async function updateRuleHandler(req: Request, res: Response) {
  await requireAdmin(req, res, async () => {
    try {
      const { ruleId } = req.params;
      const payload = req.body;
      
      if (!ruleId) {
        res.status(400).json({ 
          error: 'MISSING_RULE_ID', 
          message: 'Rule ID is required' 
        });
        return;
      }
      
      if (!payload || typeof payload !== 'object') {
        res.status(400).json({ 
          error: 'INVALID_PAYLOAD', 
          message: 'Request body must be a JSON object' 
        });
        return;
      }

      // Validate action fields if action is being updated
      if (payload.action) {
        const actionValidation = validateRuleAction(payload.action);
        if (!actionValidation.valid) {
          res.status(400).json({ 
            error: 'RULE_INVALID_ACTION',
            message: actionValidation.error 
          });
          return;
        }
      }

      // Get existing rule
      const ruleRef = admin.firestore().collection(SMART_RULES_COLLECTION).doc(ruleId);
      const existingRule = await ruleRef.get();
      
      if (!existingRule.exists) {
        res.status(404).json({ 
          error: 'RULE_NOT_FOUND', 
          message: `Rule ${ruleId} not found` 
        });
        return;
      }
      
      // Merge with existing data
      const updatedRule = {
        ...existingRule.data(),
        ...payload,
        ruleId, // Ensure ruleId stays the same
        updatedAt: admin.firestore.Timestamp.now(),
        updatedBy: (req as AuthenticatedRequest).auth?.uid || 'system',
      };
      
      // Validate merged rule
      try {
        validateSmartRule(updatedRule);
      } catch (err: any) {
        res.status(400).json({ 
          error: 'RULE_INVALID_ACTION', 
          message: 'Updated rule validation failed',
          issues: err.issues || err.errors || [{ message: err.message }]
        });
        return;
      }
      
      // Ensure onlyIfEmpty is properly set
      if (updatedRule.action) {
        updatedRule.action.onlyIfEmpty = !!updatedRule.action.onlyIfEmpty;
      }
      
      // Update in Firestore
      await ruleRef.set(updatedRule);
      
      res.status(200).json({ 
        success: true, 
        ruleId,
        message: 'Rule updated successfully' 
      });
      
    } catch (err) {
      console.error('[updateRule] Error:', err);
      res.status(500).json({ 
        error: 'INTERNAL_ERROR', 
        message: err instanceof Error ? err.message : String(err) 
      });
    }
  });
}