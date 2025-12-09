/**
 * Auth Headers Helper
 * 
 * Provides Firebase ID token for admin API calls.
 * All admin endpoints require Authorization: Bearer <idToken>.
 * Waits for auth state to settle if currentUser not immediately available.
 * 
 * Lisa v1.0.0
 */

import { getAuth, onAuthStateChanged, User } from 'firebase/auth';

/**
 * Return headers with Authorization: Bearer <idToken>.
 * Waits up to `timeoutMs` for auth state if currentUser not yet set.
 * Throws `NotAuthenticated` if user not signed in within timeout.
 * 
 * @param timeoutMs - Maximum time to wait for auth state (default 8000ms)
 * @throws Error if user is not signed in within timeout
 * @returns Promise<Record<string, string>> Headers object
 */
export async function getAuthHeaders(timeoutMs = 8000): Promise<Record<string, string>> {
  const auth = getAuth();
  let user = auth.currentUser as User | null;

  // If user present, refresh token and return headers
  if (user) {
    const idToken = await user.getIdToken(true);
    return {
      Authorization: `Bearer ${idToken}`,
      'Content-Type': 'application/json',
    };
  }

  // Otherwise, wait for auth state to settle
  return await new Promise((resolve, reject) => {
    const timer = setTimeout(() => {
      unsubscribe();
      reject(new Error('NotAuthenticated: User not signed in. Please sign in to access admin features.'));
    }, timeoutMs);

    const unsubscribe = onAuthStateChanged(auth, async (u) => {
      if (u) {
        try {
          const token = await u.getIdToken(true);
          clearTimeout(timer);
          unsubscribe();
          resolve({
            Authorization: `Bearer ${token}`,
            'Content-Type': 'application/json',
          });
        } catch (err) {
          clearTimeout(timer);
          unsubscribe();
          reject(err);
        }
      }
    });
  });
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
