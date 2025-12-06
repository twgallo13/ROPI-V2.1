/**
 * Launch Calendar Signup Hook
 * 
 * Manages user signup for product launch notifications.
 * Writes to Firestore launchSignups collection.
 * 
 * Related Notion docs:
 * - Section 7 — Frontend & Launch Calendar: https://www.notion.so/2b845ee1ec5a81ecac18fa5c2bf3842e
 * - Launch Calendar DB Schema: https://www.notion.so/29745ee1ec5a80be8b83f113074a1837
 * - PROMPT_018C_vB Spec: Sprint B — Launch Calendar Signup Flow
 * 
 * Firestore Collection: launchSignups
 * Document ID: `${launchId}_${sha256(email || uid)}` (idempotent)
 * 
 * Fields:
 * - launchId: string (e.g., "launch_2025_q1_ropi_runner")
 * - productId: string (Product ID for the launch)
 * - userUid?: string (Firebase Auth UID, nullable for public signups)
 * - email?: string (User's email, required for public mode)
 * - createdAt: Timestamp
 * - source: 'aoss-web' | 'public-form'
 * - status: 'active' | 'cancelled' (default: 'active')
 * 
 * Modes:
 * - account: Requires sign-in, stores userUid
 * - public: Optional, email-only signups (if VITE_LAUNCH_SIGNUP_PUBLIC_ENABLED=true)
 * 
 * Usage:
 * ```tsx
 * const { signupForLaunch, isSignedUp, loading, error } = useLaunchSignup();
 * 
 * // Account-based signup (default)
 * await signupForLaunch({ launchId: 'launch_001', productId: 'prod_001', mode: 'account' });
 * 
 * // Public email signup (if enabled)
 * await signupForLaunch({ 
 *   launchId: 'launch_001', 
 *   productId: 'prod_001', 
 *   mode: 'public', 
 *   email: 'user@example.com' 
 * });
 * ```
 */

import { useState } from 'react';
import { doc, setDoc, getDoc, Timestamp } from 'firebase/firestore';
import { db } from '../firebaseConfig';
import { useAuth } from './useAuth';
import { getAuth } from 'firebase/auth';
import { captureLaunchSignupError, captureFirestoreError, addActionBreadcrumb } from '../monitoring/sentry';

interface SignupOptions {
  launchId: string;
  productId: string;
  mode: 'account' | 'public';
  email?: string; // Required for public mode
}

interface UseLaunchSignupReturn {
  signupForLaunch: (options: SignupOptions) => Promise<void>;
  isSignedUp: (launchId: string) => Promise<boolean>;
  loading: boolean;
  error: string | null;
}

/**
 * Simple SHA-256 hash implementation for document IDs
 * Uses Web Crypto API (browser-native)
 */
async function sha256(text: string): Promise<string> {
  const encoder = new TextEncoder();
  const data = encoder.encode(text);
  const hashBuffer = await crypto.subtle.digest('SHA-256', data);
  const hashArray = Array.from(new Uint8Array(hashBuffer));
  return hashArray.map(b => b.toString(16).padStart(2, '0')).join('');
}

export function useLaunchSignup(): UseLaunchSignupReturn {
  const { currentUser } = useAuth();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  /**
   * Sign up for launch notifications
   * 
   * Idempotent: Using sha256(email || uid) in doc ID prevents duplicate signups
   */
  const signupForLaunch = async (options: SignupOptions): Promise<void> => {
    const { launchId, productId, mode, email } = options;

    // Validation
    if (mode === 'account' && !currentUser) {
      throw new Error('Must be signed in for account-based signups');
    }

    if (mode === 'public') {
      const publicEnabled = import.meta.env.VITE_LAUNCH_SIGNUP_PUBLIC_ENABLED === 'true';
      if (!publicEnabled) {
        throw new Error('Public signups are not enabled');
      }
      if (!email) {
        throw new Error('Email is required for public signups');
      }
    }

    if (!db) {
      throw new Error('Firestore not available');
    }

    setLoading(true);
    setError(null);

    try {
      // Get authoritative auth uid directly from Firebase Auth (not from cached context)
      const auth = getAuth();
      const authUser = auth.currentUser;
      
      if (mode === 'account' && !authUser) {
        throw new Error('Firebase Auth user not available');
      }
      
      // Force token refresh to ensure auth state is fully propagated to Firestore
      // This addresses potential race conditions where the client thinks the user is
      // authenticated but Firestore hasn't received the valid token yet
      if (mode === 'account') {
        try {
          await authUser!.getIdToken(true); // Force refresh
          console.log('[DEBUG useLaunchSignup] Token refreshed successfully');
        } catch (tokenErr) {
          console.error('[DEBUG useLaunchSignup] Token refresh failed:', tokenErr);
          throw new Error('Failed to verify authentication. Please try again.');
        }
      }
      
      // Compute document ID: ${launchId}_${sha256(email || uid)}
      const identifier = mode === 'public' ? email! : authUser!.uid;
      const hashSuffix = await sha256(identifier);
      const signupId = `${launchId}_${hashSuffix}`;
      const signupRef = doc(db, 'launchSignups', signupId);

      // Prepare signup document with Timestamp.now() for createdAt
      // Note: Using Timestamp.now() instead of serverTimestamp() to ensure 
      // Firestore rules can validate the createdAt field exists
      const signupData: any = {
        launchId,
        productId,
        createdAt: Timestamp.now(),
        source: mode === 'public' ? 'public-form' : 'aoss-web',
        status: 'active',
      };

      if (mode === 'account') {
        // Use authoritative auth uid directly
        signupData.userUid = authUser!.uid;
        // Only include email if it exists (don't set undefined)
        if (authUser!.email) {
          signupData.email = authUser!.email;
        }
      } else {
        signupData.email = email;
        signupData.userUid = null; // Explicitly null for public signups
      }

      // DEBUG: Log payload before write (one-time debug for E2E investigation)
      console.log('[DEBUG useLaunchSignup] Payload before write:', {
        signupId,
        authUid: authUser?.uid,
        payloadUserUid: signupData.userUid,
        payloadSource: signupData.source,
        payloadStatus: signupData.status,
        payloadLaunchId: signupData.launchId,
        payloadProductId: signupData.productId,
        createdAtType: typeof signupData.createdAt,
        mode,
      });

      // Write signup document (idempotent via doc ID)
      await setDoc(signupRef, signupData);

      console.log(`✅ Launch signup successful: ${launchId} (${mode} mode)`);
      
      // Add breadcrumb for successful signup
      addActionBreadcrumb('launch_signup_submitted', {
        launchId,
        productId,
        mode,
      });
    } catch (err: any) {
      console.error('❌ Launch signup failed:', err);
      console.error('[DEBUG useLaunchSignup] Error details:', {
        code: err.code,
        message: err.message,
        name: err.name,
      });
      
      // Capture error in Sentry
      if (err.code?.startsWith('permission-denied') || err.message?.includes('permission')) {
        captureFirestoreError(err, {
          operation: 'launch_signup',
          launchId,
          productId,
          mode,
        });
      } else {
        captureLaunchSignupError(err, {
          launchId,
          productId,
          mode,
        });
      }
      
      const errorMessage = err.message || 'Failed to sign up for launch. Please try again.';
      setError(errorMessage);
      throw new Error(errorMessage);
    } finally {
      setLoading(false);
    }
  };

  /**
   * Check if user is already signed up for a launch
   */
  const isSignedUp = async (launchId: string): Promise<boolean> => {
    if (!currentUser || !db) {
      return false;
    }

    try {
      const hashSuffix = await sha256(currentUser.uid);
      const signupId = `${launchId}_${hashSuffix}`;
      const signupRef = doc(db, 'launchSignups', signupId);
      const signupDoc = await getDoc(signupRef);
      
      return signupDoc.exists() && signupDoc.data()?.status === 'active';
    } catch (err) {
      console.error('Failed to check signup status:', err);
      return false;
    }
  };

  return {
    signupForLaunch,
    isSignedUp,
    loading,
    error,
  };
}
