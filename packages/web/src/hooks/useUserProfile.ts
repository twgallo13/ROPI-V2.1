/**
 * useUserProfile Hook
 * 
 * Manages user profile state and API interactions.
 * Handles fetching, updating, and error management for user profile data.
 * 
 * Homer v1.0.0 - User Management
 */

import { useState, useCallback } from 'react';

const API_BASE = import.meta.env.VITE_API_BASE || '';

/**
 * Get auth token for API requests
 */
async function getAuthToken(): Promise<string | null> {
  const { auth } = await import('../firebaseConfig');
  if (!auth || !auth.currentUser) {
    return null;
  }
  return auth.currentUser.getIdToken();
}

/**
 * Make authenticated API request
 */
async function apiRequest<T>(
  endpoint: string,
  options: RequestInit = {}
): Promise<T> {
  const token = await getAuthToken();
  
  if (!token) {
    throw new Error('Authentication required');
  }
  
  const url = `${API_BASE}${endpoint}`;
  const response = await fetch(url, {
    ...options,
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${token}`,
      ...options.headers,
    },
  });
  
  if (!response.ok) {
    const error = await response.json().catch(() => ({ message: 'Request failed' }));
    throw new Error(error.message || `HTTP ${response.status}`);
  }
  
  if (response.status === 204) {
    return {} as T;
  }
  
  return response.json();
}

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
      const response = await apiRequest<UserProfile>('/users/me', {
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

        const response = await apiRequest<UserProfile>('/users/me', {
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
