/**
 * Unit Tests for useProducts Hook
 * 
 * Tests pagination, search, loading states, and error handling.
 * 
 * Homer Products List v1.0
 */

import { renderHook, waitFor, act } from '@testing-library/react';
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { useProducts } from '../useProducts';
import type { ProductsListResponse } from '../useProducts';

// Mock getAuthHeaders
vi.mock('../../lib/authHeaders', () => ({
  getAuthHeaders: vi.fn(async () => ({ Authorization: 'Bearer mock-token' })),
}));

// Mock fetch
const mockFetch = vi.fn();
global.fetch = mockFetch;

describe('useProducts', () => {
  beforeEach(() => {
    mockFetch.mockClear();
  });

  afterEach(() => {
    vi.clearAllMocks();
  });

  it('should fetch products on mount with autoLoad=true', async () => {
    const mockResponse: ProductsListResponse = {
      items: [
        {
          id: '1',
          sku: 'TEST-001',
          name: 'Test Product 1',
          status: 'active',
        },
        {
          id: '2',
          sku: 'TEST-002',
          name: 'Test Product 2',
          status: 'draft',
        },
      ],
      hasMore: false,
    };

    mockFetch.mockResolvedValueOnce({
      ok: true,
      json: async () => mockResponse,
    });

    const { result } = renderHook(() => useProducts({ autoLoad: true }));

    // Initially loading
    expect(result.current.loading).toBe(true);
    expect(result.current.items).toEqual([]);

    // Wait for fetch to complete
    await waitFor(() => {
      expect(result.current.loading).toBe(false);
    });

    // Check results
    expect(result.current.items).toHaveLength(2);
    expect(result.current.items[0].sku).toBe('TEST-001');
    expect(result.current.hasMore).toBe(false);
    expect(result.current.error).toBeNull();

    // Verify fetch was called with correct params
    expect(mockFetch).toHaveBeenCalledTimes(1);
    expect(mockFetch).toHaveBeenCalledWith(
      expect.stringContaining('/api/products?limit=24'),
      expect.objectContaining({
        headers: { Authorization: 'Bearer mock-token' },
      })
    );
  });

  it('should not fetch on mount with autoLoad=false', async () => {
    const { result } = renderHook(() => useProducts({ autoLoad: false }));

    expect(result.current.loading).toBe(false);
    expect(result.current.items).toEqual([]);
    expect(mockFetch).not.toHaveBeenCalled();
  });

  it('should handle pagination with loadMore()', async () => {
    const mockPage1: ProductsListResponse = {
      items: [{ id: '1', sku: 'TEST-001', name: 'Product 1' }],
      hasMore: true,
      pageToken: 'token-1',
    };

    const mockPage2: ProductsListResponse = {
      items: [{ id: '2', sku: 'TEST-002', name: 'Product 2' }],
      hasMore: false,
    };

    mockFetch
      .mockResolvedValueOnce({ ok: true, json: async () => mockPage1 })
      .mockResolvedValueOnce({ ok: true, json: async () => mockPage2 });

    const { result } = renderHook(() => useProducts({ autoLoad: true }));

    // Wait for initial load
    await waitFor(() => expect(result.current.loading).toBe(false));

    expect(result.current.items).toHaveLength(1);
    expect(result.current.hasMore).toBe(true);

    // Load more
    await act(async () => {
      await result.current.loadMore();
    });

    // Wait for second page
    await waitFor(() => expect(result.current.items).toHaveLength(2));

    expect(result.current.items[1].sku).toBe('TEST-002');
    expect(result.current.hasMore).toBe(false);

    // Verify second fetch included pageToken
    expect(mockFetch).toHaveBeenCalledWith(
      expect.stringContaining('pageToken=token-1'),
      expect.any(Object)
    );
  });

  it('should handle search query', async () => {
    const mockResponse: ProductsListResponse = {
      items: [{ id: '1', sku: 'SEARCH-001', name: 'Searched Product' }],
      hasMore: false,
    };

    mockFetch.mockResolvedValueOnce({ ok: true, json: async () => mockResponse });

    const { result } = renderHook(() =>
      useProducts({ initialSearch: 'SEARCH', autoLoad: true })
    );

    await waitFor(() => expect(result.current.loading).toBe(false));

    expect(result.current.search).toBe('SEARCH');
    expect(mockFetch).toHaveBeenCalledWith(
      expect.stringContaining('q=SEARCH'),
      expect.any(Object)
    );
  });

  it('should reset pagination when search changes', async () => {
    const mockResponse1: ProductsListResponse = {
      items: [{ id: '1', sku: 'TEST-001' }],
      hasMore: false,
    };

    const mockResponse2: ProductsListResponse = {
      items: [{ id: '2', sku: 'SEARCH-001' }],
      hasMore: false,
    };

    mockFetch
      .mockResolvedValueOnce({ ok: true, json: async () => mockResponse1 })
      .mockResolvedValueOnce({ ok: true, json: async () => mockResponse2 });

    const { result } = renderHook(() => useProducts({ autoLoad: true }));

    await waitFor(() => expect(result.current.loading).toBe(false));

    // Change search
    act(() => {
      result.current.setSearch('new query');
    });

    await waitFor(() => expect(result.current.search).toBe('new query'));

    // Wait for new fetch
    await waitFor(() => expect(mockFetch).toHaveBeenCalledTimes(2));

    // Should have reset items
    expect(result.current.items).toHaveLength(1);
    expect(result.current.items[0].id).toBe('2');
  });

  it('should handle 401 unauthorized error', async () => {
    mockFetch.mockResolvedValueOnce({
      ok: false,
      status: 401,
      statusText: 'Unauthorized',
    });

    const { result } = renderHook(() => useProducts({ autoLoad: true }));

    await waitFor(() => expect(result.current.loading).toBe(false));

    expect(result.current.error).toBe('Unauthorized. Please sign in again.');
    expect(result.current.items).toEqual([]);
  });

  it('should handle 403 forbidden error', async () => {
    mockFetch.mockResolvedValueOnce({
      ok: false,
      status: 403,
      statusText: 'Forbidden',
    });

    const { result } = renderHook(() => useProducts({ autoLoad: true }));

    await waitFor(() => expect(result.current.loading).toBe(false));

    expect(result.current.error).toBe('You do not have permission to view products.');
  });

  it('should handle network errors', async () => {
    mockFetch.mockRejectedValueOnce(new Error('Network error'));

    const { result } = renderHook(() => useProducts({ autoLoad: true }));

    await waitFor(() => expect(result.current.loading).toBe(false));

    expect(result.current.error).toBe('Network error');
    expect(result.current.items).toEqual([]);
  });

  it('should handle refresh()', async () => {
    const mockResponse1: ProductsListResponse = {
      items: [{ id: '1', sku: 'OLD-001' }],
      hasMore: false,
    };

    const mockResponse2: ProductsListResponse = {
      items: [{ id: '2', sku: 'NEW-001' }],
      hasMore: false,
    };

    mockFetch
      .mockResolvedValueOnce({ ok: true, json: async () => mockResponse1 })
      .mockResolvedValueOnce({ ok: true, json: async () => mockResponse2 });

    const { result } = renderHook(() => useProducts({ autoLoad: true }));

    await waitFor(() => expect(result.current.loading).toBe(false));

    expect(result.current.items[0].sku).toBe('OLD-001');

    // Refresh
    await act(async () => {
      await result.current.refresh();
    });

    await waitFor(() => expect(result.current.items[0].sku).toBe('NEW-001'));

    expect(result.current.items).toHaveLength(1);
  });

  it('should use custom limit', async () => {
    const mockResponse: ProductsListResponse = {
      items: [],
      hasMore: false,
    };

    mockFetch.mockResolvedValueOnce({ ok: true, json: async () => mockResponse });

    renderHook(() => useProducts({ limit: 50, autoLoad: true }));

    await waitFor(() => expect(mockFetch).toHaveBeenCalled());

    expect(mockFetch).toHaveBeenCalledWith(
      expect.stringContaining('limit=50'),
      expect.any(Object)
    );
  });

  it('should not call loadMore when already loading', async () => {
    const mockResponse: ProductsListResponse = {
      items: [{ id: '1' }],
      hasMore: true,
      pageToken: 'token-1',
    };

    mockFetch.mockImplementation(
      () =>
        new Promise((resolve) =>
          setTimeout(() => resolve({ ok: true, json: async () => mockResponse }), 100)
        )
    );

    const { result } = renderHook(() => useProducts({ autoLoad: true }));

    // Try to load more while still loading initial
    act(() => {
      result.current.loadMore();
    });

    // Should only call fetch once (for initial load)
    await waitFor(() => expect(mockFetch).toHaveBeenCalledTimes(1));
  });

  it('should not call loadMore when hasMore is false', async () => {
    const mockResponse: ProductsListResponse = {
      items: [{ id: '1' }],
      hasMore: false,
    };

    mockFetch.mockResolvedValueOnce({ ok: true, json: async () => mockResponse });

    const { result } = renderHook(() => useProducts({ autoLoad: true }));

    await waitFor(() => expect(result.current.loading).toBe(false));

    // Try to load more
    await act(async () => {
      await result.current.loadMore();
    });

    // Should only have called fetch once (initial load)
    expect(mockFetch).toHaveBeenCalledTimes(1);
  });
});
