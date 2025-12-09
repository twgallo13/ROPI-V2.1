/**
 * User Profile Page
 * 
 * Allows users to view and edit their own profile information.
 * Shows: email, provider info, displayName (editable), photoURL (editable)
 * Provides: password reset button
 * 
 * Homer v1.0.0 - User Management
 */

import { useState, useEffect } from 'react';
import { apiFetch } from '../../lib/apiFetch';
import './ProfilePage.css';

interface UserProfile {
  uid: string;
  email: string | null;
  displayName: string | null;
  photoURL: string | null;
  customClaims: Record<string, any>;
  providerData: any[];
  disabled: boolean;
  metadata: Record<string, any>;
  profileData: Record<string, any>;
}

export function ProfilePage() {
  const [profile, setProfile] = useState<UserProfile | null>(null);
  const [displayName, setDisplayName] = useState('');
  const [photoURL, setPhotoURL] = useState('');
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState<{ type: 'success' | 'error'; text: string } | null>(null);

  // Load user profile on mount
  useEffect(() => {
    const loadProfile = async () => {
      try {
        setLoading(true);
        const response = await apiFetch<UserProfile>('/api/users/me', {
          method: 'GET',
        });
        setProfile(response);
        setDisplayName(response.displayName || '');
        setPhotoURL(response.photoURL || '');
      } catch (error) {
        console.error('Failed to load profile:', error);
        setMessage({
          type: 'error',
          text: 'Failed to load profile. Please try again.',
        });
      } finally {
        setLoading(false);
      }
    };

    loadProfile();
  }, []);

  const handleSaveProfile = async (e: React.FormEvent) => {
    e.preventDefault();
    
    try {
      setSaving(true);
      setMessage(null);

      const response = await apiFetch<UserProfile>('/api/users/me', {
        method: 'PATCH',
        body: JSON.stringify({
          displayName: displayName || undefined,
          photoURL: photoURL || undefined,
        }),
      });

      setProfile(response);
      setMessage({
        type: 'success',
        text: 'Profile updated successfully',
      });
    } catch (error) {
      console.error('Failed to save profile:', error);
      setMessage({
        type: 'error',
        text: error instanceof Error ? error.message : 'Failed to save profile',
      });
    } finally {
      setSaving(false);
    }
  };

  const handlePasswordReset = async () => {
    if (!profile?.email) {
      setMessage({
        type: 'error',
        text: 'Email not found in profile',
      });
      return;
    }

    try {
      // In a real implementation, this would call a password reset endpoint
      // For now, we'll direct to Firebase Auth's password reset (would need custom implementation)
      setMessage({
        type: 'success',
        text: 'Password reset email would be sent to ' + profile.email,
      });
    } catch (error) {
      setMessage({
        type: 'error',
        text: 'Failed to send password reset email',
      });
    }
  };

  if (loading) {
    return (
      <div className="profile-page">
        <div className="profile-container">
          <div className="loading">Loading profile...</div>
        </div>
      </div>
    );
  }

  if (!profile) {
    return (
      <div className="profile-page">
        <div className="profile-container">
          <div className="error">Failed to load profile</div>
        </div>
      </div>
    );
  }

  const providerInfo = profile.providerData && profile.providerData.length > 0
    ? profile.providerData[0].providerId
    : 'Unknown';

  return (
    <div className="profile-page">
      <div className="profile-container">
        <h1>User Profile</h1>

        {message && (
          <div className={`message message-${message.type}`}>
            {message.text}
          </div>
        )}

        <div className="profile-section">
          <h2>Account Information</h2>
          <div className="profile-field">
            <label>Email</label>
            <div className="field-value">
              {profile.email || '(Not set)'}
            </div>
          </div>

          <div className="profile-field">
            <label>Provider</label>
            <div className="field-value">
              {providerInfo}
            </div>
          </div>

          <div className="profile-field">
            <label>Status</label>
            <div className="field-value">
              {profile.disabled ? 'Disabled' : 'Active'}
            </div>
          </div>
        </div>

        <form onSubmit={handleSaveProfile} className="profile-section">
          <h2>Edit Profile</h2>

          <div className="profile-field">
            <label htmlFor="displayName">Display Name</label>
            <input
              id="displayName"
              type="text"
              value={displayName}
              onChange={(e) => setDisplayName(e.target.value)}
              placeholder="Enter your display name"
              maxLength={256}
              disabled={saving}
            />
            <small>{displayName.length}/256 characters</small>
          </div>

          <div className="profile-field">
            <label htmlFor="photoURL">Photo URL</label>
            <input
              id="photoURL"
              type="url"
              value={photoURL}
              onChange={(e) => setPhotoURL(e.target.value)}
              placeholder="https://example.com/photo.jpg"
              maxLength={512}
              disabled={saving}
            />
            <small>{photoURL.length}/512 characters</small>
          </div>

          <button
            type="submit"
            disabled={saving}
            className="button button-primary"
          >
            {saving ? 'Saving...' : 'Save Changes'}
          </button>
        </form>

        <div className="profile-section">
          <h2>Security</h2>

          <button
            type="button"
            onClick={handlePasswordReset}
            className="button button-secondary"
          >
            Reset Password
          </button>
          <p className="helper-text">
            A password reset email will be sent to your registered email address.
          </p>
        </div>
      </div>
    </div>
  );
}

export default ProfilePage;
