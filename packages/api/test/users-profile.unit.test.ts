/**
 * User Profile Endpoints Tests (/users/me)
 * 
 * Tests for user self-profile management API endpoints.
 * 
 * Homer v1.0.0 - User Management - User Profile
 */

import { describe, it, expect, vi, beforeEach } from 'vitest';
import type { Request, Response } from 'express';
import * as admin from 'firebase-admin';
import { getMeHandler, updateMeHandler } from '../src/endpoints/users/me.js';

// Mock requireAuth middleware
vi.mock('../src/middleware/auth.js', () => ({
  requireAuth: vi.fn(async (req: any, res: any, callback: () => Promise<void>) => {
    // Mock auth context from request
    if (req.headers?.authorization === 'Bearer valid-token') {
      req.auth = {
        uid: 'test-user-123',
        email: 'user@test.com',
        role: 'catalog_editor',
        emailVerified: true,
      };
      await callback();
    } else {
      res.status(401).json({ error: 'UNAUTHORIZED', message: 'Authentication required' });
    }
  }),
}));

// Mock Firebase Admin
vi.mock('firebase-admin', () => {
  const mockAuth = {
    getUser: vi.fn(),
    updateUser: vi.fn(),
  };

  const mockFirestore = vi.fn(() => ({
    collection: vi.fn().mockReturnValue({
      doc: vi.fn().mockReturnValue({
        get: vi.fn().mockResolvedValue({
          exists: true,
          data: () => ({ preferences: { theme: 'dark' } }),
        }),
      }),
    }),
  }));

  return {
    auth: vi.fn(() => mockAuth),
    firestore: mockFirestore,
    default: {
      auth: vi.fn(() => mockAuth),
      firestore: mockFirestore,
    },
  };
});

describe('GET /users/me', () => {
  let mockReq: Partial<Request>;
  let mockRes: Partial<Response>;
  let mockJson: ReturnType<typeof vi.fn>;
  let mockStatus: ReturnType<typeof vi.fn>;

  beforeEach(() => {
    vi.clearAllMocks();

    mockJson = vi.fn();
    mockStatus = vi.fn().mockReturnValue({ json: mockJson });

    mockReq = {
      headers: { authorization: 'Bearer valid-token' },
    };

    mockRes = {
      status: mockStatus,
      json: mockJson,
    };
  });

  it('should return profile for authenticated user with 200 status', async () => {
    // Mock Firebase Auth getUser response
    const mockUserRecord = {
      toJSON: () => ({
        uid: 'test-user-123',
        email: 'user@test.com',
        displayName: 'Test User',
        photoURL: 'https://example.com/photo.jpg',
        emailVerified: true,
        disabled: false,
        customClaims: { role: 'catalog_editor' },
        providerData: [{ providerId: 'password' }],
        metadata: {
          creationTime: '2024-01-01T00:00:00Z',
          lastSignInTime: '2024-01-02T00:00:00Z',
        },
      }),
    };

    const authMock = admin.auth();
    vi.mocked(authMock.getUser).mockResolvedValue(mockUserRecord as any);

    await getMeHandler(mockReq as Request, mockRes as Response);

    expect(mockStatus).toHaveBeenCalledWith(200);
    expect(mockJson).toHaveBeenCalledWith(
      expect.objectContaining({
        uid: 'test-user-123',
        email: 'user@test.com',
        displayName: 'Test User',
        photoURL: 'https://example.com/photo.jpg',
        customClaims: { role: 'catalog_editor' },
        providerData: [{ providerId: 'password' }],
        disabled: false,
        metadata: expect.any(Object),
        profileData: expect.any(Object),
      })
    );
  });

  it('should return 401 for unauthenticated request', async () => {
    mockReq.headers = { authorization: 'Bearer invalid-token' };

    await getMeHandler(mockReq as Request, mockRes as Response);

    expect(mockStatus).toHaveBeenCalledWith(401);
    expect(mockJson).toHaveBeenCalledWith({
      error: 'UNAUTHORIZED',
      message: 'Authentication required',
    });
  });

  it('should handle user not found gracefully', async () => {
    const authMock = admin.auth();
    const notFoundError = new Error('User not found');
    (notFoundError as any).code = 'auth/user-not-found';
    vi.mocked(authMock.getUser).mockRejectedValue(notFoundError);

    await getMeHandler(mockReq as Request, mockRes as Response);

    expect(mockStatus).toHaveBeenCalledWith(404);
    expect(mockJson).toHaveBeenCalledWith({
      error: 'NOT_FOUND',
      message: 'User profile not found',
    });
  });

  it('should return profile even when Firestore document is missing', async () => {
    const mockUserRecord = {
      toJSON: () => ({
        uid: 'test-user-123',
        email: 'user@test.com',
        displayName: null,
        photoURL: null,
        emailVerified: false,
        disabled: false,
        customClaims: {},
        providerData: [],
        metadata: {},
      }),
    };

    const authMock = admin.auth();
    vi.mocked(authMock.getUser).mockResolvedValue(mockUserRecord as any);

    await getMeHandler(mockReq as Request, mockRes as Response);

    // Should still return 200 with profile data (Firestore doc is optional)
    expect(mockStatus).toHaveBeenCalledWith(200);
    expect(mockJson).toHaveBeenCalledWith(
      expect.objectContaining({
        uid: 'test-user-123',
        email: 'user@test.com',
      })
    );
  });
});

describe('PATCH /users/me', () => {
  let mockReq: Partial<Request>;
  let mockRes: Partial<Response>;
  let mockJson: ReturnType<typeof vi.fn>;
  let mockStatus: ReturnType<typeof vi.fn>;

  beforeEach(() => {
    vi.clearAllMocks();

    mockJson = vi.fn();
    mockStatus = vi.fn().mockReturnValue({ json: mockJson });

    mockReq = {
      headers: { authorization: 'Bearer valid-token' },
      body: {},
    };

    mockRes = {
      status: mockStatus,
      json: mockJson,
    };
  });

  it('should update displayName successfully and return 200', async () => {
    mockReq.body = { displayName: 'Updated Name' };

    const mockUpdatedUser = {
      toJSON: () => ({
        uid: 'test-user-123',
        email: 'user@test.com',
        displayName: 'Updated Name',
        photoURL: null,
        emailVerified: true,
        disabled: false,
        customClaims: { role: 'catalog_editor' },
        providerData: [],
        metadata: {},
      }),
    };

    const authMock = admin.auth();
    vi.mocked(authMock.updateUser).mockResolvedValue({} as any);
    vi.mocked(authMock.getUser).mockResolvedValue(mockUpdatedUser as any);

    await updateMeHandler(mockReq as Request, mockRes as Response);

    expect(authMock.updateUser).toHaveBeenCalledWith('test-user-123', {
      displayName: 'Updated Name',
    });
    expect(mockStatus).toHaveBeenCalledWith(200);
    expect(mockJson).toHaveBeenCalledWith(
      expect.objectContaining({
        displayName: 'Updated Name',
      })
    );
  });

  it('should update photoURL successfully', async () => {
    mockReq.body = { photoURL: 'https://example.com/new-photo.jpg' };

    const mockUpdatedUser = {
      toJSON: () => ({
        uid: 'test-user-123',
        email: 'user@test.com',
        displayName: 'Test User',
        photoURL: 'https://example.com/new-photo.jpg',
        emailVerified: true,
        disabled: false,
        customClaims: {},
        providerData: [],
        metadata: {},
      }),
    };

    const authMock = admin.auth();
    vi.mocked(authMock.updateUser).mockResolvedValue({} as any);
    vi.mocked(authMock.getUser).mockResolvedValue(mockUpdatedUser as any);

    await updateMeHandler(mockReq as Request, mockRes as Response);

    expect(authMock.updateUser).toHaveBeenCalledWith('test-user-123', {
      photoURL: 'https://example.com/new-photo.jpg',
    });
    expect(mockStatus).toHaveBeenCalledWith(200);
  });

  it('should update both displayName and photoURL', async () => {
    mockReq.body = {
      displayName: 'New Name',
      photoURL: 'https://example.com/photo.jpg',
    };

    const authMock = admin.auth();
    vi.mocked(authMock.updateUser).mockResolvedValue({} as any);
    vi.mocked(authMock.getUser).mockResolvedValue({
      toJSON: () => ({
        uid: 'test-user-123',
        email: 'user@test.com',
        displayName: 'New Name',
        photoURL: 'https://example.com/photo.jpg',
        emailVerified: true,
        disabled: false,
        customClaims: {},
        providerData: [],
        metadata: {},
      }),
    } as any);

    await updateMeHandler(mockReq as Request, mockRes as Response);

    expect(authMock.updateUser).toHaveBeenCalledWith('test-user-123', {
      displayName: 'New Name',
      photoURL: 'https://example.com/photo.jpg',
    });
  });

  it('should return 400 for displayName exceeding 256 characters', async () => {
    mockReq.body = { displayName: 'a'.repeat(257) };

    await updateMeHandler(mockReq as Request, mockRes as Response);

    expect(mockStatus).toHaveBeenCalledWith(400);
    expect(mockJson).toHaveBeenCalledWith({
      error: 'VALIDATION_ERROR',
      message: 'displayName must be 256 characters or less',
    });
  });

  it('should return 400 for photoURL exceeding 512 characters', async () => {
    mockReq.body = { photoURL: 'https://example.com/' + 'a'.repeat(500) };

    await updateMeHandler(mockReq as Request, mockRes as Response);

    expect(mockStatus).toHaveBeenCalledWith(400);
    expect(mockJson).toHaveBeenCalledWith({
      error: 'VALIDATION_ERROR',
      message: 'photoURL must be 512 characters or less',
    });
  });

  it('should return 400 for invalid displayName type', async () => {
    mockReq.body = { displayName: 123 };

    await updateMeHandler(mockReq as Request, mockRes as Response);

    expect(mockStatus).toHaveBeenCalledWith(400);
    expect(mockJson).toHaveBeenCalledWith({
      error: 'VALIDATION_ERROR',
      message: 'displayName must be a string',
    });
  });

  it('should return 400 for invalid photoURL type', async () => {
    mockReq.body = { photoURL: ['not', 'a', 'string'] };

    await updateMeHandler(mockReq as Request, mockRes as Response);

    expect(mockStatus).toHaveBeenCalledWith(400);
    expect(mockJson).toHaveBeenCalledWith({
      error: 'VALIDATION_ERROR',
      message: 'photoURL must be a string',
    });
  });

  it('should return 200 with message when no changes provided', async () => {
    mockReq.body = {};

    await updateMeHandler(mockReq as Request, mockRes as Response);

    expect(mockStatus).toHaveBeenCalledWith(200);
    expect(mockJson).toHaveBeenCalledWith({
      message: 'No changes provided',
    });
  });

  it('should NOT allow updating email via PATCH', async () => {
    // Email updates should be ignored (only displayName and photoURL allowed)
    mockReq.body = {
      displayName: 'New Name',
      email: 'newemail@test.com', // This should be ignored
    };

    const authMock = admin.auth();
    vi.mocked(authMock.updateUser).mockResolvedValue({} as any);
    vi.mocked(authMock.getUser).mockResolvedValue({
      toJSON: () => ({
        uid: 'test-user-123',
        email: 'user@test.com', // Email unchanged
        displayName: 'New Name',
        photoURL: null,
        emailVerified: true,
        disabled: false,
        customClaims: {},
        providerData: [],
        metadata: {},
      }),
    } as any);

    await updateMeHandler(mockReq as Request, mockRes as Response);

    // Should only pass displayName, NOT email
    expect(authMock.updateUser).toHaveBeenCalledWith('test-user-123', {
      displayName: 'New Name',
    });
  });

  it('should NOT allow updating role via PATCH', async () => {
    // Role updates should be ignored (admin-only operation)
    mockReq.body = {
      displayName: 'New Name',
      role: 'platform_admin', // This should be ignored
    };

    const authMock = admin.auth();
    vi.mocked(authMock.updateUser).mockResolvedValue({} as any);
    vi.mocked(authMock.getUser).mockResolvedValue({
      toJSON: () => ({
        uid: 'test-user-123',
        email: 'user@test.com',
        displayName: 'New Name',
        photoURL: null,
        emailVerified: true,
        disabled: false,
        customClaims: { role: 'catalog_editor' }, // Role unchanged
        providerData: [],
        metadata: {},
      }),
    } as any);

    await updateMeHandler(mockReq as Request, mockRes as Response);

    // Should only pass displayName, NOT role
    expect(authMock.updateUser).toHaveBeenCalledWith('test-user-123', {
      displayName: 'New Name',
    });
  });

  it('should return 401 for unauthenticated request', async () => {
    mockReq.headers = { authorization: 'Bearer invalid-token' };
    mockReq.body = { displayName: 'New Name' };

    await updateMeHandler(mockReq as Request, mockRes as Response);

    expect(mockStatus).toHaveBeenCalledWith(401);
    expect(mockJson).toHaveBeenCalledWith({
      error: 'UNAUTHORIZED',
      message: 'Authentication required',
    });
  });
});
