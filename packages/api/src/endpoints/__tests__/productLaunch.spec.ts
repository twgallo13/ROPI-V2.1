import { Request, Response } from 'express';
import * as admin from 'firebase-admin';

// Mock Firebase Admin
jest.mock('firebase-admin', () => ({
  firestore: jest.fn(() => ({
    collection: jest.fn()
  }))
}));

const { 
  createLaunchHandler, 
  getLaunchHandler 
} = require('../productLaunch');

describe('productLaunch', () => {
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

  describe('createLaunchHandler', () => {
    it('should create launch product with valid data', async () => {
      const normalizedMpn = 'abc123';
      const futureDate = new Date();
      futureDate.setDate(futureDate.getDate() + 30);
      
      mockReq.params = { mpn: normalizedMpn };
      mockReq.body = {
        launchDate: futureDate.toISOString().split('T')[0],
        comments: 'Ready for launch',
        images: ['image1.jpg', 'image2.jpg']
      };

      const existingProduct = {
        exists: true,
        data: () => ({
          mpn: 'ABC-123',
          normalized_mpn: normalizedMpn,
          workflow_stage: 'draft'
        })
      };
      
      mockDocRef.get.mockResolvedValue(existingProduct);
      mockDocRef.update.mockResolvedValue({});

      await createLaunchHandler(mockReq as Request, mockRes as Response);

      expect(mockDocRef.update).toHaveBeenCalledWith(
        expect.objectContaining({
          workflow_stage: 'launch',
          launch_date: mockReq.body.launchDate,
          launch_comments: mockReq.body.comments,
          images: mockReq.body.images,
          updated_at: expect.any(Object),
          updated_by: 'test-user-id'
        })
      );
      expect(mockRes.status).toHaveBeenCalledWith(201);
      expect(mockRes.json).toHaveBeenCalledWith({
        success: true,
        message: 'Launch product created successfully'
      });
    });

    it('should reject past launch dates', async () => {
      const normalizedMpn = 'abc123';
      const pastDate = new Date();
      pastDate.setDate(pastDate.getDate() - 1);
      
      mockReq.params = { mpn: normalizedMpn };
      mockReq.body = {
        launchDate: pastDate.toISOString().split('T')[0],
        comments: 'Invalid launch',
        images: ['image1.jpg']
      };

      await createLaunchHandler(mockReq as Request, mockRes as Response);

      expect(mockRes.status).toHaveBeenCalledWith(400);
      expect(mockRes.json).toHaveBeenCalledWith({
        error: 'Launch date must be in the future'
      });
      expect(mockDocRef.update).not.toHaveBeenCalled();
    });

    it('should reject launch without images', async () => {
      const normalizedMpn = 'abc123';
      const futureDate = new Date();
      futureDate.setDate(futureDate.getDate() + 30);
      
      mockReq.params = { mpn: normalizedMpn };
      mockReq.body = {
        launchDate: futureDate.toISOString().split('T')[0],
        comments: 'Launch without images',
        images: []
      };

      await createLaunchHandler(mockReq as Request, mockRes as Response);

      expect(mockRes.status).toHaveBeenCalledWith(400);
      expect(mockRes.json).toHaveBeenCalledWith({
        error: 'At least one image is required for launch products'
      });
    });

    it('should reject launch with missing images field', async () => {
      const normalizedMpn = 'abc123';
      const futureDate = new Date();
      futureDate.setDate(futureDate.getDate() + 30);
      
      mockReq.params = { mpn: normalizedMpn };
      mockReq.body = {
        launchDate: futureDate.toISOString().split('T')[0],
        comments: 'Launch without images field'
      };

      await createLaunchHandler(mockReq as Request, mockRes as Response);

      expect(mockRes.status).toHaveBeenCalledWith(400);
      expect(mockRes.json).toHaveBeenCalledWith({
        error: 'At least one image is required for launch products'
      });
    });

    it('should return 404 when product does not exist', async () => {
      const normalizedMpn = 'nonexistent123';
      const futureDate = new Date();
      futureDate.setDate(futureDate.getDate() + 30);
      
      mockReq.params = { mpn: normalizedMpn };
      mockReq.body = {
        launchDate: futureDate.toISOString().split('T')[0],
        images: ['image1.jpg']
      };

      mockDocRef.get.mockResolvedValue({ exists: false });

      await createLaunchHandler(mockReq as Request, mockRes as Response);

      expect(mockRes.status).toHaveBeenCalledWith(404);
      expect(mockRes.json).toHaveBeenCalledWith({
        error: 'Product not found'
      });
    });

    it('should handle missing launch date', async () => {
      mockReq.params = { mpn: 'abc123' };
      mockReq.body = {
        comments: 'Missing launch date',
        images: ['image1.jpg']
      };

      await createLaunchHandler(mockReq as Request, mockRes as Response);

      expect(mockRes.status).toHaveBeenCalledWith(400);
      expect(mockRes.json).toHaveBeenCalledWith({
        error: 'Launch date is required'
      });
    });

    it('should handle invalid launch date format', async () => {
      mockReq.params = { mpn: 'abc123' };
      mockReq.body = {
        launchDate: 'invalid-date',
        images: ['image1.jpg']
      };

      await createLaunchHandler(mockReq as Request, mockRes as Response);

      expect(mockRes.status).toHaveBeenCalledWith(400);
      expect(mockRes.json).toHaveBeenCalledWith({
        error: 'Invalid launch date format'
      });
    });

    it('should allow launch with optional comments', async () => {
      const normalizedMpn = 'abc123';
      const futureDate = new Date();
      futureDate.setDate(futureDate.getDate() + 30);
      
      mockReq.params = { mpn: normalizedMpn };
      mockReq.body = {
        launchDate: futureDate.toISOString().split('T')[0],
        images: ['image1.jpg']
        // No comments field
      };

      const existingProduct = {
        exists: true,
        data: () => ({ mpn: 'ABC-123' })
      };
      
      mockDocRef.get.mockResolvedValue(existingProduct);
      mockDocRef.update.mockResolvedValue({});

      await createLaunchHandler(mockReq as Request, mockRes as Response);

      expect(mockDocRef.update).toHaveBeenCalledWith(
        expect.objectContaining({
          workflow_stage: 'launch',
          launch_date: mockReq.body.launchDate,
          images: mockReq.body.images
        })
      );
      // Should not include launch_comments in update
      const updateCall = mockDocRef.update.mock.calls[0][0];
      expect(updateCall).not.toHaveProperty('launch_comments');
    });
  });

  describe('getLaunchHandler', () => {
    it('should return launch product data', async () => {
      const normalizedMpn = 'abc123';
      
      mockReq.params = { mpn: normalizedMpn };

      const launchProduct = {
        exists: true,
        data: () => ({
          mpn: 'ABC-123',
          normalized_mpn: normalizedMpn,
          workflow_stage: 'launch',
          launch_date: '2024-06-01',
          launch_comments: 'Ready for launch',
          images: ['image1.jpg', 'image2.jpg']
        })
      };
      
      mockDocRef.get.mockResolvedValue(launchProduct);

      await getLaunchHandler(mockReq as Request, mockRes as Response);

      expect(mockRes.json).toHaveBeenCalledWith({
        mpn: 'ABC-123',
        normalized_mpn: normalizedMpn,
        workflow_stage: 'launch',
        launch_date: '2024-06-01',
        launch_comments: 'Ready for launch',
        images: ['image1.jpg', 'image2.jpg']
      });
    });

    it('should return 404 when launch product does not exist', async () => {
      const normalizedMpn = 'nonexistent123';
      
      mockReq.params = { mpn: normalizedMpn };
      mockDocRef.get.mockResolvedValue({ exists: false });

      await getLaunchHandler(mockReq as Request, mockRes as Response);

      expect(mockRes.status).toHaveBeenCalledWith(404);
      expect(mockRes.json).toHaveBeenCalledWith({
        error: 'Launch product not found'
      });
    });

    it('should handle database errors', async () => {
      mockReq.params = { mpn: 'abc123' };
      mockDocRef.get.mockRejectedValue(new Error('Database error'));

      await getLaunchHandler(mockReq as Request, mockRes as Response);

      expect(mockRes.status).toHaveBeenCalledWith(500);
      expect(mockRes.json).toHaveBeenCalledWith({
        error: 'Failed to retrieve launch product',
        details: 'Database error'
      });
    });
  });

  it('should handle update operation errors in createLaunchHandler', async () => {
    const normalizedMpn = 'abc123';
    const futureDate = new Date();
    futureDate.setDate(futureDate.getDate() + 30);
    
    mockReq.params = { mpn: normalizedMpn };
    mockReq.body = {
      launchDate: futureDate.toISOString().split('T')[0],
      images: ['image1.jpg']
    };

    const existingProduct = {
      exists: true,
      data: () => ({ mpn: 'ABC-123' })
    };
    
    mockDocRef.get.mockResolvedValue(existingProduct);
    mockDocRef.update.mockRejectedValue(new Error('Update failed'));

    await createLaunchHandler(mockReq as Request, mockRes as Response);

    expect(mockRes.status).toHaveBeenCalledWith(500);
    expect(mockRes.json).toHaveBeenCalledWith({
      error: 'Failed to create launch product',
      details: 'Update failed'
    });
  });
});