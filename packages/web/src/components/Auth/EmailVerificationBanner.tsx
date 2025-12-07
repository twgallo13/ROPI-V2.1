/**
 * Email Verification Banner
 * 
 * Displays a banner prompting users to verify their email address.
 * 
 * Behavior:
 * - Staging: Soft enforcement (banner shown, writes allowed)
 * - Production: Hard enforcement (banner shown, writes blocked)
 * 
 * Related:
 * - PROMPT_018C_vB Spec: Sprint B — Email Verification Policy
 * - Section 9 — Security & IAM: https://www.notion.so/2b845ee1ec5a81739de7fc1743de9a33
 */

import { useState } from 'react';
import { useAuth } from '../../hooks/useAuth';
import './EmailVerificationBanner.css';

export function EmailVerificationBanner() {
  const { currentUser, emailVerified, resendVerificationEmail } = useAuth();
  const [sending, setSending] = useState(false);
  const [sent, setSent] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Only show banner if user is signed in and email is not verified
  if (!currentUser || emailVerified) {
    return null;
  }

  const handleResendClick = async () => {
    setSending(true);
    setError(null);
    setSent(false);

    try {
      await resendVerificationEmail();
      setSent(true);
      setTimeout(() => setSent(false), 5000); // Hide success message after 5s
    } catch (err: any) {
      setError(err.message || 'Failed to send verification email');
    } finally {
      setSending(false);
    }
  };

  return (
    <div className="email-verification-banner" data-testid="email-verification-banner">
      <div className="banner-content">
        <div className="banner-icon">📧</div>
        <div className="banner-text">
          <strong>Email verification required</strong>
          <p>
            Please verify your email address to ensure full access.
            Check your inbox for the verification link.
          </p>
        </div>
        <button
          className="banner-button"
          onClick={handleResendClick}
          disabled={sending || sent}
          data-testid="resend-verification-button"
        >
          {sent ? '✅ Sent!' : sending ? 'Sending...' : 'Resend Email'}
        </button>
      </div>
      {error && <div className="banner-error">{error}</div>}
    </div>
  );
}
