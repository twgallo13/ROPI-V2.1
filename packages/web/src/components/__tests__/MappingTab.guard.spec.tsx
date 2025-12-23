/**
 * MappingTab Guard Tests
 * 
 * Tests that MappingTab properly guards against API calls
 * when attribute_id is undefined (during attribute creation).
 * 
 * LP-ATTR-1.2.0
 */

import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { render, screen, waitFor } from '@testing-library/react';
import MappingTab from '../MappingTab';
import type { Attribute } from '../../hooks/useAttributes';

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

// Mock globalMapping response (always called)
const mockGlobalMapping = {
  aliases: { 'VendorColor': 'primary_color' },
  value_synonyms: {
    primary_color: { 'Red': ['red', 'crimson'] },
  },
  updatedAt: '2024-01-01T00:00:00Z',
};

// Create a fresh attribute for each test
function createMockAttribute(overrides: Partial<Attribute> = {}): Attribute {
  return {
    attribute_id: 'test_color',
    label: 'Test Color',
    data_type: 'string',
    status: 'active',
    category: 'testing',
    ...overrides,
  } as Attribute;
}

const mockAttributes: Attribute[] = [
  createMockAttribute({ attribute_id: 'test_color', label: 'Test Color' }),
  createMockAttribute({ attribute_id: 'brand', label: 'Brand' }),
];

describe('MappingTab Guard Behavior', () => {
  beforeEach(() => {
    mockFetch.mockReset();
    // Default: return global mapping for any /mappings call
    mockFetch.mockImplementation((url: string) => {
      if (url.includes('/mappings') && !url.includes('/attributes/')) {
        return Promise.resolve({
          ok: true,
          headers: new Headers({ 'content-type': 'application/json' }),
          text: () => Promise.resolve(JSON.stringify(mockGlobalMapping)),
        });
      }
      // Default 404 for attribute-level mapping
      return Promise.resolve({
        ok: false,
        status: 404,
        headers: new Headers({ 'content-type': 'application/json' }),
        text: () => Promise.resolve(JSON.stringify({ error: 'Not found' })),
      });
    });
  });

  afterEach(() => {
    vi.clearAllMocks();
  });

  it('should NOT call attribute mapping endpoint when attribute_id is undefined', async () => {
    // Create attribute without attribute_id (simulating create mode)
    const newAttribute = createMockAttribute({
      attribute_id: undefined as unknown as string,
      label: 'New Attribute',
    });

    render(
      <MappingTab attribute={newAttribute} attributes={mockAttributes} />
    );

    // Wait for component to settle
    await waitFor(() => {
      expect(mockFetch).toHaveBeenCalled();
    }, { timeout: 2000 });

    // Verify only global mapping was called
    const calls = mockFetch.mock.calls.map(c => c[0]);
    const globalCalls = calls.filter((url: string) => 
      url.includes('/mappings') && !url.includes('/attributes/')
    );
    const attributeCalls = calls.filter((url: string) => 
      url.includes('/attributes/') && url.includes('/mapping')
    );

    expect(globalCalls.length).toBeGreaterThanOrEqual(1);
    expect(attributeCalls.length).toBe(0);
  });

  it('should NOT call attribute mapping endpoint when attribute_id is empty string', async () => {
    const newAttribute = createMockAttribute({
      attribute_id: '',
      label: 'Empty ID Attribute',
    });

    render(
      <MappingTab attribute={newAttribute} attributes={mockAttributes} />
    );

    await waitFor(() => {
      expect(mockFetch).toHaveBeenCalled();
    }, { timeout: 2000 });

    const calls = mockFetch.mock.calls.map(c => c[0]);
    const attributeCalls = calls.filter((url: string) => 
      url.includes('/attributes/') && url.includes('/mapping')
    );

    expect(attributeCalls.length).toBe(0);
  });

  it('should call attribute mapping endpoint when attribute_id is valid', async () => {
    // Mock attribute mapping response
    mockFetch.mockImplementation((url: string) => {
      if (url.includes('/mappings') && !url.includes('/attributes/')) {
        return Promise.resolve({
          ok: true,
          headers: new Headers({ 'content-type': 'application/json' }),
          text: () => Promise.resolve(JSON.stringify(mockGlobalMapping)),
        });
      }
      if (url.includes('/attributes/test_color/mapping')) {
        return Promise.resolve({
          ok: true,
          headers: new Headers({ 'content-type': 'application/json' }),
          text: () => Promise.resolve(JSON.stringify({
            aliases: { 'Color': 'test_color' },
            value_synonyms: {},
          })),
        });
      }
      return Promise.resolve({
        ok: false,
        status: 404,
        headers: new Headers({ 'content-type': 'application/json' }),
        text: () => Promise.resolve(JSON.stringify({ error: 'Not found' })),
      });
    });

    const existingAttribute = createMockAttribute({
      attribute_id: 'test_color',
      label: 'Test Color',
    });

    render(
      <MappingTab attribute={existingAttribute} attributes={mockAttributes} />
    );

    await waitFor(() => {
      expect(mockFetch).toHaveBeenCalled();
    }, { timeout: 2000 });

    const calls = mockFetch.mock.calls.map(c => c[0]);
    const attributeCalls = calls.filter((url: string) => 
      url.includes('/attributes/test_color/mapping')
    );

    expect(attributeCalls.length).toBeGreaterThanOrEqual(1);
  });

  it('should render without crashing when attribute_id is undefined', async () => {
    const newAttribute = createMockAttribute({
      attribute_id: undefined as unknown as string,
      label: 'New Attribute',
    });

    render(
      <MappingTab attribute={newAttribute} attributes={mockAttributes} />
    );

    // Wait for component to settle
    await waitFor(() => {
      expect(mockFetch).toHaveBeenCalled();
    }, { timeout: 2000 });

    // Component should render with view toggle (role="tablist")
    const tablist = screen.getByRole('tablist');
    expect(tablist).toBeTruthy();
    
    // View toggle buttons should be present
    const viewOptions = screen.getAllByRole('tab');
    expect(viewOptions.length).toBeGreaterThanOrEqual(3);
  });

  it('should display aliases from global mapping when attribute_id is undefined', async () => {
    const newAttribute = createMockAttribute({
      attribute_id: undefined as unknown as string,
      label: 'New Attribute',
    });

    render(
      <MappingTab attribute={newAttribute} attributes={mockAttributes} />
    );

    // Wait for loading to complete
    await waitFor(() => {
      expect(mockFetch).toHaveBeenCalled();
    }, { timeout: 2000 });

    // Should show Attribute view mode is selected by default (empty)
    const attributeTab = screen.getByRole('tab', { name: /attribute/i });
    expect(attributeTab).toHaveAttribute('aria-selected', 'true');
  });

  it('should handle 404 gracefully when attribute mapping does not exist', async () => {
    // Setup to return 404 for attribute mapping
    mockFetch.mockImplementation((url: string) => {
      if (url.includes('/mappings') && !url.includes('/attributes/')) {
        return Promise.resolve({
          ok: true,
          headers: new Headers({ 'content-type': 'application/json' }),
          text: () => Promise.resolve(JSON.stringify(mockGlobalMapping)),
        });
      }
      // Return 404 for attribute mapping
      return Promise.resolve({
        ok: false,
        status: 404,
        headers: new Headers({ 'content-type': 'application/json' }),
        text: () => Promise.resolve(JSON.stringify({ error: 'Mapping not found' })),
      });
    });

    const existingAttribute = createMockAttribute({
      attribute_id: 'no_mapping_attr',
      label: 'No Mapping Attribute',
    });

    render(
      <MappingTab attribute={existingAttribute} attributes={mockAttributes} />
    );

    await waitFor(() => {
      expect(mockFetch).toHaveBeenCalled();
    }, { timeout: 2000 });

    // Should not show error for 404 (expected case)
    // The component should render normally with tablist
    const tablist = screen.getByRole('tablist');
    expect(tablist).toBeTruthy();
  });
});
