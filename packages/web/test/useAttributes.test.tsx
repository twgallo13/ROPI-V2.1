/**
 * useAttributes Hook Unit Tests
 * 
 * Tests the attributes hook's API interactions and state management.
 * 
 * Lisa v1.0.0
 * LP-ATTR-1.3.2: Added tests for parseResponseSafely and delete behavior
 */

import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { renderHook, waitFor, act } from '@testing-library/react';
import { useAttributes, parseResponseSafely } from '../src/hooks/useAttributes';

// Mock Firebase Auth
const mockUnsubscribe = vi.fn();
vi.mock('firebase/auth', () => ({
  getAuth: vi.fn(() => ({
    currentUser: null,
  })),
  onAuthStateChanged: vi.fn((auth, callback) => {
    // Call callback with null user asynchronously to avoid race conditions
    setTimeout(() => callback(null), 0);
    // Return unsubscribe function (not called yet)
    return mockUnsubscribe;
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
      headers: new Headers({ 'content-type': 'application/json' }),
      text: async () => JSON.stringify({ items: mockAttributes }),
    });

    const { result } = renderHook(() => useAttributes());

    // Initially loading
    expect(result.current.loading).toBe(true);

    await waitFor(() => {
      expect(result.current.loading).toBe(false);
    });

    expect(result.current.attributes).toEqual(mockAttributes);
    expect(result.current.error).toBeNull();
  });

  it('should handle fetch error', async () => {
    mockFetch.mockResolvedValueOnce({
      ok: false,
      status: 500,
      headers: new Headers({ 'content-type': 'text/plain' }),
      text: async () => 'Server error',
    });

    const { result } = renderHook(() => useAttributes());

    await waitFor(() => {
      expect(result.current.loading).toBe(false);
    });

    expect(result.current.error).toContain('Server error');
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
      headers: new Headers({ 'content-type': 'application/json' }),
      text: async () => JSON.stringify({ items: initialAttributes }),
    });

    const { result } = renderHook(() => useAttributes());

    await waitFor(() => {
      expect(result.current.loading).toBe(false);
    });

    // Setup for create call
    mockFetch.mockResolvedValueOnce({
      ok: true,
      headers: new Headers({ 'content-type': 'application/json' }),
      text: async () => JSON.stringify(newAttribute),
    });

    // Setup for refresh call
    mockFetch.mockResolvedValueOnce({
      ok: true,
      headers: new Headers({ 'content-type': 'application/json' }),
      text: async () => JSON.stringify({ items: updatedAttributes }),
    });

    await act(async () => {
      await result.current.createAttribute(newAttribute as any);
    });

    expect(result.current.attributes.some(a => a.attribute_id === 'size')).toBe(true);
  });

  it('should update an existing attribute and refresh', async () => {
    const initialAttributes = [
      { attribute_id: 'color', label: 'Color', data_type: 'enum' },
    ];
    const updatedAttribute = { attribute_id: 'color', label: 'Primary Color', data_type: 'enum' };

    mockFetch.mockResolvedValueOnce({
      ok: true,
      headers: new Headers({ 'content-type': 'application/json' }),
      text: async () => JSON.stringify({ items: initialAttributes }),
    });

    const { result } = renderHook(() => useAttributes());

    await waitFor(() => {
      expect(result.current.loading).toBe(false);
    });

    // Setup for update call - need to provide both ok: true and proper response
    const mockUpdateResponse = {
      ok: true,
      status: 200,
      headers: new Headers({ 'content-type': 'application/json' }),
      text: async () => JSON.stringify({ attribute: updatedAttribute }),
      json: async () => ({ attribute: updatedAttribute }),
    };
    mockFetch.mockResolvedValueOnce(mockUpdateResponse);

    // Setup for refresh call
    mockFetch.mockResolvedValueOnce({
      ok: true,
      headers: new Headers({ 'content-type': 'application/json' }),
      text: async () => JSON.stringify({ items: [updatedAttribute] }),
    });

    let updateResult;
    await act(async () => {
      updateResult = await result.current.updateAttribute('color', { label: 'Primary Color' });
    });

    expect(updateResult).toMatchObject({ ok: true });
  });

  it('should delete an attribute and refresh', async () => {
    const initialAttributes = [
      { attribute_id: 'color', label: 'Color', data_type: 'enum' },
      { attribute_id: 'size', label: 'Size', data_type: 'string' },
    ];

    mockFetch.mockResolvedValueOnce({
      ok: true,
      headers: new Headers({ 'content-type': 'application/json' }),
      text: async () => JSON.stringify({ items: initialAttributes }),
    });

    const { result } = renderHook(() => useAttributes());

    await waitFor(() => {
      expect(result.current.loading).toBe(false);
    });

    // Setup for delete call (204 No Content)
    mockFetch.mockResolvedValueOnce({
      ok: true,
      status: 204,
      headers: new Headers(),
      text: async () => '',
    });

    // Setup for refresh call
    mockFetch.mockResolvedValueOnce({
      ok: true,
      headers: new Headers({ 'content-type': 'application/json' }),
      text: async () => JSON.stringify({ items: [initialAttributes[1]] }),
    });

    let deleteResult: boolean | undefined;
    await act(async () => {
      deleteResult = await result.current.deleteAttribute('color');
    });

    expect(deleteResult).toBe(true);
    await waitFor(() => {
      expect(result.current.attributes.length).toBeLessThanOrEqual(1);
    });
  });

  it('should throw error on create failure', async () => {
    mockFetch.mockResolvedValueOnce({
      ok: true,
      headers: new Headers({ 'content-type': 'application/json' }),
      text: async () => JSON.stringify({ items: [] }),
    });

    const { result } = renderHook(() => useAttributes());

    await waitFor(() => {
      expect(result.current.loading).toBe(false);
    });

    mockFetch.mockResolvedValueOnce({
      ok: false,
      status: 400,
      headers: new Headers({ 'content-type': 'text/plain' }),
      text: async () => 'Attribute already exists',
    });

    await expect(
      act(async () => {
        await result.current.createAttribute({ attribute_id: 'test', label: 'Test', data_type: 'string' });
      })
    ).rejects.toThrow();
  });
});

/**
 * LP-ATTR-1.3.2: Tests for parseResponseSafely helper
 * Validates handling of 204 No Content, content-type checks, JSON parsing, and fallback to text
 */
describe('parseResponseSafely', () => {
  it('should return null for 204 No Content', async () => {
    const res = new Response(null, { status: 204 });
    const result = await parseResponseSafely(res);
    expect(result).toBeNull();
  });

  it('should return null for 205 Reset Content', async () => {
    const res = new Response(null, { status: 205 });
    const result = await parseResponseSafely(res);
    expect(result).toBeNull();
  });

  it('should parse valid JSON response', async () => {
    const json = { message: 'Success', data: { id: 123 } };
    const res = new Response(JSON.stringify(json), {
      status: 200,
      headers: { 'content-type': 'application/json' },
    });
    const result = await parseResponseSafely(res);
    expect(result).toEqual(json);
  });

  it('should return rawText for HTML response (404 error page)', async () => {
    const html = '<html><body><h1>404 Not Found</h1></body></html>';
    const res = new Response(html, {
      status: 404,
      headers: { 'content-type': 'text/html' },
    });
    const result = await parseResponseSafely(res);
    expect(result).toEqual({ rawText: html });
  });

  it('should return rawText for plain text response', async () => {
    const text = 'Error: Something went wrong';
    const res = new Response(text, {
      status: 500,
      headers: { 'content-type': 'text/plain' },
    });
    const result = await parseResponseSafely(res);
    expect(result).toEqual({ rawText: text });
  });

  it('should return rawText if JSON parse fails despite content-type', async () => {
    const invalidJson = '{ invalid json }';
    const res = new Response(invalidJson, {
      status: 200,
      headers: { 'content-type': 'application/json' },
    });
    const result = await parseResponseSafely(res);
    expect(result).toEqual({ rawText: invalidJson });
  });

  it('should return null for empty body with no content-type', async () => {
    const res = new Response('', { status: 200 });
    const result = await parseResponseSafely(res);
    expect(result).toBeNull();
  });

  it('should return rawText for non-empty body with no content-type', async () => {
    const text = 'Some text without content-type';
    const res = new Response(text, { status: 200 });
    const result = await parseResponseSafely(res);
    expect(result).toEqual({ rawText: text });
  });
});

/**
 * LP-ATTR-1.3.2: Tests for delete behavior with various response types
 */
describe('useAttributes - delete with parseResponseSafely', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  afterEach(() => {
    vi.resetAllMocks();
  });

  it('should handle successful delete (204) without parse errors', async () => {
    const initialAttributes = [
      { attribute_id: 'color', label: 'Color', data_type: 'enum' },
      { attribute_id: 'size', label: 'Size', data_type: 'string' },
    ];

    mockFetch.mockResolvedValueOnce({
      ok: true,
      headers: new Headers({ 'content-type': 'application/json' }),
      text: async () => JSON.stringify({ items: initialAttributes }),
    });

    const { result } = renderHook(() => useAttributes());

    await waitFor(() => {
      expect(result.current.loading).toBe(false);
    });

    // DELETE returns 204 No Content
    mockFetch.mockResolvedValueOnce({
      ok: true,
      status: 204,
      headers: new Headers(),
      text: async () => '',
    });

    // Refresh after delete
    mockFetch.mockResolvedValueOnce({
      ok: true,
      headers: new Headers({ 'content-type': 'application/json' }),
      text: async () => JSON.stringify({ items: [initialAttributes[1]] }),
    });

    let deleteResult: boolean | undefined;
    await act(async () => {
      deleteResult = await result.current.deleteAttribute('color');
    });

    expect(deleteResult).toBe(true);
    await waitFor(() => {
      expect(result.current.attributes.length).toBe(1);
    });
  });

  it('should handle 404 JSON response gracefully', async () => {
    const initialAttributes = [
      { attribute_id: 'color', label: 'Color', data_type: 'enum' },
    ];

    mockFetch.mockResolvedValueOnce({
      ok: true,
      headers: new Headers({ 'content-type': 'application/json' }),
      text: async () => JSON.stringify({ items: initialAttributes }),
    });

    const { result } = renderHook(() => useAttributes());

    await waitFor(() => {
      expect(result.current.loading).toBe(false);
    });

    // DELETE returns 404 with JSON
    mockFetch.mockResolvedValueOnce({
      ok: false,
      status: 404,
      headers: new Headers({ 'content-type': 'application/json' }),
      text: async () => JSON.stringify({ error: 'ATTRIBUTE_NOT_FOUND', message: 'Attribute not found' }),
    });

    // Refresh after delete (404)
    mockFetch.mockResolvedValueOnce({
      ok: true,
      headers: new Headers({ 'content-type': 'application/json' }),
      text: async () => JSON.stringify({ items: [] }),
    });

    let deleteResult: boolean | undefined;
    await act(async () => {
      deleteResult = await result.current.deleteAttribute('color');
    });

    // Should return false for 404 but not throw
    expect(deleteResult).toBe(false);
    await waitFor(() => {
      expect(result.current.attributes.length).toBe(0);
    });
  });

  it('should handle 404 HTML response gracefully', async () => {
    const initialAttributes = [
      { attribute_id: 'color', label: 'Color', data_type: 'enum' },
    ];

    mockFetch.mockResolvedValueOnce({
      ok: true,
      headers: new Headers({ 'content-type': 'application/json' }),
      text: async () => JSON.stringify({ items: initialAttributes }),
    });

    const { result } = renderHook(() => useAttributes());

    await waitFor(() => {
      expect(result.current.loading).toBe(false);
    });

    // DELETE returns 404 with HTML (misconfigured server/proxy)
    mockFetch.mockResolvedValueOnce({
      ok: false,
      status: 404,
      headers: new Headers({ 'content-type': 'text/html' }),
      text: async () => '<html><body>404 Not Found</body></html>',
    });

    // Refresh after delete (404)
    mockFetch.mockResolvedValueOnce({
      ok: true,
      headers: new Headers({ 'content-type': 'application/json' }),
      text: async () => JSON.stringify({ items: [] }),
    });

    let deleteResult: boolean | undefined;
    await act(async () => {
      deleteResult = await result.current.deleteAttribute('color');
    });

    // Should return false for 404 even with HTML response
    expect(deleteResult).toBe(false);
    await waitFor(() => {
      expect(result.current.attributes.length).toBe(0);
    });
  });

  it('should throw on non-404 error responses', async () => {
    const initialAttributes = [
      { attribute_id: 'color', label: 'Color', data_type: 'enum' },
    ];

    mockFetch.mockResolvedValueOnce({
      ok: true,
      headers: new Headers({ 'content-type': 'application/json' }),
      text: async () => JSON.stringify({ items: initialAttributes }),
    });

    const { result } = renderHook(() => useAttributes());

    await waitFor(() => {
      expect(result.current.loading).toBe(false);
    });

    // DELETE returns 500 Server Error
    mockFetch.mockResolvedValueOnce({
      ok: false,
      status: 500,
      headers: new Headers({ 'content-type': 'application/json' }),
      text: async () => JSON.stringify({ error: 'INTERNAL_ERROR', message: 'Database connection failed' }),
    });

    await expect(
      act(async () => {
        await result.current.deleteAttribute('color');
      })
    ).rejects.toThrow('Database connection failed');
  });
});

