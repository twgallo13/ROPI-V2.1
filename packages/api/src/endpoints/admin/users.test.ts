/**
 * Users Endpoints Tests
 * 
 * Unit tests for user management API endpoints.
 * 
 * Homer v1.0.0 - User Management
 */

import { describe, it, expect, vi, beforeEach } from 'vitest';
import type { Request, Response } from 'express';
import * as admin from 'firebase-admin';
import {
  listUsersHandler,
  getUserHandler,
  createUserHandler,
  updateUserHandler,
  deleteUserHandler,
  resetPasswordHandler,
  getRolesHandler,
} from '../endpoints/admin/users';

// Mock Firebase Admin
vi.mock('firebase-admin', () => ({
  default: {
    firestore: vi.fn(),
    auth: vi.fn(),
  },
  firestore: vi.fn(() => ({
    collection: vi.fn(),
    Timestamp: {
      now: vi.fn(() => ({ toDate: () => new Date() })),
    },
  })),
  auth: vi.fn(() => ({
    listUsers: vi.fn(),
    getUser: vi.fn(),
    createUser: vi.fn(),
    updateUser: vi.fn(),
    deleteUser: vi.fn(),
    setCustomUserClaims: vi.fn(),
    generatePasswordResetLink: vi.fn(),
  })),
}));

// Mock requireAdmin middleware
vi.mock('../middleware/auth', () => ({
  requireAdmin: vi.fn((req, res, next) => {
    // Mock auth context
    (req as any).auth = {
      uid: 'test-admin-uid',
      email: 'admin@test.com',
      role: 'admin',
    };
    next();
  }),
}));

describe('Users Endpoints', () => {
  let mockReq: Partial<Request>;
  let mockRes: Partial<Response>;
  let mockJson: ReturnType<typeof vi.fn>;
  let mockStatus: ReturnType<typeof vi.fn>;
  let mockSend: ReturnType<typeof vi.fn>;

  beforeEach(() => {
    mockJson = vi.fn();
    mockSend = vi.fn();
    mockStatus = vi.fn(() => ({ json: mockJson, send: mockSend })) as any;
    
    mockReq = {
      params: {},
      query: {},
      body: {},
      headers: {},
    };
    
    mockRes = {
      status: mockStatus,
      json: mockJson,
      send: mockSend,
    };
    
    vi.clearAllMocks();
  });

  describe('listUsersHandler', () => {
    it('should list users with pagination', async () => {
      const mockUsers = [
        {
          uid: 'user1',
          email: 'user1@test.com',
          displayName: 'User One',
          emailVerified: true,
          customClaims: { role: 'user' },
          metadata: {
            creationTime: '2024-01-01',
            lastSignInTime: '2024-01-10',
          },
          disabled: false,
          providerData: [],
        },
      ];

      const mockAuth = {
        listUsers: vi.fn().mockResolvedValue({
          users: mockUsers,
          pageToken: 'next-page-token',
        }),
      };

      vi.mocked(admin.auth).mockReturnValue(mockAuth as any);

      await listUsersHandler(mockReq as Request, mockRes as Response);

      expect(mockAuth.listUsers).toHaveBeenCalledWith(20, undefined);
      expect(mockStatus).toHaveBeenCalledWith(200);
      expect(mockJson).toHaveBeenCalledWith(
        expect.objectContaining({
          users: expect.arrayContaining([
            expect.objectContaining({ uid: 'user1' }),
          ]),
          pageToken: 'next-page-token',
        })
      );
    });

    it('should handle pagination with pageToken', async () => {
      mockReq.query = { pageToken: 'existing-token', limit: '10' };

      const mockAuth = {
        listUsers: vi.fn().mockResolvedValue({
          users: [],
          pageToken: undefined,
        }),
      };

      vi.mocked(admin.auth).mockReturnValue(mockAuth as any);

      await listUsersHandler(mockReq as Request, mockRes as Response);

      expect(mockAuth.listUsers).toHaveBeenCalledWith(10, 'existing-token');
    });
  });

  describe('getUserHandler', () => {
    it('should get a single user by UID', async () => {
      mockReq.params = { uid: 'test-uid' };

      const mockUser = {
        uid: 'test-uid',
        email: 'test@test.com',
        displayName: 'Test User',
        emailVerified: true,
        customClaims: { role: 'admin' },
        metadata: {
          creationTime: '2024-01-01',
          lastSignInTime: '2024-01-10',
        },
        disabled: false,
        providerData: [],
      };

      const mockAuth = {
        getUser: vi.fn().mockResolvedValue(mockUser),
      };

      const mockDb = {
        collection: vi.fn().mockReturnValue({
          doc: vi.fn().mockReturnValue({
            collection: vi.fn().mockReturnValue({
              doc: vi.fn().mockReturnValue({
                get: vi.fn().mockResolvedValue({
                  exists: false,
                }),
              }),
            }),
          }),
        }),
      };

      vi.mocked(admin.auth).mockReturnValue(mockAuth as any);
      vi.mocked(admin.firestore).mockReturnValue(mockDb as any);

      await getUserHandler(mockReq as Request, mockRes as Response);

      expect(mockAuth.getUser).toHaveBeenCalledWith('test-uid');
      expect(mockStatus).toHaveBeenCalledWith(200);
      expect(mockJson).toHaveBeenCalledWith(
        expect.objectContaining({
          uid: 'test-uid',
          email: 'test@test.com',
        })
      );
    });

    it('should return 400 if UID is missing', async () => {
      mockReq.params = {};

      await getUserHandler(mockReq as Request, mockRes as Response);

      expect(mockStatus).toHaveBeenCalledWith(400);
      expect(mockJson).toHaveBeenCalledWith(
        expect.objectContaining({
          error: 'INVALID_REQUEST',
        })
      );
    });
  });

  describe('createUserHandler', () => {
    it('should create a new user with password', async () => {
      mockReq.body = {
        email: 'newuser@test.com',
        password: 'password123',
        displayName: 'New User',
        role: 'user',
      };

      const mockUser = {
        uid: 'new-uid',
        email: 'newuser@test.com',
        displayName: 'New User',
        emailVerified: false,
        customClaims: { role: 'user' },
        metadata: {
          creationTime: '2024-01-01',
        },
        disabled: false,
        providerData: [],
      };

      const mockAuth = {
        createUser: vi.fn().mockResolvedValue(mockUser),
        setCustomUserClaims: vi.fn().mockResolvedValue(undefined),
      };

      const mockDb = {
        collection: vi.fn().mockReturnValue({
          doc: vi.fn().mockReturnValue({
            collection: vi.fn().mockReturnValue({
              doc: vi.fn().mockReturnValue({
                set: vi.fn().mockResolvedValue(undefined),
              }),
            }),
          }),
        }),
      };

      vi.mocked(admin.auth).mockReturnValue(mockAuth as any);
      vi.mocked(admin.firestore).mockReturnValue(mockDb as any);

      await createUserHandler(mockReq as Request, mockRes as Response);

      expect(mockAuth.createUser).toHaveBeenCalledWith(
        expect.objectContaining({
          email: 'newuser@test.com',
          password: 'password123',
          displayName: 'New User',
        })
      );
      expect(mockAuth.setCustomUserClaims).toHaveBeenCalledWith('new-uid', { role: 'user' });
      expect(mockStatus).toHaveBeenCalledWith(201);
    });

    it('should return 400 if email is missing', async () => {
      mockReq.body = { password: 'password123' };

      await createUserHandler(mockReq as Request, mockRes as Response);

      expect(mockStatus).toHaveBeenCalledWith(400);
      expect(mockJson).toHaveBeenCalledWith(
        expect.objectContaining({
          error: 'VALIDATION_ERROR',
          message: 'Email is required',
        })
      );
    });

    it('should return 400 for invalid role', async () => {
      mockReq.body = {
        email: 'test@test.com',
        password: 'password123',
        role: 'invalid-role',
      };

      await createUserHandler(mockReq as Request, mockRes as Response);

      expect(mockStatus).toHaveBeenCalledWith(400);
      expect(mockJson).toHaveBeenCalledWith(
        expect.objectContaining({
          error: 'VALIDATION_ERROR',
          message: expect.stringContaining('Invalid role'),
        })
      );
    });
  });

  describe('updateUserHandler', () => {
    it('should update user properties', async () => {
      mockReq.params = { uid: 'test-uid' };
      mockReq.body = {
        displayName: 'Updated Name',
        role: 'admin',
      };

      const mockUser = {
        uid: 'test-uid',
        email: 'test@test.com',
        displayName: 'Updated Name',
        emailVerified: true,
        customClaims: { role: 'admin' },
        metadata: {},
        disabled: false,
        providerData: [],
      };

      const mockAuth = {
        updateUser: vi.fn().mockResolvedValue(mockUser),
        setCustomUserClaims: vi.fn().mockResolvedValue(undefined),
        getUser: vi.fn().mockResolvedValue(mockUser),
      };

      const mockDb = {
        collection: vi.fn().mockReturnValue({
          doc: vi.fn().mockReturnValue({
            collection: vi.fn().mockReturnValue({
              doc: vi.fn().mockReturnValue({
                update: vi.fn().mockResolvedValue(undefined),
              }),
            }),
          }),
        }),
      };

      vi.mocked(admin.auth).mockReturnValue(mockAuth as any);
      vi.mocked(admin.firestore).mockReturnValue(mockDb as any);

      await updateUserHandler(mockReq as Request, mockRes as Response);

      expect(mockAuth.updateUser).toHaveBeenCalledWith('test-uid', { displayName: 'Updated Name' });
      expect(mockAuth.setCustomUserClaims).toHaveBeenCalledWith('test-uid', { role: 'admin' });
      expect(mockStatus).toHaveBeenCalledWith(200);
    });

    it('should prevent self-demotion from admin', async () => {
      mockReq.params = { uid: 'test-admin-uid' }; // Same as auth context
      mockReq.body = { role: 'user' };

      await updateUserHandler(mockReq as Request, mockRes as Response);

      expect(mockStatus).toHaveBeenCalledWith(403);
      expect(mockJson).toHaveBeenCalledWith(
        expect.objectContaining({
          error: 'FORBIDDEN',
          message: 'Cannot remove your own admin role',
        })
      );
    });
  });

  describe('deleteUserHandler', () => {
    it('should soft delete a user', async () => {
      mockReq.params = { uid: 'test-uid' };
      mockReq.query = { soft: 'true' };

      const mockAuth = {
        updateUser: vi.fn().mockResolvedValue({}),
      };

      const mockDb = {
        collection: vi.fn().mockReturnValue({
          doc: vi.fn().mockReturnValue({
            collection: vi.fn().mockReturnValue({
              doc: vi.fn().mockReturnValue({
                update: vi.fn().mockResolvedValue(undefined),
              }),
            }),
          }),
        }),
      };

      vi.mocked(admin.auth).mockReturnValue(mockAuth as any);
      vi.mocked(admin.firestore).mockReturnValue(mockDb as any);

      await deleteUserHandler(mockReq as Request, mockRes as Response);

      expect(mockAuth.updateUser).toHaveBeenCalledWith('test-uid', { disabled: true });
      expect(mockStatus).toHaveBeenCalledWith(204);
    });

    it('should hard delete a user', async () => {
      mockReq.params = { uid: 'test-uid' };
      mockReq.query = { soft: 'false' };

      const mockAuth = {
        deleteUser: vi.fn().mockResolvedValue(undefined),
      };

      const mockDb = {
        collection: vi.fn().mockReturnValue({
          doc: vi.fn().mockReturnValue({
            collection: vi.fn().mockReturnValue({
              doc: vi.fn().mockReturnValue({
                delete: vi.fn().mockResolvedValue(undefined),
              }),
            }),
          }),
        }),
      };

      vi.mocked(admin.auth).mockReturnValue(mockAuth as any);
      vi.mocked(admin.firestore).mockReturnValue(mockDb as any);

      await deleteUserHandler(mockReq as Request, mockRes as Response);

      expect(mockAuth.deleteUser).toHaveBeenCalledWith('test-uid');
      expect(mockStatus).toHaveBeenCalledWith(204);
    });

    it('should prevent self-deletion', async () => {
      mockReq.params = { uid: 'test-admin-uid' }; // Same as auth context

      await deleteUserHandler(mockReq as Request, mockRes as Response);

      expect(mockStatus).toHaveBeenCalledWith(403);
      expect(mockJson).toHaveBeenCalledWith(
        expect.objectContaining({
          error: 'FORBIDDEN',
          message: 'Cannot delete your own account',
        })
      );
    });
  });

  describe('resetPasswordHandler', () => {
    it('should generate password reset link', async () => {
      mockReq.params = { uid: 'test-uid' };

      const mockUser = {
        uid: 'test-uid',
        email: 'test@test.com',
      };

      const mockAuth = {
        getUser: vi.fn().mockResolvedValue(mockUser),
        generatePasswordResetLink: vi.fn().mockResolvedValue('https://reset.link'),
      };

      vi.mocked(admin.auth).mockReturnValue(mockAuth as any);

      await resetPasswordHandler(mockReq as Request, mockRes as Response);

      expect(mockAuth.getUser).toHaveBeenCalledWith('test-uid');
      expect(mockAuth.generatePasswordResetLink).toHaveBeenCalledWith('test@test.com');
      expect(mockStatus).toHaveBeenCalledWith(200);
      expect(mockJson).toHaveBeenCalledWith(
        expect.objectContaining({
          message: 'Password reset link generated',
          email: 'test@test.com',
          resetLink: 'https://reset.link',
        })
      );
    });
  });

  describe('getRolesHandler', () => {
    it('should return list of roles', async () => {
      await getRolesHandler(mockReq as Request, mockRes as Response);

      expect(mockStatus).toHaveBeenCalledWith(200);
      expect(mockJson).toHaveBeenCalledWith(
        expect.objectContaining({
          roles: expect.arrayContaining([
            expect.objectContaining({ value: 'admin' }),
            expect.objectContaining({ value: 'district' }),
            expect.objectContaining({ value: 'store' }),
            expect.objectContaining({ value: 'user' }),
          ]),
        })
      );
    });
  });
});
