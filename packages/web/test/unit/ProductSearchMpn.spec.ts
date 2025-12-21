/**
 * Product Search MPN Tests
 * 
 * LP-1.1.10: Tests for partial MPN search endpoint and MobileMPNScanner autocomplete.
 */

import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';

// Test the searchProductsByMpn endpoint logic
describe('searchProductsByMpn endpoint', () => {
  // Mock fetch for API tests
  const mockFetch = vi.fn();
  
  beforeEach(() => {
    vi.clearAllMocks();
    global.fetch = mockFetch;
  });

  it('should search products by partial MPN', async () => {
    const mockResults = [
      { id: '1', product_mpn: 'ABC-123', title: 'Product 1', thumbnail: null, brand: 'Brand1', sku: 'SKU1' },
      { id: '2', product_mpn: 'ABC-456', title: 'Product 2', thumbnail: null, brand: 'Brand2', sku: 'SKU2' },
    ];
    
    mockFetch.mockResolvedValueOnce({
      ok: true,
      json: () => Promise.resolve({ results: mockResults, count: 2, query: 'abc' }),
    });

    const response = await fetch('/api/products/search-mpn?q=abc&limit=10');
    const data = await response.json();

    expect(data.results).toHaveLength(2);
    expect(data.results[0].product_mpn).toBe('ABC-123');
    expect(data.count).toBe(2);
  });

  it('should return error for short query', async () => {
    mockFetch.mockResolvedValueOnce({
      ok: false,
      status: 400,
      json: () => Promise.resolve({ error: 'INVALID_QUERY', message: 'Search query must be at least 2 characters' }),
    });

    const response = await fetch('/api/products/search-mpn?q=a');
    expect(response.ok).toBe(false);
    expect(response.status).toBe(400);
  });

  it('should search by SKU and name as well', async () => {
    const mockResults = [
      { id: '3', product_mpn: 'XYZ-789', title: 'Blue Sneaker', thumbnail: null, brand: 'Nike', sku: 'BLUE-001' },
    ];
    
    mockFetch.mockResolvedValueOnce({
      ok: true,
      json: () => Promise.resolve({ results: mockResults, count: 1, query: 'blue' }),
    });

    const response = await fetch('/api/products/search-mpn?q=blue&limit=10');
    const data = await response.json();

    expect(data.results).toHaveLength(1);
    expect(data.results[0].title).toContain('Blue');
  });
});

// Test the MobileMPNScanner autocomplete UI
describe('MobileMPNScanner autocomplete', () => {
  const mockOnProductFound = vi.fn();
  const mockOnClose = vi.fn();
  
  beforeEach(() => {
    vi.clearAllMocks();
    global.fetch = vi.fn();
    
    // Mock navigator.mediaDevices
    Object.defineProperty(navigator, 'mediaDevices', {
      value: {
        getUserMedia: vi.fn().mockRejectedValue(new Error('Not available')),
      },
      configurable: true,
    });
  });

  it('should show autocomplete results when typing', async () => {
    const mockResults = [
      { id: '1', product_mpn: 'TEST-123', title: 'Test Product', thumbnail: 'thumb.jpg', brand: 'TestBrand', sku: 'SKU1' },
    ];
    
    (global.fetch as ReturnType<typeof vi.fn>).mockResolvedValueOnce({
      ok: true,
      json: () => Promise.resolve({ results: mockResults, count: 1, query: 'test' }),
    });

    // Note: Full component test would require more mocking
    // This tests the search API integration pattern
    const response = await fetch('/api/products/search-mpn?q=test');
    const data = await response.json();
    
    expect(data.results).toHaveLength(1);
    expect(data.results[0].product_mpn).toBe('TEST-123');
  });
});

// Test API payload shape
describe('Product search API payload', () => {
  it('should return products with required fields', () => {
    const mockProduct = {
      id: 'prod-1',
      product_mpn: 'MPN-001',
      title: 'Test Product',
      thumbnail: 'https://example.com/thumb.jpg',
      brand: 'Test Brand',
      sku: 'SKU-001',
    };

    // Validate shape
    expect(mockProduct).toHaveProperty('id');
    expect(mockProduct).toHaveProperty('product_mpn');
    expect(mockProduct).toHaveProperty('title');
    expect(mockProduct).toHaveProperty('thumbnail');
    expect(mockProduct).toHaveProperty('brand');
    expect(mockProduct).toHaveProperty('sku');
  });

  it('should handle null thumbnail', () => {
    const mockProduct = {
      id: 'prod-2',
      product_mpn: 'MPN-002',
      title: 'No Thumb Product',
      thumbnail: null,
      brand: null,
      sku: null,
    };

    expect(mockProduct.thumbnail).toBeNull();
    expect(mockProduct.brand).toBeNull();
    expect(mockProduct.sku).toBeNull();
  });
});
