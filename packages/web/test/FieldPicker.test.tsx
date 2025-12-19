/**
 * FieldPicker Component Tests
 * 
 * LP-1.0.1: Unit tests for the FieldPicker component.
 * Tests typeahead, selection, keyboard navigation, and normalization.
 */

import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { FieldPicker } from '../src/components/product/FieldPicker';
import type { FieldLink } from '../src/types/fieldLink';

// Mock the attribute registry
vi.mock('@/../../sdk/config/attributeRegistry.json', () => ({
  default: {
    version: '1.0.1',
    attributes: [
      { attribute_id: 'primary_color', label: 'Primary Color', category: 'color', status: 'active' },
      { attribute_id: 'material', label: 'Material(s)', category: 'materials_construction', status: 'active' },
      { attribute_id: 'gender', label: 'Gender', category: 'identity_demographic', status: 'active' },
      { attribute_id: 'brand', label: 'Brand', category: 'sku_core', status: 'active' },
      { attribute_id: 'category', label: 'Category', category: 'classification', status: 'active' },
      { attribute_id: 'mpn', label: 'MPN', category: 'sku_core', status: 'active' },
    ],
  },
}));

// Mock scrollIntoView since jsdom doesn't support it
Element.prototype.scrollIntoView = vi.fn();

describe('FieldPicker', () => {
  const mockOnChange = vi.fn();

  beforeEach(() => {
    mockOnChange.mockClear();
  });

  describe('Rendering', () => {
    it('renders with placeholder text', () => {
      render(
        <FieldPicker
          value={null}
          onChange={mockOnChange}
          placeholder="Select a field..."
        />
      );
      
      const input = screen.getByPlaceholderText('Select a field...');
      expect(input).toBeTruthy();
    });

    it('renders with default placeholder when not provided', () => {
      render(<FieldPicker value={null} onChange={mockOnChange} />);
      
      const input = screen.getByPlaceholderText('Select or type a field...');
      expect(input).toBeTruthy();
    });

    it('renders the selected value label', () => {
      const value: FieldLink = { type: 'attribute', key: 'attributes.primary_color' };
      render(<FieldPicker value={value} onChange={mockOnChange} />);
      
      const input = screen.getByDisplayValue('Primary Color');
      expect(input).toBeTruthy();
    });

    it('renders in disabled state', () => {
      render(<FieldPicker value={null} onChange={mockOnChange} disabled />);
      
      const input = screen.getByRole('combobox');
      expect(input.hasAttribute('disabled')).toBe(true);
    });
  });

  describe('Dropdown behavior', () => {
    it('opens dropdown on focus', async () => {
      render(<FieldPicker value={null} onChange={mockOnChange} />);
      
      const input = screen.getByRole('combobox');
      fireEvent.focus(input);
      
      await waitFor(() => {
        const listbox = screen.getByRole('listbox');
        expect(listbox).toBeTruthy();
      });
    });

    it('shows product fields group', async () => {
      render(<FieldPicker value={null} onChange={mockOnChange} />);
      
      const input = screen.getByRole('combobox');
      fireEvent.focus(input);
      
      await waitFor(() => {
        const heading = screen.getByText('Product Fields');
        expect(heading).toBeTruthy();
      });
    });

    it('shows attributes group', async () => {
      render(<FieldPicker value={null} onChange={mockOnChange} />);
      
      const input = screen.getByRole('combobox');
      fireEvent.focus(input);
      
      await waitFor(() => {
        const heading = screen.getByText('Attributes');
        expect(heading).toBeTruthy();
      });
    });
  });

  describe('Filtering', () => {
    it('filters options based on input', async () => {
      const user = userEvent.setup();
      render(<FieldPicker value={null} onChange={mockOnChange} />);
      
      const input = screen.getByRole('combobox');
      await user.type(input, 'color');
      
      await waitFor(() => {
        const option = screen.getByText('Primary Color');
        expect(option).toBeTruthy();
      });
    });

    it('shows no results message when no match', async () => {
      const user = userEvent.setup();
      render(<FieldPicker value={null} onChange={mockOnChange} />);
      
      const input = screen.getByRole('combobox');
      await user.type(input, 'nonexistentfield123');
      
      await waitFor(() => {
        const message = screen.getByText(/No matching fields/);
        expect(message).toBeTruthy();
      });
    });
  });

  describe('Selection', () => {
    it('calls onChange with correct fieldLink when option selected', async () => {
      const user = userEvent.setup();
      render(<FieldPicker value={null} onChange={mockOnChange} />);
      
      const input = screen.getByRole('combobox');
      await user.click(input);
      
      await waitFor(() => {
        const option = screen.getByText('Primary Color');
        expect(option).toBeTruthy();
      });
      
      const option = screen.getByText('Primary Color');
      await user.click(option);
      
      expect(mockOnChange).toHaveBeenCalledWith({
        type: 'attribute',
        key: 'attributes.primary_color',
      });
    });

    it('calls onChange with null when cleared', async () => {
      const user = userEvent.setup();
      const value: FieldLink = { type: 'attribute', key: 'attributes.primary_color' };
      render(<FieldPicker value={value} onChange={mockOnChange} />);
      
      const clearButton = screen.getByLabelText('Clear selection');
      await user.click(clearButton);
      
      expect(mockOnChange).toHaveBeenCalledWith(null);
    });
  });

  describe('Keyboard navigation', () => {
    it('navigates with arrow keys', async () => {
      const user = userEvent.setup();
      render(<FieldPicker value={null} onChange={mockOnChange} />);
      
      const input = screen.getByRole('combobox');
      await user.click(input);
      
      // Press down arrow
      await user.keyboard('{ArrowDown}');
      
      // First option should be highlighted (has class)
      await waitFor(() => {
        const options = screen.getAllByRole('option');
        expect(options.length).toBeGreaterThan(0);
        expect(options[0].classList.contains('highlighted')).toBe(true);
      });
    });

    it('selects with Enter key', async () => {
      const user = userEvent.setup();
      render(<FieldPicker value={null} onChange={mockOnChange} />);
      
      const input = screen.getByRole('combobox');
      await user.click(input);
      await user.keyboard('{ArrowDown}{Enter}');
      
      expect(mockOnChange).toHaveBeenCalled();
    });

    it('closes dropdown with Escape key', async () => {
      const user = userEvent.setup();
      render(<FieldPicker value={null} onChange={mockOnChange} />);
      
      const input = screen.getByRole('combobox');
      await user.click(input);
      
      await waitFor(() => {
        const listbox = screen.queryByRole('listbox');
        expect(listbox).toBeTruthy();
      });
      
      await user.keyboard('{Escape}');
      
      await waitFor(() => {
        const listbox = screen.queryByRole('listbox');
        expect(listbox).toBeNull();
      });
    });
  });

  describe('Manual entry normalization', () => {
    it('normalizes manual entry on blur', async () => {
      const user = userEvent.setup();
      render(<FieldPicker value={null} onChange={mockOnChange} />);
      
      const input = screen.getByRole('combobox');
      await user.type(input, 'color');
      await user.tab(); // Blur the input
      
      // Should normalize to an attribute
      await waitFor(() => {
        expect(mockOnChange).toHaveBeenCalled();
        const lastCall = mockOnChange.mock.calls[mockOnChange.mock.calls.length - 1][0];
        expect(lastCall).toBeTruthy();
        expect(lastCall.type).toBe('attribute');
      });
    });

    it('normalizes product field shortcuts', async () => {
      const user = userEvent.setup();
      render(<FieldPicker value={null} onChange={mockOnChange} />);
      
      const input = screen.getByRole('combobox');
      await user.type(input, 'product.mpn{Enter}');
      
      await waitFor(() => {
        expect(mockOnChange).toHaveBeenCalledWith(
          expect.objectContaining({
            type: 'product',
            key: expect.stringContaining('mpn'),
          })
        );
      });
    });
  });

  describe('Accessibility', () => {
    it('has proper ARIA attributes', () => {
      render(<FieldPicker value={null} onChange={mockOnChange} />);
      
      const input = screen.getByRole('combobox');
      expect(input.getAttribute('aria-expanded')).toBe('false');
      expect(input.getAttribute('aria-haspopup')).toBe('listbox');
      expect(input.getAttribute('aria-autocomplete')).toBe('list');
    });

    it('updates aria-expanded when open', async () => {
      render(<FieldPicker value={null} onChange={mockOnChange} />);
      
      const input = screen.getByRole('combobox');
      fireEvent.focus(input);
      
      await waitFor(() => {
        expect(input.getAttribute('aria-expanded')).toBe('true');
      });
    });
  });
});
