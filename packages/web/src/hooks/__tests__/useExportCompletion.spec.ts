/**
 * useExportCompletion Hook Tests
 * LP-export-unlock-1.0.0
 */

import { renderHook, waitFor, act } from '@testing-library/react';
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { useExportCompletion } from '../useExportCompletion';

// Mock fetch globally
const mockFetch = vi.fn();
global.fetch = mockFetch;

// Mock localStorage
const mockLocalStorage = {
  getItem: vi.fn(() => 'mock-token'),
  setItem: vi.fn(),
  removeItem: vi.fn(),
  clear: vi.fn(),
  length: 0,
  key: vi.fn(),
};
Object.defineProperty(window, 'localStorage', { value: mockLocalStorage });

describe('useExportCompletion', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  const mockReadyResponse = {
    readiness: {
      ready: true,
      completionPct: 95,
      threshold: 80,
      hasBlockingSites: false,
      blockingReasons: [],
      operatorExplanation: {
        summary: 'All completion requirements met',
        blockingIssues: [],
        actionRequired: [],
      },
    },
  };

  const mockBlockedResponse = {
    readiness: {
      ready: false,
      completionPct: 65,
      threshold: 80,
      hasBlockingSites: true,
      blockingReasons: [
        {
          type: 'COMPLETION_BELOW_THRESHOLD',
          severity: 'critical',
          message: 'Completion at 65% is below 80% threshold',
        },
      ],
      operatorExplanation: {
        summary: 'Completion requirements not met',
        blockingIssues: ['Completion at 65% is below 80% threshold'],
        actionRequired: ['Fill missing required attributes'],
      },
    },
  };

  it('should start in loading state', () => {
    mockFetch.mockImplementation(() => new Promise(() => {})); // Never resolves
    
    const { result } = renderHook(() => useExportCompletion());
    
    expect(result.current.loading).toBe(true);
    expect(result.current.completion).toBeNull();
    expect(result.current.exportReady).toBe(false);
    expect(result.current.exportBlocked).toBe(false);
  });

  it('should set exportReady=true when completion.ready is true', async () => {
    mockFetch.mockResolvedValueOnce({
      ok: true,
      status: 200,
      json: () => Promise.resolve(mockReadyResponse),
    });

    const { result } = renderHook(() => useExportCompletion());

    await waitFor(() => {
      expect(result.current.loading).toBe(false);
    });

    expect(result.current.exportReady).toBe(true);
    expect(result.current.exportBlocked).toBe(false);
    expect(result.current.completion?.ready).toBe(true);
    expect(result.current.completion?.completionPct).toBe(95);
  });

  it('should set exportBlocked=true when completion.ready is false', async () => {
    mockFetch.mockResolvedValueOnce({
      ok: false,
      status: 423,
      json: () => Promise.resolve(mockBlockedResponse),
    });

    const { result } = renderHook(() => useExportCompletion());

    await waitFor(() => {
      expect(result.current.loading).toBe(false);
    });

    expect(result.current.exportReady).toBe(false);
    expect(result.current.exportBlocked).toBe(true);
    expect(result.current.completion?.ready).toBe(false);
    expect(result.current.completion?.blockingReasons).toHaveLength(1);
  });

  it('should set error state on fetch failure', async () => {
    mockFetch.mockRejectedValueOnce(new Error('Network error'));

    const { result } = renderHook(() => useExportCompletion());

    await waitFor(() => {
      expect(result.current.loading).toBe(false);
    });

    expect(result.current.error).toBe('Network error');
    expect(result.current.completion).toBeNull();
    expect(result.current.exportReady).toBe(false);
    expect(result.current.exportBlocked).toBe(false);
  });

  it('should refresh data when refresh() is called', async () => {
    // First call returns blocked
    mockFetch.mockResolvedValueOnce({
      ok: false,
      status: 423,
      json: () => Promise.resolve(mockBlockedResponse),
    });

    const { result } = renderHook(() => useExportCompletion());

    await waitFor(() => {
      expect(result.current.loading).toBe(false);
    });

    expect(result.current.exportBlocked).toBe(true);

    // Second call (after refresh) returns ready
    mockFetch.mockResolvedValueOnce({
      ok: true,
      status: 200,
      json: () => Promise.resolve(mockReadyResponse),
    });

    await act(async () => {
      await result.current.refresh();
    });

    expect(result.current.exportReady).toBe(true);
    expect(result.current.exportBlocked).toBe(false);
  });

  it('should include auth token in request', async () => {
    mockFetch.mockResolvedValueOnce({
      ok: true,
      status: 200,
      json: () => Promise.resolve(mockReadyResponse),
    });

    renderHook(() => useExportCompletion());

    await waitFor(() => {
      expect(mockFetch).toHaveBeenCalled();
    });

    expect(mockFetch).toHaveBeenCalledWith(
      '/api/admin/exports/readiness',
      expect.objectContaining({
        headers: expect.objectContaining({
          Authorization: 'Bearer mock-token',
        }),
      })
    );
  });
});
