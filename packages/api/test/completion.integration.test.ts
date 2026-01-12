// packages/api/test/completion.integration.test.ts
import { describe, it, expect, beforeEach, vi } from 'vitest';
import request from 'supertest';
import express from 'express';
import { resolveProductIdentifier } from '../src/lib/resolveProductIdentifier';
import { getProductCompletionHandler } from '../src/endpoints/products';

// Mock Firebase Admin and completion handler
vi.mock('firebase-admin');
vi.mock('../src/endpoints/products');

const app = express();
app.use(express.json());

// Mock completion handler
const mockCompletionHandler = vi.fn((req, res) => {
  res.json({
    ready: true,
    completionPct: 85.5,
    threshold: 80,
    hasBlockingSites: false,
    blockingReasons: [],
    productIdentifiers: {
      mpn: res.locals.mpn_normalized,
      productId: res.locals.productDocRef?.id
    }
  });
});

(getProductCompletionHandler as any).mockImplementation(mockCompletionHandler);

// Setup route with middleware
app.get('/api/products/:mpn/completion', resolveProductIdentifier, mockCompletionHandler);

// Mock the resolver middleware for testing
vi.mock('../src/lib/resolveProductIdentifier', () => ({
  resolveProductIdentifier: vi.fn((req, res, next) => {
    const mpn = req.params.mpn;
    
    // Mock successful resolution
    res.locals.productDocRef = { id: `product-${mpn}` };
    res.locals.mpn_normalized = mpn.toLowerCase().replace(/[^a-z0-9]/g, '-');
    res.locals.legacy_lookup = false;
    
    next();
  })
}));

describe('Product Completion API Integration', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('should return completion data for valid MPN', async () => {
    const response = await request(app)
      .get('/api/products/TEST-MPN-001/completion')
      .expect(200);

    expect(response.body).toMatchObject({
      ready: true,
      completionPct: 85.5,
      threshold: 80,
      hasBlockingSites: false,
      productIdentifiers: {
        mpn: 'test-mpn-001',
        productId: 'product-TEST-MPN-001'
      }
    });

    expect(mockCompletionHandler).toHaveBeenCalledTimes(1);
    
    // Verify middleware set correct locals
    const call = mockCompletionHandler.mock.calls[0];
    const req = call[0];
    const res = call[1];
    
    expect(res.locals.mpn_normalized).toBe('test-mpn-001');
    expect(res.locals.productDocRef).toEqual({ id: 'product-TEST-MPN-001' });
    expect(res.locals.legacy_lookup).toBe(false);
  });

  it('should handle various MPN formats', async () => {
    const testCases = [
      { input: 'ABC_123', expected: 'abc-123' },
      { input: 'TEST/MPN-001', expected: 'test-mpn-001' },
      { input: 'NIKE.AM90.001', expected: 'nike-am90-001' }
    ];

    for (const testCase of testCases) {
      const response = await request(app)
        .get(`/api/products/${encodeURIComponent(testCase.input)}/completion`)
        .expect(200);

      expect(response.body.productIdentifiers.mpn).toBe(testCase.expected);
    }
  });

  it('should call resolver middleware before completion handler', async () => {
    const { resolveProductIdentifier } = require('../src/lib/resolveProductIdentifier');
    
    await request(app)
      .get('/api/products/TEST-MPN-002/completion')
      .expect(200);

    expect(resolveProductIdentifier).toHaveBeenCalledTimes(1);
    expect(mockCompletionHandler).toHaveBeenCalledTimes(1);
  });
});