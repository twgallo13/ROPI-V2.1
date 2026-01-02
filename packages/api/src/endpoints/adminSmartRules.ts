/**
 * Admin Smart Rules Endpoints
 * LP-smart-rules-server-validation-1.0.0
 * 
 * Server-side validation endpoint for Smart Rules payloads.
 * Uses SDK schema as canonical validation source.
 */

import type { Request, Response } from 'express';
import { requireAdmin } from '../middleware/auth';
import { validateSmartRule, RuleSchema } from '@ropi-aoss/sdk';

/**
 * POST /admin/validateSmartRule
 * 
 * Server-side validation of Smart Rule payload.
 * Returns { valid: true } on success or { valid: false, error, issues } on failure.
 */
export async function validateSmartRuleHandler(req: Request, res: Response) {
  await requireAdmin(req, res, async () => {
    try {
      const payload = req.body;
      
      if (!payload || typeof payload !== 'object') {
        res.status(400).json({ 
          valid: false, 
          error: 'INVALID_PAYLOAD', 
          message: 'Request body must be a JSON object' 
        });
        return;
      }

      // Use SDK validation; parse will throw ZodError with issues
      validateSmartRule(payload);
      
      res.status(200).json({ valid: true });
    } catch (err: unknown) {
      // Handle Zod validation errors
      if (err && typeof err === 'object' && 'errors' in err) {
        const zodError = err as { errors: Array<{ path: (string|number)[]; message: string }> };
        res.status(400).json({ 
          valid: false, 
          error: 'INVALID_RULE_PAYLOAD', 
          issues: zodError.errors.map(e => ({
            path: e.path.join('.'),
            message: e.message,
          }))
        });
        return;
      }
      
      // Handle Zod error with issues array
      if (err && typeof err === 'object' && 'issues' in err) {
        const zodError = err as { issues: Array<{ path: (string|number)[]; message: string }> };
        res.status(400).json({ 
          valid: false, 
          error: 'INVALID_RULE_PAYLOAD', 
          issues: zodError.issues.map(e => ({
            path: e.path.join('.'),
            message: e.message,
          }))
        });
        return;
      }
      
      // Generic error
      const message = err instanceof Error ? err.message : String(err);
      console.error('[validateSmartRule] Internal error:', err);
      res.status(500).json({ 
        valid: false, 
        error: 'INTERNAL_ERROR', 
        message 
      });
    }
  });
}

/**
 * POST /admin/normalizeSmartRule
 * 
 * Normalize a Smart Rule payload and return the cleaned version.
 * Useful for debugging and preview before save.
 */
export async function normalizeSmartRuleHandler(req: Request, res: Response) {
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

      // Parse and normalize using RuleSchema transform
      const normalized = RuleSchema.parse(payload);
      
      res.status(200).json({ normalized });
    } catch (err: unknown) {
      // Handle Zod validation errors
      if (err && typeof err === 'object' && 'issues' in err) {
        const zodError = err as { issues: Array<{ path: (string|number)[]; message: string }> };
        res.status(400).json({ 
          error: 'INVALID_RULE_PAYLOAD', 
          issues: zodError.issues.map(e => ({
            path: e.path.join('.'),
            message: e.message,
          }))
        });
        return;
      }
      
      const message = err instanceof Error ? err.message : String(err);
      console.error('[normalizeSmartRule] Internal error:', err);
      res.status(500).json({ error: 'INTERNAL_ERROR', message });
    }
  });
}
