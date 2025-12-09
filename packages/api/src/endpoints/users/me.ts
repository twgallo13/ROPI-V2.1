/**
 * User Self-Profile Endpoints
 * 
 * Implements GET and PATCH endpoints for users to manage their own profile.
 * 
 * Homer v1.0.0 - User Management
 * 
 * References:
 * - User Management Spec: feature/users-admin
 * - Firebase Auth Admin SDK
 * - Self-profile management (read-only password reset)
 */

import type { Request, Response } from 'express';
import * as admin from 'firebase-admin';
import { requireAuth, type AuthenticatedRequest } from '../../middleware/auth';

function getDb() {
  return admin.firestore();
}

function getAuth() {
  return admin.auth();
}

/**
 * Handle service errors
 */
function handleError(error: unknown, res: Response): void {
  console.error('User profile endpoint error:', error);
  
  if (error instanceof Error) {
    if ('code' in error) {
      const firebaseError = error as any;
      
      switch (firebaseError.code) {
        case 'auth/user-not-found':
          res.status(404).json({
            error: 'NOT_FOUND',
            message: 'User profile not found',
          });
          return;
        case 'auth/invalid-email':
          res.status(400).json({
            error: 'VALIDATION_ERROR',
            message: 'Invalid email address',
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
 * GET /users/me
 * 
 * Get current user's profile information.
 * Returns: user uid, email, displayName, photoURL, and provider info
 */
export async function getMeHandler(req: Request, res: Response) {
  await requireAuth(req, res, async () => {
    try {
      const authReq = req as AuthenticatedRequest;
      const uid = authReq.auth?.uid;

      if (!uid) {
        res.status(401).json({
          error: 'UNAUTHORIZED',
          message: 'User not authenticated',
        });
        return;
      }

      const auth = getAuth();
      const userRecord = await auth.getUser(uid);
      const userJson = userRecord.toJSON() as any;

      // Get profile from Firestore
      const db = getDb();
      const userDocRef = db.collection('users').doc(uid);
      const userDoc = await userDocRef.get();
      const userDocData = userDoc.exists ? userDoc.data() : {};

      // Return sanitized profile information
      res.status(200).json({
        uid,
        email: userJson.email || null,
        displayName: userJson.displayName || null,
        photoURL: userJson.photoURL || null,
        customClaims: userJson.customClaims || {},
        providerData: userJson.providerData || [],
        disabled: userJson.disabled || false,
        metadata: userJson.metadata || {},
        // Include Firestore profile data if any
        profileData: userDocData || {},
      });
    } catch (error) {
      handleError(error, res);
    }
  });
}

/**
 * PATCH /users/me
 * 
 * Update current user's profile information.
 * Allowed updates:
 * - displayName: User's display name (string, max 256 chars)
 * - photoURL: User's profile photo URL (string, max 512 chars)
 * 
 * Not allowed (even by the user themselves):
 * - email: Use Firebase auth provider for email changes
 * - password: Not directly updateable; password reset handled via Auth UI
 * - role: Never directly updateable; only admins can change
 * - customClaims: Never directly updateable; only admins can set
 */
export async function updateMeHandler(req: Request, res: Response) {
  await requireAuth(req, res, async () => {
    try {
      const authReq = req as AuthenticatedRequest;
      const uid = authReq.auth?.uid;

      if (!uid) {
        res.status(401).json({
          error: 'UNAUTHORIZED',
          message: 'User not authenticated',
        });
        return;
      }

      const { displayName, photoURL } = req.body;

      // Validate input
      if (displayName !== undefined && typeof displayName !== 'string') {
        res.status(400).json({
          error: 'VALIDATION_ERROR',
          message: 'displayName must be a string',
        });
        return;
      }

      if (displayName !== undefined && displayName.length > 256) {
        res.status(400).json({
          error: 'VALIDATION_ERROR',
          message: 'displayName must be 256 characters or less',
        });
        return;
      }

      if (photoURL !== undefined && typeof photoURL !== 'string') {
        res.status(400).json({
          error: 'VALIDATION_ERROR',
          message: 'photoURL must be a string',
        });
        return;
      }

      if (photoURL !== undefined && photoURL.length > 512) {
        res.status(400).json({
          error: 'VALIDATION_ERROR',
          message: 'photoURL must be 512 characters or less',
        });
        return;
      }

      // Build update payload - only include fields that were provided
      const updatePayload: any = {};
      if (displayName !== undefined) updatePayload.displayName = displayName;
      if (photoURL !== undefined) updatePayload.photoURL = photoURL;

      // If nothing to update, return current profile
      if (Object.keys(updatePayload).length === 0) {
        res.status(200).json({
          message: 'No changes provided',
        });
        return;
      }

      // Update Firebase Auth user
      const auth = getAuth();
      await auth.updateUser(uid, updatePayload);

      // Get updated user record
      const userRecord = await auth.getUser(uid);
      const userJson = userRecord.toJSON() as any;

      // Get profile from Firestore
      const db = getDb();
      const userDocRef = db.collection('users').doc(uid);
      const userDoc = await userDocRef.get();
      const userDocData = userDoc.exists ? userDoc.data() : {};

      // Return updated profile
      res.status(200).json({
        uid,
        email: userJson.email || null,
        displayName: userJson.displayName || null,
        photoURL: userJson.photoURL || null,
        customClaims: userJson.customClaims || {},
        providerData: userJson.providerData || [],
        disabled: userJson.disabled || false,
        metadata: userJson.metadata || {},
        profileData: userDocData || {},
      });
    } catch (error) {
      handleError(error, res);
    }
  });
}
