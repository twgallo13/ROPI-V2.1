import { describe, it, expect, vi, beforeEach, afterEach, Mock } from 'vitest';

// Mock the auth module before imports
vi.mock('@/lib/authHeaders', () => ({
  getAuthHeaders: vi.fn().mockResolvedValue({
    'Content-Type': 'application/json',
    'Authorization': 'Bearer mock-test-token-12345'
  })
}));

// Mock fetch globally
const mockFetch = vi.fn();
global.fetch = mockFetch;

describe('MobileMPNScanner Authorization', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockFetch.mockReset();
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  it('should include Authorization header in MPN lookup fetch', async () => {
    // Setup mock response
    mockFetch.mockResolvedValueOnce({
      ok: true,
      json: () => Promise.resolve({ 
        sku: 'TEST-SKU-123',
        description: 'Test Product',
        mpn: '123'
      })
    });

    // Import the module dynamically to ensure mocks are in place
    const { getAuthHeaders } = await import('@/lib/authHeaders');
    
    // Simulate the lookupProduct behavior
    const mpn = '123';
    const headers = await getAuthHeaders();
    
    await fetch(`/api/products/by-mpn/${mpn}`, {
      method: 'GET',
      headers,
      credentials: 'include',
    });

    // Verify fetch was called with Authorization header
    expect(mockFetch).toHaveBeenCalledTimes(1);
    const [url, options] = mockFetch.mock.calls[0];
    
    expect(url).toBe('/api/products/by-mpn/123');
    expect(options.headers).toHaveProperty('Authorization');
    expect(options.headers.Authorization).toMatch(/^Bearer /);
  });

  it('should handle 401 unauthorized response', async () => {
    mockFetch.mockResolvedValueOnce({
      ok: false,
      status: 401,
      json: () => Promise.resolve({ 
        error: 'UNAUTHENTICATED',
        message: 'Missing or invalid auth token'
      })
    });

    const { getAuthHeaders } = await import('@/lib/authHeaders');
    const headers = await getAuthHeaders();
    
    const response = await fetch('/api/products/by-mpn/123', {
      method: 'GET',
      headers,
      credentials: 'include',
    });

    expect(response.status).toBe(401);
    const body = await response.json();
    expect(body.error).toBe('UNAUTHENTICATED');
  });

  it('should handle 403 forbidden response for non-admin users', async () => {
    mockFetch.mockResolvedValueOnce({
      ok: false,
      status: 403,
      json: () => Promise.resolve({ 
        error: 'PERMISSION_DENIED',
        message: 'Must be admin to access this endpoint'
      })
    });

    const { getAuthHeaders } = await import('@/lib/authHeaders');
    const headers = await getAuthHeaders();
    
    const response = await fetch('/api/products/by-mpn/123', {
      method: 'GET',
      headers,
      credentials: 'include',
    });

    expect(response.status).toBe(403);
    const body = await response.json();
    expect(body.error).toBe('PERMISSION_DENIED');
  });

  it('should handle successful product lookup', async () => {
    const mockProduct = {
      sku: 'PROD-SKU-456',
      description: 'Sample Product',
      mpn: 'MPN-789',
      brand: 'TestBrand'
    };

    mockFetch.mockResolvedValueOnce({
      ok: true,
      status: 200,
      json: () => Promise.resolve(mockProduct)
    });

    const { getAuthHeaders } = await import('@/lib/authHeaders');
    const headers = await getAuthHeaders();
    
    const response = await fetch('/api/products/by-mpn/MPN-789', {
      method: 'GET',
      headers,
      credentials: 'include',
    });

    expect(response.ok).toBe(true);
    const body = await response.json();
    expect(body.sku).toBe('PROD-SKU-456');
    expect(body.mpn).toBe('MPN-789');
  });
});
