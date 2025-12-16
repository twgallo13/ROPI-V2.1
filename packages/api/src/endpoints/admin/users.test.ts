/**
 * Users Endpoints Tests
 * 
 * Unit tests for user management API endpoints.
 * 
 * Homer v1.0.0 - User Management
 */

import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
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
  setAdminServiceOverrides,
  resetAdminServiceOverrides,
} from './users';


// Mock requireAdmin middleware FIRST
vi.mock('../../middleware/auth', () => ({
  requireAdmin: vi.fn(async (req: any, res: any, callback: () => Promise<void>) => {
    // Mock auth context with Ropi role
    req.auth = {
      uid: 'test-admin-uid',
      email: 'admin@test.com',
      role: 'admin',
    };
    // Call the async callback
    await callback();
  }),
}));

// Mock Firebase Admin with proper structure
vi.mock('firebase-admin', () => {
  // Create the mock timestamp object
  const mockTimestamp = {
    now: vi.fn(() => ({
      toDate: () => new Date('2024-01-01'),
      _seconds: 1704067200,
      _nanoseconds: 0,
    })),
  };

  // Create firestore function that returns a mock database instance
  const mockFirestore = vi.fn(() => ({
    collection: vi.fn().mockReturnValue({
      doc: vi.fn().mockReturnValue({
        collection: vi.fn().mockReturnValue({
          doc: vi.fn().mockReturnValue({
            get: vi.fn().mockResolvedValue({ exists: false }),
            set: vi.fn().mockResolvedValue(undefined),
            update: vi.fn().mockResolvedValue(undefined),
            delete: vi.fn().mockResolvedValue(undefined),
          }),
        }),
      }),
    }),
  }));

  // Attach Timestamp as a static property on the firestore function
  Object.assign(mockFirestore, { Timestamp: mockTimestamp });

  // Create auth factory
  const mockAuth = vi.fn(() => ({
    listUsers: vi.fn(),
    getUser: vi.fn(),
    createUser: vi.fn(),
    updateUser: vi.fn(),
    deleteUser: vi.fn(),
    setCustomUserClaims: vi.fn(),
    generatePasswordResetLink: vi.fn(),
    verifyIdToken: vi.fn(),
  }));

  return {
    firestore: mockFirestore,
    auth: mockAuth,
  };
});

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
  });

  afterEach(() => {
    resetAdminServiceOverrides();
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

      const mockAuthInstance = {
        listUsers: vi.fn().mockResolvedValue({
          users: mockUsers,
          pageToken: 'next-page-token',
        }),
      };

      setAdminServiceOverrides({
        getAuth: () => mockAuthInstance,
      });

      await listUsersHandler(mockReq as Request, mockRes as Response);

      expect(mockAuthInstance.listUsers).toHaveBeenCalledWith(20, undefined);
      expect(mockStatus).toHaveBeenCalledWith(200);
      expect(mockJson).toHaveBeenCalledWith(
        expect.objectContaining({
          users: expect.arrayContaining([
            expect.objectContaining({ uid: 'user1' }),
          ]),
        })
      );
    });

    it('should handle pagination with pageToken', async () => {
      mockReq.query = { pageToken: 'existing-token', limit: '10' };

      const mockAuthInstance = {
        listUsers: vi.fn().mockResolvedValue({
          users: [],
          pageToken: undefined,
        }),
      };

      setAdminServiceOverrides({
        getAuth: () => mockAuthInstance,
      });

      await listUsersHandler(mockReq as Request, mockRes as Response);

      expect(mockAuthInstance.listUsers).toHaveBeenCalledWith(10, 'existing-token');
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

      const mockDbInstance = {
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

      const mockAuthInstance = {
        getUser: vi.fn().mockResolvedValue(mockUser),
      };

      vi.mocked(admin.auth as any).mockReturnValue(mockAuthInstance as any);
      vi.mocked(admin.firestore as any).mockReturnValue(mockDbInstance as any);

      await getUserHandler(mockReq as Request, mockRes as Response);

      expect(mockAuthInstance.getUser).toHaveBeenCalledWith('test-uid');
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
        role: 'viewer',
      };

      const mockUser = {
        uid: 'new-uid',
        email: 'newuser@test.com',
        displayName: 'New User',
        emailVerified: false,
        customClaims: { role: 'viewer' },
        metadata: {
          creationTime: '2024-01-01',
        },
        disabled: false,
        providerData: [],
      };

      const mockAuthInstance = {
        createUser: vi.fn().mockResolvedValue(mockUser),
        setCustomUserClaims: vi.fn().mockResolvedValue(undefined),
      };

      const mockDbInstance = {
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

      setAdminServiceOverrides({
        getAuth: () => mockAuthInstance,
        getDb: () => mockDbInstance,
      });

      await createUserHandler(mockReq as Request, mockRes as Response);

      expect(mockAuthInstance.createUser).toHaveBeenCalledWith(
        expect.objectContaining({
          email: 'newuser@test.com',
          password: 'password123',
          displayName: 'New User',
        })
      );
      expect(mockAuthInstance.setCustomUserClaims).toHaveBeenCalledWith('new-uid', { role: 'viewer' });
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

      const mockAuthInstance = {
        updateUser: vi.fn().mockResolvedValue(mockUser),
        setCustomUserClaims: vi.fn().mockResolvedValue(undefined),
        getUser: vi.fn().mockResolvedValue(mockUser),
      };

      const mockProfileDoc = {
        get: vi.fn().mockResolvedValue({ exists: true }),
        set: vi.fn().mockResolvedValue(undefined),
      };

      const mockDbInstance = {
        collection: vi.fn().mockReturnValue({
          doc: vi.fn().mockReturnValue({
            collection: vi.fn().mockReturnValue({
              doc: vi.fn().mockReturnValue(mockProfileDoc),
            }),
          }),
        }),
      };

      vi.mocked(admin.auth as any).mockReturnValue(mockAuthInstance as any);
      vi.mocked(admin.firestore as any).mockReturnValue(mockDbInstance as any);

      await updateUserHandler(mockReq as Request, mockRes as Response);

      expect(mockAuthInstance.updateUser).toHaveBeenCalledWith('test-uid', { displayName: 'Updated Name' });
      expect(mockAuthInstance.setCustomUserClaims).toHaveBeenCalledWith('test-uid', { role: 'admin' });
      expect(mockProfileDoc.set).toHaveBeenCalledWith(
        expect.objectContaining({ displayName: 'Updated Name', role: 'admin' }),
        { merge: true }
      );
      expect(mockStatus).toHaveBeenCalledWith(200);
    });

    it('should prevent self-demotion from admin', async () => {
      mockReq.params = { uid: 'test-admin-uid' }; // Same as auth context
      mockReq.body = { role: 'merch' }; // Non-admin role

      await updateUserHandler(mockReq as Request, mockRes as Response);

      expect(mockStatus).toHaveBeenCalledWith(403);
      expect(mockJson).toHaveBeenCalledWith(
        expect.objectContaining({
          error: 'FORBIDDEN',
          message: 'Cannot remove your own admin role',
        })
      );
    });

    it('should create profile doc if missing (create-or-merge behavior)', async () => {
      mockReq.params = { uid: 'test-uid-no-profile' };
      mockReq.body = {
        displayName: 'New Name',
        role: 'merch',
      };

      const mockUser = {
        uid: 'test-uid-no-profile',
        email: 'test@test.com',
        displayName: 'New Name',
        emailVerified: true,
        customClaims: { role: 'merch' },
        metadata: {},
        disabled: false,
        providerData: [],
      };

      const mockAuthInstance = {
        updateUser: vi.fn().mockResolvedValue(mockUser),
        setCustomUserClaims: vi.fn().mockResolvedValue(undefined),
        getUser: vi.fn().mockResolvedValue(mockUser),
      };

      const mockProfileDoc = {
        get: vi.fn().mockResolvedValue({ exists: false }), // Profile doc missing
        set: vi.fn().mockResolvedValue(undefined),
      };

      const mockDbInstance = {
        collection: vi.fn().mockReturnValue({
          doc: vi.fn().mockReturnValue({
            collection: vi.fn().mockReturnValue({
              doc: vi.fn().mockReturnValue(mockProfileDoc),
            }),
          }),
        }),
      };

      setAdminServiceOverrides({
        getAuth: () => mockAuthInstance,
        getDb: () => mockDbInstance,
      });

      await updateUserHandler(mockReq as Request, mockRes as Response);

      // Verify set was called with merge: true (not update which would fail)
      expect(mockProfileDoc.set).toHaveBeenCalledWith(
        expect.objectContaining({
          displayName: 'New Name',
          role: 'merch',
        }),
        { merge: true }
      );
      expect(mockStatus).toHaveBeenCalledWith(200);
    });
  });

  describe('deleteUserHandler', () => {
    it('should soft delete a user', async () => {
      mockReq.params = { uid: 'test-uid' };
      mockReq.query = { soft: 'true' };

      const mockAuthInstance = {
        updateUser: vi.fn().mockResolvedValue({}),
      };

      const mockProfileDoc = {
        set: vi.fn().mockResolvedValue(undefined),
      };

      const mockDbInstance = {
        collection: vi.fn().mockReturnValue({
          doc: vi.fn().mockReturnValue({
            collection: vi.fn().mockReturnValue({
              doc: vi.fn().mockReturnValue(mockProfileDoc),
            }),
          }),
        }),
      };

      setAdminServiceOverrides({
        getAuth: () => mockAuthInstance,
        getDb: () => mockDbInstance,
      });

      await deleteUserHandler(mockReq as Request, mockRes as Response);

      expect(mockAuthInstance.updateUser).toHaveBeenCalledWith('test-uid', { disabled: true });
      expect(mockProfileDoc.set).toHaveBeenCalledWith(
        expect.objectContaining({ deletedAt: expect.anything() }),
        { merge: true }
      );
      expect(mockStatus).toHaveBeenCalledWith(204);
    });

    it('should hard delete a user', async () => {
      mockReq.params = { uid: 'test-uid' };
      mockReq.query = { soft: 'false' };

      const mockAuthInstance = {
        deleteUser: vi.fn().mockResolvedValue(undefined),
      };

      const mockDbInstance = {
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

      setAdminServiceOverrides({
        getAuth: () => mockAuthInstance,
        getDb: () => mockDbInstance,
      });

      await deleteUserHandler(mockReq as Request, mockRes as Response);

      expect(mockAuthInstance.deleteUser).toHaveBeenCalledWith('test-uid');
      expect(mockStatus).toHaveBeenCalledWith(204);
    });

    it('should prevent self-deletion', async () => {
      mockReq.params = { uid: 'test-admin-uid' }; // Same as auth context

      // Mock admin service even though the test doesn't reach it
      // (prevented by auth check first)
      setAdminServiceOverrides({
        getAuth: () => ({} as any),
        getDb: () => ({} as any),
      });

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

      const mockAuthInstance = {
        getUser: vi.fn().mockResolvedValue(mockUser),
        generatePasswordResetLink: vi.fn().mockResolvedValue('https://reset.link'),
      };

      setAdminServiceOverrides({
        getAuth: () => mockAuthInstance,
      });

      await resetPasswordHandler(mockReq as Request, mockRes as Response);

      expect(mockAuthInstance.getUser).toHaveBeenCalledWith('test-uid');
      expect(mockAuthInstance.generatePasswordResetLink).toHaveBeenCalledWith('test@test.com');
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
    it('should return list of Ropi roles', async () => {
      await getRolesHandler(mockReq as Request, mockRes as Response);

      expect(mockStatus).toHaveBeenCalledWith(200);
      expect(mockJson).toHaveBeenCalledWith(
        expect.objectContaining({
          roles: expect.arrayContaining([
            expect.objectContaining({ value: 'admin' }),
            expect.objectContaining({ value: 'merch' }),
            expect.objectContaining({ value: 'photographer' }),
            expect.objectContaining({ value: 'viewer' }),
          ]),
        })
      );
    });
  });
});
