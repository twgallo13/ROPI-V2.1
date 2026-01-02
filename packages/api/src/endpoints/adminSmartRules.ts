/**
 * Admin Smart Rules Endpoints
 * LP-smart-rules-server-validation-1.0.0
 * 
 * Server-side validation endpoint for Smart Rules payloads.
 * Uses SDK schema as canonical validation source.
 */

import type { Request, Response } from 'express';
import * as admin from 'firebase-admin';
import { requireAdmin } from '../middleware/auth';
import { validateSmartRule, RuleSchema } from '@ropi-aoss/sdk';
import { processImportWithSmartRules } from '../functions/smartRulesImport';
import type { ImportRow, Product } from '../lib/smartEngineV2';

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
/**
 * GET /admin/import-eval/:productId
 * 
 * LP-smart-rules-mpn-1.0.0: Debug endpoint to show rule evaluation for a product.
 * Returns what rules would match and what actions would be suggested.
 */
export async function getImportEvalHandler(req: Request, res: Response) {
  await requireAdmin(req, res, async () => {
    try {
      const productId = req.params.productId;
      
      if (!productId) {
        res.status(400).json({ 
          error: 'MISSING_PRODUCT_ID', 
          message: 'Product ID is required' 
        });
        return;
      }
      
      const db = admin.firestore();
      
      // Fetch product
      const productDoc = await db.collection('products').doc(productId).get();
      
      if (!productDoc.exists) {
        res.status(404).json({ 
          error: 'PRODUCT_NOT_FOUND', 
          message: `Product ${productId} not found` 
        });
        return;
      }
      
      const productData = productDoc.data()!;
      
      // Build import row from existing product
      const normalizedData: Record<string, unknown> = {
        ...productData.core,
        ...productData.attributes,
      };
      
      // Build source data (RICS fields)
      const sourceData: ImportRow['source'] = {
        rics: {
          category: productData.attributes?.rics_category || productData.attributes?.category || '',
          color: productData.attributes?.rics_color || productData.attributes?.color || '',
          shortDescription: productData.attributes?.rics_short_description || '',
          longDescription: productData.attributes?.rics_long_desc || '',
        },
      };
      
      // Build existing product for conflict checking
      const existingProduct: Product = {
        productId: productDoc.id,
        attributes: productData.attributes || {},
        provenance: productData.provenance || {},
        _smartRulesSkipUntil: productData._smartRulesSkipUntil,
      };
      
      // Run Smart Rules evaluation (without applying)
      const result = await processImportWithSmartRules(
        productDoc.id,
        normalizedData,
        sourceData,
        existingProduct
      );
      
      // Return detailed evaluation result
      res.status(200).json({
        productId: productDoc.id,
        evaluatedAt: new Date().toISOString(),
        skipped: result.skipped,
        skipReason: result.skipReason,
        suggestions: result.suggestions.map(s => ({
          ruleId: s.ruleId,
          ruleName: s.ruleName,
          targetField: s.targetField,
          suggestedValue: s.suggestedValue,
          confidence: s.confidence,
          rationale: s.rationale,
        })),
        autoApplied: result.autoApplied.map(a => ({
          ruleId: a.ruleId,
          ruleName: a.ruleName,
          targetField: a.targetField,
          value: a.value,
          confidence: a.confidence,
        })),
        conflicts: result.conflicts.map(c => ({
          field: c.field,
          candidateRules: c.candidates.map(r => ({
            ruleId: r.ruleId,
            ruleName: r.ruleName,
            value: r.value,
            confidence: r.confidence,
          })),
        })),
        errors: result.errors,
        updates: result.updates,
        activityLog: result.activityLog,
        // Include product context for debugging
        productContext: {
          mpn: productData.core?.mpn || productData.mpn,
          rics_category: productData.attributes?.rics_category,
          current_department: productData.attributes?.department,
          provenance: productData.provenance?.attributes_department,
        },
      });
    } catch (err) {
      const message = err instanceof Error ? err.message : String(err);
      console.error('[getImportEval] Error:', err);
      res.status(500).json({ error: 'INTERNAL_ERROR', message });
    }
  });
}