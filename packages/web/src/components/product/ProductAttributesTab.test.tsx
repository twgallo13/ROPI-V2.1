import { describe, it, expect, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import ProductAttributesTab from './ProductAttributesTab';
import type { Product } from '../../types/product';

// Mock attributes for useAttributeRegistry - matching TAB2_ATTRIBUTE_IDS
const mockAttributes = [
  {
    attribute_id: 'primary_color',
    label: 'Primary Color',
    data_type: 'string',
    category: 'Product Info',
    required_for_completion: true,
    allowed_values: ['Black', 'White', 'Red'],
  },
  {
    attribute_id: 'material',
    label: 'Material',
    data_type: 'string',
    category: 'Product Info',
    required_for_completion: false,
    allowed_values: ['Leather', 'Canvas', 'Rubber'],
  },
];

// Mock the useAttributeRegistry hook
vi.mock('../../hooks/useAttributeRegistry', () => ({
  useAttributeRegistry: () => ({
    activeAttributes: mockAttributes,
    loading: false,
    error: null,
    getAttributeById: (id: string) => mockAttributes.find(a => a.attribute_id === id),
  }),
}));

describe('ProductAttributesTab - Attribute Format Compatibility', () => {
  const mockOnUpdate = vi.fn();

  const createMockProduct = (overrides: Record<string, any> = {}): Product => ({
    id: 'test-product-1',
    name: 'Test Product',
    sku: 'TEST-001',
    styleId: 'STYLE-001',
    status: 'draft',
    websites: [],
    brand: 'Test Brand',
    category: 'Shoes',
    department: 'Women',
    subcategory: 'Athletic',
    firstReceived: new Date().toISOString(),
    launchDate: new Date().toISOString(),
    launchStatus: 'available',
    attributes: {},
    descriptions: {},
    media: { heroImage: '', gallery: [] },
    exportReadiness: { overall: 0, byWebsite: {} },
    observations: [],
    smartSuggestions: [],
    aiHistory: [],
    ...overrides,
  } as Product);

  it('should read attributes from new format (attributes.*)', () => {
    const productNewFormat = createMockProduct({
      attributes: {
        primary_color: 'Black',
        material: 'Leather',
      },
    });

    render(<ProductAttributesTab product={productNewFormat} onUpdate={mockOnUpdate} />);

    // Check that primary_color attribute is rendered
    const colorCard = screen.getByTestId('attr-card-primary_color');
    expect(colorCard).toBeTruthy();

    // Check that material attribute is rendered
    const materialCard = screen.getByTestId('attr-card-material');
    expect(materialCard).toBeTruthy();

    // Check that input fields have the correct values
    const colorInput = screen.getByTestId('attr-input-primary_color') as HTMLSelectElement;
    expect(colorInput.value).toBe('Black');

    const materialInput = screen.getByTestId('attr-input-material') as HTMLSelectElement;
    expect(materialInput.value).toBe('Leather');
  });

  it('should read attributes from legacy format (top-level keys)', () => {
    const productLegacyFormat = createMockProduct({
      primary_color: 'White',
      material: 'Canvas',
    });

    render(<ProductAttributesTab product={productLegacyFormat} onUpdate={mockOnUpdate} />);

    // Check that primary_color attribute is rendered from top-level
    const colorCard = screen.getByTestId('attr-card-primary_color');
    expect(colorCard).toBeTruthy();

    // Check that material attribute is rendered from top-level
    const materialCard = screen.getByTestId('attr-card-material');
    expect(materialCard).toBeTruthy();

    // Check that input fields have the correct values
    const colorInput = screen.getByTestId('attr-input-primary_color') as HTMLSelectElement;
    expect(colorInput.value).toBe('White');

    const materialInput = screen.getByTestId('attr-input-material') as HTMLSelectElement;
    expect(materialInput.value).toBe('Canvas');
  });

  it('should prefer new format when both formats exist', () => {
    const productBothFormats = createMockProduct({
      primary_color: 'Red', // legacy format
      attributes: {
        primary_color: 'Black', // new format - should take precedence
        material: 'Rubber',
      },
    });

    render(<ProductAttributesTab product={productBothFormats} onUpdate={mockOnUpdate} />);

    // Check that the new format value is used (Black, not Red)
    const colorInput = screen.getByTestId('attr-input-primary_color') as HTMLSelectElement;
    expect(colorInput.value).toBe('Black');

    const materialInput = screen.getByTestId('attr-input-material') as HTMLSelectElement;
    expect(materialInput.value).toBe('Rubber');
  });

  it('should handle missing attributes gracefully', () => {
    const productNoAttributes = createMockProduct({
      attributes: {},
    });

    render(<ProductAttributesTab product={productNoAttributes} onUpdate={mockOnUpdate} />);

    // Attributes should render but with empty values
    const colorInput = screen.getByTestId('attr-input-primary_color') as HTMLSelectElement;
    expect(colorInput.value).toBe('');

    const materialInput = screen.getByTestId('attr-input-material') as HTMLSelectElement;
    expect(materialInput.value).toBe('');
  });
});
