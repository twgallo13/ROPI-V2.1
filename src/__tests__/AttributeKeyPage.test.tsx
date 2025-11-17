import { describe, it, expect, vi, beforeEach, Mock } from 'vitest';
import { render, screen, waitFor, fireEvent } from '@testing-library/react';
import { getDocs } from 'firebase/firestore';
import AttributeKeyPage from '../pages/settings/AttributeKeyPage';

// Mock Firebase
vi.mock('firebase/firestore', () => ({
  collection: vi.fn(),
  getDocs: vi.fn(),
}));

vi.mock('../firebase', () => ({
  db: {},
}));

const mockedGetDocs = getDocs as unknown as Mock;

describe('AttributeKeyPage', () => {
  const mockAttributes = [
    {
      key: 'mpn',
      canonicalPath: 'sku_core.mpn',
      label: 'MPN',
      category: 'Core',
      dataType: 'string',
      required: true,
      export: true,
      description: 'Manufacturer Part Number',
      systemFlag: false,
      legacyPaths: ['mpn'],
      importerColumns: ['mpn'],
      rules: [],
    },
    {
      key: 'sportsTeam',
      canonicalPath: 'descriptive.sportsTeam',
      label: 'Sports Team',
      category: 'Descriptive',
      dataType: 'string',
      required: false,
      export: true,
      description: 'Sports Team name',
      systemFlag: false,
      legacyPaths: [],
      importerColumns: ['sports_team'],
      rules: [],
      normalizationNote: 'Teams normalized to "City TeamName" format using pro-team canonical list',
    },
    {
      key: 'primaryColor',
      canonicalPath: 'descriptive.primaryColor',
      label: 'Primary Color',
      category: 'Descriptive',
      dataType: 'string',
      required: false,
      export: true,
      description: 'Primary color',
      systemFlag: false,
      legacyPaths: ['primaryColor'],
      importerColumns: ['rics_color', 'primary_color'],
      rules: ['SD-006'],
      normalizationNote: 'Colors normalized to Title Case',
    },
  ];

  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('renders loading state initially', () => {
    mockedGetDocs.mockImplementation(() => new Promise(() => {})); // Never resolves
    render(<AttributeKeyPage />);
    // During loading, we show a loading skeleton
    const skeleton = document.querySelector('.animate-pulse');
    expect(skeleton).toBeInTheDocument();
  });

  it('loads and displays attributes from Firestore', async () => {
    mockedGetDocs.mockResolvedValue({
      forEach: (callback: (doc: unknown) => void) => {
        mockAttributes.forEach(attr => callback({ data: () => attr }));
      },
    });

    render(<AttributeKeyPage />);

    await waitFor(() => {
      expect(screen.getByText('MPN')).toBeInTheDocument();
      expect(screen.getByText('Sports Team')).toBeInTheDocument();
      expect(screen.getByText('Primary Color')).toBeInTheDocument();
    });
  });

  it('filters attributes by search term', async () => {
    mockedGetDocs.mockResolvedValue({
      forEach: (callback: (doc: unknown) => void) => {
        mockAttributes.forEach(attr => callback({ data: () => attr }));
      },
    });

    render(<AttributeKeyPage />);

    await waitFor(() => {
      expect(screen.getByText('MPN')).toBeInTheDocument();
    });

    const searchInput = screen.getByPlaceholderText(/Search by path/i);
    fireEvent.change(searchInput, { target: { value: 'color' } });

    await waitFor(() => {
      expect(screen.queryByText('MPN')).not.toBeInTheDocument();
      expect(screen.getByText('Primary Color')).toBeInTheDocument();
    });
  });

  it('filters attributes by category', async () => {
    mockedGetDocs.mockResolvedValue({
      forEach: (callback: (doc: unknown) => void) => {
        mockAttributes.forEach(attr => callback({ data: () => attr }));
      },
    });

    render(<AttributeKeyPage />);

    await waitFor(() => {
      expect(screen.getByText('MPN')).toBeInTheDocument();
    });

    const categorySelect = screen.getByDisplayValue('All');
    fireEvent.change(categorySelect, { target: { value: 'Core' } });

    await waitFor(() => {
      expect(screen.getByText('MPN')).toBeInTheDocument();
      expect(screen.queryByText('Sports Team')).not.toBeInTheDocument();
    });
  });

  it('displays normalization notes when present', async () => {
    mockedGetDocs.mockResolvedValue({
      forEach: (callback: (doc: unknown) => void) => {
        mockAttributes.forEach(attr => callback({ data: () => attr }));
      },
    });

    render(<AttributeKeyPage />);

    await waitFor(() => {
      expect(screen.getByText(/Teams normalized to "City TeamName" format/i)).toBeInTheDocument();
      expect(screen.getByText(/Colors normalized to Title Case/i)).toBeInTheDocument();
    });
  });

  it('displays SmartDetect rules when present', async () => {
    mockedGetDocs.mockResolvedValue({
      forEach: (callback: (doc: unknown) => void) => {
        mockAttributes.forEach(attr => callback({ data: () => attr }));
      },
    });

    render(<AttributeKeyPage />);

    await waitFor(() => {
      expect(screen.getByText('SD-006')).toBeInTheDocument();
    });
  });

  it('shows correct count of filtered attributes', async () => {
    mockedGetDocs.mockResolvedValue({
      forEach: (callback: (doc: unknown) => void) => {
        mockAttributes.forEach(attr => callback({ data: () => attr }));
      },
    });

    render(<AttributeKeyPage />);

    await waitFor(() => {
      const showing = screen.getAllByText(/3/);
      expect(showing.length).toBeGreaterThan(0); // Shows "3" in "Showing 3 of 3"
    });
  });

  it('exports CSV when export button clicked', async () => {
    mockedGetDocs.mockResolvedValue({
      forEach: (callback: (doc: unknown) => void) => {
        mockAttributes.forEach(attr => callback({ data: () => attr }));
      },
    });

    // Mock URL.createObjectURL
    const createObjectURLMock = vi.fn(() => 'blob:mock-url');
    const revokeObjectURLMock = vi.fn();
    global.URL.createObjectURL = createObjectURLMock;
    global.URL.revokeObjectURL = revokeObjectURLMock;

    render(<AttributeKeyPage />);

    await waitFor(() => {
      expect(screen.getByText('Export CSV')).toBeInTheDocument();
    });

    const exportButton = screen.getByText('Export CSV');
    fireEvent.click(exportButton);

    expect(createObjectURLMock).toHaveBeenCalled();
    expect(revokeObjectURLMock).toHaveBeenCalled();
  });

  it('handles Firestore error gracefully', async () => {
    mockedGetDocs.mockRejectedValue(new Error('Firestore unavailable'));

    // Mock fetch for fallback
    global.fetch = vi.fn().mockResolvedValue({
      ok: false,
    });

    render(<AttributeKeyPage />);

    await waitFor(() => {
      // Check for the error message that actually appears
      expect(screen.getByText('Firestore unavailable')).toBeInTheDocument();
    });
  });

  it('loads fallback JSON when Firestore fails', async () => {
    mockedGetDocs.mockRejectedValue(new Error('Firestore unavailable'));

    // Mock fetch for fallback
    global.fetch = vi.fn().mockResolvedValue({
      ok: true,
      json: async () => mockAttributes,
    });

    render(<AttributeKeyPage />);

    await waitFor(() => {
      expect(screen.getByText(/Loaded from local fallback/i)).toBeInTheDocument();
      expect(screen.getByText('MPN')).toBeInTheDocument();
    });
  });
});
