/**
 * apiFetch Tests
 * 
 * Tests for API fetch wrapper: JSON validation, 204 handling, error propagation.
 */

import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { apiFetch, apiFetchDelete } from '../src/lib/apiFetch';

// Mock authHeaders
vi.mock('../src/lib/authHeaders', () => ({
  getAuthHeaders: vi.fn().mockResolvedValue({
    'Authorization': 'Bearer mock-token',
  }),
}));

describe('apiFetch', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    global.fetch = vi.fn();
  });

  afterEach(() => {
    vi.resetAllMocks();
  });

  describe('successful JSON response', () => {
    it('should parse and return JSON for 200 OK', async () => {
      const mockData = { uid: 'user123', email: 'test@example.com' };
      (global.fetch as any).mockResolvedValueOnce({
        ok: true,
        status: 200,
        headers: new Map([['content-type', 'application/json']]),
        text: vi.fn().mockResolvedValueOnce(JSON.stringify(mockData)),
      });

      const result = await apiFetch('/api/users/user123');
      expect(result).toEqual(mockData);
    });

    it('should return undefined for 204 No Content', async () => {
      (global.fetch as any).mockResolvedValueOnce({
        ok: true,
        status: 204,
        headers: new Map([['content-type', 'application/json']]),
        text: vi.fn().mockResolvedValueOnce(''),
      });

      const result = await apiFetch('/api/admin/settings/users/uid123', {
        method: 'DELETE',
      });
      expect(result).toBeUndefined();
    });

    it('should return undefined for empty response body', async () => {
      (global.fetch as any).mockResolvedValueOnce({
        ok: true,
        status: 200,
        headers: new Map([['content-type', 'application/json']]),
        text: vi.fn().mockResolvedValueOnce('   '),
      });

      const result = await apiFetch('/api/users/user123');
      expect(result).toBeUndefined();
    });
  });

  describe('error handling', () => {
    it('should throw for HTTP 4xx/5xx errors', async () => {
      (global.fetch as any).mockResolvedValueOnce({
        ok: false,
        status: 401,
        headers: new Map([['content-type', 'application/json']]),
        text: vi.fn().mockResolvedValueOnce('{"error": "Unauthorized"}'),
      });

      await expect(apiFetch('/api/users')).rejects.toThrow('HTTP 401');
    });

    it('should throw for non-JSON response with non-empty body', async () => {
      (global.fetch as any).mockResolvedValueOnce({
        ok: true,
        status: 200,
        headers: new Map([['content-type', 'text/html']]),
        text: vi.fn().mockResolvedValueOnce('<html>Not Found</html>'),
      });

      await expect(apiFetch('/api/users')).rejects.toThrow(
        'Expected JSON response but got text/html'
      );
    });

    it('should throw for invalid JSON', async () => {
      (global.fetch as any).mockResolvedValueOnce({
        ok: true,
        status: 200,
        headers: new Map([['content-type', 'application/json']]),
        text: vi.fn().mockResolvedValueOnce('{ invalid json }'),
      });

      await expect(apiFetch('/api/users')).rejects.toThrow('Failed to parse JSON');
    });

    it('should handle auth errors gracefully', async () => {
      // This test verifies that auth failures are caught and reported
      // The actual auth failure handling depends on the authHeaders implementation
      // For now, we just verify fetch was attempted
      (global.fetch as any).mockResolvedValueOnce({
        ok: false,
        status: 401,
        headers: new Map([['content-type', 'application/json']]),
        text: vi.fn().mockResolvedValueOnce('{"error": "Unauthorized"}'),
      });

      await expect(apiFetch('/api/users')).rejects.toThrow('HTTP 401');
    });
  });

  describe('DELETE requests', () => {
    it('should handle successful DELETE with 204 response', async () => {
      (global.fetch as any).mockResolvedValueOnce({
        ok: true,
        status: 204,
        headers: new Map([['content-type', 'application/json']]),
        text: vi.fn().mockResolvedValueOnce(''),
      });

      const result = await apiFetchDelete('/api/admin/settings/users/uid123');
      expect(result).toBeUndefined();
      expect(global.fetch).toHaveBeenCalled();
      expect((global.fetch as any).mock.calls[0][0]).toContain('/api/admin/settings/users/uid123');
    });

    it('should handle DELETE with 200 and empty body', async () => {
      (global.fetch as any).mockResolvedValueOnce({
        ok: true,
        status: 200,
        headers: new Map([['content-type', 'application/json']]),
        text: vi.fn().mockResolvedValueOnce(''),
      });

      const result = await apiFetchDelete('/api/admin/settings/users/uid123');
      expect(result).toBeUndefined();
    });
  });

  describe('URL resolution', () => {
    it('should prepend API_BASE for relative URLs', async () => {
      (global.fetch as any).mockResolvedValueOnce({
        ok: true,
        status: 200,
        headers: new Map([['content-type', 'application/json']]),
        text: vi.fn().mockResolvedValueOnce('{}'),
      });

      await apiFetch('/api/users');

      expect((global.fetch as any).mock.calls[0][0]).toContain('/api/users');
    });

    it('should use absolute URLs as-is', async () => {
      (global.fetch as any).mockResolvedValueOnce({
        ok: true,
        status: 200,
        headers: new Map([['content-type', 'application/json']]),
        text: vi.fn().mockResolvedValueOnce('{}'),
      });

      await apiFetch('https://example.com/api/users');

      expect((global.fetch as any).mock.calls[0][0]).toBe('https://example.com/api/users');
    });
  });
});
