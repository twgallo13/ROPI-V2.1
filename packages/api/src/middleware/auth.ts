/**
 * Authentication Middleware
 * Per AOSS Section 9 — Firebase IAM & Security
 * 
 * Verifies Firebase Auth tokens and checks admin role via custom claims.
 */

import * as admin from 'firebase-admin';
import type { Request as ExpressRequest, Response as ExpressResponse } from 'express';
import { CANONICAL_ROLES, isAdminRole } from '../constants/roles';

/**
 * Auth context attached to authenticated requests
 */
export interface AuthContext {
  uid: string;
  email: string | undefined;
  role: string | undefined;
  emailVerified: boolean;
}

/**
 * Request with auth context
 */
export interface AuthenticatedRequest extends ExpressRequest {
  auth: AuthContext;
}

/**
 * Check if user has admin role via custom claims
 * Per PROMPT_018C_vB: IAM via Custom Claims
 */
export function isAdmin(auth: AuthContext): boolean {
  return isAdminRole(auth.role);
}

/**
 * Verify Firebase Auth token and extract user info
 * 
 * @param req - HTTP request
 * @returns Auth context or null if invalid
 */
export async function verifyAuthToken(req: ExpressRequest): Promise<AuthContext | null> {
  // Extract token from Authorization header
  const authHeader = req.headers.authorization;
  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    return null;
  }
  
  const token = authHeader.substring(7); // Remove 'Bearer ' prefix
  
  try {
    // Verify token with Firebase Admin
    const decodedToken = await admin.auth().verifyIdToken(token);
    
    return {
      uid: decodedToken.uid,
      email: decodedToken.email,
      role: decodedToken.role as string | undefined,
      emailVerified: decodedToken.email_verified || false,
    };
  } catch (error) {
    console.error('Token verification failed:', error);
    return null;
  }
}

/**
 * Middleware to require authentication
 * Sets req.auth with user context
 */
export async function requireAuth(
  req: ExpressRequest,
  res: ExpressResponse,
  next: () => void
): Promise<void> {
  const auth = await verifyAuthToken(req);
  
  if (!auth) {
    res.status(401).json({
      error: 'Unauthorized',
      message: 'Valid authentication token required',
    });
    return;
  }
  
  // Attach auth context to request
  (req as AuthenticatedRequest).auth = auth;
  next();
}

/**
 * Middleware to require admin role
 */
export async function requireAdmin(
  req: ExpressRequest,
  res: ExpressResponse,
  next: () => void
): Promise<void> {
  const auth = await verifyAuthToken(req);
  
  if (!auth) {
    res.status(401).json({
      error: 'Unauthorized',
      message: 'Valid authentication token required',
    });
    return;
  }
  
  if (!isAdmin(auth)) {
    res.status(403).json({
      error: 'Forbidden',
      message: 'Admin role required for this operation',
    });
    return;
  }
  
  // Attach auth context to request
  (req as AuthenticatedRequest).auth = auth;
  next();
}
