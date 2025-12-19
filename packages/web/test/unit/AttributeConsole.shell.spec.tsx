/**
 * AttributesConsole Shell Unit Tests
 * 
 * Tests the master-detail layout renders correctly
 * 
 * Lisa PVS-0.2.3
 */

import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import AttributesConsole from '../../src/pages/Settings/AttributesConsole';

// Mock useAttributes hook
const mockAttributes = [
  {
    attribute_id: 'color',
    label: 'Color',
    data_type: 'enum' as const,
    status: 'active' as const,
    allowed_values: ['Red', 'Blue', 'Green'],
  },
  {
    attribute_id: 'size',
    label: 'Size',
    data_type: 'string' as const,
    status: 'active' as const,
  },
  {
    attribute_id: 'legacy_attr',
    label: 'Legacy Attribute',
    data_type: 'number' as const,
    status: 'deprecated' as const,
  },
];

const mockUseAttributes = {
  attributes: mockAttributes,
  loading: false,
  error: null,
  createAttribute: vi.fn(),
  updateAttribute: vi.fn(),
  deleteAttribute: vi.fn(),
  refresh: vi.fn(),
  getUsage: vi.fn(),
};

vi.mock('../../src/hooks/useAttributes', () => ({
  useAttributes: () => mockUseAttributes,
}));

// Mock notifications
vi.mock('../../src/lib/notifications', () => ({
  toastSuccess: vi.fn(),
  toastError: vi.fn(),
}));

describe('AttributesConsole Shell', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockUseAttributes.loading = false;
    mockUseAttributes.error = null;
    mockUseAttributes.attributes = mockAttributes;
  });

  afterEach(() => {
    vi.resetAllMocks();
  });

  it('renders the master-detail layout', () => {
    render(<AttributesConsole />);

    // Should have main console container
    expect(screen.getByTestId('attributes-console')).toBeInTheDocument();

    // Left panel should be present
    expect(screen.getByTestId('attribute-list-panel')).toBeInTheDocument();

    // Detail panel should show empty state initially
    expect(screen.getByTestId('attribute-detail-panel-empty')).toBeInTheDocument();
  });

  it('renders the attribute list in left panel', () => {
    render(<AttributesConsole />);

    // All attributes should be listed
    expect(screen.getByTestId('list-item-color')).toBeInTheDocument();
    expect(screen.getByTestId('list-item-size')).toBeInTheDocument();
    expect(screen.getByTestId('list-item-legacy_attr')).toBeInTheDocument();
  });

  it('shows detail panel when attribute is selected', async () => {
    render(<AttributesConsole />);

    // Click on an attribute
    fireEvent.click(screen.getByTestId('list-item-color'));

    // Wait for detail panel to show
    await waitFor(() => {
      expect(screen.getByTestId('attribute-detail-panel')).toBeInTheDocument();
    });

    // Header should show attribute info
    expect(screen.getByTestId('header-label')).toHaveTextContent('Color');
    expect(screen.getByTestId('header-id')).toHaveTextContent('color');
  });

  it('renders tabs and switches between them', async () => {
    render(<AttributesConsole />);

    // Select an attribute first
    fireEvent.click(screen.getByTestId('list-item-color'));

    await waitFor(() => {
      expect(screen.getByTestId('tab-overview')).toBeInTheDocument();
    });

    // All tabs should be present
    expect(screen.getByTestId('tab-overview')).toBeInTheDocument();
    expect(screen.getByTestId('tab-values')).toBeInTheDocument();
    expect(screen.getByTestId('tab-behavior')).toBeInTheDocument();
    expect(screen.getByTestId('tab-ai-seo')).toBeInTheDocument();
    expect(screen.getByTestId('tab-customer')).toBeInTheDocument();
    expect(screen.getByTestId('tab-mapping')).toBeInTheDocument();
    expect(screen.getByTestId('tab-audit')).toBeInTheDocument();

    // Overview tab should be active by default
    expect(screen.getByTestId('tab-overview')).toHaveAttribute('aria-selected', 'true');

    // Click Values tab
    fireEvent.click(screen.getByTestId('tab-values'));

    // Values tab should now be active
    await waitFor(() => {
      expect(screen.getByTestId('tab-values')).toHaveAttribute('aria-selected', 'true');
    });

    // Values panel should be visible (color is enum, so shows allowed values)
    expect(screen.getByTestId('tab-panel-values')).toBeInTheDocument();
  });

  it('Overview tab renders real attribute data', async () => {
    render(<AttributesConsole />);

    // Select an attribute
    fireEvent.click(screen.getByTestId('list-item-color'));

    await waitFor(() => {
      expect(screen.getByTestId('tab-panel-overview')).toBeInTheDocument();
    });

    // Form should have real values
    expect(screen.getByTestId('form-label')).toHaveValue('Color');
    expect(screen.getByTestId('form-id')).toHaveValue('color');
    expect(screen.getByTestId('form-data-type')).toHaveValue('enum');
  });

  it('shows search input and filter chips', () => {
    render(<AttributesConsole />);

    expect(screen.getByTestId('search-input')).toBeInTheDocument();
    expect(screen.getByTestId('filter-active')).toBeInTheDocument();
    expect(screen.getByTestId('filter-deprecated')).toBeInTheDocument();
    expect(screen.getByTestId('filter-hidden')).toBeInTheDocument();
  });

  it('filters attributes by status', async () => {
    render(<AttributesConsole />);

    // Click deprecated filter
    fireEvent.click(screen.getByTestId('filter-deprecated'));

    await waitFor(() => {
      // Only deprecated attribute should be visible
      expect(screen.getByTestId('list-item-legacy_attr')).toBeInTheDocument();
      expect(screen.queryByTestId('list-item-color')).not.toBeInTheDocument();
      expect(screen.queryByTestId('list-item-size')).not.toBeInTheDocument();
    });
  });

  it('shows new attribute button', () => {
    render(<AttributesConsole />);

    expect(screen.getByTestId('new-attribute-btn')).toBeInTheDocument();
    expect(screen.getByTestId('new-attribute-btn')).toHaveTextContent('New Attribute');
  });

  it('shows loading state', () => {
    mockUseAttributes.loading = true;
    mockUseAttributes.attributes = [];

    render(<AttributesConsole />);

    expect(screen.getByText('Loading attributes...')).toBeInTheDocument();
  });

  // PVS-0.2.6: Behavior and AI tabs
  describe('Behavior Tab (PVS-0.2.6)', () => {
    it('renders behavior settings with toggle controls', async () => {
      render(<AttributesConsole />);

      // Select an attribute
      fireEvent.click(screen.getByTestId('list-item-color'));

      await waitFor(() => {
        expect(screen.getByTestId('tab-behavior')).toBeInTheDocument();
      });

      // Click Behavior tab
      fireEvent.click(screen.getByTestId('tab-behavior'));

      await waitFor(() => {
        expect(screen.getByTestId('tab-panel-behavior')).toBeInTheDocument();
      });

      // Should show settings toggles
      expect(screen.getByTestId('toggle-required-completion')).toBeInTheDocument();
      expect(screen.getByTestId('toggle-required-export')).toBeInTheDocument();
      expect(screen.getByTestId('toggle-import-required')).toBeInTheDocument();
      expect(screen.getByTestId('input-external-header')).toBeInTheDocument();
    });
  });

  describe('AI & SEO Tab (PVS-0.2.6)', () => {
    it('renders AI/SEO settings', async () => {
      render(<AttributesConsole />);

      // Select an attribute
      fireEvent.click(screen.getByTestId('list-item-color'));

      await waitFor(() => {
        expect(screen.getByTestId('tab-ai-seo')).toBeInTheDocument();
      });

      // Click AI/SEO tab
      fireEvent.click(screen.getByTestId('tab-ai-seo'));

      await waitFor(() => {
        expect(screen.getByTestId('tab-panel-ai-seo')).toBeInTheDocument();
      });

      // Should show AI usage notes textarea and category input
      expect(screen.getByTestId('textarea-ai-notes')).toBeInTheDocument();
      expect(screen.getByTestId('input-category')).toBeInTheDocument();
    });
  });

  describe('Values Tab (PVS-0.2.6)', () => {
    it('shows allowed values for enum attributes', async () => {
      render(<AttributesConsole />);

      // Select enum attribute (color)
      fireEvent.click(screen.getByTestId('list-item-color'));

      await waitFor(() => {
        expect(screen.getByTestId('tab-values')).toBeInTheDocument();
      });

      // Click Values tab
      fireEvent.click(screen.getByTestId('tab-values'));

      await waitFor(() => {
        expect(screen.getByTestId('tab-panel-values')).toBeInTheDocument();
      });

      // Should show allowed values count
      expect(screen.getByText('Allowed Values (3)')).toBeInTheDocument();
      
      // Should show each value
      expect(screen.getByText('Red')).toBeInTheDocument();
      expect(screen.getByText('Blue')).toBeInTheDocument();
      expect(screen.getByText('Green')).toBeInTheDocument();
    });

    it('shows constraints message for non-enum attributes', async () => {
      render(<AttributesConsole />);

      // Select string attribute (size)
      fireEvent.click(screen.getByTestId('list-item-size'));

      await waitFor(() => {
        expect(screen.getByTestId('tab-values')).toBeInTheDocument();
      });

      // Click Values tab
      fireEvent.click(screen.getByTestId('tab-values'));

      await waitFor(() => {
        expect(screen.getByTestId('tab-panel-values')).toBeInTheDocument();
      });

      // Should show constraints placeholder
      expect(screen.getByText('Value Constraints')).toBeInTheDocument();
      expect(screen.getByText('String/Number constraints')).toBeInTheDocument();
    });
  });

  describe('Deprecate/Delete Modal (PVS-0.2.6)', () => {
    it('shows deprecate modal when kebab menu action clicked', async () => {
      render(<AttributesConsole />);

      // Select an attribute
      fireEvent.click(screen.getByTestId('list-item-color'));

      await waitFor(() => {
        expect(screen.getByTestId('kebab-button')).toBeInTheDocument();
      });

      // Open kebab menu
      fireEvent.click(screen.getByTestId('kebab-button'));

      // Click deprecate
      fireEvent.click(screen.getByTestId('menu-deprecate'));

      // Modal should appear
      await waitFor(() => {
        expect(screen.getByTestId('confirmation-modal')).toBeInTheDocument();
      });

      expect(screen.getByText('Deprecate Attribute')).toBeInTheDocument();
    });

    it('shows delete modal when kebab menu action clicked', async () => {
      render(<AttributesConsole />);

      // Select an attribute
      fireEvent.click(screen.getByTestId('list-item-color'));

      await waitFor(() => {
        expect(screen.getByTestId('kebab-button')).toBeInTheDocument();
      });

      // Open kebab menu
      fireEvent.click(screen.getByTestId('kebab-button'));

      // Click delete
      fireEvent.click(screen.getByTestId('menu-delete'));

      // Modal should appear
      await waitFor(() => {
        expect(screen.getByTestId('confirmation-modal')).toBeInTheDocument();
      });

      expect(screen.getByText('Delete Attribute')).toBeInTheDocument();
      expect(screen.getByTestId('confirm-input')).toBeInTheDocument();
    });

    it('requires typing attribute ID to confirm delete', async () => {
      render(<AttributesConsole />);

      // Select an attribute
      fireEvent.click(screen.getByTestId('list-item-color'));

      await waitFor(() => {
        expect(screen.getByTestId('kebab-button')).toBeInTheDocument();
      });

      // Open kebab menu and click delete
      fireEvent.click(screen.getByTestId('kebab-button'));
      fireEvent.click(screen.getByTestId('menu-delete'));

      await waitFor(() => {
        expect(screen.getByTestId('confirmation-modal')).toBeInTheDocument();
      });

      // Confirm button should be disabled initially
      expect(screen.getByTestId('modal-confirm')).toBeDisabled();

      // Type wrong text - still disabled
      fireEvent.change(screen.getByTestId('confirm-input'), { target: { value: 'wrong' } });
      expect(screen.getByTestId('modal-confirm')).toBeDisabled();

      // Type correct attribute ID - should enable
      fireEvent.change(screen.getByTestId('confirm-input'), { target: { value: 'color' } });
      expect(screen.getByTestId('modal-confirm')).not.toBeDisabled();
    });
  });
});
