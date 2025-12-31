/**
 * Describe Endpoint
 * 
 * LP-obs-studio-cleanup-1.6.5: Aggregated multi-target describe API.
 * 
 * POST /api/products/:productId/describe
 * 
 * Generates AI descriptions for multiple target websites using
 * aggregated observations and product attributes.
 * 
 * Features:
 * - Multi-target generation in single request
 * - Aggregated observations per target
 * - SEO generation per target
 * - Backward compatible (aggregate=false for legacy mode)
 * 
 * References:
 * - Product Completion Workflows (W2): https://www.notion.so/2ba45ee1ec5a80698690f9492961ed8b
 */

import * as admin from 'firebase-admin';
import type { Request, Response } from 'express';
import { requireAdmin, type AuthenticatedRequest } from '../middleware/auth';

// ============================================
// Types
// ============================================

interface ObservationInput {
  id: string;
  tags: string[];
  text?: string;
}

interface ImageInput {
  thumb?: string;
  url: string;
}

interface DescribeRequestBody {
  targets: string[];
  audience: string;
  tone: string;
  observations: ObservationInput[];
  attributes: Record<string, unknown>;
  images?: ImageInput[];
  options?: {
    candidates?: number;
    aggregate?: boolean;
  };
}

interface CandidateMeta {
  observationsCount: number;
  tagsCount: number;
}

interface Candidate {
  id: string;
  text: string;
  meta: CandidateMeta;
}

interface SEOData {
  title: string;
  bullets: string[];
}

interface TargetResult {
  target: string;
  candidates: Candidate[];
  seo: SEOData;
  meta: {
    observationsCount: number;
    tagsCount: number;
  };
}

// ============================================
// Helper Functions
// ============================================

/**
 * Count unique tags from observations
 */
function countUniqueTags(observations: ObservationInput[]): number {
  const uniqueTags = new Set<string>();
  for (const obs of observations) {
    if (obs.tags) {
      obs.tags.forEach(tag => uniqueTags.add(tag.toLowerCase()));
    }
  }
  return uniqueTags.size;
}

/**
 * Generate a description for a specific target
 * In production, this would call an AI service
 */
function generateDescription(
  target: string,
  audience: string,
  tone: string,
  attributes: Record<string, unknown>,
  observations: ObservationInput[]
): string {
  const productName = String(attributes.name || attributes.title || 'Product');
  const brandName = String(attributes.brand || attributes.brand_name || '');
  const color = String(attributes.color || attributes.color_primary || '');
  const material = String(attributes.material || attributes.materials || '');

  // Collect all tags for context
  const allTags = new Set<string>();
  observations.forEach(obs => obs.tags?.forEach(tag => allTags.add(tag)));
  const tagContext = Array.from(allTags).slice(0, 5).join(', ');

  // Target-specific intros
  const targetIntros: Record<string, string> = {
    'shiekh.com': `Step up your sneaker game with the ${productName}`,
    'shiekh': `Step up your sneaker game with the ${productName}`,
    'karmaloop': `Level up your streetwear rotation with the ${productName}`,
    'karmaloop.com': `Level up your streetwear rotation with the ${productName}`,
    'mltd': `Elevate your style with the ${productName}`,
    'mltd.com': `Elevate your style with the ${productName}`,
  };

  // Tone modifiers
  const toneModifiers: Record<string, string> = {
    professional: 'Crafted with premium quality,',
    enthusiastic: 'Get ready to turn heads!',
    minimalist: 'Clean. Simple. Essential.',
    technical: 'Engineered for performance,',
    storytelling: 'Every step tells a story.',
  };

  const intro = targetIntros[target.toLowerCase()] || `Discover the ${productName}`;
  const modifier = toneModifiers[tone] || toneModifiers.professional;

  let description = intro;
  if (brandName) description += ` from ${brandName}`;
  description += `. ${modifier}`;
  if (color) description += ` Available in ${color}.`;
  if (material) description += ` Made with ${material}.`;
  if (tagContext) description += ` Features: ${tagContext}.`;
  description += ` Perfect for the ${audience.toLowerCase()} lifestyle.`;
  description += ` [AI-Generated: ${audience} template, ${tone} tone]`;

  return description;
}

/**
 * Generate SEO metadata for a target
 * In production, this would call an AI service
 */
function generateSEO(
  target: string,
  audience: string,
  attributes: Record<string, unknown>,
  observations: ObservationInput[]
): SEOData {
  const productName = String(attributes.name || attributes.title || 'Product');
  const brandName = String(attributes.brand || attributes.brand_name || '');
  const color = String(attributes.color || attributes.color_primary || '');
  const category = String(attributes.category || '');

  // Collect tags for bullets
  const allTags = new Set<string>();
  observations.forEach(obs => obs.tags?.forEach(tag => allTags.add(tag)));

  let title = productName;
  if (brandName) title = `${brandName} ${productName}`;
  title += ' | Shop Now';
  if (title.length > 60) title = title.substring(0, 57) + '...';

  const bullets: string[] = [];
  if (brandName) bullets.push(`Premium ${brandName} quality`);
  if (color) bullets.push(`Available in ${color}`);
  if (category) bullets.push(`Perfect ${category} choice`);
  allTags.forEach(tag => {
    if (bullets.length < 5) bullets.push(tag);
  });
  bullets.push('Free shipping on orders over $75');

  return { title, bullets };
}

/**
 * Generate candidate variations
 */
function generateCandidates(
  target: string,
  audience: string,
  tone: string,
  attributes: Record<string, unknown>,
  observations: ObservationInput[],
  count: number = 3
): Candidate[] {
  const candidates: Candidate[] = [];
  const observationsCount = observations.length;
  const tagsCount = countUniqueTags(observations);

  // Tone variations for different candidates
  const toneVariations = [tone, 'enthusiastic', 'professional', 'minimalist', 'storytelling'];

  for (let i = 0; i < count; i++) {
    const toneVariant = toneVariations[i % toneVariations.length];
    const text = generateDescription(target, audience, toneVariant, attributes, observations);
    
    candidates.push({
      id: `${target}-c${i + 1}-${Date.now()}`,
      text,
      meta: {
        observationsCount,
        tagsCount,
      },
    });
  }

  return candidates;
}

// ============================================
// Endpoint Handler
// ============================================

/**
 * POST /api/products/:productId/describe
 * 
 * LP-obs-studio-cleanup-1.6.5: Multi-target aggregated describe endpoint.
 * 
 * Request body:
 * {
 *   "targets": ["shiekh.com", "karmaloop"],
 *   "audience": "Streetwear Enthusiast",
 *   "tone": "Professional",
 *   "observations": [{ "id": "...", "tags": [...], "text": "..." }],
 *   "attributes": { "brand": "...", ... },
 *   "images": [{ "url": "...", "thumb": "..." }],
 *   "options": { "candidates": 3, "aggregate": true }
 * }
 * 
 * Response:
 * {
 *   "results": [
 *     {
 *       "target": "shiekh.com",
 *       "candidates": [...],
 *       "seo": { "title": "...", "bullets": [...] },
 *       "meta": { "observationsCount": N, "tagsCount": M }
 *     }
 *   ]
 * }
 */
export async function describeHandler(req: Request, res: Response) {
  await requireAdmin(req, res, async () => {
    const productId = req.params.productId;
    const body = req.body as DescribeRequestBody;

    // Validate required fields
    if (!productId) {
      res.status(400).json({
        error: 'MISSING_PRODUCT_ID',
        message: 'Product ID is required',
      });
      return;
    }

    if (!body.targets || !Array.isArray(body.targets) || body.targets.length === 0) {
      res.status(400).json({
        error: 'MISSING_TARGETS',
        message: 'At least one target is required',
      });
      return;
    }

    if (!body.audience) {
      res.status(400).json({
        error: 'MISSING_AUDIENCE',
        message: 'Audience is required',
      });
      return;
    }

    if (!body.tone) {
      res.status(400).json({
        error: 'MISSING_TONE',
        message: 'Tone is required',
      });
      return;
    }

    const db = admin.firestore();

    try {
      // Verify product exists
      const productRef = db.collection('products').doc(productId);
      const productDoc = await productRef.get();

      if (!productDoc.exists) {
        res.status(404).json({
          error: 'PRODUCT_NOT_FOUND',
          message: `Product '${productId}' not found`,
        });
        return;
      }

      const productData = productDoc.data() || {};
      const attributes = { ...productData, ...(body.attributes || {}) };
      const observations = body.observations || [];
      const candidateCount = body.options?.candidates || 3;
      const aggregate = body.options?.aggregate !== false; // Default to true

      // Generate results for each target
      const results: TargetResult[] = [];

      for (const target of body.targets) {
        // In aggregate mode, use all observations for each target
        // In legacy mode (aggregate=false), we could filter observations per target
        const targetObservations = aggregate 
          ? observations 
          : observations.filter(o => !o.text || o.text.includes(target)); // Simple filter for legacy

        const candidates = generateCandidates(
          target,
          body.audience,
          body.tone,
          attributes,
          targetObservations,
          candidateCount
        );

        const seo = generateSEO(
          target,
          body.audience,
          attributes,
          targetObservations
        );

        results.push({
          target,
          candidates,
          seo,
          meta: {
            observationsCount: targetObservations.length,
            tagsCount: countUniqueTags(targetObservations),
          },
        });
      }

      // Log the describe action
      const authReq = req as AuthenticatedRequest;
      const actor = authReq.auth?.uid || 'system';
      const now = new Date().toISOString();

      await productRef.update({
        _activityLog: admin.firestore.FieldValue.arrayUnion({
          actor,
          action: 'describe',
          timestamp: now,
          details: {
            targets: body.targets,
            audience: body.audience,
            tone: body.tone,
            observationsCount: observations.length,
            tagsCount: countUniqueTags(observations),
            candidateCount,
            aggregate,
          },
        }),
        lastDescribeAt: now,
      });

      res.status(200).json({ results });
    } catch (error) {
      console.error('Error in describe handler:', error);
      res.status(500).json({
        error: 'INTERNAL_ERROR',
        message: 'Failed to generate descriptions',
      });
    }
  });
}

/**
 * POST /api/products/:productId/apply
 * 
 * LP-obs-studio-cleanup-1.6.5: Apply a candidate or SEO to a product.
 * 
 * Request body:
 * {
 *   "target": "shiekh.com",
 *   "action": "description" | "seo" | "attribute",
 *   "payload": {
 *     "candidateId": "...",
 *     "text": "...",
 *     "seo": { "title": "...", "bullets": [...] },
 *     "attributeId": "...",
 *     "value": ...
 *   }
 * }
 */
export async function applyHandler(req: Request, res: Response) {
  await requireAdmin(req, res, async () => {
    const productId = req.params.productId;
    const { target, action, payload } = req.body || {};

    if (!productId) {
      res.status(400).json({
        error: 'MISSING_PRODUCT_ID',
        message: 'Product ID is required',
      });
      return;
    }

    if (!target || !action || !payload) {
      res.status(400).json({
        error: 'MISSING_FIELDS',
        message: 'target, action, and payload are required',
      });
      return;
    }

    const validActions = ['description', 'seo', 'attribute'];
    if (!validActions.includes(action)) {
      res.status(400).json({
        error: 'INVALID_ACTION',
        message: `Action must be one of: ${validActions.join(', ')}`,
      });
      return;
    }

    const db = admin.firestore();

    try {
      const productRef = db.collection('products').doc(productId);
      const productDoc = await productRef.get();

      if (!productDoc.exists) {
        res.status(404).json({
          error: 'PRODUCT_NOT_FOUND',
          message: `Product '${productId}' not found`,
        });
        return;
      }

      const authReq = req as AuthenticatedRequest;
      const actor = authReq.auth?.uid || 'system';
      const now = new Date().toISOString();

      // Map target to field name
      const descFieldMap: Record<string, string> = {
        'shiekh.com': 'description_shiekh',
        'shiekh': 'description_shiekh',
        'karmaloop': 'description_karmaloop',
        'karmaloop.com': 'description_karmaloop',
        'mltd': 'description_mltd',
        'mltd.com': 'description_mltd',
      };

      const updateData: Record<string, unknown> = {
        updatedBy: actor,
        updatedAt: now,
      };

      // Handle different action types
      if (action === 'description' && payload.text) {
        const descField = descFieldMap[target.toLowerCase()];
        if (descField) {
          updateData[descField] = payload.text;
        }
      } else if (action === 'seo' && payload.seo) {
        updateData.meta_name = payload.seo.title;
        if (payload.seo.bullets?.length) {
          updateData.meta_description = payload.seo.bullets.join(' ');
        }
      } else if (action === 'attribute' && payload.attributeId !== undefined) {
        updateData[`attributes.${payload.attributeId}`] = payload.value;
      }

      // Add to activity log
      updateData._activityLog = admin.firestore.FieldValue.arrayUnion({
        appliedBy: actor,
        productId,
        target,
        type: action,
        payload,
        timestamp: now,
      });

      await productRef.update(updateData);

      res.status(200).json({
        success: true,
        productId,
        target,
        appliedAt: now,
        appliedBy: actor,
      });
    } catch (error) {
      console.error('Error in apply handler:', error);
      res.status(500).json({
        error: 'INTERNAL_ERROR',
        message: 'Failed to apply changes',
      });
    }
  });
}
