/**
 * Auth Middleware Unit Tests
 * 
 * LP-1.2.2: Tests for requireAdmin middleware authentication behavior
 */

import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import type { Request, Response } from 'express';
import * as authModule from '../../src/middleware/auth';

// Mock firebase-admin
vi.mock('firebase-admin', () => ({
  auth: () => ({
    verifyIdToken: vi.fn(),
  }),
  firestore: () => ({
    doc: vi.fn(() => ({
      get: vi.fn().mockResolvedValue({
        exists: false,
        data: () => ({ emails: [] }),
      }),
    })),
  }),
}));

describe('requireAdmin middleware', () => {
  let mockReq: Partial<Request>;
  let mockRes: Partial<Response>;
  let mockNext: ReturnType<typeof vi.fn>;
  let statusFn: ReturnType<typeof vi.fn>;
  let jsonFn: ReturnType<typeof vi.fn>;

  beforeEach(() => {
    statusFn = vi.fn().mockReturnThis();
    jsonFn = vi.fn();
    
    mockReq = {
      headers: {},
      path: '/api/products/by-mpn/123',
      method: 'GET',
    };
    
    mockRes = {
      status: statusFn,
      json: jsonFn,
    };
    
    mockNext = vi.fn();
  });

  afterEach(() => {
    vi.resetAllMocks();
  });

  describe('401 Unauthorized scenarios', () => {
    it('should return 401 when Authorization header is missing', async () => {
      mockReq.headers = {};
      
      await authModule.requireAdmin(
        mockReq as Request,
        mockRes as Response,
        mockNext
      );
      
      expect(statusFn).toHaveBeenCalledWith(401);
      expect(jsonFn).toHaveBeenCalledWith(
        expect.objectContaining({
          error: 'UNAUTHENTICATED',
          message: expect.stringContaining('authentication token'),
        })
      );
      expect(mockNext).not.toHaveBeenCalled();
    });

    it('should return 401 when Authorization header has no Bearer prefix', async () => {
      mockReq.headers = {
        authorization: 'invalid-token-format',
      };
      
      await authModule.requireAdmin(
        mockReq as Request,
        mockRes as Response,
        mockNext
      );
      
      expect(statusFn).toHaveBeenCalledWith(401);
      expect(jsonFn).toHaveBeenCalledWith(
        expect.objectContaining({
          error: 'UNAUTHENTICATED',
        })
      );
      expect(mockNext).not.toHaveBeenCalled();
    });
  });

  describe('Error message format', () => {
    it('should return structured error response for 401', async () => {
      mockReq.headers = {};
      
      await authModule.requireAdmin(
        mockReq as Request,
        mockRes as Response,
        mockNext
      );
      
      expect(jsonFn).toHaveBeenCalledWith({
        error: 'UNAUTHENTICATED',
        message: expect.any(String),
      });
    });
  });
});

describe('isAdmin helper', () => {
  it('should return true when role is admin', () => {
    const auth = {
      uid: 'test-uid',
      email: 'test@example.com',
      role: 'admin',
      roles: [],
      emailVerified: true,
    };
    
    expect(authModule.isAdmin(auth)).toBe(true);
  });

  it('should return true when roles array contains admin', () => {
    const auth = {
      uid: 'test-uid',
      email: 'test@example.com',
      role: undefined,
      roles: ['admin'],
      emailVerified: true,
    };
    
    expect(authModule.isAdmin(auth)).toBe(true);
  });

  it('should return false when no admin role', () => {
    const auth = {
      uid: 'test-uid',
      email: 'test@example.com',
      role: 'user',
      roles: ['viewer'],
      emailVerified: true,
    };
    
    expect(authModule.isAdmin(auth)).toBe(false);
  });
});
