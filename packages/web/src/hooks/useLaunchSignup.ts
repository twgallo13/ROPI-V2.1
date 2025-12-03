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
      // Compute document ID: ${launchId}_${sha256(email || uid)}
      const identifier = mode === 'public' ? email! : currentUser!.uid;
      const hashSuffix = await sha256(identifier);
      const signupId = `${launchId}_${hashSuffix}`;
      const signupRef = doc(db, 'launchSignups', signupId);

      // Prepare signup document
      const signupData: any = {
        launchId,
        productId,
        createdAt: Timestamp.now(),
        source: mode === 'public' ? 'public-form' : 'aoss-web',
        status: 'active',
      };

      if (mode === 'account') {
        signupData.userUid = currentUser!.uid;
        signupData.email = currentUser!.email || undefined;
      } else {
        signupData.email = email;
        signupData.userUid = null; // Explicitly null for public signups
      }

      // Write signup document (idempotent via doc ID)
      await setDoc(signupRef, signupData);

      console.log(`✅ Launch signup successful: ${launchId} (${mode} mode)`);
    } catch (err: any) {
      console.error('❌ Launch signup failed:', err);
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
