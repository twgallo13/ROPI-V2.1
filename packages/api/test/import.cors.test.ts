/**
 * Import CORS Tests
 * LP-3.0.0: Verify CORS preflight and POST handling for importCSV
 */

import { describe, it, expect, vi, beforeEach } from 'vitest';

// Mock firebase-functions
vi.mock('firebase-functions', () => ({
  https: {
    onRequest: vi.fn((handler) => handler),
  },
}));

// Mock cors middleware
const mockCorsMiddleware = vi.fn((req, res, next) => {
  // Simulate cors setting headers based on origin
  const origin = req.headers?.origin;
  const allowedOrigins = [
    'https://ropi-aoss-staging.web.app',
    'https://ropi-aoss.web.app',
    'https://ropi-aoss-prod.web.app',
  ];
  
  if (!origin || allowedOrigins.includes(origin)) {
    res.set('Access-Control-Allow-Origin', origin || '*');
    res.set('Access-Control-Allow-Credentials', 'true');
    res.set('Access-Control-Allow-Methods', 'GET,POST,OPTIONS');
    res.set('Access-Control-Allow-Headers', 'Content-Type,Authorization,X-Requested-With');
  }
  next();
});

vi.mock('cors', () => ({
  default: vi.fn(() => mockCorsMiddleware),
}));

// Mock auth middleware
vi.mock('../src/middleware/auth', () => ({
  requireAdmin: vi.fn((req, res, next) => next()),
}));

// Mock import service
vi.mock('../src/services/importService', () => ({
  processCSVImport: vi.fn().mockResolvedValue({
    batch: { batchId: 'test-batch', fileName: 'test.csv', status: 'completed', createdAt: new Date() },
    rowCount: 10,
    errorCount: 0,
    warningCount: 0,
  }),
  validateCSVImport: vi.fn().mockResolvedValue({
    totalRows: 10,
    validRows: 10,
    invalidRows: 0,
  }),
}));

describe('Import CORS Tests (LP-3.0.0)', () => {
  let mockReq: any;
  let mockRes: any;
  
  beforeEach(() => {
    mockRes = {
      status: vi.fn().mockReturnThis(),
      json: vi.fn().mockReturnThis(),
      send: vi.fn().mockReturnThis(),
      set: vi.fn().mockReturnThis(),
      headers: {},
    };
    
    mockReq = {
      method: 'OPTIONS',
      headers: {
        origin: 'https://ropi-aoss-staging.web.app',
        'access-control-request-method': 'POST',
      },
    };
    
    vi.clearAllMocks();
  });

  describe('Preflight OPTIONS requests', () => {
    it('should return 204 for OPTIONS request from allowed staging origin', async () => {
      const { importCSV } = await import('../src/endpoints/import');
      
      mockReq.method = 'OPTIONS';
      mockReq.headers.origin = 'https://ropi-aoss-staging.web.app';
      
      await (importCSV as any)(mockReq, mockRes);
      
      // LP-ATTR-1.3.1.1: Early OPTIONS handling sets headers directly, no middleware call
      expect(mockRes.status).toHaveBeenCalledWith(204);
      expect(mockRes.send).toHaveBeenCalledWith('');
      expect(mockRes.set).toHaveBeenCalledWith('Access-Control-Allow-Origin', 'https://ropi-aoss-staging.web.app');
    });

    it('should return 204 for OPTIONS request from allowed production origin', async () => {
      const { importCSV } = await import('../src/endpoints/import');
      
      mockReq.method = 'OPTIONS';
      mockReq.headers.origin = 'https://ropi-aoss-prod.web.app';
      
      await (importCSV as any)(mockReq, mockRes);
      
      expect(mockRes.status).toHaveBeenCalledWith(204);
    });

    it('should set Access-Control-Allow-Origin header for staging origin', async () => {
      const { importCSV } = await import('../src/endpoints/import');
      
      mockReq.method = 'OPTIONS';
      mockReq.headers.origin = 'https://ropi-aoss-staging.web.app';
      
      await (importCSV as any)(mockReq, mockRes);
      
      expect(mockRes.set).toHaveBeenCalledWith(
        'Access-Control-Allow-Origin',
        'https://ropi-aoss-staging.web.app'
      );
    });

    it('should set Access-Control-Allow-Credentials header', async () => {
      const { importCSV } = await import('../src/endpoints/import');
      
      mockReq.method = 'OPTIONS';
      mockReq.headers.origin = 'https://ropi-aoss-staging.web.app';
      
      await (importCSV as any)(mockReq, mockRes);
      
      expect(mockRes.set).toHaveBeenCalledWith('Access-Control-Allow-Credentials', 'true');
    });

    it('should set Access-Control-Allow-Methods header', async () => {
      const { importCSV } = await import('../src/endpoints/import');
      
      mockReq.method = 'OPTIONS';
      mockReq.headers.origin = 'https://ropi-aoss-staging.web.app';
      
      await (importCSV as any)(mockReq, mockRes);
      
      expect(mockRes.set).toHaveBeenCalledWith(
        'Access-Control-Allow-Methods',
        'GET,POST,OPTIONS'
      );
    });
  });

  describe('POST requests with CORS headers', () => {
    it('should include CORS headers in POST response from staging origin', async () => {
      const { importCSV } = await import('../src/endpoints/import');
      
      mockReq.method = 'POST';
      mockReq.headers.origin = 'https://ropi-aoss-staging.web.app';
      mockReq.headers['content-type'] = 'multipart/form-data; boundary=---xyz';
      mockReq.pipe = vi.fn();
      
      await (importCSV as any)(mockReq, mockRes);
      
      expect(mockCorsMiddleware).toHaveBeenCalled();
      expect(mockRes.set).toHaveBeenCalledWith(
        'Access-Control-Allow-Origin',
        'https://ropi-aoss-staging.web.app'
      );
    });
  });

  describe('importDryRun CORS', () => {
    it('should return 204 for OPTIONS request to dry-run endpoint', async () => {
      const { importDryRun } = await import('../src/endpoints/import');
      
      mockReq.method = 'OPTIONS';
      mockReq.headers.origin = 'https://ropi-aoss-staging.web.app';
      
      await (importDryRun as any)(mockReq, mockRes);
      
      expect(mockRes.status).toHaveBeenCalledWith(204);
      expect(mockRes.send).toHaveBeenCalledWith('');
    });
  });

  describe('Requests without origin (curl, server-to-server)', () => {
    it('should allow requests with no origin header', async () => {
      const { importCSV } = await import('../src/endpoints/import');
      
      mockReq.method = 'OPTIONS';
      delete mockReq.headers.origin;
      
      await (importCSV as any)(mockReq, mockRes);
      
      // LP-ATTR-1.3.1.1: Early OPTIONS handling, no origin means wildcard CORS
      expect(mockRes.status).toHaveBeenCalledWith(204);
      expect(mockRes.set).toHaveBeenCalledWith('Access-Control-Allow-Origin', '*');
    });
  });
});
