/**
 * ProductAttributesTab multiSelect Tests — LP-0.1.1
 * 
 * Tests for multiSelect attribute rendering and behavior:
 * 1. Renders <select multiple> for multiSelect attributes with allowed_values as options
 * 2. Selecting multiple options produces onChange calls with array
 * 3. Custom value entry (press Enter) when allow_custom_values === true appends value
 */

import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import userEvent from '@testing-library/user-event';

const mockAttributes = [
  {
    attribute_id: 'material',
    label: 'Material',
    data_type: 'multiSelect',
    allowed_values: ['Leather', 'Suede', 'Canvas', 'Mesh', 'Synthetic'],
    allow_custom_values: true,
    category: 'descriptive',
  },
  {
    attribute_id: 'primary_color',
    label: 'Primary Color',
    data_type: 'enum',
    allowed_values: ['Black', 'White', 'Red', 'Blue'],
    category: 'descriptive',
  },
  {
    attribute_id: 'descriptive_color',
    label: 'Descriptive Color',
    data_type: 'string',
    category: 'descriptive',
  },
  {
    attribute_id: 'fit',
    label: 'Fit',
    data_type: 'enum',
    allowed_values: ['Regular', 'Wide', 'Narrow'],
    category: 'descriptive',
  },
  {
    attribute_id: 'cut_type',
    label: 'Cut Type',
    data_type: 'string',
    category: 'descriptive',
  },
  {
    attribute_id: 'closure_type',
    label: 'Closure Type',
    data_type: 'string',
    category: 'descriptive',
  },
  {
    attribute_id: 'league',
    label: 'League',
    data_type: 'string',
    category: 'descriptive',
  },
  {
    attribute_id: 'sports_team',
    label: 'Sports Team',
    data_type: 'string',
    category: 'descriptive',
  },
  {
    attribute_id: 'collection_name',
    label: 'Collection Name',
    data_type: 'string',
    category: 'descriptive',
  },
];

// Mock the useAttributeRegistry hook
vi.mock('../../src/hooks/useAttributeRegistry', () => ({
  useAttributeRegistry: () => ({
    attributes: mockAttributes,
    loading: false,
    error: null,
    getAttributeById: (id: string) => mockAttributes.find(a => a.attribute_id === id),
    getAttributesByCategory: (category: string) => mockAttributes.filter(a => a.category === category),
    activeAttributes: mockAttributes,
    requiredAttributes: [],
    refresh: vi.fn(),
  }),
}));

// Import after mocking
import ProductAttributesTab from '../../src/components/product/ProductAttributesTab';
import type { Product } from '../../src/types/product';

describe('ProductAttributesTab multiSelect (LP-0.1.1)', () => {
  const mockProduct: Partial<Product> = {
    id: 'test-product-001',
    name: 'Test Product',
    attributes: {
      material: ['Leather', 'Mesh'],
      primary_color: 'Black',
    },
  };

  let mockOnUpdate: ReturnType<typeof vi.fn>;

  beforeEach(() => {
    mockOnUpdate = vi.fn();
  });

  it('renders <select multiple> for material attribute with allowed_values as options', () => {
    render(
      <ProductAttributesTab
        product={mockProduct as Product}
        onUpdate={mockOnUpdate}
      />
    );

    // Find the material select element
    const materialSelect = screen.getByTestId('attr-input-material');
    expect(materialSelect).toBeInTheDocument();
    expect(materialSelect.tagName.toLowerCase()).toBe('select');
    expect(materialSelect).toHaveAttribute('multiple');

    // Check options
    const options = materialSelect.querySelectorAll('option');
    expect(options).toHaveLength(5); // Leather, Suede, Canvas, Mesh, Synthetic

    const optionValues = Array.from(options).map(o => o.value);
    expect(optionValues).toContain('Leather');
    expect(optionValues).toContain('Suede');
    expect(optionValues).toContain('Canvas');
    expect(optionValues).toContain('Mesh');
    expect(optionValues).toContain('Synthetic');
  });

  it('has correct initial selected values from product.attributes', () => {
    render(
      <ProductAttributesTab
        product={mockProduct as Product}
        onUpdate={mockOnUpdate}
      />
    );

    const materialSelect = screen.getByTestId('attr-input-material') as HTMLSelectElement;
    
    // Check that Leather and Mesh are selected
    const selectedValues = Array.from(materialSelect.selectedOptions).map(o => o.value);
    expect(selectedValues).toContain('Leather');
    expect(selectedValues).toContain('Mesh');
    expect(selectedValues).toHaveLength(2);
  });

  it('calls onUpdate with array when selecting multiple options', async () => {
    render(
      <ProductAttributesTab
        product={mockProduct as Product}
        onUpdate={mockOnUpdate}
      />
    );

    const materialSelect = screen.getByTestId('attr-input-material') as HTMLSelectElement;

    // For multi-select, we need to manipulate selectedOptions manually then fire change
    // Select Leather and Canvas options
    const leatherOption = materialSelect.querySelector('option[value="Leather"]') as HTMLOptionElement;
    const canvasOption = materialSelect.querySelector('option[value="Canvas"]') as HTMLOptionElement;
    
    // Set selected states
    leatherOption.selected = true;
    canvasOption.selected = true;
    
    // Fire the change event
    fireEvent.change(materialSelect);

    // Verify onUpdate was called with the new array
    expect(mockOnUpdate).toHaveBeenCalled();
    const materialCalls = mockOnUpdate.mock.calls.filter((c: unknown[]) => c[0] === 'attributes.material');
    expect(materialCalls.length).toBeGreaterThan(0);
    
    const lastCall = materialCalls[materialCalls.length - 1];
    expect(lastCall[0]).toBe('attributes.material');
    // The value should be an array containing both selected values
    expect(Array.isArray(lastCall[1])).toBe(true);
    expect(lastCall[1]).toContain('Leather');
    expect(lastCall[1]).toContain('Canvas');
  });

  it('renders custom value input when allow_custom_values is true', () => {
    render(
      <ProductAttributesTab
        product={mockProduct as Product}
        onUpdate={mockOnUpdate}
      />
    );

    // Find the custom input for material
    const customInput = screen.getByTestId('attr-custom-input-material');
    expect(customInput).toBeInTheDocument();
    expect(customInput.tagName.toLowerCase()).toBe('input');
    expect(customInput).toHaveAttribute('placeholder', 'Add custom value and press Enter');
  });

  it('adds custom value to array when pressing Enter', async () => {
    const user = userEvent.setup();
    
    render(
      <ProductAttributesTab
        product={mockProduct as Product}
        onUpdate={mockOnUpdate}
      />
    );

    const customInput = screen.getByTestId('attr-custom-input-material');
    
    // Type a custom value and press Enter
    await user.type(customInput, 'Velvet{enter}');

    // Verify onUpdate was called with the custom value appended
    const calls = mockOnUpdate.mock.calls.filter(c => c[0] === 'attributes.material');
    expect(calls.length).toBeGreaterThan(0);
    
    const lastCall = calls[calls.length - 1];
    expect(lastCall[1]).toContain('Velvet');
    expect(lastCall[1]).toContain('Leather'); // Original values preserved
    expect(lastCall[1]).toContain('Mesh');
  });

  it('clears custom input after adding value', async () => {
    const user = userEvent.setup();
    
    render(
      <ProductAttributesTab
        product={mockProduct as Product}
        onUpdate={mockOnUpdate}
      />
    );

    const customInput = screen.getByTestId('attr-custom-input-material') as HTMLInputElement;
    
    // Type and press Enter
    await user.type(customInput, 'Velvet{enter}');
    
    // Input should be cleared
    expect(customInput.value).toBe('');
  });

  it('does not add duplicate custom values', async () => {
    const user = userEvent.setup();
    
    render(
      <ProductAttributesTab
        product={mockProduct as Product}
        onUpdate={mockOnUpdate}
      />
    );

    const customInput = screen.getByTestId('attr-custom-input-material');
    
    // Try to add 'Leather' which already exists
    await user.type(customInput, 'Leather{enter}');

    // Check that the call was made but Leather is not duplicated
    const calls = mockOnUpdate.mock.calls.filter(c => c[0] === 'attributes.material');
    if (calls.length > 0) {
      const lastCall = calls[calls.length - 1];
      const leatherCount = lastCall[1].filter((v: string) => v === 'Leather').length;
      expect(leatherCount).toBe(1); // Should only have one 'Leather'
    }
  });

  it('does not add empty custom values', async () => {
    const user = userEvent.setup();
    const initialCallCount = mockOnUpdate.mock.calls.length;
    
    render(
      <ProductAttributesTab
        product={mockProduct as Product}
        onUpdate={mockOnUpdate}
      />
    );

    const customInput = screen.getByTestId('attr-custom-input-material');
    
    // Just press Enter with empty input
    await user.type(customInput, '{enter}');

    // onUpdate should not be called for empty values (or at least not with empty string added)
    const materialCalls = mockOnUpdate.mock.calls.filter(c => c[0] === 'attributes.material');
    const afterCalls = materialCalls.length;
    
    // Either no new calls, or if called, should not include empty string
    if (afterCalls > initialCallCount) {
      const lastCall = materialCalls[materialCalls.length - 1];
      expect(lastCall[1]).not.toContain('');
    }
  });

  it('has correct data-field attribute for scroll-to-field targeting', () => {
    render(
      <ProductAttributesTab
        product={mockProduct as Product}
        onUpdate={mockOnUpdate}
      />
    );

    const materialSelect = screen.getByTestId('attr-input-material');
    expect(materialSelect).toHaveAttribute('data-field', 'attributes.material');
    expect(materialSelect).toHaveAttribute('name', 'attributes.material');
  });
});
