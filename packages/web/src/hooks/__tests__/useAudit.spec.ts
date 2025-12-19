/**
 * useAudit Hook Tests
 * PVS-0.3.3
 */

import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { renderHook, waitFor, act } from '@testing-library/react';
import { useAudit } from '../useAudit';

// Mock the authHeaders module
vi.mock('../../lib/authHeaders', () => ({
  getAuthHeaders: vi.fn(() => Promise.resolve({ Authorization: 'Bearer test-token' })),
}));

// Mock fetch
const mockFetch = vi.fn();
global.fetch = mockFetch;

describe('useAudit', () => {
  beforeEach(() => {
    mockFetch.mockReset();
  });

  afterEach(() => {
    vi.clearAllMocks();
  });

  describe('fetchEvents', () => {
    it('should fetch audit events successfully', async () => {
      const mockEvents = {
        events: [
          {
            id: 'evt-1',
            attributeId: 'test-attr',
            action: 'create',
            actor: 'user1',
            timestamp: '2024-01-01T00:00:00Z',
            summary: 'Created attribute',
            before: null,
            after: { label: 'Test' },
          },
        ],
        total: 1,
        hasMore: false,
      };

      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: () => Promise.resolve(mockEvents),
      });

      const { result } = renderHook(() => useAudit('test-attr'));

      await act(async () => {
        await result.current.fetchEvents();
      });

      await waitFor(() => {
        expect(result.current.events).toHaveLength(1);
        expect(result.current.events[0].id).toBe('evt-1');
        expect(result.current.total).toBe(1);
        expect(result.current.loading).toBe(false);
      });
    });

    it('should handle fetch error', async () => {
      mockFetch.mockResolvedValueOnce({
        ok: false,
        status: 500,
        json: () => Promise.resolve({ error: 'Server error' }),
      });

      const { result } = renderHook(() => useAudit('test-attr'));

      await act(async () => {
        await result.current.fetchEvents();
      });

      await waitFor(() => {
        expect(result.current.error).toContain('Server error');
        expect(result.current.loading).toBe(false);
      });
    });

    it('should return early if no attributeId', async () => {
      const { result } = renderHook(() => useAudit(null));

      await act(async () => {
        await result.current.fetchEvents();
      });

      expect(mockFetch).not.toHaveBeenCalled();
      expect(result.current.events).toHaveLength(0);
    });
  });

  describe('revertToEvent', () => {
    it('should revert successfully and refresh events', async () => {
      // Mock the revert call
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: () => Promise.resolve({ success: true }),
      });

      // Mock the refresh call
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: () => Promise.resolve({ events: [], total: 0, hasMore: false }),
      });

      // Mock the usage call
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: () => Promise.resolve({ count: 0, samples: [] }),
      });

      const { result } = renderHook(() => useAudit('test-attr'));

      let success: boolean = false;
      await act(async () => {
        success = await result.current.revertToEvent('evt-1', 'Test revert reason');
      });

      expect(success).toBe(true);
      expect(result.current.reverting).toBe(false);
    });

    it('should require reason for revert', async () => {
      const { result } = renderHook(() => useAudit('test-attr'));

      let success: boolean = true;
      await act(async () => {
        success = await result.current.revertToEvent('evt-1', '');
      });

      expect(success).toBe(false);
      expect(mockFetch).not.toHaveBeenCalled();
    });

    it('should handle revert error', async () => {
      mockFetch.mockResolvedValueOnce({
        ok: false,
        status: 400,
        json: () => Promise.resolve({ error: 'Cannot revert' }),
      });

      const { result } = renderHook(() => useAudit('test-attr'));

      let success: boolean = true;
      await act(async () => {
        success = await result.current.revertToEvent('evt-1', 'Test reason');
      });

      expect(success).toBe(false);
      expect(result.current.error).toContain('Cannot revert');
    });
  });

  describe('fetchUsage', () => {
    it('should fetch usage data successfully', async () => {
      const mockUsage = {
        count: 42,
        samples: [
          { id: 'prod-1', sku: 'SKU-001', value: 'test-value' },
        ],
      };

      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: () => Promise.resolve(mockUsage),
      });

      const { result } = renderHook(() => useAudit('test-attr'));

      await act(async () => {
        await result.current.fetchUsage();
      });

      await waitFor(() => {
        expect(result.current.usage).toEqual(mockUsage);
      });
    });
  });

  describe('loadMore', () => {
    it('should load more events when hasMore is true', async () => {
      // Initial fetch
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: () => Promise.resolve({
          events: [{ id: 'evt-1', action: 'create', actor: 'u1', timestamp: '2024-01-01', summary: 's', before: null, after: {} }],
          total: 2,
          hasMore: true,
          pageToken: 'token1',
        }),
      });

      const { result } = renderHook(() => useAudit('test-attr'));

      await act(async () => {
        await result.current.fetchEvents();
      });

      // Load more fetch
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: () => Promise.resolve({
          events: [{ id: 'evt-2', action: 'update', actor: 'u1', timestamp: '2024-01-02', summary: 's2', before: {}, after: {} }],
          total: 2,
          hasMore: false,
        }),
      });

      await act(async () => {
        result.current.loadMore();
      });

      await waitFor(() => {
        expect(result.current.events).toHaveLength(2);
      });
    });
  });
});
