/**
 * Environment and Write Policy Utilities
 * 
 * PROMPT_018C_vB: Email Verification Policy
 * 
 * Provides utilities for:
 * - Detecting production vs staging environment
 * - Enforcing email verification policy for writes
 * - Checking if public launch signups are enabled
 */

/**
 * Check if running in production environment
 */
export function isProduction(): boolean {
  return import.meta.env.VITE_ENV === 'production';
}

/**
 * Check if running in staging environment
 */
export function isStaging(): boolean {
  return !isProduction();
}

/**
 * Check if public launch signups are enabled
 */
export function isPublicSignupEnabled(): boolean {
  return import.meta.env.VITE_LAUNCH_SIGNUP_PUBLIC_ENABLED === 'true';
}

/**
 * Roles that require email verification for write operations
 * 
 * PROMPT_018C_vB: admin, merch, buyer, photographer
 */
const WRITE_CAPABLE_ROLES = ['admin', 'merch', 'buyer', 'photographer'];

/**
 * Check if user has a write-capable role
 * 
 * @param role - User's role from custom claims or metadata
 */
export function hasWriteCapableRole(role?: string): boolean {
  return role ? WRITE_CAPABLE_ROLES.includes(role) : false;
}

/**
 * Check if writes should be blocked due to unverified email
 * 
 * Policy:
 * - Staging: Soft enforcement (banner shown, writes allowed)
 * - Production: Hard enforcement (writes blocked for write-capable roles)
 * 
 * @param emailVerified - User's email verification status
 * @param isAdmin - Whether user is admin (write-capable role)
 */
export function shouldBlockWrites(emailVerified: boolean, isAdmin: boolean): boolean {
  // Staging: Never block writes (soft enforcement via banner only)
  if (isStaging()) {
    return false;
  }

  // Production: Block writes for write-capable roles if email not verified
  if (isProduction() && isAdmin && !emailVerified) {
    return true;
  }

  return false;
}

/**
 * Get human-readable error message for blocked writes
 */
export function getBlockedWriteMessage(): string {
  return 'Email verification required. Please verify your email to perform this action.';
}
