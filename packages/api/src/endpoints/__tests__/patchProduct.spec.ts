import { Request, Response } from 'express';
import * as admin from 'firebase-admin';

// Mock Firebase Admin
jest.mock('firebase-admin', () => ({
  firestore: jest.fn(() => ({
    collection: jest.fn()
  }))
}));

const { patchProductHandler } = require('../products');

describe('patchProduct', () => {
  let mockReq: Partial<Request>;
  let mockRes: Partial<Response>;
  let mockDb: any;
  let mockDocRef: any;

  beforeEach(() => {
    mockReq = {
      params: {},
      body: {},
      user: { uid: 'test-user-id' }
    };
    
    mockRes = {
      status: jest.fn().mockReturnThis(),
      json: jest.fn()
    };

    mockDocRef = {
      get: jest.fn(),
      update: jest.fn()
    };

    mockDb = {
      collection: jest.fn().mockReturnValue({
        doc: jest.fn().mockReturnValue(mockDocRef)
      })
    };

    (admin.firestore as jest.Mock).mockReturnValue(mockDb);
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  it('should update product with valid changes', async () => {
    const normalizedMpn = 'abc123';
    
    mockReq.params = { mpn: normalizedMpn };
    mockReq.body = {
      brand: 'Updated Brand',
      name: 'Updated Name',
      category: 'Updated Category'
    };

    const existingProduct = {
      exists: true,
      data: () => ({
        mpn: 'ABC-123',
        normalized_mpn: normalizedMpn,
        brand: 'Old Brand'
      })
    };
    
    mockDocRef.get.mockResolvedValue(existingProduct);
    mockDocRef.update.mockResolvedValue({});

    await patchProductHandler(mockReq as Request, mockRes as Response);

    expect(mockDb.collection).toHaveBeenCalledWith('products');
    expect(mockDocRef.get).toHaveBeenCalled();
    expect(mockDocRef.update).toHaveBeenCalledWith(
      expect.objectContaining({
        brand: 'Updated Brand',
        name: 'Updated Name',
        category: 'Updated Category',
        updated_at: expect.any(Object),
        updated_by: 'test-user-id'
      })
    );
    expect(mockRes.json).toHaveBeenCalledWith({
      success: true,
      message: 'Product updated successfully'
    });
  });

  it('should reject attempts to change MPN', async () => {
    const normalizedMpn = 'abc123';
    
    mockReq.params = { mpn: normalizedMpn };
    mockReq.body = {
      mpn: 'NEW-MPN-456',
      brand: 'Updated Brand'
    };

    await patchProductHandler(mockReq as Request, mockRes as Response);

    expect(mockRes.status).toHaveBeenCalledWith(400);
    expect(mockRes.json).toHaveBeenCalledWith({
      error: 'MPN cannot be changed after product creation'
    });
    expect(mockDocRef.update).not.toHaveBeenCalled();
  });

  it('should reject attempts to change normalized_mpn', async () => {
    const normalizedMpn = 'abc123';
    
    mockReq.params = { mpn: normalizedMpn };
    mockReq.body = {
      normalized_mpn: 'newmpn456',
      brand: 'Updated Brand'
    };

    await patchProductHandler(mockReq as Request, mockRes as Response);

    expect(mockRes.status).toHaveBeenCalledWith(400);
    expect(mockRes.json).toHaveBeenCalledWith({
      error: 'MPN fields cannot be modified'
    });
  });

  it('should reject attempts to change product ID', async () => {
    const normalizedMpn = 'abc123';
    
    mockReq.params = { mpn: normalizedMpn };
    mockReq.body = {
      id: 'new-product-id',
      brand: 'Updated Brand'
    };

    await patchProductHandler(mockReq as Request, mockRes as Response);

    expect(mockRes.status).toHaveBeenCalledWith(400);
    expect(mockRes.json).toHaveBeenCalledWith({
      error: 'Product ID cannot be changed'
    });
  });

  it('should return 404 when product does not exist', async () => {
    const normalizedMpn = 'nonexistent123';
    
    mockReq.params = { mpn: normalizedMpn };
    mockReq.body = { brand: 'Updated Brand' };

    mockDocRef.get.mockResolvedValue({ exists: false });

    await patchProductHandler(mockReq as Request, mockRes as Response);

    expect(mockRes.status).toHaveBeenCalledWith(404);
    expect(mockRes.json).toHaveBeenCalledWith({
      error: 'Product not found'
    });
    expect(mockDocRef.update).not.toHaveBeenCalled();
  });

  it('should handle empty update body', async () => {
    const normalizedMpn = 'abc123';
    
    mockReq.params = { mpn: normalizedMpn };
    mockReq.body = {};

    const existingProduct = {
      exists: true,
      data: () => ({ mpn: 'ABC-123' })
    };
    
    mockDocRef.get.mockResolvedValue(existingProduct);

    await patchProductHandler(mockReq as Request, mockRes as Response);

    expect(mockRes.status).toHaveBeenCalledWith(400);
    expect(mockRes.json).toHaveBeenCalledWith({
      error: 'No valid fields to update'
    });
    expect(mockDocRef.update).not.toHaveBeenCalled();
  });

  it('should filter out system fields from updates', async () => {
    const normalizedMpn = 'abc123';
    
    mockReq.params = { mpn: normalizedMpn };
    mockReq.body = {
      brand: 'Updated Brand',
      created_at: new Date().toISOString(), // Should be filtered out
      created_by: 'hacker', // Should be filtered out
      updated_at: 'old-timestamp', // Should be overridden
      workflow_stage: 'active' // Should be allowed
    };

    const existingProduct = {
      exists: true,
      data: () => ({ mpn: 'ABC-123' })
    };
    
    mockDocRef.get.mockResolvedValue(existingProduct);
    mockDocRef.update.mockResolvedValue({});

    await patchProductHandler(mockReq as Request, mockRes as Response);

    expect(mockDocRef.update).toHaveBeenCalledWith(
      expect.objectContaining({
        brand: 'Updated Brand',
        workflow_stage: 'active',
        updated_at: expect.any(Object),
        updated_by: 'test-user-id'
      })
    );

    // Ensure these fields are not in the update
    const updateCall = mockDocRef.update.mock.calls[0][0];
    expect(updateCall).not.toHaveProperty('created_at');
    expect(updateCall).not.toHaveProperty('created_by');
    expect(updateCall.updated_by).toBe('test-user-id'); // Should be set by system
  });

  it('should handle database errors gracefully', async () => {
    const normalizedMpn = 'abc123';
    
    mockReq.params = { mpn: normalizedMpn };
    mockReq.body = { brand: 'Updated Brand' };

    mockDocRef.get.mockRejectedValue(new Error('Database connection failed'));

    await patchProductHandler(mockReq as Request, mockRes as Response);

    expect(mockRes.status).toHaveBeenCalledWith(500);
    expect(mockRes.json).toHaveBeenCalledWith({
      error: 'Failed to update product',
      details: 'Database connection failed'
    });
  });

  it('should handle update operation errors', async () => {
    const normalizedMpn = 'abc123';
    
    mockReq.params = { mpn: normalizedMpn };
    mockReq.body = { brand: 'Updated Brand' };

    const existingProduct = {
      exists: true,
      data: () => ({ mpn: 'ABC-123' })
    };
    
    mockDocRef.get.mockResolvedValue(existingProduct);
    mockDocRef.update.mockRejectedValue(new Error('Update failed'));

    await patchProductHandler(mockReq as Request, mockRes as Response);

    expect(mockRes.status).toHaveBeenCalledWith(500);
    expect(mockRes.json).toHaveBeenCalledWith({
      error: 'Failed to update product',
      details: 'Update failed'
    });
  });

  it('should allow updating workflow stage', async () => {
    const normalizedMpn = 'abc123';
    
    mockReq.params = { mpn: normalizedMpn };
    mockReq.body = {
      workflow_stage: 'active'
    };

    const existingProduct = {
      exists: true,
      data: () => ({ 
        mpn: 'ABC-123',
        workflow_stage: 'draft'
      })
    };
    
    mockDocRef.get.mockResolvedValue(existingProduct);
    mockDocRef.update.mockResolvedValue({});

    await patchProductHandler(mockReq as Request, mockRes as Response);

    expect(mockDocRef.update).toHaveBeenCalledWith(
      expect.objectContaining({
        workflow_stage: 'active'
      })
    );
  });

  it('should allow updating launch products attributes', async () => {
    const normalizedMpn = 'abc123';
    
    mockReq.params = { mpn: normalizedMpn };
    mockReq.body = {
      launch_date: '2024-06-01',
      launch_comments: 'Ready for launch',
      images: ['image1.jpg', 'image2.jpg']
    };

    const existingProduct = {
      exists: true,
      data: () => ({ 
        mpn: 'ABC-123',
        workflow_stage: 'launch'
      })
    };
    
    mockDocRef.get.mockResolvedValue(existingProduct);
    mockDocRef.update.mockResolvedValue({});

    await patchProductHandler(mockReq as Request, mockRes as Response);

    expect(mockDocRef.update).toHaveBeenCalledWith(
      expect.objectContaining({
        launch_date: '2024-06-01',
        launch_comments: 'Ready for launch',
        images: ['image1.jpg', 'image2.jpg']
      })
    );
  });
});