/**
 * Sign-In Modal Component
 * 
 * Modal dialog for Google OAuth and Email/Password authentication.
 * Toggles between "Sign In" and "Sign Up" modes.
 * 
 * Related Notion docs:
 * - Section 9 — Security & IAM: https://www.notion.so/2b845ee1ec5a81739de7fc1743de9a33
 * - PROMPT_018B Spec: See HOMER_PROMPT_018B_AUDIT.txt
 * 
 * Features:
 * - Google Sign-in button (primary, top of form)
 * - Email/Password sign-in form with validation
 * - Email/Password sign-up with email verification
 * - Tab/toggle between sign-in and sign-up modes
 * - Friendly error messages for Firebase auth errors
 * - Close button and overlay dismiss
 * - Loading state during auth operations
 * 
 * Props:
 * - isOpen: boolean - Controls modal visibility
 * - onClose: () => void - Callback when modal closes
 * - onSuccess: () => void - Optional callback after successful auth
 */

import { useState, FormEvent } from 'react';
import { useAuth } from '@/hooks/useAuth';
import './SignInModal.css';

interface SignInModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSuccess?: () => void;
}

type AuthMode = 'signin' | 'signup';

function SignInModal({ isOpen, onClose, onSuccess }: SignInModalProps) {
  const { signInWithGoogle, signInWithEmail, signUpWithEmail } = useAuth();
  
  const [mode, setMode] = useState<AuthMode>('signin');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);

  if (!isOpen) return null;

  const handleOverlayClick = (e: React.MouseEvent<HTMLDivElement>) => {
    if (e.target === e.currentTarget) {
      handleClose();
    }
  };

  const handleClose = () => {
    setEmail('');
    setPassword('');
    setError(null);
    setSuccessMessage(null);
    setMode('signin');
    onClose();
  };

  const handleGoogleSignIn = async () => {
    setError(null);
    setLoading(true);

    try {
      await signInWithGoogle();
      setSuccessMessage('Signed in with Google successfully!');
      setTimeout(() => {
        handleClose();
        onSuccess?.();
      }, 500);
    } catch (err: any) {
      setError(err.message || 'Google sign-in failed. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  const handleEmailAuth = async (e: FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    setError(null);
    setSuccessMessage(null);
    setLoading(true);

    // Basic validation
    if (!email.trim()) {
      setError('Please enter your email');
      setLoading(false);
      return;
    }

    if (!password.trim()) {
      setError('Please enter your password');
      setLoading(false);
      return;
    }

    if (mode === 'signup' && password.length < 6) {
      setError('Password must be at least 6 characters');
      setLoading(false);
      return;
    }

    try {
      if (mode === 'signin') {
        await signInWithEmail(email, password);
        setSuccessMessage('Signed in successfully!');
        setTimeout(() => {
          handleClose();
          onSuccess?.();
        }, 500);
      } else {
        await signUpWithEmail(email, password);
        setSuccessMessage('Account created! Verification email sent. Please check your inbox.');
        // Give user time to read message before closing
        setTimeout(() => {
          handleClose();
          onSuccess?.();
        }, 2000);
      }
    } catch (err: any) {
      setError(err.message || 'Authentication failed. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  const toggleMode = () => {
    setMode(mode === 'signin' ? 'signup' : 'signin');
    setError(null);
    setSuccessMessage(null);
    setEmail('');
    setPassword('');
  };

  return (
    <div className="signin-modal-overlay" onClick={handleOverlayClick} data-testid="signin-modal">
      <div className="signin-modal">
        <button
          className="signin-modal-close"
          onClick={handleClose}
          aria-label="Close sign-in modal"
          disabled={loading}
        >
          ✕
        </button>

        <div className="signin-modal-header">
          <h2>{mode === 'signin' ? 'Sign In' : 'Sign Up'}</h2>
          <p className="signin-modal-subtitle">
            {mode === 'signin'
              ? 'Sign in to access ROPI AOSS'
              : 'Create an account to get started'}
          </p>
        </div>

        <div className="signin-modal-body">
          {/* Success Message */}
          {successMessage && (
            <div className="signin-alert signin-alert-success">
              {successMessage}
            </div>
          )}

          {/* Error Message */}
          {error && (
            <div className="signin-alert signin-alert-error">
              {error}
            </div>
          )}

          {/* Google Sign-In Button */}
          <button
            className="signin-btn-google"
            onClick={handleGoogleSignIn}
            disabled={loading}
            type="button"
          >
            <svg className="signin-google-icon" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
              <path d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" fill="#4285F4"/>
              <path d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" fill="#34A853"/>
              <path d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z" fill="#FBBC05"/>
              <path d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" fill="#EA4335"/>
            </svg>
            {loading ? 'Signing in...' : `Sign in with Google`}
          </button>

          <div className="signin-divider">
            <span>or</span>
          </div>

          {/* Email/Password Form */}
          <form onSubmit={handleEmailAuth} className="signin-form">
            <div className="signin-form-group">
              <label htmlFor="email">Email</label>
              <input
                id="email"
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="you@example.com"
                disabled={loading}
                required
                autoComplete={mode === 'signin' ? 'email' : 'email'}
                data-testid="email-input"
              />
            </div>

            <div className="signin-form-group">
              <label htmlFor="password">Password</label>
              <input
                id="password"
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder={mode === 'signup' ? 'At least 6 characters' : 'Enter your password'}
                disabled={loading}
                required
                autoComplete={mode === 'signin' ? 'current-password' : 'new-password'}
                data-testid="password-input"
              />
            </div>

            {mode === 'signin' && (
              <div className="signin-form-footer">
                <a href="#" className="signin-forgot-password" onClick={(e) => e.preventDefault()}>
                  Forgot password?
                </a>
              </div>
            )}

            <button
              type="submit"
              className="signin-btn-primary"
              disabled={loading}
              data-testid="signin-submit"
            >
              {loading
                ? (mode === 'signin' ? 'Signing in...' : 'Creating account...')
                : (mode === 'signin' ? 'Sign In' : 'Sign Up')}
            </button>
          </form>

          {/* Toggle between Sign In and Sign Up */}
          <div className="signin-toggle">
            {mode === 'signin' ? (
              <p>
                Don't have an account?{' '}
                <button
                  type="button"
                  className="signin-toggle-btn"
                  onClick={toggleMode}
                  disabled={loading}
                >
                  Sign up
                </button>
              </p>
            ) : (
              <p>
                Already have an account?{' '}
                <button
                  type="button"
                  className="signin-toggle-btn"
                  onClick={toggleMode}
                  disabled={loading}
                >
                  Sign in
                </button>
              </p>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}

export default SignInModal;
