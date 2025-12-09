/**
 * useUserProfile Hook
 * 
 * Manages user profile state and API interactions.
 * Handles fetching, updating, and error management for user profile data.
 * 
 * Homer v1.0.0 - User Management
 */

import { useState, useCallback } from 'react';
import { apiFetch } from '../lib/apiFetch';

export interface UserProfile {
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

export interface UseUserProfileReturn {
  profile: UserProfile | null;
  loading: boolean;
  error: Error | null;
  fetchProfile: () => Promise<void>;
  updateProfile: (updates: Partial<Omit<UserProfile, 'uid'>>) => Promise<UserProfile>;
}

export function useUserProfile(): UseUserProfileReturn {
  const [profile, setProfile] = useState<UserProfile | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<Error | null>(null);

  const fetchProfile = useCallback(async () => {
    try {
      setLoading(true);
      setError(null);
      const response = await apiFetch<UserProfile>('/api/users/me', {
        method: 'GET',
      });
      setProfile(response);
    } catch (err) {
      const error = err instanceof Error ? err : new Error(String(err));
      setError(error);
      throw error;
    } finally {
      setLoading(false);
    }
  }, []);

  const updateProfile = useCallback(
    async (updates: Partial<Omit<UserProfile, 'uid'>>): Promise<UserProfile> => {
      try {
        setLoading(true);
        setError(null);
        
        // Only send allowed fields
        const body: Record<string, any> = {};
        if (updates.displayName !== undefined) body.displayName = updates.displayName;
        if (updates.photoURL !== undefined) body.photoURL = updates.photoURL;

        const response = await apiFetch<UserProfile>('/api/users/me', {
          method: 'PATCH',
          body: JSON.stringify(body),
        });
        
        setProfile(response);
        return response;
      } catch (err) {
        const error = err instanceof Error ? err : new Error(String(err));
        setError(error);
        throw error;
      } finally {
        setLoading(false);
      }
    },
    []
  );

  return {
    profile,
    loading,
    error,
    fetchProfile,
    updateProfile,
  };
}

export default useUserProfile;
