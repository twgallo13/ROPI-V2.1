/**
 * useAttributes Hook Unit Tests
 * 
 * Tests the attributes hook's API interactions and state management.
 * 
 * Lisa v1.0.0
 */

import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { renderHook, waitFor, act } from '@testing-library/react';
import { useAttributes } from '../src/hooks/useAttributes';

// Mock Firebase Auth
vi.mock('firebase/auth', () => ({
  getAuth: vi.fn(() => ({
    currentUser: null,
  })),
  onAuthStateChanged: vi.fn((auth, callback) => {
    // Call callback with null user immediately
    callback(null);
    // Return unsubscribe function
    return vi.fn();
  }),
}));

// Mock Firebase Firestore
vi.mock('firebase/firestore', () => ({
  getFirestore: vi.fn(() => ({})),
  collection: vi.fn(),
  onSnapshot: vi.fn(() => vi.fn()),
}));

// Mock authHeaders to avoid Firebase auth calls
vi.mock('../src/lib/authHeaders', () => ({
  getAuthHeaders: vi.fn(async () => ({
    'Authorization': 'Bearer mock-token',
    'Content-Type': 'application/json',
  })),
}));

// Mock fetch globally
const mockFetch = vi.fn();
global.fetch = mockFetch;

describe('useAttributes Hook', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  afterEach(() => {
    vi.resetAllMocks();
  });

  it('should fetch attributes on mount', async () => {
    const mockAttributes = [
      { attribute_id: 'color', label: 'Color', data_type: 'enum' },
      { attribute_id: 'size', label: 'Size', data_type: 'string' },
    ];

    mockFetch.mockResolvedValueOnce({
      ok: true,
      json: async () => ({ items: mockAttributes }),
    });

    const { result } = renderHook(() => useAttributes());

    // Initially loading
    expect(result.current.loading).toBe(true);

    await waitFor(() => {
      expect(result.current.loading).toBe(false);
    });

    expect(result.current.attributes).toEqual(mockAttributes);
    expect(result.current.error).toBeNull();
    expect(mockFetch).toHaveBeenCalledWith('/admin/settings/attributes', {
      method: 'GET',
      headers: { 'Content-Type': 'application/json' },
    });
  });

  it('should handle fetch error', async () => {
    mockFetch.mockResolvedValueOnce({
      ok: false,
      text: async () => 'Server error',
    });

    const { result } = renderHook(() => useAttributes());

    await waitFor(() => {
      expect(result.current.loading).toBe(false);
    });

    expect(result.current.error).toBe('Server error');
    expect(result.current.attributes).toEqual([]);
  });

  it('should create a new attribute and refresh', async () => {
    const initialAttributes = [
      { attribute_id: 'color', label: 'Color', data_type: 'enum' },
    ];
    const newAttribute = { attribute_id: 'size', label: 'Size', data_type: 'string' };
    const updatedAttributes = [...initialAttributes, newAttribute];

    // First call - initial fetch
    mockFetch.mockResolvedValueOnce({
      ok: true,
      json: async () => ({ items: initialAttributes }),
    });

    const { result } = renderHook(() => useAttributes());

    await waitFor(() => {
      expect(result.current.loading).toBe(false);
    });

    // Setup for create call
    mockFetch.mockResolvedValueOnce({
      ok: true,
      json: async () => newAttribute,
    });

    // Setup for refresh call
    mockFetch.mockResolvedValueOnce({
      ok: true,
      json: async () => ({ items: updatedAttributes }),
    });

    await act(async () => {
      await result.current.createAttribute(newAttribute as any);
    });

    expect(mockFetch).toHaveBeenCalledWith('/admin/settings/attributes', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(newAttribute),
    });

    expect(result.current.attributes).toEqual(updatedAttributes);
  });

  it('should update an existing attribute and refresh', async () => {
    const initialAttributes = [
      { attribute_id: 'color', label: 'Color', data_type: 'enum' },
    ];
    const updatedAttribute = { attribute_id: 'color', label: 'Primary Color', data_type: 'enum' };

    mockFetch.mockResolvedValueOnce({
      ok: true,
      json: async () => ({ items: initialAttributes }),
    });

    const { result } = renderHook(() => useAttributes());

    await waitFor(() => {
      expect(result.current.loading).toBe(false);
    });

    // Setup for update call
    mockFetch.mockResolvedValueOnce({
      ok: true,
      json: async () => updatedAttribute,
    });

    // Setup for refresh call
    mockFetch.mockResolvedValueOnce({
      ok: true,
      json: async () => ({ items: [updatedAttribute] }),
    });

    await act(async () => {
      await result.current.updateAttribute('color', { label: 'Primary Color' });
    });

    expect(mockFetch).toHaveBeenCalledWith('/admin/settings/attributes/color', {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ label: 'Primary Color' }),
    });
  });

  it('should delete an attribute and refresh', async () => {
    const initialAttributes = [
      { attribute_id: 'color', label: 'Color', data_type: 'enum' },
      { attribute_id: 'size', label: 'Size', data_type: 'string' },
    ];

    mockFetch.mockResolvedValueOnce({
      ok: true,
      json: async () => ({ items: initialAttributes }),
    });

    const { result } = renderHook(() => useAttributes());

    await waitFor(() => {
      expect(result.current.loading).toBe(false);
    });

    // Setup for delete call
    mockFetch.mockResolvedValueOnce({
      ok: true,
    });

    // Setup for refresh call
    mockFetch.mockResolvedValueOnce({
      ok: true,
      json: async () => ({ items: [initialAttributes[1]] }),
    });

    await act(async () => {
      await result.current.deleteAttribute('color');
    });

    expect(mockFetch).toHaveBeenCalledWith('/admin/settings/attributes/color', {
      method: 'DELETE',
    });

    expect(result.current.attributes).toEqual([initialAttributes[1]]);
  });

  it('should throw error on create failure', async () => {
    mockFetch.mockResolvedValueOnce({
      ok: true,
      json: async () => ({ items: [] }),
    });

    const { result } = renderHook(() => useAttributes());

    await waitFor(() => {
      expect(result.current.loading).toBe(false);
    });

    mockFetch.mockResolvedValueOnce({
      ok: false,
      text: async () => 'Attribute already exists',
    });

    await expect(
      act(async () => {
        await result.current.createAttribute({ attribute_id: 'test', label: 'Test', data_type: 'string' });
      })
    ).rejects.toThrow('Attribute already exists');
  });
});
