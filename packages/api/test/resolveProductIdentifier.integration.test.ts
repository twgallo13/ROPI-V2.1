// packages/api/test/resolveProductIdentifier.integration.test.ts
import { describe, it, expect, beforeEach, vi } from 'vitest';
import { Request, Response } from 'express';
import admin from 'firebase-admin';
import { resolveProductIdentifier } from '../src/lib/resolveProductIdentifier';
import { normalizeMPN } from '@ropi-aoss/shared/productKey';

// Mock Firebase Admin
vi.mock('firebase-admin', () => ({
  firestore: vi.fn(() => ({
    collection: vi.fn(() => ({
      doc: vi.fn(() => ({
        get: vi.fn(),
        set: vi.fn()
      })),
      where: vi.fn(() => ({
        limit: vi.fn(() => ({
          get: vi.fn()
        }))
      }))
    }))
  })),
  FieldValue: {
    serverTimestamp: vi.fn(() => 'TIMESTAMP')
  }
}));

describe('resolveProductIdentifier middleware', () => {
  let mockRequest: Partial<Request>;
  let mockResponse: Partial<Response>;
  let mockNext: any;
  let mockDb: any;

  beforeEach(() => {
    mockRequest = {
      params: {}
    };
    
    mockResponse = {
      status: vi.fn().mockReturnThis(),
      json: vi.fn().mockReturnThis(),
      locals: {}
    };
    
    mockNext = vi.fn();
    
    mockDb = {
      collection: vi.fn(() => ({
        doc: vi.fn(() => ({
          get: vi.fn(),
          set: vi.fn()
        })),
        where: vi.fn(() => ({
          limit: vi.fn(() => ({
            get: vi.fn()
          }))
        }))
      }))
    };
    
    (admin.firestore as any).mockReturnValue(mockDb);
  });

  it('should resolve product by normalized MPN', async () => {
    const testMpn = 'TEST-MPN-001';
    const normalizedMpn = normalizeMPN(testMpn);
    
    mockRequest.params = { mpn: testMpn };
    
    // Mock mapping collection lookup (not found)
    const mockMappingDoc = {
      exists: false,
        get: vi.fn()
      };
      
      // Mock products collection query (found)
      const mockProductRef = { id: 'doc-id' };
      const mockProductQuery = {
        get: vi.fn().mockResolvedValue({
          empty: false,
          docs: [{ ref: mockProductRef }]
        })
      };
      
      mockDb.collection.mockImplementation((collection: string) => {
        if (collection === 'product_mappings') {
          return {
            doc: vi.fn(() => ({
              get: vi.fn().mockResolvedValue(mockMappingDoc)
            }))
          };
        } else if (collection === 'products') {
          return {
            where: vi.fn(() => ({
              limit: vi.fn(() => mockProductQuery)
            }))
          };
        }
      });
    
    await resolveProductIdentifier(mockRequest as Request, mockResponse as Response, mockNext);
    
    expect(mockResponse.locals!.productDocRef).toBe(mockProductRef);
    expect(mockResponse.locals!.mpn_normalized).toBe(normalizedMpn);
    expect(mockResponse.locals!.legacy_lookup).toBe(false);
    expect(mockNext).toHaveBeenCalled();
  });

  it('should handle legacy productId lookup', async () => {
    const testProductId = 'legacy-product-id';
    
    mockRequest.params = { mpn: testProductId };
    
    // Mock mapping collection lookup (not found)
    const mockMappingDoc = {
      exists: false
    };
    
    // Mock products collection query (not found)
    const mockProductQuery = {
      get: vi.fn().mockResolvedValue({ empty: true })
    };
    
    // Mock legacy document lookup (found)
    const mockLegacyDoc = {
      exists: true,
      get: vi.fn((field: string) => {
        if (field === 'mpn') return 'LEGACY-MPN';
        return undefined;
      }),
      ref: { id: 'legacy-doc-id' }
    };
    
    mockDb.collection.mockImplementation((collection: string) => {
      if (collection === 'product_mappings') {
        return {
          doc: vi.fn(() => ({
            get: vi.fn().mockResolvedValue(mockMappingDoc),
            set: vi.fn().mockResolvedValue({})
          }))
        };
      } else if (collection === 'products') {
        return {
          where: vi.fn(() => ({
            limit: vi.fn(() => mockProductQuery)
          })),
          doc: vi.fn(() => ({
            get: vi.fn().mockResolvedValue(mockLegacyDoc)
          }))
        };
      }
    });
    
    await resolveProductIdentifier(mockRequest as Request, mockResponse as Response, mockNext);
    
    expect(mockResponse.locals!.productDocRef).toBe(mockLegacyDoc.ref);
    expect(mockResponse.locals!.legacy_lookup).toBe(true);
    expect(mockNext).toHaveBeenCalled();
  });

  it('should return 404 when product not found', async () => {
    const testMpn = 'NOT-FOUND';
    
    mockRequest.params = { mpn: testMpn };
    
    // Mock all lookups as not found
    mockDb.collection.mockImplementation(() => ({
      doc: vi.fn(() => ({
        get: vi.fn().mockResolvedValue({ exists: false })
      })),
      where: vi.fn(() => ({
        limit: vi.fn(() => ({
          get: vi.fn().mockResolvedValue({ empty: true })
        }))
      }))
    }));
    
    await resolveProductIdentifier(mockRequest as Request, mockResponse as Response, mockNext);
    
    expect(mockResponse.status).toHaveBeenCalledWith(404);
    expect(mockResponse.json).toHaveBeenCalledWith({
      error: 'Product not found for identifier: NOT-FOUND',
      identifier: 'NOT-FOUND',
      mpn_normalized: normalizeMPN(testMpn)
    });
    expect(mockNext).not.toHaveBeenCalled();
  });

  it('should return 400 when identifier is missing', async () => {
    mockRequest.params = {};
    
    await resolveProductIdentifier(mockRequest as Request, mockResponse as Response, mockNext);
    
    expect(mockResponse.status).toHaveBeenCalledWith(400);
    expect(mockResponse.json).toHaveBeenCalledWith({
      error: 'Missing product identifier'
    });
    expect(mockNext).not.toHaveBeenCalled();
  });
});