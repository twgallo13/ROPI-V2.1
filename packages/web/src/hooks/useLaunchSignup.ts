/**
 * Launch Calendar Signup Hook
 * 
 * Manages user signup for product launch notifications.
 * Writes to Firestore launchSignups collection.
 * 
 * Related Notion docs:
 * - Section 7 — Frontend & Launch Calendar: https://www.notion.so/2b845ee1ec5a81ecac18fa5c2bf3842e
 * - Launch Calendar DB Schema: https://www.notion.so/29745ee1ec5a80be8b83f113074a1837
 * - PROMPT_018B Spec: See HOMER_PROMPT_018B_AUDIT.txt
 * 
 * Firestore Collection: launchSignups
 * Document ID: `${launchId}_${userUid}` (composite key, idempotent)
 * 
 * Fields:
 * - launchId: string (e.g., "launch_2025_q1_ropi_runner")
 * - userUid: string (Firebase Auth UID)
 * - email: string (User's email for notifications)
 * - createdAt: Timestamp
 * - source: string ("aoss-staging")
 * 
 * Usage:
 * ```tsx
 * const { signupForLaunch, isSignedUp, loading, error } = useLaunchSignup();
 * 
 * if (!currentUser) {
 *   // Show sign-in modal
 * } else {
 *   await signupForLaunch(launchId);
 * }
 * ```
 */

import { useState } from 'react';
import { doc, setDoc, getDoc, Timestamp } from 'firebase/firestore';
import { db } from '../firebaseConfig';
import { useAuth } from './useAuth';

interface UseLaunchSignupReturn {
  signupForLaunch: (launchId: string) => Promise<void>;
  isSignedUp: (launchId: string) => Promise<boolean>;
  loading: boolean;
  error: string | null;
}

export function useLaunchSignup(): UseLaunchSignupReturn {
  const { currentUser } = useAuth();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  /**
   * Sign up for launch notifications
   * 
   * Idempotent: Using composite doc ID prevents duplicate signups
   */
  const signupForLaunch = async (launchId: string): Promise<void> => {
    if (!currentUser) {
      throw new Error('Must be authenticated to sign up for launches');
    }

    if (!db) {
      throw new Error('Firestore not available');
    }

    setLoading(true);
    setError(null);

    try {
      const signupId = `${launchId}_${currentUser.uid}`;
      const signupRef = doc(db, 'launchSignups', signupId);

      // Write signup document (idempotent via doc ID)
      await setDoc(signupRef, {
        launchId,
        userUid: currentUser.uid,
        email: currentUser.email || 'no-email@example.com',
        createdAt: Timestamp.now(),
        source: 'aoss-staging',
      });

      console.log(`✅ Launch signup successful: ${launchId} for ${currentUser.email}`);
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
      const signupId = `${launchId}_${currentUser.uid}`;
      const signupRef = doc(db, 'launchSignups', signupId);
      const signupDoc = await getDoc(signupRef);
      
      return signupDoc.exists();
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
