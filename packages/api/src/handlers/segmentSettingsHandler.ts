/**
 * Segment Settings Handler
 * 
 * Manages editable segment names and display configuration
 * that can be customized per deployment environment
 * 
 * Firestore location: settings/segmentSettings
 */

import { Router, type Request, type Response } from 'express';
import admin from 'firebase-admin';
import { requireAdmin, type AuthenticatedRequest } from '../middleware/auth';

// ============================================================================
// Types
// ============================================================================

export interface SegmentDisplay {
  id: string;
  name: string;
  description?: string;
  displayOrder?: number;
  icon?: string;
  color?: string;
}

export interface SegmentSettings {
  segments: Record<string, SegmentDisplay>;
  updatedAt?: string;
  updatedBy?: string;
  version?: string;
}

// ============================================================================
// Firestore Helpers
// ============================================================================

function getDb(): admin.firestore.Firestore {
  return admin.firestore();
}

const SETTINGS_DOC_PATH = 'settings/segmentSettings';

// ============================================================================
// Handler Functions
// ============================================================================

/**
 * GET /admin/settings/segments
 * Get all segment display settings
 */
export async function getSegmentSettingsHandler(req: Request, res: Response) {
  await requireAdmin(req, res, async () => {
    try {
      const db = getDb();
      const doc = await db.doc(SETTINGS_DOC_PATH).get();

      if (!doc.exists) {
        // Return default segment settings if not found
        return res.status(200).json({
          segments: getDefaultSegmentSettings(),
        });
      }

      const data = doc.data() as SegmentSettings;
      res.status(200).json(data);
    } catch (error) {
      const message = error instanceof Error ? error.message : String(error);
      res.status(500).json({
        error: 'SEGMENT_SETTINGS_FETCH_FAILED',
        message,
      });
    }
  });
}

/**
 * PUT /admin/settings/segments/:segmentId
 * Update a single segment's display name and metadata
 * 
 * Body:
 * - name: string (display name)
 * - description: string (optional)
 * - displayOrder: number (optional)
 * - icon: string (optional)
 * - color: string (optional)
 */
export async function updateSegmentSettingHandler(req: Request, res: Response) {
  await requireAdmin(req, res, async () => {
    try {
      const segmentId = req.params.segmentId;
      if (!segmentId) {
        return res.status(400).json({
          error: 'INVALID_REQUEST',
          message: 'Segment ID is required',
        });
      }

      const { name, description, displayOrder, icon, color } = req.body || {};

      if (!name || typeof name !== 'string') {
        return res.status(400).json({
          error: 'INVALID_REQUEST',
          message: 'Segment name is required and must be a string',
        });
      }

      const authReq = req as AuthenticatedRequest;
      const actor = authReq.auth?.uid || 'system';

      const db = getDb();
      const docRef = db.doc(SETTINGS_DOC_PATH);

      // Get current settings or create new
      const currentDoc = await docRef.get();
      const currentSettings = (currentDoc.exists ? currentDoc.data() : {}) as SegmentSettings;
      const currentSegments = currentSettings.segments || {};

      // Update the segment
      const updatedSegments = {
        ...currentSegments,
        [segmentId]: {
          id: segmentId,
          name,
          description: description || currentSegments[segmentId]?.description,
          displayOrder: displayOrder !== undefined ? displayOrder : currentSegments[segmentId]?.displayOrder,
          icon: icon || currentSegments[segmentId]?.icon,
          color: color || currentSegments[segmentId]?.color,
        },
      };

      const now = new Date().toISOString();
      const updatedSettings: SegmentSettings = {
        segments: updatedSegments,
        updatedAt: now,
        updatedBy: actor,
        version: '1.0.0',
      };

      await docRef.set(updatedSettings);

      res.status(200).json({
        success: true,
        segment: updatedSegments[segmentId],
      });
    } catch (error) {
      const message = error instanceof Error ? error.message : String(error);
      res.status(500).json({
        error: 'SEGMENT_SETTINGS_UPDATE_FAILED',
        message,
      });
    }
  });
}

/**
 * PUT /admin/settings/segments
 * Bulk update all segment settings
 * 
 * Body:
 * - segments: Record<string, SegmentDisplay>
 */
export async function updateSegmentSettingsBulkHandler(req: Request, res: Response) {
  await requireAdmin(req, res, async () => {
    try {
      const { segments } = req.body || {};

      if (!segments || typeof segments !== 'object') {
        return res.status(400).json({
          error: 'INVALID_REQUEST',
          message: 'Segments object is required',
        });
      }

      const authReq = req as AuthenticatedRequest;
      const actor = authReq.auth?.uid || 'system';

      const db = getDb();
      const docRef = db.doc(SETTINGS_DOC_PATH);

      const now = new Date().toISOString();
      const updatedSettings: SegmentSettings = {
        segments,
        updatedAt: now,
        updatedBy: actor,
        version: '1.0.0',
      };

      await docRef.set(updatedSettings);

      res.status(200).json({
        success: true,
        settings: updatedSettings,
      });
    } catch (error) {
      const message = error instanceof Error ? error.message : String(error);
      res.status(500).json({
        error: 'SEGMENT_SETTINGS_UPDATE_FAILED',
        message,
      });
    }
  });
}

/**
 * DELETE /admin/settings/segments/:segmentId
 * Remove custom settings for a segment (reverts to defaults)
 */
export async function deleteSegmentSettingHandler(req: Request, res: Response) {
  await requireAdmin(req, res, async () => {
    try {
      const segmentId = req.params.segmentId;
      if (!segmentId) {
        return res.status(400).json({
          error: 'INVALID_REQUEST',
          message: 'Segment ID is required',
        });
      }

      const authReq = req as AuthenticatedRequest;
      const actor = authReq.auth?.uid || 'system';

      const db = getDb();
      const docRef = db.doc(SETTINGS_DOC_PATH);

      const currentDoc = await docRef.get();
      if (!currentDoc.exists) {
        return res.status(404).json({
          error: 'SETTINGS_NOT_FOUND',
          message: 'No segment settings found',
        });
      }

      const currentSettings = currentDoc.data() as SegmentSettings;
      const currentSegments = currentSettings.segments || {};

      if (!currentSegments[segmentId]) {
        return res.status(404).json({
          error: 'SEGMENT_NOT_FOUND',
          message: `Segment '${segmentId}' not found in settings`,
        });
      }

      const updatedSegments = { ...currentSegments };
      delete updatedSegments[segmentId];

      const now = new Date().toISOString();
      const updatedSettings: SegmentSettings = {
        segments: updatedSegments,
        updatedAt: now,
        updatedBy: actor,
        version: '1.0.0',
      };

      await docRef.set(updatedSettings);

      res.status(204).send();
    } catch (error) {
      const message = error instanceof Error ? error.message : String(error);
      res.status(500).json({
        error: 'SEGMENT_SETTINGS_DELETE_FAILED',
        message,
      });
    }
  });
}

// ============================================================================
// Utility Functions
// ============================================================================

/**
 * Get default segment settings based on built-in segments
 */
function getDefaultSegmentSettings(): Record<string, SegmentDisplay> {
  return {
    'core-attributes': {
      id: 'core-attributes',
      name: 'Core Product Attributes',
      description: 'Essential product information required for all exports',
      displayOrder: 1,
      icon: 'box',
      color: '#2563eb',
    },
    'seo-attributes': {
      id: 'seo-attributes',
      name: 'SEO & Marketing',
      description: 'Search engine optimization and marketing metadata',
      displayOrder: 2,
      icon: 'search',
      color: '#7c3aed',
    },
    'media-attributes': {
      id: 'media-attributes',
      name: 'Media & Images',
      description: 'Product images and visual assets',
      displayOrder: 3,
      icon: 'image',
      color: '#ec4899',
    },
    'description-seo': {
      id: 'description-seo',
      name: 'Descriptions',
      description: 'Product descriptions and long-form content',
      displayOrder: 4,
      icon: 'align-left',
      color: '#f59e0b',
    },
  };
}

/**
 * Load segment settings from Firestore, with fallback to defaults
 */
export async function loadSegmentSettings(): Promise<SegmentSettings> {
  try {
    const db = getDb();
    const doc = await db.doc(SETTINGS_DOC_PATH).get();

    if (doc.exists) {
      return doc.data() as SegmentSettings;
    }

    // Return defaults if not found
    return {
      segments: getDefaultSegmentSettings(),
    };
  } catch (error) {
    console.error('Error loading segment settings:', error);
    // Return defaults on error
    return {
      segments: getDefaultSegmentSettings(),
    };
  }
}

// ============================================================================
// Router Setup
// ============================================================================

const router = Router();

router.get('/', getSegmentSettingsHandler);
router.put('/:segmentId', updateSegmentSettingHandler);
router.put('/', updateSegmentSettingsBulkHandler);
router.delete('/:segmentId', deleteSegmentSettingHandler);

export default router;
