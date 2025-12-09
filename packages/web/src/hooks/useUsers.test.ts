/**
 * useUsers Hook Tests
 * 
 * Unit tests for user management React hook.
 * 
 * Homer v1.0.0 - User Management
 */

import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { renderHook, waitFor, act } from '@testing-library/react';
import { useUsers } from './useUsers';

// Mock fetch
global.fetch = vi.fn();

// Mock AuthProvider
vi.mock('../contexts/AuthProvider', () => ({
  useAuth: () => ({
    isAdmin: true,
    currentUser: { uid: 'test-admin', email: 'admin@test.com' },
  }),
}));

// Mock firebaseConfig
vi.mock('../firebaseConfig', () => ({
  auth: {
    currentUser: {
      getIdToken: vi.fn().mockResolvedValue('mock-token'),
    },
  },
}));

describe('useUsers Hook', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  describe('fetchUsers', () => {
    it('should fetch users list', async () => {
      const mockUsers = [
        {
          uid: 'user1',
          email: 'user1@test.com',
          displayName: 'User One',
          emailVerified: true,
          role: 'user',
          metadata: {
            creationTime: '2024-01-01',
            lastSignInTime: '2024-01-10',
          },
          disabled: false,
          providerData: [],
        },
      ];

      vi.mocked(fetch).mockResolvedValueOnce({
        ok: true,
        json: async () => ({
          users: mockUsers,
          pageToken: undefined,
          totalUsers: 1,
        }),
      } as Response);

      const { result } = renderHook(() => useUsers());

      await waitFor(() => {
        expect(result.current.loading).toBe(false);
      });

      expect(result.current.users).toHaveLength(1);
      expect(result.current.users[0].email).toBe('user1@test.com');
    });

    it('should handle fetch errors', async () => {
      vi.mocked(fetch).mockResolvedValueOnce({
        ok: false,
        json: async () => ({ message: 'Fetch failed' }),
      } as Response);

      const { result } = renderHook(() => useUsers());

      await waitFor(() => {
        expect(result.current.loading).toBe(false);
      });

      expect(result.current.error).toBeTruthy();
    });

    it('should support pagination', async () => {
      const page1Users = [{ uid: 'user1', email: 'user1@test.com' }];
      const page2Users = [{ uid: 'user2', email: 'user2@test.com' }];

      // First page
      vi.mocked(fetch).mockResolvedValueOnce({
        ok: true,
        json: async () => ({
          users: page1Users,
          pageToken: 'page2-token',
          totalUsers: 1,
        }),
      } as Response);

      const { result } = renderHook(() => useUsers());

      await waitFor(() => {
        expect(result.current.users).toHaveLength(1);
      });

      expect(result.current.hasMore).toBe(true);

      // Second page
      vi.mocked(fetch).mockResolvedValueOnce({
        ok: true,
        json: async () => ({
          users: page2Users,
          pageToken: undefined,
          totalUsers: 1,
        }),
      } as Response);

      await act(async () => {
        await result.current.fetchUsers('page2-token');
      });

      await waitFor(() => {
        expect(result.current.users).toHaveLength(2);
      });

      expect(result.current.hasMore).toBe(false);
    });
  });

  describe('createUser', () => {
    it('should create a new user', async () => {
      const newUser = {
        uid: 'new-user',
        email: 'new@test.com',
        displayName: 'New User',
        emailVerified: false,
        role: 'user',
        metadata: {
          creationTime: '2024-01-01',
        },
        disabled: false,
        providerData: [],
      };

      // Initial fetch
      vi.mocked(fetch).mockResolvedValueOnce({
        ok: true,
        json: async () => ({ users: [], totalUsers: 0 }),
      } as Response);

      // Create user
      vi.mocked(fetch).mockResolvedValueOnce({
        ok: true,
        json: async () => newUser,
      } as Response);

      const { result } = renderHook(() => useUsers());

      await waitFor(() => {
        expect(result.current.loading).toBe(false);
      });

      let createdUser;
      await act(async () => {
        createdUser = await result.current.createUser({
          email: 'new@test.com',
          password: 'password123',
          displayName: 'New User',
          role: 'user',
        });
      });

      expect(createdUser).toEqual(expect.objectContaining({ email: 'new@test.com' }));
      expect(result.current.users).toHaveLength(1);
    });

    it('should handle creation errors', async () => {
      // Initial fetch
      vi.mocked(fetch).mockResolvedValueOnce({
        ok: true,
        json: async () => ({ users: [], totalUsers: 0 }),
      } as Response);

      // Create user error
      vi.mocked(fetch).mockResolvedValueOnce({
        ok: false,
        json: async () => ({ message: 'Email already exists' }),
      } as Response);

      const { result } = renderHook(() => useUsers());

      await waitFor(() => {
        expect(result.current.loading).toBe(false);
      });

      await expect(async () => {
        await act(async () => {
          await result.current.createUser({
            email: 'existing@test.com',
            password: 'password123',
          });
        });
      }).rejects.toThrow();
    });
  });

  describe('updateUser', () => {
    it('should update user properties', async () => {
      const users = [
        {
          uid: 'user1',
          email: 'user1@test.com',
          displayName: 'User One',
          emailVerified: true,
          role: 'user',
          metadata: {},
          disabled: false,
          providerData: [],
        },
      ];

      // Initial fetch
      vi.mocked(fetch).mockResolvedValueOnce({
        ok: true,
        json: async () => ({ users, totalUsers: 1 }),
      } as Response);

      // Update user
      vi.mocked(fetch).mockResolvedValueOnce({
        ok: true,
        json: async () => ({
          ...users[0],
          displayName: 'Updated Name',
          role: 'admin',
        }),
      } as Response);

      const { result } = renderHook(() => useUsers());

      await waitFor(() => {
        expect(result.current.users).toHaveLength(1);
      });

      await act(async () => {
        await result.current.updateUser('user1', {
          displayName: 'Updated Name',
          role: 'admin',
        });
      });

      expect(result.current.users[0].displayName).toBe('Updated Name');
      expect(result.current.users[0].role).toBe('admin');
    });
  });

  describe('deleteUser', () => {
    it('should delete a user', async () => {
      const users = [
        { uid: 'user1', email: 'user1@test.com' },
        { uid: 'user2', email: 'user2@test.com' },
      ];

      // Initial fetch
      vi.mocked(fetch).mockResolvedValueOnce({
        ok: true,
        json: async () => ({ users, totalUsers: 2 }),
      } as Response);

      // Delete user
      vi.mocked(fetch).mockResolvedValueOnce({
        ok: true,
        status: 204,
      } as Response);

      const { result } = renderHook(() => useUsers());

      await waitFor(() => {
        expect(result.current.users).toHaveLength(2);
      });

      await act(async () => {
        await result.current.deleteUser('user1', false);
      });

      expect(result.current.users).toHaveLength(1);
      expect(result.current.users[0].uid).toBe('user2');
    });
  });

  describe('resetPassword', () => {
    it('should send password reset email', async () => {
      // Initial fetch
      vi.mocked(fetch).mockResolvedValueOnce({
        ok: true,
        json: async () => ({ users: [], totalUsers: 0 }),
      } as Response);

      // Reset password
      vi.mocked(fetch).mockResolvedValueOnce({
        ok: true,
        json: async () => ({
          message: 'Password reset link generated',
          email: 'test@test.com',
          resetLink: 'https://reset.link',
        }),
      } as Response);

      const { result } = renderHook(() => useUsers());

      await waitFor(() => {
        expect(result.current.loading).toBe(false);
      });

      let response;
      await act(async () => {
        response = await result.current.resetPassword('test-uid');
      });

      expect(response).toEqual(
        expect.objectContaining({
          message: 'Password reset link generated',
        })
      );
    });
  });

  describe('fetchRoles', () => {
    it('should fetch available roles', async () => {
      const mockRoles = [
        { value: 'admin', label: 'Admin', description: 'Full access' },
        { value: 'user', label: 'User', description: 'Basic access' },
      ];

      // Initial users fetch
      vi.mocked(fetch).mockResolvedValueOnce({
        ok: true,
        json: async () => ({ users: [], totalUsers: 0 }),
      } as Response);

      // Roles fetch
      vi.mocked(fetch).mockResolvedValueOnce({
        ok: true,
        json: async () => ({ roles: mockRoles }),
      } as Response);

      const { result } = renderHook(() => useUsers());

      await waitFor(() => {
        expect(result.current.roles).toHaveLength(2);
      });

      expect(result.current.roles[0].value).toBe('admin');
    });
  });
});
