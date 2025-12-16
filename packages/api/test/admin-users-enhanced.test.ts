/**
 * Enhanced Admin User Management Tests
 * 
 * Tests for:
 * 1. Role normalization (accepting canonical keys and human labels)
 * 2. Hardened delete handler error handling
 * 
 * Homer v2.1.0 - User Management Enhancements
 */

import { describe, it, expect, vi, beforeEach } from 'vitest';
import request from 'supertest';
import express, { type Express } from 'express';
import { createUserHandler, updateUserHandler, deleteUserHandler } from '../src/endpoints/admin/users';
import { normalizeRole } from '../src/constants/roles';

// Mock Firebase Admin
vi.mock('firebase-admin', async (importOriginal) => {
  const actual = await importOriginal();

  const authMock = () => ({
    createUser: vi.fn().mockImplementation(async ({ email, password }) => {
      return { uid: `uid-${Math.random().toString(36).slice(2,9)}`, email };
    }),
    updateUser: vi.fn().mockImplementation(async (uid, props) => {
      return { uid, ...props };
    }),
    deleteUser: vi.fn().mockResolvedValue(undefined),
    getUser: vi.fn().mockImplementation(async (uid) => ({
      uid,
      email: `${uid}@example.com`,
      customClaims: {},
    })),
    setCustomUserClaims: vi.fn().mockResolvedValue(undefined),
    generatePasswordResetLink: vi.fn().mockResolvedValue('https://reset.example/'),
    verifyIdToken: vi.fn().mockImplementation(async (token) => {
      if (token && token.startsWith('emulator-')) {
        return { uid: 'emulator-admin', email: 'emulator@local', admin: true };
      }
      return { uid: 'test-uid', email: 'test@example.com', admin: true };
    }),
  });

  return {
    ...actual,
    auth: authMock,
    firestore: actual.firestore,
  };
});

// Mock middleware
vi.mock('../src/middleware/auth', () => ({
  requireAdmin: (req: any, res: any, next: any) => {
    req.auth = { uid: 'admin-uid', role: 'admin' };
    return next();
  },
}));

describe('Role Normalization', () => {
  describe('normalizeRole()', () => {
    it('should accept canonical role keys', () => {
      expect(normalizeRole('admin')).toBe('admin');
      expect(normalizeRole('merch')).toBe('merch');
      expect(normalizeRole('photographer')).toBe('photographer');
      expect(normalizeRole('viewer')).toBe('viewer');
    });

    it('should accept human-readable labels (case-insensitive)', () => {
      expect(normalizeRole('Administrator')).toBe('admin');
      expect(normalizeRole('administrator')).toBe('admin');
      expect(normalizeRole('ADMINISTRATOR')).toBe('admin');
      
      expect(normalizeRole('Merchandise Manager')).toBe('merch');
      expect(normalizeRole('merchandise manager')).toBe('merch');
      
      expect(normalizeRole('Photographer')).toBe('photographer');
      expect(normalizeRole('photographer')).toBe('photographer');
      
      expect(normalizeRole('Viewer')).toBe('viewer');
      expect(normalizeRole('viewer')).toBe('viewer');
    });

    it('should trim whitespace', () => {
      expect(normalizeRole('  admin  ')).toBe('admin');
      expect(normalizeRole(' Administrator ')).toBe('admin');
    });

    it('should return undefined for invalid roles', () => {
      expect(normalizeRole('invalid')).toBeUndefined();
      expect(normalizeRole('user')).toBeUndefined();
      expect(normalizeRole('platform_admin')).toBeUndefined();
      expect(normalizeRole('')).toBeUndefined();
    });

    it('should handle undefined input', () => {
      expect(normalizeRole(undefined)).toBeUndefined();
    });
  });

  describe('POST /admin/settings/users - createUserHandler with role normalization', () => {
    let app: Express;
    let mockAuth: any;
    let mockDb: any;

    beforeEach(() => {
      app = express();
      app.use(express.json());
      app.post('/admin/settings/users', createUserHandler);

      // Mock Firebase Auth
      mockAuth = {
        createUser: vi.fn().mockResolvedValue({
          uid: 'new-user-uid',
          email: 'test@example.com',
          displayName: 'Test User',
        }),
        setCustomUserClaims: vi.fn().mockResolvedValue(undefined),
        generatePasswordResetLink: vi.fn().mockResolvedValue('https://reset-link'),
        getUser: vi.fn().mockResolvedValue({
          uid: 'new-user-uid',
          email: 'test@example.com',
          displayName: 'Test User',
          customClaims: { role: 'viewer' },
          emailVerified: false,
          disabled: false,
        }),
      };

      // Mock Firestore
      mockDb = {
        collection: vi.fn().mockReturnThis(),
        doc: vi.fn().mockReturnThis(),
        set: vi.fn().mockResolvedValue(undefined),
      };

      // Mock getAuth and getDb
      vi.doMock('../src/endpoints/admin/users', async () => {
        const actual = await vi.importActual('../src/endpoints/admin/users');
        return {
          ...actual,
          getAuth: () => mockAuth,
          getDb: () => mockDb,
        };
      });
    });

    it('should accept canonical role key "admin"', async () => {
      const response = await request(app)
        .post('/admin/settings/users')
        .send({
          email: 'admin@example.com',
          password: 'SecurePass123',
          displayName: 'Admin User',
          role: 'admin',
        });

      expect(response.status).toBe(201);
    });

    it('should accept human label "Administrator"', async () => {
      const response = await request(app)
        .post('/admin/settings/users')
        .send({
          email: 'admin@example.com',
          password: 'SecurePass123',
          displayName: 'Admin User',
          role: 'Administrator',
        });

      expect(response.status).toBe(201);
    });

    it('should accept human label "Merchandise Manager"', async () => {
      const response = await request(app)
        .post('/admin/settings/users')
        .send({
          email: 'merch@example.com',
          password: 'SecurePass123',
          role: 'Merchandise Manager',
        });

      expect(response.status).toBe(201);
    });

    it('should reject invalid role', async () => {
      const response = await request(app)
        .post('/admin/settings/users')
        .send({
          email: 'user@example.com',
          password: 'SecurePass123',
          role: 'invalid_role',
        });

      expect(response.status).toBe(400);
      expect(response.body.error).toBe('VALIDATION_ERROR');
      expect(response.body.message).toContain('Invalid role');
    });

    it('should reject legacy role "user"', async () => {
      const response = await request(app)
        .post('/admin/settings/users')
        .send({
          email: 'user@example.com',
          password: 'SecurePass123',
          role: 'user',
        });

      expect(response.status).toBe(400);
      expect(response.body.error).toBe('VALIDATION_ERROR');
    });
  });

  describe('PATCH /admin/settings/users/:uid - updateUserHandler with role normalization', () => {
    let app: Express;
    let mockAuth: any;
    let mockDb: any;

    beforeEach(() => {
      app = express();
      app.use(express.json());
      app.patch('/admin/settings/users/:uid', updateUserHandler);

      mockAuth = {
        updateUser: vi.fn().mockResolvedValue({
          uid: 'user-uid',
          email: 'user@example.com',
          customClaims: {},
        }),
        setCustomUserClaims: vi.fn().mockResolvedValue(undefined),
        getUser: vi.fn().mockResolvedValue({
          uid: 'user-uid',
          email: 'user@example.com',
          displayName: 'Test User',
          customClaims: { role: 'viewer' },
          emailVerified: true,
          disabled: false,
        }),
      };

      mockDb = {
        collection: vi.fn().mockReturnThis(),
        doc: vi.fn().mockReturnThis(),
        get: vi.fn().mockResolvedValue({ exists: true }),
        set: vi.fn().mockResolvedValue(undefined),
      };

      vi.doMock('../src/endpoints/admin/users', async () => {
        const actual = await vi.importActual('../src/endpoints/admin/users');
        return {
          ...actual,
          getAuth: () => mockAuth,
          getDb: () => mockDb,
        };
      });
    });

    it('should accept canonical role key in update', async () => {
      const response = await request(app)
        .patch('/admin/settings/users/user-uid')
        .send({
          role: 'merch',
        });

      expect(response.status).toBe(200);
    });

    it('should accept human label in update', async () => {
      const response = await request(app)
        .patch('/admin/settings/users/user-uid')
        .send({
          role: 'Photographer',
        });

      expect(response.status).toBe(200);
    });

    it('should reject invalid role in update', async () => {
      const response = await request(app)
        .patch('/admin/settings/users/user-uid')
        .send({
          role: 'invalid',
        });

      expect(response.status).toBe(400);
      expect(response.body.error).toBe('VALIDATION_ERROR');
    });
  });
});

describe('Hardened Delete Handler', () => {
  let app: Express;
  let mockAuth: any;
  let mockDb: any;
  let consoleErrorSpy: any;
  let consoleWarnSpy: any;
  let consoleLogSpy: any;

  beforeEach(() => {
    app = express();
    app.use(express.json());
    app.delete('/admin/settings/users/:uid', deleteUserHandler);

    // Spy on console methods
    consoleErrorSpy = vi.spyOn(console, 'error').mockImplementation(() => {});
    consoleWarnSpy = vi.spyOn(console, 'warn').mockImplementation(() => {});
    consoleLogSpy = vi.spyOn(console, 'log').mockImplementation(() => {});

    mockDb = {
      collection: vi.fn().mockReturnThis(),
      doc: vi.fn().mockReturnThis(),
      set: vi.fn().mockResolvedValue(undefined),
      delete: vi.fn().mockResolvedValue(undefined),
    };
  });

  describe('Soft delete error handling', () => {
    it('should handle auth/user-not-found during soft delete', async () => {
      mockAuth = {
        updateUser: vi.fn().mockRejectedValue({
          code: 'auth/user-not-found',
          message: 'User not found',
        }),
      };

      vi.doMock('../src/endpoints/admin/users', async () => {
        const actual = await vi.importActual('../src/endpoints/admin/users');
        return {
          ...actual,
          getAuth: () => mockAuth,
          getDb: () => mockDb,
        };
      });

      const response = await request(app)
        .delete('/admin/settings/users/missing-user-uid')
        .query({ soft: 'true' });

      // Should succeed with 204 despite Auth error
      expect(response.status).toBe(204);
      expect(mockDb.set).toHaveBeenCalled(); // Profile marked deleted
      expect(consoleErrorSpy).toHaveBeenCalled();
    });

    it('should handle auth/configuration-not-found during soft delete', async () => {
      mockAuth = {
        updateUser: vi.fn().mockRejectedValue({
          code: 'auth/configuration-not-found',
          message: 'API not configured',
        }),
      };

      vi.doMock('../src/endpoints/admin/users', async () => {
        const actual = await vi.importActual('../src/endpoints/admin/users');
        return {
          ...actual,
          getAuth: () => mockAuth,
          getDb: () => mockDb,
        };
      });

      const response = await request(app)
        .delete('/admin/settings/users/user-uid')
        .query({ soft: 'true' });

      expect(response.status).toBe(204);
      expect(mockDb.set).toHaveBeenCalled();
      expect(consoleWarnSpy).toHaveBeenCalled();
    });
  });

  describe('Hard delete error handling', () => {
    it('should continue with Firestore cleanup if Auth delete fails', async () => {
      mockAuth = {
        deleteUser: vi.fn().mockRejectedValue({
          code: 'auth/user-not-found',
          message: 'User not found',
        }),
      };

      vi.doMock('../src/endpoints/admin/users', async () => {
        const actual = await vi.importActual('../src/endpoints/admin/users');
        return {
          ...actual,
          getAuth: () => mockAuth,
          getDb: () => mockDb,
        };
      });

      const response = await request(app)
        .delete('/admin/settings/users/missing-user-uid')
        .query({ soft: 'false' });

      // Should succeed and clean up Firestore
      expect(response.status).toBe(204);
      expect(mockDb.delete).toHaveBeenCalled();
      expect(consoleErrorSpy).toHaveBeenCalled();
      expect(consoleLogSpy).toHaveBeenCalledWith(
        expect.stringContaining('User not found in Auth')
      );
    });

    it('should handle auth/configuration-not-found during hard delete', async () => {
      mockAuth = {
        deleteUser: vi.fn().mockRejectedValue({
          code: 'auth/configuration-not-found',
          message: 'API not configured',
        }),
      };

      vi.doMock('../src/endpoints/admin/users', async () => {
        const actual = await vi.importActual('../src/endpoints/admin/users');
        return {
          ...actual,
          getAuth: () => mockAuth,
          getDb: () => mockDb,
        };
      });

      const response = await request(app)
        .delete('/admin/settings/users/user-uid')
        .query({ soft: 'false' });

      expect(response.status).toBe(204);
      expect(mockDb.delete).toHaveBeenCalled();
      expect(consoleWarnSpy).toHaveBeenCalledWith(
        expect.stringContaining('Auth API not configured')
      );
    });

    it('should handle generic Auth errors during hard delete', async () => {
      mockAuth = {
        deleteUser: vi.fn().mockRejectedValue({
          code: 'auth/network-error',
          message: 'Network failure',
        }),
      };

      vi.doMock('../src/endpoints/admin/users', async () => {
        const actual = await vi.importActual('../src/endpoints/admin/users');
        return {
          ...actual,
          getAuth: () => mockAuth,
          getDb: () => mockDb,
        };
      });

      const response = await request(app)
        .delete('/admin/settings/users/user-uid')
        .query({ soft: 'false' });

      expect(response.status).toBe(204);
      expect(mockDb.delete).toHaveBeenCalled();
      expect(consoleWarnSpy).toHaveBeenCalled();
    });

    it('should succeed when Auth delete succeeds', async () => {
      mockAuth = {
        deleteUser: vi.fn().mockResolvedValue(undefined),
      };

      vi.doMock('../src/endpoints/admin/users', async () => {
        const actual = await vi.importActual('../src/endpoints/admin/users');
        return {
          ...actual,
          getAuth: () => mockAuth,
          getDb: () => mockDb,
        };
      });

      const response = await request(app)
        .delete('/admin/settings/users/user-uid')
        .query({ soft: 'false' });

      expect(response.status).toBe(204);
      expect(mockAuth.deleteUser).toHaveBeenCalledWith('user-uid');
      expect(mockDb.delete).toHaveBeenCalled();
    });
  });

  describe('Self-deletion protection', () => {
    it('should prevent self-deletion', async () => {
      mockAuth = {
        deleteUser: vi.fn(),
      };

      // Mock middleware to return current user as target
      vi.doMock('../src/middleware/auth', () => ({
        requireAdmin: (req: any, res: any, next: any) => {
          req.auth = { uid: 'admin-uid', role: 'admin' };
          return next();
        },
      }));

      const response = await request(app)
        .delete('/admin/settings/users/admin-uid')
        .query({ soft: 'false' });

      expect(response.status).toBe(403);
      expect(response.body.error).toBe('FORBIDDEN');
      expect(mockAuth.deleteUser).not.toHaveBeenCalled();
    });
  });
});
