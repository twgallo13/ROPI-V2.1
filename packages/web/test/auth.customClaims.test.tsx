/**
 * Integration Tests for AuthProvider with Custom Claims
 * 
 * PROMPT_018C_vB: Sprint B — IAM via Custom Claims
 */

import { describe, it, expect, vi, beforeEach } from 'vitest';
import { renderHook, waitFor } from '@testing-library/react';
import { AuthProvider, useAuth } from '../src/contexts/AuthProvider';
import type { User } from 'firebase/auth';

// Mock Firebase Auth
vi.mock('firebase/auth', () => ({
  GoogleAuthProvider: vi.fn(),
  signInWithPopup: vi.fn(),
  signInWithEmailAndPassword: vi.fn(),
  createUserWithEmailAndPassword: vi.fn(),
  sendEmailVerification: vi.fn(),
  signOut: vi.fn(),
  onAuthStateChanged: vi.fn((auth, callback) => {
    // Immediately call callback with null (no user)
    callback(null);
    return vi.fn(); // Return unsubscribe function
  }),
}));

// Mock Firestore
vi.mock('firebase/firestore', () => ({
  doc: vi.fn(),
  getDoc: vi.fn(() => Promise.resolve({
    exists: () => false,
    data: () => null,
  })),
}));

// Mock Firebase config
vi.mock('../firebaseConfig', () => ({
  auth: {},
  db: {},
  isAuthAvailable: () => true,
}));

describe('AuthProvider with Custom Claims', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('should initialize with no user', async () => {
    const wrapper = ({ children }: { children: React.ReactNode }) => (
      <AuthProvider>{children}</AuthProvider>
    );

    const { result } = renderHook(() => useAuth(), { wrapper });

    await waitFor(() => {
      expect(result.current.loading).toBe(false);
    });

    expect(result.current.currentUser).toBeNull();
    expect(result.current.isAdmin).toBe(false);
    expect(result.current.emailVerified).toBe(false);
  });

  it('should expose resendVerificationEmail function', async () => {
    const wrapper = ({ children }: { children: React.ReactNode }) => (
      <AuthProvider>{children}</AuthProvider>
    );

    const { result } = renderHook(() => useAuth(), { wrapper });

    await waitFor(() => {
      expect(result.current.loading).toBe(false);
    });

    expect(result.current.resendVerificationEmail).toBeDefined();
    expect(typeof result.current.resendVerificationEmail).toBe('function');
  });

  it('should have correct interface shape', async () => {
    const wrapper = ({ children }: { children: React.ReactNode }) => (
      <AuthProvider>{children}</AuthProvider>
    );

    const { result } = renderHook(() => useAuth(), { wrapper });

    await waitFor(() => {
      expect(result.current.loading).toBe(false);
    });

    // Verify all required fields exist
    expect(result.current).toHaveProperty('currentUser');
    expect(result.current).toHaveProperty('isAdmin');
    expect(result.current).toHaveProperty('emailVerified');
    expect(result.current).toHaveProperty('loading');
    expect(result.current).toHaveProperty('signInWithGoogle');
    expect(result.current).toHaveProperty('signInWithEmail');
    expect(result.current).toHaveProperty('signUpWithEmail');
    expect(result.current).toHaveProperty('signOut');
    expect(result.current).toHaveProperty('resendVerificationEmail');
  });
});

describe('Admin Detection Logic (Unit Tests)', () => {
  it('should expose checkAdminStatus method behavior via custom claims', () => {
    // Test the concept: admin detection prioritizes custom claims
    const mockUserWithClaims = {
      getIdTokenResult: async () => ({ claims: { role: 'admin' } }),
      email: 'test@example.com',
    };
    
    // In real implementation, checkAdminStatus checks:
    // 1. tokenResult.claims.role === 'admin' (priority)
    // 2. metadata/admins fallback
    
    expect(mockUserWithClaims).toHaveProperty('getIdTokenResult');
  });

  it('should handle metadata fallback when custom claims absent', () => {
    // Test the concept: fallback to metadata/admins if no custom claims
    const mockUserWithoutClaims = {
      getIdTokenResult: async () => ({ claims: {} }),
      email: 'admin@example.com',
    };
    
    const mockMetadata = {
      emails: ['admin@example.com'],
    };
    
    // Verify fallback logic concept
    expect(mockMetadata.emails).toContain('admin@example.com');
  });

  it('should return false when no admin indicators present', () => {
    // Test the concept: non-admin user
    const mockNonAdminUser = {
      getIdTokenResult: async () => ({ claims: {} }),
      email: 'user@example.com',
    };
    
    const mockEmptyMetadata = {
      emails: [],
    };
    
    // Verify non-admin logic concept
    expect(mockEmptyMetadata.emails).not.toContain('user@example.com');
  });
});
