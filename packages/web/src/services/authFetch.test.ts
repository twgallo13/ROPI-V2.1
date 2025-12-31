/**
 * authFetch Unit Tests
 * 
 * LP-obs-studio-cleanup-1.7.0: Tests for authFetch helper with retry/refresh logic.
 */

import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';

// Mock firebase/auth
const mockGetIdToken = vi.fn();
const mockOnAuthStateChanged = vi.fn();
const mockCurrentUser = {
  getIdToken: mockGetIdToken,
};

vi.mock('firebase/auth', () => ({
  getAuth: vi.fn(() => ({
    currentUser: mockCurrentUser,
    onAuthStateChanged: mockOnAuthStateChanged,
  })),
}));

// Import after mocking
import { authFetch, authFetchJson, setTelemetryEmitter } from './authFetch';

describe('authFetch', () => {
  const mockTelemetry = vi.fn();
  
  beforeEach(() => {
    vi.clearAllMocks();
    mockGetIdToken.mockResolvedValue('test-token-123');
    setTelemetryEmitter(mockTelemetry);
    
    // Mock fetch
    global.fetch = vi.fn();
    
    // Mock navigator.onLine
    Object.defineProperty(navigator, 'onLine', {
      value: true,
      writable: true,
    });
  });

  afterEach(() => {
    setTelemetryEmitter(null);
  });

  describe('successful requests', () => {
    it('should attach Authorization header with Bearer token', async () => {
      (global.fetch as ReturnType<typeof vi.fn>).mockResolvedValueOnce({
        ok: true,
        status: 200,
        json: () => Promise.resolve({ success: true }),
      });

      await authFetch('https://api.example.com/test');

      expect(global.fetch).toHaveBeenCalledWith(
        'https://api.example.com/test',
        expect.objectContaining({
          headers: expect.any(Headers),
          credentials: 'include',
        })
      );

      const callArgs = (global.fetch as ReturnType<typeof vi.fn>).mock.calls[0];
      const headers = callArgs[1].headers as Headers;
      expect(headers.get('Authorization')).toBe('Bearer test-token-123');
    });

    it('should return response on success', async () => {
      const mockResponse = {
        ok: true,
        status: 200,
        json: () => Promise.resolve({ data: 'test' }),
      };
      (global.fetch as ReturnType<typeof vi.fn>).mockResolvedValueOnce(mockResponse);

      const response = await authFetch('https://api.example.com/test');

      expect(response.ok).toBe(true);
      expect(response.status).toBe(200);
    });

    it('should skip auth header when skipAuth is true', async () => {
      (global.fetch as ReturnType<typeof vi.fn>).mockResolvedValueOnce({
        ok: true,
        status: 200,
      });

      await authFetch('https://api.example.com/public', { skipAuth: true });

      const callArgs = (global.fetch as ReturnType<typeof vi.fn>).mock.calls[0];
      const headers = callArgs[1].headers as Headers;
      expect(headers.get('Authorization')).toBeNull();
    });
  });

  describe('401 handling with token refresh', () => {
    it('should refresh token and retry on 401', async () => {
      // First call returns 401
      (global.fetch as ReturnType<typeof vi.fn>)
        .mockResolvedValueOnce({
          ok: false,
          status: 401,
          json: () => Promise.resolve({ error: 'Unauthorized' }),
        })
        // Second call (after refresh) succeeds
        .mockResolvedValueOnce({
          ok: true,
          status: 200,
          json: () => Promise.resolve({ success: true }),
        });

      // First token, then refreshed token
      mockGetIdToken
        .mockResolvedValueOnce('initial-token')
        .mockResolvedValueOnce('refreshed-token');

      const response = await authFetch('https://api.example.com/test');

      expect(response.ok).toBe(true);
      expect(mockGetIdToken).toHaveBeenCalledTimes(2);
      // Second call should be with forceRefresh=true
      expect(mockGetIdToken).toHaveBeenLastCalledWith(true);
      expect(global.fetch).toHaveBeenCalledTimes(2);
    });

    it('should emit telemetry on 401 refresh', async () => {
      (global.fetch as ReturnType<typeof vi.fn>)
        .mockResolvedValueOnce({
          ok: false,
          status: 401,
        })
        .mockResolvedValueOnce({
          ok: true,
          status: 200,
        });

      mockGetIdToken
        .mockResolvedValueOnce('initial-token')
        .mockResolvedValueOnce('refreshed-token');

      await authFetch('https://api.example.com/test');

      expect(mockTelemetry).toHaveBeenCalledWith(
        expect.objectContaining({
          name: 'auth.fetch.401_refresh',
        })
      );
    });

    it('should not retry more than once on persistent 401', async () => {
      (global.fetch as ReturnType<typeof vi.fn>).mockResolvedValue({
        ok: false,
        status: 401,
      });

      mockGetIdToken
        .mockResolvedValueOnce('initial-token')
        .mockResolvedValueOnce('refreshed-token');

      const response = await authFetch('https://api.example.com/test');

      expect(response.status).toBe(401);
      // Initial request + one retry after refresh
      expect(global.fetch).toHaveBeenCalledTimes(2);
    });
  });

  describe('transient error retry', () => {
    it('should retry on 500 with exponential backoff', async () => {
      vi.useFakeTimers();

      (global.fetch as ReturnType<typeof vi.fn>)
        .mockResolvedValueOnce({ ok: false, status: 500 })
        .mockResolvedValueOnce({ ok: false, status: 500 })
        .mockResolvedValueOnce({ ok: true, status: 200 });

      const fetchPromise = authFetch('https://api.example.com/test', {
        retryConfig: { maxRetries: 3, initialDelayMs: 100, maxDelayMs: 1000, backoffMultiplier: 2 },
      });

      // Advance through backoff delays
      await vi.advanceTimersByTimeAsync(100); // First retry delay
      await vi.advanceTimersByTimeAsync(200); // Second retry delay

      const response = await fetchPromise;

      expect(response.ok).toBe(true);
      expect(global.fetch).toHaveBeenCalledTimes(3);

      vi.useRealTimers();
    });

    it('should retry on 502, 503, 504 errors', async () => {
      vi.useFakeTimers();

      for (const status of [502, 503, 504]) {
        vi.clearAllMocks();
        
        (global.fetch as ReturnType<typeof vi.fn>)
          .mockResolvedValueOnce({ ok: false, status })
          .mockResolvedValueOnce({ ok: true, status: 200 });

        const fetchPromise = authFetch('https://api.example.com/test', {
          retryConfig: { maxRetries: 3, initialDelayMs: 10, maxDelayMs: 100, backoffMultiplier: 2 },
        });

        await vi.advanceTimersByTimeAsync(20);

        const response = await fetchPromise;
        expect(response.ok).toBe(true);
        expect(global.fetch).toHaveBeenCalledTimes(2);
      }

      vi.useRealTimers();
    });

    it('should emit telemetry on transient retry', async () => {
      vi.useFakeTimers();

      (global.fetch as ReturnType<typeof vi.fn>)
        .mockResolvedValueOnce({ ok: false, status: 500 })
        .mockResolvedValueOnce({ ok: true, status: 200 });

      const fetchPromise = authFetch('https://api.example.com/test', {
        retryConfig: { maxRetries: 3, initialDelayMs: 10, maxDelayMs: 100, backoffMultiplier: 2 },
      });

      await vi.advanceTimersByTimeAsync(20);
      await fetchPromise;

      expect(mockTelemetry).toHaveBeenCalledWith(
        expect.objectContaining({
          name: 'auth.fetch.transient_retry',
          data: expect.objectContaining({
            status: 500,
            attempt: 1,
          }),
        })
      );

      vi.useRealTimers();
    });

    it('should skip retry when skipRetry is true', async () => {
      (global.fetch as ReturnType<typeof vi.fn>).mockResolvedValue({
        ok: false,
        status: 500,
      });

      const response = await authFetch('https://api.example.com/test', {
        skipRetry: true,
      });

      expect(response.status).toBe(500);
      expect(global.fetch).toHaveBeenCalledTimes(1);
    });
  });

  describe('error handling', () => {
    it('should throw when user is not authenticated', async () => {
      // Mock no current user
      vi.mocked(await import('firebase/auth')).getAuth.mockReturnValueOnce({
        currentUser: null,
        onAuthStateChanged: vi.fn((callback) => {
          setTimeout(() => callback(null), 100);
          return vi.fn();
        }),
      } as unknown as ReturnType<typeof import('firebase/auth').getAuth>);

      // Re-import to use new mock
      const { authFetch: authFetchNew } = await import('./authFetch');

      await expect(authFetchNew('https://api.example.com/test')).rejects.toThrow(
        'Not authenticated'
      );
    });

    it('should handle network errors with retry', async () => {
      vi.useFakeTimers();

      (global.fetch as ReturnType<typeof vi.fn>)
        .mockRejectedValueOnce(new Error('Network failed'))
        .mockResolvedValueOnce({ ok: true, status: 200 });

      const fetchPromise = authFetch('https://api.example.com/test', {
        retryConfig: { maxRetries: 3, initialDelayMs: 10, maxDelayMs: 100, backoffMultiplier: 2 },
      });

      await vi.advanceTimersByTimeAsync(20);

      const response = await fetchPromise;
      expect(response.ok).toBe(true);
      expect(global.fetch).toHaveBeenCalledTimes(2);

      vi.useRealTimers();
    });
  });
});

describe('authFetchJson', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockGetIdToken.mockResolvedValue('test-token-123');
    global.fetch = vi.fn();
  });

  it('should parse JSON response', async () => {
    (global.fetch as ReturnType<typeof vi.fn>).mockResolvedValueOnce({
      ok: true,
      status: 200,
      json: () => Promise.resolve({ data: 'test-data' }),
    });

    const result = await authFetchJson<{ data: string }>('https://api.example.com/test');

    expect(result).toEqual({ data: 'test-data' });
  });

  it('should throw with error message from response', async () => {
    (global.fetch as ReturnType<typeof vi.fn>).mockResolvedValueOnce({
      ok: false,
      status: 400,
      json: () => Promise.resolve({ error: 'Bad request message' }),
    });

    await expect(authFetchJson('https://api.example.com/test')).rejects.toThrow(
      'Bad request message'
    );
  });

  it('should set Content-Type and Accept headers for JSON', async () => {
    (global.fetch as ReturnType<typeof vi.fn>).mockResolvedValueOnce({
      ok: true,
      status: 200,
      json: () => Promise.resolve({}),
    });

    await authFetchJson('https://api.example.com/test');

    const callArgs = (global.fetch as ReturnType<typeof vi.fn>).mock.calls[0];
    const headers = callArgs[1].headers as Headers;
    expect(headers.get('Content-Type')).toBe('application/json');
    expect(headers.get('Accept')).toBe('application/json');
  });
});
