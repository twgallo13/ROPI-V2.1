// packages/api/src/endpoints/admin/aiDescribeSettings.test.ts
import { describe, it, expect, beforeEach, vi, type MockedFunction } from 'vitest';
import { 
  updateAttributeAiInputHandler,
  listAITemplatesHandler,
  createAITemplateHandler,
  getAITemplateHandler,
  updateAITemplateHandler,
  deleteAITemplateHandler
} from './aiDescribeSettings';
import type { Request, Response } from 'express';

// Mock dependencies
vi.mock('firebase-admin/firestore');
vi.mock('../../lib/logger');
vi.mock('../../lib/settingsHelpers');

const mockFirestore = {
  collection: vi.fn().mockReturnThis(),
  doc: vi.fn().mockReturnThis(),
  get: vi.fn(),
  update: vi.fn(),
  set: vi.fn(),
  delete: vi.fn(),
  add: vi.fn(),
  orderBy: vi.fn().mockReturnThis(),
  offset: vi.fn().mockReturnThis(),
  limit: vi.fn().mockReturnThis(),
  Timestamp: {
    now: vi.fn(() => ({ seconds: 1234567890, nanoseconds: 0 }))
  }
};

vi.mocked(require('firebase-admin/firestore')).getFirestore = vi.fn(() => mockFirestore);

describe('AI Describe Admin Settings Endpoints', () => {
  let mockRequest: Partial<Request>;
  let mockResponse: Partial<Response>;
  let statusSpy: MockedFunction<any>;
  let jsonSpy: MockedFunction<any>;

  beforeEach(() => {
    vi.clearAllMocks();
    
    statusSpy = vi.fn().mockReturnThis();
    jsonSpy = vi.fn();
    
    mockRequest = {
      params: {},
      body: {},
      query: {},
      user: { uid: 'admin-user-id' }
    };
    
    mockResponse = {
      status: statusSpy,
      json: jsonSpy,
    };
  });

  describe('updateAttributeAiInputHandler', () => {
    beforeEach(() => {
      mockRequest.params = { attributeId: 'test-attr' };
      mockRequest.body = { aiInput: true };
    });

    it('should update aiInput flag successfully', async () => {
      // Mock attribute exists
      mockFirestore.get.mockResolvedValueOnce({
        exists: true,
        data: () => ({ attribute_id: 'test-attr', status: 'active' })
      });

      mockFirestore.update.mockResolvedValueOnce(undefined);
      mockFirestore.add.mockResolvedValueOnce({ id: 'log-entry-123' });

      await updateAttributeAiInputHandler(mockRequest as Request, mockResponse as Response);

      expect(mockFirestore.update).toHaveBeenCalledWith({
        aiInput: true,
        updatedAt: expect.any(Object),
        updatedBy: 'admin-user-id'
      });

      expect(jsonSpy).toHaveBeenCalledWith({
        status: 'ok',
        message: "aiInput flag for 'test-attr' updated to true"
      });
    });

    it('should return 404 for non-existent attribute', async () => {
      mockFirestore.get.mockResolvedValueOnce({
        exists: false
      });

      await updateAttributeAiInputHandler(mockRequest as Request, mockResponse as Response);

      expect(statusSpy).toHaveBeenCalledWith(404);
      expect(jsonSpy).toHaveBeenCalledWith({
        status: 'error',
        message: "attribute 'test-attr' not found"
      });
    });

    it('should validate aiInput boolean type', async () => {
      mockRequest.body = { aiInput: 'invalid' };

      await updateAttributeAiInputHandler(mockRequest as Request, mockResponse as Response);

      expect(statusSpy).toHaveBeenCalledWith(400);
      expect(jsonSpy).toHaveBeenCalledWith({
        status: 'error',
        message: 'aiInput must be a boolean value'
      });
    });
  });

  describe('listAITemplatesHandler', () => {
    it('should list templates with pagination', async () => {
      mockRequest.query = { limit: '10', offset: '5' };

      const mockDocs = [
        { id: 'template1', data: () => ({ priority: 100, site: 'shiekh' }) },
        { id: 'template2', data: () => ({ priority: 50, site: 'ccs' }) }
      ];

      mockFirestore.get.mockResolvedValueOnce({
        docs: mockDocs,
        size: 2
      });

      await listAITemplatesHandler(mockRequest as Request, mockResponse as Response);

      expect(jsonSpy).toHaveBeenCalledWith({
        status: 'ok',
        templates: [
          { key: 'template1', priority: 100, site: 'shiekh' },
          { key: 'template2', priority: 50, site: 'ccs' }
        ],
        pagination: {
          limit: 10,
          offset: 5,
          total: 2,
          hasMore: false
        }
      });
    });
  });

  describe('createAITemplateHandler', () => {
    beforeEach(() => {
      mockRequest.body = {
        key: 'new-template',
        priority: 75,
        site: 'shiekh',
        includeObservations: true,
        prompt: 'Test prompt for {{product.mpn}}'
      };
    });

    it('should create template successfully', async () => {
      // Mock template doesn't exist
      mockFirestore.get.mockResolvedValueOnce({
        exists: false
      });

      mockFirestore.set.mockResolvedValueOnce(undefined);
      mockFirestore.add.mockResolvedValueOnce({ id: 'log-entry-456' });

      await createAITemplateHandler(mockRequest as Request, mockResponse as Response);

      expect(statusSpy).toHaveBeenCalledWith(201);
      expect(jsonSpy).toHaveBeenCalledWith({
        status: 'ok',
        template: expect.objectContaining({
          key: 'new-template',
          priority: 75,
          site: 'shiekh',
          includeObservations: true,
          prompt: 'Test prompt for {{product.mpn}}'
        })
      });
    });

    it('should prevent duplicate template keys', async () => {
      // Mock template already exists
      mockFirestore.get.mockResolvedValueOnce({
        exists: true
      });

      await createAITemplateHandler(mockRequest as Request, mockResponse as Response);

      expect(statusSpy).toHaveBeenCalledWith(409);
      expect(jsonSpy).toHaveBeenCalledWith({
        status: 'error',
        message: "template with key 'new-template' already exists"
      });
    });

    it('should validate required fields', async () => {
      mockRequest.body = { key: 'test', prompt: '' };

      await createAITemplateHandler(mockRequest as Request, mockResponse as Response);

      expect(statusSpy).toHaveBeenCalledWith(400);
      expect(jsonSpy).toHaveBeenCalledWith({
        status: 'error',
        message: 'prompt is required and must be a string'
      });
    });
  });

  describe('updateAITemplateHandler', () => {
    beforeEach(() => {
      mockRequest.params = { templateKey: 'existing-template' };
      mockRequest.body = {
        priority: 90,
        includeObservations: false
      };
    });

    it('should update template successfully', async () => {
      // Mock template exists
      mockFirestore.get.mockResolvedValueOnce({
        exists: true,
        data: () => ({ key: 'existing-template', priority: 50 })
      });

      mockFirestore.update.mockResolvedValueOnce(undefined);
      mockFirestore.add.mockResolvedValueOnce({ id: 'log-entry-789' });

      await updateAITemplateHandler(mockRequest as Request, mockResponse as Response);

      expect(mockFirestore.update).toHaveBeenCalledWith(
        expect.objectContaining({
          priority: 90,
          includeObservations: false,
          updatedAt: expect.any(Object),
          updatedBy: 'admin-user-id'
        })
      );

      expect(jsonSpy).toHaveBeenCalledWith({
        status: 'ok',
        message: "template 'existing-template' updated successfully"
      });
    });
  });

  describe('deleteAITemplateHandler', () => {
    beforeEach(() => {
      mockRequest.params = { templateKey: 'template-to-delete' };
    });

    it('should delete template successfully', async () => {
      // Mock template exists
      mockFirestore.get.mockResolvedValueOnce({
        exists: true
      });

      mockFirestore.delete.mockResolvedValueOnce(undefined);
      mockFirestore.add.mockResolvedValueOnce({ id: 'log-entry-delete' });

      await deleteAITemplateHandler(mockRequest as Request, mockResponse as Response);

      expect(mockFirestore.delete).toHaveBeenCalled();
      expect(jsonSpy).toHaveBeenCalledWith({
        status: 'ok',
        message: "template 'template-to-delete' deleted successfully"
      });
    });

    it('should prevent deletion of default template', async () => {
      mockRequest.params = { templateKey: 'default' };

      // Mock template exists
      mockFirestore.get.mockResolvedValueOnce({
        exists: true
      });

      await deleteAITemplateHandler(mockRequest as Request, mockResponse as Response);

      expect(statusSpy).toHaveBeenCalledWith(400);
      expect(jsonSpy).toHaveBeenCalledWith({
        status: 'error',
        message: 'cannot delete the default template'
      });
    });
  });
});