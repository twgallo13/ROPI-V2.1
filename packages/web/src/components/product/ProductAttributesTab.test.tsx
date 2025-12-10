import { describe, it, expect, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import ProductAttributesTab from './ProductAttributesTab';
import type { Product } from '../../types/product';

// Mock the useAttributeRegistry hook
vi.mock('../../hooks/useAttributeRegistry', () => ({
  useAttributeRegistry: () => ({
    activeAttributes: [
      {
        attribute_id: 'department',
        label: 'Department',
        data_type: 'string',
        category: 'Product Info',
        required_for_completion: true,
        allowed_values: [],
      },
      {
        attribute_id: 'category',
        label: 'Category',
        data_type: 'string',
        category: 'Product Info',
        required_for_completion: false,
        allowed_values: [],
      },
    ],
    loading: false,
    error: null,
  }),
}));

describe('ProductAttributesTab - Attribute Format Compatibility', () => {
  const mockOnUpdate = vi.fn();

  it('should read attributes from new format (attributes.*)', () => {
    const productNewFormat: Product = {
      id: 'test-product-1',
      name: 'Test Product',
      sku: 'TEST-001',
      attributes: {
        department: 'Women',
        category: 'Shoes',
      },
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    };

    render(<ProductAttributesTab product={productNewFormat} onUpdate={mockOnUpdate} />);

    // Check that department attribute is rendered
    const departmentCard = screen.getByTestId('attr-card-department');
    expect(departmentCard).toBeTruthy();

    // Check that category attribute is rendered
    const categoryCard = screen.getByTestId('attr-card-category');
    expect(categoryCard).toBeTruthy();

    // Check that input fields have the correct values
    const departmentInput = screen.getByTestId('attr-input-department') as HTMLInputElement;
    expect(departmentInput.value).toBe('Women');

    const categoryInput = screen.getByTestId('attr-input-category') as HTMLInputElement;
    expect(categoryInput.value).toBe('Shoes');
  });

  it('should read attributes from legacy format (top-level keys)', () => {
    const productLegacyFormat: Product = {
      id: 'test-product-2',
      name: 'Legacy Product',
      sku: 'LEGACY-001',
      department: 'Men',
      category: 'Apparel',
      attributes: {},
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    } as Product;

    render(<ProductAttributesTab product={productLegacyFormat} onUpdate={mockOnUpdate} />);

    // Check that department attribute is rendered from top-level
    const departmentCard = screen.getByTestId('attr-card-department');
    expect(departmentCard).toBeTruthy();

    // Check that category attribute is rendered from top-level
    const categoryCard = screen.getByTestId('attr-card-category');
    expect(categoryCard).toBeTruthy();

    // Check that input fields have the correct values
    const departmentInput = screen.getByTestId('attr-input-department') as HTMLInputElement;
    expect(departmentInput.value).toBe('Men');

    const categoryInput = screen.getByTestId('attr-input-category') as HTMLInputElement;
    expect(categoryInput.value).toBe('Apparel');
  });

  it('should prefer new format when both formats exist', () => {
    const productBothFormats: Product = {
      id: 'test-product-3',
      name: 'Dual Format Product',
      sku: 'DUAL-001',
      department: 'Kids', // legacy format
      attributes: {
        department: 'Women', // new format - should take precedence
        category: 'Accessories',
      },
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    } as Product;

    render(<ProductAttributesTab product={productBothFormats} onUpdate={mockOnUpdate} />);

    // Check that the new format value is used (Women, not Kids)
    const departmentInput = screen.getByTestId('attr-input-department') as HTMLInputElement;
    expect(departmentInput.value).toBe('Women');

    const categoryInput = screen.getByTestId('attr-input-category') as HTMLInputElement;
    expect(categoryInput.value).toBe('Accessories');
  });

  it('should handle missing attributes gracefully', () => {
    const productNoAttributes: Product = {
      id: 'test-product-4',
      name: 'Empty Product',
      sku: 'EMPTY-001',
      attributes: {},
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    };

    render(<ProductAttributesTab product={productNoAttributes} onUpdate={mockOnUpdate} />);

    // Attributes should render but with empty values
    const departmentInput = screen.getByTestId('attr-input-department') as HTMLInputElement;
    expect(departmentInput.value).toBe('');

    const categoryInput = screen.getByTestId('attr-input-category') as HTMLInputElement;
    expect(categoryInput.value).toBe('');
  });
});
