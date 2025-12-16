/**
 * Admin Users Endpoints
 * 
 * Implements CRUD handlers for user management.
 * All endpoints require admin authentication.
 * 
 * Homer v1.0.0 - User Management
 * 
 * References:
 * - User Management Spec: feature/users-admin
 * - Firebase Auth Admin SDK
 * - Custom Claims for roles
 */

import { requireAdmin, type AuthenticatedRequest } from '../../middleware/auth';
import type { Request, Response } from 'express';
import * as admin from 'firebase-admin';
import { isValidRole, isAdminRole, ROPI_ROLES } from '../../constants/roles';

function getDb() {
  return admin.firestore();
}

function getAuth() {
  return admin.auth();
}

/**
 * User response interface
 */
export interface UserResponse {
  uid: string;
  email: string | undefined;
  displayName: string | undefined;
  emailVerified: boolean;
  role: string | undefined;
  customClaims: Record<string, any> | undefined;
  metadata: {
    creationTime: string | undefined;
    lastSignInTime: string | undefined;
    lastRefreshTime: string | undefined;
  };
  disabled: boolean;
  providerData: any[];
}

/**
 * User profile interface (Firestore)
 */
export interface UserProfile {
  uid: string;
  email: string;
  displayName?: string;
  role: string;
  emailVerified: boolean;
  createdAt: admin.firestore.Timestamp;
  updatedAt: admin.firestore.Timestamp;
  lastSignInTime?: string;
  createdBy: string;
  updatedBy: string;
  deletedAt?: admin.firestore.Timestamp;
  metadata?: Record<string, any>;
}

/**
 * Handle service errors
 */
function handleError(error: unknown, res: Response): void {
  console.error('Users endpoint error:', error);
  
  if (error instanceof Error) {
    // Check for Firebase Auth errors
    if ('code' in error) {
      const firebaseError = error as any;
      
      switch (firebaseError.code) {
        case 'auth/user-not-found':
          res.status(404).json({
            error: 'NOT_FOUND',
            message: 'User not found',
          });
          return;
        case 'auth/email-already-exists':
          res.status(409).json({
            error: 'CONFLICT',
            message: 'User with this email already exists',
          });
          return;
        case 'auth/invalid-email':
          res.status(400).json({
            error: 'VALIDATION_ERROR',
            message: 'Invalid email address',
          });
          return;
        case 'auth/weak-password':
          res.status(400).json({
            error: 'VALIDATION_ERROR',
            message: 'Password is too weak',
          });
          return;
      }
    }
    
    res.status(500).json({
      error: 'INTERNAL_ERROR',
      message: error.message,
    });
  } else {
    res.status(500).json({
      error: 'INTERNAL_ERROR',
      message: 'An unknown error occurred',
    });
  }
}

/**
 * Convert Firebase UserRecord to UserResponse
 */
function formatUserResponse(userRecord: admin.auth.UserRecord): UserResponse {
  return {
    uid: userRecord.uid,
    email: userRecord.email,
    displayName: userRecord.displayName,
    emailVerified: userRecord.emailVerified,
    role: userRecord.customClaims?.role,
    customClaims: userRecord.customClaims,
    metadata: {
      creationTime: userRecord.metadata.creationTime,
      lastSignInTime: userRecord.metadata.lastSignInTime,
      lastRefreshTime: userRecord.metadata.lastRefreshTime || undefined,
    },
    disabled: userRecord.disabled,
    providerData: userRecord.providerData,
  };
}

/**
 * GET /admin/settings/users
 * List all users with pagination
 */
export async function listUsersHandler(req: Request, res: Response) {
  await requireAdmin(req, res, async () => {
    try {
      const maxResults = parseInt(req.query.limit as string) || 20;
      const pageToken = req.query.pageToken as string | undefined;
      
      const auth = getAuth();
      const listUsersResult = await auth.listUsers(maxResults, pageToken);
      
      const users = listUsersResult.users.map(formatUserResponse);
      
      res.status(200).json({
        users,
        pageToken: listUsersResult.pageToken,
        totalUsers: users.length,
      });
    } catch (error) {
      handleError(error, res);
    }
  });
}

/**
 * GET /admin/settings/users/:uid
 * Get a single user by UID
 */
export async function getUserHandler(req: Request, res: Response) {
  await requireAdmin(req, res, async () => {
    try {
      const { uid } = req.params;
      
      if (!uid) {
        res.status(400).json({
          error: 'INVALID_REQUEST',
          message: 'User UID is required',
        });
        return;
      }
      
      const auth = getAuth();
      const userRecord = await auth.getUser(uid);
      
      // Try to get profile from Firestore
      const db = getDb();
      const profileDoc = await db.collection('users').doc('profiles').collection('data').doc(uid).get();
      
      const response: any = formatUserResponse(userRecord);
      
      if (profileDoc.exists) {
        response.profile = profileDoc.data();
      }
      
      res.status(200).json(response);
    } catch (error) {
      handleError(error, res);
    }
  });
}

/**
 * POST /admin/settings/users
 * Create a new user
 */
export async function createUserHandler(req: Request, res: Response) {
  await requireAdmin(req, res, async () => {
    try {
      const { email, password, displayName, role = 'user', sendInvite = false } = req.body;
      
      // Validate required fields
      if (!email) {
        res.status(400).json({
          error: 'VALIDATION_ERROR',
          message: 'Email is required',
        });
        return;
      }
      
      if (!password && !sendInvite) {
        res.status(400).json({
          error: 'VALIDATION_ERROR',
          message: 'Password is required (or set sendInvite=true)',
        });
        return;
      }
      
      // Validate role
      if (!isValidRole(role)) {
        res.status(400).json({
          error: 'VALIDATION_ERROR',
          message: `Invalid role. Must be one of: ${Object.values(ROPI_ROLES).join(', ')}`,
        });
        return;
      }
      
      const auth = getAuth();
      const db = getDb();
      const authReq = req as AuthenticatedRequest;
      const actorUid = authReq.auth?.uid || 'system';
      
      // Create Firebase Auth user
      const userRecord = await auth.createUser({
        email,
        password: password || undefined,
        displayName,
        emailVerified: false,
      });
      
      // Set custom claims for role
      await auth.setCustomUserClaims(userRecord.uid, { role });
      
      // Create profile in Firestore
      const now = admin.firestore.Timestamp.now();
      const profile: UserProfile = {
        uid: userRecord.uid,
        email,
        displayName: displayName || '',
        role,
        emailVerified: false,
        createdAt: now,
        updatedAt: now,
        createdBy: actorUid,
        updatedBy: actorUid,
      };
      
      await db.collection('users').doc('profiles').collection('data').doc(userRecord.uid).set(profile);
      
      // Send verification email if requested
      if (sendInvite) {
        // Generate password reset link (acts as invite)
        const resetLink = await auth.generatePasswordResetLink(email);
        console.log(`Password reset link for ${email}: ${resetLink}`);
        // TODO: Send email via SendGrid or other email service
      }
      
      const response = formatUserResponse(userRecord);
      res.status(201).json(response);
    } catch (error) {
      handleError(error, res);
    }
  });
}

/**
 * PATCH /admin/settings/users/:uid
 * Update an existing user
 */
export async function updateUserHandler(req: Request, res: Response) {
  await requireAdmin(req, res, async () => {
    try {
      const { uid } = req.params;
      const { email, displayName, role, emailVerified, disabled } = req.body;
      
      if (!uid) {
        res.status(400).json({
          error: 'INVALID_REQUEST',
          message: 'User UID is required',
        });
        return;
      }
      
      const auth = getAuth();
      const db = getDb();
      const authReq = req as AuthenticatedRequest;
      const actorUid = authReq.auth?.uid || 'system';
      
      // Prevent self-demotion from admin
      if (uid === actorUid && role && !isAdminRole(role)) {
        res.status(403).json({
          error: 'FORBIDDEN',
          message: 'Cannot remove your own admin role',
        });
        return;
      }
      
      // Validate role if provided
      if (role) {
        if (!isValidRole(role)) {
          res.status(400).json({
            error: 'VALIDATION_ERROR',
            message: `Invalid role. Must be one of: ${Object.values(ROPI_ROLES).join(', ')}`,
          });
          return;
        }
      }
      
      // Update Firebase Auth user
      const updatePayload: any = {};
      if (email !== undefined) updatePayload.email = email;
      if (displayName !== undefined) updatePayload.displayName = displayName;
      if (emailVerified !== undefined) updatePayload.emailVerified = emailVerified;
      if (disabled !== undefined) updatePayload.disabled = disabled;
      
      const userRecord = await auth.updateUser(uid, updatePayload);
      
      // Update custom claims if role changed
      if (role !== undefined) {
        const currentClaims = userRecord.customClaims || {};
        await auth.setCustomUserClaims(uid, { ...currentClaims, role });
      }
      
      // Update profile in Firestore
      const profileRef = db.collection('users').doc('profiles').collection('data').doc(uid);
      const updateData: any = {
        updatedAt: admin.firestore.Timestamp.now(),
        updatedBy: actorUid,
      };
      
      if (email !== undefined) updateData.email = email;
      if (displayName !== undefined) updateData.displayName = displayName;
      if (role !== undefined) updateData.role = role;
      if (emailVerified !== undefined) updateData.emailVerified = emailVerified;
      
      // Use set with merge to create document if missing (prevents 500 errors)
      const profileSnapshot = await profileRef.get();
      if (!profileSnapshot.exists) {
        console.log(`📝 Creating missing profile doc for user ${uid}`);
      }
      await profileRef.set(updateData, { merge: true });
      
      // Get updated user
      const updatedUserRecord = await auth.getUser(uid);
      const response = formatUserResponse(updatedUserRecord);
      
      res.status(200).json(response);
    } catch (error) {
      handleError(error, res);
    }
  });
}

/**
 * DELETE /admin/settings/users/:uid
 * Delete a user (soft or hard delete)
 */
export async function deleteUserHandler(req: Request, res: Response) {
  await requireAdmin(req, res, async () => {
    try {
      const { uid } = req.params;
      const soft = req.query.soft === 'true';
      
      if (!uid) {
        res.status(400).json({
          error: 'INVALID_REQUEST',
          message: 'User UID is required',
        });
        return;
      }
      
      const auth = getAuth();
      const db = getDb();
      const authReq = req as AuthenticatedRequest;
      const actorUid = authReq.auth?.uid || 'system';
      
      // Prevent self-deletion
      if (uid === actorUid) {
        res.status(403).json({
          error: 'FORBIDDEN',
          message: 'Cannot delete your own account',
        });
        return;
      }
      
      if (soft) {
        // Soft delete: mark deletedAt in profile
        const profileRef = db.collection('users').doc('profiles').collection('data').doc(uid);
        // Use set with merge to handle case where profile doc is missing
        await profileRef.set({
          deletedAt: admin.firestore.Timestamp.now(),
          updatedBy: actorUid,
        }, { merge: true });
        
        // Disable user in Auth
        await auth.updateUser(uid, { disabled: true });
      } else {
        // Hard delete: remove from Auth and Firestore
        await auth.deleteUser(uid);
        await db.collection('users').doc('profiles').collection('data').doc(uid).delete();
      }
      
      res.status(204).send();
    } catch (error) {
      handleError(error, res);
    }
  });
}

/**
 * POST /admin/settings/users/:uid/reset-password
 * Send password reset email
 */
export async function resetPasswordHandler(req: Request, res: Response) {
  await requireAdmin(req, res, async () => {
    try {
      const { uid } = req.params;
      
      if (!uid) {
        res.status(400).json({
          error: 'INVALID_REQUEST',
          message: 'User UID is required',
        });
        return;
      }
      
      const auth = getAuth();
      
      // Get user email
      const userRecord = await auth.getUser(uid);
      
      if (!userRecord.email) {
        res.status(400).json({
          error: 'INVALID_REQUEST',
          message: 'User does not have an email address',
        });
        return;
      }
      
      // Generate password reset link
      const resetLink = await auth.generatePasswordResetLink(userRecord.email);
      
      console.log(`Password reset link for ${userRecord.email}: ${resetLink}`);
      
      // TODO: Send email via SendGrid or other email service
      // For now, return the link in the response (staging/dev only)
      
      res.status(200).json({
        message: 'Password reset link generated',
        email: userRecord.email,
        resetLink, // Remove in production
      });
    } catch (error) {
      handleError(error, res);
    }
  });
}

/**
 * GET /admin/settings/roles
 * Get list of valid roles
 */
export async function getRolesHandler(req: Request, res: Response) {
  await requireAdmin(req, res, async () => {
    const { ROLE_LIST } = await import('../../constants/roles');
    res.status(200).json({
      roles: ROLE_LIST,
    });
  });
}
