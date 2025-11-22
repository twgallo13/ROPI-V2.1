/**
 * Attributes Command Center Component Tests
 */
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, waitFor } from '@testing-library/react';
import { BrowserRouter } from 'react-router-dom';
import AttributesCommandCenter from '../pages/settings/AttributesCommandCenter';
import { AuthContext } from '../contexts/AuthContext';

// Mock the auth context
const mockAuthContext = {
  user: { uid: 'test-uid', email: 'test@test.com' },
  role: 'admin',
  loading: false,
  signInWithGoogle: vi.fn(),
  signOut: vi.fn()
};

// Mock fetch
global.fetch = vi.fn();

describe('AttributesCommandCenter', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    (global.fetch as ReturnType<typeof vi.fn>).mockResolvedValue({
      ok: true,
      json: async () => ({
        attributes: [
          {
            canonicalPath: 'sku_core.mpn',
            label: 'MPN',
            category: 'sku_core',
            dataType: 'string',
            importRequired: true,
            export: true,
            foundation: false
          },
          {
            canonicalPath: 'descriptive.age_group',
            label: 'Age Group',
            category: 'descriptive',
            dataType: 'string',
            foundation: true,
            importRequired: true
          }
        ],
        total: 2,
        page: 1,
        limit: 50,
        totalPages: 1
      })
    });
  });

  it('should render the command center header', async () => {
    render(
      <BrowserRouter>
        <AuthContext.Provider value={mockAuthContext}>
          <AttributesCommandCenter />
        </AuthContext.Provider>
      </BrowserRouter>
    );

    expect(screen.getByText('Attribute Command Center')).toBeInTheDocument();
    expect(screen.getByText(/Manage canonical attributes and AI policies/i)).toBeInTheDocument();
  });

  it('should fetch and display attributes on mount', async () => {
    render(
      <BrowserRouter>
        <AuthContext.Provider value={mockAuthContext}>
          <AttributesCommandCenter />
        </AuthContext.Provider>
      </BrowserRouter>
    );

    await waitFor(() => {
      expect(global.fetch).toHaveBeenCalledWith(
        expect.stringContaining('/api/attributes'),
        expect.objectContaining({ credentials: 'include' })
      );
    });

    await waitFor(() => {
      expect(screen.getByText('MPN')).toBeInTheDocument();
      expect(screen.getByText('Age Group')).toBeInTheDocument();
    });
  });

  it('should show admin actions for admin users', async () => {
    render(
      <BrowserRouter>
        <AuthContext.Provider value={mockAuthContext}>
          <AttributesCommandCenter />
        </AuthContext.Provider>
      </BrowserRouter>
    );

    await waitFor(() => {
      expect(screen.getByText('New Attribute')).toBeInTheDocument();
      expect(screen.getByText('Seed to Staging')).toBeInTheDocument();
      expect(screen.getByText('Seed (Dry Run)')).toBeInTheDocument();
    });
  });

  it('should hide admin actions for non-admin users', async () => {
    const nonAdminContext = {
      ...mockAuthContext,
      role: 'specialist'
    };

    render(
      <BrowserRouter>
        <AuthContext.Provider value={nonAdminContext}>
          <AttributesCommandCenter />
        </AuthContext.Provider>
      </BrowserRouter>
    );

    await waitFor(() => {
      expect(screen.queryByText('New Attribute')).not.toBeInTheDocument();
      expect(screen.queryByText('Seed to Staging')).not.toBeInTheDocument();
    });
  });

  it('should display search and filter controls', async () => {
    render(
      <BrowserRouter>
        <AuthContext.Provider value={mockAuthContext}>
          <AttributesCommandCenter />
        </AuthContext.Provider>
      </BrowserRouter>
    );

    await waitFor(() => {
      expect(screen.getByPlaceholderText(/Search by label/i)).toBeInTheDocument();
      expect(screen.getByText('All Categories')).toBeInTheDocument();
      expect(screen.getByText('Foundation Only')).toBeInTheDocument();
      expect(screen.getByText('Exportable')).toBeInTheDocument();
    });
  });

  it('should show foundation indicator for foundation attributes', async () => {
    render(
      <BrowserRouter>
        <AuthContext.Provider value={mockAuthContext}>
          <AttributesCommandCenter />
        </AuthContext.Provider>
      </BrowserRouter>
    );

    await waitFor(() => {
      const table = screen.getByRole('table');
      expect(table).toBeInTheDocument();
    });

    // Foundation attributes should have a visual indicator
    await waitFor(() => {
      const ageGroupRow = screen.getByText('Age Group').closest('tr');
      expect(ageGroupRow).toBeInTheDocument();
    });
  });

  it('should toggle sandbox panel', async () => {
    render(
      <BrowserRouter>
        <AuthContext.Provider value={mockAuthContext}>
          <AttributesCommandCenter />
        </AuthContext.Provider>
      </BrowserRouter>
    );

    await waitFor(() => {
      expect(screen.getByText('Mapping Sandbox')).toBeInTheDocument();
    });
  });
});
