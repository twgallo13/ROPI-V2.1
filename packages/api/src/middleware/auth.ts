/**
 * Authentication Middleware
 * Per AOSS Section 9 — Firebase IAM & Security
 * 
 * Verifies Firebase Auth tokens and checks admin role via custom claims.
 */

import * as admin from 'firebase-admin';
import type { Request as ExpressRequest, Response as ExpressResponse } from 'express';
import { ROPI_ROLES, isAdminRole } from '../constants/roles';

const IS_EMULATOR = Boolean(
  process.env.FIRESTORE_EMULATOR_HOST || 
  process.env.FIREBASE_AUTH_EMULATOR_HOST || 
  process.env.NODE_ENV === 'test_emulator'
);

function buildEmulatorAuth(req: ExpressRequest): AuthContext {
  const authHeader = req.headers.authorization;
  const token = authHeader?.startsWith('Bearer ')
    ? authHeader.substring(7)
    : 'emulator-admin';

  return {
    uid: token || 'emulator-admin',
    email: 'emulator@local',
    role: ROPI_ROLES.ADMIN,
    roles: [ROPI_ROLES.ADMIN],
    emailVerified: true,
  };
}

/**
 * Auth context attached to authenticated requests
 */
export interface AuthContext {
  uid: string;
  email: string | undefined;
  name?: string;
  role: string | undefined;
  roles?: string[];
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
  if (isAdminRole(auth.role)) {
    return true;
  }
  return Array.isArray(auth.roles) && auth.roles.includes(ROPI_ROLES.ADMIN);
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
  let token: string | null = null;
  let tokenSource: string = 'none';
  
  if (authHeader && authHeader.startsWith('Bearer ')) {
    token = authHeader.substring(7); // Remove 'Bearer ' prefix
    tokenSource = 'header';
  } else {
    // Lisa's canonical: Cookie fallback for browser flows
    // Check for __session cookie (Firebase Hosting convention)
    const cookies = req.cookies || {};
    if (cookies.__session) {
      token = cookies.__session;
      tokenSource = 'cookie';
    }
  }
  
  if (!token) {
    if (IS_EMULATOR) {
      return buildEmulatorAuth(req);
    }
    console.warn('⚠️ Auth: No token found (checked header and __session cookie)', {
      path: req.path,
      hasAuthHeader: !!authHeader,
      hasCookies: !!req.cookies,
    });
    return null;
  }

  if (IS_EMULATOR) {
    // In emulator/test flows we accept any bearer token and treat it as admin
    return buildEmulatorAuth(req);
  }
  
  try {
    // Verify token with Firebase Admin
    const decodedToken = await admin.auth().verifyIdToken(token);
    
    console.log(`✅ Auth: Token verified (source: ${tokenSource})`, {
      uid: decodedToken.uid,
      path: req.path,
    });
    
    return {
      uid: decodedToken.uid,
      email: decodedToken.email,
      name: decodedToken.name as string | undefined,
      role: decodedToken.role as string | undefined,
      roles: Array.isArray((decodedToken as any).roles) ? (decodedToken as any).roles as string[] : undefined,
      emailVerified: decodedToken.email_verified || false,
    };
  } catch (error) {
    console.error(`⚠️ Token verification failed (source: ${tokenSource}):`, error);
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
      error: 'INVALID_AUTH_TOKEN',
      reason: 'missing_or_invalid_token',
      message: 'Valid authentication token required. Include Authorization: Bearer <token> header or __session cookie.',
    });
    return;
  }
  
  // Attach auth context to request
  (req as AuthenticatedRequest).auth = auth;
  next();
}

/**
 * Check Firestore allow-list (metadata/admins) for admin email fallback
 */
async function isAdminAllowlisted(email: string | undefined): Promise<boolean> {
  if (!email) return false;
  try {
    const doc = await admin.firestore().doc('metadata/admins').get();
    if (!doc.exists) return false;
    const data = doc.data() || {};
    const emails: string[] = Array.isArray(data.emails) ? data.emails : [];
    return emails.includes(email);
  } catch (err) {
    console.warn('⚠️ Admin allow-list lookup failed:', err);
    return false;
  }
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
      error: 'INVALID_AUTH_TOKEN',
      reason: 'missing_or_invalid_token',
      message: 'Valid authentication token required. Include Authorization: Bearer <token> header or __session cookie.',
    });
    return;
  }
  
  const hasAdminClaim = isAdmin(auth);
  const hasAdminAllowlist = hasAdminClaim ? false : await isAdminAllowlisted(auth.email);

  if (!hasAdminClaim && !hasAdminAllowlist) {
    console.warn('🛑 Admin check failed', {
      uid: auth.uid,
      email: auth.email,
      role: auth.role,
      roles: auth.roles,
      path: req.path,
    });
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
