import { Request, Response } from 'express';
import * as admin from 'firebase-admin';
import { normalizeMpn } from '@ropi-aoss/sdk';

// Mock the createProduct module
jest.mock('@ropi-aoss/sdk', () => ({
  normalizeMpn: jest.fn()
}));

// Mock Firebase Admin
jest.mock('firebase-admin', () => ({
  firestore: jest.fn(() => ({
    collection: jest.fn(),
    runTransaction: jest.fn()
  }))
}));

// Import after mocking
const { createProductHandler } = require('../createProduct');

describe('createProduct', () => {
  let mockReq: Partial<Request>;
  let mockRes: Partial<Response>;
  let mockDb: any;
  let mockTransaction: any;
  let mockDocRef: any;

  beforeEach(() => {
    mockReq = {
      body: {},
      user: { uid: 'test-user-id' }
    };
    
    mockRes = {
      status: jest.fn().mockReturnThis(),
      json: jest.fn()
    };

    mockDocRef = {
      get: jest.fn(),
      set: jest.fn()
    };

    mockTransaction = {
      get: jest.fn(),
      set: jest.fn()
    };

    mockDb = {
      collection: jest.fn().mockReturnValue({
        doc: jest.fn().mockReturnValue(mockDocRef)
      }),
      runTransaction: jest.fn()
    };

    (admin.firestore as jest.Mock).mockReturnValue(mockDb);
    (normalizeMpn as jest.Mock).mockClear();
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  it('should create a new product with valid MPN', async () => {
    const testMpn = 'ABC-123';
    const normalizedMpn = 'abc123';
    
    mockReq.body = { mpn: testMpn };
    (normalizeMpn as jest.Mock).mockReturnValue(normalizedMpn);
    
    const mockDoc = { exists: false };
    mockTransaction.get.mockResolvedValue(mockDoc);
    mockDb.runTransaction.mockImplementation((callback) => callback(mockTransaction));

    await createProductHandler(mockReq as Request, mockRes as Response);

    expect(normalizeMpn).toHaveBeenCalledWith(testMpn);
    expect(mockDb.collection).toHaveBeenCalledWith('products');
    expect(mockTransaction.set).toHaveBeenCalledWith(
      expect.any(Object),
      expect.objectContaining({
        mpn: testMpn,
        normalized_mpn: normalizedMpn,
        created_at: expect.any(Object),
        created_by: 'test-user-id',
        workflow_stage: 'draft'
      })
    );
    expect(mockRes.status).toHaveBeenCalledWith(201);
    expect(mockRes.json).toHaveBeenCalledWith(
      expect.objectContaining({
        success: true,
        mpn: testMpn,
        normalized_mpn: normalizedMpn
      })
    );
  });

  it('should return existing product when MPN already exists', async () => {
    const testMpn = 'ABC-123';
    const normalizedMpn = 'abc123';
    
    mockReq.body = { mpn: testMpn };
    (normalizeMpn as jest.Mock).mockReturnValue(normalizedMpn);
    
    const existingProduct = {
      exists: true,
      data: () => ({
        mpn: testMpn,
        normalized_mpn: normalizedMpn,
        brand: 'Test Brand'
      })
    };
    mockTransaction.get.mockResolvedValue(existingProduct);
    mockDb.runTransaction.mockImplementation((callback) => callback(mockTransaction));

    await createProductHandler(mockReq as Request, mockRes as Response);

    expect(normalizeMpn).toHaveBeenCalledWith(testMpn);
    expect(mockTransaction.set).not.toHaveBeenCalled();
    expect(mockRes.status).toHaveBeenCalledWith(200);
    expect(mockRes.json).toHaveBeenCalledWith(
      expect.objectContaining({
        success: true,
        exists: true,
        product: expect.objectContaining({
          mpn: testMpn,
          normalized_mpn: normalizedMpn,
          brand: 'Test Brand'
        })
      })
    );
  });

  it('should return 400 when MPN is missing', async () => {
    mockReq.body = {};

    await createProductHandler(mockReq as Request, mockRes as Response);

    expect(mockRes.status).toHaveBeenCalledWith(400);
    expect(mockRes.json).toHaveBeenCalledWith({
      error: 'MPN is required'
    });
  });

  it('should return 400 when MPN is empty string', async () => {
    mockReq.body = { mpn: '' };

    await createProductHandler(mockReq as Request, mockRes as Response);

    expect(mockRes.status).toHaveBeenCalledWith(400);
    expect(mockRes.json).toHaveBeenCalledWith({
      error: 'MPN is required'
    });
  });

  it('should return 400 when MPN is only whitespace', async () => {
    mockReq.body = { mpn: '   ' };

    await createProductHandler(mockReq as Request, mockRes as Response);

    expect(mockRes.status).toHaveBeenCalledWith(400);
    expect(mockRes.json).toHaveBeenCalledWith({
      error: 'MPN is required'
    });
  });

  it('should handle database errors gracefully', async () => {
    const testMpn = 'ABC-123';
    const normalizedMpn = 'abc123';
    
    mockReq.body = { mpn: testMpn };
    (normalizeMpn as jest.Mock).mockReturnValue(normalizedMpn);
    
    const dbError = new Error('Database connection failed');
    mockDb.runTransaction.mockRejectedValue(dbError);

    await createProductHandler(mockReq as Request, mockRes as Response);

    expect(mockRes.status).toHaveBeenCalledWith(500);
    expect(mockRes.json).toHaveBeenCalledWith({
      error: 'Failed to create product',
      details: 'Database connection failed'
    });
  });

  it('should handle normalization errors', async () => {
    const testMpn = 'ABC-123';
    
    mockReq.body = { mpn: testMpn };
    (normalizeMpn as jest.Mock).mockImplementation(() => {
      throw new Error('Invalid MPN format');
    });

    await createProductHandler(mockReq as Request, mockRes as Response);

    expect(mockRes.status).toHaveBeenCalledWith(500);
    expect(mockRes.json).toHaveBeenCalledWith({
      error: 'Failed to create product',
      details: 'Invalid MPN format'
    });
  });

  it('should trim whitespace from MPN', async () => {
    const testMpn = '  ABC-123  ';
    const trimmedMpn = 'ABC-123';
    const normalizedMpn = 'abc123';
    
    mockReq.body = { mpn: testMpn };
    (normalizeMpn as jest.Mock).mockReturnValue(normalizedMpn);
    
    const mockDoc = { exists: false };
    mockTransaction.get.mockResolvedValue(mockDoc);
    mockDb.runTransaction.mockImplementation((callback) => callback(mockTransaction));

    await createProductHandler(mockReq as Request, mockRes as Response);

    expect(normalizeMpn).toHaveBeenCalledWith(trimmedMpn);
    expect(mockTransaction.set).toHaveBeenCalledWith(
      expect.any(Object),
      expect.objectContaining({
        mpn: trimmedMpn
      })
    );
  });
});