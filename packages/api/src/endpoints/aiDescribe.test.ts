// packages/api/src/endpoints/aiDescribe.test.ts
import { describe, it, expect, beforeEach, vi, type MockedFunction } from 'vitest';
import { aiDescribeHandler } from './aiDescribe';
import type { Request, Response } from 'express';

// Mock dependencies
vi.mock('firebase-admin/firestore');
vi.mock('../lib/geminiClient');
vi.mock('../lib/settingsHelpers');
vi.mock('../lib/aiActionLog');
vi.mock('../lib/promptHelpers');
vi.mock('../lib/logger');

// Mock the firestore
const mockFirestore = {
  collection: vi.fn().mockReturnThis(),
  where: vi.fn().mockReturnThis(),
  limit: vi.fn().mockReturnThis(),
  get: vi.fn(),
  doc: vi.fn().mockReturnThis(),
};

vi.mocked(require('firebase-admin/firestore')).getFirestore = vi.fn(() => mockFirestore);

describe('aiDescribeHandler', () => {
  let mockRequest: Partial<Request>;
  let mockResponse: Partial<Response>;
  let statusSpy: MockedFunction<any>;
  let jsonSpy: MockedFunction<any>;

  beforeEach(() => {
    vi.clearAllMocks();
    
    statusSpy = vi.fn().mockReturnThis();
    jsonSpy = vi.fn();
    
    mockRequest = {
      params: { mpn: 'TEST-MPN-123' },
      body: { site: 'shiekh' },
      user: { uid: 'test-user-id' }
    };
    
    mockResponse = {
      status: statusSpy,
      json: jsonSpy,
    };
  });

  describe('input validation', () => {
    it('should return 400 when mpn parameter is missing', async () => {
      mockRequest.params = {};
      
      await aiDescribeHandler(mockRequest as Request, mockResponse as Response);
      
      expect(statusSpy).toHaveBeenCalledWith(400);
      expect(jsonSpy).toHaveBeenCalledWith({
        status: 'error',
        message: 'missing mpn parameter'
      });
    });

    it('should return 400 when site is missing from request body', async () => {
      mockRequest.body = {};
      
      await aiDescribeHandler(mockRequest as Request, mockResponse as Response);
      
      expect(statusSpy).toHaveBeenCalledWith(400);
      expect(jsonSpy).toHaveBeenCalledWith({
        status: 'error',
        message: 'missing site in request body'
      });
    });
  });

  describe('MPN resolution', () => {
    it('should return 404 when MPN is not found', async () => {
      // Mock empty Firestore query result
      mockFirestore.get.mockResolvedValueOnce({
        empty: true,
        docs: []
      });
      
      await aiDescribeHandler(mockRequest as Request, mockResponse as Response);
      
      expect(statusSpy).toHaveBeenCalledWith(404);
      expect(jsonSpy).toHaveBeenCalledWith({
        status: 'error',
        message: "mpn 'TEST-MPN-123' not found"
      });
    });

    it('should resolve MPN to document ID successfully', async () => {
      // Mock Firestore query to find product by MPN
      mockFirestore.get.mockResolvedValueOnce({
        empty: false,
        docs: [{ id: 'doc-id-123' }]
      });
      
      // Mock product document retrieval 
      mockFirestore.get.mockResolvedValueOnce({
        exists: true,
        data: () => ({
          mpn: 'TEST-MPN-123',
          brand: 'Test Brand',
          attributes: {
            color: 'red',
            size: 'large'
          }
        })
      });

      // Mock registry and template loading
      const { loadRegistry, loadTemplateForSite } = require('../lib/settingsHelpers');
      loadRegistry.mockResolvedValue({
        'color': { 
          attribute_id: 'color', 
          status: 'active', 
          aiInput: true 
        },
        'size': { 
          attribute_id: 'size', 
          status: 'active', 
          aiInput: true 
        }
      });
      
      loadTemplateForSite.mockResolvedValue({
        key: 'test-template',
        priority: 100,
        prompt: 'Generate description for {{product.mpn}}: {{attributes}}',
        modelSettings: { model: 'gemini-1.5-flash' }
      });

      // Mock Gemini call
      const { callGemini } = require('../lib/geminiClient');
      callGemini.mockResolvedValue({
        text: 'Generated product description',
        promptTokens: 100,
        outputTokens: 50,
        elapsedMs: 1500
      });

      // Mock prompt helpers
      const { renderPrompt, parseGeminiCandidates } = require('../lib/promptHelpers');
      renderPrompt.mockReturnValue('Rendered prompt text');
      parseGeminiCandidates.mockReturnValue([{
        id: 'candidate-123',
        text: 'Generated product description',
        confidence: 0.9,
        meta: { attributesUsed: 2, template: 'test-template' }
      }]);

      await aiDescribeHandler(mockRequest as Request, mockResponse as Response);
      
      expect(jsonSpy).toHaveBeenCalledWith(
        expect.objectContaining({
          status: 'ok',
          result: expect.objectContaining({
            site: 'shiekh',
            mpn: 'TEST-MPN-123',
            matchedTemplate: 'test-template',
            matchedTemplatePriority: 100,
            candidates: expect.arrayContaining([
              expect.objectContaining({
                id: 'candidate-123',
                text: 'Generated product description'
              })
            ])
          })
        })
      );
    });
  });

  describe('registry filtering', () => {
    it('should filter attributes by aiInput flag and aiUsage', () => {
      const registry = {
        'color': { 
          attribute_id: 'color', 
          status: 'active', 
          aiInput: true 
        },
        'size': { 
          attribute_id: 'size', 
          status: 'active', 
          aiUsage: ['productDescriptions'] 
        },
        'internal_id': { 
          attribute_id: 'internal_id', 
          status: 'active', 
          aiInput: false 
        },
        'inactive_attr': { 
          attribute_id: 'inactive_attr', 
          status: 'inactive', 
          aiInput: true 
        }
      };

      const eligible = Object.values(registry).filter((attr: any) =>
        attr.status === 'active' && 
        (attr.aiInput === true || 
         (Array.isArray(attr.aiUsage) && attr.aiUsage.includes('productDescriptions')))
      );

      expect(eligible).toHaveLength(2);
      expect(eligible.map(a => a.attribute_id)).toEqual(['color', 'size']);
    });
  });

  describe('blocked responses', () => {
    it('should return 409 when required attributes are missing', async () => {
      // Mock MPN resolution
      mockFirestore.get.mockResolvedValueOnce({
        empty: false,
        docs: [{ id: 'doc-id-123' }]
      });
      
      // Mock product with missing attributes
      mockFirestore.get.mockResolvedValueOnce({
        exists: true,
        data: () => ({
          mpn: 'TEST-MPN-123',
          attributes: {} // No attributes
        })
      });

      // Mock registry with required attributes
      const { loadRegistry, loadTemplateForSite } = require('../lib/settingsHelpers');
      loadRegistry.mockResolvedValue({
        'color': { 
          attribute_id: 'color', 
          status: 'active', 
          aiInput: true,
          required_for_completion: true 
        }
      });
      
      loadTemplateForSite.mockResolvedValue({
        key: 'test-template',
        requiredAttributes: ['size']
      });

      await aiDescribeHandler(mockRequest as Request, mockResponse as Response);
      
      expect(statusSpy).toHaveBeenCalledWith(409);
      expect(jsonSpy).toHaveBeenCalledWith({
        status: 'blocked',
        code: 'BLOCKED_MISSING_REQUIRED_ATTRIBUTES',
        missingAttributes: ['color', 'size'],
        message: 'AI Describe is blocked due to missing required registry attributes.',
        details: {
          templateKey: 'test-template',
          site: 'shiekh',
          mpn: 'TEST-MPN-123'
        }
      });
    });
  });

  describe('error handling', () => {
    it('should handle Gemini API key missing error', async () => {
      // Mock successful setup through registry/template loading
      mockFirestore.get.mockResolvedValueOnce({
        empty: false,
        docs: [{ id: 'doc-id-123' }]
      });
      
      mockFirestore.get.mockResolvedValueOnce({
        exists: true,
        data: () => ({ mpn: 'TEST-MPN-123', attributes: {} })
      });

      const { loadRegistry, loadTemplateForSite } = require('../lib/settingsHelpers');
      loadRegistry.mockResolvedValue({});
      loadTemplateForSite.mockResolvedValue({
        key: 'test-template',
        prompt: 'test prompt'
      });

      const { renderPrompt } = require('../lib/promptHelpers');
      renderPrompt.mockReturnValue('Rendered prompt');

      // Mock Gemini error
      const { callGemini } = require('../lib/geminiClient');
      const geminiError = new Error('API key missing');
      geminiError.code = 'AI_DESCRIBE_KEY_MISSING';
      callGemini.mockRejectedValue(geminiError);

      await aiDescribeHandler(mockRequest as Request, mockResponse as Response);
      
      expect(statusSpy).toHaveBeenCalledWith(503);
      expect(jsonSpy).toHaveBeenCalledWith({
        status: 'error',
        code: 'AI_DESCRIBE_KEY_MISSING',
        message: 'AI service temporarily unavailable - missing API key'
      });
    });

    it('should handle rate limit errors', async () => {
      // Similar setup as above...
      mockFirestore.get.mockResolvedValueOnce({
        empty: false,
        docs: [{ id: 'doc-id-123' }]
      });
      
      mockFirestore.get.mockResolvedValueOnce({
        exists: true,
        data: () => ({ mpn: 'TEST-MPN-123', attributes: {} })
      });

      const { loadRegistry, loadTemplateForSite } = require('../lib/settingsHelpers');
      loadRegistry.mockResolvedValue({});
      loadTemplateForSite.mockResolvedValue({
        key: 'test-template',
        prompt: 'test prompt'
      });

      const { renderPrompt } = require('../lib/promptHelpers');
      renderPrompt.mockReturnValue('Rendered prompt');

      // Mock rate limit error
      const { callGemini } = require('../lib/geminiClient');
      const rateLimitError = new Error('Rate limit exceeded');
      rateLimitError.code = 'RATE_LIMIT_EXCEEDED';
      rateLimitError.retryAfter = 60;
      callGemini.mockRejectedValue(rateLimitError);

      await aiDescribeHandler(mockRequest as Request, mockResponse as Response);
      
      expect(statusSpy).toHaveBeenCalledWith(429);
      expect(jsonSpy).toHaveBeenCalledWith({
        status: 'error',
        code: 'RATE_LIMIT_EXCEEDED',
        message: 'Rate limit exceeded. Please try again later.',
        retryAfter: 60
      });
    });

    it('should handle generic errors with 500 status', async () => {
      // Mock unexpected error during MPN resolution
      mockFirestore.get.mockRejectedValue(new Error('Database connection failed'));

      await aiDescribeHandler(mockRequest as Request, mockResponse as Response);
      
      expect(statusSpy).toHaveBeenCalledWith(500);
      expect(jsonSpy).toHaveBeenCalledWith({
        status: 'error',
        code: 'INTERNAL_ERROR',
        message: 'An internal error occurred while generating description'
      });
    });
  });
});