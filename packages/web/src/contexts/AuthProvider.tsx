/**
 * Firebase Auth Provider for ROPI AOSS
 * 
 * Provides authentication state and methods throughout the app.
 * Handles Google OAuth, Email/Password sign-in, and admin detection.
 * 
 * Related Notion docs:
 * - Section 9 — Security & IAM: https://www.notion.so/2b845ee1ec5a81739de7fc1743de9a33
 * - PROMPT_018B Spec: See HOMER_PROMPT_018B_AUDIT.txt
 * 
 * Key Features:
 * - Google OAuth sign-in (primary method)
 * - Email/Password sign-in with email verification
 * - Admin detection via Firestore metadata/admins
 * - Persistent auth state across page reloads
 * - Loading state during initialization
 * 
 * Admin Semantics:
 * - Admin list stored in Firestore: metadata/admins
 * - isAdmin computed from currentUser.email in admins.emails[]
 * - Admins can resolve any observation (not just their own)
 */

import { createContext, useContext, useState, useEffect, ReactNode } from 'react';
import {
  User,
  GoogleAuthProvider,
  signInWithPopup,
  signInWithEmailAndPassword,
  createUserWithEmailAndPassword,
  sendEmailVerification,
  signOut as firebaseSignOut,
  onAuthStateChanged,
} from 'firebase/auth';
import { doc, getDoc } from 'firebase/firestore';
import { auth, db, isAuthAvailable } from '../firebaseConfig';

interface AuthContextValue {
  currentUser: User | null;
  isAdmin: boolean;
  emailVerified: boolean;
  loading: boolean;
  signInWithGoogle: () => Promise<void>;
  signInWithEmail: (email: string, password: string) => Promise<void>;
  signUpWithEmail: (email: string, password: string) => Promise<void>;
  signOut: () => Promise<void>;
  resendVerificationEmail: () => Promise<void>;
}

const AuthContext = createContext<AuthContextValue | undefined>(undefined);

interface AuthProviderProps {
  children: ReactNode;
}

export function AuthProvider({ children }: AuthProviderProps) {
  const [currentUser, setCurrentUser] = useState<User | null>(null);
  const [isAdmin, setIsAdmin] = useState(false);
  const [emailVerified, setEmailVerified] = useState(false);
  const [loading, setLoading] = useState(true);

  // Check if user is admin via custom claims (production) or metadata fallback (staging)
  async function checkAdminStatus(user: User | null): Promise<boolean> {
    if (!user) {
      return false;
    }

    try {
      // PRIORITY 1: Check custom claims (production)
      const tokenResult = await user.getIdTokenResult(true);
      if (tokenResult.claims.role === 'admin') {
        console.log(`🔐 Admin check for ${user.email}:`, '✅ Admin (via custom claims)');
        return true;
      }

      // PRIORITY 2: Fallback to metadata/admins (staging)
      if (!db) {
        return false;
      }

      const adminDocRef = doc(db, 'metadata', 'admins');
      const adminDoc = await getDoc(adminDocRef);
      
      if (!adminDoc.exists()) {
        console.warn('⚠️ Admin allow-list not found in Firestore (metadata/admins)');
        return false;
      }

      const adminData = adminDoc.data();
      const adminEmails: string[] = adminData?.emails || [];
      
      const isUserAdmin = adminEmails.includes(user.email || '');
      console.log(`🔐 Admin check for ${user.email}:`, isUserAdmin ? '✅ Admin (via metadata/admins fallback)' : '❌ Not admin');
      
      return isUserAdmin;
    } catch (error) {
      console.error('❌ Failed to check admin status:', error);
      return false;
    }
  }

  // Subscribe to auth state changes
  useEffect(() => {
    if (!auth || !isAuthAvailable()) {
      console.warn('⚠️ Firebase Auth not available, running without authentication');
      setLoading(false);
      return;
    }

    const unsubscribe = onAuthStateChanged(auth, async (user) => {
      console.log('🔐 Auth state changed:', user ? `User: ${user.email}` : 'No user');
      setCurrentUser(user);

      if (user) {
        const adminStatus = await checkAdminStatus(user);
        setIsAdmin(adminStatus);
        setEmailVerified(user.emailVerified);
        console.log(`📧 Email verified for ${user.email}:`, user.emailVerified ? '✅ Yes' : '❌ No');
      } else {
        setIsAdmin(false);
        setEmailVerified(false);
      }

      setLoading(false);
    });

    // Cleanup subscription on unmount
    return () => unsubscribe();
  }, []);

  // Sign in with Google OAuth
  const handleSignInWithGoogle = async () => {
    if (!auth || !isAuthAvailable()) {
      throw new Error('Firebase Auth not available');
    }

    try {
      const provider = new GoogleAuthProvider();
      // Force account selection on every sign-in
      provider.setCustomParameters({ prompt: 'select_account' });
      
      const result = await signInWithPopup(auth, provider);
      console.log('✅ Google sign-in successful:', result.user.email);
    } catch (error: any) {
      console.error('❌ Google sign-in failed:', error);
      
      // Handle specific error cases
      if (error.code === 'auth/popup-closed-by-user') {
        throw new Error('Sign-in popup was closed. Please try again.');
      } else if (error.code === 'auth/popup-blocked') {
        throw new Error('Sign-in popup was blocked. Please allow popups for this site.');
      } else if (error.code === 'auth/unauthorized-domain') {
        throw new Error('This domain is not authorized for OAuth. Please contact support.');
      } else {
        throw new Error(error.message || 'Google sign-in failed. Please try again.');
      }
    }
  };

  // Sign in with Email/Password
  const handleSignInWithEmail = async (email: string, password: string) => {
    if (!auth || !isAuthAvailable()) {
      throw new Error('Firebase Auth not available');
    }

    try {
      const result = await signInWithEmailAndPassword(auth, email, password);
      console.log('✅ Email sign-in successful:', result.user.email);
    } catch (error: any) {
      console.error('❌ Email sign-in failed:', error);
      
      // Friendly error messages
      if (error.code === 'auth/user-not-found') {
        throw new Error('No account found with this email');
      } else if (error.code === 'auth/wrong-password') {
        throw new Error('Incorrect password');
      } else if (error.code === 'auth/invalid-email') {
        throw new Error('Please enter a valid email address');
      } else if (error.code === 'auth/user-disabled') {
        throw new Error('This account has been disabled');
      } else if (error.code === 'auth/too-many-requests') {
        throw new Error('Too many failed attempts. Please try again later.');
      } else {
        throw new Error(error.message || 'Sign-in failed. Please try again.');
      }
    }
  };

  // Sign up with Email/Password
  const handleSignUpWithEmail = async (email: string, password: string) => {
    if (!auth || !isAuthAvailable()) {
      throw new Error('Firebase Auth not available');
    }

    try {
      const result = await createUserWithEmailAndPassword(auth, email, password);
      console.log('✅ Email sign-up successful:', result.user.email);
      
      // Send email verification
      await sendEmailVerification(result.user);
      console.log('📧 Verification email sent to:', email);
      
      // Note: User can access app before verifying email (see PROMPT_018B spec ambiguity #2)
      // Future: Add banner "Please verify your email" or block access until verified
    } catch (error: any) {
      console.error('❌ Email sign-up failed:', error);
      
      // Friendly error messages
      if (error.code === 'auth/email-already-in-use') {
        throw new Error('An account with this email already exists');
      } else if (error.code === 'auth/invalid-email') {
        throw new Error('Please enter a valid email address');
      } else if (error.code === 'auth/weak-password') {
        throw new Error('Password must be at least 6 characters');
      } else if (error.code === 'auth/operation-not-allowed') {
        throw new Error('Email/password sign-up is not enabled. Please contact support.');
      } else {
        throw new Error(error.message || 'Sign-up failed. Please try again.');
      }
    }
  };

  // Sign out
  const handleSignOut = async () => {
    if (!auth || !isAuthAvailable()) {
      throw new Error('Firebase Auth not available');
    }

    try {
      await firebaseSignOut(auth);
      console.log('✅ Sign-out successful');
    } catch (error: any) {
      console.error('❌ Sign-out failed:', error);
      throw new Error(error.message || 'Sign-out failed. Please try again.');
    }
  };

  // Resend email verification
  const handleResendVerificationEmail = async () => {
    if (!auth || !isAuthAvailable()) {
      throw new Error('Firebase Auth not available');
    }

    if (!currentUser) {
      throw new Error('No user signed in');
    }

    try {
      await sendEmailVerification(currentUser);
      console.log('📧 Verification email sent to:', currentUser.email);
    } catch (error: any) {
      console.error('❌ Failed to send verification email:', error);
      
      if (error.code === 'auth/too-many-requests') {
        throw new Error('Too many requests. Please try again later.');
      } else {
        throw new Error(error.message || 'Failed to send verification email. Please try again.');
      }
    }
  };

  const value: AuthContextValue = {
    currentUser,
    isAdmin,
    emailVerified,
    loading,
    signInWithGoogle: handleSignInWithGoogle,
    signInWithEmail: handleSignInWithEmail,
    signUpWithEmail: handleSignUpWithEmail,
    signOut: handleSignOut,
    resendVerificationEmail: handleResendVerificationEmail,
  };

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

/**
 * Hook to consume AuthContext
 * 
 * Usage:
 * ```tsx
 * const { currentUser, isAdmin, signInWithGoogle, signOut } = useAuth();
 * ```
 * 
 * Throws error if used outside AuthProvider
 */
export function useAuth(): AuthContextValue {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
}
