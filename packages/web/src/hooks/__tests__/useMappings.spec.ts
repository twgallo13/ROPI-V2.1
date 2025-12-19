/**
 * useMappings Hook Tests
 * 
 * Lisa PVS-0.3.2
 */

import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { renderHook, act, waitFor } from '@testing-library/react';
import { useMappings } from '../useMappings';

// Mock getAuthHeaders
vi.mock('../../lib/authHeaders', () => ({
  getAuthHeaders: vi.fn().mockResolvedValue({
    'Authorization': 'Bearer test-token',
    'Content-Type': 'application/json',
  }),
}));

// Mock fetch
const mockFetch = vi.fn();
global.fetch = mockFetch;

describe('useMappings', () => {
  beforeEach(() => {
    mockFetch.mockReset();
  });

  afterEach(() => {
    vi.clearAllMocks();
  });

  describe('fetchGlobalMapping', () => {
    it('should fetch global mapping successfully', async () => {
      const mockGlobalMapping = {
        aliases: { 'VendorColor': 'primary_color' },
        value_synonyms: {
          'primary_color': {
            'Red': ['red', 'crimson'],
          },
        },
        updatedAt: '2024-01-01T00:00:00Z',
      };

      mockFetch.mockResolvedValueOnce({
        ok: true,
        headers: new Headers({ 'content-type': 'application/json' }),
        text: () => Promise.resolve(JSON.stringify(mockGlobalMapping)),
      });

      const { result } = renderHook(() => useMappings());

      await act(async () => {
        await result.current.fetchGlobalMapping();
      });

      await waitFor(() => {
        expect(result.current.globalMapping).toEqual(mockGlobalMapping);
        expect(result.current.loading).toBe(false);
        expect(result.current.error).toBeNull();
      });
    });

    it('should handle fetch error', async () => {
      mockFetch.mockResolvedValueOnce({
        ok: false,
        status: 401,
        headers: new Headers({ 'content-type': 'application/json' }),
        text: () => Promise.resolve(JSON.stringify({ error: 'Unauthorized' })),
      });

      const { result } = renderHook(() => useMappings());

      await act(async () => {
        await result.current.fetchGlobalMapping();
      });

      await waitFor(() => {
        expect(result.current.error).toContain('Unauthorized');
        expect(result.current.loading).toBe(false);
      });
    });
  });

  describe('fetchAttributeMapping', () => {
    it('should fetch attribute mapping successfully', async () => {
      const mockAttrMapping = {
        aliases: { 'ProductColor': 'color' },
        value_synonyms: { 'Black': ['black', 'noir'] },
      };

      mockFetch.mockResolvedValueOnce({
        ok: true,
        headers: new Headers({ 'content-type': 'application/json' }),
        text: () => Promise.resolve(JSON.stringify(mockAttrMapping)),
      });

      const { result } = renderHook(() => useMappings());

      await act(async () => {
        await result.current.fetchAttributeMapping('color');
      });

      await waitFor(() => {
        expect(result.current.attributeMapping).toEqual(mockAttrMapping);
      });
    });

    it('should handle 404 gracefully (no mapping exists)', async () => {
      mockFetch.mockResolvedValueOnce({
        ok: false,
        status: 404,
        headers: new Headers({ 'content-type': 'application/json' }),
        text: () => Promise.resolve(JSON.stringify({ error: 'not found' })),
      });

      const { result } = renderHook(() => useMappings());

      await act(async () => {
        await result.current.fetchAttributeMapping('new_attr');
      });

      await waitFor(() => {
        // Should initialize with empty mapping instead of error
        expect(result.current.attributeMapping).toEqual({
          aliases: {},
          value_synonyms: {},
        });
        expect(result.current.error).toBeNull();
      });
    });
  });

  describe('updateGlobalMapping', () => {
    it('should update global mapping with merge', async () => {
      const updatedMapping = {
        aliases: { 'VendorColor': 'primary_color', 'NewAlias': 'new_attr' },
        value_synonyms: {},
      };

      mockFetch.mockResolvedValueOnce({
        ok: true,
        headers: new Headers({ 'content-type': 'application/json' }),
        text: () => Promise.resolve(JSON.stringify(updatedMapping)),
      });

      const { result } = renderHook(() => useMappings());

      await act(async () => {
        await result.current.updateGlobalMapping({ aliases: { 'NewAlias': 'new_attr' } }, true);
      });

      // Check URL includes merge param
      expect(mockFetch).toHaveBeenCalledWith(
        expect.stringContaining('?merge=true'),
        expect.objectContaining({ method: 'PUT' })
      );
    });
  });

  describe('mergedAliases', () => {
    it('should compute merged aliases with precedence', async () => {
      const mockGlobal = {
        aliases: { 'GlobalAlias': 'global_attr', 'SharedAlias': 'global_target' },
        value_synonyms: {},
      };
      const mockAttr = {
        aliases: { 'AttrAlias': 'attr_target', 'SharedAlias': 'attr_target_override' },
        value_synonyms: {},
      };

      // First call for global
      mockFetch.mockResolvedValueOnce({
        ok: true,
        headers: new Headers({ 'content-type': 'application/json' }),
        text: () => Promise.resolve(JSON.stringify(mockGlobal)),
      });
      // Second call for attribute
      mockFetch.mockResolvedValueOnce({
        ok: true,
        headers: new Headers({ 'content-type': 'application/json' }),
        text: () => Promise.resolve(JSON.stringify(mockAttr)),
      });

      const { result } = renderHook(() => useMappings({ attributeId: 'test' }));

      await act(async () => {
        await result.current.fetchGlobalMapping();
        await result.current.fetchAttributeMapping('test');
      });

      await waitFor(() => {
        const aliases = result.current.mergedAliases;
        // Attribute aliases should take precedence
        const sharedAlias = aliases.find(a => a.alias === 'SharedAlias');
        expect(sharedAlias?.canonicalId).toBe('attr_target_override');
        expect(sharedAlias?.source).toBe('attribute');
        
        // Global alias should be included
        const globalAlias = aliases.find(a => a.alias === 'GlobalAlias');
        expect(globalAlias?.canonicalId).toBe('global_attr');
        expect(globalAlias?.source).toBe('global');
      });
    });
  });

  describe('previewImport', () => {
    it('should call preview API with correct params', async () => {
      const mockResult = {
        headers: [
          { original: 'Color', canonical: 'primary_color', confidence: 'high', source: 'attribute' },
        ],
        rows: [{ primary_color: 'Red' }],
        unknownHeaders: [],
        unknownValues: {},
        totalRows: 1,
        previewedRows: 1,
      };

      mockFetch.mockResolvedValueOnce({
        ok: true,
        headers: new Headers({ 'content-type': 'application/json' }),
        text: () => Promise.resolve(JSON.stringify(mockResult)),
      });

      const { result } = renderHook(() => useMappings());

      let previewResult;
      await act(async () => {
        previewResult = await result.current.previewImport({
          csvText: 'Color\nRed',
          sourceId: 'vendor_a',
          maxRows: 50,
        });
      });

      expect(previewResult).toEqual(mockResult);
      expect(mockFetch).toHaveBeenCalledWith(
        expect.stringContaining('/api/admin/imports/preview'),
        expect.objectContaining({
          method: 'POST',
          body: expect.stringContaining('csvText'),
        })
      );
    });
  });
});
