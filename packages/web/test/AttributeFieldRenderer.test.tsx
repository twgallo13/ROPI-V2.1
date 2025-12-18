/**
 * AttributeFieldRenderer Tests
 * 
 * Tests for data_type-based form control rendering
 * PVS-0.1.9
 */

import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import { AttributeFieldRenderer, AttributeDefinition } from '../src/components/product/AttributeFieldRenderer';

// Simple check that element exists
const assertExists = (element: HTMLElement | null) => {
  expect(element).not.toBeNull();
};

describe('AttributeFieldRenderer', () => {
  const mockOnChange = vi.fn();
  const mockOnBlur = vi.fn();

  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('text type', () => {
    const textAttr: AttributeDefinition = {
      attribute_id: 'product_name',
      label: 'Product Name',
      data_type: 'text',
      required_for_completion: true,
    };

    it('renders a text input', () => {
      render(
        <AttributeFieldRenderer
          attribute={textAttr}
          value="Test Product"
          onChange={mockOnChange}
          onBlur={mockOnBlur}
        />
      );

      const input = screen.getByRole('textbox') as HTMLInputElement;
      assertExists(input);
      expect(input.value).toBe('Test Product');
    });

    it('shows required marker for required attributes', () => {
      render(
        <AttributeFieldRenderer
          attribute={textAttr}
          value=""
          onChange={mockOnChange}
        />
      );

      const marker = screen.getByText('*');
      assertExists(marker);
    });

    it('calls onChange when value changes', () => {
      render(
        <AttributeFieldRenderer
          attribute={textAttr}
          value=""
          onChange={mockOnChange}
        />
      );

      const input = screen.getByRole('textbox');
      fireEvent.change(input, { target: { value: 'New Value' } });
      expect(mockOnChange).toHaveBeenCalledWith('New Value');
    });
  });

  describe('select type', () => {
    const selectAttr: AttributeDefinition = {
      attribute_id: 'department',
      label: 'Department',
      data_type: 'select',
      required_for_completion: true,
      allowed_values: ['Mens', 'Womens', 'Kids', 'Unisex'],
    };

    it('renders a select dropdown', () => {
      render(
        <AttributeFieldRenderer
          attribute={selectAttr}
          value="Mens"
          onChange={mockOnChange}
        />
      );

      const select = screen.getByRole('combobox') as HTMLSelectElement;
      assertExists(select);
      expect(select.value).toBe('Mens');
    });

    it('shows all allowed values as options', () => {
      render(
        <AttributeFieldRenderer
          attribute={selectAttr}
          value=""
          onChange={mockOnChange}
        />
      );

      expect(screen.getByRole('option', { name: 'Mens' })).not.toBeNull();
      expect(screen.getByRole('option', { name: 'Womens' })).not.toBeNull();
      expect(screen.getByRole('option', { name: 'Kids' })).not.toBeNull();
      expect(screen.getByRole('option', { name: 'Unisex' })).not.toBeNull();
    });

    it('includes empty option placeholder', () => {
      render(
        <AttributeFieldRenderer
          attribute={selectAttr}
          value=""
          onChange={mockOnChange}
        />
      );

      const options = screen.getAllByRole('option');
      expect((options[0] as HTMLOptionElement).value).toBe('');
    });
  });

  describe('boolean type', () => {
    const boolAttr: AttributeDefinition = {
      attribute_id: 'product_is_active',
      label: 'Is Active',
      data_type: 'boolean',
      required_for_completion: false,
    };

    it('renders a checkbox', () => {
      render(
        <AttributeFieldRenderer
          attribute={boolAttr}
          value={true}
          onChange={mockOnChange}
        />
      );

      const checkbox = screen.getByRole('checkbox') as HTMLInputElement;
      assertExists(checkbox);
      expect(checkbox.checked).toBe(true);
    });

    it('handles false value', () => {
      render(
        <AttributeFieldRenderer
          attribute={boolAttr}
          value={false}
          onChange={mockOnChange}
        />
      );

      const checkbox = screen.getByRole('checkbox') as HTMLInputElement;
      expect(checkbox.checked).toBe(false);
    });

    it('calls onChange with boolean value', () => {
      render(
        <AttributeFieldRenderer
          attribute={boolAttr}
          value={false}
          onChange={mockOnChange}
        />
      );

      const checkbox = screen.getByRole('checkbox');
      fireEvent.click(checkbox);
      expect(mockOnChange).toHaveBeenCalledWith(true);
    });
  });

  describe('number type', () => {
    const numberAttr: AttributeDefinition = {
      attribute_id: 'retail_price',
      label: 'Retail Price',
      data_type: 'number',
      required_for_completion: true,
    };

    it('renders a number input', () => {
      render(
        <AttributeFieldRenderer
          attribute={numberAttr}
          value={99.99}
          onChange={mockOnChange}
        />
      );

      const input = screen.getByRole('spinbutton') as HTMLInputElement;
      assertExists(input);
      expect(input.valueAsNumber).toBe(99.99);
    });
  });

  describe('date type', () => {
    const dateAttr: AttributeDefinition = {
      attribute_id: 'launch_date',
      label: 'Launch Date',
      data_type: 'date',
      required_for_completion: false,
    };

    it('renders a date input', () => {
      render(
        <AttributeFieldRenderer
          attribute={dateAttr}
          value="2024-01-15"
          onChange={mockOnChange}
        />
      );

      const input = screen.getByDisplayValue('2024-01-15') as HTMLInputElement;
      assertExists(input);
      expect(input.type).toBe('date');
    });
  });

  describe('readOnly state', () => {
    const textAttr: AttributeDefinition = {
      attribute_id: 'sku',
      label: 'SKU',
      data_type: 'text',
      required_for_completion: true,
    };

    it('disables input when readOnly prop is true', () => {
      render(
        <AttributeFieldRenderer
          attribute={textAttr}
          value="TEST123"
          onChange={mockOnChange}
          readOnly
        />
      );

      const input = screen.getByRole('textbox') as HTMLInputElement;
      expect(input.disabled).toBe(true);
    });
  });

  describe('error state', () => {
    const textAttr: AttributeDefinition = {
      attribute_id: 'sku',
      label: 'SKU',
      data_type: 'text',
      required_for_completion: true,
    };

    it('displays error message when error prop is provided', () => {
      render(
        <AttributeFieldRenderer
          attribute={textAttr}
          value=""
          onChange={mockOnChange}
          error="SKU is required"
        />
      );

      const errorMsg = screen.getByText('SKU is required');
      assertExists(errorMsg);
    });

    it('applies error styling to input', () => {
      render(
        <AttributeFieldRenderer
          attribute={textAttr}
          value=""
          onChange={mockOnChange}
          error="Required field"
        />
      );

      const input = screen.getByRole('textbox');
      expect(input.className).toContain('has-error');
    });
  });
});
