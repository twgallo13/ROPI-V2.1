import { Request, Response } from 'express';
import { Storage } from '@google-cloud/storage';
import { v4 as uuidv4 } from 'uuid';

// Mock modules
jest.mock('@google-cloud/storage');
jest.mock('uuid');

const { 
  signImageUploadHandler, 
  registerImageHandler, 
  getImageViewUrlHandler 
} = require('../productImages');

describe('productImages', () => {
  let mockReq: Partial<Request>;
  let mockRes: Partial<Response>;
  let mockStorage: any;
  let mockBucket: any;
  let mockFile: any;

  beforeEach(() => {
    mockReq = {
      params: {},
      body: {},
      query: {}
    };
    
    mockRes = {
      status: jest.fn().mockReturnThis(),
      json: jest.fn()
    };

    mockFile = {
      getSignedUrl: jest.fn()
    };

    mockBucket = {
      file: jest.fn().mockReturnValue(mockFile)
    };

    mockStorage = {
      bucket: jest.fn().mockReturnValue(mockBucket)
    };

    (Storage as jest.MockedClass<typeof Storage>).mockImplementation(() => mockStorage);
    (uuidv4 as jest.Mock).mockReturnValue('test-uuid-123');

    // Mock environment variable
    process.env.PRODUCT_IMAGES_BUCKET = 'test-images-bucket';
  });

  afterEach(() => {
    jest.clearAllMocks();
    delete process.env.PRODUCT_IMAGES_BUCKET;
  });

  describe('signImageUploadHandler', () => {
    it('should generate signed URL for valid image upload', async () => {
      const mpn = 'abc123';
      const filename = 'image.jpg';
      const contentType = 'image/jpeg';

      mockReq.params = { mpn };
      mockReq.body = { filename, contentType };

      const mockSignedUrl = 'https://storage.googleapis.com/signed-url';
      mockFile.getSignedUrl.mockResolvedValue([mockSignedUrl]);

      await signImageUploadHandler(mockReq as Request, mockRes as Response);

      expect(mockStorage.bucket).toHaveBeenCalledWith('test-images-bucket');
      expect(mockBucket.file).toHaveBeenCalledWith('products/abc123/images/test-uuid-123.jpg');
      expect(mockFile.getSignedUrl).toHaveBeenCalledWith({
        version: 'v4',
        action: 'write',
        expires: expect.any(Date),
        contentType: 'image/jpeg'
      });
      expect(mockRes.json).toHaveBeenCalledWith({
        uploadUrl: mockSignedUrl,
        imageId: 'test-uuid-123',
        filePath: 'products/abc123/images/test-uuid-123.jpg'
      });
    });

    it('should reject non-image content types', async () => {
      mockReq.params = { mpn: 'abc123' };
      mockReq.body = { filename: 'document.pdf', contentType: 'application/pdf' };

      await signImageUploadHandler(mockReq as Request, mockRes as Response);

      expect(mockRes.status).toHaveBeenCalledWith(400);
      expect(mockRes.json).toHaveBeenCalledWith({
        error: 'Only image files are allowed'
      });
    });

    it('should handle missing filename', async () => {
      mockReq.params = { mpn: 'abc123' };
      mockReq.body = { contentType: 'image/jpeg' };

      await signImageUploadHandler(mockReq as Request, mockRes as Response);

      expect(mockRes.status).toHaveBeenCalledWith(400);
      expect(mockRes.json).toHaveBeenCalledWith({
        error: 'Filename and content type are required'
      });
    });

    it('should handle missing content type', async () => {
      mockReq.params = { mpn: 'abc123' };
      mockReq.body = { filename: 'image.jpg' };

      await signImageUploadHandler(mockReq as Request, mockRes as Response);

      expect(mockRes.status).toHaveBeenCalledWith(400);
      expect(mockRes.json).toHaveBeenCalledWith({
        error: 'Filename and content type are required'
      });
    });

    it('should handle Storage errors', async () => {
      mockReq.params = { mpn: 'abc123' };
      mockReq.body = { filename: 'image.jpg', contentType: 'image/jpeg' };

      mockFile.getSignedUrl.mockRejectedValue(new Error('Storage error'));

      await signImageUploadHandler(mockReq as Request, mockRes as Response);

      expect(mockRes.status).toHaveBeenCalledWith(500);
      expect(mockRes.json).toHaveBeenCalledWith({
        error: 'Failed to generate upload URL',
        details: 'Storage error'
      });
    });

    it('should extract correct file extension from various formats', async () => {
      const testCases = [
        { filename: 'image.jpeg', expected: 'jpeg' },
        { filename: 'photo.PNG', expected: 'png' },
        { filename: 'picture.gif', expected: 'gif' },
        { filename: 'noextension', expected: 'jpg' }
      ];

      for (const testCase of testCases) {
        mockReq.params = { mpn: 'abc123' };
        mockReq.body = { 
          filename: testCase.filename, 
          contentType: 'image/jpeg' 
        };

        await signImageUploadHandler(mockReq as Request, mockRes as Response);

        expect(mockBucket.file).toHaveBeenCalledWith(
          `products/abc123/images/test-uuid-123.${testCase.expected}`
        );

        jest.clearAllMocks();
        mockBucket.file.mockReturnValue(mockFile);
        mockFile.getSignedUrl.mockResolvedValue(['test-url']);
      }
    });
  });

  describe('registerImageHandler', () => {
    it('should register uploaded image successfully', async () => {
      mockReq.params = { mpn: 'abc123' };
      mockReq.body = {
        imageId: 'test-uuid-123',
        filename: 'image.jpg',
        filePath: 'products/abc123/images/test-uuid-123.jpg'
      };

      await registerImageHandler(mockReq as Request, mockRes as Response);

      expect(mockRes.json).toHaveBeenCalledWith({
        success: true,
        imageId: 'test-uuid-123',
        message: 'Image registered successfully'
      });
    });

    it('should handle missing required fields', async () => {
      mockReq.params = { mpn: 'abc123' };
      mockReq.body = { imageId: 'test-uuid-123' }; // Missing filename and filePath

      await registerImageHandler(mockReq as Request, mockRes as Response);

      expect(mockRes.status).toHaveBeenCalledWith(400);
      expect(mockRes.json).toHaveBeenCalledWith({
        error: 'Image ID, filename, and file path are required'
      });
    });
  });

  describe('getImageViewUrlHandler', () => {
    it('should generate view URL for existing image', async () => {
      mockReq.params = { mpn: 'abc123', imageId: 'test-uuid-123' };
      mockReq.query = { ext: 'jpg' };

      const mockViewUrl = 'https://storage.googleapis.com/view-url';
      mockFile.getSignedUrl.mockResolvedValue([mockViewUrl]);

      await getImageViewUrlHandler(mockReq as Request, mockRes as Response);

      expect(mockBucket.file).toHaveBeenCalledWith('products/abc123/images/test-uuid-123.jpg');
      expect(mockFile.getSignedUrl).toHaveBeenCalledWith({
        version: 'v4',
        action: 'read',
        expires: expect.any(Date)
      });
      expect(mockRes.json).toHaveBeenCalledWith({
        viewUrl: mockViewUrl
      });
    });

    it('should handle missing extension parameter', async () => {
      mockReq.params = { mpn: 'abc123', imageId: 'test-uuid-123' };
      mockReq.query = {};

      await getImageViewUrlHandler(mockReq as Request, mockRes as Response);

      expect(mockRes.status).toHaveBeenCalledWith(400);
      expect(mockRes.json).toHaveBeenCalledWith({
        error: 'File extension is required'
      });
    });

    it('should handle Storage errors for view URL', async () => {
      mockReq.params = { mpn: 'abc123', imageId: 'test-uuid-123' };
      mockReq.query = { ext: 'jpg' };

      mockFile.getSignedUrl.mockRejectedValue(new Error('File not found'));

      await getImageViewUrlHandler(mockReq as Request, mockRes as Response);

      expect(mockRes.status).toHaveBeenCalledWith(500);
      expect(mockRes.json).toHaveBeenCalledWith({
        error: 'Failed to generate view URL',
        details: 'File not found'
      });
    });
  });

  it('should handle missing PRODUCT_IMAGES_BUCKET environment variable', async () => {
    delete process.env.PRODUCT_IMAGES_BUCKET;

    mockReq.params = { mpn: 'abc123' };
    mockReq.body = { filename: 'image.jpg', contentType: 'image/jpeg' };

    await signImageUploadHandler(mockReq as Request, mockRes as Response);

    expect(mockRes.status).toHaveBeenCalledWith(500);
    expect(mockRes.json).toHaveBeenCalledWith({
      error: 'Storage configuration error'
    });
  });
});