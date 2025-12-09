/**
 * Auth Headers Helper
 * 
 * Provides Firebase ID token for admin API calls.
 * All admin endpoints require Authorization: Bearer <idToken>.
 * 
 * Lisa v1.0.0
 */

import { getAuth } from 'firebase/auth';

/**
 * Get authorization headers for admin API calls.
 * Retrieves the current user's Firebase ID token and returns
 * headers object with Authorization and Content-Type.
 * 
 * @throws Error if user is not signed in
 * @returns Promise<Record<string, string>> Headers object
 */
export async function getAuthHeaders(): Promise<Record<string, string>> {
  const auth = getAuth();
  const user = auth.currentUser;
  
  if (!user) {
    throw new Error('NotAuthenticated: User not signed in. Please sign in to access admin features.');
  }
  
  // Force-refresh token to ensure valid claims
  const idToken = await user.getIdToken(true);
  
  return {
    'Authorization': `Bearer ${idToken}`,
    'Content-Type': 'application/json',
  };
}

/**
 * Check if current user is authenticated (without throwing).
 * Useful for conditional UI rendering.
 * 
 * @returns boolean - true if user is signed in
 */
export function isAuthenticated(): boolean {
  const auth = getAuth();
  return auth.currentUser !== null;
}

export default getAuthHeaders;
