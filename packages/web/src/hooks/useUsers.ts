/**
 * useUsers Hook
 * 
 * React hook for user management API operations.
 * Handles CRUD operations for users with optimistic updates.
 * 
 * Homer v1.0.0 - User Management
 */

import { useState, useEffect, useCallback } from 'react';
import { useAuth } from '../contexts/AuthProvider';

export interface User {
  uid: string;
  email: string | undefined;
  displayName: string | undefined;
  emailVerified: boolean;
  role: string | undefined;
  customClaims: Record<string, any> | undefined;
  metadata: {
    creationTime: string | undefined;
    lastSignInTime: string | undefined;
    lastRefreshTime: string | undefined;
  };
  disabled: boolean;
  providerData: any[];
}

export interface UserProfile {
  uid: string;
  email: string;
  displayName?: string;
  role: string;
  emailVerified: boolean;
  createdAt: any;
  updatedAt: any;
  lastSignInTime?: string;
  createdBy: string;
  updatedBy: string;
  deletedAt?: any;
  metadata?: Record<string, any>;
}

export interface Role {
  value: string;
  label: string;
  description: string;
}

interface UsersListResponse {
  users: User[];
  pageToken?: string;
  totalUsers: number;
}

interface UseUsersReturn {
  users: User[];
  loading: boolean;
  error: string | null;
  roles: Role[];
  pageToken: string | undefined;
  hasMore: boolean;
  fetchUsers: (pageToken?: string) => Promise<void>;
  getUser: (uid: string) => Promise<User | null>;
  createUser: (data: CreateUserData) => Promise<User>;
  updateUser: (uid: string, data: UpdateUserData) => Promise<User>;
  deleteUser: (uid: string, soft?: boolean) => Promise<void>;
  resetPassword: (uid: string) => Promise<{ message: string; resetLink?: string }>;
  fetchRoles: () => Promise<void>;
}

export interface CreateUserData {
  email: string;
  password?: string;
  displayName?: string;
  role?: string;
  sendInvite?: boolean;
}

export interface UpdateUserData {
  email?: string;
  displayName?: string;
  role?: string;
  emailVerified?: boolean;
  disabled?: boolean;
}

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

/**
 * useUsers hook for user management
 */
export function useUsers(): UseUsersReturn {
  const [users, setUsers] = useState<User[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [roles, setRoles] = useState<Role[]>([]);
  const [pageToken, setPageToken] = useState<string | undefined>(undefined);
  const [hasMore, setHasMore] = useState(false);
  
  const { isAdmin } = useAuth();
  
  /**
   * Fetch list of users
   */
  const fetchUsers = useCallback(async (nextPageToken?: string) => {
    if (!isAdmin) {
      setError('Admin access required');
      return;
    }
    
    try {
      setLoading(true);
      setError(null);
      
      const params = new URLSearchParams();
      if (nextPageToken) {
        params.append('pageToken', nextPageToken);
      }
      
      const queryString = params.toString();
      const endpoint = `/admin/settings/users${queryString ? `?${queryString}` : ''}`;
      
      const response = await apiRequest<UsersListResponse>(endpoint);
      
      if (nextPageToken) {
        // Append to existing users for pagination
        setUsers(prev => [...prev, ...response.users]);
      } else {
        // Replace users for initial load
        setUsers(response.users);
      }
      
      setPageToken(response.pageToken);
      setHasMore(!!response.pageToken);
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Failed to fetch users';
      setError(message);
      console.error('Failed to fetch users:', err);
    } finally {
      setLoading(false);
    }
  }, [isAdmin]);
  
  /**
   * Get single user by UID
   */
  const getUser = useCallback(async (uid: string): Promise<User | null> => {
    if (!isAdmin) {
      throw new Error('Admin access required');
    }
    
    try {
      const response = await apiRequest<User>(`/admin/settings/users/${uid}`);
      return response;
    } catch (err) {
      console.error('Failed to fetch user:', err);
      throw err;
    }
  }, [isAdmin]);
  
  /**
   * Create new user
   */
  const createUser = useCallback(async (data: CreateUserData): Promise<User> => {
    if (!isAdmin) {
      throw new Error('Admin access required');
    }
    
    try {
      setLoading(true);
      setError(null);
      
      const response = await apiRequest<User>('/admin/settings/users', {
        method: 'POST',
        body: JSON.stringify(data),
      });
      
      // Optimistically add to list
      setUsers(prev => [response, ...prev]);
      
      return response;
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Failed to create user';
      setError(message);
      throw err;
    } finally {
      setLoading(false);
    }
  }, [isAdmin]);
  
  /**
   * Update existing user
   */
  const updateUser = useCallback(async (uid: string, data: UpdateUserData): Promise<User> => {
    if (!isAdmin) {
      throw new Error('Admin access required');
    }
    
    try {
      setLoading(true);
      setError(null);
      
      const response = await apiRequest<User>(`/admin/settings/users/${uid}`, {
        method: 'PATCH',
        body: JSON.stringify(data),
      });
      
      // Optimistically update in list
      setUsers(prev => prev.map(u => u.uid === uid ? response : u));
      
      return response;
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Failed to update user';
      setError(message);
      throw err;
    } finally {
      setLoading(false);
    }
  }, [isAdmin]);
  
  /**
   * Delete user
   */
  const deleteUser = useCallback(async (uid: string, soft = false): Promise<void> => {
    if (!isAdmin) {
      throw new Error('Admin access required');
    }
    
    try {
      setLoading(true);
      setError(null);
      
      await apiRequest<void>(`/admin/settings/users/${uid}?soft=${soft}`, {
        method: 'DELETE',
      });
      
      // Remove from list
      setUsers(prev => prev.filter(u => u.uid !== uid));
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Failed to delete user';
      setError(message);
      throw err;
    } finally {
      setLoading(false);
    }
  }, [isAdmin]);
  
  /**
   * Send password reset email
   */
  const resetPassword = useCallback(async (uid: string): Promise<{ message: string; resetLink?: string }> => {
    if (!isAdmin) {
      throw new Error('Admin access required');
    }
    
    try {
      const response = await apiRequest<{ message: string; resetLink?: string }>(
        `/admin/settings/users/${uid}/reset-password`,
        { method: 'POST' }
      );
      
      return response;
    } catch (err) {
      throw err;
    }
  }, [isAdmin]);
  
  /**
   * Fetch available roles
   */
  const fetchRoles = useCallback(async () => {
    if (!isAdmin) {
      return;
    }
    
    try {
      const response = await apiRequest<{ roles: Role[] }>('/admin/settings/roles');
      setRoles(response.roles);
    } catch (err) {
      console.error('Failed to fetch roles:', err);
    }
  }, [isAdmin]);
  
  // Fetch users and roles on mount
  useEffect(() => {
    if (isAdmin) {
      fetchUsers();
      fetchRoles();
    }
  }, [isAdmin, fetchUsers, fetchRoles]);
  
  return {
    users,
    loading,
    error,
    roles,
    pageToken,
    hasMore,
    fetchUsers,
    getUser,
    createUser,
    updateUser,
    deleteUser,
    resetPassword,
    fetchRoles,
  };
}
