/**
 * FieldPicker UX Groups Tests
 * 
 * LP-1.1.14: Tests for visual and semantic grouping of product fields
 * and attributes in the FieldPicker component.
 * 
 * Validates:
 * - Product fields vs attributes are visually distinguished
 * - Attributes are sub-grouped by category
 * - Type badges are rendered correctly
 * - Keyboard navigation works with sub-grouped options
 */

import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import { FieldPicker } from '../../src/components/product/FieldPicker';

// Mock the attributeRegistry
vi.mock('@/../../sdk/config/attributeRegistry.json', () => ({
  default: {
    attributes: [
      { attribute_id: 'primary_color', label: 'Primary Color', category: 'color', status: 'active' },
      { attribute_id: 'secondary_color', label: 'Secondary Color', category: 'color', status: 'active' },
      { attribute_id: 'material', label: 'Material', category: 'materials_construction', status: 'active' },
      { attribute_id: 'brand', label: 'Brand', category: 'sku_core', status: 'active' },
      { attribute_id: 'inactive_attr', label: 'Inactive', category: 'color', status: 'inactive' },
    ],
  },
}));

describe('LP-1.1.14: FieldPicker UX Groups', () => {
  const mockOnChange = vi.fn();

  beforeEach(() => {
    mockOnChange.mockClear();
  });

  describe('Group Visual Separation', () => {
    it('should render Product Fields group with product icon', async () => {
      render(
        <FieldPicker
          value={null}
          onChange={mockOnChange}
        />
      );
      
      // Focus to open dropdown
      const input = screen.getByRole('combobox');
      fireEvent.focus(input);
      
      // Check for Product Fields group title
      expect(screen.getByText('Product Fields')).toBeInTheDocument();
      // Check for product icon (📋)
      const productIcon = screen.queryByText('📋');
      expect(productIcon).toBeInTheDocument();
    });

    it('should render Attributes group with attribute icon', async () => {
      render(
        <FieldPicker
          value={null}
          onChange={mockOnChange}
        />
      );
      
      const input = screen.getByRole('combobox');
      fireEvent.focus(input);
      
      // Check for Attributes group title
      expect(screen.getByText('Attributes')).toBeInTheDocument();
      // Check for attribute icon (🏷️)
      const attrIcon = screen.queryByText('🏷️');
      expect(attrIcon).toBeInTheDocument();
    });

    it('should display option badges with type indicators', async () => {
      render(
        <FieldPicker
          value={null}
          onChange={mockOnChange}
        />
      );
      
      const input = screen.getByRole('combobox');
      fireEvent.focus(input);
      
      // Check for P badges (Product) and A badges (Attribute)
      const pBadges = screen.getAllByText('P');
      const aBadges = screen.getAllByText('A');
      
      expect(pBadges.length).toBeGreaterThan(0);
      expect(aBadges.length).toBeGreaterThan(0);
    });
  });

  describe('Attribute Category Sub-Groups', () => {
    it('should group attributes by category', async () => {
      render(
        <FieldPicker
          value={null}
          onChange={mockOnChange}
        />
      );
      
      const input = screen.getByRole('combobox');
      fireEvent.focus(input);
      
      // Look for category sub-group titles
      expect(screen.getByText('Color')).toBeInTheDocument();
      expect(screen.getByText('Materials')).toBeInTheDocument();
      expect(screen.getByText('Core')).toBeInTheDocument();
    });

    it('should only show active attributes', async () => {
      render(
        <FieldPicker
          value={null}
          onChange={mockOnChange}
        />
      );
      
      const input = screen.getByRole('combobox');
      fireEvent.focus(input);
      
      // Inactive attribute should not appear
      expect(screen.queryByText('Inactive')).not.toBeInTheDocument();
    });

    it('should display attribute count per category', async () => {
      render(
        <FieldPicker
          value={null}
          onChange={mockOnChange}
        />
      );
      
      const input = screen.getByRole('combobox');
      fireEvent.focus(input);
      
      // Color category has 2 active attributes
      // Check for count badge
      const countBadges = document.querySelectorAll('.field-picker-group-count');
      expect(countBadges.length).toBeGreaterThan(0);
    });
  });

  describe('Filtering with Groups', () => {
    it('should filter and maintain group structure', async () => {
      render(
        <FieldPicker
          value={null}
          onChange={mockOnChange}
        />
      );
      
      const input = screen.getByRole('combobox');
      fireEvent.change(input, { target: { value: 'color' } });
      
      // Should show color category attributes
      expect(screen.getByText('Primary Color')).toBeInTheDocument();
      expect(screen.getByText('Secondary Color')).toBeInTheDocument();
      
      // Other categories should be hidden when no matches
      expect(screen.queryByText('Material')).not.toBeInTheDocument();
    });

    it('should show product fields when filtering by product field label', async () => {
      render(
        <FieldPicker
          value={null}
          onChange={mockOnChange}
        />
      );
      
      const input = screen.getByRole('combobox');
      fireEvent.change(input, { target: { value: 'MPN' } });
      
      // Should show MPN product field
      expect(screen.getByText('MPN')).toBeInTheDocument();
      // Check for Product Fields group
      expect(screen.getByText('Product Fields')).toBeInTheDocument();
    });
  });

  describe('Keyboard Navigation', () => {
    it('should navigate through grouped options with arrow keys', async () => {
      render(
        <FieldPicker
          value={null}
          onChange={mockOnChange}
        />
      );
      
      const input = screen.getByRole('combobox');
      fireEvent.focus(input);
      
      // Navigate down
      fireEvent.keyDown(input, { key: 'ArrowDown' });
      
      // First option should be highlighted
      const highlightedOption = document.querySelector('.field-picker-option.highlighted');
      expect(highlightedOption).toBeInTheDocument();
    });

    it('should select option on Enter key', async () => {
      render(
        <FieldPicker
          value={null}
          onChange={mockOnChange}
        />
      );
      
      const input = screen.getByRole('combobox');
      fireEvent.focus(input);
      
      // Navigate to first option
      fireEvent.keyDown(input, { key: 'ArrowDown' });
      // Select it
      fireEvent.keyDown(input, { key: 'Enter' });
      
      expect(mockOnChange).toHaveBeenCalled();
    });
  });

  describe('Compact Mode', () => {
    it('should apply compact class when compact prop is true', () => {
      render(
        <FieldPicker
          value={null}
          onChange={mockOnChange}
          compact
        />
      );
      
      const container = document.querySelector('.field-picker');
      expect(container).toHaveClass('compact');
    });

    it('should not apply compact class by default', () => {
      render(
        <FieldPicker
          value={null}
          onChange={mockOnChange}
        />
      );
      
      const container = document.querySelector('.field-picker');
      expect(container).not.toHaveClass('compact');
    });
  });
});
