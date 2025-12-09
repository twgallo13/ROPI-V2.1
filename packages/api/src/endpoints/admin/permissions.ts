/**
 * Permissions Endpoints
 * 
 * Manages role-based permissions matrix stored in Firestore.
 * Admin-only endpoints for viewing and updating role permissions.
 * 
 * Firestore structure:
 *   settings/permissions/role-matrix
 * 
 * Homer v2.0.0 - Ropi Roles & Permissions
 */

import { requireAdmin, type AuthenticatedRequest } from '../../middleware/auth';
import type { Request, Response, RequestHandler, NextFunction } from 'express';
import * as admin from 'firebase-admin';

function getDb() {
  return admin.firestore();
}

/**
 * Default permissions matrix for Ropi roles
 */
const DEFAULT_PERMISSIONS = {
  admin: {
    systemAccess: true,
    userManagement: true,
    importExport: true,
    launchCalendar: true,
    observations: true,
    media: true,
  },
  merch: {
    systemAccess: false,
    userManagement: false,
    importExport: true,
    launchCalendar: true,
    observations: false,
    media: false,
  },
  photographer: {
    systemAccess: false,
    userManagement: false,
    importExport: false,
    launchCalendar: false,
    observations: true,
    media: true,
  },
  viewer: {
    systemAccess: false,
    userManagement: false,
    importExport: false,
    launchCalendar: true, // read-only
    observations: false,
    media: false,
  },
};

/**
 * GET /admin/permissions
 * Get the role permissions matrix
 */
export const getPermissionsHandler: RequestHandler = async (
  req: Request,
  res: Response,
  _next: NextFunction
): Promise<void> => {
  try {
    const authReq = req as AuthenticatedRequest;
    const db = getDb();
    const permissionsDoc = await db.doc('settings/permissions').get();

    if (!permissionsDoc.exists) {
      // Return default permissions if not yet configured
      res.status(200).json({
        permissions: DEFAULT_PERMISSIONS,
        isDefault: true,
      });
      return;
    }

    const data = permissionsDoc.data();
    res.status(200).json({
      permissions: data?.roleMatrix || DEFAULT_PERMISSIONS,
      isDefault: false,
      updatedAt: data?.updatedAt?.toDate?.().toISOString(),
      updatedBy: data?.updatedBy,
    });
  } catch (error: any) {
    console.error('Error fetching permissions:', error);
    res.status(500).json({
      error: 'INTERNAL_ERROR',
      message: 'Failed to fetch permissions',
    });
  }
};

/**
 * PATCH /admin/permissions
 * Update the role permissions matrix
 */
export const updatePermissionsHandler: RequestHandler = async (
  req: Request,
  res: Response,
  _next: NextFunction
): Promise<void> => {
  try {
    const { permissions } = req.body;

    if (!permissions || typeof permissions !== 'object') {
      res.status(400).json({
        error: 'VALIDATION_ERROR',
        message: 'Invalid permissions data',
      });
      return;
    }

    const authReq = req as AuthenticatedRequest;
    const db = getDb();
    const timestamp = admin.firestore.FieldValue.serverTimestamp();

    // Update permissions document
    await db.doc('settings/permissions').set(
      {
        roleMatrix: permissions,
        updatedAt: timestamp,
        updatedBy: authReq.auth.email || authReq.auth.uid,
      },
      { merge: true }
    );

    // Create audit trail
    await db.collection('audit').add({
      type: 'permissions_update',
      roleMatrix: permissions,
      updatedBy: authReq.auth.email || authReq.auth.uid,
      updatedByUid: authReq.auth.uid,
      timestamp,
    });

    res.status(200).json({
      message: 'Permissions updated successfully',
      permissions,
    });
  } catch (error: any) {
    console.error('Error updating permissions:', error);
    res.status(500).json({
      error: 'INTERNAL_ERROR',
      message: 'Failed to update permissions',
    });
  }
};

/**
 * POST /admin/permissions/reset
 * Reset permissions to defaults
 */
export const resetPermissionsHandler: RequestHandler = async (
  req: Request,
  res: Response,
  _next: NextFunction
): Promise<void> => {
  try {
    const authReq = req as AuthenticatedRequest;
    const db = getDb();
    const timestamp = admin.firestore.FieldValue.serverTimestamp();

    await db.doc('settings/permissions').set({
      roleMatrix: DEFAULT_PERMISSIONS,
      updatedAt: timestamp,
      updatedBy: authReq.auth.email || authReq.auth.uid,
      isDefault: true,
    });

    // Create audit trail
    await db.collection('audit').add({
      type: 'permissions_reset',
      roleMatrix: DEFAULT_PERMISSIONS,
      updatedBy: authReq.auth.email || authReq.auth.uid,
      updatedByUid: authReq.auth.uid,
      timestamp,
    });

    res.status(200).json({
      message: 'Permissions reset to defaults',
      permissions: DEFAULT_PERMISSIONS,
    });
  } catch (error: any) {
    console.error('Error resetting permissions:', error);
    res.status(500).json({
      error: 'INTERNAL_ERROR',
      message: 'Failed to reset permissions',
    });
  }
};

// Export handlers with middleware
export default {
  getPermissions: [requireAdmin, getPermissionsHandler] as RequestHandler[],
  updatePermissions: [requireAdmin, updatePermissionsHandler] as RequestHandler[],
  resetPermissions: [requireAdmin, resetPermissionsHandler] as RequestHandler[],
};
